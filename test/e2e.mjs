/**
 * End-to-end check of both halves against this machine's real Session logs:
 *   1. Host: fold every durable log, print the aggregates.
 *   2. Client: render the panel and the report body with React's server
 *      renderer, so a broken table, chart, or locale key fails the check
 *      instead of blanking the slot in the app.
 *
 * The client module is a browser artifact with no exports, so this test runs
 * the real source through a fake module loader and keeps the loader object
 * clean by adding the test-only accessor in memory.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

/** Durable Session logs of the DSH profile under test. */
const ROOT = process.env.DSH_SESSIONS_DIR ?? path.join(os.homedir(), '.dsh', 'sessions')
/**
 * React 18 + react-dom live outside this plugin (the browser module table
 * provides them at runtime). Point REACT_RESOLVE at a project.json of any
 * project that has them installed, or install them here as devDependencies.
 */
const REACT_RESOLVE = process.env.REACT_RESOLVE

// ---------------------------------------------------------------------------
// Real session logs (append-only zstd frames; Node decodes only the first).
// ---------------------------------------------------------------------------
function decodeFrames(raw) {
  const marks = []
  for (let index = 0; index + 4 <= raw.length; index += 1) {
    if (raw[index] === 0x28 && raw[index + 1] === 0xb5 && raw[index + 2] === 0x2f && raw[index + 3] === 0xfd) marks.push(index)
  }
  if (marks.length === 0) return zlib.zstdDecompressSync(raw)
  const parts = []
  let start = 0
  for (const mark of marks) {
    if (mark <= start) continue
    try {
      parts.push(zlib.zstdDecompressSync(raw.subarray(start, mark)))
      start = mark
    } catch { /* not a real frame boundary */ }
  }
  if (start < raw.length) parts.push(zlib.zstdDecompressSync(raw.subarray(start)))
  return Buffer.concat(parts.map(part => Buffer.from(part)))
}

function sessionLogs() {
  const out = []
  for (const workspace of fs.readdirSync(ROOT)) {
    const workspaceDir = path.join(ROOT, workspace)
    if (!fs.statSync(workspaceDir).isDirectory()) continue
    for (const id of fs.readdirSync(workspaceDir)) {
      const dir = path.join(workspaceDir, id)
      if (!fs.statSync(dir).isDirectory()) continue
      const file = fs.readdirSync(dir).find(name => name.startsWith('session.v4.jsonl'))
      if (file !== undefined) out.push({ id, file: path.join(dir, file) })
    }
  }
  return out
}

function readEvents(file) {
  const raw = fs.readFileSync(file)
  return (file.endsWith('.zstd') ? decodeFrames(raw) : raw).toString('utf8')
    .split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line))
}

const logs = sessionLogs()
const byId = new Map()
for (const entry of logs) {
  const lines = readEvents(entry.file)
  const header = lines[0]?.type === 'session' ? lines[0] : undefined
  byId.set(entry.id, {
    session: { id: entry.id },
    inheritedEventCount: 0,
    events: header === undefined ? lines : lines.slice(1),
  })
}

// ---------------------------------------------------------------------------
// Host half
// ---------------------------------------------------------------------------
const { apply } = await import('../index.js')
const routes = new Map()
const hostCtx = {
  get: () => undefined,
  effect: fn => { fn(); return () => {} },
  webServer: { register: route => { routes.set(route.path, route.handler); return () => {} } },
  sessionQuery: {
    listSessions: async () => logs.map(entry => ({ header: { id: entry.id }, live: false })),
    readSession: async id => byId.get(id),
  },
}
apply(hostCtx)
const handler = routes.get('/latency-stats/api/report')
if (handler === undefined) throw new Error('host route was not registered')

function call(query) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const res = {
      writeHead(status) { this.status = status },
      end(text) { chunks.push(text); resolve({ status: this.status, body: JSON.parse(chunks.join('')) }) },
    }
    Promise.resolve(handler({ method: 'GET', url: `/latency-stats/api/report?${query}` }, res)).catch(reject)
  })
}

let result = await call('scope=all')
for (let attempt = 0; attempt < 600 && result.body.status === 'scanning'; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 50))
  result = await call('scope=all')
}
const report = result.body
if (report.status !== 'ready') throw new Error(`host report not ready: ${JSON.stringify(report).slice(0, 300)}`)

console.log(`host: ${report.totals.sessions} sessions, ${report.totals.steps} responses, ${report.totals.models} models, scan ${report.scan.durationMs}ms`)
console.log(`totals: ttft ${report.totals.ttftAvg}ms, speed ${report.totals.speedAvg} tok/s, stream ${report.totals.decodeSpeedAvg} tok/s, ${report.totals.tokensTotal} tokens`)
for (const row of report.models) {
  console.log(`  ${row.key.padEnd(44)} n=${String(row.steps).padStart(5)}  ttft ${String(row.ttftAvg).padStart(6)}ms (p50 ${row.ttftP50})  speed ${String(row.speedAvg).padStart(6)}  stream ${String(row.decodeSpeedAvg).padStart(6)} (${row.streamedSteps}/${row.steps})`)
}
const activeHours = report.hours.filter(hour => hour.steps > 0)
console.log(`hours covered: ${activeHours.map(hour => `${hour.hour}h:${hour.steps}`).join(' ')}`)
console.log(`cache hit ${report.totals.cacheHit}% over ${report.totals.contextTotal} context tokens`)

// A forced rescan must reuse every closed Session instead of re-reading it.
// Only the FIRST request carries refresh=1: a forced poll would restart the
// scan forever, which is exactly the loop the panel used to hit.
const rescanStarted = Date.now()
let rescan = await call('scope=all&refresh=1')
for (let attempt = 0; attempt < 600 && rescan.body.status === 'scanning'; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 20))
  rescan = await call('scope=all')
}
console.log(`rescan: ${Date.now() - rescanStarted}ms, reused ${rescan.body.scan?.reused}/${rescan.body.scan?.sessions}`)

// One Session's cache series, plus the single-Session report that shares its fold.
const firstSession = report.sessions[0].id
let seriesBody = await call(`scope=series&sessionId=${encodeURIComponent(firstSession)}`)
if (seriesBody.body.ok === false) throw new Error(`series failed: ${seriesBody.body.error}`)
let sessionReport = await call(`scope=session&sessionId=${encodeURIComponent(firstSession)}`)
if (sessionReport.body.ok === false) throw new Error(`session report failed: ${sessionReport.body.error}`)
console.log(`series: ${seriesBody.body.series.length} points, avg ${seriesBody.body.summary.avgRate}%, pooled ${seriesBody.body.summary.pooledRate}%`)
console.log(`drops: ${seriesBody.body.drops.length}${seriesBody.body.drops.length === 0 ? '' : ` e.g. step ${seriesBody.body.drops[0].step} ${seriesBody.body.drops[0].baseline}% → ${seriesBody.body.drops[0].rate}% [${seriesBody.body.drops[0].reasons.join(',')}]`}`)
console.log(`session report: ${sessionReport.body.totals.steps} steps, ${sessionReport.body.models.length} models, ${sessionReport.body.sessions.length} picker rows`)
const titled = report.sessions.filter(row => typeof row.title === 'string' && row.title !== '')
console.log(`picker titles: ${titled.length}/${report.sessions.length}, e.g. "${titled[0]?.title ?? '(none)'}"`)

// Attribution sanity on real data: walk the newest Sessions and show the
// sharpest drops with the reason the Host attached.
const foundDrops = []
for (const row of report.sessions.slice(0, 30)) {
  const body = (await call(`scope=series&sessionId=${encodeURIComponent(row.id)}`)).body
  if (body.ok === false) continue
  for (const drop of body.drops) foundDrops.push({ ...drop, session: row.title || row.id })
  if (foundDrops.length >= 8) break
}
console.log(`real drops found: ${foundDrops.length}`)
for (const drop of foundDrops.slice(0, 6)) {
  console.log(`  step ${String(drop.step).padStart(4)} ${String(drop.baseline).padStart(5)}% → ${String(drop.rate).padStart(5)}%  gap ${drop.gapMs === null ? '-' : Math.round(drop.gapMs / 1000) + 's'}  [${drop.reasons.join(',')}]  ${drop.session.slice(0, 26)}`)
}

// ---------------------------------------------------------------------------
// Client half: run the real source through a fake module loader.
// ---------------------------------------------------------------------------
const profileRequire = (() => {
  const candidates = [
    REACT_RESOLVE,
    path.join(process.cwd(), 'package.json'),
    new URL('../package.json', import.meta.url).pathname,
  ].filter(value => typeof value === 'string' && value !== '')
  for (const candidate of candidates) {
    try {
      const requirement = createRequire(candidate)
      requirement.resolve('react')
      requirement.resolve('react-dom/server')
      return requirement
    } catch {
      // try the next anchor
    }
  }
  throw new Error(
    'test/e2e.mjs needs React 18: install react + react-dom here (devDependencies), '
    + 'or set REACT_RESOLVE=/absolute/path/to/a/package.json that has them.',
  )
})()
let loaded
globalThis.window = {
  __ModuleLoader__: { load: module => { loaded = module.factory(profileRequire) } },
  addEventListener() {},
  removeEventListener() {},
}
globalThis.document = { baseURI: 'http://127.0.0.1:5353/' }
globalThis.fetch = async () => { throw new Error('network is not used by the server render') }

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8').replace(
  "    return {\n      inject: ['slots', 'locale'],",
  "    return {\n      __test: { ReportBody, CacheChart, Panel, SidebarButton, SessionButton, DICT, openPanel, closePanel },\n      inject: ['slots', 'locale'],",
)
vm.runInThisContext(source, { filename: 'client.js' })
if (loaded === undefined) throw new Error('client module did not register through the module loader')

const registered = new Map()
const clientCtx = {
  effect: fn => { fn(); return () => {} },
  locale: {
    register() {},
    bind: () => key => loaded.__test.DICT.zh[key] ?? key,
  },
  slots: {
    inject: (key, callback) => callback(),
    register: (options, component) => { registered.set(options.id, component); return () => {} },
  },
}
loaded.apply(clientCtx)
for (const id of ['dsh-latency-stats', 'dsh-latency-stats.session', 'dsh-latency-stats.panel']) {
  if (!registered.has(id)) throw new Error(`slot registration missing: ${id}`)
}

const React = profileRequire('react')
const { renderToStaticMarkup } = profileRequire('react-dom/server')
const h = React.createElement
const t = key => loaded.__test.DICT.zh[key] ?? key
const { ReportBody, CacheChart, Panel, SidebarButton, SessionButton, openPanel, closePanel } = loaded.__test

const markupPerModel = renderToStaticMarkup(h(ReportBody, {
  data: report, error: null, scanning: false, scanLabel: '', t, modelKey: report.models[0].key, onModelKey: () => {},
}))
const markupScanning = renderToStaticMarkup(h(ReportBody, {
  data: null, error: null, scanning: true, scanLabel: '正在读取历史会话 3/83', t, modelKey: '', onModelKey: () => {},
}))
const markupError = renderToStaticMarkup(h(ReportBody, {
  data: null, error: 'HTTP 403', scanning: false, scanLabel: '', t, modelKey: '', onModelKey: () => {},
}))
const markupEmpty = renderToStaticMarkup(h(ReportBody, {
  data: { ...report, models: [], totals: {}, recent: [] }, error: null, scanning: false, scanLabel: '', t, modelKey: '', onModelKey: () => {},
}))
const markupFoot = renderToStaticMarkup(h(SidebarButton, { wide: true, t }))
const markupRail = renderToStaticMarkup(h(SidebarButton, { wide: false, t }))
const markupHeader = renderToStaticMarkup(h(SessionButton, { sessionId: 'session-x', t }))
const markupCache = renderToStaticMarkup(h(CacheChart, {
  series: seriesBody.body.series, drops: seriesBody.body.drops, summary: seriesBody.body.summary, t,
}))
const markupCacheEmpty = renderToStaticMarkup(h(CacheChart, { series: [], summary: { steps: 0 }, t }))
const dropAt = 1_700_000_000_000
const markupDrop = renderToStaticMarkup(h(CacheChart, {
  series: [
    { i: 0, n: 1, step: 1, at: dropAt, context: 100000, read: 99000, write: 0, rate: 99 },
    { i: 1, n: 2, step: 2, at: dropAt + 20 * 60_000, context: 50000, read: 0, write: 0, rate: 0 },
    { i: 2, n: 3, step: 1, at: dropAt + 20 * 60_000 + 5000, context: 52000, read: 51000, write: 0, rate: 98 },
  ],
  drops: [
    {
      n: 2, step: 2, at: dropAt + 20 * 60_000, rate: 0, baseline: 99, gapMs: 20 * 60_000,
      context: 50000, previousContext: 100000, reasons: ['idle', 'shrink'],
    },
    {
      n: 3, step: 1, at: dropAt + 20 * 60_000 + 5000, rate: 0, baseline: 99, gapMs: 5000,
      context: 52000, previousContext: 50000, rewrite: { kind: 'compaction', tokens: 120000 },
      reasons: ['compaction'],
    },
  ],
  summary: { steps: 3, points: 3, avgRate: 65.7, pooledRate: 60, truncated: false },
  t,
}))
const markupReport = renderToStaticMarkup(h(ReportBody, {
  data: report, error: null, scanning: false, scanLabel: '', t, modelKey: '', onModelKey: () => {},
  hiddenModels: new Set(), filterOpen: false, onToggleModel: () => {}, onToggleFilter: () => {}, onShowAll: () => {},
  cache: h('div', { 'data-cache-slot': '1' }, h(CacheChart, {
    series: seriesBody.body.series, drops: seriesBody.body.drops, summary: seriesBody.body.summary, t,
  })),
}))
const hiddenKey = report.models[0].key
const markupFiltered = renderToStaticMarkup(h(ReportBody, {
  data: report, error: null, scanning: false, scanLabel: '', t, modelKey: hiddenKey, onModelKey: () => {},
  hiddenModels: new Set([hiddenKey]), filterOpen: true, onToggleModel: () => {}, onToggleFilter: () => {}, onShowAll: () => {},
}))
const markupAllHidden = renderToStaticMarkup(h(ReportBody, {
  data: report, error: null, scanning: false, scanLabel: '', t, modelKey: '', onModelKey: () => {},
  hiddenModels: new Set(report.models.map(row => row.key)), filterOpen: false,
  onToggleModel: () => {}, onToggleFilter: () => {}, onShowAll: () => {},
}))
const markupSession = renderToStaticMarkup(h(ReportBody, {
  data: sessionReport.body, error: null, scanning: false, scanLabel: '', t, modelKey: '', onModelKey: () => {},
}))

openPanel('session-x')
const markupOpen = renderToStaticMarkup(h(Panel, { t }))
closePanel()

const checks = [
  ['report table has every model', (markupReport.match(/dls-swatch/g) ?? []).length === report.models.length],
  ['cards render totals', markupReport.includes(report.totals.steps.toLocaleString('en-US'))],
  ['24 hour bars render', (markupReport.match(/dls-bar/g) ?? []).length >= 48],
  ['bar charts carry a y axis', (markupReport.match(/dls-bars-y/g) ?? []).length === 2
    && (markupReport.match(/dls-bars-grid/g) ?? []).length === 2],
  ['model filter hides a model', markupFiltered.includes('data-on="0"')
    && (markupFiltered.match(/class="dls-swatch"/g) ?? []).length === report.models.length - 1
    && markupFiltered.includes('6/7')
    && (markupReport.match(/class="dls-swatch"/g) ?? []).length === report.models.length],
  ['hidden-everything state renders', markupAllHidden.includes('所有模型都已隐藏')],
  ['model filter switches the chart', markupPerModel.includes('selected') && markupPerModel !== markupReport
    && (markupPerModel.match(/dls-bar/g) ?? []).length >= 48],
  ['recent table lists responses', (markupReport.match(/class="dls-table"/g) ?? []).length === 2
    && markupReport.includes(report.recent[0].model) && markupReport.includes('最近响应')],
  ['cache line renders points', markupCache.includes('<path') && markupCache.includes('dls-line-plot')
    && markupCache.includes(`${seriesBody.body.summary.avgRate.toFixed(1)}%`)],
  ['cache chart handles no data', markupCacheEmpty.includes('100%') && !markupCacheEmpty.includes('<path')],
  ['cache section sits above latest responses', markupReport.indexOf('data-cache-slot') > 0
    && markupReport.indexOf('data-cache-slot') < markupReport.indexOf('最近响应')],
  ['drop row explains idle, shrink and compaction', markupDrop.includes('命中率大幅下降 2 次')
    && markupDrop.includes('20m') && markupDrop.includes('100,000') && markupDrop.includes('50,000')
    && markupDrop.includes('99.0% → 0.0%') && markupDrop.includes('#2') && markupDrop.includes('#3')
    && markupDrop.includes('压缩') && markupDrop.includes('120,000')
    && /\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(markupDrop)],
  ['drop markers are coloured and legible', (markupDrop.match(/<circle/g) ?? []).length === 2
    && markupDrop.includes('dls-legend') && markupDrop.includes('上下文被改写') && markupDrop.includes('空闲过期')
    && markupDrop.includes('<title')],
  ['real session reports drops', Array.isArray(seriesBody.body.drops)],
  ['single-session report keeps its models', markupSession.includes('dsh') === false || markupSession.includes('dls-swatch')],
  ['single-session report renders stats', sessionReport.body.totals.steps > 0 && markupSession.includes('dls-stat')],
  ['rescan reuses closed sessions', (rescan.body.scan?.reused ?? 0) === (rescan.body.scan?.sessions ?? -1)
    && rescan.body.scan.sessions > 0],
  ['scanning line renders', markupScanning.includes('正在读取历史会话 3/83')],
  ['error line renders', markupError.includes('HTTP 403')],
  ['empty note renders', markupEmpty.includes('暂无可用数据')],
  ['sidebar button renders label', markupFoot.includes('模型性能') && markupFoot.includes('dls-foot')],
  ['rail button renders icon only', markupRail.includes('dls-foot rail') && !markupRail.includes('<span')],
  ['session button renders', markupHeader.includes('dls-icon-btn')],
  ['open panel renders dialog', markupOpen.includes('dls-panel') && markupOpen.includes('重新扫描') && markupOpen.includes('当前会话')],
]
let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) failed += 1
}
console.log(`\nmarkup sizes: report ${markupReport.length}, panel ${markupOpen.length}`)
if (failed > 0) process.exitCode = 1
console.log(failed === 0 ? 'all checks passed' : `${failed} check(s) failed`)

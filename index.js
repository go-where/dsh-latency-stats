/**
 * Host half of `dsh-latency-stats`.
 *
 * Folds durable Session logs (the current one included) into per-model
 * first-token latency and output speed, bucketed by hour of day, plus a
 * per-Step cache-hit series for one Session. Served as JSON on
 * `/latency-stats/api/report` for the Client panel.
 *
 * Time boundaries per Step mirror the shipped `sessionStats` projection
 * (`@deepseek-ai/dsh-session-stats`), so one Session's numbers agree with the
 * Statistics view:
 *   - ttft    = `step/start` → the first output token of that Step
 *   - decode  = first output token → `assistant/message` (stream only)
 *   - tokens  = `assistant/message`.usage.outputTokens
 *
 * Two speeds are reported because a provider that returns one buffered burst
 * has no measurable stream: `decode` only counts Steps with a real streaming
 * window, while `speed` divides the same tokens by the whole response window
 * (`step/start` → `assistant/message`) so every provider stays comparable.
 *
 * Cache accounting follows the shipped Statistics view exactly:
 * `context = inputTokens + cacheReadTokens + cacheWriteTokens` (the three
 * buckets do not overlap) and `hitRate = cacheReadTokens / context`.
 */

/** Exact route path the Client half reads. */
const ROUTE_PATH = '/latency-stats/api/report'
/** Build identity, surfaced in every response so a stale Host module is visible. */
const BUILD = '2026-11-16.1'
/** How long an "all Sessions" report stays warm before it is rebuilt. */
const CACHE_TTL_MS = 120_000
/** Upper bound of Sessions read by one cold scan (newest first). */
const MAX_SESSIONS = 800
/** Concurrency of one cold scan: each read decompresses and replays a log. */
const SCAN_CONCURRENCY = 6
/** Wall-clock budget of one cold scan; a slower corpus reports `truncated`. */
const MAX_SCAN_MS = 120_000
/** Recent per-Step rows kept for the panel's "latest" list. */
const RECENT_LIMIT = 24
/** A decode window shorter than this cannot carry a streaming rate. */
const MIN_STREAM_MS = 100
/** Steps kept in one cache-hit series. */
const SERIES_LIMIT = 2000
/** Sessions offered to the cache-hit picker. */
const PICKER_ROWS = 400

/** Services this plugin needs; without them it stays inactive instead of throwing. */
export const inject = ['webServer', 'sessionQuery']

/**
 * Time of the first member of one packed run accepted by `predicate`.
 * @param run - packed `*-chunks` record.
 * @param predicate - member filter.
 * @returns the reconstructed member time, or null when no member qualifies.
 */
function runMemberTime(run, predicate) {
  const fragments = run.type === 'tool-call-chunks' ? run.args : run.texts
  if (!Array.isArray(fragments) || !Array.isArray(run.dt)) return null
  if (typeof run.time0 !== 'number') return null
  let time = run.time0
  for (let index = 0; index < fragments.length; index += 1) {
    if (index > 0) time += run.dt[index - 1] ?? 0
    if (predicate(fragments[index])) return time
  }
  return null
}

/**
 * Reconstruct the time of the first output token of one packed stream.
 * Mirrors `assistantStreamFirstTokenTime` from `@deepseek-ai/dsh-llm`.
 * @param stream - durable `assistant/*` stream records, in arrival order.
 * @returns the absolute time of the first token, or null when none exists.
 */
function firstTokenTime(stream) {
  if (!Array.isArray(stream)) return null
  for (const record of stream) {
    if (!record || typeof record !== 'object') continue
    if (record.type === 'chunk') {
      const chunk = record.chunk
      if (!chunk || typeof chunk !== 'object') continue
      if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') {
        if (typeof chunk.text === 'string' && chunk.text !== '') return record.time
      } else if (chunk.type === 'tool-call-delta') {
        if (chunk.argumentsDelta !== '' || chunk.name !== undefined) return record.time
      }
      continue
    }
    if (record.type === 'tool-call-chunks') {
      if (record.name !== undefined && typeof record.time0 === 'number') return record.time0
      const named = runMemberTime(record, fragment => fragment !== '')
      if (named !== null) return named
      continue
    }
    if (record.type === 'text-chunks' || record.type === 'reasoning-chunks') {
      const found = runMemberTime(record, fragment => fragment !== '')
      if (found !== null) return found
    }
  }
  return null
}

/** @returns a finite non-negative number, or null. */
function countOf(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * Fold one Session log into per-Step observations plus the facts the panel
 * needs about that Session (title, first/last activity, models used).
 * @param snapshot - `sessionQuery.readSession` result.
 * @returns `{ observations, title, models }`.
 */
function foldSession(snapshot) {
  const events = snapshot.events ?? []
  const inherited = snapshot.inheritedEventCount ?? 0
  const observations = []
  const rewrites = []
  let title = ''
  let open = null
  const close = () => { open = null }

  for (const event of events) {
    if (typeof event.seq === 'number' && event.seq < inherited) continue
    switch (event.type) {
      case 'step/start':
        open = {
          turn: event.data?.turn,
          step: event.data?.step,
          startTime: event.time,
          firstTokenTime: null,
        }
        break
      case 'assistant/attempt': {
        if (open === null) break
        if (open.turn !== event.data?.turn || open.step !== event.data?.step) break
        if (open.firstTokenTime !== null) break
        open.firstTokenTime = firstTokenTime(event.data?.stream)
        break
      }
      case 'assistant/message': {
        if (open === null) break
        if (open.turn !== event.data?.turn || open.step !== event.data?.step) break
        const startTime = open.startTime
        const turn = open.turn
        const step = open.step
        const firstToken = open.firstTokenTime ?? firstTokenTime(event.data?.stream)
        close()
        if (firstToken === null) break
        const source = event.data?.message?.source ?? {}
        const usage = event.data?.usage ?? {}
        const tokens = countOf(usage.outputTokens)
        observations.push({
          provider: typeof source.provider === 'string' && source.provider !== '' ? source.provider : 'unknown',
          model: typeof source.model === 'string' && source.model !== '' ? source.model : 'unknown',
          at: event.time,
          turn,
          step,
          ttft: Math.max(0, firstToken - startTime),
          responseMs: Math.max(0, event.time - startTime),
          decodeMs: tokens === null ? null : Math.max(0, event.time - firstToken),
          tokens,
          inputTokens: countOf(usage.inputTokens) ?? 0,
          reasoningTokens: countOf(usage.reasoningTokens) ?? 0,
          cacheReadTokens: countOf(usage.cacheReadTokens) ?? 0,
          cacheWriteTokens: countOf(usage.cacheWriteTokens) ?? 0,
        })
        break
      }
      case 'session/title': {
        const next = event.data?.title
        if (typeof next === 'string' && next !== '') title = next
        break
      }
      // Context rewrites are the one thing that explains a cache drop better
      // than a heuristic: both land immediately before the next request.
      case 'compaction/summary':
        rewrites.push({ at: event.time, kind: 'compaction', tokens: countOf(event.data?.shadowedTokenCount) })
        break
      case 'compaction/prune':
        rewrites.push({ at: event.time, kind: 'prune', tokens: countOf(event.data?.shadowedTokenCount) })
        break
      case 'step/end':
      case 'turn/end':
        close()
        break
      default:
        break
    }
  }

  return { observations, title, rewrites }
}

/** @returns a zeroed accumulator. */
function newBucket() {
  return {
    steps: 0,
    ttftSum: 0,
    ttftCount: 0,
    tokens: 0,
    responseMs: 0,
    streamMs: 0,
    streamTokens: 0,
    streamedSteps: 0,
    context: 0,
    cacheRead: 0,
    cacheWrite: 0,
  }
}

/**
 * Accumulate one observation into one bucket.
 * @param bucket - accumulator.
 * @param observation - folded Step.
 */
function addToBucket(bucket, observation) {
  bucket.steps += 1
  bucket.ttftSum += observation.ttft
  bucket.ttftCount += 1
  bucket.responseMs += observation.responseMs
  // Cache buckets never overlap: input is the uncached remainder.
  bucket.context += observation.inputTokens + observation.cacheReadTokens + observation.cacheWriteTokens
  bucket.cacheRead += observation.cacheReadTokens
  bucket.cacheWrite += observation.cacheWriteTokens
  if (observation.tokens === null) return
  bucket.tokens += observation.tokens
  if (observation.decodeMs !== null && observation.decodeMs >= MIN_STREAM_MS && observation.tokens >= 2) {
    bucket.streamMs += observation.decodeMs
    bucket.streamTokens += observation.tokens
    bucket.streamedSteps += 1
  }
}

/** @returns the readable figures of one bucket. */
function readBucket(bucket) {
  return {
    steps: bucket.steps,
    tokens: bucket.tokens,
    ttftMs: bucket.ttftCount === 0 ? null : Math.round(bucket.ttftSum / bucket.ttftCount),
    speed: bucket.responseMs <= 0 ? null : Math.round((bucket.tokens / bucket.responseMs) * 1000 * 10) / 10,
    decodeSpeed: bucket.streamMs <= 0 ? null : Math.round((bucket.streamTokens / bucket.streamMs) * 1000 * 10) / 10,
    streamedSteps: bucket.streamedSteps,
    context: bucket.context,
    cacheRead: bucket.cacheRead,
    cacheHit: bucket.context <= 0 ? null : Math.round((bucket.cacheRead / bucket.context) * 1000) / 10,
  }
}

/**
 * Nearest-rank percentile over an unsorted copy.
 * @param values - samples.
 * @param fraction - 0..1.
 * @returns the percentile, or null for an empty list.
 */
function percentile(values, fraction) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return sorted[index]
}

/** @returns the mean, or null for an empty list. */
function mean(values) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Reduce per-Step observations into the report payload.
 * @param observations - folded Steps in log order.
 * @param sessionRows - one row per scanned Session, newest first.
 * @param meta - scan bookkeeping merged into the payload.
 * @returns the Client-facing report.
 */
function aggregate(observations, sessionRows, meta) {
  const models = new Map()
  const hours = Array.from({ length: 24 }, newBucket)
  const hourByModel = new Map()
  const dayMap = new Map()
  const weekday = Array.from({ length: 7 }, newBucket)
  const recent = []
  const totals = newBucket()

  for (const observation of observations) {
    const key = `${observation.provider} / ${observation.model}`
    let model = models.get(key)
    if (model === undefined) {
      model = {
        key,
        provider: observation.provider,
        model: observation.model,
        bucket: newBucket(),
        ttft: [],
        speeds: [],
        tokens: [],
        firstAt: observation.at,
        lastAt: observation.at,
      }
      models.set(key, model)
      hourByModel.set(key, Array.from({ length: 24 }, newBucket))
    }
    addToBucket(model.bucket, observation)
    addToBucket(totals, observation)
    model.firstAt = Math.min(model.firstAt, observation.at)
    model.lastAt = Math.max(model.lastAt, observation.at)
    model.ttft.push(observation.ttft)
    if (observation.tokens !== null) model.tokens.push(observation.tokens)
    if (observation.tokens !== null && observation.responseMs > 0) {
      model.speeds.push((observation.tokens / observation.responseMs) * 1000)
    }

    const date = new Date(observation.at)
    const hour = date.getHours()
    addToBucket(hours[hour], observation)
    addToBucket(hourByModel.get(key)[hour], observation)
    addToBucket(weekday[date.getDay()], observation)

    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    let day = dayMap.get(dayKey)
    if (day === undefined) {
      day = newBucket()
      dayMap.set(dayKey, day)
    }
    addToBucket(day, observation)

    recent.push({
      at: observation.at,
      model: key,
      ttft: Math.round(observation.ttft),
      speed: observation.tokens !== null && observation.responseMs > 0
        ? Math.round((observation.tokens / observation.responseMs) * 1000 * 10) / 10
        : null,
      decodeSpeed: observation.tokens !== null && observation.decodeMs !== null && observation.decodeMs >= MIN_STREAM_MS
        ? Math.round((observation.tokens / observation.decodeMs) * 1000 * 10) / 10
        : null,
      tokens: observation.tokens,
      cacheHit: observation.inputTokens + observation.cacheReadTokens + observation.cacheWriteTokens <= 0
        ? null
        : Math.round((observation.cacheReadTokens / (observation.inputTokens + observation.cacheReadTokens + observation.cacheWriteTokens)) * 1000) / 10,
    })
  }

  const modelRows = [...models.values()]
    .sort((a, b) => b.bucket.steps - a.bucket.steps)
    .map(model => {
      const figures = readBucket(model.bucket)
      return {
        key: model.key,
        provider: model.provider,
        model: model.model,
        steps: model.bucket.steps,
        firstAt: model.firstAt,
        lastAt: model.lastAt,
        ttftAvg: figures.ttftMs,
        ttftP50: Math.round(percentile(model.ttft, 0.5)),
        ttftP90: Math.round(percentile(model.ttft, 0.9)),
        ttftMin: Math.round(Math.min(...model.ttft)),
        ttftMax: Math.round(Math.max(...model.ttft)),
        speedAvg: figures.speed,
        speedP50: model.speeds.length === 0 ? null : Math.round(percentile(model.speeds, 0.5) * 10) / 10,
        decodeSpeedAvg: figures.decodeSpeed,
        streamedSteps: figures.streamedSteps,
        tokensAvg: model.tokens.length === 0 ? null : Math.round(mean(model.tokens)),
        tokensTotal: model.tokens.reduce((sum, value) => sum + value, 0),
        inputTokens: figures.context - figures.cacheRead - figures.cacheWrite,
        contextTokens: figures.context,
        cacheHit: figures.cacheHit,
      }
    })

  const totalsOut = readBucket(totals)
  return {
    totals: {
      sessions: meta.sessions,
      steps: observations.length,
      models: modelRows.length,
      ttftAvg: totalsOut.ttftMs,
      speedAvg: totalsOut.speed,
      decodeSpeedAvg: totalsOut.decodeSpeed,
      tokensTotal: totalsOut.tokens,
      contextTotal: totalsOut.context,
      cacheHit: totalsOut.cacheHit,
      firstAt: observations.length === 0 ? null : observations[0].at,
      lastAt: observations.length === 0 ? null : observations[observations.length - 1].at,
    },
    models: modelRows,
    sessions: sessionRows,
    hours: hours.map((bucket, hour) => ({ hour, ...readBucket(bucket) })),
    days: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
      .map(([date, bucket]) => ({ date, ...readBucket(bucket) })),
    weekdays: weekday.map((bucket, day) => ({ day, ...readBucket(bucket) })),
    hourByModel: [...hourByModel.entries()].map(([key, buckets]) => ({
      key,
      hours: buckets.map((bucket, hour) => ({ hour, ...readBucket(bucket) })),
    })),
    recent: recent.slice(-RECENT_LIMIT).reverse(),
    scan: meta,
  }
}

/**
 * Read one Session log, tolerating a missing or unmigrated log.
 * @param ctx - Host plugin context.
 * @param id - Session id.
 * @param warnings - collector for non-fatal failures.
 * @returns the log snapshot, or undefined when the Session cannot be read.
 */
async function readOne(ctx, id, warnings) {
  try {
    return await ctx.sessionQuery.readSession(id)
  } catch (error) {
    // A live Session can carry an open tail that replay validation rejects;
    // the live store already holds the authoritative event list, so fall back
    // to it instead of dropping the conversation being measured.
    const live = ctx.get('sessions')
    if (live !== undefined && typeof live.get === 'function') {
      try {
        const session = live.get(id)
        if (session !== undefined) {
          return {
            session: session.header,
            inheritedEventCount: session.inheritedEventCount ?? 0,
            events: session.snapshotEvents(),
          }
        }
      } catch {
        // fall through to the warning
      }
    }
    if (warnings.length < 20) {
      warnings.push({ sessionId: id, reason: error instanceof Error ? error.message : String(error) })
    }
    return undefined
  }
}

/**
 * One picker row. `parentSession`/`subagent`/`depth` let the Client rebuild the
 * conversation tree instead of listing every subagent as its own conversation.
 * @returns the row.
 */
function sessionRow(id, header, entry) {
  const last = entry.observations.length === 0 ? null : entry.observations[entry.observations.length - 1].at
  return {
    id,
    title: entry.title,
    createdAt: typeof header?.createdAt === 'number' ? header.createdAt : last,
    updatedAt: last,
    steps: entry.observations.length,
    parentSession: typeof header?.parentSession === 'string' ? header.parentSession : null,
    subagent: header?.origin === 'subagent',
    depth: typeof header?.delegationDepth === 'number' ? header.delegationDepth : 0,
    cwd: typeof header?.cwd === 'string' ? header.cwd : undefined,
  }
}

/**
 * Read every Session once, reusing the fold of any Session that was already
 * closed at its last read: a persisted log never gains events while it is not
 * live, so re-reading it would only cost time.
 * @param ctx - Host plugin context.
 * @param state - shared caches.
 * @returns observations, picker rows, and scan bookkeeping.
 */
async function scanAll(ctx, state) {
  const startedAt = Date.now()
  const records = await ctx.sessionQuery.listSessions()
  const kept = records.slice(0, MAX_SESSIONS)
  state.progress = { used: 0, total: kept.length, sessionId: null, reused: 0 }
  const warnings = []
  const observations = []
  const rows = []
  const pending = []
  let truncated = records.length > kept.length

  for (const record of kept) {
    const id = record.header?.id
    if (typeof id !== 'string') continue
    const cached = state.sessions.get(id)
    if (cached !== undefined && cached.live === false && record.live === false) {
      observations.push(...cached.observations)
      rows.push(sessionRow(id, record.header, cached))
      state.progress.used += 1
      state.progress.reused += 1
      continue
    }
    pending.push({ id, header: record.header, live: record.live === true })
  }

  const worker = async () => {
    while (pending.length > 0) {
      if (Date.now() - startedAt > MAX_SCAN_MS) { truncated = true; return }
      const job = pending.shift()
      if (job === undefined) return
      const snapshot = await readOne(ctx, job.id, warnings)
      if (snapshot !== undefined) {
        const entry = foldSession(snapshot)
        state.sessions.set(job.id, { live: job.live, ...entry })
        observations.push(...entry.observations)
        rows.push(sessionRow(job.id, job.header ?? snapshot.session, entry))
      }
      state.progress.used += 1
    }
  }
  await Promise.all(Array.from({ length: Math.min(SCAN_CONCURRENCY, pending.length) }, worker))

  observations.sort((a, b) => a.at - b.at)
  rows.sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0))
  return {
    observations,
    rows: rows.slice(0, PICKER_ROWS),
    report: {
      scope: 'all',
      sessionId: null,
      sessions: state.progress.used,
      reused: state.progress.reused,
      durationMs: Date.now() - startedAt,
      generatedAt: Date.now(),
      truncated,
      warnings: warnings.slice(0, 8),
    },
  }
}

/**
 * Cheap picker list for the cache chart: session headers plus whatever the
 * fold cache already knows. Never reads a log, so it is safe to call while the
 * panel opens a single conversation. The Client turns these rows into the
 * conversation tree (root Session plus its subagents).
 * @param ctx - Host plugin context.
 * @param state - shared caches.
 * @returns picker rows.
 */
async function sessionPickerRows(ctx, state) {
  const records = await ctx.sessionQuery.listSessions()
  const rows = []
  for (const record of records.slice(0, PICKER_ROWS)) {
    const id = record.header?.id
    if (typeof id !== 'string') continue
    const cached = state.sessions.get(id)
    rows.push({
      id,
      title: cached?.title ?? '',
      createdAt: typeof record.header?.createdAt === 'number' ? record.header.createdAt : null,
      updatedAt: cached !== undefined && cached.observations.length > 0
        ? cached.observations[cached.observations.length - 1].at
        : null,
      steps: cached === undefined ? null : cached.observations.length,
      parentSession: typeof record.header?.parentSession === 'string' ? record.header.parentSession : null,
      subagent: record.header?.origin === 'subagent',
      depth: typeof record.header?.delegationDepth === 'number' ? record.header.delegationDepth : 0,
      cwd: typeof record.header?.cwd === 'string' ? record.header.cwd : undefined,
    })
  }
  return rows
}

/**
 * Read one Session and fold it.
 * @param ctx - Host plugin context.
 * @param sessionId - target Session.
 * @returns `{ snapshot, entry }`, or undefined when the log cannot be read.
 */
async function readSessionEntry(ctx, sessionId) {
  const snapshot = await readOne(ctx, sessionId, [])
  if (snapshot === undefined) return undefined
  return { snapshot, entry: foldSession(snapshot) }
}

/**
 * Reduce one folded Session to its per-Step cache-hit series.
 *
 * A Step's cache hit only tells the story next to its neighbours, so the same
 * pass reports sharp drops with the facts that explain them: an idle gap
 * (upstream cache TTL), a context shrink (compaction or pruning rewrote the
 * prefix), a model switch (caches are per provider/model), or none of those,
 * which leaves a plain prefix change.
 * @param entry - folded Session.
 * @returns the series, its summary, and the attributed drops.
 */
function seriesOf(entry) {
  const observations = entry.observations
  const rewrites = entry.rewrites ?? []
  const stride = observations.length > SERIES_LIMIT ? Math.ceil(observations.length / SERIES_LIMIT) : 1
  const series = []
  for (let index = 0; index < observations.length; index += 1) {
    if (stride > 1 && index % stride !== 0 && index !== observations.length - 1) continue
    const observation = observations[index]
    const context = observation.inputTokens + observation.cacheReadTokens + observation.cacheWriteTokens
    series.push({
      i: series.length,
      n: index + 1,
      turn: observation.turn,
      step: observation.step,
      at: observation.at,
      model: `${observation.provider} / ${observation.model}`,
      context,
      read: observation.cacheReadTokens,
      write: observation.cacheWriteTokens,
      rate: context <= 0 ? null : Math.round((observation.cacheReadTokens / context) * 1000) / 10,
    })
  }

  const measured = series.filter(point => typeof point.rate === 'number')
  const drops = []
  let recent = []
  for (let index = 0; index < measured.length; index += 1) {
    const point = measured[index]
    const previous = index === 0 ? null : measured[index - 1]
    if (recent.length > 0) {
      const baseline = percentile(recent, 0.5)
      if (baseline - point.rate >= 25) {
        const gapMs = previous === null ? null : point.at - previous.at
        const next = measured[index + 1]
        // A single miss that recovers on the very next request is provider-side
        // jitter, not a rewritten prefix: a changed prefix would stay missing.
        const transient = next !== undefined && typeof next.rate === 'number' && next.rate >= baseline - 10
        const rewrite = previous === null
          ? undefined
          : rewrites.findLast(item => item.at >= previous.at && item.at <= point.at)
        const reasons = []
        if (previous !== null && previous.model !== point.model) reasons.push('model')
        if (rewrite?.kind === 'compaction') reasons.push('compaction')
        else if (rewrite?.kind === 'prune') reasons.push('prune')
        if (gapMs !== null && gapMs >= 10 * 60_000) reasons.push('idle')
        if (rewrite?.kind !== 'compaction' && previous !== null && previous.context > 0
          && point.context < previous.context * 0.8) reasons.push('shrink')
        // Fallbacks, in order of evidence strength: a single-step recovery is
        // only claimed when nothing else already explains the miss.
        if (reasons.length === 0 && transient) reasons.push('transient')
        if (reasons.length === 0) reasons.push('prefix')
        drops.push({
          n: point.n,
          step: point.step,
          at: point.at,
          rate: point.rate,
          baseline: Math.round(baseline * 10) / 10,
          gapMs,
          context: point.context,
          previousContext: previous?.context ?? null,
          model: point.model,
          previousModel: previous?.model ?? null,
          rewrite: rewrite === undefined ? null : { kind: rewrite.kind, tokens: rewrite.tokens },
          transient,
          reasons,
        })
      }
    }
    recent.push(point.rate)
    if (recent.length > 5) recent.shift()
  }

  const totalRead = series.reduce((sum, point) => sum + point.read, 0)
  const totalContext = series.reduce((sum, point) => sum + point.context, 0)
  return {
    series,
    drops: drops.slice(-12),
    summary: {
      steps: observations.length,
      points: series.length,
      measured: measured.length,
      avgRate: measured.length === 0 ? null : Math.round(mean(measured.map(point => point.rate)) * 10) / 10,
      pooledRate: totalContext <= 0 ? null : Math.round((totalRead / totalContext) * 1000) / 10,
      totalRead,
      totalWrite: series.reduce((sum, point) => sum + point.write, 0),
      totalContext,
      truncated: stride > 1,
      drops: drops.length,
    },
  }
}


/**
 * Run one cold "all Sessions" scan and store its report.
 * @param ctx - Host plugin context.
 * @param state - shared caches.
 * @param key - cache key.
 */
async function runAllScan(ctx, state, key) {
  if (state.inflight.has(key)) return state.inflight.get(key)
  state.lastError = null
  const task = (async () => {
    const scanned = await scanAll(ctx, state)
    const report = aggregate(scanned.observations, scanned.rows, {
      ...scanned.report,
      build: BUILD,
      generatedAt: Date.now(),
    })
    state.cache.set(key, { at: Date.now(), report })
    return report
  })()
    .catch((error) => {
      state.cache.delete(key)
      state.lastError = error instanceof Error ? error.message : String(error)
      throw error
    })
    .finally(() => {
      state.inflight.delete(key)
      state.progress = null
    })
  state.inflight.set(key, task)
  return task
}

/**
 * Serve one report request.
 * @param ctx - Host plugin context.
 * @param state - shared caches.
 * @param query - request query (`scope`, `sessionId`, `refresh`).
 * @returns the report, or a `scanning` status while a cold scan runs.
 */
async function buildReport(ctx, state, query) {
  if (query.scope === 'series') {
    if (typeof query.sessionId !== 'string' || query.sessionId === '') {
      return { ok: false, error: 'sessionId is required for scope=series' }
    }
    const cached = state.seriesCache.get(query.sessionId)
    if (cached !== undefined && query.refresh !== '1' && Date.now() - cached.at < 15_000) return cached.payload
    const read = await readSessionEntry(ctx, query.sessionId)
    if (read === undefined) return { ok: false, error: 'session not found' }
    const { series, summary, drops } = seriesOf(read.entry)
    const payload = {
      ok: true,
      status: 'ready',
      session: {
        id: query.sessionId,
        title: read.entry.title,
        createdAt: typeof read.snapshot.session?.createdAt === 'number' ? read.snapshot.session.createdAt : null,
        cwd: typeof read.snapshot.session?.cwd === 'string' ? read.snapshot.session.cwd : undefined,
      },
      series,
      drops,
      summary,
      generatedAt: Date.now(),
    }
    state.seriesCache.set(query.sessionId, { at: Date.now(), payload })
    return payload
  }

  if (query.scope === 'session') {
    if (typeof query.sessionId !== 'string' || query.sessionId === '') {
      return { ok: false, error: 'sessionId is required for scope=session' }
    }
    const read = await readSessionEntry(ctx, query.sessionId)
    if (read === undefined) return { ok: false, error: 'session not found' }
    const { series, summary, drops } = seriesOf(read.entry)
    // The single-Session view reuses the same fold as its cache series, so the
    // two can never disagree about what happened in this conversation.
    const report = aggregate(read.entry.observations, [sessionRow(query.sessionId, read.snapshot.session, read.entry)], {
      scope: 'session',
      sessionId: query.sessionId,
      sessions: 1,
      reused: 0,
      durationMs: 0,
      generatedAt: Date.now(),
      truncated: false,
      warnings: [],
      build: BUILD,
    })
    // The picker prefers the measured title and step count of this Session.
    const picker = await sessionPickerRows(ctx, state)
    const current = picker.find(row => row.id === query.sessionId)
    if (current !== undefined) {
      current.title = read.entry.title
      current.steps = read.entry.observations.length
      current.updatedAt = read.entry.observations.length === 0
        ? null
        : read.entry.observations[read.entry.observations.length - 1].at
    }
    return {
      ok: true,
      status: 'ready',
      session: {
        id: query.sessionId,
        title: read.entry.title,
        createdAt: typeof read.snapshot.session?.createdAt === 'number' ? read.snapshot.session.createdAt : null,
        cwd: typeof read.snapshot.session?.cwd === 'string' ? read.snapshot.session.cwd : undefined,
      },
      ...report,
      sessions: picker,
      series,
      drops,
      seriesSummary: summary,
    }
  }

  const key = 'all'
  const force = query.refresh === '1'
  const cached = state.cache.get(key)
  if (!force && cached !== undefined && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ok: true, status: 'ready', ...cached.report }
  }
  if (state.inflight.has(key)) {
    return { ok: true, status: 'scanning', progress: state.progress }
  }
  if (state.lastError !== null && cached === undefined) {
    const error = state.lastError
    state.lastError = null
    return { ok: false, error }
  }
  if (cached !== undefined && !force) {
    // A stale report beats an empty panel; the rescan below replaces it.
    void runAllScan(ctx, state, key).catch(() => {})
    return { ok: true, status: 'ready', stale: true, ...cached.report }
  }
  void runAllScan(ctx, state, key).catch(() => {})
  return { ok: true, status: 'scanning', progress: state.progress }
}

/**
 * Write one JSON response.
 * @param res - Node response.
 * @param status - HTTP status.
 * @param body - JSON body.
 */
function writeJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

/**
 * Allow only requests the page itself may make: same Host/Origin, and the
 * browser credential the index already minted.
 * @param ctx - Host plugin context.
 * @param req - incoming request.
 * @returns whether the request may read this Host route.
 */
function admitted(ctx, req) {
  const connection = ctx.get('connection')
  if (connection === undefined || typeof connection.requestRejection !== 'function') return true
  try {
    return connection.requestRejection(req) === undefined
  } catch {
    return false
  }
}

/**
 * Plugin body: mount the report route.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  const state = {
    cache: new Map(),
    seriesCache: new Map(),
    sessions: new Map(),
    inflight: new Map(),
    progress: null,
    lastError: null,
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (!admitted(ctx, req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden', build: BUILD })
        return
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        writeJson(res, 405, { ok: false, error: 'method not allowed', build: BUILD })
        return
      }
      const url = new URL(req.url ?? ROUTE_PATH, 'http://dsh.internal')
      try {
        const report = await buildReport(ctx, state, {
          scope: url.searchParams.get('scope') ?? 'all',
          sessionId: url.searchParams.get('sessionId') ?? undefined,
          refresh: url.searchParams.get('refresh') ?? '0',
        })
        writeJson(res, report.ok === false ? 400 : 200, { build: BUILD, ...report })
      } catch (error) {
        writeJson(res, 500, {
          ok: false,
          build: BUILD,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }), 'dsh-latency-stats: report route')
}

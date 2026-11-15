window.__ModuleLoader__.load({
  id: 'dsh-latency-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React

    const NS = 'dsh-latency-stats'
    const DICT = {
      zh: {
        'action.title': '模型性能',
        'action.session': '本次对话的模型性能',
        'panel.title': '模型性能统计',
        'panel.subtitle': '首 token 延迟、输出速度与缓存命中',
        'scope.all': '全部会话',
        'scope.session': '当前会话',
        'action.refresh': '重新扫描',
        'action.close': '关闭',
        'state.loading': '正在统计…',
        'state.scanning': '正在读取会话',
        'card.sessions': '会话',
        'card.steps': '模型响应步',
        'card.ttft': '平均首 token',
        'card.speed': '平均输出速度',
        'card.cache': '平均缓存命中',
        'card.tokens': '累计输出 tokens',
        'section.hours': '按小时分布',
        'section.models': '模型明细',
        'section.cache': '缓存命中率曲线',
        'section.recent': '最近响应',
        'chart.ttft': '平均首 token 延迟（ms）',
        'chart.speed': '平均输出速度（tok/s，含首 token）',
        'chart.steps': '步',
        'chart.model': '图表模型',
        'chart.all': '全部模型',
        'chart.axis': '本地时间（0–23 时）',
        'table.model': '模型',
        'table.steps': '步数',
        'table.ttft': '首 token 平均 / P50 / P90',
        'table.speed': '输出速度 平均 / P50',
        'table.decode': '流式生成',
        'table.cache': '缓存命中',
        'table.tokens': '平均输出',
        'table.total': '累计 tokens',
        'models.filter': '模型筛选',
        'models.showAll': '全部显示',
        'models.hideAll': '全部隐藏',
        'models.hiddenAll': '所有模型都已隐藏，点「全部显示」恢复。',
        'models.hiddenNote': '已隐藏 {n} 个模型',
        'cache.session': '会话',
        'cache.subagent': '子代理',
        'cache.avg': '平均命中',
        'cache.pooled': '按 token 加权',
        'cache.points': '个采样步',
        'cache.empty': '这个会话还没有带用量记录的步骤。',
        'cache.loading': '正在读取会话…',
        'cache.legend': '缓存读取 tokens ÷ 上下文 tokens（输入 + 缓存读 + 缓存写）',
        'cache.hover': '第 {n} 次响应 · {time} · 命中 {rate}% · 上下文 {context} tokens · 缓存读 {read}',
        'cache.truncated': '步数过多，图表已抽样。',
        'cache.drop.title': '命中率大幅下降 {n} 次',
        'cache.drop.time': '时间',
        'cache.drop.index': '次序',
        'cache.drop.change': '变化',
        'cache.drop.cause': '可能原因',
        'cache.reason.model': '切换了模型/供应商，缓存不共享',
        'cache.reason.compaction': '上下文被压缩，约 {tokens} tokens 被摘要替换',
        'cache.reason.prune': '工具结果被裁剪，约 {tokens} tokens 被替换',
        'cache.reason.idle': '距上一步 {gap}，上游缓存可能过期',
        'cache.reason.shrink': '上下文 {from} → {to}，前缀被改写',
        'cache.reason.transient': '单次未命中后立即恢复，多为供应商侧缓存抖动',
        'cache.reason.prefix': '前缀变化（系统提示、工具集或历史被改写）',
        'cache.hover.drop': '缓存下降：{reasons}',
        'cache.legend.rewrite': '上下文被改写',
        'cache.legend.idle': '空闲过期',
        'cache.legend.model': '切换模型',
        'cache.legend.other': '抖动/未知',
        'cache.reason.some': '若干',
        'cache.axis.from': '第 1 次响应',
        'cache.axis.to': '第 {n} 次响应',
        'recent.time': '时间',
        'recent.model': '模型',
        'recent.ttft': '首 token',
        'recent.speed': '输出速度',
        'recent.cache': '缓存命中',
        'recent.tokens': '输出 tokens',
        'note.method': '首 token 延迟 = 该步开始 → 首个输出 token；输出速度 = 输出 tokens ÷（该步开始 → 响应落地），含首 token；流式生成只统计有真实流式窗口（≥100ms）的步；缓存命中 = 缓存读 ÷ 上下文。时间按本机时区分桶。',
        'note.empty': '暂无可用数据：会话里还没有带用量记录的模型响应。',
        'note.truncated': '扫描量已截断，仅统计最近的部分会话。',
        'note.reused': '复用缓存',
        'note.generated': '生成于',
        'note.scanned': '扫描',
        'note.sessions': '个会话',
        'note.warnings': '个会话读取失败',
        'error.prefix': '统计失败',
        'error.forbidden': '无法访问本机统计接口（权限被拒绝）。',
      },
      en: {
        'action.title': 'Model performance',
        'action.session': 'Model performance of this conversation',
        'panel.title': 'Model performance',
        'panel.subtitle': 'First-token latency, output speed and cache hits',
        'scope.all': 'All sessions',
        'scope.session': 'This session',
        'action.refresh': 'Rescan',
        'action.close': 'Close',
        'state.loading': 'Collecting…',
        'state.scanning': 'Reading sessions',
        'card.sessions': 'Sessions',
        'card.steps': 'Model responses',
        'card.ttft': 'Avg first token',
        'card.speed': 'Avg output speed',
        'card.cache': 'Avg cache hit',
        'card.tokens': 'Output tokens',
        'section.hours': 'By hour',
        'section.models': 'Models',
        'section.cache': 'Cache hit rate per step',
        'section.recent': 'Latest responses',
        'chart.ttft': 'Average first-token latency (ms)',
        'chart.speed': 'Average output speed (tok/s, first token included)',
        'chart.steps': 'steps',
        'chart.model': 'Chart model',
        'chart.all': 'All models',
        'chart.axis': 'Local time (0–23 h)',
        'table.model': 'Model',
        'table.steps': 'Steps',
        'table.ttft': 'First token avg / P50 / P90',
        'table.speed': 'Output speed avg / P50',
        'table.decode': 'Stream rate',
        'table.cache': 'Cache hit',
        'table.tokens': 'Avg output',
        'table.total': 'Total tokens',
        'models.filter': 'Models',
        'models.showAll': 'Show all',
        'models.hideAll': 'Hide all',
        'models.hiddenAll': 'Every model is hidden. Use “Show all” to bring them back.',
        'models.hiddenNote': '{n} models hidden',
        'cache.session': 'Session',
        'cache.subagent': 'subagent',
        'cache.avg': 'Avg hit',
        'cache.pooled': 'Token-weighted',
        'cache.points': 'sampled steps',
        'cache.empty': 'This session has no step with a usage record yet.',
        'cache.loading': 'Reading session…',
        'cache.legend': 'Cache-read tokens ÷ context tokens (input + cache read + cache write)',
        'cache.hover': 'Response {n} · {time} · {rate}% hit · {context} context tokens · {read} from cache',
        'cache.truncated': 'Sampled because the session has many steps.',
        'cache.drop.title': '{n} sharp cache drop(s)',
        'cache.drop.time': 'Time',
        'cache.drop.index': 'Order',
        'cache.drop.change': 'Change',
        'cache.drop.cause': 'Likely cause',
        'cache.reason.model': 'model or provider switched, so the cache is not shared',
        'cache.reason.compaction': 'context compacted, about {tokens} tokens replaced by a summary',
        'cache.reason.prune': 'tool results pruned, about {tokens} tokens replaced',
        'cache.reason.idle': '{gap} since the previous step, so the upstream cache may have expired',
        'cache.reason.shrink': 'context {from} → {to}, so the prefix was rewritten',
        'cache.reason.transient': 'single miss that recovered immediately, typical of provider-side cache jitter',
        'cache.reason.prefix': 'prefix changed (system prompt, tool set, or rewritten history)',
        'cache.hover.drop': 'Cache drop: {reasons}',
        'cache.legend.rewrite': 'context rewritten',
        'cache.legend.idle': 'idle expiry',
        'cache.legend.model': 'model switch',
        'cache.legend.other': 'jitter/unknown',
        'cache.reason.some': 'some',
        'cache.axis.from': 'response 1',
        'cache.axis.to': 'response {n}',
        'recent.time': 'Time',
        'recent.model': 'Model',
        'recent.ttft': 'First token',
        'recent.speed': 'Output speed',
        'recent.cache': 'Cache hit',
        'recent.tokens': 'Output tokens',
        'note.method': 'First-token latency = step start → first output token; output speed = output tokens ÷ (step start → response landed), first token included; stream rate counts only steps with a real streaming window (≥100 ms); cache hit = cache read ÷ context. Hours use the local time zone.',
        'note.empty': 'No data yet: no model response in this session carries a usage record.',
        'note.truncated': 'The scan was capped, so only the most recent sessions are counted.',
        'note.reused': 'reused',
        'note.generated': 'Generated',
        'note.scanned': 'Scanned',
        'note.sessions': 'sessions',
        'note.warnings': 'sessions failed to read',
        'error.prefix': 'Statistics failed',
        'error.forbidden': 'The local statistics endpoint refused this page (forbidden).',
      },
    }

    // ---------------------------------------------------------------------
    // Panel store: the two buttons and the overlay share one tiny store.
    // ---------------------------------------------------------------------
    let ui = { open: false, scope: 'all', sessionId: null, refreshToken: 0 }
    const uiListeners = new Set()
    const getUi = () => ui
    const subscribeUi = listener => {
      uiListeners.add(listener)
      return () => { uiListeners.delete(listener) }
    }
    const setUi = patch => {
      ui = { ...ui, ...patch }
      for (const listener of [...uiListeners]) listener()
    }
    const openPanel = sessionId => {
      const scoped = typeof sessionId === 'string' && sessionId !== ''
      setUi({ open: true, scope: scoped ? 'session' : 'all', sessionId: scoped ? sessionId : null })
    }
    const closePanel = () => setUi({ open: false })
    /** Ask the Host for a fresh scan on the next request. */
    const requestRescan = () => setUi({ refreshToken: ui.refreshToken + 1 })
    const reselect = patch => setUi(patch)
    const useUi = () => useSyncExternalStore(subscribeUi, getUi, getUi)

    const REPORT_PATH = 'latency-stats/api/report'
    const POLL_MS = 600

    /** Resolve the plugin route against the page base so a reverse-proxy prefix survives. */
    const reportUrl = params => {
      const base = typeof document !== 'undefined' && typeof document.baseURI === 'string' && document.baseURI !== ''
        ? document.baseURI
        : `${typeof location !== 'undefined' ? location.origin : 'http://dsh.internal'}/`
      const url = new URL(REPORT_PATH, base)
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
      }
      return url.href
    }

    const getJson = async url => {
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } })
      if (response.status === 403) throw new Error('forbidden')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    // ---------------------------------------------------------------------
    // Formatting helpers
    // ---------------------------------------------------------------------
    const dash = '–'
    const fmtMs = value => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return dash
      return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
    }
    const fmtSpeed = value => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : dash)
    const fmtInt = value => (typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : dash)
    const fmtPercent = value => (typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : dash)
    const fmtTime = at => {
      if (typeof at !== 'number') return dash
      const date = new Date(at)
      const pad = number => String(number).padStart(2, '0')
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
    const fmtClock = at => {
      if (typeof at !== 'number') return dash
      const date = new Date(at)
      const pad = number => String(number).padStart(2, '0')
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
    const fmtDuration = ms => {
      if (typeof ms !== 'number' || !Number.isFinite(ms)) return dash
      const seconds = Math.max(0, Math.round(ms / 1000))
      if (seconds < 60) return `${seconds}s`
      const minutes = Math.round(seconds / 60)
      if (minutes < 60) return `${minutes}m`
      const hours = Math.floor(minutes / 60)
      const restMinutes = minutes % 60
      if (hours < 24) return restMinutes === 0 ? `${hours}h` : `${hours}h${restMinutes}m`
      const days = Math.floor(hours / 24)
      const restHours = hours % 24
      return restHours === 0 ? `${days}d` : `${days}d${restHours}h`
    }

    /** Round a peak up to a readable axis maximum (1/1.5/2/2.5/3/4/5/6/8/10 × 10^n). */
    const niceMax = value => {
      if (typeof value !== 'number' || !(value > 0)) return 1
      const exponent = Math.floor(Math.log10(value))
      const base = 10 ** exponent
      const ratio = value / base
      const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
      return (steps.find(step => ratio <= step) ?? 10) * base
    }

    // Hidden models persist per browser profile, so a long model list stays
    // manageable across restarts; new models start visible.
    const HIDDEN_KEY = 'dsh-latency-stats.hidden-models.v1'
    const loadHidden = () => {
      try {
        if (typeof localStorage === 'undefined') return new Set()
        const raw = localStorage.getItem(HIDDEN_KEY)
        const parsed = raw === null ? [] : JSON.parse(raw)
        return Array.isArray(parsed) ? new Set(parsed.filter(key => typeof key === 'string')) : new Set()
      } catch {
        return new Set()
      }
    }
    const saveHidden = hidden => {
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]))
      } catch {
        // A blocked storage area only costs the remembered state.
      }
    }

    const CSS = `
      .dls-foot{display:flex;align-items:center;gap:6px;height:32px;flex:0 1 auto;min-width:0;max-width:100%;padding:0 8px;
        border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;
        line-height:1;cursor:pointer}
      .dls-foot:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dls-foot.rail{justify-content:center;width:32px;flex:none;padding:0}
      .dls-foot span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .dls-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;
        background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
      .dls-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dls-layer{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;
        background:rgba(0,0,0,.58);pointer-events:auto}
      .dls-panel{display:flex;flex-direction:column;width:min(1120px,96vw);max-height:min(90vh,940px);overflow:hidden;
        border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-base);
        color:var(--dsw-alias-label-primary);box-shadow:0 24px 70px rgba(0,0,0,.45);font-size:13px}
      .dls-head{display:flex;align-items:flex-start;gap:12px;padding:18px 22px 15px;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dls-head h3{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em}
      .dls-head p{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dls-head-actions{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
      .dls-seg{display:inline-flex;padding:3px;border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
      .dls-seg button{border:0;border-radius:6px;padding:4px 11px;font:inherit;font-size:12px;background:transparent;
        color:var(--dsw-alias-label-secondary);cursor:pointer}
      .dls-seg button[data-on="1"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
      .dls-btn{display:inline-flex;align-items:center;gap:6px;height:29px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);
        border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
      .dls-btn:hover{border-color:var(--dsw-alias-border-l2)}
      .dls-btn:disabled{opacity:.5;cursor:default}
      .dls-body{display:grid;gap:18px;padding:18px 22px 22px;overflow:auto}
      .dls-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:18px}
      .dls-stat{display:grid;gap:7px}
      .dls-stat span{font-size:11px;color:var(--dsw-alias-label-secondary)}
      .dls-stat b{font-size:25px;font-weight:600;line-height:1.05;letter-spacing:-.02em}
      .dls-section{display:grid;gap:12px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l1)}
      .dls-section-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .dls-section-head h4{margin:0;font-size:13px;font-weight:600}
      .dls-section-head .dls-muted{font-size:11px}
      .dls-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
      .dls-chart{display:grid;gap:9px}
      .dls-chart h5{margin:0;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary)}
      .dls-bars-wrap{display:grid;grid-template-columns:46px 1fr;grid-template-rows:auto auto;gap:4px 8px}
      .dls-bars-y{grid-row:1;grid-column:1;display:flex;flex-direction:column;justify-content:space-between;height:124px;
        font-size:9px;line-height:1;color:var(--dsw-alias-label-secondary);text-align:right;padding-right:2px;
        font-variant-numeric:tabular-nums}
      .dls-bars-plot{grid-row:1;grid-column:2;position:relative;min-width:0}
      .dls-bars-grid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none}
      .dls-bars-grid i{display:block;height:1px;background:var(--dsw-alias-border-l1)}
      .dls-bars{display:grid;grid-template-columns:repeat(24,1fr);align-items:end;gap:2px;height:124px}
      .dls-bar{min-height:2px;border-radius:2px 2px 0 0;background:var(--dsw-alias-label-primary);opacity:.82}
      .dls-bar:hover{opacity:1}
      .dls-bar.empty{background:var(--dsw-alias-border-l1);opacity:1}
      .dls-bar.speed{background:var(--dsw-alias-state-success-primary);opacity:.9}
      .dls-xaxis{grid-row:2;grid-column:2;display:grid;grid-template-columns:repeat(24,1fr);gap:2px;font-size:9px;
        color:var(--dsw-alias-label-secondary);text-align:center}
      .dls-chart-foot{display:flex;justify-content:space-between;font-size:10px;color:var(--dsw-alias-label-secondary)}
      .dls-table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}
      .dls-table th{padding:0 12px 8px 0;text-align:left;font-weight:500;font-size:11px;
        color:var(--dsw-alias-label-secondary);border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dls-table td{padding:9px 12px 9px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dls-table tr:last-child td{border-bottom:0}
      .dls-table tbody tr:hover td{background:var(--dsw-alias-bg-layer-1)}
      .dls-table .num{text-align:right;font-variant-numeric:tabular-nums}
      .dls-table-sm{font-size:11px}
      .dls-table-sm th{padding-bottom:6px}
      .dls-table-sm td{padding:6px 12px 6px 0}
      .dls-table .dls-wraps{white-space:normal;color:var(--dsw-alias-label-secondary);min-width:260px}
      .dls-drops{display:grid;gap:6px;margin-top:6px}
      .dls-drops-head{font-size:11px;color:var(--dsw-alias-label-secondary)}
      .dls-scroll{overflow-x:auto}
      .dls-swatch{display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;background:var(--dsw-alias-label-primary);opacity:.7}
      .dls-note{font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary);display:grid;gap:2px}
      .dls-error{padding:10px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:10px;color:var(--dsw-alias-state-error-primary)}
      .dls-empty{padding:26px 12px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}
      .dls-loading{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dls-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);animation:dls-pulse 1s ease-in-out infinite}
      @keyframes dls-pulse{0%,100%{opacity:.25}50%{opacity:1}}
      .dls-select{height:28px;max-width:100%;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;
        background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
      .dls-btn-sm{height:24px;padding:0 9px;font-size:11px}
      .dls-chips{display:flex;flex-wrap:wrap;gap:6px}
      .dls-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);
        border-radius:999px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer}
      .dls-chip::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-primary)}
      .dls-chip:hover{border-color:var(--dsw-alias-border-l2)}
      .dls-chip[data-on="0"]{color:var(--dsw-alias-label-secondary);border-style:dashed}
      .dls-chip[data-on="0"]::before{background:transparent;border:1px solid var(--dsw-alias-label-secondary)}
      .dls-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-secondary)}
      .dls-legend span{display:inline-flex;align-items:center;gap:5px}
      .dls-legend i{width:7px;height:7px;border-radius:50%}
      .dls-drop-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
      .dls-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .dls-muted{color:var(--dsw-alias-label-secondary)}
      .dls-line{display:grid;grid-template-columns:38px 1fr;gap:8px;align-items:stretch}
      .dls-line-y{display:flex;flex-direction:column;justify-content:space-between;font-size:9px;
        color:var(--dsw-alias-label-secondary);text-align:right;padding:2px 0}
      .dls-line-plot{position:relative;min-width:0}
      .dls-line-plot svg{display:block;width:100%;height:158px;overflow:visible}
      .dls-line-x{display:flex;justify-content:space-between;margin-top:6px;font-size:9px;color:var(--dsw-alias-label-secondary)}
      .dls-line-readout{font-size:11px;color:var(--dsw-alias-label-secondary);min-height:16px}
      .dls-line-readout b{color:var(--dsw-alias-label-primary);font-weight:600}
    `

    const Style = () => h('style', null, CSS)

    /** Three ascending bars: the plugin's own mark. */
    const Mark = ({ size = 16 }) => h(
      'svg',
      { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false', style: { flex: 'none' } },
      h('rect', { x: 1.5, y: 9, width: 3, height: 5.5, rx: 1, fill: 'currentColor', opacity: 0.55 }),
      h('rect', { x: 6.5, y: 5.5, width: 3, height: 9, rx: 1, fill: 'currentColor', opacity: 0.8 }),
      h('rect', { x: 11.5, y: 2, width: 3, height: 12.5, rx: 1, fill: 'currentColor' }),
    )

    // ---------------------------------------------------------------------
    // Buttons
    // ---------------------------------------------------------------------
    function SidebarButton(props) {
      const wide = props?.wide !== false
      const t = props.t
      return h(
        React.Fragment,
        null,
        h(Style),
        h(
          'button',
          {
            type: 'button',
            className: wide ? 'dls-foot' : 'dls-foot rail',
            title: t('action.title'),
            'aria-label': t('action.title'),
            onClick: () => openPanel(null),
          },
          h(Mark),
          wide ? h('span', null, t('action.title')) : null,
        ),
      )
    }

    function SessionButton(props) {
      const t = props.t
      const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : null
      return h(
        React.Fragment,
        null,
        h(Style),
        h(
          'button',
          {
            type: 'button',
            className: 'dls-icon-btn',
            title: t('action.session'),
            'aria-label': t('action.session'),
            onClick: () => openPanel(sessionId),
          },
          h(Mark, { size: 15 }),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Charts
    // ---------------------------------------------------------------------
    function HourBars({ rows, field, kind, t, unit, format }) {
      const values = rows.map(row => row[field])
      const peak = Math.max(0, ...values.filter(value => typeof value === 'number'))
      const max = niceMax(peak)
      const ticks = [max, max / 2, 0]
      return h(
        'div',
        { className: 'dls-bars-wrap' },
        h('div', { className: 'dls-bars-y' }, ticks.map(tick => h('span', { key: tick }, format(tick)))),
        h(
          'div',
          { className: 'dls-bars-plot' },
          h('div', { className: 'dls-bars-grid', 'aria-hidden': 'true' },
            ticks.map(tick => h('i', { key: tick }))),
          h(
            'div',
            { className: 'dls-bars' },
            rows.map(row => {
              const value = row[field]
              const height = typeof value === 'number' && value > 0 ? Math.max(3, (value / max) * 100) : 0
              return h('div', {
                key: row.hour,
                className: value === null ? 'dls-bar empty' : kind === 'speed' ? 'dls-bar speed' : 'dls-bar',
                style: { height: `${height}%` },
                title: `${String(row.hour).padStart(2, '0')}:00 · ${value === null ? dash : `${format(value)}${unit}`} · ${row.steps} ${t('chart.steps')}`,
              })
            }),
          ),
        ),
        h(
          'div',
          { className: 'dls-xaxis' },
          [0, 3, 6, 9, 12, 15, 18, 21].map(hour => h('span', { key: hour, style: { gridColumn: `${hour + 1} / span 1` } }, String(hour))),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Cache-hit line chart (pure markup over the Host series)
    // ---------------------------------------------------------------------
    const LINE_W = 1000
    const LINE_H = 158
    const LINE_PAD = 12

    /** Drop markers group their colours by cause family. */
    const REASON_GROUP = reason => {
      if (reason === 'compaction' || reason === 'prune' || reason === 'shrink') return 'rewrite'
      if (reason === 'idle') return 'idle'
      if (reason === 'model') return 'model'
      return 'other'
    }
    const GROUP_COLOR = {
      rewrite: 'var(--dsw-alias-state-error-primary)',
      idle: 'var(--dsw-alias-state-warn-primary)',
      model: 'var(--dsw-alias-brand-primary)',
      other: 'var(--dsw-alias-state-idle-primary)',
    }
    const GROUP_LABEL = { rewrite: 'cache.legend.rewrite', idle: 'cache.legend.idle', model: 'cache.legend.model', other: 'cache.legend.other' }
    const groupOfDrop = drop => REASON_GROUP((drop.reasons ?? [])[0] ?? 'prefix')

    /** One drop's possible causes, in the reader's language. */
    const reasonText = (drop, t) => (drop.reasons ?? []).map(reason => {
      const tokens = drop.rewrite?.tokens === null || drop.rewrite?.tokens === undefined
        ? t('cache.reason.some')
        : fmtInt(drop.rewrite.tokens)
      if (reason === 'model') return t('cache.reason.model')
      if (reason === 'compaction') return t('cache.reason.compaction').replace('{tokens}', tokens)
      if (reason === 'prune') return t('cache.reason.prune').replace('{tokens}', tokens)
      if (reason === 'idle') return t('cache.reason.idle').replace('{gap}', fmtDuration(drop.gapMs))
      if (reason === 'transient') return t('cache.reason.transient')
      if (reason === 'shrink') {
        return t('cache.reason.shrink')
          .replace('{from}', fmtInt(drop.previousContext))
          .replace('{to}', fmtInt(drop.context))
      }
      return t('cache.reason.prefix')
    }).join('；')

    function CacheChart({ series, summary, drops, t }) {
      const [hover, setHover] = useState(null)
      const plotRef = useRef(null)
      const points = Array.isArray(series) ? series : []
      const n = points.length
      const usable = LINE_H - LINE_PAD * 2
      const toX = index => (n <= 1 ? LINE_W / 2 : (index / (n - 1)) * LINE_W)
      const toY = rate => LINE_PAD + (1 - Math.max(0, Math.min(100, rate)) / 100) * usable

      const segments = useMemo(() => {
        const out = []
        let current = []
        for (const point of points) {
          if (typeof point.rate !== 'number') {
            if (current.length > 0) out.push(current)
            current = []
            continue
          }
          current.push(point)
        }
        if (current.length > 0) out.push(current)
        return out
      }, [points])

      const onMove = event => {
        if (n === 0) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (rect.width <= 0) return
        const ratio = (event.clientX - rect.left) / rect.width
        const index = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))))
        setHover(index)
      }

      const hovered = hover === null ? null : points[hover]
      const gridlines = [0, 25, 50, 75, 100].map(value => h('line', {
        key: value,
        x1: 0, x2: LINE_W, y1: toY(value), y2: toY(value),
        stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke',
      }))

      const glyphs = []
      for (const segment of segments) {
        const line = segment.map(point => `${toX(point.i)} ${toY(point.rate)}`).join(' L ')
        if (segment.length > 1) {
          glyphs.push(h('path', {
            key: `l-${segment[0].i}`,
            d: `M ${line}`,
            fill: 'none',
            stroke: 'var(--dsw-alias-state-success-primary)',
            strokeWidth: 1.6,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
            vectorEffect: 'non-scaling-stroke',
          }))
        }
      }

      // One marker per reported drop, coloured by the cause family, with the
      // cause text also reachable through the native title tooltip.
      const markers = []
      const groups = new Set()
      for (const drop of Array.isArray(drops) ? drops : []) {
        const point = points.find(item => item.n === drop.n)
        if (point === undefined) continue
        const group = groupOfDrop(drop)
        groups.add(group)
        const rate = typeof point.rate === 'number' ? point.rate : 0
        markers.push(h('circle', {
          key: `drop-${drop.n}`,
          cx: toX(point.i),
          cy: toY(rate),
          r: 3.4,
          fill: GROUP_COLOR[group],
          stroke: 'var(--dsw-alias-bg-base)',
          strokeWidth: 1.2,
        }, h('title', null, `${fmtClock(drop.at)} · ${reasonText(drop, t)}`)))
      }

      const hoveredDrop = hovered === null
        ? undefined
        : (Array.isArray(drops) ? drops : []).find(drop => drop.n === hovered.n)

      return h(
        'div',
        { className: 'dls-chart' },
        h('div', { className: 'dls-line-readout' },
          hovered === undefined || hovered === null
            ? h(React.Fragment, null,
              `${t('cache.avg')} `,
              h('b', null, fmtPercent(summary?.avgRate)),
              ` · ${t('cache.pooled')} `,
              h('b', null, fmtPercent(summary?.pooledRate)),
              ` · ${fmtInt(summary?.steps)} ${t('cache.points')}`,
            )
            : h(React.Fragment, null,
              `${t('cache.hover')
                .replace('{n}', String(hovered.n ?? hovered.i + 1))
                .replace('{time}', fmtClock(hovered.at))
                .replace('{rate}', hovered.rate === null ? dash : hovered.rate.toFixed(1))
                .replace('{context}', fmtInt(hovered.context))
                .replace('{read}', fmtInt(hovered.read))}`,
              hoveredDrop === undefined
                ? null
                : h('span', { style: { marginLeft: '8px', color: GROUP_COLOR[groupOfDrop(hoveredDrop)] } },
                  `· ${t('cache.hover.drop').replace('{reasons}', reasonText(hoveredDrop, t))}`),
            ),
        ),
        h(
          'div',
          { className: 'dls-line' },
          h('div', { className: 'dls-line-y' }, h('span', null, '100%'), h('span', null, '50%'), h('span', null, '0%')),
          h(
            'div',
            {
              className: 'dls-line-plot',
              ref: plotRef,
              onMouseMove: onMove,
              onMouseLeave: () => setHover(null),
            },
            h(
              'svg',
              { viewBox: `0 0 ${LINE_W} ${LINE_H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': t('section.cache') },
              gridlines,
              glyphs,
              markers,
              hovered === undefined || hovered === null
                ? null
                : h('line', {
                  x1: toX(hovered.i), x2: toX(hovered.i), y1: LINE_PAD, y2: LINE_H - LINE_PAD,
                  stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke',
                }),
              hovered === undefined || hovered === null || typeof hovered.rate !== 'number'
                ? null
                : h('circle', {
                  cx: toX(hovered.i), cy: toY(hovered.rate), r: 3,
                  fill: 'var(--dsw-alias-state-success-primary)', stroke: 'var(--dsw-alias-bg-base)', strokeWidth: 1,
                }),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dls-line-x' },
          h('span', null, t('cache.axis.from')),
          h('span', null, t('cache.axis.to').replace('{n}', String(summary?.steps ?? n))),
        ),
        groups.size === 0
          ? null
          : h('div', { className: 'dls-legend' },
            [...groups].map(group => h('span', { key: group },
              h('i', { style: { background: GROUP_COLOR[group] } }),
              t(GROUP_LABEL[group]),
            ))),
        summary?.truncated === true ? h('div', { className: 'dls-xaxis', style: { display: 'block' } }, t('cache.truncated')) : null,
        Array.isArray(drops) && drops.length > 0
          ? h(
            'div',
            { className: 'dls-drops' },
            h('div', { className: 'dls-drops-head' }, t('cache.drop.title').replace('{n}', String(drops.length))),
            h(
              'table',
              { className: 'dls-table dls-table-sm' },
              h('thead', null, h('tr', null,
                h('th', null, t('cache.drop.time')),
                h('th', { className: 'num' }, t('cache.drop.index')),
                h('th', { className: 'num' }, t('cache.drop.change')),
                h('th', null, t('cache.drop.cause')),
              )),
              h('tbody', null, drops.map(drop => h('tr', { key: `${drop.at}-${drop.n}` },
                h('td', { className: 'dls-muted' }, fmtClock(drop.at)),
                h('td', { className: 'num' }, `#${drop.n}`),
                h('td', { className: 'num' }, `${fmtPercent(drop.baseline)} → ${fmtPercent(drop.rate)}`),
                h('td', { className: 'dls-wraps' },
                  h('i', { className: 'dls-drop-dot', style: { background: GROUP_COLOR[groupOfDrop(drop)] } }),
                  reasonText(drop, t)),
              ))),
            ),
          )
          : null,
      )
    }

    /**
     * One option per conversation, with its subagents nested underneath:
     * `sessionQuery` lists every Session (a subagent is a Session too), so a
     * flat list buries the conversations the reader actually recognises.
     * @param sessions - picker rows from the Host.
     * @param currentId - Session that must always be selectable.
     * @returns ordered `{ row, depth, childCount }` entries.
     */
    const buildPicker = (sessions, currentId) => {
      const rows = (Array.isArray(sessions) ? sessions : []).filter(row => row && typeof row.id === 'string')
      const byId = new Map(rows.map(row => [row.id, row]))
      const children = new Map()
      const roots = []
      for (const row of rows) {
        const parent = typeof row.parentSession === 'string' && row.parentSession !== '' ? row.parentSession : null
        if (parent !== null && byId.has(parent)) {
          if (!children.has(parent)) children.set(parent, [])
          children.get(parent).push(row)
        } else {
          roots.push(row)
        }
      }
      const activity = row => row.updatedAt ?? row.createdAt ?? 0
      roots.sort((a, b) => activity(b) - activity(a))
      const ordered = []
      const push = (row, depth) => {
        const kids = children.get(row.id) ?? []
        ordered.push({ row, depth, childCount: kids.length })
        kids.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        for (const kid of kids) push(kid, depth + 1)
      }
      for (const root of roots) push(root, 0)
      // Drop empty leaves (a Session with no model response and no subagent);
      // keep the selected one so the control never shows a different label.
      const kept = ordered.filter(entry => entry.row.id === currentId
        || entry.childCount > 0
        || entry.row.steps === null
        || entry.row.steps > 0)
      if (typeof currentId === 'string' && currentId !== '' && !kept.some(entry => entry.row.id === currentId)) {
        kept.unshift({ row: { id: currentId, title: '', createdAt: null, steps: null }, depth: 0, childCount: 0 })
      }
      return kept
    }

    /**
     * Picker label for one entry. Subagents repeat their prompt as a title, so
     * they get the indent marker; their names may collide, which is fine.
     */
    const pickerLabel = (entry, t, fmtTime) => {
      const row = entry.row
      const raw = typeof row.title === 'string' && row.title.trim() !== ''
        ? row.title.trim()
        : (row.cwd !== undefined ? `${row.cwd.split(/[\\/]/).filter(Boolean).pop() ?? ''} · ${fmtTime(row.createdAt)}` : fmtTime(row.createdAt))
      const limit = entry.depth > 0 ? 26 : 34
      const title = raw.length > limit ? `${raw.slice(0, limit - 1)}…` : raw
      const parts = [title]
      if (typeof row.steps === 'number') parts.push(`${row.steps} ${t('chart.steps')}`)
      if (entry.childCount > 0) parts.push(`+${entry.childCount} ${t('cache.subagent')}`)
      return `${entry.depth > 0 ? '　↳ ' : ''}${parts.join(' · ')}`
    }

    /**
     * Merge the Host's per-Session step counts with the Client's session
     * summaries (the rows the sidebar already shows). The Host only knows a
     * title once it has folded that Session; the summaries carry `displayTitle`
     * for every listed conversation, so picker labels never degrade to a bare
     * timestamp.
     * @param hostRows - `sessions` from the report payload.
     * @param summaries - `state.byId` of the sessions store.
     * @returns one row per Session.
     */
    const mergePickerRows = (hostRows, summaries) => {
      const rows = (Array.isArray(hostRows) ? hostRows : []).filter(row => row && typeof row.id === 'string')
      const byId = new Map(rows.map(row => [row.id, row]))
      const merged = []
      const seen = new Set()
      for (const [id, summary] of Object.entries(summaries ?? {})) {
        if (summary === undefined || summary === null) continue
        const host = byId.get(id)
        seen.add(id)
        merged.push({
          id,
          title: summary.displayTitle ?? summary.title ?? host?.title ?? '',
          createdAt: host?.createdAt ?? summary.updatedAt ?? null,
          updatedAt: summary.updatedAt ?? host?.updatedAt ?? null,
          steps: host?.steps ?? null,
          parentSession: summary.parentId ?? host?.parentSession ?? null,
          subagent: summary.origin === 'subagent' || host?.subagent === true,
          depth: host?.depth ?? (summary.origin === 'subagent' ? 1 : 0),
          cwd: summary.cwd ?? host?.cwd,
        })
      }
      for (const row of rows) if (!seen.has(row.id)) merged.push(row)
      return merged
    }

    /** Fetch one Session's cache series and render it. */
    function CacheSection({ t, sessions, defaultSessionId, refreshToken }) {
      const [selected, setSelected] = useState(defaultSessionId ?? '')
      const [payload, setPayload] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)
      const forcedRef = useRef('')

      const options = useMemo(() => buildPicker(sessions, defaultSessionId), [sessions, defaultSessionId])

      const target = selected !== '' ? selected : (defaultSessionId ?? options[0]?.row.id ?? '')

      useEffect(() => {
        if (target === '') return undefined
        let stopped = false
        const force = forcedRef.current !== `${target}:${refreshToken}`
        forcedRef.current = `${target}:${refreshToken}`
        setLoading(true)
        setError(null)
        getJson(reportUrl({ scope: 'series', sessionId: target, refresh: force ? 1 : undefined }))
          .then(body => {
            if (stopped) return
            if (body.ok === false) throw new Error(body.error ?? 'failed')
            setPayload(body)
            setLoading(false)
          })
          .catch(cause => {
            if (stopped) return
            setError(cause instanceof Error ? cause.message : String(cause))
            setLoading(false)
          })
        return () => { stopped = true }
      }, [target, refreshToken])

      const session = payload?.session
      /** One option label: conversation name, its subagents indented under it. */
      const label = entry => pickerLabel(entry, t, fmtTime)

      return h(
        'div',
        { className: 'dls-section' },
        h(
          'div',
          { className: 'dls-section-head' },
          h('h4', null, t('section.cache')),
          options.length > 1
            ? h('select', {
              className: 'dls-select',
              value: target,
              onChange: event => setSelected(event.target.value),
              'aria-label': t('cache.session'),
            }, options.map(entry => h('option', { key: entry.row.id, value: entry.row.id }, label(entry))))
            : h('span', { className: 'dls-muted' }, session?.title ?? ''),
          h('span', { className: 'dls-muted', style: { marginLeft: 'auto' } }, t('cache.legend')),
        ),
        error !== null
          ? h('div', { className: 'dls-error' }, `${t('error.prefix')}：${error === 'forbidden' ? t('error.forbidden') : error}`)
          : loading
            ? h('div', { className: 'dls-loading' }, h('span', { className: 'dls-dot' }), h('span', null, t('cache.loading')))
            : payload !== null && (payload.series ?? []).length > 0
              ? h(CacheChart, { series: payload.series, drops: payload.drops, summary: payload.summary, t })
              : h('div', { className: 'dls-empty' }, t('cache.empty')),
      )
    }

    // ---------------------------------------------------------------------
    // Report body: pure markup over one payload (renders in tests too).
    // ---------------------------------------------------------------------
    function ReportBody({
      data, error, scanning, scanLabel, t, modelKey, onModelKey, cache,
      hiddenModels, filterOpen, onToggleModel, onToggleFilter, onShowAll,
    }) {
      const models = data?.models ?? []
      const hidden = hiddenModels instanceof Set ? hiddenModels : new Set()
      const visibleModels = useMemo(() => models.filter(row => !hidden.has(row.key)), [models, hidden])
      // A hidden model cannot stay selected in the chart.
      const effectiveModelKey = visibleModels.some(row => row.key === modelKey) ? modelKey : ''

      const hours = useMemo(() => {
        if (data === null) return []
        if (effectiveModelKey === '') return data.hours ?? []
        const entry = (data.hourByModel ?? []).find(row => row.key === effectiveModelKey)
        return entry?.hours ?? data.hours ?? []
      }, [data, effectiveModelKey])

      const totals = data?.totals ?? {}
      const showEmpty = data !== null && models.length === 0 && !scanning

      return h(
        React.Fragment,
        null,
        scanning ? h('div', { className: 'dls-loading' }, h('span', { className: 'dls-dot' }), h('span', null, scanLabel)) : null,
        error !== null ? h('div', { className: 'dls-error' }, `${t('error.prefix')}：${error === 'forbidden' ? t('error.forbidden') : error}`) : null,
        showEmpty ? h('div', { className: 'dls-empty' }, t('note.empty')) : null,
        data !== null && models.length > 0
          ? h(
            React.Fragment,
            null,
            h(
              'div',
              { className: 'dls-stats' },
              h('div', { className: 'dls-stat' }, h('span', null, t('card.sessions')), h('b', null, fmtInt(totals.sessions))),
              h('div', { className: 'dls-stat' }, h('span', null, t('card.steps')), h('b', null, fmtInt(totals.steps))),
              h('div', { className: 'dls-stat' }, h('span', null, t('card.ttft')), h('b', null, fmtMs(totals.ttftAvg))),
              h('div', { className: 'dls-stat' }, h('span', null, t('card.speed')), h('b', null, `${fmtSpeed(totals.speedAvg)} tok/s`)),
              h('div', { className: 'dls-stat' }, h('span', null, t('card.cache')), h('b', null, fmtPercent(totals.cacheHit))),
              h('div', { className: 'dls-stat' }, h('span', null, t('card.tokens')), h('b', null, fmtInt(totals.tokensTotal))),
            ),
            h(
              'div',
              { className: 'dls-section' },
              h(
                'div',
                { className: 'dls-section-head' },
                h('h4', null, t('section.hours')),
                h(
                  'div',
                  { className: 'dls-row', style: { marginLeft: 'auto' } },
                  h('span', { className: 'dls-muted' }, t('chart.model')),
                  h(
                    'select',
                    {
                      className: 'dls-select',
                      value: effectiveModelKey,
                      onChange: event => onModelKey(event.target.value),
                      'aria-label': t('chart.model'),
                    },
                    h('option', { value: '' }, t('chart.all')),
                    visibleModels.map(row => h('option', { key: row.key, value: row.key }, `${row.key} (${row.steps})`)),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'dls-charts' },
                h('div', { className: 'dls-chart' },
                  h('h5', null, t('chart.ttft')),
                  h(HourBars, { rows: hours, field: 'ttftMs', kind: 'ttft', t, unit: ' ms', format: fmtMs })),
                h('div', { className: 'dls-chart' },
                  h('h5', null, t('chart.speed')),
                  h(HourBars, { rows: hours, field: 'speed', kind: 'speed', t, unit: ' tok/s', format: fmtSpeed })),
              ),
            ),
            h(
              'div',
              { className: 'dls-section' },
              h(
                'div',
                { className: 'dls-section-head' },
                h('h4', null, t('section.models')),
                h(
                  'div',
                  { className: 'dls-row', style: { marginLeft: 'auto' } },
                  h('button', {
                    type: 'button',
                    className: 'dls-btn dls-btn-sm',
                    'data-on': filterOpen ? '1' : '0',
                    'aria-expanded': filterOpen ? 'true' : 'false',
                    onClick: onToggleFilter,
                  }, `${t('models.filter')} ${fmtInt(visibleModels.length)}/${fmtInt(models.length)}`),
                ),
              ),
              filterOpen
                ? h('div', { className: 'dls-chips' },
                  models.map(row => h('button', {
                    key: row.key,
                    type: 'button',
                    className: 'dls-chip',
                    'data-on': hidden.has(row.key) ? '0' : '1',
                    onClick: () => onToggleModel(row.key),
                  }, row.key)),
                  h('button', { type: 'button', className: 'dls-btn dls-btn-sm', onClick: onShowAll }, t('models.showAll')),
                )
                : null,
              visibleModels.length === 0
                ? h('div', { className: 'dls-empty' }, t('models.hiddenAll'))
                : h(
                  'div',
                  { className: 'dls-scroll' },
                  h(
                    'table',
                    { className: 'dls-table' },
                    h('thead', null, h('tr', null,
                      h('th', null, t('table.model')),
                      h('th', { className: 'num' }, t('table.steps')),
                      h('th', { className: 'num' }, t('table.ttft')),
                      h('th', { className: 'num' }, t('table.speed')),
                      h('th', { className: 'num' }, t('table.decode')),
                      h('th', { className: 'num' }, t('table.cache')),
                      h('th', { className: 'num' }, t('table.tokens')),
                      h('th', { className: 'num' }, t('table.total')),
                    )),
                    h('tbody', null, visibleModels.map(row => h('tr', { key: row.key },
                      h('td', null, h('span', { className: 'dls-swatch' }), row.key),
                      h('td', { className: 'num' }, fmtInt(row.steps)),
                      h('td', { className: 'num' }, `${fmtMs(row.ttftAvg)} / ${fmtMs(row.ttftP50)} / ${fmtMs(row.ttftP90)}`),
                      h('td', { className: 'num' }, `${fmtSpeed(row.speedAvg)} / ${fmtSpeed(row.speedP50)}`),
                      h('td', { className: 'num', title: `${row.streamedSteps ?? 0} / ${row.steps}` }, fmtSpeed(row.decodeSpeedAvg)),
                      h('td', { className: 'num' }, fmtPercent(row.cacheHit)),
                      h('td', { className: 'num' }, fmtInt(row.tokensAvg)),
                      h('td', { className: 'num' }, fmtInt(row.tokensTotal)),
                    ))),
                  ),
                ),
            ),
            cache === undefined || cache === null ? null : cache,
            h(
              'div',
              { className: 'dls-section' },
              h('div', { className: 'dls-section-head' }, h('h4', null, t('section.recent'))),
              h(
                'div',
                { className: 'dls-scroll' },
                h(
                  'table',
                  { className: 'dls-table' },
                  h('thead', null, h('tr', null,
                    h('th', null, t('recent.time')),
                    h('th', null, t('recent.model')),
                    h('th', { className: 'num' }, t('recent.ttft')),
                    h('th', { className: 'num' }, t('recent.speed')),
                    h('th', { className: 'num' }, t('recent.cache')),
                    h('th', { className: 'num' }, t('recent.tokens')),
                  )),
                  h('tbody', null, (data.recent ?? []).map(row => h('tr', { key: `${row.at}-${row.model}` },
                    h('td', { className: 'dls-muted' }, fmtTime(row.at)),
                    h('td', null, row.model),
                    h('td', { className: 'num' }, fmtMs(row.ttft)),
                    h('td', { className: 'num' }, fmtSpeed(row.speed)),
                    h('td', { className: 'num' }, fmtPercent(row.cacheHit)),
                    h('td', { className: 'num' }, fmtInt(row.tokens)),
                  ))),
                ),
              ),
            ),
            h(
              'div',
              { className: 'dls-note' },
              h('div', null, t('note.method')),
              h('div', null,
                `${t('note.generated')} ${fmtTime(data.scan?.generatedAt)} · ${t('note.scanned')} ${fmtInt(data.scan?.sessions)} ${t('note.sessions')}`
                + (typeof data.scan?.durationMs === 'number' ? ` · ${(data.scan.durationMs / 1000).toFixed(1)}s` : '')
                + (typeof data.scan?.reused === 'number' && data.scan.reused > 0 ? ` · ${t('note.reused')} ${data.scan.reused}` : '')
                + (Array.isArray(data.scan?.warnings) && data.scan.warnings.length > 0 ? ` · ${data.scan.warnings.length} ${t('note.warnings')}` : ''),
              ),
              data.scan?.truncated === true ? h('div', null, t('note.truncated')) : null,
            ),
          )
          : null,
      )
    }

    // ---------------------------------------------------------------------
    // Panel: fetch, poll while the Host scans, then render the body.
    // ---------------------------------------------------------------------
    /**
     * Stand-in for a slot that does not provide the sessions selector hook
     * (older clients): a stable function, so the hook count never changes.
     */
    const NO_SESSIONS = selector => selector({ byId: {} })

    function Panel(props) {
      const t = props.t
      const uiState = useUi()
      // Same session store the sidebar renders: it carries `displayTitle` for
      // every listed conversation, which the picker needs before any scan.
      const useSessions = typeof props.useSessions === 'function' ? props.useSessions : NO_SESSIONS
      const summaries = useSessions(state => state.byId)
      const [data, setData] = useState(null)
      const [error, setError] = useState(null)
      const [scanning, setScanning] = useState(false)
      const [progress, setProgress] = useState(null)
      const [modelKey, setModelKey] = useState('')
      const [hiddenModels, setHiddenModels] = useState(() => loadHidden())
      const [filterOpen, setFilterOpen] = useState(false)
      const forcedRef = useRef(0)
      const open = uiState.open

      useEffect(() => {
        if (!open) return undefined
        const onKey = event => { if (event.key === 'Escape') closePanel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [open])

      useEffect(() => {
        if (!open) return undefined
        let stopped = false
        let timer = null
        // The refresh button bumps a token; consume it once so the poll that
        // follows a forced scan never restarts it (that loop used to re-read
        // every log on each 600 ms tick).
        const force = uiState.refreshToken !== forcedRef.current
        forcedRef.current = uiState.refreshToken
        let firstRequest = true
        setScanning(true)
        setError(null)
        const load = async () => {
          const refreshNow = force && firstRequest
          firstRequest = false
          try {
            const body = await getJson(reportUrl({
              scope: uiState.scope,
              sessionId: uiState.scope === 'session' ? uiState.sessionId : undefined,
              refresh: refreshNow ? 1 : undefined,
            }))
            if (stopped) return
            if (body.ok === false) throw new Error(body.error ?? 'failed')
            if (body.status === 'scanning') {
              setProgress(body.progress ?? null)
              setScanning(true)
              timer = setTimeout(load, POLL_MS)
              return
            }
            setData(body)
            setProgress(null)
            setScanning(false)
            setError(null)
          } catch (cause) {
            if (stopped) return
            setScanning(false)
            setError(cause instanceof Error ? cause.message : String(cause))
          }
        }
        void load()
        return () => {
          stopped = true
          if (timer !== null) clearTimeout(timer)
        }
      }, [open, uiState.scope, uiState.sessionId, uiState.refreshToken, t])

      const refresh = useCallback(() => { requestRescan() }, [])
      const pickerRows = useMemo(() => mergePickerRows(data?.sessions, summaries), [data, summaries])
      const toggleModel = useCallback(key => {
        setHiddenModels(current => {
          const next = new Set(current)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          saveHidden(next)
          return next
        })
      }, [])
      const showAllModels = useCallback(() => {
        setHiddenModels(() => {
          const next = new Set()
          saveHidden(next)
          return next
        })
      }, [])

      if (!open) return null

      const scanLabel = progress !== null && progress.total > 0
        ? `${t('state.scanning')} ${progress.used}/${progress.total}`
        : t('state.loading')

      return h(
        React.Fragment,
        null,
        h(Style),
        h(
          'div',
          {
            className: 'dls-layer',
            onMouseDown: event => { if (event.target === event.currentTarget) closePanel() },
          },
          h(
            'div',
            {
              className: 'dls-panel',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': t('panel.title'),
            },
            h(
              'div',
              { className: 'dls-head' },
              h('div', null,
                h('h3', null, t('panel.title')),
                h('p', null, data?.session?.title
                  ? `${t('panel.subtitle')} · ${data.session.title}`
                  : t('panel.subtitle')),
              ),
              h(
                'div',
                { className: 'dls-head-actions' },
                h(ScopeSwitch, { uiState, t }),
                h('button', { type: 'button', className: 'dls-btn', onClick: refresh, disabled: scanning }, t('action.refresh')),
                h('button', { type: 'button', className: 'dls-btn', onClick: closePanel, 'aria-label': t('action.close') }, '✕'),
              ),
            ),
            h(
              'div',
              { className: 'dls-body' },
              h(ReportBody, {
                data,
                error,
                scanning,
                scanLabel,
                t,
                modelKey,
                onModelKey: setModelKey,
                hiddenModels,
                filterOpen,
                onToggleModel: toggleModel,
                onToggleFilter: () => setFilterOpen(value => !value),
                onShowAll: showAllModels,
                // The cache curve sits above "latest responses": it explains
                // the numbers a reader just saw in the tables.
                cache: data !== null
                  ? h(CacheSection, {
                    t,
                    sessions: pickerRows,
                    defaultSessionId: uiState.sessionId ?? undefined,
                    refreshToken: uiState.refreshToken,
                  })
                  : null,
              }),
            ),
          ),
        ),
      )
    }

    function ScopeSwitch({ uiState, t }) {
      if (uiState.sessionId === null) return null
      return h(
        'div',
        { className: 'dls-seg', role: 'group' },
        h('button', {
          type: 'button',
          'data-on': uiState.scope === 'session' ? '1' : '0',
          onClick: () => reselect({ scope: 'session' }),
        }, t('scope.session')),
        h('button', {
          type: 'button',
          'data-on': uiState.scope === 'all' ? '1' : '0',
          onClick: () => reselect({ scope: 'all' }),
        }, t('scope.all')),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-latency-stats: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-latency-stats',
          order: 30,
          label: () => t('action.title'),
        }, props => h(SidebarButton, { ...props, t })))

        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'dsh-latency-stats.session',
          order: 24,
          label: () => t('action.session'),
        }, props => h(SessionButton, { ...props, t })))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-latency-stats.panel',
        }, props => h(Panel, { ...props, t })))
      },
    }
  },
})

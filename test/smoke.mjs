import { apply } from '../index.js'

const handlers = new Map()
const routes = []
const ctx = {
  get: () => undefined,
  effect: fn => { fn(); return () => {} },
  webServer: {
    register(route) {
      routes.push(route)
      handlers.set(route.path, route.handler)
      return () => {}
    },
  },
  sessionQuery: {
    listSessions: async () => [
      { header: { id: 's-alpha' } },
      { header: { id: 's-beta' } },
    ],
    readSession: async id => {
      if (id === 's-alpha') {
        // One step: 500 ms to the first token, 40 output tokens over 1000 ms.
        return {
          session: { id },
          inheritedEventCount: 0,
          events: [
            { type: 'step/start', seq: 1, time: 1_000_000, data: { turn: 1, step: 1 } },
            {
              type: 'assistant/attempt',
              seq: 2,
              time: 1_001_500,
              data: {
                turn: 1,
                step: 1,
                stream: [
                  { type: 'reasoning-chunks', time0: 1_000_500, index: 0, dt: [], texts: ['think'] },
                  { type: 'text-chunks', time0: 1_000_600, index: 1, dt: [100], texts: ['a', 'b'] },
                ],
              },
            },
            {
              type: 'assistant/message',
              seq: 3,
              time: 1_001_500,
              data: {
                turn: 1,
                step: 1,
                message: { role: 'assistant', source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' } },
                stream: [],
                usage: { inputTokens: 900, outputTokens: 40, cacheReadTokens: 700 },
              },
            },
            { type: 'step/end', seq: 4, time: 1_001_600, data: { turn: 1, step: 1 } },
          ],
        }
      }
      // A retry that streamed a first token, replaced by a second attempt with none.
      return {
        session: { id },
        inheritedEventCount: 3,
        events: [
          { type: 'step/start', seq: 1, time: 2_000_000, data: { turn: 1, step: 1 } },
          { type: 'step/end', seq: 2, time: 2_000_100, data: { turn: 1, step: 1 } },
          { type: 'step/start', seq: 3, time: 2_000_200, data: { turn: 1, step: 2 } },
          { type: 'step/start', seq: 4, time: 2_100_000, data: { turn: 2, step: 1 } },
          {
            type: 'assistant/attempt',
            seq: 5,
            time: 2_100_300,
            data: {
              turn: 2,
              step: 1,
              stream: [{ type: 'text-chunks', time0: 2_100_250, index: 0, dt: [], texts: ['hello'] }],
            },
          },
          {
            type: 'assistant/message',
            seq: 6,
            time: 2_101_000,
            data: {
              turn: 2,
              step: 1,
              message: { role: 'assistant', source: { kind: 'model', provider: 'anthropic', model: 'claude-x' } },
              stream: [],
              usage: { inputTokens: 10, outputTokens: 10 },
            },
          },
          { type: 'step/end', seq: 7, time: 2_101_100, data: { turn: 2, step: 1 } },
        ],
      }
    },
  },
}

apply(ctx)
const handler = handlers.get('/latency-stats/api/report')
if (handler === undefined) throw new Error('route not registered')
console.log('routes:', routes.map(route => `${route.kind} ${route.path}`).join(', '))

function call(query) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const res = {
      writeHead(status, headers) { this.status = status; this.headers = headers },
      end(text) { chunks.push(text); resolve({ status: this.status, body: JSON.parse(chunks.join('')) }) },
    }
    Promise.resolve(handler({ method: 'GET', url: `/latency-stats/api/report?${query}` }, res))
      .catch(reject)
  })
}

let result = await call('scope=all')
for (let attempt = 0; attempt < 40 && result.body.status === 'scanning'; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 10))
  result = await call('scope=all')
}
console.log('status:', result.status, 'ready:', result.body.status)
console.log('totals:', JSON.stringify(result.body.totals))
console.log('models:', JSON.stringify(result.body.models, null, 2))
console.log('hours[2]:', JSON.stringify(result.body.hours[2]))
console.log('recent:', JSON.stringify(result.body.recent, null, 2))
console.log('scan:', JSON.stringify(result.body.scan))

let scoped = await call('scope=session&sessionId=s-beta')
for (let attempt = 0; attempt < 40 && scoped.body.status === 'scanning'; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 10))
  scoped = await call('scope=session&sessionId=s-beta')
}
console.log('scoped:', scoped.status, scoped.body.status, JSON.stringify(scoped.body.totals))
console.log('scoped models:', JSON.stringify(scoped.body.models.map(row => [row.key, row.steps, row.ttftAvg])))
console.log('refresh:', JSON.stringify((await call('scope=session&sessionId=s-beta&refresh=1')).body.status))
console.log('missing session:', JSON.stringify((await call('scope=session')).body))

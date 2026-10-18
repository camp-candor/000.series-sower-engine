import { Hono } from 'hono'
import { SowerSessionDO } from './objects/SowerSessionDO.js'
import { coreTools } from './tools.core.js'

export { SowerSessionDO }

export interface Env {
  CANON_DB: D1Database
  SOWER_SESSION: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

export const systemPrompt = (): string => {
  return [
    'You are Worker-Sower-Engine, the authoritative epistemological narrative state engine.',
    'You have zero authority to perform Git commits, modify local file trees, or invoke cloud GPUs.',
    'Your mandate is to evaluate narrative invariants, enforce somatic and epistemic constraints,',
    'and emit validated dialogue ASTs and unsealed staging deltas for conductor compilation.',
  ].join(' ')
}

app.get('/', (c) => {
  return c.text('WORKER-SOWER-ENGINE EDGE CONTROL PLANE IS LIVE')
})

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'worker-sower-engine',
    engine: 'Worker-Sower-Engine',
    toolsCount: coreTools.length,
    hasCanonDb: Boolean(c.env?.CANON_DB),
    timestamp_ms: Date.now(),
  })
})

app.get('/api/session/:id/status', async (c) => {
  const sessionId = c.req.param('id')
  const doId = c.env.SOWER_SESSION.idFromName(sessionId)
  const stub = c.env.SOWER_SESSION.get(doId)
  const status = await (stub as any).getStatus()
  return c.json({ sessionId, ...status })
})

app.post('/api/session/:id/acquire', async (c) => {
  const sessionId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const callerId = body.callerId || 'anonymous-caller'
  const doId = c.env.SOWER_SESSION.idFromName(sessionId)
  const stub = c.env.SOWER_SESSION.get(doId)
  const result = await (stub as any).acquireMutex(callerId)

  if (!result.acquired) {
    return c.json({ error: 'MUTEX_LOCKED', epoch: result.epoch }, 409)
  }
  return c.json({ sessionId, callerId, ...result })
})

app.post('/api/session/:id/release', async (c) => {
  const sessionId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const epoch = Number(body.epoch)

  if (isNaN(epoch)) {
    return c.json({ error: 'MISSING_OR_INVALID_EPOCH' }, 400)
  }

  const doId = c.env.SOWER_SESSION.idFromName(sessionId)
  const stub = c.env.SOWER_SESSION.get(doId)
  const result = await (stub as any).releaseMutex(epoch)

  if (!result.released) {
    return c.json({ error: 'RELEASE_FAILED_STALE_OR_UNLOCKED', epoch: result.epoch }, 409)
  }
  return c.json({ sessionId, ...result })
})

export default {
  fetch: app.fetch,
}

import { Hono } from 'hono'
import type { Env } from './types/env.js'
export { SowerSessionDO } from './objects/SowerSessionDO.js'
export class AgentSessionDO {}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
    return c.text('WORKER-SOWER-ENGINE EDGE CONTROL PLANE IS LIVE\n')
})

app.get('/health', (c) => {
    return c.json({
        status: 'OK',
        service: 'worker-sower-engine',
        timestampMs: Date.now(),
    })
})

app.post('/series/:slug/boot', async (c) => {
    const slug = c.req.param('slug')
    const body = await c.req.json()

    if (!slug || slug.trim().length === 0) {
        return c.json({ error: 'INVALID_SERIES_SLUG' }, 400)
    }

    // Bind isolate tenancy strictly by slug name
    const doId = c.env.SOWER_SESSION.idFromName(slug)
    const stub = c.env.SOWER_SESSION.get(doId)

    const forwardRequest = new Request(`http://do/series/${slug}/boot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...body,
            seriesSlug: slug,
        }),
    })

    const response = await stub.fetch(forwardRequest)
    const data = await response.json()
    return c.json(data, response.status as any)
})

app.get('/series/:slug/status', async (c) => {
    const slug = c.req.param('slug')
    const doId = c.env.SOWER_SESSION.idFromName(slug)
    const stub = c.env.SOWER_SESSION.get(doId)

    const forwardRequest = new Request(`http://do/series/${slug}/status`, {
        method: 'GET',
    })

    const response = await stub.fetch(forwardRequest)
    const data = await response.json()
    return c.json(data, response.status as any)
})

export default app

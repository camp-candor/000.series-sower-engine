import { Hono } from 'hono'
import type { Env } from './types/env.js'
import { EdgeScrubbedPathQuerySchema } from './types/spatial.js'
import { SowerSessionDO } from './objects/SowerSessionDO.js'

export { SowerSessionDO }
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
    const id = c.env.SOWER_SESSION.idFromName(slug)
    const stub = c.env.SOWER_SESSION.get(id)

    if (typeof (stub as any).getSessionStatus === 'function') {
        const status = await (stub as any).getSessionStatus()
        return c.json(status)
    }

    const forwardRequest = new Request(`http://do/series/${slug}/status`, {
        method: 'GET',
    })
    const response = await stub.fetch(forwardRequest)
    const data = await response.json()
    return c.json(data, response.status as any)
})

app.post('/series/:slug/spatial/route', async (c) => {
    const slug = c.req.param('slug')
    const rawBody = await c.req.json()

    const parseResult = EdgeScrubbedPathQuerySchema.safeParse(rawBody)
    if (!parseResult.success) {
        return c.json(
            {
                ok: false,
                error: 'INVALID_QUERY_SCHEMA',
                issues: parseResult.error.issues,
            },
            400,
        )
    }

    const id = c.env.SOWER_SESSION.idFromName(slug)
    const stub = c.env.SOWER_SESSION.get(id)

    if (typeof (stub as any).setSeriesSlug === 'function') {
        await (stub as any).setSeriesSlug(slug)
    }
    const receipt = await (stub as any).evaluateSpatialRoute(parseResult.data)

    return c.json(receipt)
})

export default app

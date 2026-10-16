import { Hono } from 'hono'
import { SowerSessionDO } from './objects/SowerSessionDO.js'
import { coreTools } from './tools.core.js'
import {
    checkSceneEgressReadiness,
    traceFactBlastRadius,
} from './core/ledger/queries.js'

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
        timestamp: Date.now(),
    })
})

app.get('/api/session/:id/status', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SOWER_SESSION.idFromName(sessionId)
    const stub = c.env.SOWER_SESSION.get(doId)
    const status = await (stub as any).getStatus()
    return c.json({ sessionId, ...status })
})

/**
 * Forensic CLI endpoint backing 'sower why-dirty <factId>'.
 */
app.get('/api/forensics/why-dirty/:factId', async (c) => {
    const factId = c.req.param('factId')
    if (!c.env.CANON_DB) {
        return c.json(
            {
                error: 'DATABASE_UNAVAILABLE',
                message: 'CANON_DB binding missing',
            },
            503,
        )
    }
    try {
        const report = await traceFactBlastRadius(c.env.CANON_DB, factId)
        return c.json(report)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return c.json({ error: 'QUERY_FAILED', message }, 404)
    }
})

/**
 * Stage 4/5 Precondition Gate: Blocks egress of uncertified or dirty
 * scenes with HTTP 412 before GPU rendering or TTS workers run.
 */
app.get('/api/scene/:id/egress', async (c) => {
    const sceneId = c.req.param('id')
    if (!c.env.CANON_DB) {
        return c.json(
            {
                error: 'DATABASE_UNAVAILABLE',
                message: 'CANON_DB binding missing',
            },
            503,
        )
    }

    try {
        const check = await checkSceneEgressReadiness(c.env.CANON_DB, sceneId)

        if (!check.ready) {
            return c.json(
                {
                    error: 'PRECONDITION_FAILED',
                    code: 'CANON_STALE_DIRTY_SCENE',
                    message: check.reason,
                    sceneId: check.sceneId,
                    status: check.status,
                    staleDependencies: check.staleDependencies,
                },
                412,
            )
        }

        return c.json({
            status: 'CERTIFIED_CLEAN',
            sceneId: check.sceneId,
            canProceedToRender: true,
            timestamp: Date.now(),
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return c.json({ error: 'SCENE_NOT_FOUND', message }, 404)
    }
})

export default {
    fetch: app.fetch,
}

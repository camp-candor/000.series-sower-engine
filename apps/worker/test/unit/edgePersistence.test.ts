import { describe, it, expect } from 'vitest'
import app from '../../src/index.js'

describe('apps/worker :: Edge Worker Persistence Synchronization Adapter (Phase 8)', () => {
    const mockEnv: any = {
        SOWER_SESSION: {
            idFromName: (name: string) => ({ toString: () => `id-${name}` }),
            get: (_id: any) => ({
                fetch: async (req: Request) => {
                    const url = new URL(req.url)
                    if (url.pathname.endsWith('/boot')) {
                        const body: any = await req.json()
                        return new Response(
                            JSON.stringify({
                                status: 'READY',
                                seriesSlug: body.seriesSlug,
                                headSequence: 1,
                                stateHash: 'a'.repeat(64),
                                entitiesCount: 2,
                                bootedAtMs: 1700000000000,
                                storageBackend: 'DO_SQLITE',
                            }),
                            {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' },
                            },
                        )
                    }
                    if (url.pathname.endsWith('/status')) {
                        return new Response(
                            JSON.stringify({
                                seriesSlug: 'wiregrass-basin',
                                isBooted: true,
                                headSequence: 1,
                                lastStateHash: 'a'.repeat(64),
                                entitiesCount: 2,
                            }),
                            {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' },
                            },
                        )
                    }
                    return new Response('Not Found', { status: 404 })
                },
            }),
        },
    }

    it('serves root banner and health check with 7-bit clean ASCII text', async () => {
        const res = await app.request('/', {}, mockEnv)
        expect(res.status).toBe(200)
        const text = await res.text()
        expect(text).toContain('WORKER-SOWER-ENGINE EDGE CONTROL PLANE IS LIVE')

        const healthRes = await app.request('/health', {}, mockEnv)
        expect(healthRes.status).toBe(200)
        const healthJson: any = await healthRes.json()
        expect(healthJson.service).toBe('worker-sower-engine')
    })

    it('routes boot requests to dedicated slug Durable Object instance', async () => {
        const bootPayload = {
            bibleState: {
                merkleRootHex: 'a'.repeat(64),
                entities: {
                    characters: { char_bog: {} },
                    locations: { loc_hub: {} },
                },
            },
            timestampMs: 1700000000000,
        }

        const res = await app.request(
            '/series/wiregrass-basin/boot',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bootPayload),
            },
            mockEnv,
        )

        expect(res.status).toBe(200)
        const data: any = await res.json()
        expect(data.status).toBe('READY')
        expect(data.seriesSlug).toBe('wiregrass-basin')
        expect(data.headSequence).toBe(1)
        expect(data.storageBackend).toBe('DO_SQLITE')
    })

    it('queries status from dedicated slug Durable Object instance', async () => {
        const res = await app.request(
            '/series/wiregrass-basin/status',
            {},
            mockEnv,
        )
        expect(res.status).toBe(200)
        const data: any = await res.json()
        expect(data.isBooted).toBe(true)
        expect(data.headSequence).toBe(1)
    })
})

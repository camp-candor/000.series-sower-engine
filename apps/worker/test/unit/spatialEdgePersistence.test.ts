import { describe, it, expect } from 'vitest'
import app from '../../src/index.js'
import {
    EDGE_DO_SCHEMA_SQL,
    evaluateEdgeSpatialRoute,
} from '../../src/objects/SowerSessionDO.js'
import {
    EdgeAxialCoordSchema,
    EdgeSpatialProofQuadrupleSchema,
} from '../../src/types/spatial.js'

describe('apps/worker :: Edge Worker Persistence Synchronization Adapter (Phase 8)', () => {
    const mockDOInstances = new Map<string, any>()

    const createMockDOStub = (slug: string) => {
        let headSequence = 0
        return {
            setSeriesSlug: async () => {},
            getSessionStatus: async () => ({
                seriesSlug: slug,
                headSequence,
                storageBackend: 'DO_SQLITE',
                spatialProofSchemaActive: true,
            }),
            evaluateSpatialRoute: async (query: any) => {
                if (query.workEnvelopeLimit < 6) {
                    return {
                        ok: false,
                        origin: query.originPacked,
                        destination: query.destinationPacked,
                        path: [],
                        totalCostUnits: 0,
                        cellsExpanded: query.workEnvelopeLimit,
                        proofQuadruple: {
                            topologyHash: 'a'.repeat(64),
                            overlayHash: 'b'.repeat(64),
                            queryHash: 'c'.repeat(64),
                            receiptHash: 'd'.repeat(64),
                        },
                        failureReason: 'BUDGET_EXCEEDED',
                    }
                }
                return {
                    ok: true,
                    origin: query.originPacked,
                    destination: query.destinationPacked,
                    path: [query.originPacked, query.destinationPacked],
                    totalCostUnits: 150,
                    cellsExpanded: 4,
                    proofQuadruple: {
                        topologyHash: 'a'.repeat(64),
                        overlayHash: 'b'.repeat(64),
                        queryHash: 'c'.repeat(64),
                        receiptHash: 'd'.repeat(64),
                    },
                }
            },
        }
    }

    const mockEnv: any = {
        SOWER_SESSION: {
            idFromName: (name: string) => ({
                toString: () => `id-${name}`,
                name,
            }),
            get: (idObj: any) => {
                if (!mockDOInstances.has(idObj.name)) {
                    mockDOInstances.set(
                        idObj.name,
                        createMockDOStub(idObj.name),
                    )
                }
                return mockDOInstances.get(idObj.name)
            },
        },
    }

    it('validates edge integer axial coordinates under cubic planar invariant (q+r+s=0)', () => {
        const valid = EdgeAxialCoordSchema.safeParse({ q: 2, r: -1, s: -1 })
        expect(valid.success).toBe(true)

        const nonInteger = EdgeAxialCoordSchema.safeParse({
            q: 1.5,
            r: -1.5,
            s: 0,
        })
        expect(nonInteger.success).toBe(false)
        if (!nonInteger.success) {
            expect(nonInteger.error.issues[0]?.message).toContain(
                '[FLOAT_PROHIBITED]',
            )
        }

        const invariantBreach = EdgeAxialCoordSchema.safeParse({
            q: 1,
            r: 1,
            s: 1,
        })
        expect(invariantBreach.success).toBe(false)
        if (!invariantBreach.success) {
            expect(invariantBreach.error.issues[0]?.message).toContain(
                '[CUBIC_INVARIANT_BREACH]',
            )
        }
    })

    it('routes spatial queries to isolated Durable Object instances via idFromName', async () => {
        const req1 = new Request(
            'http://localhost/series/wiregrass-basin/spatial/route',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originPacked: 100,
                    destinationPacked: 200,
                    maxBudgetCostUnits: 500,
                    workEnvelopeLimit: 512,
                }),
            },
        )

        const res1 = await app.fetch(req1, mockEnv)
        expect(res1.status).toBe(200)
        const body1: any = await res1.json()
        expect(body1.ok).toBe(true)
        expect(body1.proofQuadruple).toBeDefined()
        expect(
            EdgeSpatialProofQuadrupleSchema.safeParse(body1.proofQuadruple)
                .success,
        ).toBe(true)
    })

    it('enforces work envelope ceiling tripwire and halts with BUDGET_EXCEEDED at the edge', async () => {
        const req = new Request(
            'http://localhost/series/wiregrass-basin/spatial/route',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originPacked: 100,
                    destinationPacked: 200,
                    maxBudgetCostUnits: 500,
                    workEnvelopeLimit: 4, // Restricted to force tripwire
                }),
            },
        )

        const res = await app.fetch(req, mockEnv)
        const body: any = await res.json()
        expect(body.ok).toBe(false)
        expect(body.failureReason).toBe('BUDGET_EXCEEDED')
    })

    it('reports active spatial schema status over /series/:slug/status', async () => {
        const req = new Request(
            'http://localhost/series/under-the-floorboards/status',
        )
        const res = await app.fetch(req, mockEnv)
        expect(res.status).toBe(200)
        const body: any = await res.json()
        expect(body.seriesSlug).toBe('under-the-floorboards')
        expect(body.spatialProofSchemaActive).toBe(true)
    })

    it('isolates distinct series slugs via idFromName without cross-tenant leakage', async () => {
        const reqA = new Request(
            'http://localhost/series/wiregrass-basin/status',
        )
        const reqB = new Request(
            'http://localhost/series/under-the-floorboards/status',
        )
        const [resA, resB] = await Promise.all([
            app.fetch(reqA, mockEnv),
            app.fetch(reqB, mockEnv),
        ])
        const bodyA: any = await resA.json()
        const bodyB: any = await resB.json()
        expect(bodyA.seriesSlug).toBe('wiregrass-basin')
        expect(bodyB.seriesSlug).toBe('under-the-floorboards')
        expect(mockDOInstances.has('wiregrass-basin')).toBe(true)
        expect(mockDOInstances.has('under-the-floorboards')).toBe(true)
    })

    it('initializes edge_event_log with 4-part proof columns, immutability triggers, and sub-50ms governor checks', () => {
        expect(EDGE_DO_SCHEMA_SQL).toContain('topology_hash TEXT NOT NULL')
        expect(EDGE_DO_SCHEMA_SQL).toContain('overlay_hash TEXT NOT NULL')
        expect(EDGE_DO_SCHEMA_SQL).toContain('query_hash TEXT NOT NULL')
        expect(EDGE_DO_SCHEMA_SQL).toContain('receipt_hash TEXT NOT NULL')
        expect(EDGE_DO_SCHEMA_SQL).toContain('trg_edge_event_log_no_update')
        expect(EDGE_DO_SCHEMA_SQL).toContain('trg_edge_event_log_no_delete')
        expect(EDGE_DO_SCHEMA_SQL).toContain('[IMMUTABILITY_VIOLATION]')

        const topoHash = 'e'.repeat(64)
        const overlayHash = 'f'.repeat(64)

        const t0 = performance.now()
        const okReceipt = evaluateEdgeSpatialRoute(
            {
                originPacked: 100,
                destinationPacked: 200,
                maxBudgetCostUnits: 500,
                workEnvelopeLimit: 512,
            },
            topoHash,
            overlayHash,
        )
        const elapsedMs = performance.now() - t0
        expect(okReceipt.ok).toBe(true)
        expect(elapsedMs).toBeLessThan(50)
        expect(
            EdgeSpatialProofQuadrupleSchema.safeParse(okReceipt.proofQuadruple)
                .success,
        ).toBe(true)

        const workCapReceipt = evaluateEdgeSpatialRoute(
            {
                originPacked: 100,
                destinationPacked: 200,
                maxBudgetCostUnits: 500,
                workEnvelopeLimit: 4,
            },
            topoHash,
            overlayHash,
        )
        expect(workCapReceipt.ok).toBe(false)
        expect(workCapReceipt.failureReason).toBe('BUDGET_EXCEEDED')
        expect(workCapReceipt.path).toEqual([])

        const costCapReceipt = evaluateEdgeSpatialRoute(
            {
                originPacked: 100,
                destinationPacked: 200,
                maxBudgetCostUnits: 100,
                workEnvelopeLimit: 512,
            },
            topoHash,
            overlayHash,
        )
        expect(costCapReceipt.ok).toBe(false)
        expect(costCapReceipt.failureReason).toBe('BUDGET_EXCEEDED')
        expect(costCapReceipt.path).toEqual([])
    })
})

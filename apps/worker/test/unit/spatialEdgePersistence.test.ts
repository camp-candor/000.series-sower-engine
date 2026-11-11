import { describe, it, expect } from 'vitest'
import app from '../../src/index.js'
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

        const invariantBreach = EdgeAxialCoordSchema.safeParse({
            q: 1,
            r: 1,
            s: 1,
        })
        expect(invariantBreach.success).toBe(false)
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
})

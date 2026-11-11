import { describe, it, expect } from 'vitest'
import {
    InProcessSpatialAdapter,
    HARD_WORK_ENVELOPE_CEILING,
} from './buz/in-process-adapter.buzz.js'
import { executeBatchPath } from './buz/batch-path.buzz.js'
import { packAxial } from './buz/axial-pack.buzz.js'
import type { TopologyManifest } from './fce/spatial-port.interface.js'
import type { SpatialOverlaySnapshot } from './fce/spatial-overlay.interface.js'
import type { ScrubbedPathQuery } from './fce/sanitizer.interface.js'

describe('10.location.unit - In-Process Spatial Adapter Execution Hardening Battery', () => {
    const adapter = new InProcessSpatialAdapter()

    const manifest: TopologyManifest = {
        topologyHash: 'topology_hash_abc_123',
        bounds: { minQ: -20, maxQ: 20, minR: -20, maxR: 20 },
        blockedCells: new Set<number>([packAxial(1, 0)]),
        portalEdges: new Map(),
        cellAcousticDampingCdB: new Map(),
        ambientNoiseFloorCdB: 3000,
    }

    const overlay: SpatialOverlaySnapshot = {
        overlayHash: 'overlay_hash_xyz_789',
        closedPortals: Object.freeze([]),
        impassableCells: Object.freeze([packAxial(0, 1)]),
    }

    it('verifies that findPath returns synchronously with zero Promise instances', () => {
        const origin = packAxial(0, 0)
        const dest = packAxial(2, 0)

        const result = adapter.findPath(
            manifest,
            overlay,
            origin,
            dest,
            1000,
            256,
        )

        expect(result).not.toBeInstanceOf(Promise)
        expect(result.ok).toBe(true)
        expect(result.path.length).toBeGreaterThan(1)
        expect(result.totalCostUnits).toBeGreaterThan(0)
        expect(result.cellsExpanded).toBeLessThan(HARD_WORK_ENVELOPE_CEILING)
    })

    it('fails closed with BUDGET_EXCEEDED when search exceeds work envelope ceiling', () => {
        const origin = packAxial(0, 0)
        const dest = packAxial(10, 10)

        // Provide a ceiling limit of 4 cells to guarantee exhaustion
        const result = adapter.findPath(
            manifest,
            overlay,
            origin,
            dest,
            5000,
            4,
        )

        expect(result.ok).toBe(false)
        expect(result.failureReason).toBe('BUDGET_EXCEEDED')
        expect(result.cellsExpanded).toBe(4)
        expect(result.path).toHaveLength(0)
    })

    it('executes batch path query dispatch synchronously and seals Merkle proof', () => {
        const queries: ScrubbedPathQuery[] = [
            {
                originPacked: packAxial(0, 0),
                destinationPacked: packAxial(0, -2),
                maxBudgetCostUnits: 500,
                workEnvelopeLimit: 64,
            },
            {
                originPacked: packAxial(-1, 0),
                destinationPacked: packAxial(-3, 1),
                maxBudgetCostUnits: 500,
                workEnvelopeLimit: 64,
            },
        ]

        const batchReceipt = executeBatchPath(
            adapter,
            manifest,
            overlay,
            queries,
        )

        expect(batchReceipt).not.toBeInstanceOf(Promise)
        expect(batchReceipt.receipts).toHaveLength(2)
        expect(batchReceipt.ok).toBe(true)
        expect(batchReceipt.totalCellsExpanded).toBeGreaterThan(0)
        expect(batchReceipt.batchQueryHash).toMatch(/^[0-9a-f]{64}$/)
        expect(batchReceipt.batchReceiptHash).toMatch(/^[0-9a-f]{64}$/)
        expect(Object.isFrozen(batchReceipt)).toBe(true)
    })

    it('generates bit-exact identical receipt hashes for identical path queries', () => {
        const origin = packAxial(-2, 2)
        const dest = packAxial(0, -1)

        const res1 = adapter.findPath(manifest, overlay, origin, dest, 800, 128)
        const res2 = adapter.findPath(manifest, overlay, origin, dest, 800, 128)

        expect(res1.receiptHash).toBe(res2.receiptHash)
        expect(res1.queryHash).toBe(res2.queryHash)
        expect(res1.totalCostUnits).toBe(res2.totalCostUnits)
    })
})

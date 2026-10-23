import { describe, it, expect, vi } from 'vitest'
import {
    computeAxialDistance,
    assertAxialInvariant,
    evaluateMoveMovement,
} from './buz/movement.buzz'
import { MovementModel } from './movement.model'

describe('11.movement.unit - Axial Mathematics & Locomotion Gating', () => {
    it('enforces planar cubic invariant q + r + s === 0 and calculates non-Euclidean distance', () => {
        const a = assertAxialInvariant({ q: 10, r: 2 })
        expect(a.s).toBe(-12)

        const b = assertAxialInvariant({ q: 12, r: 3 })
        expect(b.s).toBe(-15)

        // Distance = max(|10-12|, |2-3|, |-12 - -15|) = max(2, 1, 3) = 3
        expect(computeAxialDistance(a, b)).toBe(3)

        expect(() => assertAxialInvariant({ q: 1.5, r: 2 })).toThrowError(
            '[FLOAT_PROHIBITED]',
        )
        expect(() => assertAxialInvariant({ q: 1, r: 1, s: 5 })).toThrowError(
            '[AXIAL_INVARIANT_BREACH]',
        )
    })

    it('halts movement when actor is IMMOBILIZED', async () => {
        const model = new MovementModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        let receipt: any
        await evaluateMoveMovement(
            model,
            {
                idx: 'mov-immobile',
                dat: {
                    entityId: 'char_broken_bog',
                    sourceLocationId: 'loc_warm_pipe',
                    origin: { q: 0, r: 0, s: 0 },
                    destination: { q: 1, r: 0, s: -1 },
                    locomotionTier: 'IMMOBILIZED',
                },
                slv: (r) => {
                    receipt = r.movBit.dat
                },
            },
            mockState,
        )

        expect(receipt.allowed).toBe(false)
        expect(receipt.error).toContain('[LOCOMOTION_IMMOBILIZED_BREACH]')
    })

    it('doubles traversal cost when actor is LIMPING and halts when portal is LOCKED', async () => {
        const model = new MovementModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        let receiptLimp: any
        await evaluateMoveMovement(
            model,
            {
                idx: 'mov-limp',
                dat: {
                    entityId: 'char_limping_wart',
                    sourceLocationId: 'loc_warm_pipe',
                    origin: { q: 0, r: 0, s: 0 },
                    destination: { q: 2, r: 0, s: -2 }, // distance = 2
                    locomotionTier: 'LIMPING',
                },
                slv: (r) => {
                    receiptLimp = r.movBit.dat
                },
            },
            mockState,
        )

        expect(receiptLimp.allowed).toBe(true)
        expect(receiptLimp.axialDistance).toBe(2)
        expect(receiptLimp.traversalCostUnits).toBe(400) // 2 steps * 2 multiplier * 100

        let receiptDoor: any
        await evaluateMoveMovement(
            model,
            {
                idx: 'mov-door',
                dat: {
                    entityId: 'char_limping_wart',
                    sourceLocationId: 'loc_warm_pipe',
                    destinationLocationId: 'loc_sluice_room',
                    portalId: 'hatch_valve_04',
                    portalState: 'LOCKED',
                    origin: { q: 0, r: 0, s: 0 },
                    destination: { q: 1, r: 0, s: -1 },
                    locomotionTier: 'UNRESTRICTED',
                },
                slv: (r) => {
                    receiptDoor = r.movBit.dat
                },
            },
            mockState,
        )

        expect(receiptDoor.allowed).toBe(false)
        expect(receiptDoor.error).toContain('[PORTAL_OCCLUDED_BREACH]')
    })
})

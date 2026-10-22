import { describe, it, expect } from 'vitest'
import {
    clampBps,
    bankersRoundBps,
    deriveLocomotionTier,
    applyTrauma,
    evaluateRefusalStrainTrauma,
} from './buz/trauma.buzz'
import { TraumaModel } from './trauma.model'

describe('18.trauma.unit - Somatic Vector Calculations', () => {
    it('enforces integer basis points and strict bounds [0, 10000]', () => {
        expect(clampBps(0)).toBe(0)
        expect(clampBps(10000)).toBe(10000)
        expect(clampBps(15000)).toBe(10000)
        expect(clampBps(-500)).toBe(0)
        expect(() => clampBps(10.5)).toThrowError('[FLOAT_PROHIBITED]')
    })

    it("performs exact Banker's Rounding (Round-Half-Even)", () => {
        expect(bankersRoundBps(1, 2)).toBe(0) // 0.5 -> 0 (even)
        expect(bankersRoundBps(3, 2)).toBe(2) // 1.5 -> 2 (even)
        expect(bankersRoundBps(5, 2)).toBe(2) // 2.5 -> 2 (even)
        expect(bankersRoundBps(7, 2)).toBe(4) // 3.5 -> 4 (even)
        expect(bankersRoundBps(10, 3)).toBe(3) // 3.333 -> 3
        expect(bankersRoundBps(11, 3)).toBe(4) // 3.666 -> 4
    })

    it('derives locomotion tier deterministically from legs and pain', () => {
        expect(deriveLocomotionTier(2, 0)).toBe('UNRESTRICTED')
        expect(deriveLocomotionTier(1, 0)).toBe('LIMPING')
        expect(deriveLocomotionTier(2, 5000)).toBe('LIMPING')
        expect(deriveLocomotionTier(0, 0)).toBe('IMMOBILIZED')
        expect(deriveLocomotionTier(2, 9500)).toBe('IMMOBILIZED')
    })

    it('applies delta trauma, clamps limb bounds, and mutates model state', () => {
        const model = new TraumaModel()
        let resultPayload: any

        applyTrauma(
            model,
            {
                idx: 'apply-test',
                dat: {
                    entityId: 'char_wart',
                    deltaArms: -1,
                    deltaPainBps: 6000,
                    deltaRefusalStrainBps: 8500,
                },
                slv: (res) => {
                    resultPayload = res.trmBit.dat
                },
            },
            {} as any,
        )

        expect(resultPayload).toBeDefined()
        expect(resultPayload.armsAvailable).toBe(1)
        expect(resultPayload.painBps).toBe(6000)
        expect(resultPayload.locomotionTier).toBe('LIMPING')
        expect(resultPayload.refusalStrainBps).toBe(8500)

        let strainReport: any
        evaluateRefusalStrainTrauma(
            model,
            {
                idx: 'eval-strain',
                dat: { entityId: 'char_wart' },
                slv: (res) => {
                    strainReport = res.trmBit.dat
                },
            },
            {} as any,
        )

        expect(strainReport.isStrained).toBe(true)
        expect(strainReport.refusalStrainBps).toBe(8500)
    })
})

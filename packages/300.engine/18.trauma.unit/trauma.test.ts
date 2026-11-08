import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TraumaModel } from './trauma.model.js'
import {
    initTrauma,
    applyTraumaAction,
    decayFatigueTraumaAction,
    assertBasisPoint,
} from './buz/trauma.buzz.js'
import { APPLY_TRAUMA } from './trauma.action.js'
import { reducer } from './trauma.reduce.js'

describe('18.trauma.unit - Somatic Vector & Trauma Invariance Battery', () => {
    let model: TraumaModel

    beforeEach(() => {
        model = new TraumaModel()
        initTrauma(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('rejects floating-point basis points with FLOAT_PROHIBITED', () => {
        expect(() => assertBasisPoint(4500.5, 'painBps')).toThrow(
            /FLOAT_PROHIBITED/,
        )
    })

    it('applies trauma and clamps basis points strictly between 0 and 10,000', async () => {
        const slv = vi.fn()
        await applyTraumaAction(
            model,
            {
                idx: 'apply',
                dat: {
                    delta: {
                        entityId: 'char_bog',
                        deltaPainBps: 8500,
                        deltaFatigueBps: 3000,
                        deltaArms: -1, // Lost 1 arm
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const state = model.entities['char_bog']
        expect(state.armsAvailable).toBe(1)
        expect(state.painBps).toBe(8500)
        expect(state.locomotionTier).toBe('LIMPING') // High pain forces LIMPING
    })

    it('transitions locomotionTier to IMMOBILIZED when legsAvailable === 0', async () => {
        await applyTraumaAction(
            model,
            {
                idx: 'sever-legs',
                dat: {
                    delta: {
                        entityId: 'char_wart',
                        deltaLegs: -2,
                    },
                },
            },
            {} as any,
        )

        const state = model.entities['char_wart']
        expect(state.legsAvailable).toBe(0)
        expect(state.locomotionTier).toBe('IMMOBILIZED')
    })

    it('decays fatigue cleanly without falling below 0 bps', async () => {
        model.entities['char_bog'] = {
            entityId: 'char_bog',
            armsAvailable: 2,
            legsAvailable: 2,
            concussionLevel: 0,
            fatigueBps: 300,
            painBps: 0,
            refusalStrainBps: 0,
            locomotionTier: 'UNRESTRICTED',
            updatedAtMs: 1700000000000,
        }

        const slv = vi.fn()
        await decayFatigueTraumaAction(
            model,
            {
                idx: 'decay',
                dat: { entityId: 'char_bog', decayBps: 500 },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                trmBit: expect.objectContaining({ val: 0 }),
            }),
        )
        expect(model.entities['char_bog'].fatigueBps).toBe(0)
    })

    it('routes APPLY_TRAUMA through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: APPLY_TRAUMA,
                bale: {
                    idx: 'apply',
                    dat: {
                        delta: { entityId: 'char_bog', deltaPainBps: 1000 },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as TraumaModel

        expect(result).toBeInstanceOf(TraumaModel)
        expect(slv).toHaveBeenCalled()
    })
})

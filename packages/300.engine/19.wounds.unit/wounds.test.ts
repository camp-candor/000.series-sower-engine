import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WoundsModel } from './wounds.model.js'
import {
    initWounds,
    compileSomaticMaskWoundsAction,
    assertKineticVerbsWoundsAction,
    compileSomaticMask,
} from './buz/wounds.buzz.js'
import { ASSERT_KINETIC_VERBS_WOUNDS } from './wounds.action.js'
import { reducer } from './wounds.reduce.js'

describe('19.wounds.unit - Somatic Panopticon & Kinetic Verb Gating Battery', () => {
    let model: WoundsModel

    beforeEach(() => {
        model = new WoundsModel()
        initWounds(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('rolls up BIMANUAL_GRIP verbs into banned mask when armsAvailable < 2', () => {
        const mask = compileSomaticMask('char_wart', [], 1, 2, 'UNRESTRICTED')

        expect(mask.bannedKineticVerbs).toContain('BIMANUAL_LIFT')
        expect(mask.bannedKineticVerbs).toContain('CLIMB')
        expect(mask.bannedKineticVerbs).toContain('HEAVE')
        expect(mask.bannedKineticVerbs).toContain('HEAVY_REACH')
    })

    it('rolls up LOCOMOTION_RAPID verbs into banned mask when locomotionTier is LIMPING', () => {
        const mask = compileSomaticMask('char_bog', [], 2, 2, 'LIMPING')

        expect(mask.bannedKineticVerbs).toContain('SPRINT')
        expect(mask.bannedKineticVerbs).toContain('DASH')
        expect(mask.bannedKineticVerbs).toContain('VAULT')
    })

    it('executes O(1) Somatic Panopticon assertion and rejects breached verbs with val: -1', async () => {
        // Compile mask for 1-armed actor
        await compileSomaticMaskWoundsAction(
            model,
            {
                idx: 'mask',
                dat: {
                    entityId: 'char_wart',
                    armsAvailable: 1,
                    legsAvailable: 2,
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await assertKineticVerbsWoundsAction(
            model,
            {
                idx: 'assert',
                dat: {
                    auditQuery: {
                        entityId: 'char_wart',
                        proposedVerbs: ['INSPECT', 'BIMANUAL_LIFT'], // BIMANUAL_LIFT is banned
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                wndBit: expect.objectContaining({
                    val: -1,
                    idx: 'somatic-capability-breach',
                    src: '[SOMATIC_CAPABILITY_BREACH]',
                }),
                auditReceipt: expect.objectContaining({
                    permitted: false,
                    breachedVerbs: ['BIMANUAL_LIFT'],
                }),
            }),
        )
    })

    it('permits valid physical verbs when no collision with negative mask occurs', async () => {
        await compileSomaticMaskWoundsAction(
            model,
            {
                idx: 'mask',
                dat: {
                    entityId: 'char_bog',
                    armsAvailable: 2,
                    legsAvailable: 2,
                    locomotionTier: 'UNRESTRICTED',
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await assertKineticVerbsWoundsAction(
            model,
            {
                idx: 'assert',
                dat: {
                    auditQuery: {
                        entityId: 'char_bog',
                        proposedVerbs: ['WALK', 'INSPECT', 'SNIFF'],
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                wndBit: expect.objectContaining({
                    val: 1,
                    idx: 'assert-kinetic-verbs-pass',
                    src: '[OK]',
                }),
                auditReceipt: expect.objectContaining({
                    permitted: true,
                    breachedVerbs: [],
                }),
            }),
        )
    })

    it('routes ASSERT_KINETIC_VERBS_WOUNDS through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: ASSERT_KINETIC_VERBS_WOUNDS,
                bale: {
                    idx: 'assert',
                    dat: {
                        auditQuery: {
                            entityId: 'char_bog',
                            proposedVerbs: ['WALK'],
                        },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as WoundsModel

        expect(result).toBeInstanceOf(WoundsModel)
        expect(slv).toHaveBeenCalled()
    })
})

import { describe, it, expect, vi } from 'vitest'
import {
    compileSomaticMask,
    assertKineticVerbsWounds,
    addWound,
    computeSomaticMaskWounds,
} from './buz/wounds.buzz'
import { WoundsModel } from './wounds.model'

describe('19.wounds.unit - Kinetic Verb Panopticon', () => {
    it('rolls up semantic verb families based on wounds and limb ceilings', () => {
        const mask = compileSomaticMask(
            'char_wart',
            [
                {
                    woundId: 'wnd_01',
                    locus: 'UPPER_LEFT_LIMB',
                    conditionTag: 'SEVERED_LEFT_ARM',
                    severityBps: 10000,
                    isPermanent: true,
                },
            ],
            1, // 1 arm available
            2, // 2 legs available
            'UNRESTRICTED',
        )

        expect(mask.openWounds).toContain('SEVERED_LEFT_ARM')
        expect(mask.bannedKineticVerbs).toContain('CLIMB')
        expect(mask.bannedKineticVerbs).toContain('BIMANUAL_LIFT')
        expect(mask.bannedKineticVerbs).toContain('GRAPPLE_TWO_HANDED')
        expect(mask.bannedKineticVerbs).toContain('HEAVE')
        expect(mask.bannedKineticVerbs).not.toContain('SPRINT')
    })

    it('bans rapid and vertical locomotion verbs when locomotionTier is LIMPING or IMMOBILIZED', () => {
        const maskLimp = compileSomaticMask(
            'char_spleen',
            [
                {
                    woundId: 'wnd_02',
                    locus: 'LOWER_RIGHT_LIMB',
                    conditionTag: 'FRACTURED_FEMUR',
                    severityBps: 8000,
                    isPermanent: false,
                },
            ],
            2,
            1,
            'LIMPING',
        )

        expect(maskLimp.bannedKineticVerbs).toContain('SPRINT')
        expect(maskLimp.bannedKineticVerbs).toContain('VAULT')
        expect(maskLimp.bannedKineticVerbs).toContain('RAPID_STAIRS')

        const maskImmobile = compileSomaticMask(
            'char_octavius',
            [],
            2,
            0,
            'IMMOBILIZED',
        )

        expect(maskImmobile.bannedKineticVerbs).toContain('WALK')
        expect(maskImmobile.bannedKineticVerbs).toContain('STAND')
        expect(maskImmobile.bannedKineticVerbs).toContain('CLIMB')
        expect(maskImmobile.bannedKineticVerbs).toContain('SPRINT')
    })

    it('performs O(1) set-intersection check and rejects breached verbs with 7-bit ASCII logs', async () => {
        const model = new WoundsModel()
        const mockState = {
            hunt: vi.fn().mockResolvedValue({}),
        } as any

        addWound(
            model,
            {
                idx: 'add-wnd',
                dat: {
                    entityId: 'char_wart',
                    wound: {
                        woundId: 'wnd_amputated',
                        locus: 'LEFT_ARM',
                        conditionTag: 'SEVERED_LEFT_ARM',
                        severityBps: 10000,
                        isPermanent: true,
                    },
                },
            },
            mockState,
        )

        computeSomaticMaskWounds(
            model,
            {
                idx: 'comp-mask',
                dat: {
                    entityId: 'char_wart',
                    armsAvailable: 1,
                    legsAvailable: 2,
                    locomotionTier: 'UNRESTRICTED',
                },
            },
            mockState,
        )

        let receipt: any
        await assertKineticVerbsWounds(
            model,
            {
                idx: 'audit-verbs',
                dat: {
                    entityId: 'char_wart',
                    candidateVerbs: ['TALK', 'CLIMB', 'LOOK', 'BIMANUAL_LIFT'],
                },
                slv: (res) => {
                    receipt = res.wndBit.dat
                },
            },
            mockState,
        )

        expect(receipt.allowed).toBe(false)
        expect(receipt.breachedVerbs).toEqual(['BIMANUAL_LIFT', 'CLIMB'])
        expect(mockState.hunt).toHaveBeenCalledWith(
            '[Console action] Update Console',
            expect.objectContaining({
                idx: 'cns00',
                src: expect.stringContaining('[SOMATIC_CAPABILITY_BREACH]'),
            }),
        )
    })
})

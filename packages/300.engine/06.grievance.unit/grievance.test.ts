import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GrievanceModel } from './grievance.model.js'
import {
    initGrievance,
    upsertGrievanceAction,
    escalateGrievanceAction,
    tickCooldownGrievanceAction,
    selectStage3EncounterAction,
    calculateJaccardSimilarity,
    evaluateMachineRailFilter,
} from './buz/grievance.buzz.js'
import { SELECT_STAGE3_ENCOUNTER } from './grievance.action.js'
import { reducer } from './grievance.reduce.js'

describe('06.grievance.unit - Stage 3 Conflict & Grievance Selection Battery', () => {
    let model: GrievanceModel

    beforeEach(async () => {
        model = new GrievanceModel()
        await initGrievance(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('rejects self-referential grievances with [ANTI_REFLEXIVITY_BREACH]', async () => {
        const slv = vi.fn()
        await upsertGrievanceAction(
            model,
            {
                idx: 'self-grv',
                dat: {
                    upsertParams: {
                        grievance_id: 'grv_self_hate',
                        instigator_id: 'char_bog',
                        victim_id: 'char_bog',
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                grvBit: expect.objectContaining({
                    val: -1,
                    idx: 'upsert-grievance-error',
                    src: '[ANTI_REFLEXIVITY_BREACH]',
                }),
            }),
        )
    })

    it('enforces Machine Rail set filtering (SceneCast intersect Primary minus Excluded)', () => {
        const record = {
            grievance_id: 'grv_siphon',
            instigator_id: 'char_bog',
            victim_id: 'char_wart',
            category: 'resource_theft',
            escalation_depth: 1,
            cooldown_cycles: 0,
            intensity_bps: 4000,
            min_intensity_bps: 2000,
            max_intensity_bps: 6000,
            status: 'ACTIVE' as const,
            primary_actors: ['char_bog', 'char_wart'],
            excluded_actors: ['char_spleen'],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        }

        // Cast with Bog and Wart -> Eligible
        expect(evaluateMachineRailFilter(record, ['char_bog', 'char_wart'], 3000)).toBe(true)

        // Cast includes excluded actor Spleen -> Ineligible
        expect(evaluateMachineRailFilter(record, ['char_bog', 'char_wart', 'char_spleen'], 3000)).toBe(false)

        // Tension outside envelope -> Ineligible
        expect(evaluateMachineRailFilter(record, ['char_bog', 'char_wart'], 7000)).toBe(false)

        // Cooldown active -> Ineligible
        expect(evaluateMachineRailFilter({ ...record, cooldown_cycles: 2 }, ['char_bog', 'char_wart'], 3000)).toBe(false)
    })

    it('forces hard override (Boil Over) when a simmering grievance is active', async () => {
        model.records.set('grv_normal', {
            grievance_id: 'grv_normal',
            instigator_id: 'char_bog',
            victim_id: 'char_wart',
            category: 'insult',
            escalation_depth: 0,
            cooldown_cycles: 0,
            intensity_bps: 2000,
            min_intensity_bps: 0,
            max_intensity_bps: 10000,
            status: 'ACTIVE',
            primary_actors: ['char_bog', 'char_wart'],
            excluded_actors: [],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        })

        model.records.set('grv_boiling', {
            grievance_id: 'grv_boiling',
            instigator_id: 'char_wart',
            victim_id: 'char_bog',
            category: 'blood_debt',
            escalation_depth: 3,
            cooldown_cycles: 0,
            intensity_bps: 8500, // Breaches 8000 bps ceiling
            min_intensity_bps: 0,
            max_intensity_bps: 10000,
            status: 'SIMMERING',
            primary_actors: ['char_wart', 'char_bog'],
            excluded_actors: [],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        })

        const slv = vi.fn()
        await selectStage3EncounterAction(
            model,
            {
                idx: 'select',
                dat: {
                    selectionParams: {
                        sceneCast: ['char_bog', 'char_wart'],
                        currentTensionBps: 2000,
                        tick: 1,
                        timestamp_ms: 1000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                selectionReceipt: expect.objectContaining({
                    selected: true,
                    grievance_id: 'grv_boiling',
                    isBoilOver: true,
                }),
            }),
        )
    })

    it('rejects candidate with Jaccard boredom detector when similarity >= 0.65', () => {
        const tokensA = ['grv_1', 'char_bog', 'char_wart', 'resource']
        const tokensB = ['grv_1', 'char_bog', 'char_wart', 'resource'] // 100% match
        const tokensC = ['grv_2', 'char_wart', 'char_spleen', 'territory']

        expect(calculateJaccardSimilarity(tokensA, tokensB)).toBe(1.0)
        expect(calculateJaccardSimilarity(tokensA, tokensC)).toBeLessThan(0.65)
    })

    it('escalates grievance depth and updates basis points cleanly', async () => {
        model.records.set('grv_dispute', {
            grievance_id: 'grv_dispute',
            instigator_id: 'char_bog',
            victim_id: 'char_wart',
            category: 'dispute',
            escalation_depth: 1,
            cooldown_cycles: 0,
            intensity_bps: 4000,
            min_intensity_bps: 0,
            max_intensity_bps: 10000,
            status: 'ACTIVE',
            primary_actors: ['char_bog', 'char_wart'],
            excluded_actors: [],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        })

        const slv = vi.fn()
        await escalateGrievanceAction(
            model,
            {
                idx: 'escalate',
                dat: {
                    escalateParams: {
                        grievance_id: 'grv_dispute',
                        intensity_delta_bps: 4500, // 4000 + 4500 = 8500 -> auto SIMMERING
                        add_cooldown_cycles: 2,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const updated = model.records.get('grv_dispute')!
        expect(updated.escalation_depth).toBe(2)
        expect(updated.intensity_bps).toBe(8500)
        expect(updated.status).toBe('SIMMERING')
        expect(updated.cooldown_cycles).toBe(2)
    })

    it('decrements cooldown cycles toward zero during tickCooldown', async () => {
        model.records.set('grv_cool', {
            grievance_id: 'grv_cool',
            instigator_id: 'char_bog',
            victim_id: 'char_wart',
            category: 'dispute',
            escalation_depth: 1,
            cooldown_cycles: 1,
            intensity_bps: 2000,
            min_intensity_bps: 0,
            max_intensity_bps: 10000,
            status: 'ACTIVE',
            primary_actors: ['char_bog', 'char_wart'],
            excluded_actors: [],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        })

        const slv = vi.fn()
        await tickCooldownGrievanceAction(model, { idx: 'tick', slv }, {} as any)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                grvBit: expect.objectContaining({ val: 1 }),
            }),
        )
        expect(model.records.get('grv_cool')!.cooldown_cycles).toBe(0)
    })

    it('routes SELECT_STAGE3_ENCOUNTER cleanly through pure reducer using clone-deep', async () => {
        model.records.set('grv_test', {
            grievance_id: 'grv_test',
            instigator_id: 'char_bog',
            victim_id: 'char_wart',
            category: 'dispute',
            escalation_depth: 0,
            cooldown_cycles: 0,
            intensity_bps: 2000,
            min_intensity_bps: 0,
            max_intensity_bps: 10000,
            status: 'ACTIVE',
            primary_actors: ['char_bog', 'char_wart'],
            excluded_actors: [],
            required_props: [],
            location_tags: [],
            updated_at_ms: 1000,
        })

        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: SELECT_STAGE3_ENCOUNTER,
                bale: {
                    idx: 'reducer-select',
                    dat: {
                        selectionParams: {
                            sceneCast: ['char_bog', 'char_wart'],
                            currentTensionBps: 2000,
                            tick: 1,
                            timestamp_ms: 1000,
                        },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as GrievanceModel

        expect(result).toBeInstanceOf(GrievanceModel)
        expect(slv).toHaveBeenCalled()
    })
})

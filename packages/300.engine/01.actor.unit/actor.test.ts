import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ActorModel } from './actor.model.js'
import {
    initActor,
    recordBeliefActor,
    queryHorizonActor,
    scrubEpistemicContextActor,
    calculateCompositeSalience,
    stageDetailActor,
    ratifyDetailActor,
    assertBasisPoints,
} from './buz/actor.buzz.js'
import { STAGE_DETAIL_ACTOR } from './actor.action.js'
import { reducer } from './actor.reduce.js'
import type { ActorBeliefRecord } from './fce/actor.interface.js'


describe('01.actor.unit - Epistemic Horizon & Unratified Detail Salience Battery', () => {
    let model: ActorModel
    let mockState: any
    let dbOperations: any[]
    let eventAppends: any[]

    beforeEach(async () => {
        model = new ActorModel()
        dbOperations = []
        eventAppends = []
        mockState = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Exec Batch Database')) {
                    dbOperations.push(...payload.dat.operations)
                    return { databaseBit: { val: payload.dat.operations.length } }
                }
                if (actionType.includes('Append Event')) {
                    eventAppends.push(payload.dat.appendParams)
                    return { eventBit: { val: 1 } }
                }
                if (actionType.includes('Query Database')) {
                    return { databaseBit: { val: 0 } }
                }
                return {}
            }),
        }
        await initActor(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('calculates composite salience in discrete basis points correctly', () => {
        // Test A: Single recurrence, background set dressing (N=1, D_turn=0)
        // Recurrence: floor(1*10000/3) = 3333 bps -> * 40% = 1333 bps
        // Drama: 0 bps -> Total: 1333 bps (< 7000 bps)
        const low = calculateCompositeSalience({
            recurrence_count: 1,
            dramatic_turn: 'BACKGROUND',
        })
        expect(low.salience_bps).toBe(1333)
        expect(low.isHarvestEligible).toBe(false)

        // Test B: 3 recurrences, gaze proximity (N=3, D_turn=0.5)
        // Recurrence: 10000 bps * 40% = 4000 bps
        // Drama: 5000 bps * 60% = 3000 bps -> Total: 7000 bps (>= 7000 bps)
        const med = calculateCompositeSalience({
            recurrence_count: 3,
            dramatic_turn: 'GAZE_PROXIMITY',
        })
        expect(med.salience_bps).toBe(7000)
        expect(med.isHarvestEligible).toBe(true)

        // Test C: 3 recurrences, mechanical duel (N=3, D_turn=1.0)
        // Total: 4000 + 6000 = 10000 bps
        const max = calculateCompositeSalience({
            recurrence_count: 3,
            dramatic_turn: 'MECHANICAL_DUEL',
        })
        expect(max.salience_bps).toBe(10000)
        expect(max.isHarvestEligible).toBe(true)
    })

    it('discards ephemeral visual noise (S < 7000 bps) with zero database writes', async () => {
        const slv = vi.fn()
        await stageDetailActor(
            model,
            {
                idx: 'stage-noise',
                dat: {
                    stageDetailParams: {
                        detail_id: 'det_gravel_speck',
                        scene_id: 'sc01',
                        label_candidate: 'gravel_speck',
                        category: 'SPATIAL_SET',
                        recurrence_count: 1,
                        dramatic_turn: 'BACKGROUND',
                        claim_proposal: 'Incidental gravel on culvert pipe floor',
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                actBit: expect.objectContaining({
                    idx: 'stage-detail-discarded',
                    src: 'DISCARDED',
                }),
            }),
        )
        // Assert zero database operations were queued for ephemeral noise
        expect(dbOperations).toHaveLength(0)
        expect(model.details.size).toBe(0)
    })

    it('stages salient detail (S >= 7000 bps) into harvest queue and persists to database', async () => {
        const slv = vi.fn()
        await stageDetailActor(
            model,
            {
                idx: 'stage-cup',
                dat: {
                    stageDetailParams: {
                        detail_id: 'det_green_cup',
                        scene_id: 'sc02',
                        entity_id: 'char_bog',
                        label_candidate: 'green_enamel_cup',
                        category: 'PROP',
                        recurrence_count: 3,
                        dramatic_turn: 'GAZE_PROXIMITY',
                        claim_proposal: 'A chipped green enamel cup Bog keeps in his pocket',
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(model.details.has('det_green_cup')).toBe(true)
        const staged = model.details.get('det_green_cup')!
        expect(staged.status).toBe('STAGED')
        expect(staged.salience_bps).toBe(7000)

        // Database write must have executed
        expect(dbOperations).toHaveLength(1)
        expect(dbOperations[0].table).toBe('unratified_details')
        expect(dbOperations[0].key).toBe('det_green_cup')
    })

    it('promotes quarantined detail to formal canonical entity upon human ratification', async () => {
        // Pre-seed a staged detail
        model.details.set('det_brass_valve', {
            detail_id: 'det_brass_valve',
            scene_id: 'sc03',
            label_candidate: 'brass_valve',
            category: 'PROP',
            recurrence_count: 3,
            dramatic_turn: 'MECHANICAL_DUEL',
            salience_bps: 10000,
            claim_proposal: 'Contested brass valve collar',
            status: 'STAGED',
            created_at_ms: 1000,
        })

        const slv = vi.fn()
        await ratifyDetailActor(
            model,
            {
                idx: 'ratify-valve',
                dat: {
                    ratifyDetailParams: {
                        detail_id: 'det_brass_valve',
                        ratified_entity_id: 'item_brass_valve_collar',
                        tick: 5,
                        timestamp_ms: 2000,
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        const ratified = model.details.get('det_brass_valve')!
        expect(ratified.status).toBe('RATIFIED')
        expect(ratified.ratified_entity_id).toBe('item_brass_valve_collar')

        // Assert database updated and historical event appended
        expect(dbOperations).toHaveLength(1)
        expect(eventAppends).toHaveLength(1)
        expect(eventAppends[0].eventType).toBe('DETAIL_RATIFIED')
    })

    it('records and queries subjective epistemic belief horizons', async () => {
        await recordBeliefActor(
            model,
            {
                idx: 'belief-1',
                dat: {
                    beliefParams: {
                        observer_id: 'char_bog',
                        fact_id: 'fact_water_tainted',
                        subjective_probability_bps: 8500,
                    },
                },
            },
            mockState,
        )

        const slv = vi.fn()
        queryHorizonActor(model, { idx: 'q', dat: { observerId: 'char_bog' }, slv }, mockState)

        expect(slv).toHaveBeenCalled()
        const beliefs = slv.mock.calls[0][0].beliefs as ActorBeliefRecord[]
        expect(beliefs).toHaveLength(1)
        expect(beliefs[0].fact_id).toBe('fact_water_tainted')
    })

    it('scrubs objective world facts by ignorance omission for characters without belief', () => {
        // Bog knows the water is tainted
        model.beliefs.set('char_bog->fact_water_tainted', {
            belief_id: 'char_bog->fact_water_tainted',
            observer_id: 'char_bog',
            fact_id: 'fact_water_tainted',
            subjective_probability_bps: 9000,
            source_type: 'DIRECT_OBSERVATION',
            is_false_belief: 0,
            learned_at_ms: 1000,
            updated_at_ms: 1000,
        })

        const worldFacts = {
            fact_water_tainted: 'The culvert water contains caustic lye.',
            fact_secret_cache: 'Wart buried an iron crowbar under the pipe joint.',
        }

        const slv = vi.fn()
        scrubEpistemicContextActor(
            model,
            {
                idx: 'scrub',
                dat: {
                    scrubParams: {
                        observer_id: 'char_bog',
                        world_facts: worldFacts,
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        const scrubbed = slv.mock.calls[0][0].scrubbedFacts
        // Bog knows about water, but does NOT know about secret cache
        expect(scrubbed['fact_water_tainted']).toBeDefined()
        expect(scrubbed['fact_secret_cache']).toBeUndefined()
    })

    it('rejects floating-point basis points with FLOAT_PROHIBITED', () => {
        expect(() => assertBasisPoints(7500.5, 'salience_bps')).toThrow(/FLOAT_PROHIBITED/)
    })

    it('routes STAGE_DETAIL_ACTOR cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: STAGE_DETAIL_ACTOR,
                bale: {
                    idx: 'reducer-stage',
                    dat: {
                        stageDetailParams: {
                            detail_id: 'det_test',
                            claim_proposal: 'Test claim',
                        },
                    },
                    slv,
                } as any,
            },
            mockState,
        )) as ActorModel

        expect(result).toBeInstanceOf(ActorModel)
        expect(slv).toHaveBeenCalled()
    })
})

import type { ActorBeliefRecord } from './fce/actor.interface.js'

import {
    STAGE_DETAIL_ACTOR,
    BUILD_SUBTEXT_DIRECTIVE_ACTOR,
    PROBE_DIALOGUE_LEAK_ACTOR,
    COMPILE_DIALOGUE_BEAT_ACTOR,
} from './actor.action.js'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ActorModel } from './actor.model.js'
import {
    enforceCurtnessBudget,
    initActor,
    compileDialogueBeat,
    queryHorizonActor,
    recordBeliefActor,
    calculateCompositeSalience,
    stageDetailActor,
    ratifyDetailActor,
    scrubEpistemicContextActor,
    buildSubtextAttenuationDirective,
    probeDialogueSubtextLeak,
    assertBasisPoints,
} from './buz/actor.buzz.js'

import { reducer } from './actor.reduce.js'

describe('01.actor.unit - Core Features & Stage 5 Features', () => {
    let model: ActorModel
    let mockState: any
    let dbOperations: any[]
    let eventAppends: any[]

    beforeEach(async () => {
        model = new ActorModel()
        dbOperations = []
        eventAppends = []
        mockState = {
            hunt: vi.fn(async (actionType, payload) => {
                if (actionType === '[Database action] Exec Batch Database') {
                    dbOperations.push(...payload.dat.operations)
                }
                if (actionType === '[Event action] Append Event') {
                    eventAppends.push(payload.dat)
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
                        claim_proposal:
                            'Incidental gravel on culvert pipe floor',
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
                        claim_proposal:
                            'A chipped green enamel cup Bog keeps in his pocket',
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
        expect(eventAppends[0].appendParams.eventType).toBe('DETAIL_RATIFIED')
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
        queryHorizonActor(
            model,
            { idx: 'q', dat: { observerId: 'char_bog' }, slv },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        const beliefs = slv.mock.calls[0][0].beliefs as ActorBeliefRecord[]
        expect(beliefs).toHaveLength(1)
        expect(beliefs[0].fact_id).toBe('fact_water_tainted')
    })

    it('scrubs objective world facts by ignorance omission for characters without belief', async () => {
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
            fact_secret_cache:
                'Wart buried an iron crowbar under the pipe joint.',
        }

        const slv = vi.fn()
        await scrubEpistemicContextActor(
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
        expect(() => assertBasisPoints(7500.5, 'salience_bps')).toThrow(
            /FLOAT_PROHIBITED/,
        )
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

    it('scrubs unobserved facts from context via ignorance by omission', async () => {
        // Bog only knows that the pipe is cold
        await recordBeliefActor(
            model,
            {
                idx: 'b1',
                dat: {
                    beliefParams: {
                        observer_id: 'char_bog',
                        fact_id: 'fact_pipe_cold',
                        subjective_probability_bps: 10000,
                    },
                },
            },
            mockState,
        )

        const worldFacts = {
            fact_pipe_cold: 'The drainage pipe is freezing cold.',
            fact_hidden_key: 'A copper key is hidden under the grate.',
            fact_poison_well: 'The central well water is poisoned.',
        }

        const slv = vi.fn()
        await scrubEpistemicContextActor(
            model,
            {
                idx: 'scrub-test',
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
        const result = slv.mock.calls[0][0].scrubbedFacts
        expect(result.fact_pipe_cold).toBeDefined()
        expect(result.fact_hidden_key).toBeUndefined()
        expect(result.fact_poison_well).toBeUndefined()
    })

    it('builds FALSE_INTERPRETATION_ANCHOR directive when tension >= 7000 bps', () => {
        const directive = buildSubtextAttenuationDirective({
            actor_id: 'char_bog',
            tension_bps: 7500,
            candidate_props: ['item_copper_tea_kettle', 'item_grease_bucket'],
            surface_dispute: 'broken kettle lid',
            underlying_conflict: 'fear of seasonal abandonment',
        })

        expect(directive.directive_type).toBe('FALSE_INTERPRETATION_ANCHOR')
        expect(directive.anchor_prop).toBe('item_copper_tea_kettle')
        expect(directive.overt_topic).toBe('broken kettle lid')
        expect(directive.suppressed_emotion).toBe(
            'fear of seasonal abandonment',
        )
        expect(directive.guidance_prompt).toContain('broken kettle lid')
        expect(directive.guidance_prompt).toContain(
            'fear of seasonal abandonment',
        )
    })

    it('builds DIRECT_EXPRESSION directive when tension < 7000 bps', () => {
        const directive = buildSubtextAttenuationDirective({
            actor_id: 'char_wart',
            tension_bps: 3200,
            candidate_props: ['item_valve'],
            surface_dispute: 'valve threads',
            underlying_conflict: 'resentment over rations',
        })

        expect(directive.directive_type).toBe('DIRECT_EXPRESSION')
        expect(directive.anchor_prop).toBe('item_valve')
        expect(directive.suppressed_emotion).toBe('')
    })

    it('passes dialogue probe when secret lemma overlap <= 3500 bps (35%)', () => {
        const secretLemmas = ['poison', 'well', 'arsenic', 'tainted', 'cistern']
        // 1 match ('well') out of 5 lemmas = 1/5 = 2000 bps <= 3500 bps
        const receipt = probeDialogueSubtextLeak({
            dialogue_text:
                'I went to fetch clean water from the deep well yesterday.',
            secret_id: 'secret_poisoned_water',
            secret_lemmas: secretLemmas,
            threshold_bps: 3500,
        })

        expect(receipt.passed).toBe(true)
        expect(receipt.overlap_count).toBe(1)
        expect(receipt.similarity_bps).toBe(2000)
        expect(receipt.error).toBeUndefined()
    })

    it('fails dialogue probe with EPISTEMIC_HORIZON_LEAK when overlap > 3500 bps', () => {
        const secretLemmas = ['poison', 'well', 'arsenic', 'tainted', 'cistern']
        // 2 matches ('poison', 'well') out of 5 lemmas = 2/5 = 4000 bps > 3500 bps
        const receipt = probeDialogueSubtextLeak({
            dialogue_text: 'Someone put poison in the well cistern!',
            secret_id: 'secret_poisoned_water',
            secret_lemmas: secretLemmas,
            threshold_bps: 3500,
        })

        expect(receipt.passed).toBe(false)
        expect(receipt.overlap_count).toBe(3) // poison, well, cistern = 3/5 = 6000 bps
        expect(receipt.similarity_bps).toBe(6000)
        expect(receipt.error).toContain('EPISTEMIC_HORIZON_LEAK')
    })

    it('rejects floating-point tension or threshold with FLOAT_PROHIBITED', () => {
        expect(() => assertBasisPoints(7000.5, 'tension_bps')).toThrow(
            /FLOAT_PROHIBITED/,
        )
    })

    it('routes BUILD_SUBTEXT_DIRECTIVE_ACTOR and PROBE_DIALOGUE_LEAK_ACTOR through pure reducer', async () => {
        const slv1 = vi.fn()
        const res1 = (await reducer(
            model,
            {
                type: BUILD_SUBTEXT_DIRECTIVE_ACTOR,
                bale: {
                    idx: 'subtext-action',
                    dat: {
                        subtextParams: {
                            actor_id: 'char_bog',
                            tension_bps: 8000,
                            candidate_props: ['item_bucket'],
                            surface_dispute: 'spilled grease',
                            underlying_conflict: 'distrust',
                        },
                    },
                    slv: slv1,
                } as any,
            },
            mockState,
        )) as ActorModel

        expect(res1).toBeInstanceOf(ActorModel)
        expect(slv1).toHaveBeenCalled()

        const slv2 = vi.fn()
        const res2 = (await reducer(
            model,
            {
                type: PROBE_DIALOGUE_LEAK_ACTOR,
                bale: {
                    idx: 'probe-action',
                    dat: {
                        leakProbeParams: {
                            dialogue_text: 'The valve is rusted tight.',
                            secret_id: 'sec_murder',
                            secret_lemmas: ['blood', 'knife', 'body'],
                        },
                    },
                    slv: slv2,
                } as any,
            },
            mockState,
        )) as ActorModel

        expect(res2).toBeInstanceOf(ActorModel)
        expect(slv2).toHaveBeenCalled()
    })
})

describe('01.actor.unit - Stage 5 Dual-Field Dialogue AST Compilation Battery', () => {
    let model: ActorModel
    let mockState: any

    beforeEach(async () => {
        model = new ActorModel()
        mockState = {
            hunt: vi.fn(async () => ({})),
        }
        await initActor(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('calculates directorial curtness budget word ceiling correctly', () => {
        // C = 10000 bps (max curtness) -> max(2, floor(24 - 18 * 1.0)) = 6 words
        expect(enforceCurtnessBudget(10000)).toBe(6)
        // C = 0 bps (relaxed) -> max(2, floor(24 - 0)) = 24 words
        expect(enforceCurtnessBudget(0)).toBe(24)
        // C = 5000 bps -> max(2, floor(24 - 9)) = 15 words
        expect(enforceCurtnessBudget(5000)).toBe(15)
        // C = 9000 bps -> max(2, floor(24 - 16.2)) = 7 words
        expect(enforceCurtnessBudget(9000)).toBe(7)
    })

    it('rejects dialogue turn that breaches the curtness budget with [CURTNESS_BUDGET_BREACH]', () => {
        // High curtness C = 10000 bps (max 6 words)
        const receipt = compileDialogueBeat({
            beat_id: 'b01',
            speaker: 'char_bog',
            dialogue_text:
                'I told you once before that we cannot touch that valve under any circumstances whatsoever.', // 15 words
            camera_parenthetical: 'Bog stares coldly through the gloom.',
            observable_parenthetical: 'Bog stands motionless.',
            speech_act: 'ASSERT',
            emotion: 'cold_urgency',
            swain_mru_phase: 'SPEECH',
            extracted_motor_actions: ['STAND'],
            curtness_bps: 10000,
        })

        expect(receipt.compiled).toBe(false)
        expect(receipt.curtness_breach).toBe(true)
        expect(receipt.error).toContain('CURTNESS_BUDGET_BREACH')
        expect(receipt.word_count).toBe(15)
        expect(receipt.max_permitted_words).toBe(6)
    })

    it('compiles compliant dual-field dialogue beat successfully', () => {
        // High curtness C = 10000 bps (max 6 words)
        const receipt = compileDialogueBeat({
            beat_id: 'b02',
            speaker: 'char_bog',
            dialogue_text: 'Leave the brass valve alone.', // 5 words <= 6 words
            camera_parenthetical:
                'Camera pushes in close on Bog trembling jaw.',
            observable_parenthetical: 'Bog tightens his stance.',
            speech_act: 'IMPLICIT_WARNING',
            emotion: 'cold_urgency',
            swain_mru_phase: 'SPEECH',
            extracted_motor_actions: ['STAND'],
            curtness_bps: 10000,
        })

        expect(receipt.compiled).toBe(true)
        expect(receipt.beat).toBeDefined()
        expect(receipt.beat?.camera_parenthetical).toBe(
            'Camera pushes in close on Bog trembling jaw.',
        )
        expect(receipt.beat?.observable_parenthetical).toBe(
            'Bog tightens his stance.',
        )
        expect(receipt.beat?.word_count).toBe(5)
    })

    it('intercepts somatic capability violations with [FATAL_SOMATIC_BREACH]', () => {
        // Bog has a crushed arm and cannot sprint
        const receipt = compileDialogueBeat({
            beat_id: 'b03',
            speaker: 'char_bog',
            dialogue_text: 'Run!',
            camera_parenthetical: 'Bog sprints across the flooding culvert.',
            observable_parenthetical: 'Bog bolts away.',
            speech_act: 'ASSERT',
            emotion: 'suppressed_panic',
            swain_mru_phase: 'MOTOR_ACTION',
            extracted_motor_actions: ['SPRINT'],
            curtness_bps: 5000,
            banned_kinetic_verbs: ['SPRINT'],
        })

        expect(receipt.compiled).toBe(false)
        expect(receipt.somatic_breach).toBe(true)
        expect(receipt.error).toContain('FATAL_SOMATIC_BREACH')
    })

    it('rejects fractional curtness_bps with FLOAT_PROHIBITED', () => {
        expect(() => enforceCurtnessBudget(5000.5)).toThrow(/FLOAT_PROHIBITED/)
    })

    it('routes COMPILE_DIALOGUE_BEAT_ACTOR cleanly through pure reducer', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: COMPILE_DIALOGUE_BEAT_ACTOR,
                bale: {
                    idx: 'compile-test',
                    dat: {
                        compileBeatParams: {
                            beat_id: 'b04',
                            speaker: 'char_wart',
                            dialogue_text: 'No.',
                            camera_parenthetical: 'Wart scowls.',
                            observable_parenthetical: 'Wart refuses.',
                            speech_act: 'DENY',
                            emotion: 'cynical_defiance',
                            swain_mru_phase: 'SPEECH',
                            extracted_motor_actions: [],
                            curtness_bps: 10000,
                        },
                    },
                    slv,
                } as any,
            },
            mockState,
        )) as ActorModel

        expect(result).toBeInstanceOf(ActorModel)
        expect(slv).toHaveBeenCalled()
        expect(result.compiledBeats.has('b04')).toBe(true)
    })
})

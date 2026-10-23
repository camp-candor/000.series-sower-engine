import { describe, it, expect, beforeEach } from 'vitest'
import { ActorModel } from './actor.model'
import * as Buzz from './buz/actor.buzz'

describe('01.actor.unit (Epistemic Vector & Detail Quarantine)', () => {
    let model: ActorModel
    let mockState: any

    beforeEach(() => {
        model = new ActorModel()
        mockState = {
            hunt: async () => ({}),
        }
    })

    it('rejects floating-point probability with [FLOAT_PROHIBITED]', async () => {
        let result: any = null
        await Buzz.recordBeliefActor(
            model,
            {
                idx: 'test',
                dat: {
                    observer_id: 'char_bog',
                    fact_id: 'fact_culvert_leak',
                    subjective_probability_bps: 95.5,
                    source_type: 'DIRECT_OBSERVATION',
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.actBit.idx).toBe('record-belief-actor-error')
        expect(result.actBit.src).toContain('[FLOAT_PROHIBITED]')
    })

    it('records belief and queries belief horizon', async () => {
        let result: any = null
        await Buzz.recordBeliefActor(
            model,
            {
                idx: 'test',
                dat: {
                    observer_id: 'char_bog',
                    fact_id: 'fact_culvert_leak',
                    subjective_probability_bps: 9500,
                    source_type: 'DIRECT_OBSERVATION',
                    is_false_belief: false,
                    timestamp_ms: 1000,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.actBit.idx).toBe('record-belief-actor')
        expect(
            model.beliefs['char_bog->fact_culvert_leak']
                .subjective_probability_bps,
        ).toBe(9500)

        let queryRes: any = null
        Buzz.queryHorizonActor(
            model,
            {
                idx: 'test',
                src: 'char_bog',
                slv: (r) => {
                    queryRes = r
                },
            },
            mockState,
        )

        expect(queryRes.actBit.val).toBe(1)
        expect(queryRes.actBit.lst[0].fact_id).toBe('fact_culvert_leak')
    })

    it('enforces Ignorance by Omission during epistemic context scrubbing', async () => {
        // Bog knows only fact_culvert_leak
        model.beliefs['char_bog->fact_culvert_leak'] = {
            belief_id: 'char_bog->fact_culvert_leak',
            observer_id: 'char_bog',
            fact_id: 'fact_culvert_leak',
            subjective_probability_bps: 10000,
            source_type: 'DIRECT_OBSERVATION',
            is_false_belief: 0,
            learned_at_ms: 100,
            updated_at_ms: 100,
        }

        const worldFacts = {
            fact_culvert_leak:
                'The conduit under the floor is leaking warm glycol.',
            secret_conspiracy:
                'Silas is planning to seal the south intake grate at dusk.',
        }

        let scrubRes: any = null
        Buzz.scrubEpistemicContextActor(
            model,
            {
                idx: 'test',
                dat: {
                    observer_id: 'char_bog',
                    world_facts: worldFacts,
                },
                slv: (r) => {
                    scrubRes = r
                },
            },
            mockState,
        )

        expect(scrubRes.actBit.val).toBe(1) // 1 fact omitted
        expect(scrubRes.actBit.dat['fact_culvert_leak']).toBeDefined()
        expect(scrubRes.actBit.dat['secret_conspiracy']).toBeUndefined() // Scrubbed out completely!
    })

    it('quarantines unscripted narrative details into STAGED status', async () => {
        let result: any = null
        await Buzz.stageDetailActor(
            model,
            {
                idx: 'test',
                dat: {
                    detail_id: 'det_brass_compass',
                    scene_id: 'sc_01',
                    entity_id: 'char_wart',
                    salience_bps: 8000,
                    claim_proposal:
                        'Wart carries a tarnished naval compass with cracked glass.',
                    timestamp_ms: 2000,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.actBit.idx).toBe('stage-detail-actor')
        expect(model.details['det_brass_compass'].status).toBe('STAGED')
        expect(model.details['det_brass_compass'].salience_bps).toBe(8000)
    })

    it('transitions staged detail to RATIFIED and DISCARDED lifecycles', async () => {
        model.details['det_1'] = {
            detail_id: 'det_1',
            scene_id: 'sc_01',
            salience_bps: 7500,
            claim_proposal: 'A rusted iron hinge lies near the pipe.',
            status: 'STAGED',
            created_at_ms: 100,
        }

        let ratifyRes: any = null
        await Buzz.ratifyDetailActor(
            model,
            {
                idx: 'test',
                src: 'det_1',
                dat: { timestamp_ms: 500 },
                slv: (r) => {
                    ratifyRes = r
                },
            },
            mockState,
        )

        expect(ratifyRes.actBit.idx).toBe('ratify-detail-actor')
        expect(model.details['det_1'].status).toBe('RATIFIED')
        expect(model.details['det_1'].reviewed_at_ms).toBe(500)

        let discardRes: any = null
        await Buzz.discardDetailActor(
            model,
            {
                idx: 'test',
                src: 'det_1',
                dat: { timestamp_ms: 600 },
                slv: (r) => {
                    discardRes = r
                },
            },
            mockState,
        )

        expect(discardRes.actBit.idx).toBe('discard-detail-actor')
        expect(model.details['det_1'].status).toBe('DISCARDED')
        expect(model.details['det_1'].reviewed_at_ms).toBe(600)
    })
})

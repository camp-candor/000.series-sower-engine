import { describe, it, expect, beforeEach } from 'vitest'
import { GrievanceModel } from './grievance.model'
import * as Buzz from './buz/grievance.buzz'

describe('06.grievance.unit (Relational Conflict & Escalation)', () => {
    let model: GrievanceModel
    let mockState: any

    beforeEach(() => {
        model = new GrievanceModel()
        mockState = {
            hunt: async () => ({}),
        }
    })

    it('rejects self-targeted grievance with [SELF_GRIEVANCE_BREACH]', async () => {
        let result: any = null
        await Buzz.upsertGrievance(
            model,
            {
                idx: 'test',
                dat: {
                    grievance_id: 'grv_self_blame',
                    instigator_id: 'char_bog',
                    victim_id: 'char_bog',
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.grvBit.idx).toBe('upsert-grievance-error')
        expect(result.grvBit.src).toContain('[SELF_GRIEVANCE_BREACH]')
    })

    it('upserts valid grievance and enforces basis-point intensity', async () => {
        let result: any = null
        await Buzz.upsertGrievance(
            model,
            {
                idx: 'test',
                dat: {
                    grievance_id: 'grv_siphon_theft',
                    instigator_id: 'char_bog',
                    victim_id: 'char_spleen',
                    intensity_bps: 3500,
                    cooldown_cycles: 2,
                    status: 'ACTIVE',
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.grvBit.idx).toBe('upsert-grievance')
        expect(model.records['grv_siphon_theft'].intensity_bps).toBe(3500)
        expect(model.records['grv_siphon_theft'].status).toBe('ACTIVE')
    })

    it('escalates depth and intensity towards boiling point', async () => {
        model.records['grv_siphon_theft'] = {
            grievance_id: 'grv_siphon_theft',
            instigator_id: 'char_bog',
            victim_id: 'char_spleen',
            escalation_depth: 1,
            cooldown_cycles: 0,
            intensity_bps: 7000,
            status: 'ACTIVE',
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.escalateGrievance(
            model,
            {
                idx: 'test',
                dat: {
                    grievance_id: 'grv_siphon_theft',
                    intensity_delta_bps: 1500,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.grvBit.idx).toBe('escalate-grievance')
        expect(model.records['grv_siphon_theft'].escalation_depth).toBe(2)
        expect(model.records['grv_siphon_theft'].intensity_bps).toBe(8500)
        expect(model.records['grv_siphon_theft'].status).toBe('SIMMERING')
    })

    it('filters out grievances on cooldown from lottery eligibility', () => {
        model.records['grv_a'] = {
            grievance_id: 'grv_a',
            instigator_id: 'char_bog',
            victim_id: 'char_spleen',
            escalation_depth: 0,
            cooldown_cycles: 1, // On cooldown
            intensity_bps: 4000,
            status: 'ACTIVE',
            updated_at_ms: 100,
        }

        model.records['grv_b'] = {
            grievance_id: 'grv_b',
            instigator_id: 'char_bog',
            victim_id: 'char_spleen',
            escalation_depth: 0,
            cooldown_cycles: 0, // Ready!
            intensity_bps: 5000,
            status: 'ACTIVE',
            updated_at_ms: 100,
        }

        let result: any = null
        Buzz.queryEligibleGrievances(
            model,
            {
                idx: 'test',
                dat: { actorA: 'char_bog', actorB: 'char_spleen' },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.grvBit.val).toBe(1)
        expect(result.grvBit.lst[0].grievance_id).toBe('grv_b')
    })

    it('ticks down cooldown cycles across all grievances', async () => {
        model.records['grv_a'] = {
            grievance_id: 'grv_a',
            instigator_id: 'char_bog',
            victim_id: 'char_spleen',
            escalation_depth: 0,
            cooldown_cycles: 2,
            intensity_bps: 4000,
            status: 'ACTIVE',
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.tickCooldownGrievance(
            model,
            {
                idx: 'test',
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.grvBit.val).toBe(1)
        expect(model.records['grv_a'].cooldown_cycles).toBe(1)
    })
})

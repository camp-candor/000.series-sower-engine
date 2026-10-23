import { describe, it, expect } from 'vitest'
import {
    reduceLedgerState,
    foldLedgerEvents,
    clampBps,
} from './buz/ledger.buzz'
import { StagingAccumulator } from './ledger.model'
import type { LedgerWorkingState } from '../16.state.unit/fce/state.interface'
import type { EventEnvelope } from './fce/ledger.interface'
import {
    computeWorkingStateHash,
    recursiveDeepFreeze,
} from '../16.state.unit/buz/state.buzz'

const buildInitialState = (): LedgerWorkingState => {
    const entities = {
        char_bog: {
            entity_id: 'char_bog',
            location_id: 'loc_hub',
            q: 0,
            r: 0,
            arms_available: 2,
            legs_available: 2,
            locomotion_tier: 'UNRESTRICTED' as const,
            concussion_level: 0,
            fatigue_bps: 1000,
            pain_bps: 500,
            refusal_strain_bps: 0,
            open_wounds: [],
            banned_kinetic_verbs: [],
            held_items: [],
            worn_gear: {},
            slung_items: [],
            cached_items: [],
            updated_at_ms: 0,
        },
        char_wart: {
            entity_id: 'char_wart',
            location_id: 'loc_hub',
            q: 0,
            r: 1,
            arms_available: 1,
            legs_available: 2,
            locomotion_tier: 'UNRESTRICTED' as const,
            concussion_level: 0,
            fatigue_bps: 0,
            pain_bps: 0,
            refusal_strain_bps: 0,
            open_wounds: [],
            banned_kinetic_verbs: [],
            held_items: [],
            worn_gear: {},
            slung_items: [],
            cached_items: [],
            updated_at_ms: 0,
        },
    }

    const hash = computeWorkingStateHash({
        entities,
        strings: {},
        grievances: {},
        clocks: {},
        beliefs: {},
        unratifiedDetails: {},
    })

    return recursiveDeepFreeze({
        reducerVersion: '1.0.0',
        seriesSlug: 'test-series',
        tick: 0,
        lastSequenceNumber: 0,
        lastEventHash: '0'.repeat(64),
        entities,
        strings: {},
        grievances: {},
        clocks: {},
        beliefs: {},
        unratifiedDetails: {},
        stateHash: hash,
    })
}

describe('08.ledger.unit - Pure Reducer & Staging Accumulator Suite', () => {
    it('should clamp basis points strictly to [0, 10000]', () => {
        expect(clampBps(-50)).toBe(0)
        expect(clampBps(5500.8)).toBe(5500)
        expect(clampBps(12000)).toBe(10000)
    })

    it('should evaluate pure reducer transitions without mutating previous state', () => {
        const s0 = buildInitialState()
        const event: EventEnvelope = {
            sequenceNumber: 1,
            eventId: 'evt_001',
            streamId: 'main',
            tick: 1,
            type: 'SOMATIC_TRAUMA_APPLIED',
            version: 1,
            actorId: 'char_bog',
            targetId: null,
            seed: 'seed_1',
            payload: {
                entity_id: 'char_bog',
                fatigue_bps_delta: 2500,
                pain_bps_delta: 1000,
                added_wounds: ['wound_gash'],
                banned_verbs: ['SPRINT'],
            },
            prevEventHash: s0.stateHash,
            stateHash: '1'.repeat(64),
            timestamp_ms: 1000,
        }

        const s1 = reduceLedgerState(s0, event, 'seed_1')

        // s0 is strictly preserved
        expect(s0.entities.char_bog.fatigue_bps).toBe(1000)
        expect(s0.entities.char_bog.open_wounds).toEqual([])

        // s1 reflects pure transition
        expect(s1.entities.char_bog.fatigue_bps).toBe(3500)
        expect(s1.entities.char_bog.pain_bps).toBe(1500)
        expect(s1.entities.char_bog.open_wounds).toEqual(['wound_gash'])
        expect(s1.entities.char_bog.banned_kinetic_verbs).toEqual(['SPRINT'])
        expect(s1.lastSequenceNumber).toBe(1)
        expect(s1.stateHash).not.toBe(s0.stateHash)
    })

    it('should throw an immediate OCC sequence conflict on out-of-order sequence tokens', () => {
        const s0 = buildInitialState()
        const staleEvent: EventEnvelope = {
            sequenceNumber: 5, // Expected is 1
            eventId: 'evt_stale',
            streamId: 'main',
            tick: 1,
            type: 'SOMATIC_TRAUMA_APPLIED',
            version: 1,
            actorId: 'char_bog',
            targetId: null,
            seed: 'seed_1',
            payload: { entity_id: 'char_bog', fatigue_bps_delta: 100 },
            prevEventHash: s0.stateHash,
            stateHash: '2'.repeat(64),
            timestamp_ms: 1000,
        }

        expect(() => reduceLedgerState(s0, staleEvent, 'seed_1')).toThrow(
            /\[OCC_SEQUENCE_CONFLICT\]/,
        )
    })

    it('should throw immediately when anti-reflexive leverage strings are asserted', () => {
        const s0 = buildInitialState()
        const selfStringEvent: EventEnvelope = {
            sequenceNumber: 1,
            eventId: 'evt_string_self',
            streamId: 'main',
            tick: 1,
            type: 'SOCIAL_STRING_EXCHANGED',
            version: 1,
            actorId: 'char_bog',
            targetId: 'char_bog',
            seed: 'seed_1',
            payload: {
                holder_id: 'char_bog',
                debtor_id: 'char_bog',
                strings_count_delta: 1,
            },
            prevEventHash: s0.stateHash,
            stateHash: '3'.repeat(64),
            timestamp_ms: 1000,
        }

        expect(() => reduceLedgerState(s0, selfStringEvent, 'seed_1')).toThrow(
            /\[ANTI_REFLEXIVITY_BREACH\]/,
        )
    })

    it('should support multi-event staging, zero-cost rollback on breach, and atomic commit', () => {
        const s0 = buildInitialState()
        const accumulator = new StagingAccumulator(s0)

        // Stage Event 1: Bog picks up scrap iron
        accumulator.stageEvent(
            'INVENTORY_TRANSFERRED',
            {
                entity_id: 'char_bog',
                held_items: ['item_scrap_iron'],
            },
            {
                eventId: 'evt_stage_1',
                streamId: 'main',
                tick: 1,
                actorId: 'char_bog',
                targetId: null,
                seed: 'seed_1',
                timestamp_ms: 1000,
            },
        )

        expect(accumulator.stagedCount).toBe(1)
        expect(accumulator.workingState.entities.char_bog.held_items).toEqual([
            'item_scrap_iron',
        ])
        expect(accumulator.validateInvariants().valid).toBe(true)

        // Stage Event 2: Attempting hand capacity breach on Wart (arms_available: 1 holding 2 items)
        expect(() => {
            accumulator.stageEvent(
                'INVENTORY_TRANSFERRED',
                {
                    entity_id: 'char_wart',
                    held_items: ['item_knife', 'item_torch'],
                },
                {
                    eventId: 'evt_stage_2_breach',
                    streamId: 'main',
                    tick: 1,
                    actorId: 'char_wart',
                    targetId: null,
                    seed: 'seed_1',
                    timestamp_ms: 1000,
                },
            )
        }).toThrow(/\[HAND_CAPACITY_BREACH\]/)

        // Rollback completely clears scratchpad to baseline with 0 database rows touched
        accumulator.rollback()
        expect(accumulator.stagedCount).toBe(0)
        expect(accumulator.workingState.entities.char_bog.held_items).toEqual(
            [],
        )

        // Restage Event 1 legally and commit
        accumulator.stageEvent(
            'INVENTORY_TRANSFERRED',
            {
                entity_id: 'char_bog',
                held_items: ['item_scrap_iron'],
            },
            {
                eventId: 'evt_stage_legal',
                streamId: 'main',
                tick: 1,
                actorId: 'char_bog',
                targetId: null,
                seed: 'seed_2',
                timestamp_ms: 1000,
            },
        )

        const { committedEvents, newState } = accumulator.commit()
        expect(committedEvents.length).toBe(1)
        expect(newState.entities.char_bog.held_items).toEqual([
            'item_scrap_iron',
        ])
        expect(newState.lastSequenceNumber).toBe(1)

        const stmts = accumulator.compileBatchStatements(committedEvents)
        expect(stmts.length).toBeGreaterThan(0)
        expect(stmts[0].sql).toContain('INSERT INTO event_log')
    })

    it('should fold historical events deterministically to bit-exact state parity', () => {
        const s0 = buildInitialState()
        const events: EventEnvelope[] = [
            {
                sequenceNumber: 1,
                eventId: 'evt_fold_1',
                streamId: 'main',
                tick: 1,
                type: 'SOMATIC_TRAUMA_APPLIED',
                version: 1,
                actorId: 'char_bog',
                targetId: null,
                seed: 's1',
                payload: { entity_id: 'char_bog', fatigue_bps_delta: 500 },
                prevEventHash: s0.stateHash,
                stateHash: 'hash_1',
                timestamp_ms: 1000,
            },
            {
                sequenceNumber: 2,
                eventId: 'evt_fold_2',
                streamId: 'main',
                tick: 1,
                type: 'SOMATIC_TRAUMA_APPLIED',
                version: 1,
                actorId: 'char_bog',
                targetId: null,
                seed: 's2',
                payload: { entity_id: 'char_bog', fatigue_bps_delta: 700 },
                prevEventHash: 'hash_1',
                stateHash: 'hash_2',
                timestamp_ms: 2000,
            },
        ]

        const folded = foldLedgerEvents(s0, events, 'seed_master')
        expect(folded.lastSequenceNumber).toBe(2)
        expect(folded.entities.char_bog.fatigue_bps).toBe(2200)

        // Repeated folding yields bit-exact stateHash
        const foldedAgain = foldLedgerEvents(s0, events, 'seed_master')
        expect(folded.stateHash).toBe(foldedAgain.stateHash)
    })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StateModel } from './state.model.js'
import {
    initState,
    deepFreeze,
    computeWorkingStateHash,
    reduceLedgerState,
    foldLedgerEvents,
    whyDirtyEntity,
} from './buz/state.buzz.js'
import { FOLD_EVENTS_STATE } from './state.action.js'
import { reducer } from './state.reduce.js'
import type { LedgerWorkingState } from './fce/state.interface.js'

describe('16.state.unit - Deterministic State Fold Execution Battery', () => {
    let model: StateModel

    const createInitialState = (): LedgerWorkingState => {
        const unhashed = {
            reducerVersion: 'v1.0.0',
            seriesSlug: 'series_sower_test',
            tick: 1,
            lastSequenceNumber: 0,
            lastEventHash: 'genesis_seed',
            entities: Object.freeze({
                char_bog: Object.freeze({
                    entity_id: 'char_bog',
                    location_id: 'loc_the_warm_pipe',
                    q: 0,
                    r: 0,
                    arms_available: 2,
                    legs_available: 2,
                    locomotion_tier: 'UNRESTRICTED' as const,
                    concussion_level: 0,
                    fatigue_bps: 1000,
                    pain_bps: 0,
                    refusal_strain_bps: 0,
                    open_wounds: Object.freeze([]),
                    banned_kinetic_verbs: Object.freeze([]),
                    held_items: Object.freeze(['item_founder_token']),
                    worn_gear: Object.freeze({}),
                    slung_items: Object.freeze([]),
                    cached_items: Object.freeze([]),
                    updated_at_ms: 1000,
                }),
            }),
            strings: Object.freeze({}),
            grievances: Object.freeze({}),
            clocks: Object.freeze({}),
            beliefs: Object.freeze({}),
            unratifiedDetails: Object.freeze({}),
        }
        const stateHash = computeWorkingStateHash(unhashed)
        return deepFreeze({ ...unhashed, stateHash })
    }

    beforeEach(async () => {
        model = new StateModel()
        await initState(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('enforces deep-freeze immutability across state trees', () => {
        const state = createInitialState()
        expect(Object.isFrozen(state)).toBe(true)
        expect(Object.isFrozen(state.entities)).toBe(true)
        expect(Object.isFrozen(state.entities.char_bog)).toBe(true)

        // Attempt mutation should throw or fail in strict mode
        expect(() => {
            ;(state as any).tick = 99
        }).toThrow()
    })

    it('computes deterministic bit-identical state hashes via RFC 8785 canonical JSON', () => {
        const stateA = createInitialState()
        const stateB = createInitialState()

        expect(stateA.stateHash).toBe(stateB.stateHash)
        expect(stateA.stateHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('executes pure state reduction (S_{n+1} = R(S_n, E_n, sigma_n)) without in-place mutation', () => {
        const initial = createInitialState()
        const event = {
            eventId: 'evt_trauma_01',
            eventType: 'SOMATIC_TRAUMA_APPLIED',
            actorId: 'char_bog',
            tick: 2,
            timestampMs: 2000,
            payload: {
                fatigueBpsDelta: 1500,
                conditionsAdded: ['wnd_fractured_rib'],
            },
        }

        const next = reduceLedgerState(initial, event)

        // Verify initial state untouched
        expect(initial.entities.char_bog.fatigue_bps).toBe(1000)
        expect(initial.entities.char_bog.open_wounds).toHaveLength(0)

        // Verify next state reduced correctly
        expect(next.entities.char_bog.fatigue_bps).toBe(2500)
        expect(next.entities.char_bog.open_wounds).toContain(
            'wnd_fractured_rib',
        )
        expect(next.tick).toBe(2)
        expect(next.lastSequenceNumber).toBe(1)
        expect(next.stateHash).not.toBe(initial.stateHash)
    })

    it('reconstructs bit-identical states when replaying historical event sequences', () => {
        const initial = createInitialState()
        const events = [
            {
                eventId: 'e1',
                eventType: 'SPATIAL_MOVE',
                actorId: 'char_bog',
                tick: 2,
                timestampMs: 2000,
                payload: {
                    toCoord: { q: 1, r: 0 },
                    locationId: 'loc_culvert_junction',
                },
            },
            {
                eventId: 'e2',
                eventType: 'SOMATIC_TRAUMA',
                actorId: 'char_bog',
                tick: 3,
                timestampMs: 3000,
                payload: { fatigueBpsDelta: 500 },
            },
        ]

        const run1 = foldLedgerEvents(initial, events)
        const run2 = foldLedgerEvents(initial, events)

        expect(run1.stateHash).toBe(run2.stateHash)
        expect(run1.entities.char_bog.q).toBe(1)
        expect(run1.entities.char_bog.location_id).toBe('loc_culvert_junction')
    })

    it('executes bounded recursive why-dirty blast-radius queries', () => {
        const dependencyMap = {
            scene_01: [{ entityId: 'char_bog', edgeType: 'LOGISTICAL_EQUIP' }],
            scene_02: [{ entityId: 'char_bog', edgeType: 'SOMATIC_ACTION' }],
            scene_03: [{ entityId: 'char_wart', edgeType: 'DIALOGUE' }],
        }

        const result = whyDirtyEntity('char_bog', dependencyMap, 5)

        expect(result.isDirty).toBe(true)
        expect(result.affectedScenes).toContain('scene_01')
        expect(result.affectedScenes).toContain('scene_02')
        expect(result.affectedScenes).not.toContain('scene_03')
        expect(result.traversalDepth).toBe(1)
    })

    it('routes FOLD_EVENTS_STATE cleanly through pure reducer using clone-deep', async () => {
        const initial = createInitialState()
        const slv = vi.fn()

        const result = (await reducer(
            model,
            {
                type: FOLD_EVENTS_STATE,
                bale: {
                    idx: 'fold-test',
                    dat: {
                        foldParams: {
                            baseState: initial,
                            events: [
                                {
                                    eventId: 'e1',
                                    eventType: 'SPATIAL_MOVE',
                                    actorId: 'char_bog',
                                    tick: 2,
                                    payload: { toCoord: { q: 2, r: 0 } },
                                },
                            ],
                        },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as StateModel

        expect(result).toBeInstanceOf(StateModel)
        expect(slv).toHaveBeenCalled()
    })
})

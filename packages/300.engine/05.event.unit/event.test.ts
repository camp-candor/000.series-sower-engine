import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { EventModel } from './event.model.js'
import { upcastEvent, appendEvent, streamEvents } from './buz/event.buzz.js'
import { APPEND_EVENT } from './event.action.js'
import { reducer } from './event.reduce.js'
import type { EventEnvelope } from '../04.envelope.unit/fce/envelope.interface.js'
import type { SomaticTraumaPayloadV3 } from './fce/event.interface.js'

describe('05.event.unit - Append-Only Event Stream & Upcaster Battery', () => {
    let model: EventModel

    beforeEach(() => {
        model = new EventModel()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes EventModel with default zero state and pre-registered upcasters', () => {
        expect(model.idx).toBe('05.event')
        expect(model.totalAppended).toBe(0)
        expect(model.lastSequenceId).toBe(0)
        expect(model.registry.has('SOMATIC_TRAUMA_APPLIED', 1)).toBe(true)
        expect(model.registry.has('SOMATIC_TRAUMA_APPLIED', 2)).toBe(true)
    })

    it('upcasts legacy v1 SomaticTraumaPayload through v2 to v3 with kinetic masks', () => {
        const legacyV1Envelope: EventEnvelope<any> = {
            eventId: 'evt_legacy_01',
            streamId: 'main',
            sequenceId: 1,
            tick: 10,
            eventType: 'SOMATIC_TRAUMA_APPLIED',
            schemaVersion: 1,
            actorId: 'char_bog',
            seed: 'seed_1',
            payload: { damageTier: 'SEVERE' }, // v1 payload
            prevEventHash: '0'.repeat(64),
            stateHash: 'a'.repeat(64),
            eventHash: 'b'.repeat(64),
            timestampMs: 1000,
        }

        const slv = vi.fn()
        upcastEvent(
            model,
            { idx: 'test-upcast', dat: { envelope: legacyV1Envelope }, slv },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const result = slv.mock.calls[0][0]
            .envelope as EventEnvelope<SomaticTraumaPayloadV3>

        expect(result.schemaVersion).toBe(3)
        expect(result.payload.painBps).toBe(8000)
        expect(result.payload.fatigueBps).toBe(2000)
        expect(result.payload.bannedKineticVerbs).toContain('BIMANUAL_LIFT')
        expect(result.payload.bannedKineticVerbs).toContain('SPRINT')
        expect(result.payload.armsAvailable).toBe(1)
        expect(result.payload.legsAvailable).toBe(1)
    })

    it('halts with [MISSING_UPCASTER] when intermediate migration step is absent', () => {
        const unmigratedEnvelope: EventEnvelope<any> = {
            eventId: 'evt_mystery',
            streamId: 'main',
            sequenceId: 2,
            tick: 11,
            eventType: 'SOMATIC_TRAUMA_APPLIED',
            schemaVersion: 0, // No v0 -> v1 registered
            seed: '0',
            payload: {},
            prevEventHash: '0'.repeat(64),
            stateHash: '0'.repeat(64),
            eventHash: '0'.repeat(64),
            timestampMs: 1000,
        }

        const slv = vi.fn()
        upcastEvent(
            model,
            { idx: 'test-missing', dat: { envelope: unmigratedEnvelope }, slv },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                eventBit: expect.objectContaining({
                    val: 0,
                    dat: expect.objectContaining({
                        error: expect.stringContaining('MISSING_UPCASTER'),
                    }),
                }),
            }),
        )
    })

    it('appends events idempotently: duplicate eventId resolves without re-insertion', async () => {
        const mockState: any = {
            hunt: vi.fn(async (actionType: string) => {
                if (actionType === '[Database action] Query Database') {
                    // Simulate existing event found
                    return {
                        databaseBit: {
                            val: 1,
                            dat: { record: { event_id: 'evt_existing_01' } },
                        },
                    }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await appendEvent(
            model,
            {
                idx: 'append-duplicate',
                dat: {
                    appendParams: {
                        eventId: 'evt_existing_01',
                        eventType: 'SIMULATION_TICK_COMMITTED',
                        payload: { tick: 0 },
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                eventBit: expect.objectContaining({
                    idx: 'append-event-idempotent',
                    dat: expect.objectContaining({ isDuplicate: true }),
                }),
            }),
        )
        // Ensure no subsequent database insert was dispatched
        expect(mockState.hunt).not.toHaveBeenCalledWith(
            '[Database action] Exec Batch Database',
            expect.anything(),
        )
    })

    it('coordinates append through envelope sealing, sequence advancement, and database commit', async () => {
        const dispatchedActions: string[] = []
        const mockState: any = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                dispatchedActions.push(actionType)
                if (actionType === '[Database action] Query Database') {
                    return { databaseBit: { val: 0 } } // Not duplicate
                }
                if (actionType === '[Sequence action] Next Sequence') {
                    return { nextSeq: 105 }
                }
                if (actionType === '[Envelope action] Seal Event Envelope') {
                    return {
                        envelope: {
                            eventId: payload.dat.eventId,
                            streamId: 'main',
                            sequenceId: 105,
                            tick: 42,
                            eventType: payload.dat.eventType,
                            schemaVersion: 1,
                            seed: 'seed_42',
                            payload: payload.dat.payload,
                            prevEventHash: 'a'.repeat(64),
                            stateHash: 'b'.repeat(64),
                            eventHash: 'c'.repeat(64),
                            timestampMs: 1700000000000,
                        },
                    }
                }
                if (actionType === '[Database action] Exec Batch Database') {
                    return { databaseBit: { val: 1 } }
                }
                if (actionType === '[Sequence action] Commit Sequence') {
                    return { committedSeq: 105 }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await appendEvent(
            model,
            {
                idx: 'test-append',
                dat: {
                    appendParams: {
                        eventId: 'evt_new_105',
                        eventType: 'LEVERAGE_STRING_MUTATED',
                        payload: {
                            holderId: 'char_bog',
                            debtorId: 'char_wart',
                            weightBps: 2000,
                            deltaStrings: 1,
                        },
                        tick: 42,
                    },
                },
                slv,
            },
            mockState,
        )

        expect(dispatchedActions).toContain('[Database action] Query Database')
        expect(dispatchedActions).toContain('[Sequence action] Next Sequence')
        expect(dispatchedActions).toContain(
            '[Envelope action] Seal Event Envelope',
        )
        expect(dispatchedActions).toContain(
            '[Database action] Exec Batch Database',
        )
        expect(dispatchedActions).toContain('[Sequence action] Commit Sequence')

        expect(model.lastSequenceId).toBe(105)
        expect(model.lastEventHash).toBe('c'.repeat(64))
        expect(model.totalAppended).toBe(1)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                eventBit: expect.objectContaining({
                    val: 105,
                    idx: 'append-event-pass',
                }),
            }),
        )
    })

    it('streams events ordered by sequenceId and applies on-the-fly schema upcasting', async () => {
        const storedRecords = [
            {
                sequence_id: 2,
                event_id: 'evt_02',
                stream_id: 'main',
                tick: 2,
                type: 'SOMATIC_TRAUMA_APPLIED',
                version: 1, // Legacy v1
                seed: 'seed',
                payload_json: JSON.stringify({ damageTier: 'MINOR' }),
                prev_hash: '1'.repeat(64),
                state_hash: '2'.repeat(64),
                timestamp_ms: 2000,
            },
            {
                sequence_id: 1,
                event_id: 'evt_01',
                stream_id: 'main',
                tick: 1,
                type: 'SIMULATION_TICK_COMMITTED',
                version: 1,
                seed: 'seed',
                payload_json: JSON.stringify({ tick: 1 }),
                prev_hash: '0'.repeat(64),
                state_hash: '1'.repeat(64),
                timestamp_ms: 1000,
            },
        ]

        const mockState: any = {
            hunt: vi.fn(async (actionType: string) => {
                if (actionType === '[Database action] Query Database') {
                    return { databaseBit: { dat: { records: storedRecords } } }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await streamEvents(model, { idx: 'stream-test', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        const envelopes = slv.mock.calls[0][0].envelopes as EventEnvelope[]

        expect(envelopes.length).toBe(2)
        // Assert ordered by sequenceId ASC
        expect(envelopes[0].sequenceId).toBe(1)
        expect(envelopes[1].sequenceId).toBe(2)

        // Assert on-the-fly upcasting applied to event #2 (v1 -> v3)
        expect(envelopes[1].schemaVersion).toBe(3)
        expect((envelopes[1].payload as any).painBps).toBe(1000)
    })

    it('routes actions cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: APPEND_EVENT,
                bale: {
                    idx: 'append-test',
                    dat: {
                        appendParams: {
                            eventId: 'evt_reducer_01',
                            eventType: 'SIMULATION_TICK_COMMITTED',
                            payload: { tick: 0 },
                        },
                    },
                    slv,
                } as any,
            },
            {
                hunt: async (actionType: string) => {
                    if (actionType === '[Database action] Query Database')
                        return { databaseBit: { val: 0 } }
                    if (actionType === '[Sequence action] Next Sequence')
                        return { nextSeq: 1 }
                    if (actionType === '[Envelope action] Seal Event Envelope')
                        return {
                            envelope: {
                                eventHash:
                                    '0000000000000000000000000000000000000000000000000000000000000000',
                            },
                        }
                    if (actionType === '[Database action] Exec Batch Database')
                        return { databaseBit: { val: 1 } }
                    if (actionType === '[Sequence action] Commit Sequence')
                        return { committedSeq: 1 }
                    return {}
                },
            } as any,
        )) as EventModel

        expect(result).toBeInstanceOf(EventModel)
    })
})

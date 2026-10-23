import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { EventModel } from './event.model'
import {
    initEvent,
    appendEventAction,
    streamEventsAction,
    upcastEventAction,
} from './event.buzzer'
import {
    createLocalDatabasePort,
    LOCAL_FOUR_VECTOR_DDL,
} from '../02.database.unit/database.buzzer'
import { GENESIS_HASH_64 } from '../04.envelope.unit/envelope.buzzer'
import { canonicalizeStateJson } from '../16.state.unit/buz/state.buzz'
import { EventUpcasterRegistry } from './buz/event.buzz'
import type { ILocalDatabasePort } from '../02.database.unit/fce/database.interface'
import type { EventEnvelope } from './fce/event.interface'

describe('05.event.unit - Append-Only event_log & Read-Time Upcaster Registry', () => {
    let model: EventModel
    let dbPort: ILocalDatabasePort
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new EventModel()
        await initEvent(model, { idx: 'test-init' }, mockState)

        dbPort = createLocalDatabasePort(':memory:')
        dbPort.exec(LOCAL_FOUR_VECTOR_DDL)
    })

    afterEach(() => {
        if (dbPort && dbPort.isOpen()) {
            dbPort.close()
        }
    })

    const validProof = {
        topologyHash: '1'.repeat(64),
        overlayHash: '2'.repeat(64),
        queryHash: '3'.repeat(64),
        receiptHash: '4'.repeat(64),
    }

    it('appends an event to event_log idempotently', async () => {
        const envelope: EventEnvelope = {
            eventId: 'evt_001',
            streamId: 'main',
            sequenceId: 1,
            tick: 0,
            eventType: 'SIMULATION_TICK_COMMITTED',
            schemaVersion: 1,
            actorId: 'char_bog',
            targetId: null,
            seed: 'seed_01',
            payload: { tick: 0 },
            spatialProof: validProof,
            prevEventHash: GENESIS_HASH_64,
            stateHash: 'a'.repeat(64),
            timestampMs: 1700000000000,
        }

        let firstResult: any
        await appendEventAction(
            model,
            {
                idx: 'test-append-1',
                dat: { envelope, dbPort },
                slv: (r) => {
                    firstResult = r.result
                },
            },
            mockState,
        )

        expect(firstResult.appended).toBe(true)
        expect(firstResult.duplicate).toBe(false)
        expect(firstResult.sequenceId).toBe(1)

        // Duplicate append test
        let duplicateResult: any
        await appendEventAction(
            model,
            {
                idx: 'test-append-dup',
                dat: { envelope, dbPort },
                slv: (r) => {
                    duplicateResult = r.result
                },
            },
            mockState,
        )

        expect(duplicateResult.appended).toBe(false)
        expect(duplicateResult.duplicate).toBe(true)
        expect(duplicateResult.sequenceId).toBe(1)

        const count = dbPort
            .prepare('SELECT count(*) as c FROM event_log')
            .get().c
        expect(count).toBe(1)
    })

    it('performs pure stepwise upcasting across multiple schema versions (v1 -> v2 -> v3)', () => {
        const legacyV1Envelope = {
            eventId: 'evt_legacy_01',
            eventType: 'SOMATIC_TRAUMA_APPLIED',
            schemaVersion: 1,
            payload: {
                entityId: 'char_bog',
                damageTier: 'SEVERE',
            },
        }

        let upcastResult: any
        upcastEventAction(
            model,
            {
                idx: 'test-upcast',
                dat: { envelope: legacyV1Envelope },
                val: 3,
                slv: (r) => {
                    upcastResult = r.envelope
                },
            },
            mockState,
        )

        expect(upcastResult.schemaVersion).toBe(3)
        expect(upcastResult.payload.entityId).toBe('char_bog')
        expect(upcastResult.payload.painBps).toBe(8500) // Mapped from SEVERE
        expect(upcastResult.payload.bannedKineticVerbs).toContain(
            'BIMANUAL_LIFT',
        )
        expect(upcastResult.payload.bannedKineticVerbs).toContain('CLIMB')
    })

    it('throws deterministic error when a required intermediate upcaster is missing', () => {
        const unregisterableEnvelope = {
            eventId: 'evt_missing_01',
            eventType: 'UNKNOWN_CUSTOM_EVENT',
            schemaVersion: 1,
            payload: { raw: true },
        }

        let errorReceived: string | undefined
        upcastEventAction(
            model,
            {
                idx: 'test-missing-upcast',
                dat: { envelope: unregisterableEnvelope },
                val: 2,
                slv: (r) => {
                    errorReceived = r.err
                },
            },
            mockState,
        )

        expect(errorReceived).toContain('[MISSING_UPCASTER]')
    })

    it('streams historical events and applies read-time upcasting automatically', async () => {
        // 1. Insert historical v1 event directly
        dbPort
            .prepare(
                `
      INSERT INTO event_log (
        event_id, stream_id, tick, event_type, schema_version, actor_id, target_id, seed,
        payload_json, topology_hash, overlay_hash, query_hash, receipt_hash,
        prev_event_hash, state_hash, timestamp_ms
      ) VALUES (
        'evt_hist_01', 'main', 1, 'SOMATIC_TRAUMA_APPLIED', 1, 'char_bog', NULL, 'seed_01',
        '{"entityId":"char_bog","damageTier":"MODERATE"}',
        '${'0'.repeat(64)}', '${'0'.repeat(64)}', '${'0'.repeat(64)}', '${'0'.repeat(64)}',
        '${GENESIS_HASH_64}', '${'a'.repeat(64)}', 1000
      )
    `,
            )
            .run()

        // 2. Stream events with upcasters enabled
        let streamedEvents: EventEnvelope[] = []
        await streamEventsAction(
            model,
            {
                idx: 'test-stream',
                src: 'main',
                val: 1,
                dat: { dbPort, applyUpcasters: true },
                slv: (r) => {
                    streamedEvents = r.events || []
                },
            },
            mockState,
        )

        expect(streamedEvents.length).toBe(1)
        expect(streamedEvents[0].schemaVersion).toBe(3) // Upcast to target v3
        expect((streamedEvents[0].payload as any).painBps).toBe(5000)
        expect((streamedEvents[0].payload as any).bannedKineticVerbs).toEqual([
            'SPRINT',
            'VAULT',
        ])

        // 3. Verify SQLite raw data remains untouched at v1
        const rawRow = dbPort
            .prepare(
                "SELECT schema_version, payload_json FROM event_log WHERE event_id = 'evt_hist_01'",
            )
            .get()
        expect(rawRow.schema_version).toBe(1)
        expect(rawRow.payload_json).toContain('MODERATE')
    })

    it('should enforce RFC 8785 UTF-16 code-point order across unordered object keys and reject non-finite numbers', () => {
        const rawA = { z: 99, a: 1, middle: { delta: 4, beta: 2 } }
        const rawB = { a: 1, middle: { beta: 2, delta: 4 }, z: 99 }

        const canonA = canonicalizeStateJson(rawA)
        const canonB = canonicalizeStateJson(rawB)

        expect(canonA).toBe(canonB)
        expect(canonA).toBe('{"a":1,"middle":{"beta":2,"delta":4},"z":99}')

        expect(() => canonicalizeStateJson(NaN)).toThrow()
        expect(() => canonicalizeStateJson(Infinity)).toThrow()
        expect(() => canonicalizeStateJson(-Infinity)).toThrow()
    })

    it('should compute deterministic 64-hex SHA-256 event hash digests', () => {
        const payload = { entity_id: 'char_bog', fatigue_bps: 1200 }
        const canon = canonicalizeStateJson(payload)
        const hash = createHash('sha256').update(canon, 'utf8').digest('hex')

        expect(hash).toMatch(/^[0-9a-f]{64}$/)
        expect(hash.length).toBe(64)
    })

    it('should register stepwise upcasters directly and migrate historical v1 events to v3', () => {
        const registry = new EventUpcasterRegistry()

        // Migration 1: v1 -> v2 (derive pain_bps from damage_tier)
        registry.register('SOMATIC_TRAUMA_APPLIED', 1, (payload: any) => {
            const painMap: Record<string, number> = {
                MINOR: 2000,
                MODERATE: 4000,
                SEVERE: 6000,
            }
            return {
                ...payload,
                pain_bps: painMap[payload.damage_tier] ?? 1000,
                damage_tier: undefined,
            }
        })

        // Migration 2: v2 -> v3 (derive banned_kinetic_verbs)
        registry.register('SOMATIC_TRAUMA_APPLIED', 2, (payload: any) => {
            return {
                ...payload,
                banned_kinetic_verbs:
                    payload.pain_bps >= 5000 ? ['SPRINT', 'CLIMB'] : [],
            }
        })

        const historicalV1Event = {
            sequenceNumber: 10,
            eventId: 'evt_hist_01',
            streamId: 'main',
            tick: 4,
            type: 'SOMATIC_TRAUMA_APPLIED',
            version: 1,
            actorId: 'char_bog',
            targetId: null,
            seed: 'seed_hist',
            payload: {
                entity_id: 'char_bog',
                damage_tier: 'SEVERE',
            },
            prevEventHash: '0'.repeat(64),
            stateHash: '1'.repeat(64),
            timestamp_ms: 5000,
        }

        const upcastResult = registry.upcast(historicalV1Event, 3)

        expect(upcastResult.version).toBe(3)
        expect((upcastResult.payload as any).damage_tier).toBeUndefined()
        expect((upcastResult.payload as any).pain_bps).toBe(6000)
        expect((upcastResult.payload as any).banned_kinetic_verbs).toEqual([
            'SPRINT',
            'CLIMB',
        ])
    })

    it('should pass already upcast modern v3 events through idempotently without mutation', () => {
        const registry = new EventUpcasterRegistry()
        const modernV3Event = {
            sequenceNumber: 11,
            eventId: 'evt_hist_02',
            streamId: 'main',
            tick: 5,
            type: 'SOMATIC_TRAUMA_APPLIED',
            version: 3,
            actorId: 'char_bog',
            targetId: null,
            seed: 'seed_hist',
            payload: {
                entity_id: 'char_bog',
                pain_bps: 6000,
                banned_kinetic_verbs: ['SPRINT'],
            },
            prevEventHash: '0'.repeat(64),
            stateHash: '1'.repeat(64),
            timestamp_ms: 6000,
        }

        const result = registry.upcast(modernV3Event, 3)
        expect(result.version).toBe(3)
        expect(result.payload).toEqual(modernV3Event.payload)
    })
})

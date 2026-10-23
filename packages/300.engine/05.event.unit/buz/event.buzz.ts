import type { EventModel } from '../event.model'
import type EventBit from '../fce/event.bit'
import type State from '../../99.core/state'
import type {
    EventEnvelope,
    EventLogDbRow,
    AppendEventResult,
    SomaticTraumaPayloadV1,
    SomaticTraumaPayloadV2,
    SomaticTraumaPayloadV3,
} from '../fce/event.interface'
import {
    canonicalizeJson,
    computeChainedEventHash,
    GENESIS_HASH_64,
} from '../../04.envelope.unit/envelope.buzzer'
export { EventUpcasterRegistry } from '../event.model'

export const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
            return
        } catch {
            // Non-blocking degradation
        }
    }
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Non-blocking degradation
        }
    }
}

/**
 * Registers default schema evolution upcasters (e.g., Somatic Trauma v1 -> v2 -> v3).
 */
export function registerDefaultUpcasters(model: EventModel): void {
    // v1 -> v2: Map damage tiers to integer basis points
    model.registry.register(
        'SOMATIC_TRAUMA_APPLIED',
        1,
        (oldPayload: SomaticTraumaPayloadV1): SomaticTraumaPayloadV2 => {
            let painBps = 1500
            if (oldPayload.damageTier === 'MODERATE') painBps = 5000
            if (oldPayload.damageTier === 'SEVERE') painBps = 8500

            return {
                entityId: oldPayload.entityId,
                painBps,
            }
        },
    )

    // v2 -> v3: Attach default banned kinetic verbs based on pain thresholds
    model.registry.register(
        'SOMATIC_TRAUMA_APPLIED',
        2,
        (v2Payload: SomaticTraumaPayloadV2): SomaticTraumaPayloadV3 => {
            const banned: string[] = []
            if (v2Payload.painBps >= 5000) banned.push('SPRINT', 'VAULT')
            if (v2Payload.painBps >= 8000) banned.push('BIMANUAL_LIFT', 'CLIMB')

            return {
                entityId: v2Payload.entityId,
                painBps: v2Payload.painBps,
                bannedKineticVerbs: banned,
            }
        },
    )
}

export const initEvent = async (
    cpy: EventModel,
    bal: EventBit,
    ste: State,
): Promise<EventModel> => {
    registerDefaultUpcasters(cpy)
    cpy.totalAppended = 0

    if (ste?.value?.event) {
        ste.value.event.targetSchemaVersions = cpy.targetSchemaVersions
        ste.value.event.registry = cpy.registry
        ste.value.event.totalAppended = cpy.totalAppended
    }

    await emitConsole(
        ste,
        '>> [EVENT:INIT] [OK] Event log authority online with registered upcasters.',
    )

    if (bal?.slv) {
        bal.slv({ evtBit: { idx: 'init-event', val: 0 } })
    }
    return cpy
}

export const updateEvent = async (
    cpy: EventModel,
    bal: EventBit,
    _ste: State,
): Promise<EventModel> => {
    if (bal?.slv) {
        bal.slv({ evtBit: { idx: 'update-event', val: cpy.totalAppended } })
    }
    return cpy
}

export const registerUpcasterEventAction = (
    cpy: EventModel,
    bal: EventBit,
    _ste: State,
): EventModel => {
    const { eventType, fromVersion, fn, targetVersion } = bal?.dat || {}

    if (!eventType || fromVersion === undefined || typeof fn !== 'function') {
        if (bal?.slv)
            bal.slv({
                err: '[UPCASTER_ERROR] Missing parameters for upcaster registration',
            })
        return cpy
    }

    cpy.registry.register(eventType, fromVersion, fn)

    if (targetVersion) {
        cpy.targetSchemaVersions[eventType] = targetVersion
    }

    if (bal?.slv) {
        bal.slv({
            evtBit: {
                idx: 'register-upcaster-event',
                src: eventType,
                val: fromVersion,
            },
        })
    }
    return cpy
}

export const upcastEventAction = (
    cpy: EventModel,
    bal: EventBit,
    _ste: State,
): EventModel => {
    const envelope = bal?.dat?.envelope
    const targetVer =
        bal?.val ||
        cpy.targetSchemaVersions[envelope?.eventType || envelope?.type] ||
        envelope?.schemaVersion ||
        1

    try {
        const upcasted = cpy.registry.upcast(envelope, targetVer)
        if (bal?.slv) {
            bal.slv({
                evtBit: { idx: 'upcast-event', val: targetVer },
                envelope: upcasted,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const appendEventAction = async (
    cpy: EventModel,
    bal: EventBit,
    ste: State,
): Promise<EventModel> => {
    const dbPort = (bal?.dat as any)?.dbPort || ste?.value?.database?.port
    const envelope: EventEnvelope = bal?.dat?.envelope

    if (!envelope || !envelope.eventId) {
        const err = '[APPEND_EVENT_ERROR] Missing valid event envelope payload'
        await emitConsole(ste, `:: ${err}`)
        if (bal?.slv) bal.slv({ err })
        return cpy
    }

    if (!dbPort) {
        const err =
            '[DATABASE_ERROR] No local SQLite port available for event persistence'
        await emitConsole(ste, `:: ${err}`)
        if (bal?.slv) bal.slv({ err })
        return cpy
    }

    try {
        // 1. Verify and seal cryptographic hash if missing
        let finalHash = envelope.eventHash
        if (!finalHash) {
            finalHash = computeChainedEventHash(
                envelope.prevEventHash || GENESIS_HASH_64,
                envelope,
            )
            envelope.eventHash = finalHash
        }

        // 2. Insert into event_log with ON CONFLICT(event_id) DO NOTHING for idempotency
        const insertSql = `
      INSERT INTO event_log (
        event_id, stream_id, tick, event_type, schema_version,
        actor_id, target_id, seed, payload_json,
        topology_hash, overlay_hash, query_hash, receipt_hash,
        prev_event_hash, state_hash, timestamp_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING;
    `

        const proof = envelope.spatialProof || {
            topologyHash: '0'.repeat(64),
            overlayHash: '0'.repeat(64),
            queryHash: '0'.repeat(64),
            receiptHash: '0'.repeat(64),
        }

        const payloadJson = canonicalizeJson(envelope.payload)

        const stmt = dbPort.prepare(insertSql)
        const runRes = stmt.run(
            envelope.eventId,
            envelope.streamId || 'main',
            envelope.tick || 0,
            envelope.eventType,
            envelope.schemaVersion || 1,
            envelope.actorId ?? null,
            envelope.targetId ?? null,
            envelope.seed || '0',
            payloadJson,
            proof.topologyHash,
            proof.overlayHash,
            proof.queryHash,
            proof.receiptHash,
            envelope.prevEventHash || GENESIS_HASH_64,
            envelope.stateHash,
            envelope.timestampMs || Date.now(),
        )

        const duplicate = runRes.changes === 0

        // Retrieve the persistent sequence_id assigned by SQLite
        const row = dbPort
            .prepare('SELECT sequence_id FROM event_log WHERE event_id = ?')
            .get(envelope.eventId)

        const assignedSeq = row ? row.sequence_id : envelope.sequenceId

        if (!duplicate) {
            cpy.totalAppended += 1
            if (ste?.value?.event) {
                ste.value.event.totalAppended = cpy.totalAppended
            }
            await emitConsole(
                ste,
                `>> [EVENT:APPEND] [OK] Seq #${assignedSeq} | ${envelope.eventType} | ${envelope.eventId} | Hash: ${finalHash.slice(0, 8)}...`,
            )
        } else {
            await emitConsole(
                ste,
                `>> [EVENT:IDEMPOTENT] Duplicate event '${envelope.eventId}' skipped at Seq #${assignedSeq}.`,
            )
        }

        const appendResult: AppendEventResult = {
            appended: !duplicate,
            duplicate,
            sequenceId: assignedSeq,
            eventId: envelope.eventId,
            eventHash: finalHash,
        }

        if (bal?.slv) {
            bal.slv({
                evtBit: {
                    idx: 'append-event',
                    val: assignedSeq,
                    src: envelope.eventId,
                },
                result: appendResult,
                envelope,
            })
        }
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await emitConsole(ste, `:: [EVENT:APPEND_FAIL] ${errorMsg}`)
        if (bal?.slv) bal.slv({ err: errorMsg })
    }

    return cpy
}

export const streamEventsAction = async (
    cpy: EventModel,
    bal: EventBit,
    _ste: State,
): Promise<EventModel> => {
    const dbPort =
        (bal?.dat as any)?.dbPort || (_ste as any)?.value?.database?.port
    const streamId = bal?.src || 'main'
    const fromSeq = typeof bal?.val === 'number' ? bal.val : 0
    const applyUpcasters = bal?.dat?.applyUpcasters !== false

    if (!dbPort) {
        if (bal?.slv)
            bal.slv({
                err: '[DATABASE_ERROR] dbPort required to stream events',
            })
        return cpy
    }

    try {
        const rows: EventLogDbRow[] = dbPort
            .prepare(
                'SELECT * FROM event_log WHERE stream_id = ? AND sequence_id >= ? ORDER BY sequence_id ASC',
            )
            .all(streamId, fromSeq)

        const events: EventEnvelope[] = rows.map((row) => {
            const parsedPayload = JSON.parse(row.payload_json)
            let envelope: EventEnvelope = {
                eventId: row.event_id,
                streamId: row.stream_id,
                sequenceId: row.sequence_id,
                tick: row.tick,
                eventType: row.event_type,
                schemaVersion: row.schema_version,
                actorId: row.actor_id,
                targetId: row.target_id,
                seed: row.seed,
                payload: parsedPayload,
                spatialProof: {
                    topologyHash: row.topology_hash,
                    overlayHash: row.overlay_hash,
                    queryHash: row.query_hash,
                    receiptHash: row.receipt_hash,
                },
                prevEventHash: row.prev_event_hash,
                stateHash: row.state_hash,
                timestampMs: row.timestamp_ms,
            }

            if (applyUpcasters) {
                const targetVersion =
                    cpy.targetSchemaVersions[envelope.eventType] ||
                    envelope.schemaVersion
                if (envelope.schemaVersion < targetVersion) {
                    envelope = cpy.registry.upcast(envelope, targetVersion)
                }
            }

            return envelope
        })

        if (bal?.slv) {
            bal.slv({
                evtBit: { idx: 'stream-events', val: events.length },
                events,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const getEventByIdAction = (
    cpy: EventModel,
    bal: EventBit,
    _ste: State,
): EventModel => {
    const dbPort =
        (bal?.dat as any)?.dbPort || (_ste as any)?.value?.database?.port
    const eventId = bal?.src

    if (!dbPort || !eventId) {
        if (bal?.slv)
            bal.slv({ err: '[QUERY_ERROR] Missing dbPort or eventId' })
        return cpy
    }

    try {
        const row = dbPort
            .prepare('SELECT * FROM event_log WHERE event_id = ?')
            .get(eventId)
        if (bal?.slv) {
            bal.slv({
                evtBit: { idx: 'get-event-by-id', src: eventId },
                row: row || null,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

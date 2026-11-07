/**
 * 05.event.unit - Event Buzz Business Logic
 * Append-only persistence, sequence synchronization, and read-time upcasting.
 */
import { EventModel } from '../event.model.js'
import type EventBit from '../fce/event.bit.js'
import type { EventEnvelope } from '../../04.envelope.unit/fce/envelope.interface.js'
import type { EventLogRecord } from '../../02.database.unit/fce/database.interface.js'
import {
    CURRENT_EVENT_VERSIONS,
    type CanonicalSimulationEventType,
} from '../fce/event.interface.js'
import * as ActEnv from '../../04.envelope.unit/envelope.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export const initEvent = async (
    cpy: EventModel,
    bal?: EventBit,
    ste?: State,
): Promise<EventModel> => {
    cpy.totalAppended = 0
    cpy.lastSequenceId = 0
    cpy.lastEventHash =
        '0000000000000000000000000000000000000000000000000000000000000000'

    await emitConsole(
        ste,
        '>> [EVENT:INIT] [OK] Append-only event ingestion engine online.',
    )

    if (bal?.slv) {
        bal.slv({
            eventBit: {
                idx: 'init-event-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateEvent = (
    cpy: EventModel,
    bal?: EventBit,
    _ste?: State,
): EventModel => {
    if (bal?.slv) {
        bal.slv({
            eventBit: {
                idx: 'update-event-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const registerUpcaster = (
    cpy: EventModel,
    bal: EventBit,
    _ste?: State,
): EventModel => {
    const params = bal.dat?.upcasterParams
    if (params && params.eventType && params.fromVersion && params.fn) {
        cpy.registry.register(params.eventType, params.fromVersion, params.fn)
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'register-upcaster-pass',
                    val: 1,
                },
            })
        }
    } else {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'register-upcaster-fail',
                    val: 0,
                    dat: {
                        error: '[INVALID_UPCASTER_PARAMS] Missing eventType, fromVersion, or fn',
                    },
                },
            })
        }
    }
    return cpy
}

export const upcastEvent = (
    cpy: EventModel,
    bal: EventBit,
    _ste?: State,
): EventModel => {
    const envelope = bal.dat?.envelope
    if (!envelope) {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'upcast-event-fail',
                    val: 0,
                    dat: {
                        error: '[MISSING_ENVELOPE] No envelope provided to upcast',
                    },
                },
            })
        }
        return cpy
    }

    try {
        const upcasted = cpy.registry.upcast(envelope)
        if (bal.slv) {
            bal.slv({
                envelope: upcasted,
                eventBit: {
                    idx: 'upcast-event-pass',
                    val: 1,
                    dat: { envelope: upcasted },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'upcast-event-fail',
                    val: 0,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }
    return cpy
}

export const appendEvent = async (
    cpy: EventModel,
    bal: EventBit,
    ste?: State,
): Promise<EventModel> => {
    const params = bal.dat?.appendParams
    if (!params || !params.eventId || !params.eventType) {
        const err = '[INVALID_APPEND_PARAMS] Missing eventId or eventType'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'append-event-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 1. Idempotency Check against local 02.database.unit
    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log', key: params.eventId },
        })
        if (
            queryRes?.databaseBit?.val === 1 &&
            queryRes?.databaseBit?.dat?.record
        ) {
            await emitConsole(
                ste,
                `>> [EVENT:IDEMPOTENT] Duplicate event '${params.eventId}' ignored without mutation.`,
            )
            if (bal.slv) {
                bal.slv({
                    eventBit: {
                        idx: 'append-event-idempotent',
                        val: 1,
                        src: params.eventId,
                        dat: { isDuplicate: true },
                    },
                })
            }
            return cpy
        }
    }

    // 2. Monotonic Sequence Allocation via 14.sequence.unit
    let assignedSeq = cpy.lastSequenceId + 1
    if (ste && typeof ste.hunt === 'function') {
        const seqRes: any = await ste.hunt(ActSeq.NEXT_SEQUENCE, {})
        if (seqRes?.nextSeq !== undefined) {
            assignedSeq = seqRes.nextSeq
        }
    }

    // 3. Cryptographic Sealing via 04.envelope.unit
    const targetVersion =
        params.schemaVersion ||
        CURRENT_EVENT_VERSIONS[
            params.eventType as CanonicalSimulationEventType
        ] ||
        1

    let sealedEnvelope: EventEnvelope
    if (ste && typeof ste.hunt === 'function') {
        const sealRes: any = await ste.hunt(ActEnv.SEAL_EVENT_ENVELOPE, {
            dat: {
                eventId: params.eventId,
                streamId: params.streamId || 'main',
                sequenceId: assignedSeq,
                tick: params.tick || 0,
                eventType: params.eventType,
                schemaVersion: targetVersion,
                actorId: params.actorId,
                targetId: params.targetId,
                seed: params.seed || '0',
                payload: params.payload,
                prevEventHash: cpy.lastEventHash,
                timestampMs: Date.now(),
            },
        })

        if (!sealRes?.envelope) {
            throw new Error(
                `[SEAL_FAILED] 04.envelope.unit failed to seal event envelope`,
            )
        }
        sealedEnvelope = sealRes.envelope
    } else {
        // Fallback for isolated unit tests
        sealedEnvelope = {
            eventId: params.eventId,
            streamId: params.streamId || 'main',
            sequenceId: assignedSeq,
            tick: params.tick || 0,
            eventType: params.eventType,
            schemaVersion: targetVersion,
            actorId: params.actorId,
            targetId: params.targetId,
            seed: params.seed || '0',
            payload: params.payload,
            prevEventHash: cpy.lastEventHash,
            stateHash: '0'.repeat(64),
            eventHash: 'f'.repeat(64),
            timestampMs: Date.now(),
        }
    }

    // 4. Persistence to 02.database.unit
    const record: EventLogRecord = {
        sequence_id: sealedEnvelope.sequenceId,
        event_id: sealedEnvelope.eventId,
        stream_id: sealedEnvelope.streamId,
        tick: sealedEnvelope.tick,
        type: sealedEnvelope.eventType,
        version: sealedEnvelope.schemaVersion,
        actor_id: sealedEnvelope.actorId,
        target_id: sealedEnvelope.targetId,
        seed: sealedEnvelope.seed,
        payload_json: JSON.stringify(sealedEnvelope.payload),
        prev_hash: sealedEnvelope.prevEventHash,
        state_hash: sealedEnvelope.eventHash,
        timestamp_ms: sealedEnvelope.timestampMs,
    }

    if (ste && typeof ste.hunt === 'function') {
        const dbRes: any = await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'event_log',
                        action: 'INSERT',
                        key: record.event_id,
                        record,
                    },
                ],
            },
        })

        if (dbRes?.databaseBit?.val === 0) {
            const err =
                dbRes?.databaseBit?.dat?.error || 'Database insert rejected'
            throw new Error(`[APPEND_DB_FAILURE] ${err}`)
        }

        // Commit sequence advancement in 14.sequence.unit
        await ste.hunt(ActSeq.COMMIT_SEQUENCE, {
            val: record.sequence_id,
            dat: { eventId: record.event_id },
        })
    }

    // 5. Update local tracking state
    cpy.lastSequenceId = sealedEnvelope.sequenceId
    cpy.lastEventHash = sealedEnvelope.eventHash
    cpy.totalAppended += 1

    await emitConsole(
        ste,
        `>> [EVENT:APPEND] [OK] Stamped #${sealedEnvelope.sequenceId} (${sealedEnvelope.eventType}) -> ${sealedEnvelope.eventHash.slice(0, 16)}...`,
    )

    if (bal.slv) {
        bal.slv({
            envelope: sealedEnvelope,
            eventBit: {
                idx: 'append-event-pass',
                val: sealedEnvelope.sequenceId,
                src: sealedEnvelope.eventHash,
                dat: {
                    envelope: sealedEnvelope,
                    totalCount: cpy.totalAppended,
                },
            },
        })
    }

    return cpy
}

export const streamEvents = async (
    cpy: EventModel,
    bal: EventBit,
    ste?: State,
): Promise<EventModel> => {
    let rawRecords: EventLogRecord[] = []

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            rawRecords = [...queryRes.databaseBit.dat.records]
        }
    }

    // Sort strictly by sequence_id ascending
    rawRecords.sort((a, b) => a.sequence_id - b.sequence_id)

    const fromSeq = bal.dat?.streamParams?.fromSequenceId || 0
    const limit = bal.dat?.streamParams?.limit || 1000

    const filtered = rawRecords
        .filter((r) => r.sequence_id >= fromSeq)
        .slice(0, limit)

    // Reconstruct and upcast in volatile memory
    const upgradedEnvelopes: EventEnvelope[] = []

    for (const record of filtered) {
        let payload: any
        try {
            payload = JSON.parse(record.payload_json)
        } catch {
            payload = record.payload_json
        }

        const rawEnvelope: EventEnvelope = {
            eventId: record.event_id,
            streamId: record.stream_id,
            sequenceId: record.sequence_id,
            tick: record.tick,
            eventType: record.type,
            schemaVersion: record.version,
            actorId: record.actor_id,
            targetId: record.target_id,
            seed: record.seed,
            payload,
            prevEventHash: record.prev_hash,
            stateHash: record.prev_hash,
            eventHash: record.state_hash,
            timestampMs: record.timestamp_ms,
        }

        // Apply read-time upcasters
        const upcasted = cpy.registry.upcast(rawEnvelope)
        upgradedEnvelopes.push(upcasted)
    }

    await emitConsole(
        ste,
        `>> [EVENT:STREAM] Streamed and upcasted ${upgradedEnvelopes.length} events from sequence #${fromSeq}`,
    )

    if (bal.slv) {
        bal.slv({
            envelopes: upgradedEnvelopes,
            eventBit: {
                idx: 'stream-events-pass',
                val: upgradedEnvelopes.length,
                dat: {
                    envelopes: upgradedEnvelopes,
                    totalCount: upgradedEnvelopes.length,
                },
                lst: upgradedEnvelopes,
            },
        })
    }

    return cpy
}

/**
 * 08.ledger.unit - Ledger Buzz Business Logic
 * Ephemeral volatile staging accumulation, atomic batch compilation, and rollback.
 */
import { LedgerModel } from '../ledger.model.js'
import type LedgerBit from '../fce/ledger.bit.js'
import type {
    StagedMutationRecord,
    StageMutationParams,
    StagingCommitResult,
    StagingAccumulatorState,
} from '../fce/ledger.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
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

export function assertBasisPoints(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} out of bounds [0, 10000]: ${val}`,
        )
    }
}

export function validateStagedInvariants(
    mutations: readonly StagedMutationRecord[],
): { valid: boolean; error?: string } {
    for (const m of mutations) {
        // 1. Somatic Trauma Invariants
        if (m.mutationType === 'SOMATIC_TRAUMA') {
            const p = m.payload
            if (p.fatigueBps != null && (p.fatigueBps < 0 || p.fatigueBps > 10000)) {
                return { valid: false, error: `[INVARIANT_BREACH] fatigueBps out of bounds: ${p.fatigueBps}` }
            }
            if (p.painBps != null && (p.painBps < 0 || p.painBps > 10000)) {
                return { valid: false, error: `[INVARIANT_BREACH] painBps out of bounds: ${p.painBps}` }
            }
            if (p.refusalStrainBps != null && (p.refusalStrainBps < 0 || p.refusalStrainBps > 10000)) {
                return { valid: false, error: `[INVARIANT_BREACH] refusalStrainBps out of bounds: ${p.refusalStrainBps}` }
            }
        }

        // 2. String Exchange Anti-Reflexivity & Solvency Invariants
        if (m.mutationType === 'STRING_EXCHANGE') {
            const p = m.payload
            if (p.holderId === p.debtorId) {
                return { valid: false, error: `[ANTI_REFLEXIVITY_BREACH] Holder cannot be identical to debtor: ${p.holderId}` }
            }
            if (p.weightBps != null && (p.weightBps < 0 || p.weightBps > 10000)) {
                return { valid: false, error: `[INVARIANT_BREACH] weightBps out of bounds: ${p.weightBps}` }
            }
            if (p.stringsCount != null && p.stringsCount < 0) {
                return { valid: false, error: `[INVARIANT_BREACH] stringsCount cannot be negative: ${p.stringsCount}` }
            }
        }

        // 3. Paranoia Clock Invariants
        if (m.mutationType === 'PARANOIA_TICK') {
            const p = m.payload
            if (p.valueBps != null && (p.valueBps < 0 || p.valueBps > 10000)) {
                return { valid: false, error: `[INVARIANT_BREACH] clock valueBps out of bounds: ${p.valueBps}` }
            }
        }
    }

    return { valid: true }
}

export const initLedger = async (
    cpy: LedgerModel,
    bal?: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    cpy.stagedMutations = []
    cpy.sequenceCursor = 0
    cpy.lastCommitResult = undefined

    await emitConsole(
        ste,
        '>> [LEDGER:INIT] [OK] Volatile staging accumulator scratchpad online.',
    )

    if (bal?.slv) {
        bal.slv({
            ledgerBit: {
                idx: 'init-ledger-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateLedger = (
    cpy: LedgerModel,
    bal?: LedgerBit,
    _ste?: State,
): LedgerModel => {
    if (bal?.slv) {
        bal.slv({
            ledgerBit: {
                idx: 'update-ledger-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const stageMutationAction = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    const params: StageMutationParams | undefined = bal.dat?.stageParams || bal.dat as any
    if (!params || !params.mutationType || !params.entityId) {
        const err = '[INVALID_STAGE_PARAMS] Missing mutationType or entityId'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                ledgerBit: {
                    idx: 'stage-mutation-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const nextSeq = cpy.sequenceCursor + 1
        const nowMs = params.timestampMs || 1700000000000
        const tick = params.tick || 1

        const record: StagedMutationRecord = {
            mutationId: `stg_${params.mutationType.toLowerCase()}_${nextSeq}`,
            sequenceNumber: nextSeq,
            tick,
            mutationType: params.mutationType,
            entityId: params.entityId,
            targetId: params.targetId,
            payload: params.payload || {},
            timestampMs: nowMs,
        }

        // Test invariant immediately in volatile memory
        const candidateMutations = [...cpy.stagedMutations, record]
        const check = validateStagedInvariants(candidateMutations)

        if (!check.valid) {
            const err = check.error || '[STAGE_INVARIANT_BREACH]'
            await emitConsole(ste, `:: [FAIL] ${err}`)
            if (bal.slv) {
                bal.slv({
                    ledgerBit: {
                        idx: 'stage-mutation-breach',
                        val: -1,
                        src: err,
                        dat: { error: err },
                    },
                })
            }
            return cpy
        }

        cpy.sequenceCursor = nextSeq
        cpy.stagedMutations.push(record)

        await emitConsole(
            ste,
            `>> [STAGE:STAGE] #${record.sequenceNumber} [${record.mutationType}] for '${record.entityId}' staged in RAM. (Total pending: ${cpy.stagedMutations.length})`,
        )

        if (bal.slv) {
            bal.slv({
                stagedMutation: record,
                ledgerBit: {
                    idx: 'stage-mutation-pass',
                    val: cpy.stagedMutations.length,
                    dat: { stagedMutation: record, rowCount: cpy.stagedMutations.length },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Staging rejected: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                ledgerBit: {
                    idx: 'stage-mutation-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const rollbackStagingAction = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    const droppedCount = cpy.stagedMutations.length
    cpy.stagedMutations = []

    await emitConsole(
        ste,
        `>> [STAGE:ROLLBACK] Staging scratchpad cleared to base state (${droppedCount} mutations discarded) [OK]`,
    )

    if (bal.slv) {
        bal.slv({
            ledgerBit: {
                idx: 'rollback-staging-pass',
                val: droppedCount,
                src: '[OK]',
                dat: { rowCount: 0 },
            },
        })
    }
    return cpy
}

export const validateStagingLedgerAction = (
    cpy: LedgerModel,
    bal: LedgerBit,
    _ste?: State,
): LedgerModel => {
    const check = validateStagedInvariants(cpy.stagedMutations)

    if (bal.slv) {
        bal.slv({
            ledgerBit: {
                idx: check.valid ? 'validate-staging-pass' : 'validate-staging-fail',
                val: check.valid ? 1 : 0,
                dat: { error: check.error },
            },
        })
    }
    return cpy
}

export const commitStagingAction = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    const nowMs = bal.dat?.timestampMs || 1700000000000
    const count = cpy.stagedMutations.length

    // 1. Invariant Validation
    const check = validateStagedInvariants(cpy.stagedMutations)
    if (!check.valid) {
        const err = check.error || '[COMMIT_INVARIANT_BREACH]'
        await emitConsole(ste, `:: [FAIL] Commit aborted: ${err}. Triggering automatic rollback.`)
        cpy.stagedMutations = []

        const failResult: StagingCommitResult = {
            success: false,
            eventsApplied: 0,
            stateHash: 'ROLLBACK',
            committedMutations: [],
            error: err,
            timestampMs: nowMs,
        }
        cpy.lastCommitResult = failResult

        if (bal.slv) {
            bal.slv({
                commitResult: failResult,
                ledgerBit: {
                    idx: 'commit-staging-fail',
                    val: -1,
                    src: '[INVARIANT_BREACH]',
                    dat: { commitResult: failResult, error: err },
                },
            })
        }
        return cpy
    }

    if (count === 0) {
        const emptyResult: StagingCommitResult = {
            success: true,
            eventsApplied: 0,
            stateHash: 'NO_OP',
            committedMutations: [],
            timestampMs: nowMs,
        }
        if (bal.slv) {
            bal.slv({
                commitResult: emptyResult,
                ledgerBit: {
                    idx: 'commit-staging-empty',
                    val: 0,
                    dat: { commitResult: emptyResult },
                },
            })
        }
        return cpy
    }

    // 2. Compile Atomic Batch Operations
    const dbOperations: any[] = []
    const eventAppends: any[] = []

    for (const m of cpy.stagedMutations) {
        // Queue Event Log entry
        eventAppends.push({
            eventId: m.mutationId,
            eventType: m.mutationType,
            actorId: m.entityId,
            targetId: m.targetId,
            tick: m.tick,
            payload: m.payload,
        })

        // Queue table-specific projections
        if (m.mutationType === 'STRING_EXCHANGE') {
            const relId = `${m.entityId}->${m.targetId}`
            dbOperations.push({
                table: 'strings_ledger',
                action: 'INSERT',
                key: relId,
                record: {
                    relation_id: relId,
                    holder_id: m.entityId,
                    debtor_id: m.targetId,
                    strings_count: m.payload.stringsCount,
                    weight_bps: m.payload.weightBps || 10000,
                    updated_at_ms: m.timestampMs,
                },
            })
        } else if (m.mutationType === 'SPATIAL_MOVE') {
            dbOperations.push({
                table: 'entities_live',
                action: 'UPDATE',
                key: m.entityId,
                record: {
                    q: m.payload.toCoord?.q ?? 0,
                    r: m.payload.toCoord?.r ?? 0,
                    location_id: m.payload.locationId,
                    updated_at_ms: m.timestampMs,
                },
            })
        }
    }

    // 3. Execute Atomic Batches via ste.hunt
    if (ste && typeof ste.hunt === 'function') {
        if (dbOperations.length > 0) {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: { operations: dbOperations },
            })
        }

        for (const evt of eventAppends) {
            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: { appendParams: evt },
            })
        }
    }

    const committed = [...cpy.stagedMutations]
    cpy.stagedMutations = []

    const commitResult: StagingCommitResult = {
        success: true,
        eventsApplied: count,
        stateHash: `sha256_${nowMs}_${count}`,
        committedMutations: Object.freeze(committed),
        timestampMs: nowMs,
    }
    cpy.lastCommitResult = commitResult

    await emitConsole(
        ste,
        `>> [STAGE:COMMIT] Atomically flushed ${count} events to persistent ledger [SEALED]`,
    )

    if (bal.slv) {
        bal.slv({
            commitResult,
            ledgerBit: {
                idx: 'commit-staging-pass',
                val: count,
                src: '[OK]',
                dat: { commitResult, rowCount: count },
            },
        })
    }

    return cpy
}

export const queryStagingStateAction = (
    cpy: LedgerModel,
    bal: LedgerBit,
    _ste?: State,
): LedgerModel => {
    const state: StagingAccumulatorState = {
        baseSequenceCursor: 0,
        currentSequenceCursor: cpy.sequenceCursor,
        pendingMutationsCount: cpy.stagedMutations.length,
        isDirty: cpy.stagedMutations.length > 0,
        lastCommittedAtMs: cpy.lastCommitResult?.timestampMs,
    }

    if (bal.slv) {
        bal.slv({
            accumulatorState: state,
            ledgerBit: {
                idx: 'query-staging-pass',
                val: state.pendingMutationsCount,
                dat: { accumulatorState: state },
            },
        })
    }
    return cpy
}

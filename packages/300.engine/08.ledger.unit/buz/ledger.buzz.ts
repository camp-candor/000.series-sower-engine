/**
 * 08.ledger.unit - Ledger Buzz Business Logic
 * Ephemeral volatile staging accumulation, atomic batch settlement,
 * and Stage 4 Dual-Set 2d6 Mechanical Conflict Resolution.
 */
import { LedgerModel } from '../ledger.model.js'
import type LedgerBit from '../fce/ledger.bit.js'
import type {
    StagedMutationRecord,
    StageMutationParams,
    StagingCommitResult,
    StagingAccumulatorState,
    OutcomeTier,
    CompoundClassification,
    EncounterContext,
    ResolutionReceipt,
    ConflictStateDelta,
    ResolveDual2d6Params,
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
        if (m.mutationType === 'SOMATIC_TRAUMA') {
            const p = m.payload
            if (
                p.fatigueBps != null &&
                (p.fatigueBps < 0 || p.fatigueBps > 10000)
            ) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] fatigueBps out of bounds: ${p.fatigueBps}`,
                }
            }
            if (p.painBps != null && (p.painBps < 0 || p.painBps > 10000)) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] painBps out of bounds: ${p.painBps}`,
                }
            }
            if (
                p.refusalStrainBps != null &&
                (p.refusalStrainBps < 0 || p.refusalStrainBps > 10000)
            ) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] refusalStrainBps out of bounds: ${p.refusalStrainBps}`,
                }
            }
        }

        if (m.mutationType === 'STRING_EXCHANGE') {
            const p = m.payload
            if (p.holderId === p.debtorId) {
                return {
                    valid: false,
                    error: `[ANTI_REFLEXIVITY_BREACH] Holder cannot be identical to debtor: ${p.holderId}`,
                }
            }
            if (
                p.weightBps != null &&
                (p.weightBps < 0 || p.weightBps > 10000)
            ) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] weightBps out of bounds: ${p.weightBps}`,
                }
            }
            if (p.stringsCount != null && p.stringsCount < 0) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] stringsCount cannot be negative: ${p.stringsCount}`,
                }
            }
        }

        if (m.mutationType === 'PARANOIA_TICK') {
            const p = m.payload
            if (p.valueBps != null && (p.valueBps < 0 || p.valueBps > 10000)) {
                return {
                    valid: false,
                    error: `[INVARIANT_BREACH] clock valueBps out of bounds: ${p.valueBps}`,
                }
            }
        }
    }

    return { valid: true }
}

// ============================================================================
// STAGE 4 DUAL-SET 2d6 RESOLUTION ENGINE
// ============================================================================

export function roll2d6(rng: () => number): {
    sum: number
    d1: number
    d2: number
} {
    const r1 = rng()
    const r2 = rng()
    const d1 = Math.floor(r1 * 6) + 1
    const d2 = Math.floor(r2 * 6) + 1
    return { sum: d1 + d2, d1, d2 }
}

export function classifyMargin(d: number): OutcomeTier {
    if (d >= 4) return 'clean_win'
    if (d === 2 || d === 3) return 'costly_win'
    if (d >= -1 && d <= 1) return 'mutual_wound'
    return 'backfire' // d <= -2
}

export function evaluateDual2d6(
    context: EncounterContext,
    rng: () => number = Math.random,
): ResolutionReceipt {
    const { initiator, target, timestampMs } = context

    if (initiator.id === target.id) {
        throw new Error(
            `[ANTI_REFLEXIVITY_BREACH] Initiator cannot duel self: ${initiator.id}`,
        )
    }

    // 1. Clamped Modifiers: Max swing strictly clamped to [-2, +2]
    const rawModObj = (initiator.stats.cunning ?? 0) - (target.stats.spite ?? 0)
    const rawModSom = (initiator.stats.poise ?? 0) - (target.stats.vigor ?? 0)

    const modObj = Math.max(-2, Math.min(2, Math.floor(rawModObj)))
    const modSom = Math.max(-2, Math.min(2, Math.floor(rawModSom)))

    // 2. Opposed Rolls across Objective and Somatic Axes
    const rollObjA = roll2d6(rng)
    const rollObjB = roll2d6(rng)
    const dObj = rollObjA.sum - rollObjB.sum + modObj

    const rollSomA = roll2d6(rng)
    const rollSomB = roll2d6(rng)
    const dSom = rollSomA.sum - rollSomB.sum + modSom

    // 3. Classify Margins
    const objectiveOutcome = classifyMargin(dObj)
    const somaticOutcome = classifyMargin(dSom)

    // 4. Evaluate Compound Extremes
    const isCompoundExtreme = objectiveOutcome === somaticOutcome
    let compoundClassification: CompoundClassification | undefined

    if (isCompoundExtreme) {
        if (objectiveOutcome === 'clean_win')
            compoundClassification = 'DOUBLE_CLEAN_WIN'
        else if (objectiveOutcome === 'costly_win')
            compoundClassification = 'DOUBLE_COSTLY_WIN'
        else if (objectiveOutcome === 'mutual_wound')
            compoundClassification = 'DOUBLE_MUTUAL_WOUND'
        else if (objectiveOutcome === 'backfire')
            compoundClassification = 'DOUBLE_BACKFIRE'
    }

    // 5. Construct Atomic StateDelta
    const stringsAwarded: { from: string; to: string; count: number }[] = []
    const resentmentDelta: Record<string, number> = {
        [initiator.id]: 0,
        [target.id]: 0,
    }
    const somaticConditions: Record<string, string[]> = {
        [initiator.id]: [],
        [target.id]: [],
    }
    let clockTicks = 0

    if (isCompoundExtreme) {
        switch (compoundClassification) {
            case 'DOUBLE_CLEAN_WIN':
                stringsAwarded.push({
                    from: target.id,
                    to: initiator.id,
                    count: 1,
                })
                somaticConditions[target.id].push('humiliated')
                break
            case 'DOUBLE_COSTLY_WIN':
                stringsAwarded.push({
                    from: initiator.id,
                    to: target.id,
                    count: 1,
                })
                somaticConditions[initiator.id].push('exhaustion_tier_1')
                resentmentDelta[target.id] += 2
                break
            case 'DOUBLE_MUTUAL_WOUND':
                somaticConditions[initiator.id].push('somatic_strain')
                somaticConditions[target.id].push('somatic_strain')
                clockTicks = 1
                break
            case 'DOUBLE_BACKFIRE':
                stringsAwarded.push({
                    from: initiator.id,
                    to: target.id,
                    count: 2,
                })
                somaticConditions[initiator.id].push('fractured_composure')
                break
        }
    } else {
        // Uncoupled / Mixed Outcome Resolutions
        if (objectiveOutcome === 'clean_win') {
            stringsAwarded.push({ from: target.id, to: initiator.id, count: 1 })
            somaticConditions[target.id].push('humiliated')
        } else if (objectiveOutcome === 'costly_win') {
            somaticConditions[initiator.id].push('minor_strain')
            resentmentDelta[target.id] += 1
        } else if (objectiveOutcome === 'backfire') {
            resentmentDelta[initiator.id] += 1
            somaticConditions[initiator.id].push('humiliated')
        }

        if (somaticOutcome === 'mutual_wound') {
            somaticConditions[initiator.id].push('minor_strain')
            clockTicks += 1
        } else if (somaticOutcome === 'backfire') {
            somaticConditions[initiator.id].push('somatic_strain')
        }
    }

    const stateDelta: ConflictStateDelta = {
        stringsAwarded: Object.freeze(stringsAwarded),
        resentmentDelta: Object.freeze(resentmentDelta),
        somaticConditionsAdded: Object.freeze({
            [initiator.id]: Object.freeze(somaticConditions[initiator.id]),
            [target.id]: Object.freeze(somaticConditions[target.id]),
        }),
        clockTicks,
    }

    const auditTrail = {
        rollA_obj: rollObjA.sum,
        rollB_obj: rollObjB.sum,
        dObj,
        rollA_som: rollSomA.sum,
        rollB_som: rollSomB.sum,
        dSom,
        modObj,
        modSom,
    }

    return {
        resolverId: 'dual_2d6_v1',
        initiatorId: initiator.id,
        targetId: target.id,
        objectiveOutcome,
        somaticOutcome,
        isCompoundExtreme,
        compoundClassification,
        stateDelta,
        auditTrail,
        timestampMs,
    }
}

export const initLedger = async (
    cpy: LedgerModel,
    bal?: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    cpy.stagedMutations = []
    cpy.sequenceCursor = 0
    cpy.lastCommitResult = undefined
    cpy.lastResolutionReceipt = undefined

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
    const params: StageMutationParams | undefined =
        bal.dat?.stageParams || (bal.dat as any)
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
                    dat: {
                        stagedMutation: record,
                        rowCount: cpy.stagedMutations.length,
                    },
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
                idx: check.valid
                    ? 'validate-staging-pass'
                    : 'validate-staging-fail',
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

    const check = validateStagedInvariants(cpy.stagedMutations)
    if (!check.valid) {
        const err = check.error || '[COMMIT_INVARIANT_BREACH]'
        await emitConsole(
            ste,
            `:: [FAIL] Commit aborted: ${err}. Triggering automatic rollback.`,
        )
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

    const dbOperations: any[] = []
    const eventAppends: any[] = []

    for (const m of cpy.stagedMutations) {
        eventAppends.push({
            eventId: m.mutationId,
            eventType: m.mutationType,
            actorId: m.entityId,
            targetId: m.targetId,
            tick: m.tick,
            payload: m.payload,
        })

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

export const resolveDual2d6Action = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste?: State,
): Promise<LedgerModel> => {
    const params: ResolveDual2d6Params | undefined = bal.dat?.resolveParams
    if (!params || !params.context) {
        const err = '[INVALID_RESOLVE_PARAMS] Missing encounter context'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                ledgerBit: {
                    idx: 'resolve-dual-2d6-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const receipt = evaluateDual2d6(params.context, params.rng)
        cpy.lastResolutionReceipt = receipt

        // Automatic staging buffer injection if requested (default true)
        if (params.autoStage !== false) {
            const nextSeq = cpy.sequenceCursor + 1
            const tick = params.context.tick

            // 1. Stage Strings Awarded
            for (const award of receipt.stateDelta.stringsAwarded) {
                cpy.stagedMutations.push({
                    mutationId: `stg_string_${nextSeq}_${award.from}_${award.to}`,
                    sequenceNumber: nextSeq,
                    tick,
                    mutationType: 'STRING_EXCHANGE',
                    entityId: award.to,
                    targetId: award.from,
                    payload: {
                        holderId: award.to,
                        debtorId: award.from,
                        stringsCount: award.count,
                    },
                    timestampMs: receipt.timestampMs,
                })
            }

            // 2. Stage Somatic Conditions
            for (const [entityId, conds] of Object.entries(
                receipt.stateDelta.somaticConditionsAdded,
            )) {
                if (conds.length > 0) {
                    cpy.stagedMutations.push({
                        mutationId: `stg_trauma_${nextSeq}_${entityId}`,
                        sequenceNumber: nextSeq,
                        tick,
                        mutationType: 'SOMATIC_TRAUMA',
                        entityId,
                        payload: { conditionsAdded: conds, fatigueBps: 500 },
                        timestampMs: receipt.timestampMs,
                    })
                }
            }

            // 3. Stage Paranoia Clock Ticks
            if (receipt.stateDelta.clockTicks > 0) {
                cpy.stagedMutations.push({
                    mutationId: `stg_paranoia_${nextSeq}`,
                    sequenceNumber: nextSeq,
                    tick,
                    mutationType: 'PARANOIA_TICK',
                    entityId: params.context.initiator.id,
                    payload: { valueBps: receipt.stateDelta.clockTicks * 1000 },
                    timestampMs: receipt.timestampMs,
                })
            }

            cpy.sequenceCursor = nextSeq
        }

        const extremeTag = receipt.isCompoundExtreme
            ? ` [${receipt.compoundClassification}]`
            : ''
        await emitConsole(
            ste,
            `>> [STAGE4:DUAL_2D6] [${receipt.initiatorId} vs ${receipt.targetId}] Obj: [${receipt.objectiveOutcome}] | Som: [${receipt.somaticOutcome}]${extremeTag} [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                resolutionReceipt: receipt,
                ledgerBit: {
                    idx: 'resolve-dual-2d6-pass',
                    val: 1,
                    src:
                        receipt.compoundClassification ||
                        receipt.objectiveOutcome,
                    dat: { resolutionReceipt: receipt },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(
            ste,
            `:: [FAIL] Dual 2d6 resolution failed: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                ledgerBit: {
                    idx: 'resolve-dual-2d6-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

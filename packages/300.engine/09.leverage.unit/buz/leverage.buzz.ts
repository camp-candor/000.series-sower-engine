/**
 * 09.leverage.unit - Leverage Buzz Business Logic
 * Directional social debt records, anti-reflexivity gating, and solvency protection.
 */
import { LeverageModel } from '../leverage.model.js'
import type LeverageBit from '../fce/leverage.bit.js'
import type {
    StringsLedgerRecord,
    MutateLeverageParams,
    SpendLeverageParams,
    LeverageSpendReceipt,
    LeverageAuditReport,
} from '../fce/leverage.interface.js'
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

export function makeRelationId(holderId: string, debtorId: string): string {
    return `${holderId}->${debtorId}`
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

export function assertNonNegativeInteger(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} cannot be negative. Received: ${val}`,
        )
    }
}

export const initLeverage = async (
    cpy: LeverageModel,
    bal?: LeverageBit,
    ste?: State,
): Promise<LeverageModel> => {
    cpy.records.clear()

    // Hydrate existing records from 02.database.unit if available
    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'strings_ledger' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const r of queryRes.databaseBit.dat.records as StringsLedgerRecord[]) {
                cpy.records.set(r.relation_id, r)
            }
        }
    }

    await emitConsole(
        ste,
        `>> [LEVERAGE:INIT] [OK] Directional social debt unit online with ${cpy.records.size} debt records hydrated.`,
    )

    if (bal?.slv) {
        bal.slv({
            levBit: {
                idx: 'init-leverage-pass',
                val: cpy.records.size,
                dat: { rowCount: cpy.records.size },
            },
        })
    }
    return cpy
}

export const updateLeverage = (
    cpy: LeverageModel,
    bal?: LeverageBit,
    _ste?: State,
): LeverageModel => {
    if (bal?.slv) {
        bal.slv({
            levBit: {
                idx: 'update-leverage-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const mutateStringLeverage = async (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste?: State,
): Promise<LeverageModel> => {
    const rawParams = bal.dat?.mutateParams || bal.dat || {}
    const holder_id: string = rawParams.holder_id || bal.src || ''
    const debtor_id: string = rawParams.debtor_id || ''
    const strings_count: number = rawParams.strings_count ?? 1
    const weight_bps: number = rawParams.weight_bps ?? 10000
    const delta_mode: boolean = rawParams.delta_mode ?? false
    const nowMs: number = rawParams.timestamp_ms || 1700000000000
    const tick: number = rawParams.tick || 1

    // 1. Anti-Reflexivity Gate (T_0 = $0.00)
    if (holder_id === debtor_id) {
        const err = `[ANTI_REFLEXIVITY_BREACH] holder_id (${holder_id}) cannot be identical to debtor_id`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                levBit: {
                    idx: 'mutate-string-leverage-error',
                    src: '[ANTI_REFLEXIVITY_BREACH]',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    if (!holder_id || !debtor_id) {
        const err = '[INVALID_LEVERAGE_PARAMS] Missing holder_id or debtor_id'
        if (bal.slv) {
            bal.slv({
                levBit: {
                    idx: 'mutate-string-leverage-error',
                    src: err,
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        assertBasisPoints(weight_bps, 'weight_bps')
        assertNonNegativeInteger(Math.abs(strings_count), 'strings_count')

        const relation_id = makeRelationId(holder_id, debtor_id)
        const existing = cpy.records.get(relation_id)

        let finalCount = strings_count
        if (delta_mode && existing) {
            finalCount = existing.strings_count + strings_count
        }

        if (finalCount < 0) {
            throw new RangeError(
                `[INSUFFICIENT_STRINGS_BREACH] Resulting count cannot be negative: ${finalCount}`,
            )
        }

        const record: StringsLedgerRecord = {
            relation_id,
            holder_id,
            debtor_id,
            weight_bps,
            strings_count: finalCount,
            updated_at_ms: nowMs,
        }

        cpy.records.set(relation_id, record)

        // Persist to 02.database.unit table strings_ledger
        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'strings_ledger',
                            action: 'INSERT', // Database INSERT OR REPLACE / ON CONFLICT
                            key: relation_id,
                            record,
                        },
                    ],
                },
            })

            // Dispatch event to 05.event.unit
            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: {
                    appendParams: {
                        eventId: `evt_leverage_${relation_id}_${tick}`,
                        eventType: 'LEVERAGE_STRING_MUTATED',
                        tick,
                        payload: {
                            relation_id,
                            holder_id,
                            debtor_id,
                            strings_count: finalCount,
                            weight_bps,
                        },
                    },
                },
            })
        }

        await emitConsole(
            ste,
            `>> [LEVERAGE:MUTATE] ${relation_id} | Count: ${finalCount} | Weight: ${weight_bps} bps`,
        )

        if (bal.slv) {
            bal.slv({
                record,
                levBit: {
                    idx: 'mutate-string-leverage',
                    val: finalCount,
                    src: '[OK]',
                    dat: { record },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        const isFloat = errorMsg.includes('FLOAT_PROHIBITED')
        const tag = isFloat ? '[FLOAT_PROHIBITED]' : '[MUTATION_FAILED]'
        await emitConsole(ste, `:: [FAIL] Leverage mutation rejected: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                levBit: {
                    idx: 'mutate-string-leverage-error',
                    src: tag,
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const spendStringLeverage = async (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste?: State,
): Promise<LeverageModel> => {
    const rawParams = bal.dat?.spendParams || bal.dat || {}
    const holder_id: string = rawParams.holder_id || bal.src || ''
    const debtor_id: string = rawParams.debtor_id || ''
    const spend_count: number = rawParams.spend_count ?? 1
    const nowMs: number = rawParams.timestamp_ms || 1700000000000
    const tick: number = rawParams.tick || 1

    // 1. Anti-Reflexivity Gate (T_0 = $0.00)
    if (holder_id === debtor_id) {
        const err = `[ANTI_REFLEXIVITY_BREACH] Cannot spend leverage over self (${holder_id})`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                levBit: {
                    idx: 'spend-string-leverage-error',
                    src: '[ANTI_REFLEXIVITY_BREACH]',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const relation_id = makeRelationId(holder_id, debtor_id)
    let record = cpy.records.get(relation_id)

    // Fallback query to database if not in memory
    if (!record && ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'strings_ledger', key: relation_id },
        })
        if (queryRes?.databaseBit?.val === 1 && queryRes?.databaseBit?.dat?.record) {
            record = queryRes.databaseBit.dat.record as StringsLedgerRecord
            cpy.records.set(relation_id, record)
        }
    }

    const currentCount = record ? record.strings_count : 0

    // 2. Solvency Overdraft Gate
    if (spend_count > currentCount) {
        const err = `[INSUFFICIENT_STRINGS_BREACH] Holder '${holder_id}' holds only ${currentCount} strings over '${debtor_id}', but attempted to spend ${spend_count}`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                levBit: {
                    idx: 'spend-string-leverage-error',
                    src: '[INSUFFICIENT_STRINGS_BREACH]',
                    val: -1,
                    dat: {
                        error: err,
                        spendReceipt: {
                            success: false,
                            relation_id,
                            holder_id,
                            debtor_id,
                            spent_count: 0,
                            remaining_strings_count: currentCount,
                            weight_bps: record?.weight_bps || 0,
                            error: err,
                            timestamp_ms: nowMs,
                        },
                    },
                },
            })
        }
        return cpy
    }

    const remainingCount = currentCount - spend_count
    const updatedRecord: StringsLedgerRecord = {
        relation_id,
        holder_id,
        debtor_id,
        weight_bps: record?.weight_bps || 10000,
        strings_count: remainingCount,
        updated_at_ms: nowMs,
    }

    cpy.records.set(relation_id, updatedRecord)

    // Persist to database
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'strings_ledger',
                        action: 'UPDATE',
                        key: relation_id,
                        record: updatedRecord,
                    },
                ],
            },
        })

        // Event log
        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: `evt_spend_${relation_id}_${tick}`,
                    eventType: 'LEVERAGE_STRING_MUTATED',
                    tick,
                    payload: {
                        relation_id,
                        holder_id,
                        debtor_id,
                        spent_count: spend_count,
                        remaining_strings_count: remainingCount,
                    },
                },
            },
        })
    }

    const receipt: LeverageSpendReceipt = {
        success: true,
        relation_id,
        holder_id,
        debtor_id,
        spent_count: spend_count,
        remaining_strings_count: remainingCount,
        weight_bps: updatedRecord.weight_bps,
        timestamp_ms: nowMs,
    }

    await emitConsole(
        ste,
        `>> [LEVERAGE:SPEND] ${relation_id} | Spent: ${spend_count} | Remaining: ${remainingCount}`,
    )

    if (bal.slv) {
        bal.slv({
            spendReceipt: receipt,
            record: updatedRecord,
            levBit: {
                idx: 'spend-string-leverage',
                val: remainingCount,
                src: '[OK]',
                dat: { spendReceipt: receipt, record: updatedRecord },
            },
        })
    }

    return cpy
}

export const getLeverageRecordAction = (
    cpy: LeverageModel,
    bal: LeverageBit,
    _ste?: State,
): LeverageModel => {
    const relId =
        bal.dat?.relationId ||
        (bal.dat?.holderId && bal.dat?.debtorId
            ? makeRelationId(bal.dat.holderId, bal.dat.debtorId)
            : bal.src)

    const record = relId ? cpy.records.get(relId) : undefined

    if (bal.slv) {
        bal.slv({
            record,
            levBit: {
                idx: record ? 'get-leverage-pass' : 'get-leverage-not-found',
                val: record ? record.strings_count : 0,
                dat: { record },
            },
        })
    }
    return cpy
}

export const listLeverageByHolderAction = (
    cpy: LeverageModel,
    bal: LeverageBit,
    _ste?: State,
): LeverageModel => {
    const holderId = bal.dat?.holderId || bal.src

    const allRecords = Array.from(cpy.records.values())
    const filtered = holderId
        ? allRecords.filter((r) => r.holder_id === holderId)
        : allRecords

    if (bal.slv) {
        bal.slv({
            records: filtered,
            levBit: {
                idx: 'list-leverage-pass',
                val: filtered.length,
                dat: { records: filtered, rowCount: filtered.length },
                lst: filtered,
            },
        })
    }
    return cpy
}

export const auditLeverageSolvencyAction = async (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste?: State,
): Promise<LeverageModel> => {
    const selfBreaches: string[] = []
    const negativeBreaches: string[] = []
    let totalStrings = 0

    for (const [id, rec] of cpy.records.entries()) {
        if (rec.holder_id === rec.debtor_id) {
            selfBreaches.push(id)
        }
        if (rec.strings_count < 0) {
            negativeBreaches.push(`${id} (count: ${rec.strings_count})`)
        }
        totalStrings += rec.strings_count
    }

    const valid = selfBreaches.length === 0 && negativeBreaches.length === 0

    const report: LeverageAuditReport = {
        valid,
        totalRecords: cpy.records.size,
        totalActiveStrings: totalStrings,
        selfReferentialBreaches: Object.freeze(selfBreaches),
        negativeStringBreaches: Object.freeze(negativeBreaches),
        timestamp_ms: 1700000000000,
    }

    if (valid) {
        await emitConsole(
            ste,
            `>> [LEVERAGE:AUDIT] [PASS] Solvency and anti-reflexivity verified across ${report.totalRecords} edges (${report.totalActiveStrings} active strings).`,
        )
    } else {
        await emitConsole(
            ste,
            `:: [LEVERAGE:AUDIT] [FAIL] Breaches detected: Self: ${selfBreaches.length} | Negative: ${negativeBreaches.length}`,
        )
    }

    if (bal.slv) {
        bal.slv({
            auditReport: report,
            levBit: {
                idx: valid ? 'audit-solvency-pass' : 'audit-solvency-fail',
                val: valid ? 1 : 0,
                dat: { auditReport: report },
            },
        })
    }

    return cpy
}


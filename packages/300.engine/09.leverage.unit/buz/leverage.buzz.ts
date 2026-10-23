import type { LeverageModel } from '../leverage.model'
import type LeverageBit from '../fce/leverage.bit'
import type State from '../../99.core/state'
import type { StringsLedgerRecord } from '../fce/leverage.interface'

export const assertBasisPoints = (val: number, label: string): number => {
    if (!Number.isInteger(val)) {
        throw new Error(
            `[FLOAT_PROHIBITED] ${label} must be an integer, got: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new Error(
            `[OUT_OF_BOUNDS] ${label} must be between 0 and 10000 bps, got: ${val}`,
        )
    }
    return val
}

export const makeRelationId = (holderId: string, debtorId: string): string => {
    return `${holderId.trim()}->${debtorId.trim()}`
}

export const initLeverage = (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    cpy.records = {}
    if (bal?.slv) {
        bal.slv({ levBit: { idx: 'init-leverage', val: 0 } })
    }
    return cpy
}

export const updateLeverage = (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    if (bal?.slv) {
        bal.slv({ levBit: { idx: 'update-leverage' } })
    }
    return cpy
}

export const mutateStringLeverage = async (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    try {
        const payload = bal?.dat as {
            holder_id: string
            debtor_id: string
            weight_bps?: number
            strings_count?: number
            timestamp_ms?: number
        }

        if (!payload?.holder_id || !payload?.debtor_id) {
            throw new Error(
                '[MALFORMED_INPUT] holder_id and debtor_id are required',
            )
        }

        if (payload.holder_id.trim() === payload.debtor_id.trim()) {
            throw new Error(
                `[ANTI_REFLEXIVITY_BREACH] Actor ${payload.holder_id} cannot hold leverage strings over self`,
            )
        }

        const relId = makeRelationId(payload.holder_id, payload.debtor_id)
        const existing = cpy.records[relId]

        const weight =
            payload.weight_bps !== undefined
                ? assertBasisPoints(payload.weight_bps, 'weight_bps')
                : (existing?.weight_bps ?? 1000)

        const countDelta =
            payload.strings_count !== undefined ? payload.strings_count : 1
        if (!Number.isInteger(countDelta)) {
            throw new Error(
                `[FLOAT_PROHIBITED] strings_count must be an integer, got: ${countDelta}`,
            )
        }

        const newCount = Math.max(
            0,
            (existing?.strings_count ?? 0) + countDelta,
        )
        const timestamp = payload.timestamp_ms ?? (existing?.updated_at_ms || 0)

        const record: StringsLedgerRecord = {
            relation_id: relId,
            holder_id: payload.holder_id.trim(),
            debtor_id: payload.debtor_id.trim(),
            weight_bps: weight,
            strings_count: newCount,
            updated_at_ms: timestamp,
        }

        cpy.records[relId] = record

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [LEVERAGE:MUTATE] ${relId} | Count: ${newCount} | Weight: ${weight} bps`,
                })
                .catch(() => {})
        }

        if (bal?.slv) {
            bal.slv({
                levBit: {
                    idx: 'mutate-string-leverage',
                    dat: record,
                    val: newCount,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [LEVERAGE:ERR] ${err.message}`,
                })
                .catch(() => {})
        }
        if (bal?.slv) {
            bal.slv({
                levBit: {
                    idx: 'mutate-string-leverage-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const spendStringLeverage = async (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    try {
        const payload = bal?.dat as {
            holder_id: string
            debtor_id: string
            spend_count?: number
            timestamp_ms?: number
        }

        if (!payload?.holder_id || !payload?.debtor_id) {
            throw new Error(
                '[MALFORMED_INPUT] holder_id and debtor_id are required',
            )
        }

        if (payload.holder_id.trim() === payload.debtor_id.trim()) {
            throw new Error(
                `[ANTI_REFLEXIVITY_BREACH] Actor ${payload.holder_id} cannot hold or spend leverage strings over self`,
            )
        }

        const relId = makeRelationId(payload.holder_id, payload.debtor_id)
        const existing = cpy.records[relId]
        const currentCount = existing?.strings_count ?? 0
        const spend = payload.spend_count ?? 1

        if (!Number.isInteger(spend) || spend <= 0) {
            throw new Error(
                `[INVALID_SPEND_COUNT] spend_count must be a positive integer, got: ${spend}`,
            )
        }

        if (currentCount < spend) {
            throw new Error(
                `[INSUFFICIENT_STRINGS_BREACH] Holder ${payload.holder_id} holds only ${currentCount} strings over ${payload.debtor_id}, but attempted to spend ${spend}`,
            )
        }

        const updatedRecord: StringsLedgerRecord = {
            ...existing,
            strings_count: currentCount - spend,
            updated_at_ms: payload.timestamp_ms ?? existing.updated_at_ms,
        }

        cpy.records[relId] = updatedRecord

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [LEVERAGE:SPEND] ${relId} | Spent: ${spend} | Remaining: ${updatedRecord.strings_count}`,
                })
                .catch(() => {})
        }

        if (bal?.slv) {
            bal.slv({
                levBit: {
                    idx: 'spend-string-leverage',
                    dat: updatedRecord,
                    val: updatedRecord.strings_count,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [LEVERAGE:ERR] ${err.message}`,
                })
                .catch(() => {})
        }
        if (bal?.slv) {
            bal.slv({
                levBit: {
                    idx: 'spend-string-leverage-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const getPairLeverage = (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    const payload = bal?.dat as { holder_id: string; debtor_id: string }
    if (!payload?.holder_id || !payload?.debtor_id) {
        if (bal?.slv) {
            bal.slv({
                levBit: {
                    idx: 'get-pair-leverage-error',
                    src: 'Missing IDs',
                    val: -1,
                },
            })
        }
        return cpy
    }

    const relId = makeRelationId(payload.holder_id, payload.debtor_id)
    const record = cpy.records[relId] || null

    if (bal?.slv) {
        bal.slv({
            levBit: {
                idx: 'get-pair-leverage',
                dat: record,
                val: record ? record.strings_count : 0,
            },
        })
    }
    return cpy
}

export const listLeverage = (
    cpy: LeverageModel,
    bal: LeverageBit,
    ste: State,
) => {
    const list = Object.values(cpy.records)
    if (bal?.slv) {
        bal.slv({
            levBit: { idx: 'list-leverage', lst: list, val: list.length },
        })
    }
    return cpy
}

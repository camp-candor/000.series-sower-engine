import type { TraumaModel } from '../trauma.model'
import type TraumaBit from '../fce/trauma.bit'
import type State from '../../99.core/state'
import type {
    SomaticTraumaState,
    TraumaDeltaPayload,
    LocomotionTier,
    RefusalStrainReport,
} from '../fce/trauma.interface'

export const clampBps = (val: number): number => {
    if (!Number.isInteger(val)) {
        throw new Error(
            `[FLOAT_PROHIBITED] Basis points must be integer. Received: ${val}`,
        )
    }
    return Math.max(0, Math.min(10000, val))
}

export const bankersRoundBps = (
    numerator: number,
    denominator: number,
): number => {
    if (denominator === 0)
        throw new Error('[DIV_ZERO] Division by zero in basis-point arithmetic')
    const quotient = numerator / denominator
    const floor = Math.floor(quotient)
    const remainder = Math.abs(quotient - floor)

    if (Math.abs(remainder - 0.5) < 1e-9) {
        return floor % 2 === 0 ? floor : floor + 1
    }
    return Math.round(quotient)
}

export const deriveLocomotionTier = (
    legsAvailable: number,
    painBps: number,
): LocomotionTier => {
    if (legsAvailable <= 0 || painBps >= 9000) return 'IMMOBILIZED'
    if (legsAvailable === 1 || painBps >= 5000) return 'LIMPING'
    return 'UNRESTRICTED'
}

export const createDefaultSomaticState = (
    entityId: string,
): SomaticTraumaState => ({
    entityId,
    armsAvailable: 2,
    legsAvailable: 2,
    concussionLevel: 0,
    fatigueBps: 0,
    painBps: 0,
    refusalStrainBps: 0,
    locomotionTier: 'UNRESTRICTED',
    updatedAtMs: 0,
})

export const initTrauma = (
    cpy: TraumaModel,
    bal: TraumaBit,
    _ste: State,
): TraumaModel => {
    cpy.entities = {}
    if (bal?.slv) bal.slv({ trmBit: { idx: 'init-trauma', val: 0 } })
    return cpy
}

export const updateTrauma = (
    cpy: TraumaModel,
    bal: TraumaBit,
    _ste: State,
): TraumaModel => {
    if (bal?.slv) bal.slv({ trmBit: { idx: 'update-trauma' } })
    return cpy
}

export const applyTrauma = (
    cpy: TraumaModel,
    bal: TraumaBit<any>,
    _ste: State,
): TraumaModel => {
    const payload = bal?.dat
    if (!payload?.entityId) {
        if (bal?.slv)
            bal.slv({
                trmBit: {
                    idx: 'apply-trauma-err',
                    src: 'MISSING_ENTITY_ID',
                    val: -1,
                },
            })
        return cpy
    }

    const existing =
        cpy.entities[payload.entityId] ||
        createDefaultSomaticState(payload.entityId)

    const rawArms = existing.armsAvailable + (payload.deltaArms ?? 0)
    const rawLegs = existing.legsAvailable + (payload.deltaLegs ?? 0)
    const rawConcussion =
        existing.concussionLevel + (payload.deltaConcussion ?? 0)

    const armsAvailable = Math.max(0, Math.min(2, rawArms))
    const legsAvailable = Math.max(0, Math.min(2, rawLegs))
    const concussionLevel = Math.max(0, Math.min(3, rawConcussion))

    const fatigueBps = clampBps(
        existing.fatigueBps + (payload.deltaFatigueBps ?? 0),
    )
    const painBps = clampBps(existing.painBps + (payload.deltaPainBps ?? 0))
    const refusalStrainBps = clampBps(
        existing.refusalStrainBps + (payload.deltaRefusalStrainBps ?? 0),
    )

    const locomotionTier = deriveLocomotionTier(legsAvailable, painBps)

    const updated: SomaticTraumaState = {
        entityId: payload.entityId,
        armsAvailable,
        legsAvailable,
        concussionLevel,
        fatigueBps,
        painBps,
        refusalStrainBps,
        locomotionTier,
        updatedAtMs:
            bal?.val && bal.val > 0 ? bal.val : existing.updatedAtMs + 1,
    }

    cpy.entities[payload.entityId] = updated

    if (bal?.slv) {
        bal.slv({
            trmBit: {
                idx: 'apply-trauma',
                src: payload.entityId,
                val: painBps,
                dat: updated,
            },
        })
    }
    return cpy
}

export const recoverTrauma = (
    cpy: TraumaModel,
    bal: TraumaBit<any>,
    _ste: State,
): TraumaModel => {
    const payload = bal?.dat
    if (!payload?.entityId || !cpy.entities[payload.entityId]) {
        if (bal?.slv)
            bal.slv({
                trmBit: {
                    idx: 'recover-trauma-err',
                    src: 'ENTITY_NOT_FOUND',
                    val: -1,
                },
            })
        return cpy
    }

    const existing = cpy.entities[payload.entityId]
    const fatigueBps = clampBps(
        existing.fatigueBps - (payload.deltaFatigueBps ?? 0),
    )
    const painBps = clampBps(existing.painBps - (payload.deltaPainBps ?? 0))
    const refusalStrainBps = clampBps(
        existing.refusalStrainBps - (payload.deltaRefusalStrainBps ?? 0),
    )
    const locomotionTier = deriveLocomotionTier(existing.legsAvailable, painBps)

    const updated: SomaticTraumaState = {
        ...existing,
        fatigueBps,
        painBps,
        refusalStrainBps,
        locomotionTier,
        updatedAtMs: existing.updatedAtMs + 1,
    }

    cpy.entities[payload.entityId] = updated

    if (bal?.slv) {
        bal.slv({
            trmBit: {
                idx: 'recover-trauma',
                src: payload.entityId,
                val: fatigueBps,
                dat: updated,
            },
        })
    }
    return cpy
}

export const evaluateRefusalStrainTrauma = (
    cpy: TraumaModel,
    bal: TraumaBit<any>,
    _ste: State,
): TraumaModel => {
    const entityId = bal?.dat?.entityId || bal?.src || ''
    const current = cpy.entities[entityId]

    if (!current) {
        if (bal?.slv)
            bal.slv({
                trmBit: {
                    idx: 'evaluate-refusal-strain-err',
                    src: 'ENTITY_NOT_FOUND',
                    val: -1,
                },
            })
        return cpy
    }

    const report: RefusalStrainReport = {
        entityId,
        refusalStrainBps: current.refusalStrainBps,
        isStrained: current.refusalStrainBps >= 8000,
        thresholdBps: 8000,
    }

    if (bal?.slv) {
        bal.slv({
            trmBit: {
                idx: 'evaluate-refusal-strain-trauma',
                src: entityId,
                val: current.refusalStrainBps,
                dat: report,
            },
        })
    }
    return cpy
}

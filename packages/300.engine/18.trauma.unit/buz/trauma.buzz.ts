/**
 * 18.trauma.unit - Trauma Buzz Business Logic
 * Basis-point somatic vector calculation, limb capacity, and locomotion tier derivation.
 */
import { TraumaModel } from '../trauma.model.js'
import type TraumaBit from '../fce/trauma.bit.js'
import type {
    SomaticTraumaState,
    LocomotionTier,
    TraumaDeltaPayload,
} from '../fce/trauma.interface.js'
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

export function assertBasisPoint(val: number, field: string): void {
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

export function deriveLocomotionTier(
    legsAvailable: number,
    painBps: number,
    fatigueBps: number,
): LocomotionTier {
    if (legsAvailable === 0) {
        return 'IMMOBILIZED'
    }
    if (legsAvailable === 1 || painBps >= 8000 || fatigueBps >= 9000) {
        return 'LIMPING'
    }
    return 'UNRESTRICTED'
}

export const initTrauma = (
    cpy: TraumaModel,
    bal?: TraumaBit,
    _ste?: State,
): TraumaModel => {
    cpy.entities = {}
    if (bal?.slv) {
        bal.slv({
            trmBit: {
                idx: 'init-trauma-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateTrauma = (
    cpy: TraumaModel,
    bal?: TraumaBit,
    _ste?: State,
): TraumaModel => {
    if (bal?.slv) {
        bal.slv({
            trmBit: {
                idx: 'update-trauma-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const applyTraumaAction = async (
    cpy: TraumaModel,
    bal: TraumaBit,
    ste?: State,
): Promise<TraumaModel> => {
    const delta: TraumaDeltaPayload | undefined = bal.dat?.delta
    if (!delta || !delta.entityId) {
        const errorMsg = '[INVALID_DELTA] Missing delta or entityId'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'apply-trauma-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
        return cpy
    }

    try {
        const current = cpy.entities[delta.entityId] || {
            entityId: delta.entityId,
            armsAvailable: 2,
            legsAvailable: 2,
            concussionLevel: 0,
            fatigueBps: 0,
            painBps: 0,
            refusalStrainBps: 0,
            locomotionTier: 'UNRESTRICTED',
            updatedAtMs: delta.timestampMs || 1700000000000,
        }

        const newArms = Math.max(
            0,
            Math.min(2, current.armsAvailable + (delta.deltaArms || 0)),
        )
        const newLegs = Math.max(
            0,
            Math.min(2, current.legsAvailable + (delta.deltaLegs || 0)),
        )
        const newConcussion = Math.max(
            0,
            Math.min(3, current.concussionLevel + (delta.deltaConcussion || 0)),
        )

        const rawFatigue = current.fatigueBps + (delta.deltaFatigueBps || 0)
        const rawPain = current.painBps + (delta.deltaPainBps || 0)
        const rawRefusal =
            current.refusalStrainBps + (delta.deltaRefusalStrainBps || 0)

        const clampedFatigue = Math.max(0, Math.min(10000, rawFatigue))
        const clampedPain = Math.max(0, Math.min(10000, rawPain))
        const clampedRefusal = Math.max(0, Math.min(10000, rawRefusal))

        assertBasisPoint(clampedFatigue, 'fatigueBps')
        assertBasisPoint(clampedPain, 'painBps')
        assertBasisPoint(clampedRefusal, 'refusalStrainBps')

        const newTier = deriveLocomotionTier(
            newLegs,
            clampedPain,
            clampedFatigue,
        )

        const updatedState: SomaticTraumaState = {
            entityId: delta.entityId,
            armsAvailable: newArms,
            legsAvailable: newLegs,
            concussionLevel: newConcussion,
            fatigueBps: clampedFatigue,
            painBps: clampedPain,
            refusalStrainBps: clampedRefusal,
            locomotionTier: newTier,
            updatedAtMs: delta.timestampMs || current.updatedAtMs,
        }

        cpy.entities[delta.entityId] = updatedState

        await emitConsole(
            ste,
            `>> [TRAUMA:APPLY] [${updatedState.entityId}] Arms: ${updatedState.armsAvailable}/2 | Legs: ${updatedState.legsAvailable}/2 | Pain: ${updatedState.painBps} bps | Fatigue: ${updatedState.fatigueBps} bps | Locomotion: [${updatedState.locomotionTier}]`,
        )

        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'apply-trauma-pass',
                    val: 1,
                    dat: { state: updatedState },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(
            ste,
            `:: [FAIL] Trauma application aborted: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'apply-trauma-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const decayFatigueTraumaAction = async (
    cpy: TraumaModel,
    bal: TraumaBit,
    ste?: State,
): Promise<TraumaModel> => {
    const entityId = bal.dat?.entityId || bal.src
    const decayBps = bal.dat?.decayBps ?? 500
    const timestampMs = bal.dat?.timestampMs || 1700000000000

    if (!entityId || !cpy.entities[entityId]) {
        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'decay-fatigue-fail',
                    val: 0,
                    dat: {
                        error: `Entity '${entityId}' not found in trauma registry`,
                    },
                },
            })
        }
        return cpy
    }

    try {
        assertBasisPoint(decayBps, 'decayBps')
        const current = cpy.entities[entityId]
        const newFatigue = Math.max(0, current.fatigueBps - decayBps)
        const newTier = deriveLocomotionTier(
            current.legsAvailable,
            current.painBps,
            newFatigue,
        )

        const updated: SomaticTraumaState = {
            ...current,
            fatigueBps: newFatigue,
            locomotionTier: newTier,
            updatedAtMs: timestampMs,
        }
        cpy.entities[entityId] = updated

        await emitConsole(
            ste,
            `>> [TRAUMA:DECAY] [${entityId}] Fatigue decayed: ${current.fatigueBps} -> ${newFatigue} bps`,
        )

        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'decay-fatigue-pass',
                    val: newFatigue,
                    dat: { state: updated },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                trmBit: {
                    idx: 'decay-fatigue-fail',
                    val: 0,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }

    return cpy
}

export const clampBasisPointsTraumaAction = (
    cpy: TraumaModel,
    bal: TraumaBit,
    _ste?: State,
): TraumaModel => {
    const rawVal = bal.val ?? 0
    let clamped = 0
    try {
        assertBasisPoint(rawVal, 'rawVal')
        clamped = rawVal
    } catch {
        clamped = Math.max(0, Math.min(10000, Math.round(rawVal)))
    }

    if (bal.slv) {
        bal.slv({
            trmBit: {
                idx: 'clamp-basis-points-pass',
                val: clamped,
            },
        })
    }
    return cpy
}

export const getSomaticStateAction = (
    cpy: TraumaModel,
    bal: TraumaBit,
    _ste?: State,
): TraumaModel => {
    const entityId = bal.dat?.entityId || bal.src
    const state = entityId ? cpy.entities[entityId] : undefined

    if (bal.slv) {
        bal.slv({
            trmBit: {
                idx: state ? 'get-somatic-pass' : 'get-somatic-not-found',
                val: state ? 1 : 0,
                dat: { state },
            },
        })
    }
    return cpy
}

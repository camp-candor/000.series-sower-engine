/**
 * 03.entity.unit - Somatic State Query Extractor
 * Extracts and asserts Gillian integer basis-point bounds from raw entity state.
 */
import type {
    SomaticState,
    LocomotionTier,
} from '../fce/somatic-budget.interface.js'

const VALID_TIERS: readonly LocomotionTier[] = Object.freeze([
    'UNRESTRICTED',
    'LIMP',
    'NEUROPATHY_SHUFFLE',
    'IMMOBILIZED',
])

const assertInteger = (val: unknown, fieldName: string): number => {
    if (typeof val !== 'number' || !Number.isInteger(val)) {
        throw new Error(
            `[SOMATIC_INTEGER_BREACH] ${fieldName} must be a discrete integer. Received: ${val}`,
        )
    }
    return val
}

const assertBasisPoint = (val: unknown, fieldName: string): number => {
    const intVal = assertInteger(val, fieldName)
    if (intVal < 0 || intVal > 10000) {
        throw new Error(
            `[GILLIAN_BPS_BREACH] ${fieldName} must be within [0, 10000] bps. Received: ${intVal}`,
        )
    }
    return intVal
}

export const extractSomaticState = (raw: any): SomaticState => {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[SOMATIC_QUERY_ERROR] Entity record must be an object')
    }

    const entityId =
        typeof raw.entityId === 'string' ? raw.entityId : 'char_unknown'
    const availableArms = Math.min(
        2,
        Math.max(0, assertInteger(raw.availableArms ?? 2, 'availableArms')),
    )
    const availableLegs = Math.min(
        2,
        Math.max(0, assertInteger(raw.availableLegs ?? 2, 'availableLegs')),
    )

    let locomotionTier: LocomotionTier = 'UNRESTRICTED'
    if (
        typeof raw.locomotionTier === 'string' &&
        VALID_TIERS.includes(raw.locomotionTier as LocomotionTier)
    ) {
        locomotionTier = raw.locomotionTier as LocomotionTier
    } else if (availableLegs < 1) {
        locomotionTier = 'IMMOBILIZED'
    } else if (availableLegs < 2) {
        locomotionTier = 'LIMP'
    }

    const fatigueBps = assertBasisPoint(raw.fatigueBps ?? 0, 'fatigueBps')
    const painBps = assertBasisPoint(raw.painBps ?? 0, 'painBps')
    const refusalStrainBps = assertBasisPoint(
        raw.refusalStrainBps ?? 0,
        'refusalStrainBps',
    )

    const activeTrauma: string[] = []
    if (Array.isArray(raw.activeTrauma)) {
        for (const t of raw.activeTrauma) {
            if (typeof t === 'string' && t.trim().length > 0) {
                activeTrauma.push(t.trim().toLowerCase())
            }
        }
    }

    return Object.freeze({
        entityId,
        availableArms,
        availableLegs,
        locomotionTier,
        fatigueBps,
        painBps,
        refusalStrainBps,
        activeTrauma: Object.freeze(activeTrauma.sort()),
    })
}

import type { WoundsModel } from '../wounds.model'
import type WoundsBit from '../fce/wounds.bit'
import type State from '../../99.core/state'
import type {
    WoundRecord,
    SomaticMask,
    KineticAuditQuery,
    KineticAuditReceipt,
    VerbFamilyKey,
} from '../fce/wounds.interface'
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface'

export const VERB_FAMILIES: Record<VerbFamilyKey, readonly string[]> = {
    LOCOMOTION_RAPID: [
        'SPRINT',
        'RUN',
        'DASH',
        'BOLT',
        'VAULT',
        'GALLOP',
        'FLEE',
        'BOUND',
        'CHARGE',
        'LEAP',
        'LUNGE',
        'SCRAMBLE',
        'SCURRY',
        'RAPID_STAIRS',
    ],
    LOCOMOTION_VERTICAL: [
        'CLIMB',
        'SCRAMBLE',
        'SCALE',
        'SHINNY',
        'HOIST_SELF',
        'CLIMB_ROPE',
        'CLIMB_LADDER',
    ],
    BIMANUAL_GRIP: [
        'HEAVE',
        'SWING_TWO_HANDED',
        'WRENCH',
        'PRY_BILATERAL',
        'BIMANUAL_LIFT',
        'GRAPPLE_TWO_HANDED',
        'TWO_HANDED_AIM',
        'HOIST',
        'EMBRACE',
        'WIELD_TWO_HANDED',
        'CLIMB',
    ],
    MANIPULATION_FINE: [
        'UNPICK',
        'THREAD',
        'SPLICE',
        'DISARM_MECHANISM',
        'CARVE',
        'PICK_LOCK',
        'THREAD_NEEDLE',
        'CALIBRATE_DIAL',
        'TIE_KNOT',
        'FINE_DISSECTION',
    ],
    VOCAL_DELIVERY: [
        'SHOUT',
        'SCREAM',
        'BELLOW',
        'CHANT',
        'PROJECT_VOICE',
        'SPEAK',
        'WHISPER',
        'WARN_LOUDLY',
    ],
    SUSPICION_AND_AVOIDANCE: [
        'SUSPECT',
        'SNIFF',
        'INSPECT',
        'HESITATE',
        'POUR_OUT',
        'REFUSE_DRINK',
        'SCRUTINIZE',
    ],
}

export const CONDITION_VERB_ROLLUP: Record<string, readonly string[]> = {
    SEVERED_LEFT_ARM: [...VERB_FAMILIES.BIMANUAL_GRIP],
    SEVERED_RIGHT_ARM: [...VERB_FAMILIES.BIMANUAL_GRIP],
    PARALYZED_LEFT_ARM: [...VERB_FAMILIES.BIMANUAL_GRIP],
    PARALYZED_RIGHT_ARM: [...VERB_FAMILIES.BIMANUAL_GRIP],
    BRACHIAL_PLEXUS_SEVERED: [
        ...VERB_FAMILIES.BIMANUAL_GRIP,
        ...VERB_FAMILIES.MANIPULATION_FINE,
    ],
    AMPUTATED_LIMB: [...VERB_FAMILIES.BIMANUAL_GRIP],
    FRACTURED_FEMUR: [...VERB_FAMILIES.LOCOMOTION_RAPID],
    NEUROPATHY_SHUFFLE: [...VERB_FAMILIES.LOCOMOTION_RAPID],
    STIFF_LEFT_KNEE: ['SPRINT', 'VAULT', 'LEAP', 'LUNGE', 'RAPID_STAIRS'],
    CRUSHED_LARYNX: [...VERB_FAMILIES.VOCAL_DELIVERY],
    SEVERED_TRACHEA: [...VERB_FAMILIES.VOCAL_DELIVERY],
    MUTE: [...VERB_FAMILIES.VOCAL_DELIVERY],
    CONCUSSION_SEVERE: ['SPRINT', 'VAULT', 'TWO_HANDED_AIM', 'PICK_LOCK'],
}

export const compileSomaticMask = (
    entityId: string,
    wounds: WoundRecord[],
    armsAvailable: number,
    legsAvailable: number,
    locomotionTier: LocomotionTier,
): SomaticMask => {
    const bannedSet = new Set<string>()
    const woundTags = new Set<string>()

    // 1. Roll up specific wound conditions
    for (const w of wounds) {
        woundTags.add(w.conditionTag)
        const rollup = CONDITION_VERB_ROLLUP[w.conditionTag.toUpperCase()]
        if (rollup) {
            rollup.forEach((verb) => bannedSet.add(verb.toUpperCase()))
        }
    }

    // 2. Anatomical limb saturation ceilings
    if (armsAvailable < 2) {
        VERB_FAMILIES.BIMANUAL_GRIP.forEach((v) => bannedSet.add(v))
    }
    if (armsAvailable === 0) {
        VERB_FAMILIES.MANIPULATION_FINE.forEach((v) => bannedSet.add(v))
        bannedSet.add('GRASP')
        bannedSet.add('HOLD')
        bannedSet.add('CARRY_HAND')
    }

    // 3. Locomotion tier gait restrictions
    if (legsAvailable < 2 || locomotionTier === 'LIMPING') {
        bannedSet.add('SPRINT')
        bannedSet.add('VAULT')
        bannedSet.add('LEAP')
        bannedSet.add('RAPID_STAIRS')
    }
    if (legsAvailable === 0 || locomotionTier === 'IMMOBILIZED') {
        VERB_FAMILIES.LOCOMOTION_RAPID.forEach((v) => bannedSet.add(v))
        VERB_FAMILIES.LOCOMOTION_VERTICAL.forEach((v) => bannedSet.add(v))
        bannedSet.add('WALK')
        bannedSet.add('STAND')
        bannedSet.add('LIMP')
    }

    return {
        entityId,
        armsAvailable,
        legsAvailable,
        locomotionTier,
        openWounds: Array.from(woundTags).sort(),
        bannedKineticVerbs: Array.from(bannedSet).sort(),
    }
}

export const initWounds = (
    cpy: WoundsModel,
    bal: WoundsBit,
    _ste: State,
): WoundsModel => {
    cpy.woundsByEntity = {}
    cpy.masksByEntity = {}
    if (bal?.slv) bal.slv({ wndBit: { idx: 'init-wounds', val: 0 } })
    return cpy
}

export const updateWounds = (
    cpy: WoundsModel,
    bal: WoundsBit,
    _ste: State,
): WoundsModel => {
    if (bal?.slv) bal.slv({ wndBit: { idx: 'update-wounds' } })
    return cpy
}

export const addWound = (
    cpy: WoundsModel,
    bal: WoundsBit<any>,
    _ste: State,
): WoundsModel => {
    const payload = bal?.dat
    if (!payload?.entityId || !payload?.wound) {
        if (bal?.slv)
            bal.slv({
                wndBit: {
                    idx: 'add-wound-err',
                    src: 'MISSING_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    if (!cpy.woundsByEntity[payload.entityId]) {
        cpy.woundsByEntity[payload.entityId] = []
    }

    cpy.woundsByEntity[payload.entityId].push(payload.wound)

    if (bal?.slv) {
        bal.slv({
            wndBit: {
                idx: 'add-wound',
                src: payload.entityId,
                val: cpy.woundsByEntity[payload.entityId].length,
                dat: payload.wound,
            },
        })
    }
    return cpy
}

export const computeSomaticMaskWounds = (
    cpy: WoundsModel,
    bal: WoundsBit<any>,
    _ste: State,
): WoundsModel => {
    const payload = bal?.dat
    if (!payload?.entityId) {
        if (bal?.slv)
            bal.slv({
                wndBit: {
                    idx: 'compute-somatic-mask-err',
                    src: 'MISSING_ENTITY_ID',
                    val: -1,
                },
            })
        return cpy
    }

    const wounds = cpy.woundsByEntity[payload.entityId] || []
    const mask = compileSomaticMask(
        payload.entityId,
        wounds,
        payload.armsAvailable ?? 2,
        payload.legsAvailable ?? 2,
        payload.locomotionTier ?? 'UNRESTRICTED',
    )

    cpy.masksByEntity[payload.entityId] = mask

    if (bal?.slv) {
        bal.slv({
            wndBit: {
                idx: 'compute-somatic-mask-wounds',
                src: payload.entityId,
                val: mask.bannedKineticVerbs.length,
                dat: mask,
            },
        })
    }
    return cpy
}

export const assertKineticVerbsWounds = async (
    cpy: WoundsModel,
    bal: WoundsBit<any>,
    ste: State,
): Promise<WoundsModel> => {
    const payload = bal?.dat
    if (!payload?.entityId || !payload?.candidateVerbs) {
        if (bal?.slv)
            bal.slv({
                wndBit: {
                    idx: 'assert-kinetic-verbs-err',
                    src: 'MISSING_QUERY',
                    val: -1,
                },
            })
        return cpy
    }

    const mask = cpy.masksByEntity[payload.entityId] || {
        entityId: payload.entityId,
        armsAvailable: 2,
        legsAvailable: 2,
        locomotionTier: 'UNRESTRICTED',
        openWounds: [],
        bannedKineticVerbs: [],
    }

    const bannedSet = new Set(mask.bannedKineticVerbs)
    const breachedVerbs: string[] = []

    // Constant-time O(1) set-intersection check per candidate action lemma
    for (const verb of payload.candidateVerbs) {
        const normalized = verb.trim().toUpperCase()
        if (bannedSet.has(normalized)) {
            breachedVerbs.push(normalized)
        }
    }

    const allowed = breachedVerbs.length === 0
    const receipt: KineticAuditReceipt = {
        allowed,
        entityId: payload.entityId,
        breachedVerbs: breachedVerbs.sort(),
        bannedKineticVerbs: mask.bannedKineticVerbs,
        timestampIso: new Date().toISOString(),
    }

    // Pure 7-bit ASCII logging to cns00 when an anatomical breach is intercepted
    if (!allowed && ste && typeof ste.hunt === 'function') {
        const errorMsg = `>> [SOMATIC_CAPABILITY_BREACH] Actor ${payload.entityId} attempted banned verb(s): [${breachedVerbs.join(', ')}]`
        await ste
            .hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: errorMsg,
            })
            .catch(() => {})
    }

    if (bal?.slv) {
        bal.slv({
            wndBit: {
                idx: allowed
                    ? 'assert-kinetic-verbs-ok'
                    : 'assert-kinetic-verbs-breached',
                src: payload.entityId,
                val: breachedVerbs.length,
                dat: receipt,
            },
        })
    }

    return cpy
}

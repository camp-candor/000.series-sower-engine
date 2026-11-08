/**
 * 19.wounds.unit - Wounds Buzz Business Logic
 * Semantic verb taxonomy, feature roll-up, and O(1) Somatic Panopticon gate.
 */
import { WoundsModel } from '../wounds.model.js'
import type WoundsBit from '../fce/wounds.bit.js'
import type {
    VerbFamilyKey,
    WoundRecord,
    SomaticMask,
    KineticAuditQuery,
    KineticAuditReceipt,
} from '../fce/wounds.interface.js'
import type State from '../../99.core/state.js'

export const VERB_FAMILIES: Record<VerbFamilyKey, readonly string[]> = {
    LOCOMOTION_RAPID: Object.freeze([
        'BOLT',
        'BOUND',
        'CHARGE',
        'DASH',
        'FLEE',
        'GALLOP',
        'LEAP',
        'LUNGE',
        'RAPID_STAIRS',
        'RUN',
        'SCRAMBLE',
        'SCURRY',
        'SPRINT',
        'VAULT',
    ]),
    LOCOMOTION_VERTICAL: Object.freeze([
        'CLIMB',
        'CLIMB_LADDER',
        'CLIMB_ROPE',
        'HOIST_SELF',
        'SCALE',
        'SCRAMBLE',
        'SHINNY',
    ]),
    BIMANUAL_GRIP: Object.freeze([
        'BIMANUAL_LIFT',
        'CLIMB',
        'EMBRACE',
        'GRAPPLE_TWO_HANDED',
        'HEAVE',
        'HOIST',
        'PRY_BILATERAL',
        'SWING_TWO_HANDED',
        'TWO_HANDED_AIM',
        'WIELD_TWO_HANDED',
        'WRENCH',
    ]),
    MANIPULATION_FINE: Object.freeze([
        'CALIBRATE_DIAL',
        'CARVE',
        'DISARM_MECHANISM',
        'FINE_DISSECTION',
        'PICK_LOCK',
        'SPLICE',
        'THREAD',
        'THREAD_NEEDLE',
        'TIE_KNOT',
        'UNPICK',
    ]),
    VOCAL_DELIVERY: Object.freeze([
        'BELLOW',
        'CHANT',
        'PROJECT_VOICE',
        'SCREAM',
        'SHOUT',
        'SPEAK',
        'WARN_LOUDLY',
        'WHISPER',
    ]),
    SUSPICION_AND_AVOIDANCE: Object.freeze([
        'HESITATE',
        'INSPECT',
        'POUR_OUT',
        'REFUSE_DRINK',
        'SCRUTINIZE',
        'SNIFF',
        'SUSPECT',
    ]),
}

export const CONDITION_VERB_ROLLUP: Record<string, readonly VerbFamilyKey[]> = {
    SEVERED_LEFT_ARM: ['BIMANUAL_GRIP'],
    SEVERED_RIGHT_ARM: ['BIMANUAL_GRIP'],
    BRACHIAL_PLEXUS_SEVERED: ['BIMANUAL_GRIP'],
    PARALYZED_LEFT_ARM: ['BIMANUAL_GRIP'],
    PARALYZED_RIGHT_ARM: ['BIMANUAL_GRIP'],
    FRACTURED_FEMUR: ['LOCOMOTION_RAPID', 'LOCOMOTION_VERTICAL'],
    NEUROPATHY_SHUFFLE: ['LOCOMOTION_RAPID'],
    CRUSHED_LARYNX: ['VOCAL_DELIVERY'],
    SEVERED_TRACHEA: ['VOCAL_DELIVERY'],
    MUTE: ['VOCAL_DELIVERY'],
}

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

export function compileSomaticMask(
    entityId: string,
    wounds: readonly WoundRecord[],
    armsAvailable: number,
    legsAvailable: number,
    locomotionTier: string,
    timestampMs: number = 1700000000000,
): SomaticMask {
    const banned = new Set<string>()
    const openWoundsSet = new Set<string>()

    // 1. Roll-up from open wounds & condition tags
    for (const w of wounds) {
        openWoundsSet.add(w.conditionTag)
        const families = CONDITION_VERB_ROLLUP[w.conditionTag] || []
        for (const fam of families) {
            for (const verb of VERB_FAMILIES[fam]) {
                banned.add(verb)
            }
        }
    }

    // 2. Anatomical limb constraints
    if (armsAvailable < 2) {
        for (const verb of VERB_FAMILIES.BIMANUAL_GRIP) {
            banned.add(verb)
        }
        banned.add('HEAVY_REACH')
    }

    if (armsAvailable === 0) {
        for (const verb of VERB_FAMILIES.MANIPULATION_FINE) {
            banned.add(verb)
        }
        banned.add('GRASP')
    }

    // 3. Locomotion tier constraints
    if (locomotionTier === 'LIMPING') {
        for (const verb of VERB_FAMILIES.LOCOMOTION_RAPID) {
            banned.add(verb)
        }
    } else if (locomotionTier === 'IMMOBILIZED') {
        for (const verb of VERB_FAMILIES.LOCOMOTION_RAPID) {
            banned.add(verb)
        }
        for (const verb of VERB_FAMILIES.LOCOMOTION_VERTICAL) {
            banned.add(verb)
        }
        banned.add('STAND')
        banned.add('WALK')
    }

    const sortedOpenWounds = Object.freeze(Array.from(openWoundsSet).sort())
    const sortedBannedVerbs = Object.freeze(Array.from(banned).sort())

    return {
        entityId,
        armsAvailable,
        legsAvailable,
        locomotionTier: locomotionTier as any,
        openWounds: sortedOpenWounds,
        bannedKineticVerbs: sortedBannedVerbs,
        compiledAtMs: timestampMs,
    }
}

export const initWounds = (
    cpy: WoundsModel,
    bal?: WoundsBit,
    _ste?: State,
): WoundsModel => {
    cpy.woundsByEntity = {}
    cpy.masksByEntity = {}
    if (bal?.slv) {
        bal.slv({
            wndBit: {
                idx: 'init-wounds-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateWounds = (
    cpy: WoundsModel,
    bal?: WoundsBit,
    _ste?: State,
): WoundsModel => {
    if (bal?.slv) {
        bal.slv({
            wndBit: {
                idx: 'update-wounds-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const addWoundAction = async (
    cpy: WoundsModel,
    bal: WoundsBit,
    ste?: State,
): Promise<WoundsModel> => {
    const wound: WoundRecord | undefined = bal.dat?.wound
    if (!wound || !wound.entityId || !wound.conditionTag) {
        const errorMsg = '[INVALID_WOUND] Missing entityId or conditionTag'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                wndBit: {
                    idx: 'add-wound-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
        return cpy
    }

    if (!cpy.woundsByEntity[wound.entityId]) {
        cpy.woundsByEntity[wound.entityId] = []
    }
    cpy.woundsByEntity[wound.entityId].push(wound)

    await emitConsole(
        ste,
        `>> [WOUNDS:ADD] [${wound.entityId}] Incurred wound '${wound.woundId}': [${wound.conditionTag}] at ${wound.locus} (${wound.severityBps} bps)`,
    )

    if (bal.slv) {
        bal.slv({
            wndBit: {
                idx: 'add-wound-pass',
                val: cpy.woundsByEntity[wound.entityId].length,
                dat: { wound },
            },
        })
    }
    return cpy
}

export const compileSomaticMaskWoundsAction = async (
    cpy: WoundsModel,
    bal: WoundsBit,
    ste?: State,
): Promise<WoundsModel> => {
    const entityId = bal.dat?.entityId || bal.src
    if (!entityId) {
        if (bal.slv) {
            bal.slv({
                wndBit: {
                    idx: 'compile-mask-fail',
                    val: 0,
                    dat: { error: '[MISSING_ENTITY_ID] entityId required to compile mask' },
                },
            })
        }
        return cpy
    }

    const wounds = cpy.woundsByEntity[entityId] || []
    const arms = bal.dat?.armsAvailable ?? 2
    const legs = bal.dat?.legsAvailable ?? 2
    const tier = bal.dat?.locomotionTier || 'UNRESTRICTED'
    const timestampMs = bal.dat?.timestampMs || 1700000000000

    const mask = compileSomaticMask(entityId, wounds, arms, legs, tier, timestampMs)
    cpy.masksByEntity[entityId] = mask

    await emitConsole(
        ste,
        `>> [PANOPTICON:MASK] [${entityId}] Compiled negative motor mask: ${mask.bannedKineticVerbs.length} banned verbs across ${mask.openWounds.length} open wounds.`,
    )

    if (bal.slv) {
        bal.slv({
            mask,
            wndBit: {
                idx: 'compile-mask-pass',
                val: mask.bannedKineticVerbs.length,
                dat: { mask },
            },
        })
    }
    return cpy
}

export const assertKineticVerbsWoundsAction = async (
    cpy: WoundsModel,
    bal: WoundsBit,
    ste?: State,
): Promise<WoundsModel> => {
    const query: KineticAuditQuery | undefined = bal.dat?.auditQuery
    if (!query || !query.entityId || !query.proposedVerbs) {
        const errorMsg = '[INVALID_AUDIT_QUERY] Missing entityId or proposedVerbs'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                wndBit: {
                    idx: 'assert-kinetic-verbs-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
        return cpy
    }

    const mask = cpy.masksByEntity[query.entityId] || {
        entityId: query.entityId,
        armsAvailable: 2,
        legsAvailable: 2,
        locomotionTier: 'UNRESTRICTED',
        openWounds: [],
        bannedKineticVerbs: [],
        compiledAtMs: 1700000000000,
    }

    // O(1) Set-lookup for fast collision detection
    const bannedLookup = new Set(mask.bannedKineticVerbs)
    const breached: string[] = []

    for (const v of query.proposedVerbs) {
        const upper = v.trim().toUpperCase()
        if (bannedLookup.has(upper)) {
            breached.push(upper)
        }
    }

    const permitted = breached.length === 0
    const receipt: KineticAuditReceipt = {
        entityId: query.entityId,
        permitted,
        breachedVerbs: Object.freeze(breached),
        totalBannedVerbsCount: mask.bannedKineticVerbs.length,
        timestampMs: 1700000000000,
    }

    if (!permitted) {
        await emitConsole(
            ste,
            `:: [SOMATIC_CAPABILITY_BREACH] [${query.entityId}] Blocked motor verbs at T_0 = $0.00: [${breached.join(', ')}]`,
        )
    } else {
        await emitConsole(
            ste,
            `>> [PANOPTICON:PASS] [${query.entityId}] Proposed motor verbs cleared in O(1) set-lookup.`,
        )
    }

    if (bal.slv) {
        bal.slv({
            auditReceipt: receipt,
            wndBit: {
                idx: permitted ? 'assert-kinetic-verbs-pass' : 'somatic-capability-breach',
                val: permitted ? 1 : -1,
                src: permitted ? '[OK]' : '[SOMATIC_CAPABILITY_BREACH]',
                dat: { auditReceipt: receipt },
            },
        })
    }

    return cpy
}

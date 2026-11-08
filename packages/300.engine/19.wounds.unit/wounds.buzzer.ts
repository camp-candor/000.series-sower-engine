/**
 * 19.wounds.unit - Wounds Buzzer Barrel Export
 */
export {
    initWounds,
    updateWounds,
    addWoundAction,
    compileSomaticMaskWoundsAction,
    assertKineticVerbsWoundsAction,
    compileSomaticMask,
    VERB_FAMILIES,
    CONDITION_VERB_ROLLUP,
} from './buz/wounds.buzz.js'
export type {
    VerbFamilyKey,
    WoundRecord,
    SomaticMask,
    KineticAuditQuery,
    KineticAuditReceipt,
} from './fce/wounds.interface.js'
export type {
    WoundsPayload,
} from './fce/wounds.bit.js'

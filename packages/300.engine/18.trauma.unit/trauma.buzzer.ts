/**
 * 18.trauma.unit - Trauma Buzzer Barrel Export
 */
export {
    initTrauma,
    updateTrauma,
    applyTraumaAction,
    decayFatigueTraumaAction,
    clampBasisPointsTraumaAction,
    getSomaticStateAction,
    assertBasisPoint,
    deriveLocomotionTier,
} from './buz/trauma.buzz.js'
export type {
    LocomotionTier,
    SomaticTraumaState,
    TraumaDeltaPayload,
    RefusalStrainReport,
} from './fce/trauma.interface.js'
export type { TraumaPayload } from './fce/trauma.bit.js'

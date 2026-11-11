/**
 * 03.entity.unit - Entity Buzzer Barrel Export
 */
export {
    initEntity,
    updateEntity,
    assembleEntityAction,
    upsertEntityLiveAction,
    getEntityLiveAction,
    listEntitiesByLocationAction,
    hydrateAllEntitiesAction,
    serializeEntityToDbRow,
    deserializeDbRowToEntity,
    assembleCompositeEntity,
} from './buz/entity.buzz.js'
export type {
    CompositeEntityState,
    EntityLiveDbRow,
    AssembleEntityParams,
    EntityQueryFilter,
} from './fce/entity.interface.js'
export type { EntityPayload } from './fce/entity.bit.js'

export { extractSomaticState } from './buz/somatic-query.buzz.js'
export {
    BASE_MOVEMENT_UNIT_COST,
    deriveSomaticBudget,
    validateHandCapacity,
} from './buz/budget-calculator.buzz.js'

export type {
    LocomotionTier,
    SomaticState,
    SomaticBudgetReceipt,
    HeldItemDescriptor,
    HandLoadEvaluation,
} from './fce/somatic-budget.interface.js'

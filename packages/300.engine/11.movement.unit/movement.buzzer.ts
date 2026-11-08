/**
 * 11.movement.unit - Movement Buzzer Barrel Export
 */
export {
    initMovement,
    updateMovement,
    setActorPositionAction,
    calculateDistanceAction,
    assertInteractionRangeAction,
    executeMovementAction,
    getActorPositionAction,
    axialDistance,
    calculateTerrainCost,
    cellKey,
} from './buz/movement.buzz.js'
export type {
    AxialCoord,
    TerrainType,
    ActorMovementState,
    MovementRequest,
    MovementReceipt,
    DistanceAuditReceipt,
} from './fce/movement.interface.js'
export type {
    MovementPayload,
} from './fce/movement.bit.js'

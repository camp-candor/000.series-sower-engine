/**
 * 11.movement.unit - Movement Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type MovementBit from './fce/movement.bit.js'

export const INIT_MOVEMENT = '[Movement action] Init Movement'
export class InitMovement implements Action {
    readonly type = INIT_MOVEMENT
    constructor(public bale?: MovementBit) {}
}

export const UPDATE_MOVEMENT = '[Movement action] Update Movement'
export class UpdateMovement implements Action {
    readonly type = UPDATE_MOVEMENT
    constructor(public bale?: MovementBit) {}
}

export const SET_ACTOR_POSITION = '[Movement action] Set Actor Position'
export class SetActorPosition implements Action {
    readonly type = SET_ACTOR_POSITION
    constructor(public bale?: MovementBit) {}
}

export const CALCULATE_DISTANCE = '[Movement action] Calculate Distance'
export class CalculateDistance implements Action {
    readonly type = CALCULATE_DISTANCE
    constructor(public bale?: MovementBit) {}
}

export const ASSERT_INTERACTION_RANGE =
    '[Movement action] Assert Interaction Range'
export class AssertInteractionRange implements Action {
    readonly type = ASSERT_INTERACTION_RANGE
    constructor(public bale?: MovementBit) {}
}

export const EXECUTE_MOVEMENT = '[Movement action] Execute Movement'
export class ExecuteMovement implements Action {
    readonly type = EXECUTE_MOVEMENT
    constructor(public bale?: MovementBit) {}
}

export const GET_ACTOR_POSITION = '[Movement action] Get Actor Position'
export class GetActorPosition implements Action {
    readonly type = GET_ACTOR_POSITION
    constructor(public bale?: MovementBit) {}
}

export type Actions =
    | InitMovement
    | UpdateMovement
    | SetActorPosition
    | CalculateDistance
    | AssertInteractionRange
    | ExecuteMovement
    | GetActorPosition

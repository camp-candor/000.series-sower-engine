import type { Action } from '../99.core/interface/action.interface'
import type MovementBit from './fce/movement.bit'

export const INIT_MOVEMENT = '[Movement action] Init Movement'
export class InitMovement implements Action<MovementBit> {
    readonly type = INIT_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export const UPDATE_MOVEMENT = '[Movement action] Update Movement'
export class UpdateMovement implements Action<MovementBit> {
    readonly type = UPDATE_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export const SET_ACTOR_POSITION_MOVEMENT =
    '[Movement action] Set Actor Position Movement'
export class SetActorPositionMovement implements Action<MovementBit> {
    readonly type = SET_ACTOR_POSITION_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export const EVALUATE_MOVE_MOVEMENT = '[Movement action] Evaluate Move Movement'
export class EvaluateMoveMovement implements Action<MovementBit> {
    readonly type = EVALUATE_MOVE_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export type Actions =
    | InitMovement
    | UpdateMovement
    | SetActorPositionMovement
    | EvaluateMoveMovement

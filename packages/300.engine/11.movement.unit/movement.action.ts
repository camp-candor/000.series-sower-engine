import { Action } from '../99.core/interface/action.interface.js'
import MovementBit from './fce/movement.bit.js'

// Movement actions

export const INIT_MOVEMENT = '[Movement action] Init Movement'
export class InitMovement implements Action {
    readonly type = INIT_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export const UPDATE_MOVEMENT = '[Movement action] Update Movement'
export class UpdateMovement implements Action {
    readonly type = UPDATE_MOVEMENT
    constructor(public bale: MovementBit) {}
}

export type Actions = InitMovement | UpdateMovement

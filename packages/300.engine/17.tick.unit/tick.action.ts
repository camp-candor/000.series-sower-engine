import { Action } from '../99.core/interface/action.interface.js'
import TickBit from './fce/tick.bit.js'

// Tick actions

export const INIT_TICK = '[Tick action] Init Tick'
export class InitTick implements Action {
    readonly type = INIT_TICK
    constructor(public bale: TickBit) {}
}

export const UPDATE_TICK = '[Tick action] Update Tick'
export class UpdateTick implements Action {
    readonly type = UPDATE_TICK
    constructor(public bale: TickBit) {}
}

export type Actions = InitTick | UpdateTick

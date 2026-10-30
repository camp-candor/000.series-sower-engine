import { Action } from '../99.core/interface/action.interface.js'
import EventBit from './fce/event.bit.js'

// Event actions

export const INIT_EVENT = '[Event action] Init Event'
export class InitEvent implements Action {
    readonly type = INIT_EVENT
    constructor(public bale: EventBit) {}
}

export const UPDATE_EVENT = '[Event action] Update Event'
export class UpdateEvent implements Action {
    readonly type = UPDATE_EVENT
    constructor(public bale: EventBit) {}
}

export type Actions = InitEvent | UpdateEvent

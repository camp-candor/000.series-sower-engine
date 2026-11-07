/**
 * 05.event.unit - Event Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type EventBit from './fce/event.bit.js'

export const INIT_EVENT = '[Event action] Init Event'
export class InitEvent implements Action {
    readonly type = INIT_EVENT
    constructor(public bale?: EventBit) {}
}

export const UPDATE_EVENT = '[Event action] Update Event'
export class UpdateEvent implements Action {
    readonly type = UPDATE_EVENT
    constructor(public bale?: EventBit) {}
}

export const APPEND_EVENT = '[Event action] Append Event'
export class AppendEvent implements Action {
    readonly type = APPEND_EVENT
    constructor(public bale?: EventBit) {}
}

export const STREAM_EVENTS = '[Event action] Stream Events'
export class StreamEvents implements Action {
    readonly type = STREAM_EVENTS
    constructor(public bale?: EventBit) {}
}

export const REGISTER_UPCASTER = '[Event action] Register Upcaster'
export class RegisterUpcaster implements Action {
    readonly type = REGISTER_UPCASTER
    constructor(public bale?: EventBit) {}
}

export const UPCAST_EVENT = '[Event action] Upcast Event'
export class UpcastEvent implements Action {
    readonly type = UPCAST_EVENT
    constructor(public bale?: EventBit) {}
}

export type Actions =
    | InitEvent
    | UpdateEvent
    | AppendEvent
    | StreamEvents
    | RegisterUpcaster
    | UpcastEvent

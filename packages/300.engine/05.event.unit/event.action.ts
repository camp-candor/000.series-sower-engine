import type { Action } from '../99.core/interface/action.interface'
import type EventBit from './fce/event.bit'

export const INIT_EVENT = '[Event action] Init Event'
export class InitEvent implements Action<EventBit> {
    readonly type = INIT_EVENT
    constructor(public bale: EventBit) {}
}

export const UPDATE_EVENT = '[Event action] Update Event'
export class UpdateEvent implements Action<EventBit> {
    readonly type = UPDATE_EVENT
    constructor(public bale: EventBit) {}
}

export const REGISTER_UPCASTER_EVENT = '[Event action] Register Upcaster Event'
export class RegisterUpcasterEvent implements Action<EventBit> {
    readonly type = REGISTER_UPCASTER_EVENT
    constructor(public bale: EventBit) {}
}

export const UPCAST_EVENT = '[Event action] Upcast Event'
export class UpcastEvent implements Action<EventBit> {
    readonly type = UPCAST_EVENT
    constructor(public bale: EventBit) {}
}

export const APPEND_EVENT = '[Event action] Append Event'
export class AppendEvent implements Action<EventBit> {
    readonly type = APPEND_EVENT
    constructor(public bale: EventBit) {}
}

export const STREAM_EVENTS = '[Event action] Stream Events'
export class StreamEvents implements Action<EventBit> {
    readonly type = STREAM_EVENTS
    constructor(public bale: EventBit) {}
}

export const GET_EVENT_BY_ID = '[Event action] Get Event By Id'
export class GetEventById implements Action<EventBit> {
    readonly type = GET_EVENT_BY_ID
    constructor(public bale: EventBit) {}
}

export type Actions =
    | InitEvent
    | UpdateEvent
    | RegisterUpcasterEvent
    | UpcastEvent
    | AppendEvent
    | StreamEvents
    | GetEventById

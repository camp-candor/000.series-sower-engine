/**
 * 12.paranoia.unit - Paranoia Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type ParanoiaBit from './fce/paranoia.bit.js'

export const INIT_PARANOIA = '[Paranoia action] Init Paranoia'
export class InitParanoia implements Action {
    readonly type = INIT_PARANOIA
    constructor(public bale?: ParanoiaBit) {}
}

export const UPDATE_PARANOIA = '[Paranoia action] Update Paranoia'
export class UpdateParanoia implements Action {
    readonly type = UPDATE_PARANOIA
    constructor(public bale?: ParanoiaBit) {}
}

export const TICK_CLOCK = '[Paranoia action] Tick Clock'
export class TickClock implements Action {
    readonly type = TICK_CLOCK
    constructor(public bale?: ParanoiaBit) {}
}

export const DISPATCH_CLOCK = '[Paranoia action] Dispatch Clock'
export class DispatchClock implements Action {
    readonly type = DISPATCH_CLOCK
    constructor(public bale?: ParanoiaBit) {}
}

export const DECAY_CLOCKS = '[Paranoia action] Decay Clocks'
export class DecayClocks implements Action {
    readonly type = DECAY_CLOCKS
    constructor(public bale?: ParanoiaBit) {}
}

export const QUERY_CLOCK_STATE = '[Paranoia action] Query Clock State'
export class QueryClockState implements Action {
    readonly type = QUERY_CLOCK_STATE
    constructor(public bale?: ParanoiaBit) {}
}

export type Actions =
    | InitParanoia
    | UpdateParanoia
    | TickClock
    | DispatchClock
    | DecayClocks
    | QueryClockState

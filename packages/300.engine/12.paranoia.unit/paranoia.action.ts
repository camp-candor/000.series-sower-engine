import type { Action } from '../99.core/interface/action.interface'
import type ParanoiaBit from './fce/paranoia.bit'

export const INIT_PARANOIA = '[Paranoia action] Init Paranoia'
export class InitParanoia implements Action<ParanoiaBit> {
    readonly type = INIT_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const UPDATE_PARANOIA = '[Paranoia action] Update Paranoia'
export class UpdateParanoia implements Action<ParanoiaBit> {
    readonly type = UPDATE_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const UPSERT_CLOCK_PARANOIA = '[Paranoia action] Upsert Clock Paranoia'
export class UpsertClockParanoia implements Action<ParanoiaBit> {
    readonly type = UPSERT_CLOCK_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const TICK_CLOCK_PARANOIA = '[Paranoia action] Tick Clock Paranoia'
export class TickClockParanoia implements Action<ParanoiaBit> {
    readonly type = TICK_CLOCK_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const DECAY_CLOCK_PARANOIA = '[Paranoia action] Decay Clock Paranoia'
export class DecayClockParanoia implements Action<ParanoiaBit> {
    readonly type = DECAY_CLOCK_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const SWEEP_BOIL_OVER_PARANOIA =
    '[Paranoia action] Sweep Boil Over Paranoia'
export class SweepBoilOverParanoia implements Action<ParanoiaBit> {
    readonly type = SWEEP_BOIL_OVER_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const RESET_CLOCK_PARANOIA = '[Paranoia action] Reset Clock Paranoia'
export class ResetClockParanoia implements Action<ParanoiaBit> {
    readonly type = RESET_CLOCK_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export type Actions =
    | InitParanoia
    | UpdateParanoia
    | UpsertClockParanoia
    | TickClockParanoia
    | DecayClockParanoia
    | SweepBoilOverParanoia
    | ResetClockParanoia

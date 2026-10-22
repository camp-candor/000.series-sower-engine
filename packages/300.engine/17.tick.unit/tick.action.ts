import type { Action } from '../99.core/interface/action.interface'
import type TickBit from './fce/tick.bit'

export const INIT_TICK = '[Tick action] Init Tick'
export class InitTick implements Action<TickBit> {
    readonly type = INIT_TICK
    constructor(public bale: TickBit) {}
}

export const UPDATE_TICK = '[Tick action] Update Tick'
export class UpdateTick implements Action<TickBit> {
    readonly type = UPDATE_TICK
    constructor(public bale: TickBit) {}
}

export const ADVANCE_TICK = '[Tick action] Advance Tick'
export class AdvanceTick implements Action<TickBit> {
    readonly type = ADVANCE_TICK
    constructor(public bale: TickBit) {}
}

export const DERIVE_SEED_TICK = '[Tick action] Derive Seed Tick'
export class DeriveSeedTick implements Action<TickBit> {
    readonly type = DERIVE_SEED_TICK
    constructor(public bale: TickBit) {}
}

export const EXECUTE_DECAY_SWEEP_TICK = '[Tick action] Execute Decay Sweep Tick'
export class ExecuteDecaySweepTick implements Action<TickBit> {
    readonly type = EXECUTE_DECAY_SWEEP_TICK
    constructor(public bale: TickBit) {}
}

export const RESET_TICK = '[Tick action] Reset Tick'
export class ResetTick implements Action<TickBit> {
    readonly type = RESET_TICK
    constructor(public bale: TickBit) {}
}

export type Actions =
    | InitTick
    | UpdateTick
    | AdvanceTick
    | DeriveSeedTick
    | ExecuteDecaySweepTick
    | ResetTick

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

export const SET_SIMULATION_CHRONOLOGY =
    '[Tick action] Set Simulation Chronology'
export class SetSimulationChronology implements Action {
    readonly type = SET_SIMULATION_CHRONOLOGY
    constructor(public bale: TickBit) {}
}

export const ADVANCE_SIMULATION_CLOCK = '[Tick action] Advance Simulation Clock'
export class AdvanceSimulationClock implements Action {
    readonly type = ADVANCE_SIMULATION_CLOCK
    constructor(public bale: TickBit) {}
}

export const READ_SIMULATION_TIMECODE = '[Tick action] Read Simulation Timecode'
export class ReadSimulationTimecode implements Action {
    readonly type = READ_SIMULATION_TIMECODE
    constructor(public bale: TickBit) {}
}

export type Actions =
    | InitTick
    | UpdateTick
    | SetSimulationChronology
    | AdvanceSimulationClock
    | ReadSimulationTimecode

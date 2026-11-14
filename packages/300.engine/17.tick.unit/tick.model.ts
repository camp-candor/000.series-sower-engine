import Tick from './fce/tick.interface.js'
import type { SimulationClockState } from './fce/tick.interface.js'
import { normalizeLoreChronology } from './fce/tick.interface.js'

export class TickModel implements Tick {
    tickCount: number = 0
    simTime: number = 0
    tickSeconds: number = 60
    framesPerSecond: number = 24
    clockState: SimulationClockState = normalizeLoreChronology(null)
}

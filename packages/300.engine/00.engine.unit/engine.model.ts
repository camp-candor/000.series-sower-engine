/**
 * 00.engine.unit - Engine State Model Container
 */
import type Engine from './fce/engine.interface.js'
import type {
    EngineStatus,
    EngineAuditReceipt,
    EngineStatusReport,
} from './fce/engine.interface.js'
import type { SimulationClockState } from '../17.tick.unit/fce/tick.interface.js'
import { normalizeLoreChronology } from '../17.tick.unit/fce/tick.interface.js'

export class EngineModel implements Engine {
    idx: string = '00.engine'
    status: EngineStatus = 'OFFLINE'
    booted: boolean = false
    seriesSlug: string = ''
    lastBootMs: number = 0
    headSequence: number = 0
    activeSeriesSlug?: string
    lastStateHash: string = '0'.repeat(64)
    lastAuditReceipt?: EngineAuditReceipt
    lastStatusReport?: EngineStatusReport
    activeChronology?: SimulationClockState = normalizeLoreChronology(null)
}

export default EngineModel

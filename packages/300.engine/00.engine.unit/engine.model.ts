/**
 * 00.engine.unit - Engine State Model Container
 */
import type Engine from './fce/engine.interface.js'
import type {
    EngineStatus,
    EngineAuditReceipt,
    EngineStatusReport,
} from './fce/engine.interface.js'

export class EngineModel implements Engine {
    idx: string = '00.engine'
    status: EngineStatus = 'OFFLINE'
    booted: boolean = false
    seriesSlug: string = 'under-the-floorboards'
    lastBootMs: number = 0
    headSequence?: number
    activeSeriesSlug?: string
    lastStateHash: string = '0'.repeat(64)
    lastAuditReceipt?: EngineAuditReceipt
    lastStatusReport?: EngineStatusReport
}

export default EngineModel

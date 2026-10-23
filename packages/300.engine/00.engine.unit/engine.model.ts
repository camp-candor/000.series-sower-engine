import type Engine from './fce/engine.interface'
import type {
    EngineAuditReceipt,
    TableStatsReport,
} from './fce/engine.interface'

export class EngineModel implements Engine {
    idx = '00.engine'
    status: 'OFFLINE' | 'BOOTING' | 'READY' | 'ERROR' = 'OFFLINE'
    lastBootMs = 0
    lastAuditReceipt: EngineAuditReceipt | null = null
    lastStatsReport: TableStatsReport | null = null
}

export default EngineModel

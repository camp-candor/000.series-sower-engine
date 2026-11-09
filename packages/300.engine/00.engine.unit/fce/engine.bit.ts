/**
 * 00.engine.unit - Engine Bit Payload Contracts
 */
import type {
    EngineStatus,
    EngineStatusReport,
    EngineAuditReceipt,
    EngineBootReceipt,
    BootEngineParams,
} from './engine.interface.js'

export interface EnginePayload {
    readonly seriesSlug?: string
    readonly status?: EngineStatus
    readonly bootParams?: BootEngineParams
    readonly bootReceipt?: EngineBootReceipt
    readonly report?: EngineStatusReport
    readonly receipt?: EngineAuditReceipt
    readonly timestampMs?: number
    readonly error?: string
}

export default interface EngineBit {
    idx: string
    src?: string
    val?: number
    dat?: EnginePayload
    lst?: readonly any[]
    slv?: Function
}

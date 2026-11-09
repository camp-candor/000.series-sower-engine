/**
 * 00.engine.unit - Engine Master Lifecycle Contracts
 * Master boot sequence, status telemetry, and T_0 pre-flight invariant audits.
 */

export type EngineStatus = 'OFFLINE' | 'BOOTING' | 'READY' | 'ERROR'

export interface TableStatusReport {
    readonly tableName: string
    readonly rowCount: number
}

export interface EngineStatusReport {
    readonly status: EngineStatus
    readonly seriesSlug: string
    readonly tick: number
    readonly lastStateHash: string
    readonly tables: readonly TableStatusReport[]
    readonly totalRows: number
    readonly timestampMs: number
}

export interface EngineAuditReceipt {
    readonly immutabilityBlocked: boolean
    readonly handCapacityBlocked: boolean
    readonly antiReflexivityBlocked: boolean
    readonly auditPassed: boolean
    readonly auditHash: string
    readonly timestampMs: number
    readonly error?: string
}

export interface EngineBootReceipt {
    readonly success: boolean
    readonly seriesSlug: string
    readonly stateHash: string
    readonly durationMs: number
    readonly timestampMs: number
    readonly error?: string
}

export interface BootEngineParams {
    readonly seriesSlug?: string
    readonly seedGenesis?: boolean
    readonly timestampMs?: number
}

export default interface Engine {
    idx: string
    status: EngineStatus
    booted: boolean
    seriesSlug: string
    lastBootMs: number
    lastStateHash: string
    lastAuditReceipt?: EngineAuditReceipt
    lastStatusReport?: EngineStatusReport
}

export interface TableStatsReport {
    readonly event_log_count: number
    readonly entities_live_count: number
    readonly strings_ledger_count: number
    readonly grievance_status_count: number
    readonly paranoia_clocks_count: number
    readonly actor_beliefs_count: number
    readonly unratified_details_count: number
    readonly current_state_hash: string
    readonly head_sequence: number
}

export interface EngineAuditReceipt {
    readonly audit_pass: boolean
    readonly audit_hash: string
    readonly timestamp_ms: number
    readonly probes: {
        readonly immutability_trigger_probe: 'PASSED' | 'FAILED'
        readonly hand_capacity_probe: 'PASSED' | 'FAILED'
        readonly anti_reflexivity_probe: 'PASSED' | 'FAILED'
    }
    readonly details: readonly string[]
}

export default interface Engine {
    idx: string
    status: 'OFFLINE' | 'BOOTING' | 'READY' | 'ERROR'
    lastBootMs: number
    lastAuditReceipt: EngineAuditReceipt | null
    lastStatsReport: TableStatsReport | null
}

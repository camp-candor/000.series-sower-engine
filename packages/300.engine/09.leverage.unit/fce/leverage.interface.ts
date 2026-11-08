/**
 * 09.leverage.unit - Leverage Interface Contracts
 * Directional social debt records, anti-reflexivity validation, and solvency tracking.
 */

export interface StringsLedgerRecord {
    readonly relation_id: string // Format: `${holder_id}->${debtor_id}`
    readonly holder_id: string
    readonly debtor_id: string
    readonly weight_bps: number // [0, 10000] basis points (10000 = 100%)
    readonly strings_count: number // Non-negative integer
    readonly updated_at_ms: number
}

export interface MutateLeverageParams {
    readonly holder_id: string
    readonly debtor_id: string
    readonly strings_count: number // New absolute count or delta
    readonly delta_mode?: boolean // If true, adds strings_count to existing
    readonly weight_bps?: number // [0, 10000]
    readonly tick?: number
    readonly timestamp_ms?: number
    readonly reason?: string
}

export interface SpendLeverageParams {
    readonly holder_id: string
    readonly debtor_id: string
    readonly spend_count: number // Integer >= 1
    readonly tick?: number
    readonly timestamp_ms?: number
    readonly reason?: string
}

export interface LeverageSpendReceipt {
    readonly success: boolean
    readonly relation_id: string
    readonly holder_id: string
    readonly debtor_id: string
    readonly spent_count: number
    readonly remaining_strings_count: number
    readonly weight_bps: number
    readonly error?: string
    readonly timestamp_ms: number
}

export interface LeverageAuditReport {
    readonly valid: boolean
    readonly totalRecords: number
    readonly totalActiveStrings: number
    readonly selfReferentialBreaches: readonly string[]
    readonly negativeStringBreaches: readonly string[]
    readonly timestamp_ms: number
}

export default interface Leverage {
    idx: string
    records: Map<string, StringsLedgerRecord>
}

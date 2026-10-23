/**
 * 09.leverage.unit - Directional Social Debt Vector
 * Invariant: Social debt is anti-reflexive (holder_id !== debtor_id).
 */
export interface StringsLedgerRecord {
    relation_id: string
    holder_id: string
    debtor_id: string
    weight_bps: number // 0 to 10,000 basis points
    strings_count: number // Non-negative integer count of held strings
    updated_at_ms: number
}

export default interface Leverage {
    idx: string
    records: Record<string, StringsLedgerRecord> // Keyed by relation_id (holder_id:debtor_id)
}

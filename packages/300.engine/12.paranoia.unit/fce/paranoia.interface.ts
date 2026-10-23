/**
 * 12.paranoia.unit - Unified Pressure Meters & Paranoia Clocks
 * Invariant: value_bps, threshold_bps, decay_rate_bps in [0, 10000] integer bps.
 * Automatic boil-over tripwire: is_triggered = value_bps >= threshold_bps ? 1 : 0.
 */
export interface ParanoiaClockRecord {
    clock_id: string
    entity_id: string
    clock_name: string
    value_bps: number // 0 to 10,000 bps
    threshold_bps: number // 0 to 10,000 bps
    decay_rate_bps: number // 0 to 10,000 bps
    is_triggered: number // 0 or 1
    updated_at_ms: number
}

export default interface Paranoia {
    idx: string
    clocks: Record<string, ParanoiaClockRecord>
}

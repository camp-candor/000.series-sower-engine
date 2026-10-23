import type { LedgerWorkingState } from '../../16.state.unit/fce/state.interface'

export type { LedgerWorkingState }

export interface PreparedBatchStatement {
    readonly sql: string
    readonly params: readonly unknown[]
}

export type LedgerEventType =
    | 'SOMATIC_TRAUMA_APPLIED'
    | 'SPATIAL_DISPLACEMENT_COMMITTED'
    | 'INVENTORY_TRANSFERRED'
    | 'SOCIAL_STRING_EXCHANGED'
    | 'GRIEVANCE_LIFECYCLE_MUTATED'
    | 'PARANOIA_CLOCK_TICKED'
    | 'BELIEF_RECORDED'
    | 'UNRATIFIED_DETAIL_STAGED'
    | 'SIMULATION_TICK_COMMITTED'

export interface EventEnvelope<T = unknown> {
    readonly sequenceNumber: number
    readonly eventId: string
    readonly streamId: string
    readonly tick: number
    readonly type: LedgerEventType
    readonly version: number
    readonly actorId: string | null
    readonly targetId: string | null
    readonly seed: string
    readonly payload: T
    readonly topologyHash?: string
    readonly overlayHash?: string
    readonly queryHash?: string
    readonly receiptHash?: string
    readonly prevEventHash: string
    readonly stateHash: string
    readonly timestamp_ms: number
}

export interface InvariantValidationResult {
    readonly valid: boolean
    readonly violations: readonly string[]
}

export default interface Ledger {
    idx: string
    activeSequence: number
}

/**
 * 08.ledger.unit - Ledger Interface Contracts
 * Ephemeral volatile staging accumulator, pre-flight invariant gating, and atomic batch commit.
 */

export type StagedMutationType =
    | 'SOMATIC_TRAUMA'
    | 'INVENTORY_TRANSFER'
    | 'SPATIAL_MOVE'
    | 'STRING_EXCHANGE'
    | 'GRIEVANCE_ESCALATE'
    | 'PARANOIA_TICK'

export interface StagedMutationRecord {
    readonly mutationId: string
    readonly sequenceNumber: number
    readonly tick: number
    readonly mutationType: StagedMutationType
    readonly entityId: string
    readonly targetId?: string
    readonly payload: Record<string, any>
    readonly timestampMs: number
}

export interface StagingCommitResult {
    readonly success: boolean
    readonly eventsApplied: number
    readonly stateHash: string
    readonly committedMutations: readonly StagedMutationRecord[]
    readonly error?: string
    readonly timestampMs: number
}

export interface StagingAccumulatorState {
    readonly baseSequenceCursor: number
    readonly currentSequenceCursor: number
    readonly pendingMutationsCount: number
    readonly isDirty: boolean
    readonly lastCommittedAtMs?: number
}

export interface StageMutationParams {
    readonly mutationType: StagedMutationType
    readonly entityId: string
    readonly targetId?: string
    readonly payload: Record<string, any>
    readonly tick?: number
    readonly timestampMs?: number
}

export default interface Ledger {
    idx: string
    stagedMutations: StagedMutationRecord[]
    sequenceCursor: number
    lastCommitResult?: StagingCommitResult
}

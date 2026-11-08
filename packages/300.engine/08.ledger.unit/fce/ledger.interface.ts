/**
 * 08.ledger.unit - Ledger Interface Contracts
 * Ephemeral volatile staging accumulator, pre-flight invariant gating,
 * and Stage 4 Dual-Set 2d6 Mechanical Conflict Resolution.
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

// ============================================================================
// STAGE 4 DUAL-SET 2d6 RESOLUTION ENGINE CONTRACTS
// ============================================================================

export type OutcomeTier =
    | 'clean_win'
    | 'costly_win'
    | 'mutual_wound'
    | 'backfire'

export type CompoundClassification =
    | 'DOUBLE_CLEAN_WIN'
    | 'DOUBLE_COSTLY_WIN'
    | 'DOUBLE_MUTUAL_WOUND'
    | 'DOUBLE_BACKFIRE'

export interface EncounterCombatantStats {
    readonly cunning?: number // Contributes to Axis 1 (Objective attack)
    readonly spite?: number // Contributes to Axis 1 (Objective defense)
    readonly poise?: number // Contributes to Axis 2 (Somatic attack)
    readonly vigor?: number // Contributes to Axis 2 (Somatic defense)
}

export interface EncounterCombatant {
    readonly id: string
    readonly stats: EncounterCombatantStats
}

export interface EncounterContext {
    readonly initiator: EncounterCombatant
    readonly target: EncounterCombatant
    readonly grievanceId?: string
    readonly tick: number
    readonly timestampMs: number
}

export interface ConflictStateDelta {
    readonly stringsAwarded: readonly {
        from: string
        to: string
        count: number
    }[]
    readonly resentmentDelta: Readonly<Record<string, number>>
    readonly somaticConditionsAdded: Readonly<Record<string, readonly string[]>>
    readonly clockTicks: number
}

export interface ResolutionReceipt {
    readonly resolverId: string
    readonly initiatorId: string
    readonly targetId: string
    readonly objectiveOutcome: OutcomeTier
    readonly somaticOutcome: OutcomeTier
    readonly isCompoundExtreme: boolean
    readonly compoundClassification?: CompoundClassification
    readonly stateDelta: ConflictStateDelta
    readonly auditTrail: {
        readonly rollA_obj: number
        readonly rollB_obj: number
        readonly dObj: number
        readonly rollA_som: number
        readonly rollB_som: number
        readonly dSom: number
        readonly modObj: number
        readonly modSom: number
    }
    readonly timestampMs: number
}

export interface ResolveDual2d6Params {
    readonly context: EncounterContext
    readonly rng?: () => number
    readonly autoStage?: boolean // If true, automatically buffers deltas into StagingAccumulator
}

export default interface Ledger {
    idx: string
    stagedMutations: StagedMutationRecord[]
    sequenceCursor: number
    lastCommitResult?: StagingCommitResult
    lastResolutionReceipt?: ResolutionReceipt
}

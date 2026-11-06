/**
 * 14.sequence.unit - Sequence Interface Contracts
 * Strictly monotonic integer progression and Optimistic Concurrency Control (OCC).
 */

export interface SequenceValidationReport {
    readonly valid: boolean
    readonly expectedSeq: number
    readonly presentedSeq: number
    readonly currentHeadSeq: number
    readonly error?: string
    readonly timestamp: string
}

export interface SequenceContinuityReport {
    readonly valid: boolean
    readonly totalItems: number
    readonly baseSeq: number
    readonly headSeq: number
    readonly gapIndex?: number
    readonly error?: string
}

export interface SequenceLedgerState {
    readonly currentHeadSeq: number
    readonly seriesSlug: string
    readonly epochVersion: number
    readonly lastCommittedEventId: string
    readonly totalCommitted: number
}

export default interface Sequence extends SequenceLedgerState {
    idx: string
}

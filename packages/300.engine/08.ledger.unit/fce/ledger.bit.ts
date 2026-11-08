/**
 * 08.ledger.unit - Ledger Bit Payload Contracts
 */
import type {
    StagedMutationRecord,
    StageMutationParams,
    StagingCommitResult,
    StagingAccumulatorState,
    ResolutionReceipt,
    ResolveDual2d6Params,
} from './ledger.interface.js'

export interface LedgerPayload {
    readonly stageParams?: StageMutationParams
    readonly stagedMutation?: StagedMutationRecord
    readonly stagedMutations?: readonly StagedMutationRecord[]
    readonly commitResult?: StagingCommitResult
    readonly accumulatorState?: StagingAccumulatorState
    readonly resolveParams?: ResolveDual2d6Params
    readonly resolutionReceipt?: ResolutionReceipt
    readonly sequenceNumber?: number
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface LedgerBit {
    idx: string
    src?: string
    val?: number
    dat?: LedgerPayload
    lst?: readonly StagedMutationRecord[]
    slv?: Function
}

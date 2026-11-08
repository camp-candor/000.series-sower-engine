/**
 * 08.ledger.unit - Ledger State Model Container
 */
import type Ledger from './fce/ledger.interface.js'
import type {
    StagedMutationRecord,
    StagingCommitResult,
    ResolutionReceipt,
} from './fce/ledger.interface.js'

export class LedgerModel implements Ledger {
    idx: string = '08.ledger'
    stagedMutations: StagedMutationRecord[] = []
    sequenceCursor: number = 0
    lastCommitResult?: StagingCommitResult
    lastResolutionReceipt?: ResolutionReceipt
}

export default LedgerModel

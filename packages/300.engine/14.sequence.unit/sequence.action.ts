import type { Action } from '../99.core/interface/action.interface'
import type SequenceBit from './fce/sequence.bit'

export const INIT_SEQUENCE = '[Sequence action] Init Sequence'
export class InitSequence implements Action<SequenceBit> {
    readonly type = INIT_SEQUENCE
    constructor(public bale: SequenceBit) {}
}

export const UPDATE_SEQUENCE = '[Sequence action] Update Sequence'
export class UpdateSequence implements Action<SequenceBit> {
    readonly type = UPDATE_SEQUENCE
    constructor(public bale: SequenceBit) {}
}

export const NEXT_SEQUENCE = '[Sequence action] Next Sequence'
export class NextSequence implements Action<SequenceBit> {
    readonly type = NEXT_SEQUENCE
    constructor(public bale: SequenceBit) {}
}

export const ASSERT_EXPECTED_SEQ = '[Sequence action] Assert Expected Seq'
export class AssertExpectedSeq implements Action<SequenceBit> {
    readonly type = ASSERT_EXPECTED_SEQ
    constructor(public bale: SequenceBit) {}
}

export const VERIFY_SEQUENCE_CONTINUITY =
    '[Sequence action] Verify Sequence Continuity'
export class VerifySequenceContinuity implements Action<SequenceBit> {
    readonly type = VERIFY_SEQUENCE_CONTINUITY
    constructor(public bale: SequenceBit) {}
}

export const COMMIT_SEQUENCE = '[Sequence action] Commit Sequence'
export class CommitSequence implements Action<SequenceBit> {
    readonly type = COMMIT_SEQUENCE
    constructor(public bale: SequenceBit) {}
}

export const RESET_SEQUENCE = '[Sequence action] Reset Sequence'
export class ResetSequence implements Action<SequenceBit> {
    readonly type = RESET_SEQUENCE
    constructor(public bale: SequenceBit) {}
}

export type Actions =
    | InitSequence
    | UpdateSequence
    | NextSequence
    | AssertExpectedSeq
    | VerifySequenceContinuity
    | CommitSequence
    | ResetSequence

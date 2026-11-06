/**
 * 14.sequence.unit - Sequence Bit Payload Contracts
 */
import type {
    SequenceValidationReport,
    SequenceContinuityReport,
} from './sequence.interface.js'

export interface SequenceEnvelopeStub {
    readonly sequenceId: number
    readonly [key: string]: unknown
}

export interface SequencePayload {
    readonly currentHeadSeq?: number
    readonly nextSeq?: number
    readonly expectedSeq?: number
    readonly incomingSeq?: number
    readonly eventId?: string
    readonly seriesSlug?: string
    readonly envelopes?: readonly SequenceEnvelopeStub[]
    readonly report?: SequenceValidationReport
    readonly continuityReport?: SequenceContinuityReport
    readonly error?: string
}

export default interface SequenceBit {
    idx: string
    src?: string
    val?: number
    dat?: SequencePayload
    slv?: Function
}

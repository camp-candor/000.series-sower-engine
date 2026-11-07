/**
 * 04.envelope.unit - Envelope Bit Payload Contracts
 */
import type {
    EventEnvelope,
    SpatialProof,
    HashChainValidationReport,
    StateHashReceipt,
} from './envelope.interface.js'

export interface EnvelopePayload<TPayload = unknown> {
    readonly rawObject?: unknown
    readonly canonicalString?: string
    readonly eventId?: string
    readonly streamId?: string
    readonly sequenceId?: number
    readonly tick?: number
    readonly eventType?: string
    readonly schemaVersion?: number
    readonly actorId?: string
    readonly targetId?: string
    readonly seed?: string
    readonly payload?: TPayload
    readonly spatialProof?: SpatialProof
    readonly prevEventHash?: string
    readonly stateHash?: string
    readonly eventHash?: string
    readonly timestampMs?: number
    readonly envelope?: EventEnvelope<TPayload>
    readonly envelopes?: readonly EventEnvelope<TPayload>[]
    readonly report?: HashChainValidationReport
    readonly stateReceipt?: StateHashReceipt
    readonly isValidSpatial?: boolean
    readonly error?: string
}

export default interface EnvelopeBit<TPayload = unknown> {
    idx: string
    src?: string
    val?: number
    dat?: EnvelopePayload<TPayload>
    lst?: readonly EventEnvelope<TPayload>[]
    slv?: Function
}

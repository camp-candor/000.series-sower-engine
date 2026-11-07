/**
 * 05.event.unit - Event Bit Payload Contracts
 */
import type { EventEnvelope } from '../../04.envelope.unit/fce/envelope.interface.js'
import type {
    CanonicalSimulationEventType,
    UpcasterFn,
} from './event.interface.js'

export interface AppendEventParams<TPayload = unknown> {
    readonly eventId: string
    readonly streamId?: string
    readonly tick?: number
    readonly eventType: CanonicalSimulationEventType | string
    readonly schemaVersion?: number
    readonly actorId?: string
    readonly targetId?: string
    readonly seed?: string
    readonly payload: TPayload
}

export interface StreamEventsParams {
    readonly streamId?: string
    readonly fromSequenceId?: number
    readonly limit?: number
}

export interface RegisterUpcasterParams {
    readonly eventType: CanonicalSimulationEventType | string
    readonly fromVersion: number
    readonly fn: UpcasterFn
}

export interface EventPayload<TPayload = unknown> {
    readonly appendParams?: AppendEventParams<TPayload>
    readonly streamParams?: StreamEventsParams
    readonly upcasterParams?: RegisterUpcasterParams
    readonly envelope?: EventEnvelope<TPayload>
    readonly envelopes?: readonly EventEnvelope<TPayload>[]
    readonly totalCount?: number
    readonly isDuplicate?: boolean
    readonly error?: string
}

export default interface EventBit<TPayload = unknown> {
    idx: string
    src?: string
    val?: number
    dat?: EventPayload<TPayload>
    lst?: readonly EventEnvelope<TPayload>[]
    slv?: Function
}

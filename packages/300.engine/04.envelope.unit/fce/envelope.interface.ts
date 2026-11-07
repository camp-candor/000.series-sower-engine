/**
 * 04.envelope.unit - Envelope Interface Contracts
 * RFC 8785 Canonical JCS, cryptographic hash chaining, and spatial proof envelopes.
 */

export interface SpatialProof {
    readonly topologyHash: string // 64-char lowercase hex
    readonly overlayHash: string // 64-char lowercase hex
    readonly queryHash: string // 64-char lowercase hex
    readonly receiptHash: string // 64-char lowercase hex
    readonly kernelVersion?: string
}

export interface EventEnvelope<TPayload = unknown> {
    readonly eventId: string
    readonly streamId: string
    readonly sequenceId: number
    readonly tick: number
    readonly eventType: string
    readonly schemaVersion: number
    readonly actorId?: string
    readonly targetId?: string
    readonly seed: string
    readonly payload: TPayload
    readonly spatialProof?: SpatialProof
    readonly prevEventHash: string // 64-char lowercase hex
    readonly stateHash: string // 64-char lowercase hex
    readonly eventHash: string // 64-char lowercase hex
    readonly timestampMs: number
}

export interface HashChainValidationReport {
    readonly valid: boolean
    readonly totalEvents: number
    readonly verifiedThroughSeq: number
    readonly genesisHash: string
    readonly headHash: string
    readonly failedIndex?: number
    readonly failedEventId?: string
    readonly error?: string
    readonly timestampMs: number
}

export interface StateHashReceipt {
    readonly stateHash: string
    readonly canonicalLength: number
    readonly timestampMs: number
}

export default interface Envelope {
    idx: string
    genesisHash: string
    lastSealedHash: string
    totalSealedCount: number
    lastValidationReport: HashChainValidationReport | null
}

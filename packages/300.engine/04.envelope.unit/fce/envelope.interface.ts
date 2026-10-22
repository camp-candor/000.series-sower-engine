export interface SpatialProof {
    topologyHash: string
    overlayHash: string
    queryHash: string
    receiptHash: string
    kernelVersion?: string
}

export interface EventEnvelope<TPayload = any> {
    eventId: string
    streamId: string
    sequenceId: number
    tick: number
    eventType: string
    schemaVersion: number
    actorId?: string | null
    targetId?: string | null
    seed: string
    payload: TPayload
    spatialProof: SpatialProof
    prevEventHash: string
    stateHash: string
    eventHash?: string
    timestampMs: number
}

export interface HashChainValidationReport {
    valid: boolean
    totalEvents: number
    verifiedThroughSeq: number
    genesisHash: string
    headHash: string
    failedIndex?: number
    failedEventId?: string
    error?: string
}

export default interface Envelope {
    idx: string
    genesisHash: string
    lastSealedHash: string
    totalSealedCount: number
}

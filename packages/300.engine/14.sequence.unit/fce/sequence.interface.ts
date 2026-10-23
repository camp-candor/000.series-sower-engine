export interface SequenceValidationReport {
    valid: boolean
    expectedSeq: number
    actualSeq: number
    error?: string
}

export interface StreamSequenceState {
    streamId: string
    headSeq: number
    lastEventId: string
    updatedAtMs: number
}

export default interface Sequence {
    idx: string
    streams: Record<string, StreamSequenceState>
    defaultStreamId: string
}

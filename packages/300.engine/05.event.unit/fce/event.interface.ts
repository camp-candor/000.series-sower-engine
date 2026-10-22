export type {
    EventEnvelope,
    SpatialProof,
} from '../../04.envelope.unit/fce/envelope.interface'

// ----------------------------------------------------------------------------
// :: DISCRIMINATED EVENT PAYLOAD CONTRACTS
// ----------------------------------------------------------------------------

export interface SomaticTraumaPayloadV1 {
    entityId: string
    damageTier: 'LIGHT' | 'MODERATE' | 'SEVERE'
}

export interface SomaticTraumaPayloadV2 {
    entityId: string
    painBps: number
}

export interface SomaticTraumaPayloadV3 {
    entityId: string
    painBps: number
    bannedKineticVerbs: string[]
}

export type SomaticTraumaPayload = SomaticTraumaPayloadV3

export interface InventoryTransferredPayload {
    sourceEntityId: string | null
    targetEntityId: string | null
    itemId: string
    targetSlot: 'HELD_PRIMARY' | 'HELD_OFF' | 'WORN' | 'SLUNG' | 'CACHED'
}

export interface LeverageStringMutatedPayload {
    holderId: string
    debtorId: string
    weightBpsDelta: number
    stringsCountDelta: number
}

export interface GrievanceEscalatedPayload {
    grievanceId: string
    instigatorId: string
    victimId: string
    depthDelta: number
    intensityBpsDelta: number
}

export interface ParanoiaClockTickedPayload {
    entityId: string
    clockName: string
    valueBpsDelta: number
}

export interface BeliefRecordedPayload {
    observerId: string
    factId: string
    subjectiveProbabilityBps: number
    sourceType: 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'
}

export interface UnratifiedDetailStagedPayload {
    sceneId: string
    entityId?: string
    salienceBps: number
    claimProposal: string
}

export interface SimulationTickCommittedPayload {
    tickNumber: number
    occurredAtIso: string
    stateHash: string
}

export type SimulationEventPayload =
    | SomaticTraumaPayload
    | InventoryTransferredPayload
    | LeverageStringMutatedPayload
    | GrievanceEscalatedPayload
    | ParanoiaClockTickedPayload
    | BeliefRecordedPayload
    | UnratifiedDetailStagedPayload
    | SimulationTickCommittedPayload
    | Record<string, unknown>

export type UpcasterFunction<TOld = any, TNew = any> = (
    oldPayload: TOld,
) => TNew

export interface EventLogDbRow {
    sequence_id: number
    event_id: string
    stream_id: string
    tick: number
    event_type: string
    schema_version: number
    actor_id: string | null
    target_id: string | null
    seed: string
    payload_json: string
    topology_hash: string
    overlay_hash: string
    query_hash: string
    receipt_hash: string
    prev_event_hash: string
    state_hash: string
    timestamp_ms: number
}

export interface AppendEventResult {
    appended: boolean
    duplicate: boolean
    sequenceId: number
    eventId: string
    eventHash: string
}

export default interface Event {
    idx: string
    targetSchemaVersions: Record<string, number>
    totalAppended: number
}

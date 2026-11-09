/**
 * 01.actor.unit - Actor Bit Payload Contracts
 */
import type {
    ActorBeliefRecord,
    UnratifiedDetailRecord,
    RecordBeliefParams,
    ScrubContextParams,
    StageDetailParams,
    RatifyDetailParams,
    DiscardDetailParams,
    CalculateSalienceParams,
    SalienceCalculationReceipt,
    DetailStatus,
} from './actor.interface.js'

import type { BeliefSourceType } from './actor.interface.js'
export interface ActorPayload {
    readonly is_false_belief?: boolean | number
    readonly source_type?: BeliefSourceType
    readonly observer_id?: string
    readonly fact_id?: string
    readonly subjective_probability_bps?: number
    readonly world_facts?: Readonly<Record<string, string>>
    readonly recurrence_count?: number
    readonly dramatic_turn?: 'BACKGROUND' | 'GAZE_PROXIMITY' | 'MECHANICAL_DUEL'
    readonly scene_id?: string
    readonly label_candidate?: string
    readonly category?: 'PROP' | 'SOMATIC_TIC' | 'SPATIAL_SET' | 'VOCAL_CADENCE' | 'COSTUME_DECAY'
    readonly claim_proposal?: string
    readonly entity_id?: string
    readonly ratified_entity_id?: string
    readonly tick?: number
    readonly timestamp_ms?: number
    readonly detail_id?: string
    readonly subtextParams?: any
    readonly leakProbeParams?: any
    readonly observerId?: string
    readonly factId?: string
    readonly detailId?: string
    readonly beliefParams?: RecordBeliefParams
    readonly scrubParams?: ScrubContextParams
    readonly salienceParams?: CalculateSalienceParams
    readonly salienceReceipt?: SalienceCalculationReceipt
    readonly stageDetailParams?: StageDetailParams
    readonly ratifyDetailParams?: RatifyDetailParams
    readonly discardDetailParams?: DiscardDetailParams
    readonly filterStatus?: DetailStatus
    readonly belief?: ActorBeliefRecord
    readonly beliefs?: readonly ActorBeliefRecord[]
    readonly detail?: UnratifiedDetailRecord
    readonly details?: readonly UnratifiedDetailRecord[]
    readonly scrubbedFacts?: Readonly<Record<string, string>>
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface ActorBit {
    idx: string
    src?: string
    val?: number
    dat?: ActorPayload
    lst?: readonly (ActorBeliefRecord | UnratifiedDetailRecord)[]
    slv?: Function
}

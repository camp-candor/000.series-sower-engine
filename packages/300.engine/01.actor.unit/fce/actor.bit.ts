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
    BuildSubtextParams,
    SubtextAttenuationDirective,
    DialogueLeakProbeParams,
    DialogueLeakProbeReceipt,
    DialogueBeatAST,
    CompileDialogueBeatParams,
    CompileDialogueBeatReceipt,
} from './actor.interface.js'

export interface ActorPayload {
    readonly observer_id?: string
    readonly fact_id?: string
    readonly subjective_probability_bps?: number
    readonly timestamp_ms?: number
    readonly is_false_belief?: boolean | number
    readonly source_type?: import('./actor.interface.js').BeliefSourceType
    readonly world_facts?: Readonly<Record<string, string>>
    readonly recurrence_count?: number
    readonly dramatic_turn?: any
    readonly detail_id?: string
    readonly scene_id?: string
    readonly label_candidate?: string
    readonly category?: any
    readonly claim_proposal?: string
    readonly entity_id?: string
    readonly ratified_entity_id?: string
    readonly tick?: number

    readonly observerId?: string
    readonly factId?: string
    readonly detailId?: string
    readonly beatId?: string
    readonly beliefParams?: RecordBeliefParams
    readonly scrubParams?: ScrubContextParams
    readonly salienceParams?: CalculateSalienceParams
    readonly salienceReceipt?: SalienceCalculationReceipt
    readonly stageDetailParams?: StageDetailParams
    readonly ratifyDetailParams?: RatifyDetailParams
    readonly discardDetailParams?: DiscardDetailParams
    readonly subtextParams?: BuildSubtextParams
    readonly subtextDirective?: SubtextAttenuationDirective
    readonly leakProbeParams?: DialogueLeakProbeParams
    readonly leakProbeReceipt?: DialogueLeakProbeReceipt
    readonly compileBeatParams?: CompileDialogueBeatParams
    readonly compileBeatReceipt?: CompileDialogueBeatReceipt
    readonly filterStatus?: DetailStatus
    readonly belief?: ActorBeliefRecord
    readonly beliefs?: readonly ActorBeliefRecord[]
    readonly detail?: UnratifiedDetailRecord
    readonly details?: readonly UnratifiedDetailRecord[]
    readonly beat?: DialogueBeatAST
    readonly beats?: readonly DialogueBeatAST[]
    readonly scrubbedFacts?: Readonly<Record<string, string>>
    readonly curtnessLimit?: number
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface ActorBit {
    idx: string
    src?: string
    val?: number
    dat?: ActorPayload
    lst?: readonly (
        | ActorBeliefRecord
        | UnratifiedDetailRecord
        | DialogueBeatAST
    )[]
    slv?: Function
}

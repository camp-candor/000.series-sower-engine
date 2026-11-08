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

export interface ActorPayload {
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

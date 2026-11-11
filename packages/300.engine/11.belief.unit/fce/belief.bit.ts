/**
 * 11.belief.unit - Belief Bit Payload Contracts
 */
import type { BeliefRecord, EpistemicHorizon } from './belief.interface.js'
import type {
    PerceptCandidate,
    SomaticSensoryProfile,
    SensoryFilterEvaluation,
} from './percept.interface.js'

export interface BeliefPayload {
    readonly actorId?: string
    readonly eventId?: string
    readonly propositionSlug?: string
    readonly subjectId?: string
    readonly predicate?: string
    readonly objectId?: string
    readonly perceptCandidate?: PerceptCandidate
    readonly somaticProfile?: SomaticSensoryProfile
    readonly filterEvaluation?: SensoryFilterEvaluation
    readonly committedBelief?: BeliefRecord
    readonly beliefList?: readonly BeliefRecord[]
    readonly combinedConfidenceBp?: number
    readonly epistemicHorizon?: EpistemicHorizon
    readonly error?: string
    readonly timestampMs?: number
}

export default interface BeliefBit<TDat = BeliefPayload, TLst = string> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: { belBit: Partial<BeliefBit<TDat, TLst>> }) => void
}

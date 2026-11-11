/**
 * 11.belief.unit - Actor Belief Ledger Record Persistence & Combination
 * Synthesizes surviving sensory evidence into immutable BeliefRecords.
 */
import crypto from 'node:crypto'
import type { BeliefRecord } from '../fce/belief.interface.js'
import type {
    PerceptCandidate,
    SensoryFilterEvaluation,
} from '../fce/percept.interface.js'

export const deriveBeliefFromPercept = (
    actorId: string,
    eventId: string,
    propositionSlug: string,
    subjectId: string,
    predicate: string,
    objectId: string,
    percept: PerceptCandidate,
    filter: SensoryFilterEvaluation,
): BeliefRecord | null => {
    // Ignorance by Omission: if filter blocked signal, ZERO belief is created
    if (!filter.received) {
        return null
    }

    const beliefId = 'bel_' + crypto.randomBytes(8).toString('hex')
    const subjectiveConfidenceBp = Math.min(
        10000,
        Math.max(1000, filter.effectiveQualityBps),
    )

    return Object.freeze({
        belief_id: beliefId,
        holder_id: actorId,
        subject_id: subjectId,
        predicate,
        object_id: objectId,
        proposition_slug: propositionSlug,
        subjective_confidence_bp: subjectiveConfidenceBp,
        source_type: 'DIRECT_OBSERVATION',
        source_event_id: eventId,
        parent_belief_id: null,
        hop_count: 0,
        resists_correction: subjectiveConfidenceBp >= 9000,
        receipt_hash: percept.receiptHash,
    })
}

/**
 * Correlation-Aware Noisy-OR Combination Rule in Discrete Integer Basis Points
 * p_combined = 10000 - floor(((10000 - p1) * (10000 - p2)) / 10000)
 */
export const combineBeliefConfidencesNoisyOr = (
    confidenceA: number,
    confidenceB: number,
): number => {
    if (!Number.isInteger(confidenceA) || !Number.isInteger(confidenceB)) {
        throw new Error(
            '[GILLIAN_INTEGER_BREACH] Confidence scores must be discrete integer basis points',
        )
    }

    const p1 = Math.min(10000, Math.max(0, confidenceA))
    const p2 = Math.min(10000, Math.max(0, confidenceB))

    const remainingDoubtA = 10000 - p1
    const remainingDoubtB = 10000 - p2
    const combinedDoubt = Math.floor(
        (remainingDoubtA * remainingDoubtB) / 10000,
    )

    return Math.min(10000, Math.max(0, 10000 - combinedDoubt))
}

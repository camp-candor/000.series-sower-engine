/**
 * 11.belief.unit - Master Belief Buzz Business Logic
 */
import type { BeliefModel } from '../belief.model.js'
import type BeliefBit from '../fce/belief.bit.js'
import { parsePerceptCandidate } from './percept-ingest.buzz.js'
import { evaluateSensoryFilter } from './sensory-filter.buzz.js'
import {
    deriveBeliefFromPercept,
    combineBeliefConfidencesNoisyOr,
} from './belief-commit.buzz.js'
import type State from '../../99.core/state.js'

const UPDATE_CONSOLE = '[Console action] Update Console'

const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
            return
        } catch {
            // Degrade gracefully
        }
    }
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
            return
        } catch {
            // Degrade gracefully
        }
    }
}

export const initBelief = async (
    cpy: BeliefModel,
    bal?: BeliefBit,
    _ste?: State,
): Promise<BeliefModel> => {
    cpy.beliefsByHolder.clear()
    cpy.totalBeliefsRecorded = 0

    await emitConsole(
        _ste,
        '>> [BELIEF:INIT] [OK] Epistemic belief registry synchronized.',
    )
    if (bal?.slv) {
        bal.slv({ belBit: { idx: 'init-belief-success', val: 1 } })
    }
    return cpy
}

export const updateBelief = async (
    cpy: BeliefModel,
    bal?: BeliefBit,
    _ste?: State,
): Promise<BeliefModel> => {
    if (bal?.slv) {
        bal.slv({ belBit: { idx: 'update-belief-pass' } })
    }
    return cpy
}

export const processPerceptCandidateAction = async (
    cpy: BeliefModel,
    bal?: BeliefBit,
    _ste?: State,
): Promise<BeliefModel> => {
    const actorId = bal?.dat?.actorId
    const eventId = bal?.dat?.eventId || 'evt_unknown'
    const propSlug = bal?.dat?.propositionSlug || 'fact_incident'
    const subjectId = bal?.dat?.subjectId || 'char_unknown'
    const predicate = bal?.dat?.predicate || 'interacted_with'
    const objectId = bal?.dat?.objectId || 'item_unknown'
    const candidateRaw = bal?.dat?.perceptCandidate
    const profile = bal?.dat?.somaticProfile

    if (!actorId || !candidateRaw || !profile) {
        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'process-percept-fail',
                    dat: { error: 'MANDATORY_PARAMETERS_MISSING' },
                },
            })
        }
        return cpy
    }

    const percept = parsePerceptCandidate(candidateRaw)
    const evaluation = evaluateSensoryFilter(percept, profile)

    if (!evaluation.received) {
        await emitConsole(
            _ste,
            `>> [IGNORANCE_BY_OMISSION] Actor [${actorId}] blocked from perceiving [${propSlug}] (${evaluation.rejectionReason})`,
        )
        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'process-percept-omitted',
                    val: 0,
                    dat: {
                        epistemicHorizon: 'TOTAL_IGNORANCE',
                        filterEvaluation: evaluation,
                    },
                },
            })
        }
        return cpy
    }

    const belief = deriveBeliefFromPercept(
        actorId,
        eventId,
        propSlug,
        subjectId,
        predicate,
        objectId,
        percept,
        evaluation,
    )

    if (belief) {
        let holderMap = cpy.beliefsByHolder.get(actorId)
        if (!holderMap) {
            holderMap = new Map()
            cpy.beliefsByHolder.set(actorId, holderMap)
        }
        holderMap.set(propSlug, belief)
        cpy.totalBeliefsRecorded++

        await emitConsole(
            _ste,
            `>> [BELIEF:COMMIT] Actor [${actorId}] gained DIRECT_OBSERVATION for [${propSlug}] (${belief.subjective_confidence_bp} bps)`,
        )

        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'process-percept-success',
                    val: 1,
                    dat: {
                        epistemicHorizon: 'FACTUAL_WITNESS',
                        committedBelief: belief,
                        filterEvaluation: evaluation,
                    },
                },
            })
        }
    }

    return cpy
}

export const evaluateSensoryGateAction = (
    cpy: BeliefModel,
    bal?: BeliefBit,
    _ste?: State,
): BeliefModel => {
    const candidateRaw = bal?.dat?.perceptCandidate
    const profile = bal?.dat?.somaticProfile

    if (!candidateRaw || !profile) {
        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'evaluate-gate-fail',
                    dat: { error: 'PERCEPT_AND_PROFILE_MANDATORY' },
                },
            })
        }
        return cpy
    }

    const percept = parsePerceptCandidate(candidateRaw)
    const evaluation = evaluateSensoryFilter(percept, profile)

    if (bal?.slv) {
        bal.slv({
            belBit: {
                idx: evaluation.received
                    ? 'evaluate-gate-pass'
                    : 'evaluate-gate-blocked',
                val: evaluation.received ? 1 : 0,
                dat: { filterEvaluation: evaluation },
            },
        })
    }
    return cpy
}

export const combineBeliefsAction = (
    cpy: BeliefModel,
    bal?: BeliefBit,
    _ste?: State,
): BeliefModel => {
    const confA = bal?.val ?? 0
    const confB = Number(bal?.src ?? 0)

    try {
        const combined = combineBeliefConfidencesNoisyOr(confA, confB)
        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'combine-beliefs-success',
                    val: combined,
                    dat: { combinedConfidenceBp: combined },
                },
            })
        }
    } catch (err: any) {
        if (bal?.slv) {
            bal.slv({
                belBit: {
                    idx: 'combine-beliefs-fail',
                    dat: { error: err.message },
                },
            })
        }
    }
    return cpy
}

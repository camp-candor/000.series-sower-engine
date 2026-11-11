/**
 * 11.belief.unit - Belief Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type BeliefBit from './fce/belief.bit.js'

export const INIT_BELIEF = '[Belief action] Init Belief'
export class InitBelief implements Action<BeliefBit> {
    readonly type = INIT_BELIEF
    constructor(public bale?: BeliefBit) {}
}

export const UPDATE_BELIEF = '[Belief action] Update Belief'
export class UpdateBelief implements Action<BeliefBit> {
    readonly type = UPDATE_BELIEF
    constructor(public bale?: BeliefBit) {}
}

export const PROCESS_PERCEPT_CANDIDATE =
    '[Belief action] Process Percept Candidate'
export class ProcessPerceptCandidate implements Action<BeliefBit> {
    readonly type = PROCESS_PERCEPT_CANDIDATE
    constructor(public bale?: BeliefBit) {}
}

export const EVALUATE_SENSORY_GATE = '[Belief action] Evaluate Sensory Gate'
export class EvaluateSensoryGate implements Action<BeliefBit> {
    readonly type = EVALUATE_SENSORY_GATE
    constructor(public bale?: BeliefBit) {}
}

export const COMBINE_BELIEFS = '[Belief action] Combine Beliefs'
export class CombineBeliefs implements Action<BeliefBit> {
    readonly type = COMBINE_BELIEFS
    constructor(public bale?: BeliefBit) {}
}

export type Actions =
    | InitBelief
    | UpdateBelief
    | ProcessPerceptCandidate
    | EvaluateSensoryGate
    | CombineBeliefs

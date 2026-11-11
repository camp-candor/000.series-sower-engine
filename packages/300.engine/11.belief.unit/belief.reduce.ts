/**
 * 11.belief.unit - Belief Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './belief.action.js'
import { BeliefModel } from './belief.model.js'
import * as Buzz from './belief.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: BeliefModel = new BeliefModel(),
    act: Act.Actions,
    state?: State,
): BeliefModel | Promise<BeliefModel> {
    switch (act.type) {
        case Act.INIT_BELIEF:
            return Buzz.initBelief(clone(model), act.bale, state)

        case Act.UPDATE_BELIEF:
            return Buzz.updateBelief(clone(model), act.bale, state)

        case Act.PROCESS_PERCEPT_CANDIDATE:
            return Buzz.processPerceptCandidateAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.EVALUATE_SENSORY_GATE:
            return Buzz.evaluateSensoryGateAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.COMBINE_BELIEFS:
            return Buzz.combineBeliefsAction(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}

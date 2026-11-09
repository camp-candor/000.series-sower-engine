/**
 * 01.actor.unit - Actor Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './actor.action.js'
import { ActorModel } from './actor.model.js'
import * as Buzz from './actor.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: ActorModel = new ActorModel(),
    act: Act.Actions,
    state?: State,
): ActorModel | Promise<ActorModel> {
    switch (act.type) {
        case Act.INIT_ACTOR:
            return Buzz.initActor(clone(model), act.bale, state)

        case Act.UPDATE_ACTOR:
            return Buzz.updateActor(clone(model), act.bale, state)

        case Act.RECORD_BELIEF_ACTOR:
            return Buzz.recordBeliefActor(clone(model), act.bale as any, state)

        case Act.QUERY_HORIZON_ACTOR:
            return Buzz.queryHorizonActor(clone(model), act.bale as any, state)

        case Act.SCRUB_EPISTEMIC_CONTEXT_ACTOR:
            return Buzz.scrubEpistemicContextActor(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.CALCULATE_SALIENCE_ACTOR:
            return Buzz.calculateSalienceActor(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.STAGE_DETAIL_ACTOR:
            return Buzz.stageDetailActor(clone(model), act.bale as any, state)

        case Act.RATIFY_DETAIL_ACTOR:
            return Buzz.ratifyDetailActor(clone(model), act.bale as any, state)

        case Act.DISCARD_DETAIL_ACTOR:
            return Buzz.discardDetailActor(clone(model), act.bale as any, state)

        case Act.LIST_UNRATIFIED_DETAILS_ACTOR:
            return Buzz.listUnratifiedDetailsActor(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.BUILD_SUBTEXT_DIRECTIVE_ACTOR:
            return Buzz.buildSubtextDirectiveAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.PROBE_DIALOGUE_LEAK_ACTOR:
            return Buzz.probeDialogueLeakAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.COMPILE_DIALOGUE_BEAT_ACTOR:
            return Buzz.compileDialogueBeatAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.ENFORCE_CURTNESS_BUDGET_ACTOR:
            return Buzz.enforceCurtnessBudgetAction(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}

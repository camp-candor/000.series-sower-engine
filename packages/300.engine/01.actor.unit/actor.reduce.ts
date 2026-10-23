import clone from 'clone-deep'
import * as Act from './actor.action'
import { ActorModel } from './actor.model'
import * as Buzz from './actor.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: ActorModel = new ActorModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_ACTOR:
            return Buzz.initActor(clone(model, true), act.bale, state!)

        case Act.UPDATE_ACTOR:
            return Buzz.updateActor(clone(model, true), act.bale, state!)

        case Act.RECORD_BELIEF_ACTOR:
            return Buzz.recordBeliefActor(clone(model, true), act.bale, state!)

        case Act.QUERY_HORIZON_ACTOR:
            return Buzz.queryHorizonActor(clone(model, true), act.bale, state!)

        case Act.SCRUB_EPISTEMIC_CONTEXT_ACTOR:
            return Buzz.scrubEpistemicContextActor(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.STAGE_DETAIL_ACTOR:
            return Buzz.stageDetailActor(clone(model, true), act.bale, state!)

        case Act.RATIFY_DETAIL_ACTOR:
            return Buzz.ratifyDetailActor(clone(model, true), act.bale, state!)

        case Act.DISCARD_DETAIL_ACTOR:
            return Buzz.discardDetailActor(clone(model, true), act.bale, state!)

        case Act.LIST_UNRATIFIED_DETAILS_ACTOR:
            return Buzz.listUnratifiedDetailsActor(
                clone(model, true),
                act.bale,
                state!,
            )

        default:
            return model
    }
}

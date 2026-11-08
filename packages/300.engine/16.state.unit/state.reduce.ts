/**
 * 16.state.unit - State Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './state.action.js'
import { StateModel } from './state.model.js'
import * as Buzz from './state.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: StateModel = new StateModel(),
    act: Act.Actions,
    state?: State,
): StateModel | Promise<StateModel> {
    switch (act.type) {
        case Act.INIT_STATE:
            return Buzz.initState(clone(model), act.bale, state)

        case Act.UPDATE_STATE:
            return Buzz.updateState(clone(model), act.bale, state)

        case Act.HYDRATE_STATE:
            return Buzz.hydrateStateAction(clone(model), act.bale as any, state)

        case Act.COMPUTE_HASH_STATE:
            return Buzz.computeHashStateAction(clone(model), act.bale as any, state)

        case Act.FREEZE_STATE:
            return Buzz.freezeStateAction(clone(model), act.bale as any, state)

        case Act.FOLD_EVENTS_STATE:
            return Buzz.foldEventsStateAction(clone(model), act.bale as any, state)

        case Act.WHY_DIRTY_STATE:
            return Buzz.whyDirtyStateAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}

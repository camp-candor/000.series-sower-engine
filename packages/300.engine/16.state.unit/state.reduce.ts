import clone from 'clone-deep'
import * as Act from './state.action'
import { StateModel } from './state.model'
import * as Buzz from './state.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: StateModel = new StateModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_STATE:
            return Buzz.initState(clone(model, true), act.bale, state as State)

        case Act.UPDATE_STATE:
            return Buzz.updateState(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.HYDRATE_STATE:
            return Buzz.hydrateState(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.COMPUTE_HASH_STATE:
            return Buzz.computeHashState(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.FREEZE_STATE:
            return Buzz.freezeState(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}

import clone from 'clone-deep'
import * as Act from './state.action.js'
import { StateModel } from './state.model.js'
import * as Buzz from './state.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: StateModel = new StateModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_STATE:
            return Buzz.updateState(clone(model), act.bale, state as State)

        case Act.INIT_STATE:
            return Buzz.initState(clone(model), act.bale, state as State)

        default:
            return model
    }
}

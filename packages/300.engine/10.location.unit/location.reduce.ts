import clone from 'clone-deep'
import * as Act from './location.action.js'
import { LocationModel } from './location.model.js'
import * as Buzz from './location.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: LocationModel = new LocationModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_LOCATION:
            return Buzz.updateLocation(clone(model), act.bale, state as State)

        case Act.INIT_LOCATION:
            return Buzz.initLocation(clone(model), act.bale, state as State)

        default:
            return model
    }
}

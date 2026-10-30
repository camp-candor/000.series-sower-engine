import clone from 'clone-deep'
import * as Act from './primordial.action.js'
import { PrimordialModel } from './primordial.model.js'
import * as Buzz from './primordial.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: PrimordialModel = new PrimordialModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_PRIMORDIAL:
            return Buzz.updatePrimordial(clone(model), act.bale, state as State)

        case Act.INIT_PRIMORDIAL:
            return Buzz.initPrimordial(clone(model), act.bale, state as State)

        default:
            return model
    }
}

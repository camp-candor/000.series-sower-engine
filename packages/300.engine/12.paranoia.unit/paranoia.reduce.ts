import clone from 'clone-deep'
import * as Act from './paranoia.action.js'
import { ParanoiaModel } from './paranoia.model.js'
import * as Buzz from './paranoia.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: ParanoiaModel = new ParanoiaModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_PARANOIA:
            return Buzz.updateParanoia(clone(model), act.bale, state as State)

        case Act.INIT_PARANOIA:
            return Buzz.initParanoia(clone(model), act.bale, state as State)

        default:
            return model
    }
}

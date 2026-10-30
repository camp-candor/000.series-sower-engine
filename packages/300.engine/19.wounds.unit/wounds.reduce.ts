import clone from 'clone-deep'
import * as Act from './wounds.action.js'
import { WoundsModel } from './wounds.model.js'
import * as Buzz from './wounds.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: WoundsModel = new WoundsModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_WOUNDS:
            return Buzz.updateWounds(clone(model), act.bale, state as State)

        case Act.INIT_WOUNDS:
            return Buzz.initWounds(clone(model), act.bale, state as State)

        default:
            return model
    }
}

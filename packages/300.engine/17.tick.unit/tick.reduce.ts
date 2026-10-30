import clone from 'clone-deep'
import * as Act from './tick.action.js'
import { TickModel } from './tick.model.js'
import * as Buzz from './tick.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: TickModel = new TickModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_TICK:
            return Buzz.updateTick(clone(model), act.bale, state as State)

        case Act.INIT_TICK:
            return Buzz.initTick(clone(model), act.bale, state as State)

        default:
            return model
    }
}

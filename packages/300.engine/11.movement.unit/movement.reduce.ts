import clone from 'clone-deep'
import * as Act from './movement.action.js'
import { MovementModel } from './movement.model.js'
import * as Buzz from './movement.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: MovementModel = new MovementModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_MOVEMENT:
            return Buzz.updateMovement(clone(model), act.bale, state as State)

        case Act.INIT_MOVEMENT:
            return Buzz.initMovement(clone(model), act.bale, state as State)

        default:
            return model
    }
}

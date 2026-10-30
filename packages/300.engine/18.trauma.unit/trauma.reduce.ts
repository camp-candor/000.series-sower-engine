import clone from 'clone-deep'
import * as Act from './trauma.action.js'
import { TraumaModel } from './trauma.model.js'
import * as Buzz from './trauma.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: TraumaModel = new TraumaModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_TRAUMA:
            return Buzz.updateTrauma(clone(model), act.bale, state as State)

        case Act.INIT_TRAUMA:
            return Buzz.initTrauma(clone(model), act.bale, state as State)

        default:
            return model
    }
}

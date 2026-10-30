import clone from 'clone-deep'
import * as Act from './event.action.js'
import { EventModel } from './event.model.js'
import * as Buzz from './event.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: EventModel = new EventModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_EVENT:
            return Buzz.updateEvent(clone(model), act.bale, state as State)

        case Act.INIT_EVENT:
            return Buzz.initEvent(clone(model), act.bale, state as State)

        default:
            return model
    }
}

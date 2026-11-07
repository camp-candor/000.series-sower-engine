/**
 * 05.event.unit - Event Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './event.action.js'
import { EventModel } from './event.model.js'
import * as Buzz from './event.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: EventModel = new EventModel(),
    act: Act.Actions,
    state?: State,
): EventModel | Promise<EventModel> {
    switch (act.type) {
        case Act.INIT_EVENT:
            return Buzz.initEvent(clone(model), act.bale, state)

        case Act.UPDATE_EVENT:
            return Buzz.updateEvent(clone(model), act.bale, state)

        case Act.APPEND_EVENT:
            return Buzz.appendEvent(clone(model), act.bale as any, state)

        case Act.STREAM_EVENTS:
            return Buzz.streamEvents(clone(model), act.bale as any, state)

        case Act.REGISTER_UPCASTER:
            return Buzz.registerUpcaster(clone(model), act.bale as any, state)

        case Act.UPCAST_EVENT:
            return Buzz.upcastEvent(clone(model), act.bale as any, state)

        default:
            return model
    }
}

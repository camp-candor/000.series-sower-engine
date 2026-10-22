import clone from 'clone-deep'
import * as Act from './event.action'
import { EventModel } from './event.model'
import * as Buzz from './event.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: EventModel = new EventModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_EVENT:
            return Buzz.initEvent(clone(model, true), act.bale, state as State)

        case Act.UPDATE_EVENT:
            return Buzz.updateEvent(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.REGISTER_UPCASTER_EVENT:
            return Buzz.registerUpcasterEventAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.UPCAST_EVENT:
            return Buzz.upcastEventAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.APPEND_EVENT:
            return Buzz.appendEventAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.STREAM_EVENTS:
            return Buzz.streamEventsAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.GET_EVENT_BY_ID:
            return Buzz.getEventByIdAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}

import clone from 'clone-deep'
import * as Act from './envelope.action.js'
import { EnvelopeModel } from './envelope.model.js'
import * as Buzz from './envelope.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: EnvelopeModel = new EnvelopeModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_ENVELOPE:
            return Buzz.updateEnvelope(clone(model), act.bale, state as State)

        case Act.INIT_ENVELOPE:
            return Buzz.initEnvelope(clone(model), act.bale, state as State)

        default:
            return model
    }
}

import clone from 'clone-deep'
import * as Act from './sequence.action.js'
import { SequenceModel } from './sequence.model.js'
import * as Buzz from './sequence.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: SequenceModel = new SequenceModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_SEQUENCE:
            return Buzz.updateSequence(clone(model), act.bale, state as State)

        case Act.INIT_SEQUENCE:
            return Buzz.initSequence(clone(model), act.bale, state as State)

        default:
            return model
    }
}

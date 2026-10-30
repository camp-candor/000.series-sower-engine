import clone from 'clone-deep'
import * as Act from './actor.action.js'
import { ActorModel } from './actor.model.js'
import * as Buzz from './actor.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: ActorModel = new ActorModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_ACTOR:
            return Buzz.updateActor(clone(model), act.bale, state as State)

        case Act.INIT_ACTOR:
            return Buzz.initActor(clone(model), act.bale, state as State)

        default:
            return model
    }
}

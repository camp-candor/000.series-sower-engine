import clone from 'clone-deep'
import * as Act from './entity.action.js'
import { EntityModel } from './entity.model.js'
import * as Buzz from './entity.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: EntityModel = new EntityModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_ENTITY:
            return Buzz.updateEntity(clone(model), act.bale, state as State)

        case Act.INIT_ENTITY:
            return Buzz.initEntity(clone(model), act.bale, state as State)

        default:
            return model
    }
}

import clone from 'clone-deep'
import * as Act from './database.action.js'
import { DatabaseModel } from './database.model.js'
import * as Buzz from './database.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: DatabaseModel = new DatabaseModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_DATABASE:
            return Buzz.updateDatabase(clone(model), act.bale, state as State)

        case Act.INIT_DATABASE:
            return Buzz.initDatabase(clone(model), act.bale, state as State)

        default:
            return model
    }
}

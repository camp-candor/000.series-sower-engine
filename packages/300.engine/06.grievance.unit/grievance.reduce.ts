import clone from 'clone-deep'
import * as Act from './grievance.action.js'
import { GrievanceModel } from './grievance.model.js'
import * as Buzz from './grievance.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: GrievanceModel = new GrievanceModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_GRIEVANCE:
            return Buzz.updateGrievance(clone(model), act.bale, state as State)

        case Act.INIT_GRIEVANCE:
            return Buzz.initGrievance(clone(model), act.bale, state as State)

        default:
            return model
    }
}

import clone from 'clone-deep'
import * as Act from './leverage.action.js'
import { LeverageModel } from './leverage.model.js'
import * as Buzz from './leverage.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: LeverageModel = new LeverageModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_LEVERAGE:
            return Buzz.updateLeverage(clone(model), act.bale, state as State)

        case Act.INIT_LEVERAGE:
            return Buzz.initLeverage(clone(model), act.bale, state as State)

        default:
            return model
    }
}

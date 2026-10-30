import clone from 'clone-deep'
import * as Act from './bus.action.js'
import { BusModel } from './bus.model.js'
import * as Buzz from './bus.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: BusModel = new BusModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_BUS:
            return Buzz.updateBus(clone(model), act.bale, state as State)

        case Act.OPEN_BUS:
            return Buzz.openBus(clone(model), act.bale, state as State)

        case Act.CONNECT_BUS:
            return Buzz.connectBus(clone(model), act.bale, state as State)

        case Act.CREATE_BUS:
            return Buzz.createBus(clone(model), act.bale, state as State)

        case Act.MESSAGE_BUS:
            return Buzz.connectBus(clone(model), act.bale, state as State)

        case Act.INIT_BUS:
            return Buzz.initBus(clone(model), act.bale, state as State)

        default:
            return model
    }
}

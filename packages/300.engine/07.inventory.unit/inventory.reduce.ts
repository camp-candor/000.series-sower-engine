import clone from 'clone-deep'
import * as Act from './inventory.action.js'
import { InventoryModel } from './inventory.model.js'
import * as Buzz from './inventory.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: InventoryModel = new InventoryModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_INVENTORY:
            return Buzz.updateInventory(clone(model), act.bale, state as State)

        case Act.INIT_INVENTORY:
            return Buzz.initInventory(clone(model), act.bale, state as State)

        default:
            return model
    }
}

/**
 * 07.inventory.unit - Inventory Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './inventory.action.js'
import { InventoryModel } from './inventory.model.js'
import * as Buzz from './inventory.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: InventoryModel = new InventoryModel(),
    act: Act.Actions,
    state?: State,
): InventoryModel | Promise<InventoryModel> {
    switch (act.type) {
        case Act.INIT_INVENTORY:
            return Buzz.initInventory(clone(model), act.bale, state)

        case Act.UPDATE_INVENTORY:
            return Buzz.updateInventory(clone(model), act.bale, state)

        case Act.SET_ARMS_CAPACITY:
            return Buzz.setArmsCapacity(clone(model), act.bale as any, state)

        case Act.TRANSFER_INVENTORY:
            return Buzz.transferInventory(clone(model), act.bale as any, state)

        case Act.DROP_EXCESS_HELD_INVENTORY:
            return Buzz.dropExcessHeldInventoryAction(clone(model), act.bale as any, state)

        case Act.ASSERT_HAND_CAPACITY:
            return Buzz.assertHandCapacityInventoryAction(clone(model), act.bale as any, state)

        case Act.ASSERT_MASS_CONSERVATION:
            return Buzz.assertMassConservationInventoryAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}

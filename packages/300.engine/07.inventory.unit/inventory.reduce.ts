import clone from 'clone-deep'
import * as Act from './inventory.action'
import { InventoryModel } from './inventory.model'
import * as Buzz from './inventory.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: InventoryModel = new InventoryModel(),
    act: Act.Actions,
    state?: State,
): InventoryModel {
    switch (act.type) {
        case Act.INIT_INVENTORY:
            return Buzz.initInventory(clone(model, true), act.bale, state!)

        case Act.UPDATE_INVENTORY:
            return Buzz.updateInventory(clone(model, true), act.bale, state!)

        case Act.SET_ARMS_CAPACITY:
            return Buzz.setArmsCapacity(clone(model, true), act.bale, state!)

        case Act.TRANSFER_INVENTORY:
            Buzz.transferInventory(clone(model, true), act.bale, state!)
            return model

        case Act.DROP_EXCESS_HELD_INVENTORY:
            Buzz.dropExcessHeldInventory(clone(model, true), act.bale, state!)
            return model

        case Act.ASSERT_MASS_CONSERVATION_INVENTORY:
            return Buzz.assertMassConservationInventory(
                clone(model, true),
                act.bale,
                state!,
            )

        default:
            return model
    }
}

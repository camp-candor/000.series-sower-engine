import type { Action } from '../99.core/interface/action.interface'
import type InventoryBit from './fce/inventory.bit'

export const INIT_INVENTORY = '[Inventory action] Init Inventory'
export class InitInventory implements Action<InventoryBit> {
    readonly type = INIT_INVENTORY
    constructor(public bale: InventoryBit) {}
}

export const UPDATE_INVENTORY = '[Inventory action] Update Inventory'
export class UpdateInventory implements Action<InventoryBit> {
    readonly type = UPDATE_INVENTORY
    constructor(public bale: InventoryBit) {}
}

export const SET_ARMS_CAPACITY = '[Inventory action] Set Arms Capacity'
export class SetArmsCapacity implements Action<InventoryBit> {
    readonly type = SET_ARMS_CAPACITY
    constructor(public bale: InventoryBit) {}
}

export const TRANSFER_INVENTORY = '[Inventory action] Transfer Inventory'
export class TransferInventory implements Action<InventoryBit> {
    readonly type = TRANSFER_INVENTORY
    constructor(public bale: InventoryBit) {}
}

export const DROP_EXCESS_HELD_INVENTORY =
    '[Inventory action] Drop Excess Held Inventory'
export class DropExcessHeldInventory implements Action<InventoryBit> {
    readonly type = DROP_EXCESS_HELD_INVENTORY
    constructor(public bale: InventoryBit) {}
}

export const ASSERT_MASS_CONSERVATION_INVENTORY =
    '[Inventory action] Assert Mass Conservation Inventory'
export class AssertMassConservationInventory implements Action<InventoryBit> {
    readonly type = ASSERT_MASS_CONSERVATION_INVENTORY
    constructor(public bale: InventoryBit) {}
}

export type Actions =
    | InitInventory
    | UpdateInventory
    | SetArmsCapacity
    | TransferInventory
    | DropExcessHeldInventory
    | AssertMassConservationInventory

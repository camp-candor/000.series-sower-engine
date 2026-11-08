/**
 * 07.inventory.unit - Inventory Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type InventoryBit from './fce/inventory.bit.js'

export const INIT_INVENTORY = '[Inventory action] Init Inventory'
export class InitInventory implements Action {
    readonly type = INIT_INVENTORY
    constructor(public bale?: InventoryBit) {}
}

export const UPDATE_INVENTORY = '[Inventory action] Update Inventory'
export class UpdateInventory implements Action {
    readonly type = UPDATE_INVENTORY
    constructor(public bale?: InventoryBit) {}
}

export const TRANSFER_INVENTORY = '[Inventory action] Transfer Inventory'
export class TransferInventory implements Action {
    readonly type = TRANSFER_INVENTORY
    constructor(public bale?: InventoryBit) {}
}

export const DROP_EXCESS_HELD_INVENTORY =
    '[Inventory action] Drop Excess Held Inventory'
export class DropExcessHeldInventory implements Action {
    readonly type = DROP_EXCESS_HELD_INVENTORY
    constructor(public bale?: InventoryBit) {}
}

export const SET_ARMS_CAPACITY = '[Inventory action] Set Arms Capacity'
export class SetArmsCapacity implements Action {
    readonly type = SET_ARMS_CAPACITY
    constructor(public bale?: InventoryBit) {}
}

export const ASSERT_HAND_CAPACITY = '[Inventory action] Assert Hand Capacity'
export class AssertHandCapacity implements Action {
    readonly type = ASSERT_HAND_CAPACITY
    constructor(public bale?: InventoryBit) {}
}

export const ASSERT_MASS_CONSERVATION =
    '[Inventory action] Assert Mass Conservation'
export class AssertMassConservation implements Action {
    readonly type = ASSERT_MASS_CONSERVATION
    constructor(public bale?: InventoryBit) {}
}

export type Actions =
    | InitInventory
    | UpdateInventory
    | TransferInventory
    | DropExcessHeldInventory
    | SetArmsCapacity
    | AssertHandCapacity
    | AssertMassConservation

import { Action } from "../99.core/interface/action.interface";
import  InventoryBit  from "./fce/inventory.bit";

// Inventory actions

export const INIT_INVENTORY = "[Inventory action] Init Inventory";
export class InitInventory implements Action {
 readonly type = INIT_INVENTORY;
 constructor(public bale: InventoryBit) {}
}

export const UPDATE_INVENTORY = "[Inventory action] Update Inventory";
export class UpdateInventory implements Action {
 readonly type = UPDATE_INVENTORY;
 constructor(public bale: InventoryBit) {}
}

export type Actions = | InitInventory | UpdateInventory ;

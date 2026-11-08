/**
 * 07.inventory.unit - Inventory Buzzer Barrel Export
 */
export {
    initInventory,
    updateInventory,
    setArmsCapacity,
    transferInventory,
    dropExcessHeldInventoryAction,
    assertHandCapacityInventoryAction,
    assertMassConservationInventoryAction,
    validateHandCapacity,
} from './buz/inventory.buzz.js'
export type {
    EquipSlotType,
    EntityInventoryState,
    ItemTransferPayload,
    DropExcessPayload,
    TransferReceipt,
    HandCapacityAuditReceipt,
    MassConservationAuditReceipt,
} from './fce/inventory.interface.js'
export type { InventoryPayload } from './fce/inventory.bit.js'

/**
 * 07.inventory.unit - Inventory Bit Payload Contracts
 */
import type {
    EquipSlotType,
    EntityInventoryState,
    ItemTransferPayload,
    DropExcessPayload,
    TransferReceipt,
    HandCapacityAuditReceipt,
    MassConservationAuditReceipt,
} from './inventory.interface.js'

export interface InventoryPayload {
    readonly entityId?: string
    readonly targetEntityId?: string
    readonly sourceEntityId?: string
    readonly itemId?: string
    readonly targetSlot?: EquipSlotType
    readonly wornSlotName?: string
    readonly armsAvailable?: number
    readonly transferPayload?: ItemTransferPayload
    readonly dropExcessPayload?: DropExcessPayload
    readonly inventory?: EntityInventoryState
    readonly transferReceipt?: TransferReceipt
    readonly capacityAudit?: HandCapacityAuditReceipt
    readonly massAudit?: MassConservationAuditReceipt
    readonly droppedItems?: readonly string[]
    readonly timestampMs?: number
    readonly error?: string
}

export default interface InventoryBit {
    idx: string
    src?: string
    val?: number
    dat?: InventoryPayload
    slv?: Function
}

/**
 * 07.inventory.unit - Inventory Interface Contracts
 * 4-slot anatomical equipment hierarchy, hand capacity gating, and mass conservation.
 */

export type EquipSlotType = 'held' | 'worn' | 'slung' | 'cached'

export interface EntityInventoryState {
    readonly entityId: string
    readonly armsAvailable: number // Inherited from 18.trauma.unit: 0, 1, 2
    readonly heldItems: readonly string[] // Bounded by armsAvailable
    readonly wornGear: Readonly<Record<string, string>> // slotName -> itemId
    readonly slungItems: readonly string[] // Shoulder/back load
    readonly cachedItems: readonly string[] // Local container/floor storage
    readonly updatedAtMs: number
}

export interface ItemTransferPayload {
    readonly sourceEntityId?: string
    readonly targetEntityId: string
    readonly itemId: string
    readonly targetSlot: EquipSlotType
    readonly wornSlotName?: string // Required if targetSlot === 'worn'
    readonly timestampMs?: number
}

export interface DropExcessPayload {
    readonly entityId: string
    readonly newArmsAvailable: number
    readonly timestampMs?: number
}

export interface TransferReceipt {
    readonly success: boolean
    readonly itemId: string
    readonly sourceEntityId?: string
    readonly targetEntityId: string
    readonly targetSlot: EquipSlotType
    readonly droppedItems?: readonly string[]
    readonly error?: string
}

export interface HandCapacityAuditReceipt {
    readonly entityId: string
    readonly armsAvailable: number
    readonly heldCount: number
    readonly valid: boolean
    readonly error?: string
}

export interface MassConservationAuditReceipt {
    readonly valid: boolean
    readonly duplicateErrors: readonly string[]
    readonly totalUniqueItems: number
}

export default interface Inventory {
    idx: string
    inventories: Record<string, EntityInventoryState>
}

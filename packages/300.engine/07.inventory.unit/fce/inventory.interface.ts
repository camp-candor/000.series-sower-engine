export type EquipSlotType = 'held' | 'worn' | 'slung' | 'cached'

export interface EntityInventoryState {
    entityId: string
    armsAvailable: number // Inherited from 18.trauma.unit (0, 1, or 2)
    heldItems: string[] // Active engagement (bounded by armsAvailable)
    wornGear: Record<string, string> // Anatomical adhesion (key: slot name, val: itemId)
    slungItems: string[] // Passive shoulder/back burden
    cachedItems: string[] // Unheld floor/container/pocket storage
    updatedAtMs: number
}

export interface ItemTransferPayload {
    sourceEntityId?: string // If undefined, drawing from ground/cache
    targetEntityId: string
    itemId: string
    targetSlot: EquipSlotType
    wornSlotName?: string // Required if targetSlot === 'worn'
    timestampMs?: number
}

export interface DropExcessPayload {
    entityId: string
    newArmsAvailable: number
    timestampMs?: number
}

export interface TransferReceipt {
    success: boolean
    itemId: string
    sourceEntityId?: string
    targetEntityId: string
    targetSlot: EquipSlotType
    droppedItems?: string[]
    error?: string
}

export interface HandCapacityAuditReceipt {
    entityId: string
    armsAvailable: number
    heldCount: number
    valid: boolean
    error?: string
}

export default interface Inventory {
    idx: string
    inventories: Record<string, EntityInventoryState>
}

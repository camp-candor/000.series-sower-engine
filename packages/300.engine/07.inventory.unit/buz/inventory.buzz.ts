import type { InventoryModel } from '../inventory.model'
import type InventoryBit from '../fce/inventory.bit'
import type State from '../../99.core/state'
import type {
    EntityInventoryState,
    ItemTransferPayload,
    DropExcessPayload,
    TransferReceipt,
    HandCapacityAuditReceipt,
    EquipSlotType,
} from '../fce/inventory.interface'

export const createDefaultInventoryState = (
    entityId: string,
    armsAvailable = 2,
): EntityInventoryState => ({
    entityId,
    armsAvailable,
    heldItems: [],
    wornGear: {},
    slungItems: [],
    cachedItems: [],
    updatedAtMs: 0,
})

export const validateHandCapacity = (
    armsAvailable: number,
    heldCount: number,
): boolean => {
    return heldCount <= armsAvailable
}

export const initInventory = (
    cpy: InventoryModel,
    bal: InventoryBit,
    _ste: State,
): InventoryModel => {
    cpy.inventories = {}
    if (bal?.slv) bal.slv({ invBit: { idx: 'init-inventory', val: 0 } })
    return cpy
}

export const updateInventory = (
    cpy: InventoryModel,
    bal: InventoryBit,
    _ste: State,
): InventoryModel => {
    if (bal?.slv) bal.slv({ invBit: { idx: 'update-inventory' } })
    return cpy
}

export const setArmsCapacity = (
    cpy: InventoryModel,
    bal: InventoryBit<any>,
    _ste: State,
): InventoryModel => {
    const payload = bal?.dat
    if (!payload?.entityId) {
        if (bal?.slv)
            bal.slv({
                invBit: {
                    idx: 'set-arms-capacity-err',
                    src: 'MISSING_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    const existing =
        cpy.inventories[payload.entityId] ||
        createDefaultInventoryState(payload.entityId, payload.armsAvailable)
    existing.armsAvailable = Math.max(0, Math.min(2, payload.armsAvailable))
    cpy.inventories[payload.entityId] = existing

    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: 'set-arms-capacity',
                src: payload.entityId,
                val: existing.armsAvailable,
                dat: existing,
            },
        })
    }
    return cpy
}

export const transferInventory = async (
    cpy: InventoryModel,
    bal: InventoryBit<any>,
    ste: State,
): Promise<InventoryModel> => {
    const payload = bal?.dat
    if (!payload?.targetEntityId || !payload?.itemId || !payload?.targetSlot) {
        if (bal?.slv)
            bal.slv({
                invBit: {
                    idx: 'transfer-inventory-err',
                    src: 'MISSING_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    const target =
        cpy.inventories[payload.targetEntityId] ||
        createDefaultInventoryState(payload.targetEntityId)

    // 1. Hand Capacity Invariant Pre-Flight Gate
    if (payload.targetSlot === 'held') {
        const projectedHeldCount = target.heldItems.includes(payload.itemId)
            ? target.heldItems.length
            : target.heldItems.length + 1

        if (!validateHandCapacity(target.armsAvailable, projectedHeldCount)) {
            const errorMsg = `>> [HAND_CAPACITY_BREACH] Entity ${payload.targetEntityId} has ${target.armsAvailable} arm(s) available, cannot hold ${projectedHeldCount} items!`
            const line2 =
                '>> DIRECTORIAL ACTION: Transaction aborted at T0 = $0.00'

            const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
            if (lib && typeof lib.hunt === 'function' && lib !== ste) {
                try {
                    await lib.hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: errorMsg,
                    })
                    await lib.hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: line2,
                    })
                } catch {}
            }
            if (ste && typeof ste.hunt === 'function') {
                await Promise.race([
                    ste.hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: errorMsg,
                    }),
                    new Promise((resolve) => setTimeout(resolve, 50)),
                ]).catch(() => {})
                await Promise.race([
                    ste.hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: line2,
                    }),
                    new Promise((resolve) => setTimeout(resolve, 50)),
                ]).catch(() => {})
            }

            const receipt: TransferReceipt = {
                success: false,
                itemId: payload.itemId,
                sourceEntityId: payload.sourceEntityId,
                targetEntityId: payload.targetEntityId,
                targetSlot: payload.targetSlot,
                error: errorMsg,
            }

            if (bal?.slv) {
                bal.slv({
                    invBit: {
                        idx: 'hand-capacity-breach',
                        src: payload.targetEntityId,
                        val: -1,
                        dat: receipt,
                    },
                })
            }
            return cpy
        }
    }

    // 2. Remove Item from Source Entity or Target's existing slots (Mass Conservation)
    const removeFromEntity = (entity: EntityInventoryState, id: string) => {
        entity.heldItems = entity.heldItems.filter((i) => i !== id)
        entity.slungItems = entity.slungItems.filter((i) => i !== id)
        entity.cachedItems = entity.cachedItems.filter((i) => i !== id)
        for (const slotKey in entity.wornGear) {
            if (entity.wornGear[slotKey] === id) {
                delete entity.wornGear[slotKey]
            }
        }
    }

    if (payload.sourceEntityId && cpy.inventories[payload.sourceEntityId]) {
        removeFromEntity(
            cpy.inventories[payload.sourceEntityId],
            payload.itemId,
        )
    }
    removeFromEntity(target, payload.itemId)

    // 3. Place Item into Target Slot
    switch (payload.targetSlot) {
        case 'held':
            target.heldItems.push(payload.itemId)
            break
        case 'worn':
            if (!payload.wornSlotName) {
                throw new Error(
                    '[WORN_SLOT_REQUIRED] wornSlotName required for targetSlot === "worn"',
                )
            }
            target.wornGear[payload.wornSlotName] = payload.itemId
            break
        case 'slung':
            target.slungItems.push(payload.itemId)
            break
        case 'cached':
            target.cachedItems.push(payload.itemId)
            break
    }

    target.updatedAtMs = payload.timestampMs ?? target.updatedAtMs + 1
    cpy.inventories[payload.targetEntityId] = target

    const receipt: TransferReceipt = {
        success: true,
        itemId: payload.itemId,
        sourceEntityId: payload.sourceEntityId,
        targetEntityId: payload.targetEntityId,
        targetSlot: payload.targetSlot,
    }

    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: 'transfer-inventory-ok',
                src: payload.targetEntityId,
                val: target.heldItems.length,
                dat: receipt,
            },
        })
    }

    return cpy
}

export const dropExcessHeldInventory = async (
    cpy: InventoryModel,
    bal: InventoryBit<any>,
    ste: State,
): Promise<InventoryModel> => {
    const payload = bal?.dat
    if (!payload?.entityId) {
        if (bal?.slv)
            bal.slv({
                invBit: {
                    idx: 'drop-excess-err',
                    src: 'MISSING_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    const existing =
        cpy.inventories[payload.entityId] ||
        createDefaultInventoryState(payload.entityId)
    const newArms = Math.max(0, Math.min(2, payload.newArmsAvailable))
    existing.armsAvailable = newArms

    const droppedItems: string[] = []

    // Evict excess held items into cachedItems (local floor)
    while (existing.heldItems.length > existing.armsAvailable) {
        const dropped = existing.heldItems.pop()
        if (dropped) {
            existing.cachedItems.push(dropped)
            droppedItems.push(dropped)
        }
    }

    existing.updatedAtMs = payload.timestampMs ?? existing.updatedAtMs + 1
    cpy.inventories[payload.entityId] = existing

    if (droppedItems.length > 0) {
        const logMsg = `>> [INVENTORY_DROPPED] Entity ${payload.entityId} arms reduced to ${newArms}. Ejected to floor: [${droppedItems.join(', ')}]`
        const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
        if (lib && typeof lib.hunt === 'function' && lib !== ste) {
            try {
                await lib.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: logMsg,
                })
            } catch {}
        }
        if (ste && typeof ste.hunt === 'function') {
            await Promise.race([
                ste.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: logMsg,
                }),
                new Promise((resolve) => setTimeout(resolve, 50)),
            ]).catch(() => {})
        }
    }

    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: 'drop-excess-held-inventory',
                src: payload.entityId,
                val: droppedItems.length,
                lst: droppedItems,
                dat: {
                    entityId: payload.entityId,
                    armsAvailable: newArms,
                    droppedItems,
                },
            },
        })
    }

    return cpy
}

export const assertMassConservationInventory = (
    cpy: InventoryModel,
    bal: InventoryBit,
    _ste: State,
): InventoryModel => {
    const itemLocationMap = new Map<string, string>()
    const duplicateErrors: string[] = []

    for (const [entityId, inv] of Object.entries(cpy.inventories)) {
        const checkItem = (itemId: string, slot: string) => {
            if (itemLocationMap.has(itemId)) {
                duplicateErrors.push(
                    `[DUPLICATE_ITEM_BREACH] Item ${itemId} found in ${slot} of ${entityId}, but already logged at ${itemLocationMap.get(itemId)}`,
                )
            } else {
                itemLocationMap.set(itemId, `${entityId}:${slot}`)
            }
        }

        inv.heldItems.forEach((id) => checkItem(id, 'held'))
        inv.slungItems.forEach((id) => checkItem(id, 'slung'))
        inv.cachedItems.forEach((id) => checkItem(id, 'cached'))
        for (const [slotKey, id] of Object.entries(inv.wornGear)) {
            checkItem(id, `worn:${slotKey}`)
        }
    }

    const valid = duplicateErrors.length === 0

    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: valid
                    ? 'assert-mass-conservation-ok'
                    : 'assert-mass-conservation-fail',
                val: duplicateErrors.length,
                lst: duplicateErrors,
                dat: { valid, duplicateErrors },
            },
        })
    }

    return cpy
}

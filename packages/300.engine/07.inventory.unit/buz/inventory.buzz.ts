/**
 * 07.inventory.unit - Inventory Buzz Business Logic
 * 4-slot anatomical equipment management, hand capacity invariant gating, and mass conservation.
 */
import { InventoryModel } from '../inventory.model.js'
import type InventoryBit from '../fce/inventory.bit.js'
import type {

    EntityInventoryState,
    ItemTransferPayload,
    DropExcessPayload,
    TransferReceipt,
    HandCapacityAuditReceipt,
    MassConservationAuditReceipt,
} from '../fce/inventory.interface.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function validateHandCapacity(armsAvailable: number, heldCount: number): boolean {
    return heldCount <= armsAvailable
}

function getOrCreateInventory(
    cpy: InventoryModel,
    entityId: string,
    timestampMs: number = 1700000000000,
): EntityInventoryState {
    if (!cpy.inventories[entityId]) {
        cpy.inventories[entityId] = {
            entityId,
            armsAvailable: 2,
            heldItems: Object.freeze([]),
            wornGear: Object.freeze({}),
            slungItems: Object.freeze([]),
            cachedItems: Object.freeze([]),
            updatedAtMs: timestampMs,
        }
    }
    return cpy.inventories[entityId]
}

export const initInventory = (
    cpy: InventoryModel,
    bal?: InventoryBit,
    _ste?: State,
): InventoryModel => {
    cpy.inventories = {}
    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: 'init-inventory-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateInventory = (
    cpy: InventoryModel,
    bal?: InventoryBit,
    _ste?: State,
): InventoryModel => {
    if (bal?.slv) {
        bal.slv({
            invBit: {
                idx: 'update-inventory-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const setArmsCapacity = (
    cpy: InventoryModel,
    bal: InventoryBit,
    _ste?: State,
): InventoryModel => {
    const entityId = bal.dat?.entityId || bal.src
    const arms = bal.dat?.armsAvailable ?? 2
    const timestampMs = bal.dat?.timestampMs || 1700000000000

    if (entityId) {
        const inv = getOrCreateInventory(cpy, entityId, timestampMs)
        cpy.inventories[entityId] = {
            ...inv,
            armsAvailable: Math.max(0, Math.min(2, Math.floor(arms))),
            updatedAtMs: timestampMs,
        }

        if (bal.slv) {
            bal.slv({
                invBit: {
                    idx: 'set-arms-capacity-pass',
                    val: cpy.inventories[entityId].armsAvailable,
                    dat: { inventory: cpy.inventories[entityId] },
                },
            })
        }
    }
    return cpy
}

export const transferInventory = async (
    cpy: InventoryModel,
    bal: InventoryBit,
    ste?: State,
): Promise<InventoryModel> => {
    const payload: ItemTransferPayload = bal.dat?.transferPayload || {
        sourceEntityId: bal.dat?.sourceEntityId,
        targetEntityId: bal.dat?.targetEntityId || '',
        itemId: bal.dat?.itemId || '',
        targetSlot: bal.dat?.targetSlot || 'held',
        wornSlotName: bal.dat?.wornSlotName,
        timestampMs: bal.dat?.timestampMs || 1700000000000,
    }

    const { sourceEntityId, targetEntityId, itemId, targetSlot, wornSlotName } = payload
    const nowMs = payload.timestampMs || 1700000000000

    if (!targetEntityId || !itemId || !targetSlot) {
        const errorMsg = '[INVALID_TRANSFER_PARAMS] Missing targetEntityId, itemId, or targetSlot'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                invBit: {
                    idx: 'transfer-inventory-fail',
                    val: 0,
                    dat: { error: errorMsg, transferReceipt: { success: false, itemId, targetEntityId, targetSlot, error: errorMsg } },
                },
            })
        }
        return cpy
    }

    const targetInv = getOrCreateInventory(cpy, targetEntityId, nowMs)

    // Hand Capacity Invariant Gate (T_0 = $0.00)
    if (targetSlot === 'held') {
        const isAlreadyHeld = targetInv.heldItems.includes(itemId)
        const projectedHeldCount = isAlreadyHeld
            ? targetInv.heldItems.length
            : targetInv.heldItems.length + 1

        if (!validateHandCapacity(targetInv.armsAvailable, projectedHeldCount)) {
            const errorMsg = `[HAND_CAPACITY_BREACH] Entity '${targetEntityId}' has ${targetInv.armsAvailable} arm(s), cannot hold ${projectedHeldCount} item(s)`
            await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
            if (bal.slv) {
                bal.slv({
                    invBit: {
                        idx: 'hand-capacity-breach',
                        val: -1,
                        src: '[HAND_CAPACITY_BREACH]',
                        dat: {
                            error: errorMsg,
                            transferReceipt: {
                                success: false,
                                itemId,
                                sourceEntityId,
                                targetEntityId,
                                targetSlot,
                                error: errorMsg,
                            },
                        },
                    },
                })
            }
            return cpy
        }
    }

    // Remove item from source entity or target entity's other slots
    if (sourceEntityId && cpy.inventories[sourceEntityId]) {
        const src = cpy.inventories[sourceEntityId]
        const newHeld = src.heldItems.filter((id) => id !== itemId)
        const newWorn = { ...src.wornGear }
        for (const [slot, id] of Object.entries(newWorn)) {
            if (id === itemId) delete newWorn[slot]
        }
        const newSlung = src.slungItems.filter((id) => id !== itemId)
        const newCached = src.cachedItems.filter((id) => id !== itemId)

        cpy.inventories[sourceEntityId] = {
            ...src,
            heldItems: Object.freeze(newHeld),
            wornGear: Object.freeze(newWorn),
            slungItems: Object.freeze(newSlung),
            cachedItems: Object.freeze(newCached),
            updatedAtMs: nowMs,
        }
    }

    // Remove from target's other slots if internal transfer
    const curTarget = cpy.inventories[targetEntityId]
    const filteredHeld = curTarget.heldItems.filter((id) => id !== itemId)
    const filteredWorn = { ...curTarget.wornGear }
    for (const [slot, id] of Object.entries(filteredWorn)) {
        if (id === itemId) delete filteredWorn[slot]
    }
    const filteredSlung = curTarget.slungItems.filter((id) => id !== itemId)
    const filteredCached = curTarget.cachedItems.filter((id) => id !== itemId)

    let finalHeld = filteredHeld
    let finalWorn = filteredWorn
    let finalSlung = filteredSlung
    let finalCached = filteredCached

    if (targetSlot === 'held') {
        finalHeld = [...filteredHeld, itemId]
    } else if (targetSlot === 'worn') {
        const slotKey = wornSlotName || 'gear'
        finalWorn = { ...filteredWorn, [slotKey]: itemId }
    } else if (targetSlot === 'slung') {
        finalSlung = [...filteredSlung, itemId]
    } else if (targetSlot === 'cached') {
        finalCached = [...filteredCached, itemId]
    }

    cpy.inventories[targetEntityId] = {
        ...curTarget,
        heldItems: Object.freeze(finalHeld),
        wornGear: Object.freeze(finalWorn),
        slungItems: Object.freeze(finalSlung),
        cachedItems: Object.freeze(finalCached),
        updatedAtMs: nowMs,
    }

    const receipt: TransferReceipt = {
        success: true,
        itemId,
        sourceEntityId,
        targetEntityId,
        targetSlot,
    }

    await emitConsole(
        ste,
        `>> [INVENTORY:TRANSFER] [OK] Item '${itemId}' transferred to [${targetSlot}] on '${targetEntityId}'. Held: ${finalHeld.length}/${curTarget.armsAvailable}`,
    )

    if (bal.slv) {
        bal.slv({
            transferReceipt: receipt,
            invBit: {
                idx: 'transfer-inventory-pass',
                val: 1,
                dat: { transferReceipt: receipt, inventory: cpy.inventories[targetEntityId] },
            },
        })
    }

    return cpy
}

export const dropExcessHeldInventoryAction = async (
    cpy: InventoryModel,
    bal: InventoryBit,
    ste?: State,
): Promise<InventoryModel> => {
    const payload: DropExcessPayload = bal.dat?.dropExcessPayload || {
        entityId: bal.dat?.entityId || bal.src || '',
        newArmsAvailable: bal.dat?.armsAvailable ?? 0,
        timestampMs: bal.dat?.timestampMs || 1700000000000,
    }

    const { entityId, newArmsAvailable } = payload
    const nowMs = payload.timestampMs || 1700000000000

    if (!entityId || !cpy.inventories[entityId]) {
        if (bal.slv) {
            bal.slv({
                invBit: {
                    idx: 'drop-excess-fail',
                    val: 0,
                    dat: { error: `Entity '${entityId}' not found in inventory registry` },
                },
            })
        }
        return cpy
    }

    const inv = cpy.inventories[entityId]
    const clampedArms = Math.max(0, Math.min(2, Math.floor(newArmsAvailable)))
    const currentHeld = [...inv.heldItems]
    const dropped: string[] = []

    while (currentHeld.length > clampedArms) {
        const popped = currentHeld.pop()
        if (popped) {
            dropped.push(popped)
        }
    }

    const newCached = [...inv.cachedItems, ...dropped]

    cpy.inventories[entityId] = {
        ...inv,
        armsAvailable: clampedArms,
        heldItems: Object.freeze(currentHeld),
        cachedItems: Object.freeze(newCached),
        updatedAtMs: nowMs,
    }

    if (dropped.length > 0) {
        await emitConsole(
            ste,
            `:: [INVENTORY_DROPPED] [${entityId}] Traumatic amputation/deficit dropped ${dropped.length} item(s) to cache/floor: [${dropped.join(', ')}]`,
        )
    }

    if (bal.slv) {
        bal.slv({
            droppedItems: dropped,
            invBit: {
                idx: 'drop-excess-pass',
                val: dropped.length,
                dat: { droppedItems: dropped, inventory: cpy.inventories[entityId] },
            },
        })
    }

    return cpy
}

export const assertHandCapacityInventoryAction = async (
    cpy: InventoryModel,
    bal: InventoryBit,
    ste?: State,
): Promise<InventoryModel> => {
    const entityId = bal.dat?.entityId || bal.src || ''
    const inv = entityId ? cpy.inventories[entityId] : undefined

    if (!inv) {
        const receipt: HandCapacityAuditReceipt = {
            entityId,
            armsAvailable: 0,
            heldCount: 0,
            valid: true,
        }
        if (bal.slv) {
            bal.slv({
                capacityAudit: receipt,
                invBit: {
                    idx: 'assert-hand-capacity-pass',
                    val: 1,
                    dat: { capacityAudit: receipt },
                },
            })
        }
        return cpy
    }

    const valid = validateHandCapacity(inv.armsAvailable, inv.heldItems.length)
    const receipt: HandCapacityAuditReceipt = {
        entityId,
        armsAvailable: inv.armsAvailable,
        heldCount: inv.heldItems.length,
        valid,
        error: valid
            ? undefined
            : `[HAND_CAPACITY_BREACH] Holding ${inv.heldItems.length} items with ${inv.armsAvailable} arms available`,
    }

    if (!valid) {
        await emitConsole(ste, `:: [FAIL] ${receipt.error}`)
    }

    if (bal.slv) {
        bal.slv({
            capacityAudit: receipt,
            invBit: {
                idx: valid ? 'assert-hand-capacity-pass' : 'hand-capacity-breach',
                val: valid ? 1 : -1,
                dat: { capacityAudit: receipt },
            },
        })
    }

    return cpy
}

export const assertMassConservationInventoryAction = (
    cpy: InventoryModel,
    bal: InventoryBit,
    _ste?: State,
): InventoryModel => {
    const seenItems = new Map<string, string>() // itemId -> slot description
    const duplicates: string[] = []

    for (const [entityId, inv] of Object.entries(cpy.inventories)) {
        for (const item of inv.heldItems) {
            const loc = `${entityId}.held`
            if (seenItems.has(item)) {
                duplicates.push(`[DUPLICATE_ITEM_BREACH] Item '${item}' duplicated in ${loc} and ${seenItems.get(item)}`)
            } else {
                seenItems.set(item, loc)
            }
        }

        for (const [slot, item] of Object.entries(inv.wornGear)) {
            const loc = `${entityId}.worn.${slot}`
            if (seenItems.has(item)) {
                duplicates.push(`[DUPLICATE_ITEM_BREACH] Item '${item}' duplicated in ${loc} and ${seenItems.get(item)}`)
            } else {
                seenItems.set(item, loc)
            }
        }

        for (const item of inv.slungItems) {
            const loc = `${entityId}.slung`
            if (seenItems.has(item)) {
                duplicates.push(`[DUPLICATE_ITEM_BREACH] Item '${item}' duplicated in ${loc} and ${seenItems.get(item)}`)
            } else {
                seenItems.set(item, loc)
            }
        }

        for (const item of inv.cachedItems) {
            const loc = `${entityId}.cached`
            if (seenItems.has(item)) {
                duplicates.push(`[DUPLICATE_ITEM_BREACH] Item '${item}' duplicated in ${loc} and ${seenItems.get(item)}`)
            } else {
                seenItems.set(item, loc)
            }
        }
    }

    const valid = duplicates.length === 0
    const receipt: MassConservationAuditReceipt = {
        valid,
        duplicateErrors: Object.freeze(duplicates),
        totalUniqueItems: seenItems.size,
    }

    if (bal.slv) {
        bal.slv({
            massAudit: receipt,
            invBit: {
                idx: valid ? 'assert-mass-pass' : 'assert-mass-breach',
                val: valid ? 1 : -1,
                dat: { massAudit: receipt },
            },
        })
    }

    return cpy
}


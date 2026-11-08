import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { InventoryModel } from './inventory.model.js'
import {
    initInventory,
    setArmsCapacity,
    transferInventory,
    dropExcessHeldInventoryAction,
    assertMassConservationInventoryAction,
    validateHandCapacity,
} from './buz/inventory.buzz.js'
import { TRANSFER_INVENTORY } from './inventory.action.js'
import { reducer } from './inventory.reduce.js'

describe('07.inventory.unit - Hand Capacity Invariant & Logistical Conservation', () => {
    let model: InventoryModel

    beforeEach(() => {
        model = new InventoryModel()
        initInventory(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('validates hand capacity inequality (heldCount <= armsAvailable)', () => {
        expect(validateHandCapacity(2, 0)).toBe(true)
        expect(validateHandCapacity(2, 1)).toBe(true)
        expect(validateHandCapacity(2, 2)).toBe(true)
        expect(validateHandCapacity(2, 3)).toBe(false)
        expect(validateHandCapacity(1, 1)).toBe(true)
        expect(validateHandCapacity(1, 2)).toBe(false)
        expect(validateHandCapacity(0, 1)).toBe(false)
    })

    it('permits item transfer when hand capacity is available', async () => {
        setArmsCapacity(model, {
            idx: 'set-arms',
            dat: { entityId: 'char_bog', armsAvailable: 2 },
        })

        const slv = vi.fn()
        await transferInventory(
            model,
            {
                idx: 'equip-knife',
                dat: {
                    targetEntityId: 'char_bog',
                    itemId: 'item_iron_knife',
                    targetSlot: 'held',
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const receipt = slv.mock.calls[0][0].transferReceipt
        expect(receipt.success).toBe(true)
        expect(model.inventories['char_bog'].heldItems).toContain(
            'item_iron_knife',
        )
    })

    it('aborts at T0 ($0.00) with [HAND_CAPACITY_BREACH] when one-armed actor over-allocates', async () => {
        // Wart has 1 available arm (severed left arm)
        setArmsCapacity(model, {
            idx: 'set-arms',
            dat: { entityId: 'char_wart', armsAvailable: 1 },
        })

        // Equip item 1: Knife -> OK
        await transferInventory(
            model,
            {
                idx: 'equip-1',
                dat: {
                    targetEntityId: 'char_wart',
                    itemId: 'item_iron_knife',
                    targetSlot: 'held',
                },
            },
            {} as any,
        )

        // Equip item 2: Torch -> Over capacity (1 arm, 2 held items)
        const slv = vi.fn()
        await transferInventory(
            model,
            {
                idx: 'equip-2',
                dat: {
                    targetEntityId: 'char_wart',
                    itemId: 'item_torch',
                    targetSlot: 'held',
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                invBit: expect.objectContaining({
                    val: -1,
                    idx: 'hand-capacity-breach',
                    src: '[HAND_CAPACITY_BREACH]',
                    dat: expect.objectContaining({
                        error: expect.stringContaining(
                            '[HAND_CAPACITY_BREACH]',
                        ),
                    }),
                }),
            }),
        )

        expect(model.inventories['char_wart'].heldItems).toEqual([
            'item_iron_knife',
        ])
    })

    it('automatically ejects excess held items to cache when amputation occurs', async () => {
        setArmsCapacity(model, {
            idx: 'set-arms',
            dat: { entityId: 'char_bog', armsAvailable: 2 },
        })

        // Equip 2 items
        await transferInventory(
            model,
            {
                idx: 'eq1',
                dat: {
                    targetEntityId: 'char_bog',
                    itemId: 'item_knife',
                    targetSlot: 'held',
                },
            },
            {} as any,
        )
        await transferInventory(
            model,
            {
                idx: 'eq2',
                dat: {
                    targetEntityId: 'char_bog',
                    itemId: 'item_torch',
                    targetSlot: 'held',
                },
            },
            {} as any,
        )

        expect(model.inventories['char_bog'].heldItems.length).toBe(2)

        // Amputation reduces arms from 2 to 1
        const slv = vi.fn()
        await dropExcessHeldInventoryAction(
            model,
            {
                idx: 'drop-amputation',
                dat: { entityId: 'char_bog', armsAvailable: 1 },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const dropped = slv.mock.calls[0][0].droppedItems
        expect(dropped).toEqual(['item_torch'])
        expect(model.inventories['char_bog'].heldItems).toEqual(['item_knife'])
        expect(model.inventories['char_bog'].cachedItems).toContain(
            'item_torch',
        )
    })

    it('detects duplicate items across entities or slots (Mass Conservation)', () => {
        model.inventories['char_bog'] = {
            entityId: 'char_bog',
            armsAvailable: 2,
            heldItems: ['item_shared_crowbar'],
            wornGear: {},
            slungItems: [],
            cachedItems: [],
            updatedAtMs: 1,
        }
        model.inventories['char_wart'] = {
            entityId: 'char_wart',
            armsAvailable: 1,
            heldItems: ['item_shared_crowbar'],
            wornGear: {},
            slungItems: [],
            cachedItems: [],
            updatedAtMs: 1,
        }

        const slv = vi.fn()
        assertMassConservationInventoryAction(
            model,
            {
                idx: 'audit-mass',
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        const audit = slv.mock.calls[0][0].massAudit
        expect(audit.valid).toBe(false)
        expect(audit.duplicateErrors[0]).toContain('[DUPLICATE_ITEM_BREACH]')
    })

    it('routes TRANSFER_INVENTORY cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: TRANSFER_INVENTORY,
                bale: {
                    idx: 'transfer-test',
                    dat: {
                        targetEntityId: 'char_bog',
                        itemId: 'item_hat',
                        targetSlot: 'worn',
                        wornSlotName: 'head',
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as InventoryModel

        expect(result).toBeInstanceOf(InventoryModel)
        expect(slv).toHaveBeenCalled()
    })
})

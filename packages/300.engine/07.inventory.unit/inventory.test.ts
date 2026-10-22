import { describe, it, expect, vi } from 'vitest'
import {
    transferInventory,
    dropExcessHeldInventory,
    assertMassConservationInventory,
    setArmsCapacity,
    validateHandCapacity,
} from './buz/inventory.buzz'
import { InventoryModel } from './inventory.model'

describe('07.inventory.unit - Hand Capacity Invariant & Logistical Conservation', () => {
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
        const model = new InventoryModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        setArmsCapacity(
            model,
            {
                idx: 'set-arms',
                dat: { entityId: 'char_bog', armsAvailable: 2 },
            },
            mockState,
        )

        let receipt: any
        await transferInventory(
            model,
            {
                idx: 'equip-knife',
                dat: {
                    targetEntityId: 'char_bog',
                    itemId: 'item_iron_knife',
                    targetSlot: 'held',
                },
                slv: (res) => {
                    receipt = res.invBit.dat
                },
            },
            mockState,
        )

        expect(receipt.success).toBe(true)
        expect(model.inventories['char_bog'].heldItems).toContain(
            'item_iron_knife',
        )
    })

    it('aborts at T0 ($0.00) with [HAND_CAPACITY_BREACH] when one-armed actor over-allocates', async () => {
        const model = new InventoryModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        // Wart has 1 available arm (severed left arm)
        setArmsCapacity(
            model,
            {
                idx: 'set-arms',
                dat: { entityId: 'char_wart', armsAvailable: 1 },
            },
            mockState,
        )

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
            mockState,
        )

        // Equip item 2: Torch -> Over capacity (1 arm, 2 held items)
        let receipt: any
        await transferInventory(
            model,
            {
                idx: 'equip-2',
                dat: {
                    targetEntityId: 'char_wart',
                    itemId: 'item_torch',
                    targetSlot: 'held',
                },
                slv: (res) => {
                    receipt = res.invBit.dat
                },
            },
            mockState,
        )

        expect(receipt.success).toBe(false)
        expect(receipt.error).toContain('[HAND_CAPACITY_BREACH]')
        expect(model.inventories['char_wart'].heldItems).toEqual([
            'item_iron_knife',
        ])
        expect(mockState.hunt).toHaveBeenCalledWith(
            '[Console action] Update Console',
            expect.objectContaining({
                idx: 'cns00',
                src: expect.stringContaining('[HAND_CAPACITY_BREACH]'),
            }),
        )
    })

    it('automatically ejects excess held items to cache when amputation occurs', async () => {
        const model = new InventoryModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        setArmsCapacity(
            model,
            {
                idx: 'set-arms',
                dat: { entityId: 'char_bog', armsAvailable: 2 },
            },
            mockState,
        )

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
            mockState,
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
            mockState,
        )

        expect(model.inventories['char_bog'].heldItems.length).toBe(2)

        // Amputation reduces arms from 2 to 1
        let dropResult: any
        await dropExcessHeldInventory(
            model,
            {
                idx: 'drop-amputation',
                dat: { entityId: 'char_bog', newArmsAvailable: 1 },
                slv: (res) => {
                    dropResult = res.invBit.dat
                },
            },
            mockState,
        )

        expect(dropResult.droppedItems).toEqual(['item_torch'])
        expect(model.inventories['char_bog'].heldItems).toEqual(['item_knife'])
        expect(model.inventories['char_bog'].cachedItems).toContain(
            'item_torch',
        )
    })

    it('detects duplicate items across entities or slots (Mass Conservation)', () => {
        const model = new InventoryModel()
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

        let auditResult: any
        assertMassConservationInventory(
            model,
            {
                idx: 'audit-mass',
                slv: (res) => {
                    auditResult = res.invBit.dat
                },
            },
            {} as any,
        )

        expect(auditResult.valid).toBe(false)
        expect(auditResult.duplicateErrors[0]).toContain(
            '[DUPLICATE_ITEM_BREACH]',
        )
    })
})

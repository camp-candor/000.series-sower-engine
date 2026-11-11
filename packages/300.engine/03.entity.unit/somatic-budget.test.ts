import { describe, it, expect } from 'vitest'
import { extractSomaticState } from './buz/somatic-query.buzz.js'
import {
    BASE_MOVEMENT_UNIT_COST,
    deriveSomaticBudget,
    validateHandCapacity,
} from './buz/budget-calculator.buzz.js'
import { verifyTraversalBudget } from '../10.location.unit/buz/budget-guard.buzz.js'

describe('03.entity.unit & 10.location.unit - Somatic Condition Budget Translation Battery', () => {
    it('calculates uninjured baseline movement budget and unrestricted verbs', () => {
        const somatic = extractSomaticState({
            entityId: 'char_bog',
            availableArms: 2,
            availableLegs: 2,
            locomotionTier: 'UNRESTRICTED',
            fatigueBps: 0,
            painBps: 0,
            refusalStrainBps: 0,
            activeTrauma: [],
        })

        const receipt = deriveSomaticBudget(somatic)
        expect(receipt.movementBudgetCostUnits).toBe(BASE_MOVEMENT_UNIT_COST)
        expect(receipt.canSprint).toBe(true)
        expect(receipt.canActuateTwoHandedVerbs).toBe(true)
        expect(receipt.bannedKineticVerbs).toHaveLength(0)
    })

    it('scales budget and injects kinetic bans for limping locomotion and high fatigue', () => {
        const somatic = extractSomaticState({
            entityId: 'char_skulk',
            availableArms: 2,
            availableLegs: 1,
            locomotionTier: 'LIMP',
            fatigueBps: 5000, // 50.00% fatigue
            painBps: 2000,
            refusalStrainBps: 0,
            activeTrauma: [],
        })

        // base: 100 * (10000 + 5000) / 10000 = 150
        // tier: 150 * 15000 / 10000 = 225
        const receipt = deriveSomaticBudget(somatic)
        expect(receipt.movementBudgetCostUnits).toBe(225)
        expect(receipt.canSprint).toBe(false)
        expect(receipt.bannedKineticVerbs).toContain('SPRINT')
        expect(receipt.bannedKineticVerbs).toContain('LEAP')
    })

    it('prohibits two-handed actions and climbs on unilateral arm amputation', () => {
        const somatic = extractSomaticState({
            entityId: 'char_wart',
            availableArms: 1,
            availableLegs: 2,
            locomotionTier: 'UNRESTRICTED',
            fatigueBps: 0,
            painBps: 0,
            refusalStrainBps: 0,
            activeTrauma: ['brachial_plexus_severed'],
        })

        const receipt = deriveSomaticBudget(somatic)
        expect(receipt.canActuateTwoHandedVerbs).toBe(false)
        expect(receipt.bannedKineticVerbs).toContain('WIELD_TWO_HANDED')
        expect(receipt.bannedKineticVerbs).toContain('CLIMB_ROPE')
        expect(receipt.bannedKineticVerbs).toContain('DUAL_WIELD')
    })

    it('enforces Gillian integer basis-point bounds and float rejections', () => {
        expect(() =>
            extractSomaticState({
                entityId: 'char_broken',
                fatigueBps: 10001,
            }),
        ).toThrow('GILLIAN_BPS_BREACH')

        expect(() =>
            extractSomaticState({
                entityId: 'char_broken',
                fatigueBps: 25.5,
            }),
        ).toThrow('SOMATIC_INTEGER_BREACH')
    })

    it('validates hand capacity against active arm count', () => {
        const ok = validateHandCapacity(2, [
            { itemId: 'item_knife', occupiesHands: 1 },
            { itemId: 'item_torch', occupiesHands: 1 },
        ])
        expect(ok.valid).toBe(true)
        expect(ok.totalOccupiedHands).toBe(2)

        const fail = validateHandCapacity(1, [
            { itemId: 'item_shield', occupiesHands: 1 },
            { itemId: 'item_spear', occupiesHands: 1 },
        ])
        expect(fail.valid).toBe(false)
        expect(fail.error).toContain('HAND_CAPACITY_EXCEEDED')
    })

    it('budget guard fails closed when traversal cost exceeds somatic energy budget', () => {
        const allowed = verifyTraversalBudget(150, 200)
        expect(allowed.permitted).toBe(true)
        expect(allowed.marginUnits).toBe(50)

        const rejected = verifyTraversalBudget(250, 200)
        expect(rejected.permitted).toBe(false)
        expect(rejected.marginUnits).toBe(-50)
        expect(rejected.error).toContain('BUDGET_EXCEEDED')
    })
})

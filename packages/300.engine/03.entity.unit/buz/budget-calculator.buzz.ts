/**
 * 03.entity.unit - Biological Condition Budget Calculator
 * Derives scalar movement costs, banned kinetic verb masks, and hand capacities.
 */
import type {
    SomaticState,
    SomaticBudgetReceipt,
    HeldItemDescriptor,
    HandLoadEvaluation,
} from '../fce/somatic-budget.interface.js'

export const BASE_MOVEMENT_UNIT_COST = 100 // Integer centisecond base cost

export const deriveSomaticBudget = (
    somatic: SomaticState,
): SomaticBudgetReceipt => {
    const banned = new Set<string>()

    // 1. Arm Capability Analysis
    if (somatic.availableArms < 2) {
        banned.add('WIELD_TWO_HANDED')
        banned.add('CLIMB_ROPE')
        banned.add('DUAL_WIELD')
        banned.add('VAULT_OBSTACLE')
    }

    if (somatic.availableArms < 1) {
        banned.add('WIELD_ONE_HANDED')
        banned.add('PULL_LEVER')
        banned.add('GRASP_OBJECT')
        banned.add('PUNCH')
    }

    // 2. Locomotion & Leg Capability Analysis
    if (somatic.availableLegs < 2 || somatic.locomotionTier === 'LIMP') {
        banned.add('SPRINT')
        banned.add('LEAP')
    }

    if (somatic.locomotionTier === 'NEUROPATHY_SHUFFLE') {
        banned.add('SPRINT')
        banned.add('LEAP')
        banned.add('FAST_RETREAT')
    }

    if (somatic.availableLegs < 1 || somatic.locomotionTier === 'IMMOBILIZED') {
        banned.add('WALK')
        banned.add('SPRINT')
        banned.add('LEAP')
        banned.add('TACTICAL_REPOSITION')
    }

    // 3. Trauma Condition Overlays
    for (const condition of somatic.activeTrauma) {
        if (
            condition === 'sprained_wrist_right' ||
            condition === 'dislocated_thumb'
        ) {
            banned.add('WIELD_TWO_HANDED')
            banned.add('HEAVY_DRAW')
        }
        if (
            condition === 'brachial_plexus_severed' ||
            condition === 'paralyzed_left_arm'
        ) {
            banned.add('WIELD_TWO_HANDED')
            banned.add('CLIMB_ROPE')
        }
        if (condition === 'concussed_severe') {
            banned.add('AIMED_RANGED_ATTACK')
            banned.add('RAPID_PARRY')
        }
    }

    // 4. Exhaustion & Pain Penalties (Integer Bps Bounds)
    if (somatic.fatigueBps >= 7500 || somatic.painBps >= 8000) {
        banned.add('SPRINT')
        banned.add('HEAVY_ATTACK')
    }

    // 5. Integer Scalar Movement Budget Calculation
    let tierMultiplierBps = 10000 // 1.0x baseline
    if (somatic.locomotionTier === 'LIMP') {
        tierMultiplierBps = 15000 // 1.5x cost
    } else if (somatic.locomotionTier === 'NEUROPATHY_SHUFFLE') {
        tierMultiplierBps = 25000 // 2.5x cost
    } else if (somatic.locomotionTier === 'IMMOBILIZED') {
        tierMultiplierBps = 100000 // 10.0x cost
    }

    // Strict integer scaling using integer division
    const fatigueScaled = Math.floor(
        (BASE_MOVEMENT_UNIT_COST * (10000 + somatic.fatigueBps)) / 10000,
    )
    const movementBudgetCostUnits = Math.floor(
        (fatigueScaled * tierMultiplierBps) / 10000,
    )

    const bannedKineticVerbs = Object.freeze(Array.from(banned).sort())

    return Object.freeze({
        entityId: somatic.entityId,
        movementBudgetCostUnits,
        bannedKineticVerbs,
        canActuateTwoHandedVerbs:
            somatic.availableArms >= 2 && !banned.has('WIELD_TWO_HANDED'),
        canSprint: !banned.has('SPRINT'),
    })
}

export const validateHandCapacity = (
    availableArms: number,
    heldItems: readonly HeldItemDescriptor[],
): HandLoadEvaluation => {
    let totalOccupiedHands = 0
    for (const item of heldItems) {
        totalOccupiedHands += item.occupiesHands
    }

    const valid = totalOccupiedHands <= availableArms
    return Object.freeze({
        valid,
        totalOccupiedHands,
        availableArms,
        error: valid
            ? undefined
            : `HAND_CAPACITY_EXCEEDED: Held items require ${totalOccupiedHands} hands but only ${availableArms} available`,
    })
}

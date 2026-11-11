/**
 * 03.entity.unit - Somatic Biological Budget & Capability Contracts
 * Decouples biological simulation state from pure spatial oracle calculations.
 */

export type LocomotionTier =
    | 'UNRESTRICTED'
    | 'LIMP'
    | 'NEUROPATHY_SHUFFLE'
    | 'IMMOBILIZED'

export interface SomaticState {
    readonly entityId: string
    readonly availableArms: number // Integer [0, 2]
    readonly availableLegs: number // Integer [0, 2]
    readonly locomotionTier: LocomotionTier
    readonly fatigueBps: number // Integer basis points [0, 10000]
    readonly painBps: number // Integer basis points [0, 10000]
    readonly refusalStrainBps: number // Integer basis points [0, 10000]
    readonly activeTrauma: readonly string[]
}

export interface SomaticBudgetReceipt {
    readonly entityId: string
    readonly movementBudgetCostUnits: number // Discrete integer traversal units (centiseconds)
    readonly bannedKineticVerbs: readonly string[]
    readonly canActuateTwoHandedVerbs: boolean
    readonly canSprint: boolean
}

export interface HeldItemDescriptor {
    readonly itemId: string
    readonly occupiesHands: number // Integer [0, 2]
}

export interface HandLoadEvaluation {
    readonly valid: boolean
    readonly totalOccupiedHands: number
    readonly availableArms: number
    readonly error?: string
}

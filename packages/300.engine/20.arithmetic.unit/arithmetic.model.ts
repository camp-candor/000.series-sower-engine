/**
 * 20.arithmetic.unit - Arithmetic State Model Container
 * Scratchpad accumulator tracking active scaling calculations and audit receipts.
 */

import type {
    BasisPoint,
    ScalingDivisionResult,
} from './fce/arithmetic.interface.js'
import { toBasisPoint } from './fce/arithmetic.interface.js'

export interface ArithmeticState {
    readonly idx: string
    readonly lastScaledValue: BasisPoint
    readonly lastChainedValue: BasisPoint | null
    readonly lastReceipt: ScalingDivisionResult | null
    readonly totalCalculations: number
}

export class ArithmeticModel implements ArithmeticState {
    public readonly idx: string
    public readonly lastScaledValue: BasisPoint
    public readonly lastChainedValue: BasisPoint | null
    public readonly lastReceipt: ScalingDivisionResult | null
    public readonly totalCalculations: number

    constructor(
        idx = '20.arithmetic.unit',
        lastScaledValue: BasisPoint = toBasisPoint(0),
        lastChainedValue: BasisPoint | null = null,
        lastReceipt: ScalingDivisionResult | null = null,
        totalCalculations = 0,
    ) {
        this.idx = idx
        this.lastScaledValue = lastScaledValue
        this.lastChainedValue = lastChainedValue
        this.lastReceipt = lastReceipt
        this.totalCalculations = totalCalculations
        Object.freeze(this)
    }

    public copyWith(changes: Partial<ArithmeticState>): ArithmeticModel {
        return new ArithmeticModel(
            changes.idx ?? this.idx,
            changes.lastScaledValue ?? this.lastScaledValue,
            changes.lastChainedValue !== undefined
                ? changes.lastChainedValue
                : this.lastChainedValue,
            changes.lastReceipt !== undefined
                ? changes.lastReceipt
                : this.lastReceipt,
            changes.totalCalculations ?? this.totalCalculations,
        )
    }
}

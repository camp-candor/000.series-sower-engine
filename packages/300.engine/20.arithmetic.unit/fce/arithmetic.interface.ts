/**
 * 20.arithmetic.unit - Arithmetic Interface Contracts
 * Nominal basis-point brandings and arithmetic model shape.
 */

declare const BasisPointBrand: unique symbol
declare const BigIntBasisPointBrand: unique symbol

export type BasisPoint = number & {
    readonly [BasisPointBrand]: typeof BasisPointBrand
}

export type BigIntBasisPoint = bigint & {
    readonly [BigIntBasisPointBrand]: typeof BigIntBasisPointBrand
}

export const BASIS_POINT_MIN = 0
export const BASIS_POINT_MAX = 10000
export const BASIS_POINT_SCALE = 10000
export const BASIS_POINT_DENOMINATOR = 10000 as const
export const TIE_BREAK_REMAINDER = 5000 as const

export function isBasisPoint(value: number): value is BasisPoint {
    return (
        Number.isInteger(value) &&
        value >= BASIS_POINT_MIN &&
        value <= BASIS_POINT_MAX
    )
}

export function assertBasisPoint(
    value: number,
    _label = 'BasisPoint',
): asserts value is BasisPoint {
    if (!Number.isInteger(value)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] BasisPoint must be a discrete integer. Received: ${value}`,
        )
    }
    if (value < BASIS_POINT_MIN || value > BASIS_POINT_MAX) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] BasisPoint out of bounds [0, 10000]: ${value}`,
        )
    }
}

export function toBasisPoint(value: number, label = 'BasisPoint'): BasisPoint {
    assertBasisPoint(value, label)
    return value as BasisPoint
}

export function isBigIntBasisPoint(value: bigint): value is BigIntBasisPoint {
    return typeof value === 'bigint' && value >= 0n
}

export function assertBigIntBasisPoint(
    value: bigint,
    _label = 'BigIntBasisPoint',
): asserts value is BigIntBasisPoint {
    if (typeof value !== 'bigint') {
        throw new TypeError(
            `[FLOAT_PROHIBITED] BigIntBasisPoint must be a bigint. Received: ${value}`,
        )
    }
    if (value < 0n) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] BigIntBasisPoint must be non-negative: ${value.toString()}`,
        )
    }
}

export function toBigIntBasisPoint(
    value: bigint,
    label = 'BigIntBasisPoint',
): BigIntBasisPoint {
    assertBigIntBasisPoint(value, label)
    return value as BigIntBasisPoint
}

export interface ScalingDivisionResult {
    readonly quotient: number
    readonly remainder: number
    readonly tieDetected: boolean
    readonly roundedOutput: BasisPoint
}

export interface BigIntScalingDivisionResult {
    readonly quotient: bigint
    readonly remainder: bigint
    readonly tieDetected: boolean
    readonly roundedOutput: BigIntBasisPoint
}

export interface ArithmeticState {
    readonly idx: string
    readonly lastScaledValue: BasisPoint
    readonly lastReceipt: ScalingDivisionResult | null
    readonly lastDivisionOutput: number | null
    readonly lastChainedValue: BasisPoint | null
    readonly lastScaledBigIntValue: BigIntBasisPoint | null
    readonly lastBigIntReceipt: BigIntScalingDivisionResult | null
    readonly lastBigIntDivisionOutput: bigint | null
    readonly totalCalculations: number
}

export default interface Arithmetic extends ArithmeticState {}

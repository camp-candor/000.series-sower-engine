/**
 * 20.arithmetic.unit - Nominal Integer Basis Point Contracts
 * Governs discrete integer scalar types to eliminate IEEE-754 floating-point drift.
 */

declare const BasisPointBrand: unique symbol
declare const BigIntBasisPointBrand: unique symbol

/**
 * Nominal branded 32-bit safe integer basis point in [0, 10000].
 * 10,000 bp = 1.0 (100.00%), 1 bp = 0.0001 (0.01%).
 */
export type BasisPoint = number & {
    readonly [BasisPointBrand]: typeof BasisPointBrand
}

/**
 * Nominal branded 64-bit arbitrary precision basis point for high-magnitude multi-hop accumulation.
 */
export type BigIntBasisPoint = bigint & {
    readonly [BigIntBasisPointBrand]: typeof BigIntBasisPointBrand
}

/**
 * Mathematical normalization constants.
 */
export const BASIS_POINT_DENOMINATOR = 10_000 as const
export const TIE_BREAK_REMAINDER = 5_000 as const

/**
 * Result receipt of discrete integer division with Banker's Rounding arbitration.
 */
export interface ScalingDivisionResult {
    readonly quotient: number
    readonly remainder: number
    readonly tieDetected: boolean
    readonly roundedOutput: BasisPoint
}

/**
 * BigInt variant of ScalingDivisionResult for macro-scale tick/spatial intervals.
 */
export interface BigIntScalingDivisionResult {
    readonly quotient: bigint
    readonly remainder: bigint
    readonly tieDetected: boolean
    readonly roundedOutput: BigIntBasisPoint
}

/**
 * Type assertion guard enforcing non-negative integer constraints within [0, 10,000].
 * Throws TypeError on non-integers or floats, RangeError on bounds violation.
 */
export function assertBasisPoint(
    n: number,
    label = 'BasisPoint',
): asserts n is BasisPoint {
    if (!Number.isInteger(n)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${label} must be a whole integer. Received: ${n}`,
        )
    }
    if (n < 0 || n > BASIS_POINT_DENOMINATOR) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${label} must be within [0, ${BASIS_POINT_DENOMINATOR}] bp. Received: ${n}`,
        )
    }
}

/**
 * Factory casting function validating and converting a raw integer into a branded BasisPoint.
 */
export function toBasisPoint(n: number, label = 'BasisPoint'): BasisPoint {
    assertBasisPoint(n, label)
    return n as BasisPoint
}

/**
 * Type assertion guard enforcing non-negative BigInt basis point bounds.
 */
export function assertBigIntBasisPoint(
    n: bigint,
    label = 'BigIntBasisPoint',
): asserts n is BigIntBasisPoint {
    if (n < 0n) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${label} must be within [0n, ${BASIS_POINT_DENOMINATOR}n] bp. Received: ${n}n`,
        )
    }
}

/**
 * Factory casting function validating and converting a bigint into a branded BigIntBasisPoint.
 */
export function toBigIntBasisPoint(
    n: bigint,
    label = 'BigIntBasisPoint',
): BigIntBasisPoint {
    assertBigIntBasisPoint(n, label)
    return n as BigIntBasisPoint
}

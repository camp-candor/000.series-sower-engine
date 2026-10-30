/**
 * 20.arithmetic.unit - Pure BigInt Arbitrary Precision Actions
 * Eliminates silent integer overflow (> 2^53 - 1) across multi-year temporal intervals.
 */

import {
    BASIS_POINT_DENOMINATOR,
    TIE_BREAK_REMAINDER,
    type BigIntBasisPoint,
    type BigIntScalingDivisionResult,
    toBigIntBasisPoint,
} from './fce/arithmetic.interface.js'

export const BASIS_POINT_DENOMINATOR_BIGINT = BigInt(BASIS_POINT_DENOMINATOR)
export const TIE_BREAK_REMAINDER_BIGINT = BigInt(TIE_BREAK_REMAINDER)

/**
 * Arbitrates a BigInt remainder against the midpoint half-divisor.
 * Enforces Round-Half-Even: if r === halfDivisor, round to the nearest even integer quotient.
 */
export function arbitrateRemainderBigInt(
    quotient: bigint,
    remainder: bigint,
    halfDivisor: bigint = TIE_BREAK_REMAINDER_BIGINT,
): bigint {
    if (remainder < halfDivisor) {
        return quotient
    }
    if (remainder > halfDivisor) {
        return quotient + 1n
    }
    return quotient % 2n === 0n ? quotient : quotient + 1n
}

/**
 * Evaluates the full scaling division receipt for (A * B) / 10,000n in BigInt space.
 */
export function evaluateScalingDivisionBigInt(
    a: bigint,
    b: bigint,
): BigIntScalingDivisionResult {
    if (a < 0n || b < 0n) {
        throw new RangeError(
            `[NEGATIVE_PROHIBITED] Basis points cannot be negative. Received: a=${a}n, b=${b}n`,
        )
    }

    const product = a * b
    const quotient = product / BASIS_POINT_DENOMINATOR_BIGINT
    const remainder = product % BASIS_POINT_DENOMINATOR_BIGINT
    const tieDetected = remainder === TIE_BREAK_REMAINDER_BIGINT

    const rounded = arbitrateRemainderBigInt(
        quotient,
        remainder,
        TIE_BREAK_REMAINDER_BIGINT,
    )
    const roundedOutput = toBigIntBasisPoint(rounded)

    const receipt: BigIntScalingDivisionResult = {
        quotient,
        remainder,
        tieDetected,
        roundedOutput,
    }

    return Object.freeze(receipt)
}

/**
 * Scale(A, B) = RoundEven((A * B) / 10,000n) in BigInt space.
 */
export function scaleBasisPointsBigInt(a: bigint, b: bigint): BigIntBasisPoint {
    const receipt = evaluateScalingDivisionBigInt(a, b)
    return receipt.roundedOutput
}

/**
 * Evaluates chained BigInt scalar multiplications enforcing strict left-associativity:
 * Scale(Scale(Scale(val, m1), m2), m3)
 */
export function scaleBasisPointsBigIntChained(
    baseValue: bigint,
    ...multipliers: readonly bigint[]
): BigIntBasisPoint {
    if (multipliers.length === 0) {
        throw new RangeError(
            '[EMPTY_MULTIPLIERS] Chained scaling requires at least one multiplier',
        )
    }

    return multipliers.reduce<BigIntBasisPoint>(
        (acc, currentMultiplier) =>
            scaleBasisPointsBigInt(acc, currentMultiplier),
        toBigIntBasisPoint(baseValue),
    )
}

/**
 * Exact arbitrary-precision integer division implementing Round-Half-Even (Banker's Rounding).
 * Eliminates directional upward drift and handles high-magnitude numbers exceeding 2^53 - 1.
 */
export function divRoundHalfEvenBigInt(
    numerator: bigint,
    denominator: bigint,
): bigint {
    if (denominator === 0n) {
        throw new RangeError('[DIV_ZERO] Division by zero in BigInt arithmetic')
    }

    let n = numerator
    let d = denominator

    // Divisor Sign Normalization: force d > 0n so remainder arithmetic is monotonic
    if (d < 0n) {
        n = -n
        d = -d
    }

    // Floored Euclidean integer division
    let q = n / d
    let r = n % d

    if (r < 0n) {
        q -= 1n
        r += d
    }

    if (r === 0n) {
        return q
    }

    // Remainder Doubling Comparison: compare 2r against d without float division
    const doubleR = r * 2n
    if (doubleR < d) {
        return q
    }
    if (doubleR > d) {
        return q + 1n
    }

    // Exact half-tie: round toward nearest even integer quotient
    return q % 2n === 0n ? q : q + 1n
}

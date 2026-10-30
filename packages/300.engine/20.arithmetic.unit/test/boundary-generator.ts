/**
 * 20.arithmetic.unit - Remainder Boundary Matrix Generator
 * Constructs targeted test matrices to stress Round-Half-Even tie breaking.
 */

import {
    BASIS_POINT_DENOMINATOR,
    TIE_BREAK_REMAINDER,
} from '../fce/arithmetic.interface.js'

export interface BoundaryPair {
    readonly a: number
    readonly b: number
    readonly product: number
    readonly quotient: number
    readonly remainder: number
    readonly expectedOutput: number
}

/**
 * Hardcoded adversarial boundary pairs verifying quotient parity rules.
 */
export const ADVERSARIAL_BOUNDARY_PAIRS: readonly BoundaryPair[] =
    Object.freeze([
        // R = 5,000: Q = 2 (even) -> 2 (even stays even)
        {
            a: 50,
            b: 500,
            product: 25_000,
            quotient: 2,
            remainder: 5_000,
            expectedOutput: 2,
        },
        // R = 5,000: Q = 3 (odd) -> 4 (odd rounds up to even)
        {
            a: 70,
            b: 500,
            product: 35_000,
            quotient: 3,
            remainder: 5_000,
            expectedOutput: 4,
        },
        // R = 5,000: Q = 1 (odd) -> 2 (odd rounds up to even)
        {
            a: 30,
            b: 500,
            product: 15_000,
            quotient: 1,
            remainder: 5_000,
            expectedOutput: 2,
        },
        // R = 5,000: Q = 0 (even) -> 0 (even stays even)
        {
            a: 10,
            b: 500,
            product: 5_000,
            quotient: 0,
            remainder: 5_000,
            expectedOutput: 0,
        },
        // R = 5,000: Q = 4 (even) -> 4 (even stays even)
        {
            a: 90,
            b: 500,
            product: 45_000,
            quotient: 4,
            remainder: 5_000,
            expectedOutput: 4,
        },
    ])

/**
 * Generates synthetic pairs forcing exact remainder ties: (A * B) % 10,000 === 5,000.
 * For any odd multiplier (2k + 1) * 10 with B = 500:
 * Product = (2k + 1) * 5,000 = (2k) * 5,000 + 5,000 = k * 10,000 + 5,000.
 * Quotient Q = k, Remainder R = 5,000.
 */
export function* generateHalfTiePairs(count: number): Generator<BoundaryPair> {
    for (let i = 0; i < count; i++) {
        const k = i % 5000
        const a = (2 * k + 1) * 10
        const b = 500
        const product = a * b
        const quotient = Math.floor(product / BASIS_POINT_DENOMINATOR)
        const remainder = product % BASIS_POINT_DENOMINATOR
        const expectedOutput = quotient % 2 === 0 ? quotient : quotient + 1

        yield {
            a,
            b,
            product,
            quotient,
            remainder,
            expectedOutput,
        }
    }
}

/**
 * Generates synthetic pairs targeting specific remainder boundaries:
 * 0, 4,999, 5,000, 5,001, and 9,999.
 */
export function* generateRemainderBoundaryMatrix(
    targetRemainder: number,
    count: number,
): Generator<BoundaryPair> {
    for (let q = 0; q < count; q++) {
        const targetProduct = q * BASIS_POINT_DENOMINATOR + targetRemainder
        // Factorize targetProduct into integer a and b
        // Find divisor closest to sqrt(targetProduct)
        let a = Math.max(1, Math.floor(Math.sqrt(targetProduct)))
        while (a > 1 && targetProduct % a !== 0) {
            a--
        }
        const b = Math.floor(targetProduct / a)
        const quotient = q
        const remainder = targetRemainder

        let expectedOutput: number
        if (remainder < TIE_BREAK_REMAINDER) {
            expectedOutput = quotient
        } else if (remainder > TIE_BREAK_REMAINDER) {
            expectedOutput = quotient + 1
        } else {
            expectedOutput = quotient % 2 === 0 ? quotient : quotient + 1
        }

        yield {
            a,
            b,
            product: targetProduct,
            quotient,
            remainder,
            expectedOutput,
        }
    }
}

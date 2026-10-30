/**
 * 20.arithmetic.unit - Exhaustive Remainder Boundary Test Suite
 * Executes 100,000 synthetic iterations across all remainder boundaries.
 */

import { describe, it, expect } from 'vitest'
import {
    scaleBasisPoints,
    scaleBasisPointsChained,
    divRoundHalfEven,
    evaluateScalingDivision,
} from '../arithmetic.action.js'
import {
    scaleBasisPointsBigInt,
    scaleBasisPointsBigIntChained,
} from '../arithmetic-bigint.action.js'
import {
    ADVERSARIAL_BOUNDARY_PAIRS,
    generateHalfTiePairs,
    generateRemainderBoundaryMatrix,
} from './boundary-generator.js'

describe('20.arithmetic.unit - Exhaustive Remainder Boundary Verification', () => {
    it('validates hardcoded adversarial half-tie remainder boundary pairs', () => {
        for (const pair of ADVERSARIAL_BOUNDARY_PAIRS) {
            const receipt = evaluateScalingDivision(pair.a, pair.b)
            expect(receipt.quotient).toBe(pair.quotient)
            expect(receipt.remainder).toBe(pair.remainder)
            expect(receipt.tieDetected).toBe(true)
            expect(receipt.roundedOutput).toBe(pair.expectedOutput)
            expect(scaleBasisPoints(pair.a, pair.b)).toBe(pair.expectedOutput)
        }
    })

    it('executes 100,000 synthetic half-tie iterations asserting zero parity drift', () => {
        const ITERATIONS = 100_000
        let checkedCount = 0

        for (const pair of generateHalfTiePairs(ITERATIONS)) {
            const result = scaleBasisPoints(pair.a, pair.b)
            expect(result).toBe(pair.expectedOutput)
            checkedCount++
        }

        expect(checkedCount).toBe(ITERATIONS)
    })

    it('asserts R < 5,000 always truncates to quotient across 1,000 cases', () => {
        for (const pair of generateRemainderBoundaryMatrix(4_999, 1_000)) {
            const receipt = evaluateScalingDivision(pair.a, pair.b)
            expect(receipt.remainder).toBe(4_999)
            expect(receipt.roundedOutput).toBe(pair.quotient)
        }

        for (const pair of generateRemainderBoundaryMatrix(0, 1_000)) {
            const receipt = evaluateScalingDivision(pair.a, pair.b)
            expect(receipt.remainder).toBe(0)
            expect(receipt.roundedOutput).toBe(pair.quotient)
        }
    })

    it('asserts R > 5,000 always increments to quotient + 1 across 1,000 cases', () => {
        for (const pair of generateRemainderBoundaryMatrix(5_001, 1_000)) {
            const receipt = evaluateScalingDivision(pair.a, pair.b)
            expect(receipt.remainder).toBe(5_001)
            expect(receipt.roundedOutput).toBe(pair.quotient + 1)
        }

        for (const pair of generateRemainderBoundaryMatrix(9_999, 1_000)) {
            const receipt = evaluateScalingDivision(pair.a, pair.b)
            expect(receipt.remainder).toBe(9_999)
            expect(receipt.roundedOutput).toBe(pair.quotient + 1)
        }
    })

    it('asserts strict left-associative multiplier chaining parity', () => {
        const val = 8_000
        const m1 = 5_000
        const m2 = 2_500
        const m3 = 1_000

        const chainedResult = scaleBasisPointsChained(val, m1, m2, m3)
        const manualResult = scaleBasisPoints(
            scaleBasisPoints(scaleBasisPoints(val, m1), m2),
            m3,
        )

        expect(chainedResult).toBe(manualResult)
    })

    it('guarantees intermediate overflow safety with 10,000 bp chained factors', () => {
        // 10,000 * 10,000 * 10,000 must scale intermediate products <= 10^8
        const maxChain = scaleBasisPointsChained(10_000, 10_000, 10_000, 10_000)
        expect(maxChain).toBe(10_000)
    })

    it('validates 100% bit-for-bit parity with BigInt chained scaling', () => {
        const values = [1_000, 2_500, 5_000, 7_500, 10_000]
        const multipliers = [5_000, 2_000, 1_000]

        for (const v of values) {
            const standardChain = scaleBasisPointsChained(v, ...multipliers)
            const bigIntChain = scaleBasisPointsBigIntChained(
                BigInt(v),
                ...multipliers.map((m) => BigInt(m)),
            )
            expect(BigInt(standardChain)).toBe(bigIntChain)
        }
    })

    it('rejects empty multipliers in chained scaling with RangeError', () => {
        expect(() => scaleBasisPointsChained(5_000)).toThrowError(
            /\[EMPTY_MULTIPLIERS\]/,
        )
    })

    it('rejects division by zero with RangeError [DIV_ZERO]', () => {
        expect(() => divRoundHalfEven(100, 0)).toThrowError(/\[DIV_ZERO\]/)
        expect(() => divRoundHalfEven(-50, 0)).toThrowError(/\[DIV_ZERO\]/)
    })
})

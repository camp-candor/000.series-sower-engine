import { describe, it, expect } from 'vitest'
import { divRoundHalfEven } from '../arithmetic.action.js'
import { ArithmeticModel } from '../arithmetic.model.js'
import { reduceArithmetic } from '../arithmetic.reduce.js'
import {
    ArithmeticCommand,
    type ArithmeticActionBit,
    type DivideRoundEvenPayload,
} from '../fce/arithmetic.bit.js'

describe('20.arithmetic.unit - Arbitrary Integer Division Half Tie Resolution', () => {
    it('defends against division by zero (fail-closed)', () => {
        expect(() => divRoundHalfEven(10, 0)).toThrowError(/\[DIV_ZERO\]/)
        expect(() => divRoundHalfEven(-5, 0)).toThrowError(/\[DIV_ZERO\]/)
        expect(() => divRoundHalfEven(0, 0)).toThrowError(/\[DIV_ZERO\]/)
    })

    it('rejects floats, non-integers, and safe integer overflows', () => {
        expect(() => divRoundHalfEven(10.5, 2)).toThrowError(
            /\[FLOAT_PROHIBITED\]/,
        )
        expect(() => divRoundHalfEven(10, 2.5)).toThrowError(
            /\[FLOAT_PROHIBITED\]/,
        )
        expect(() => divRoundHalfEven(NaN, 2)).toThrowError(
            /\[FLOAT_PROHIBITED\]/,
        )
        expect(() => divRoundHalfEven(10, Infinity)).toThrowError(
            /\[FLOAT_PROHIBITED\]/,
        )
        expect(() =>
            divRoundHalfEven(Number.MAX_SAFE_INTEGER + 1, 2),
        ).toThrowError(/\[OVERFLOW_HAZARD\]/)
    })

    it('evaluates exact division without remainder', () => {
        expect(divRoundHalfEven(6, 2)).toBe(3)
        expect(divRoundHalfEven(-6, 2)).toBe(-3)
        expect(divRoundHalfEven(6, -2)).toBe(-3)
        expect(divRoundHalfEven(-6, -2)).toBe(3)
        expect(divRoundHalfEven(0, 5)).toBe(0)
    })

    it('arbitrates non-tie remainder inequalities (2r < d vs 2r > d)', () => {
        expect(divRoundHalfEven(4, 3)).toBe(1)
        expect(divRoundHalfEven(5, 3)).toBe(2)
        expect(divRoundHalfEven(-4, 3)).toBe(-1)
        expect(divRoundHalfEven(-5, 3)).toBe(-2)
    })

    it('arbitrates exact half-ties for positive quotients rounding to even', () => {
        expect(divRoundHalfEven(1, 2)).toBe(0)
        expect(divRoundHalfEven(3, 2)).toBe(2)
        expect(divRoundHalfEven(5, 2)).toBe(2)
        expect(divRoundHalfEven(7, 2)).toBe(4)
        expect(divRoundHalfEven(9, 2)).toBe(4)
    })

    it('arbitrates exact half-ties for negative quotients rounding to even', () => {
        expect(divRoundHalfEven(-1, 2)).toBe(0)
        expect(divRoundHalfEven(-3, 2)).toBe(-2)
        expect(divRoundHalfEven(-5, 2)).toBe(-2)
        expect(divRoundHalfEven(-7, 2)).toBe(-4)
    })

    it('verifies mathematical symmetry with negative divisors', () => {
        expect(divRoundHalfEven(1, -2)).toBe(0)
        expect(divRoundHalfEven(3, -2)).toBe(-2)
        expect(divRoundHalfEven(-3, -2)).toBe(2)
        expect(divRoundHalfEven(-5, -2)).toBe(2)
        expect(divRoundHalfEven(-7, -2)).toBe(4)
    })

    it('folds DIVIDE_ROUND_EVEN into frozen model state', () => {
        const model = new ArithmeticModel()
        let receivedOutput: number | null = null

        const bit: ArithmeticActionBit = {
            idx: 'test-div-ag-001',
            cmd: ArithmeticCommand.DIVIDE_ROUND_EVEN,
            val: 0,
            dat: { numerator: 7, denominator: 2 } as DivideRoundEvenPayload,
            slv: (res) => {
                receivedOutput = res as number
            },
        }

        const nextState = reduceArithmetic(model, bit)

        expect(receivedOutput).toBe(4)
        expect(nextState.lastDivisionOutput).toBe(4)
        expect(nextState.totalCalculations).toBe(model.totalCalculations + 1)
        expect(Object.isFrozen(nextState)).toBe(true)
        expect(model.lastDivisionOutput).toBeNull()

        const updated = model.copyWith({ lastDivisionOutput: 4 })
        expect(updated.lastDivisionOutput).toBe(4)
        expect(Object.isFrozen(updated)).toBe(true)
    })
})

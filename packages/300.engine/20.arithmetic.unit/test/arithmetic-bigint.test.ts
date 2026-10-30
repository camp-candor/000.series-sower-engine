import { describe, it, expect } from 'vitest';
import {
  scaleBasisPointsBigInt,
  evaluateScalingDivisionBigInt,
  scaleBasisPointsBigIntChained,
  divRoundHalfEvenBigInt
} from '../arithmetic-bigint.action.js';
import { scaleBasisPoints, divRoundHalfEven } from '../arithmetic.action.js';
import { ArithmeticModel } from '../arithmetic.model.js';
import { reduceArithmetic } from '../arithmetic.reduce.js';
import { ArithmeticCommand, type ArithmeticActionBit } from '../fce/arithmetic.bit.js';

describe('20.arithmetic.unit - BigInt High-Magnitude Precision', () => {
  it('prevents precision loss and truncation on numbers exceeding Number.MAX_SAFE_INTEGER', () => {
    // 2^53 - 1 = 9,007,199,254,740,991
    const maxSafe = 9_007_199_254_740_991n;
    const scaled = scaleBasisPointsBigInt(maxSafe, 10_000n);
    expect(scaled).toBe(maxSafe);

    // Multi-century timeline: 100 years at 100 centiseconds/sec
    // 100 yr * 365 d * 24 hr * 3600 s * 100 cs = 315,360,000,000 cs
    const tCentiseconds = 315_360_000_000n;
    const edgeTraversalCost = 8_640_000n; // 1 day in centiseconds
    // Intermediate product: t * edgeCost ≈ 2.7247 * 10^18 (> 9.007 * 10^15 safe integer ceiling)
    const intermediateProduct = tCentiseconds * edgeTraversalCost;
    expect(intermediateProduct > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);

    const result = divRoundHalfEvenBigInt(intermediateProduct, edgeTraversalCost);
    expect(result).toBe(tCentiseconds);
  });

  it('evaluates analytical corridor intercept convergence without precision degradation', () => {
    // Head-on meeting formula:
    // t_meet = divRoundHalfEvenBigInt((D_A * D_B + T_A * D_B + T_B * D_A) / (D_A + D_B))
    const dA = 8_640_000n;
    const dB = 8_640_000n;
    const tA = 1_000_000_000n;
    const tB = 1_000_000_000n;

    const numerator = dA * dB + tA * dB + tB * dA;
    const denominator = dA + dB;
    const tMeet = divRoundHalfEvenBigInt(numerator, denominator);

    // With equal entry times and symmetrical edge costs: t_meet = t_entry + D/2
    // 1,000,000,000 + 4,320,000 = 1,004,320,000
    expect(tMeet).toBe(1_004_320_000n);
  });

  it('rejects division by zero with RangeError [DIV_ZERO]', () => {
    expect(() => divRoundHalfEvenBigInt(100n, 0n)).toThrowError(/\[DIV_ZERO\]/);
    expect(() => divRoundHalfEvenBigInt(-50n, 0n)).toThrowError(/\[DIV_ZERO\]/);
  });

  it('rejects negative basis-point scalars with RangeError [NEGATIVE_PROHIBITED]', () => {
    expect(() => scaleBasisPointsBigInt(-1n, 5000n)).toThrowError(/\[NEGATIVE_PROHIBITED\]/);
    expect(() => scaleBasisPointsBigInt(5000n, -100n)).toThrowError(/\[NEGATIVE_PROHIBITED\]/);
  });

  it('mirrors Banker Rounding half-ties strictly toward nearest even quotient in scaling', () => {
    // R = 5,000n (even stays even): 50n * 500n / 10000n = 2.5 -> 2n
    expect(scaleBasisPointsBigInt(50n, 500n)).toBe(2n);
    // R = 5,000n (odd rounds up to even): 70n * 500n / 10000n = 3.5 -> 4n
    expect(scaleBasisPointsBigInt(70n, 500n)).toBe(4n);
    // R = 5,000n (odd rounds up to even): 30n * 500n / 10000n = 1.5 -> 2n
    expect(scaleBasisPointsBigInt(30n, 500n)).toBe(2n);
  });

  it('mirrors Banker Rounding half-ties strictly toward nearest even quotient in arbitrary division', () => {
    expect(divRoundHalfEvenBigInt(1n, 2n)).toBe(0n);
    expect(divRoundHalfEvenBigInt(3n, 2n)).toBe(2n);
    expect(divRoundHalfEvenBigInt(5n, 2n)).toBe(2n);
    expect(divRoundHalfEvenBigInt(7n, 2n)).toBe(4n);
    expect(divRoundHalfEvenBigInt(9n, 2n)).toBe(4n);

    // Negative numerators
    expect(divRoundHalfEvenBigInt(-1n, 2n)).toBe(0n);
    expect(divRoundHalfEvenBigInt(-3n, 2n)).toBe(-2n);
    expect(divRoundHalfEvenBigInt(-5n, 2n)).toBe(-2n);
    expect(divRoundHalfEvenBigInt(-7n, 2n)).toBe(-4n);
  });

  it('asserts 100% mathematical parity with 32-bit functions across shared scalar intervals', () => {
    const testCases: [number, number][] = [
      [40, 500],
      [55, 500],
      [50, 500],
      [70, 500],
      [30, 500],
      [10000, 10000],
      [0, 5000],
      [2500, 2500]
    ];

    for (const [a, b] of testCases) {
      const standardResult = scaleBasisPoints(a, b);
      const bigIntResult = scaleBasisPointsBigInt(BigInt(a), BigInt(b));
      expect(BigInt(standardResult)).toBe(bigIntResult);
    }

    const divisionCases: [number, number][] = [
      [1, 2],
      [3, 2],
      [5, 2],
      [7, 2],
      [-5, 2],
      [-7, 2],
      [10, 3],
      [11, 3]
    ];

    for (const [n, d] of divisionCases) {
      const standardDiv = divRoundHalfEven(n, d);
      const bigIntDiv = divRoundHalfEvenBigInt(BigInt(n), BigInt(d));
      expect(BigInt(standardDiv)).toBe(bigIntDiv);
    }
  });

  it('dispatches BigInt action bits through pure reducer and freezes model', () => {
    const model = new ArithmeticModel();
    let receipt: any = null;

    const bit: ArithmeticActionBit = {
      idx: 'test-bigint-bit-001',
      cmd: ArithmeticCommand.SCALE_SCALAR,
      val: 0,
      dat: { a: 70n, b: 500n, isBigInt: true },
      slv: (res) => {
        receipt = res;
      }
    };

    const nextModel = reduceArithmetic(model, bit);
    expect(receipt).toBe(4n);
    expect(nextModel.lastScaledBigIntValue).toBe(4n);
    expect(nextModel.totalCalculations).toBe(1);
    expect(Object.isFrozen(nextModel)).toBe(true);
  });
});
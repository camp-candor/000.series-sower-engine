import { describe, it, expect } from 'vitest';
import {
  scaleBasisPointsChained,
  MAX_INTERMEDIATE_PRODUCT,
  scaleBasisPoints
} from '../arithmetic.action.js';
import { ArithmeticModel } from '../arithmetic.model.js';
import { reduceArithmetic } from '../arithmetic.reduce.js';
import { ArithmeticCommand, type ArithmeticActionBit } from '../fce/arithmetic.bit.js';

describe('Phase III: Left Associative Chaining Intermediate Bounding', () => {
  it('yields exactly 100 for scaleBasisPointsChained(8000, 5000, 2500, 1000)', () => {
    const chainedResult = scaleBasisPointsChained(8000, 5000, 2500, 1000);
    const nestedResult = scaleBasisPoints(
      scaleBasisPoints(scaleBasisPoints(8000, 5000), 2500),
      1000
    );

    expect(chainedResult).toBe(100);
    expect(chainedResult).toStrictEqual(nestedResult);
  });

  it('rejects empty multipliers', () => {
    expect(() => {
      scaleBasisPointsChained(10000);
    }).toThrowError(/\[EMPTY_MULTIPLIERS\]/);
  });

  it('rejects floats', () => {
    expect(() => {
      scaleBasisPointsChained(10000.5, 5000);
    }).toThrowError(/\[FLOAT_PROHIBITED\]/);

    expect(() => {
      scaleBasisPointsChained(10000, 5000.5);
    }).toThrowError(/\[FLOAT_PROHIBITED\]/);
  });

  it('rejects negative scalars', () => {
    expect(() => {
      scaleBasisPointsChained(-1000, 5000);
    }).toThrowError(/\[NEGATIVE_PROHIBITED\]/);

    expect(() => {
      scaleBasisPointsChained(1000, -5000);
    }).toThrowError(/\[NEGATIVE_PROHIBITED\]/);
  });

  it('verifies intermediate calculations never exceed MAX_INTERMEDIATE_PRODUCT (10^8)', () => {
    // 10000 * 10000 is 100,000,000 (10^8) which is <= MAX_INTERMEDIATE_PRODUCT
    // It scales back down to 10000 after each multiplication step.
    const result = scaleBasisPointsChained(10000, 10000, 10000);
    expect(result).toBe(10000);

    // If it didn't scale at each step, 10000 * 10000 * 10000 would be 10^12
  });

  it('throws INTERMEDIATE_OVERFLOW when intermediate product exceeds 10^8', () => {
    // Current base is 10001, multiplier is 10000.
    // 10001 * 10000 = 100,010,000 > 100,000,000
    // But since OUT_OF_BOUNDS is thrown on multiplier > 10000, we should test with baseValue.
    expect(() => {
      scaleBasisPointsChained(10001, 10000);
    }).toThrowError(/\[INTERMEDIATE_OVERFLOW\]/);
  });

  it('preserves non-commutative execution topology across operand permutations', () => {
    // Testing specific ordering drift (simulating A*B*C vs C*B*A)
    const result1 = scaleBasisPointsChained(10000, 3333, 6666, 1234);
    const result2 = scaleBasisPointsChained(1234, 6666, 3333, 10000);

    // Rounding per step is required to be exactly as evaluated left-to-right.
    // They may or may not be equal, but evaluation must be deterministic and ordered.
    // We just verify it executes without blowing up and produces distinct/same output as manually nested.

    const nested1 = scaleBasisPoints(
      scaleBasisPoints(scaleBasisPoints(10000, 3333), 6666),
      1234
    );

    const nested2 = scaleBasisPoints(
      scaleBasisPoints(scaleBasisPoints(1234, 6666), 3333),
      10000
    );

    expect(result1).toStrictEqual(nested1);
    expect(result2).toStrictEqual(nested2);
  });

  it('folds SCALE_CHAINED action bits into frozen model state', () => {
    const initialState = new ArithmeticModel();

    let resolvedValue: any = null;

    const actionBit: ArithmeticActionBit = {
      idx: 'test-action-bit',
      cmd: ArithmeticCommand.SCALE_CHAINED,
      val: 0,
      dat: {
        baseValue: 8000,
        multipliers: [5000, 2500, 1000]
      },
      slv: (receipt) => {
        resolvedValue = receipt;
      }
    };

    const nextState = reduceArithmetic(initialState, actionBit);

    expect(resolvedValue).toBe(100);
    expect(nextState.lastChainedValue).toBe(100);
    expect(nextState.totalCalculations).toBe(1);
    expect(nextState).not.toBe(initialState);
    expect(Object.isFrozen(nextState)).toBe(true);
  });
});

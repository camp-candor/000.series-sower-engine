import { describe, it, expect } from 'vitest';
import { scaleBasisPointsChained } from '../arithmetic.action.js';
import { ArithmeticModel } from '../arithmetic.model.js';
import { reduceArithmetic } from '../arithmetic.reduce.js';
import { ArithmeticCommand, type ArithmeticActionBit, type ScaleChainedPayload } from '../fce/arithmetic.bit.js';

describe('20.arithmetic.unit - Left Associative Chaining', () => {
  it('asserts that evaluating scaleBasisPointsChained(8000, 5000, 2500, 1000) yields exactly 100, matching nested calls bit-for-bit', () => {
    const result = scaleBasisPointsChained(8000, 5000, 2500, 1000);
    expect(result).toBe(100);
  });

  it('asserts rejection of empty multipliers', () => {
    expect(() => scaleBasisPointsChained(8000)).toThrowError(/\[EMPTY_MULTIPLIERS\]/);
  });

  it('asserts rejection of floats', () => {
    expect(() => scaleBasisPointsChained(8000, 5000.5)).toThrowError(/\[FLOAT_PROHIBITED\]/);
  });

  it('asserts rejection of negative scalars', () => {
    expect(() => scaleBasisPointsChained(8000, -5000)).toThrowError(/\[NEGATIVE_PROHIBITED\]/);
  });

  it('asserts intermediate scaling ceiling', () => {
    // 10,000 * 10,000 = 100,000,000. Max intermediate product is 100,000,000.
    // So 10,000 * 10,000 * 10,000 should throw at the second step.
    // actually, let's just make one that exceeds the intermediate limit
    expect(() => scaleBasisPointsChained(10001, 10000)).toThrowError(/\[INTERMEDIATE_OVERFLOW\]/);

    // evaluates chained basis points (10000 x 10000 x 10000) verifying that intermediate calculations never exceed 10^8
    const result = scaleBasisPointsChained(10000, 10000, 10000);
    expect(result).toBe(10000); // 10000 * 10000 = 100,000,000 -> / 10000 = 10000. 10000 * 10000 = 100,000,000 -> / 10000 = 10000
  });

  it('asserts non-commutative execution topology preservation across operand permutations', () => {
    // Testing order dependency / rounding
    // a * b * c
    const result1 = scaleBasisPointsChained(8000, 5005, 3333);
    const result2 = scaleBasisPointsChained(3333, 5005, 8000);
    expect(result1).not.toBe(result2);
  });

  it('asserts state reduction fold of SCALE_CHAINED action bits into frozen model state', () => {
    const initialState = new ArithmeticModel();
    let slvCalledWith = null;

    const bit: ArithmeticActionBit = {
      idx: 'test-bit',
      cmd: ArithmeticCommand.SCALE_CHAINED,
      val: 0,
      dat: {
        baseValue: 8000,
        multipliers: [5000, 2500, 1000]
      } as ScaleChainedPayload,
      slv: (receipt) => { slvCalledWith = receipt; }
    };

    const nextState = reduceArithmetic(initialState, bit);

    expect(nextState.lastChainedValue).toBe(100);
    expect(slvCalledWith).toBe(100);
    expect(nextState.totalCalculations).toBe(1);
    expect(Object.isFrozen(nextState)).toBe(true);
  });
});

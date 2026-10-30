/**
 * 20.arithmetic.unit - Pure Banker's Rounding Scalar Actions
 * Implements exact integer scaling without floating-point division.
 */

import {
  BASIS_POINT_DENOMINATOR,
  TIE_BREAK_REMAINDER,
  type BasisPoint,
  type ScalingDivisionResult,
  toBasisPoint
} from './fce/arithmetic.interface.js';

/**
 * Arbitrates a remainder against the midpoint half-divisor.
 * Enforces Round-Half-Even: if r === halfDivisor, round to the nearest even integer quotient.
 */
export function arbitrateRemainder(
  quotient: number,
  remainder: number,
  halfDivisor: number = TIE_BREAK_REMAINDER
): number {
  if (remainder < halfDivisor) {
    return quotient;
  }
  if (remainder > halfDivisor) {
    return quotient + 1;
  }
  // Remainder is exactly halfDivisor: round to even quotient
  return quotient % 2 === 0 ? quotient : quotient + 1;
}

/**
 * Evaluates the full scaling division receipt for A * B / 10,000.
 */
export function evaluateScalingDivision(a: number, b: number): ScalingDivisionResult {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new TypeError(`[FLOAT_PROHIBITED] Operands must be integers. Received: a=${a}, b=${b}`);
  }
  if (a < 0 || b < 0) {
    throw new RangeError(`[NEGATIVE_PROHIBITED] Basis points cannot be negative. Received: a=${a}, b=${b}`);
  }
  if (a > Number.MAX_SAFE_INTEGER || b > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('[OVERFLOW_HAZARD] Operand exceeds Number.MAX_SAFE_INTEGER');
  }

  const product = a * b;
  const quotient = Math.floor(product / BASIS_POINT_DENOMINATOR);
  const remainder = product % BASIS_POINT_DENOMINATOR;
  const tieDetected = remainder === TIE_BREAK_REMAINDER;

  const rounded = arbitrateRemainder(quotient, remainder, TIE_BREAK_REMAINDER);

  const roundedOutput = toBasisPoint(rounded);

  const receipt: ScalingDivisionResult = {
    quotient,
    remainder,
    tieDetected,
    roundedOutput
  };

  return Object.freeze(receipt);
}

/**
 * Scale(A, B) = RoundEven((A * B) / 10,000)
 * Evaluates scalar multiplication of two integer basis-point values.
 */
export function scaleBasisPoints(a: number, b: number): BasisPoint {
  const receipt = evaluateScalingDivision(a, b);
  return receipt.roundedOutput;
}

export const MAX_INTERMEDIATE_PRODUCT = 100_000_000;

export function scaleBasisPointsChained(
  baseValue: number,
  ...multipliers: readonly number[]
): BasisPoint {
  if (multipliers.length === 0) {
    throw new RangeError('[EMPTY_MULTIPLIERS] Multipliers array cannot be empty');
  }

  let current = baseValue;

  for (const multiplier of multipliers) {
    if (!Number.isInteger(multiplier) || !Number.isInteger(current)) {
      throw new TypeError(`[FLOAT_PROHIBITED] Operands must be integers`);
    }
    if (multiplier < 0 || current < 0) {
      throw new RangeError(`[NEGATIVE_PROHIBITED] Basis points cannot be negative`);
    }

    const product = current * multiplier;
    if (product > MAX_INTERMEDIATE_PRODUCT) {
      throw new RangeError(`[INTERMEDIATE_OVERFLOW] Intermediate product ${product} exceeds MAX_INTERMEDIATE_PRODUCT ${MAX_INTERMEDIATE_PRODUCT}`);
    }

    current = scaleBasisPoints(current, multiplier);
  }

  return current as BasisPoint;
}

/**
 * 20.arithmetic.unit - Arithmetic Unit Event Bus Buzz Router
 * Integrates arithmetic reduction into the engine event dispatch pipeline.
 */

import type { ArithmeticModel } from '../arithmetic.model.js';
import type { ArithmeticActionBit } from '../fce/arithmetic.bit.js';
import { reduceArithmetic } from '../arithmetic.reduce.js';

export function arithmeticBuzz(
  model: ArithmeticModel,
  bit: ArithmeticActionBit
): ArithmeticModel {
  const nextModel = reduceArithmetic(model, bit);
  return Object.freeze(nextModel);
}

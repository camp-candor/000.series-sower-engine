/**
 * 20.arithmetic.unit - Arithmetic Reducer Router
 * Pure deterministic state fold for arithmetic action bits.
 */

import { ArithmeticModel } from './arithmetic.model.js';
import {
  ArithmeticCommand,
  type ArithmeticActionBit,
  type ScaleScalarPayload
} from './fce/arithmetic.bit.js';
import { evaluateScalingDivision } from './arithmetic.action.js';

export function reduceArithmetic(
  state: ArithmeticModel,
  bit: ArithmeticActionBit
): ArithmeticModel {
  switch (bit.cmd) {
    case ArithmeticCommand.SCALE_SCALAR: {
      const payload = bit.dat as ScaleScalarPayload;
      const receipt = evaluateScalingDivision(payload.a, payload.b);

      if (bit.slv) {
        bit.slv(receipt.roundedOutput);
      }

      return state.copyWith({
        lastScaledValue: receipt.roundedOutput,
        lastReceipt: receipt,
        totalCalculations: state.totalCalculations + 1
      });
    }

    default:
      return state;
  }
}

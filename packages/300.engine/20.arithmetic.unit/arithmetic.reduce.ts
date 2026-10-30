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
import { evaluateScalingDivision, scaleBasisPointsChained } from './arithmetic.action.js';
import type { ScaleChainedPayload } from './fce/arithmetic.bit.js';

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

    case ArithmeticCommand.SCALE_CHAINED: {
      const payload = bit.dat as ScaleChainedPayload;
      const result = scaleBasisPointsChained(payload.baseValue, ...payload.multipliers);

      if (bit.slv) {
        bit.slv(result);
      }

      return state.copyWith({
        lastChainedValue: result,
        totalCalculations: state.totalCalculations + 1
      });
    }

    default:
      return state;
  }
}

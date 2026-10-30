import {
    evaluateScalingDivisionBigInt,
    divRoundHalfEvenBigInt
} from './arithmetic-bigint.action.js';
/**
 * 20.arithmetic.unit - Arithmetic Reducer Router
 * Pure deterministic state fold for arithmetic action bits.
 */

import { ArithmeticModel } from './arithmetic.model.js'
import {
    ArithmeticCommand,
    type ArithmeticActionBit,
    type ScaleScalarPayload,
    type ScaleScalarBigIntPayload,
    type ScaleChainedPayload,
    type DivideRoundEvenPayload,
    type DivideRoundEvenBigIntPayload,
} from './fce/arithmetic.bit.js'
import {
    evaluateScalingDivision,
    scaleBasisPointsChained,
    divRoundHalfEven,
} from './arithmetic.action.js'


export function reduceArithmetic(
    state: ArithmeticModel,
    bit: ArithmeticActionBit,
): ArithmeticModel {
    switch (bit.cmd) {
        case ArithmeticCommand.SCALE_SCALAR: {
            if ('isBigInt' in bit.dat && bit.dat.isBigInt) {
                const payload = bit.dat as ScaleScalarBigIntPayload;
                const receipt = evaluateScalingDivisionBigInt(payload.a, payload.b);

                if (bit.slv) {
                    bit.slv(receipt.roundedOutput);
                }

                return state.copyWith({
                    lastScaledBigIntValue: receipt.roundedOutput,
                    lastBigIntReceipt: receipt,
                    totalCalculations: state.totalCalculations + 1
                });
            } else {
                const payload = bit.dat as ScaleScalarPayload
                const receipt = evaluateScalingDivision(payload.a, payload.b)

                if (bit.slv) {
                    bit.slv(receipt.roundedOutput)
                }

                return state.copyWith({
                    lastScaledValue: receipt.roundedOutput,
                    lastReceipt: receipt,
                    totalCalculations: state.totalCalculations + 1,
                })
            }
        }
        case ArithmeticCommand.SCALE_CHAINED: {
            const payload = bit.dat as ScaleChainedPayload
            const result = scaleBasisPointsChained(
                payload.baseValue,
                ...payload.multipliers,
            )
            if (bit.slv) {
                bit.slv(result)
            }
            return state.copyWith({
                lastChainedValue: result,
                totalCalculations: state.totalCalculations + 1,
            })
        }
        case ArithmeticCommand.DIVIDE_ROUND_EVEN: {
            if (typeof (bit.dat as any).numerator === 'bigint') {
                const payload = bit.dat as DivideRoundEvenBigIntPayload;
                const result = divRoundHalfEvenBigInt(payload.numerator, payload.denominator);

                if (bit.slv) {
                    bit.slv(result as any);
                }

                return state.copyWith({
                    lastBigIntDivisionOutput: result,
                    totalCalculations: state.totalCalculations + 1
                });
            } else {
                const payload = bit.dat as DivideRoundEvenPayload
                const result = divRoundHalfEven(
                    payload.numerator,
                    payload.denominator,
                )

                if (bit.slv) {
                    bit.slv(result)
                }

                return state.copyWith({
                    lastDivisionOutput: result,
                    totalCalculations: state.totalCalculations + 1,
                })
            }
        }
        case ArithmeticCommand.AUDIT_TIE_BREAKS: {
            if (bit.slv) {
                bit.slv(true)
            }
            return state.copyWith({
                totalCalculations: state.totalCalculations + 1,
            })
        }
        default:
            return state
    }
}

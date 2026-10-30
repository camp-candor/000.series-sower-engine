/**
 * 20.arithmetic.unit - Arithmetic Action Bit Opcode Descriptors
 * Command envelopes for dispatching arithmetic evaluations across the engine bus.
 */

import type {
    BasisPoint,
    BigIntBasisPoint,
    ScalingDivisionResult,
    BigIntScalingDivisionResult,
} from './arithmetic.interface.js'

export const enum ArithmeticCommand {
    SCALE_SCALAR = 801,
    SCALE_CHAINED = 802,
    DIVIDE_ROUND_EVEN = 803,
    AUDIT_TIE_BREAKS = 804,
}

export interface ScaleScalarPayload {
    readonly a: number
    readonly b: number
    readonly isBigInt?: false
}

export interface ScaleScalarBigIntPayload {
    readonly a: bigint
    readonly b: bigint
    readonly isBigInt: true
}

export interface ScaleChainedPayload {
    readonly baseValue: number
    readonly multipliers: readonly number[]
}

export interface DivideRoundEvenPayload {
    readonly numerator: number
    readonly denominator: number
}

export interface DivideRoundEvenBigIntPayload {
    readonly numerator: bigint
    readonly denominator: bigint
}

export interface AuditTieBreaksPayload {
    readonly iterations: number
    readonly targetRemainder?: number
}

export type ArithmeticBitData =
    | ScaleScalarPayload
    | ScaleScalarBigIntPayload
    | ScaleChainedPayload
    | DivideRoundEvenPayload
    | DivideRoundEvenBigIntPayload
    | AuditTieBreaksPayload

export type ArithmeticReceipt =
    | BasisPoint
    | BigIntBasisPoint
    | ScalingDivisionResult
    | BigIntScalingDivisionResult
    | boolean

/**
 * Action bit envelope carrying computation requests across 99.bus.unit.
 */
export interface ArithmeticActionBit {
    readonly idx: string
    readonly cmd: ArithmeticCommand
    readonly val: number
    readonly dat: ArithmeticBitData
    readonly slv?: (receipt: ArithmeticReceipt) => void
}

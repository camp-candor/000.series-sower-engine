/**
 * 20.arithmetic.unit - Arithmetic State Model Container
 * Scratchpad accumulator tracking active scaling calculations and audit receipts.
 */

import type {
  BasisPoint,
  BigIntBasisPoint,
  ScalingDivisionResult,
  BigIntScalingDivisionResult
} from './fce/arithmetic.interface.js';
import { toBasisPoint } from './fce/arithmetic.interface.js';

export interface ArithmeticState {
  readonly idx: string;
  readonly lastScaledValue: BasisPoint;
  readonly lastChainedValue: BasisPoint | null;
  readonly lastReceipt: ScalingDivisionResult | null;
  readonly lastDivisionOutput: number | null;
  readonly lastScaledBigIntValue: BigIntBasisPoint | null;
  readonly lastBigIntReceipt: BigIntScalingDivisionResult | null;
  readonly lastBigIntDivisionOutput: bigint | null;
  readonly totalCalculations: number;
}

export class ArithmeticModel implements ArithmeticState {
  public readonly idx: string;
  public readonly lastScaledValue: BasisPoint;
  public readonly lastChainedValue: BasisPoint | null;
  public readonly lastReceipt: ScalingDivisionResult | null;
  public readonly lastDivisionOutput: number | null;
  public readonly lastScaledBigIntValue: BigIntBasisPoint | null;
  public readonly lastBigIntReceipt: BigIntScalingDivisionResult | null;
  public readonly lastBigIntDivisionOutput: bigint | null;
  public readonly totalCalculations: number;

  constructor(
    idx = '20.arithmetic.unit',
    lastScaledValue: BasisPoint = toBasisPoint(0),
    lastChainedValue: BasisPoint | null = null,
    lastReceipt: ScalingDivisionResult | null = null,
    lastDivisionOutput: number | null = null,
    lastScaledBigIntValue: BigIntBasisPoint | null = null,
    lastBigIntReceipt: BigIntScalingDivisionResult | null = null,
    lastBigIntDivisionOutput: bigint | null = null,
    totalCalculations = 0
  ) {
    this.idx = idx;
    this.lastScaledValue = lastScaledValue;
    this.lastChainedValue = lastChainedValue;
    this.lastReceipt = lastReceipt;
    this.lastDivisionOutput = lastDivisionOutput;
    this.lastScaledBigIntValue = lastScaledBigIntValue;
    this.lastBigIntReceipt = lastBigIntReceipt;
    this.lastBigIntDivisionOutput = lastBigIntDivisionOutput;
    this.totalCalculations = totalCalculations;
    Object.freeze(this);
  }

  public copyWith(changes: Partial<ArithmeticState>): ArithmeticModel {
    return new ArithmeticModel(
      changes.idx ?? this.idx,
      changes.lastScaledValue ?? this.lastScaledValue,
      changes.lastChainedValue !== undefined ? changes.lastChainedValue : this.lastChainedValue,
      changes.lastReceipt !== undefined ? changes.lastReceipt : this.lastReceipt,
      changes.lastDivisionOutput !== undefined ? changes.lastDivisionOutput : this.lastDivisionOutput,
      changes.lastScaledBigIntValue !== undefined ? changes.lastScaledBigIntValue : this.lastScaledBigIntValue,
      changes.lastBigIntReceipt !== undefined ? changes.lastBigIntReceipt : this.lastBigIntReceipt,
      changes.lastBigIntDivisionOutput !== undefined ? changes.lastBigIntDivisionOutput : this.lastBigIntDivisionOutput,
      changes.totalCalculations ?? this.totalCalculations
    );
  }
}

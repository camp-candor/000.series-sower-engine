import type { LedgerWorkingState } from './state.interface.js';

export interface StatePayload {
  readonly seriesSlug?: string;
  readonly expectedHash?: string;
  readonly tick?: number;
  readonly workingState?: LedgerWorkingState;
  readonly stateHash?: string;
  readonly verifiedParity?: boolean;
  readonly error?: string;
  [key: string]: any;
}

export default interface StateBit {
  idx: string;
  src?: string;
  val?: number;
  dat?: StatePayload;
  slv?: Function;
}

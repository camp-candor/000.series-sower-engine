import type StateSnapshotModel from './fce/state.interface.js';
import type { LedgerWorkingState } from './fce/state.interface.js';
import type StateBit from './fce/state.bit.js';

export class StateModel implements StateSnapshotModel {
  idx = '16.state';
  activeSeriesSlug = 'wiregrass-basin';
  activeStateHash = '';
  workingState: LedgerWorkingState | null = null;
  stateBits: Record<string, StateBit> = {};
}

export default StateModel;

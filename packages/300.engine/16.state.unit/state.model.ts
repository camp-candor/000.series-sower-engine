/**
 * 16.state.unit - State Snapshot Model Container
 */
import type StateSnapshotModel from './fce/state.interface.js'
import type { LedgerWorkingState } from './fce/state.interface.js'
import type StateBit from './fce/state.bit.js'

export class StateModel implements StateSnapshotModel {
    idx: string = '16.state'
    activeSeriesSlug: string = 'wiregrass-basin'
    activeStateHash: string = ''
    workingState: LedgerWorkingState | null = null
    stateBits: Record<string, StateBit> = {}
    activeSnapshot: LedgerWorkingState | null = null
}

export default StateModel

/**
 * 16.state.unit - State Snapshot Model Container
 */
import type StateSnapshot from './fce/state.interface.js'
import type { LedgerWorkingState } from './fce/state.interface.js'

export class StateModel implements StateSnapshot {
    idx: string = '16.state'
    activeSnapshot: LedgerWorkingState | null = null
}

export default StateModel

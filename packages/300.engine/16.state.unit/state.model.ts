import type StateSnapshot from './fce/state.interface'
import type { LedgerWorkingState } from './fce/state.interface'

export class StateModel implements StateSnapshot {
    idx = '16.state'
    activeSnapshot: LedgerWorkingState | null = null
}

export default StateModel

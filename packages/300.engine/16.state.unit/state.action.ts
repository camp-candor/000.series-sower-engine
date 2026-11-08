/**
 * 16.state.unit - State Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type StateBit from './fce/state.bit.js'

export const INIT_STATE = '[State action] Init State'
export class InitState implements Action {
    readonly type = INIT_STATE
    constructor(public bale?: StateBit) {}
}

export const UPDATE_STATE = '[State action] Update State'
export class UpdateState implements Action {
    readonly type = UPDATE_STATE
    constructor(public bale?: StateBit) {}
}

export const HYDRATE_STATE = '[State action] Hydrate State'
export class HydrateState implements Action {
    readonly type = HYDRATE_STATE
    constructor(public bale?: StateBit) {}
}

export const COMPUTE_HASH_STATE = '[State action] Compute Hash State'
export class ComputeHashState implements Action {
    readonly type = COMPUTE_HASH_STATE
    constructor(public bale?: StateBit) {}
}

export const FREEZE_STATE = '[State action] Freeze State'
export class FreezeState implements Action {
    readonly type = FREEZE_STATE
    constructor(public bale?: StateBit) {}
}

export const FOLD_EVENTS_STATE = '[State action] Fold Events State'
export class FoldEventsState implements Action {
    readonly type = FOLD_EVENTS_STATE
    constructor(public bale?: StateBit) {}
}

export const WHY_DIRTY_STATE = '[State action] Why Dirty State'
export class WhyDirtyState implements Action {
    readonly type = WHY_DIRTY_STATE
    constructor(public bale?: StateBit) {}
}

export type Actions =
    | InitState
    | UpdateState
    | HydrateState
    | ComputeHashState
    | FreezeState
    | FoldEventsState
    | WhyDirtyState

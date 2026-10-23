import type { Action } from '../99.core/interface/action.interface'
import type StateBit from './fce/state.bit'

export const INIT_STATE = '[State action] Init State'
export class InitState implements Action<StateBit> {
    readonly type = INIT_STATE
    constructor(public bale: StateBit) {}
}

export const UPDATE_STATE = '[State action] Update State'
export class UpdateState implements Action<StateBit> {
    readonly type = UPDATE_STATE
    constructor(public bale: StateBit) {}
}

export const HYDRATE_STATE = '[State action] Hydrate State'
export class HydrateState implements Action<StateBit> {
    readonly type = HYDRATE_STATE
    constructor(public bale: StateBit) {}
}

export const COMPUTE_HASH_STATE = '[State action] Compute Hash State'
export class ComputeHashState implements Action<StateBit> {
    readonly type = COMPUTE_HASH_STATE
    constructor(public bale: StateBit) {}
}

export const FREEZE_STATE = '[State action] Freeze State'
export class FreezeState implements Action<StateBit> {
    readonly type = FREEZE_STATE
    constructor(public bale: StateBit) {}
}

export type Actions =
    InitState | UpdateState | HydrateState | ComputeHashState | FreezeState

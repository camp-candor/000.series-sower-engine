import type { Action } from '../99.core/interface/action.interface'
import type LeverageBit from './fce/leverage.bit'

export const INIT_LEVERAGE = '[Leverage action] Init Leverage'
export class InitLeverage implements Action<LeverageBit> {
    readonly type = INIT_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export const UPDATE_LEVERAGE = '[Leverage action] Update Leverage'
export class UpdateLeverage implements Action<LeverageBit> {
    readonly type = UPDATE_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export const MUTATE_STRING_LEVERAGE = '[Leverage action] Mutate String Leverage'
export class MutateStringLeverage implements Action<LeverageBit> {
    readonly type = MUTATE_STRING_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export const SPEND_STRING_LEVERAGE = '[Leverage action] Spend String Leverage'
export class SpendStringLeverage implements Action<LeverageBit> {
    readonly type = SPEND_STRING_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export const GET_PAIR_LEVERAGE = '[Leverage action] Get Pair Leverage'
export class GetPairLeverage implements Action<LeverageBit> {
    readonly type = GET_PAIR_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export const LIST_LEVERAGE = '[Leverage action] List Leverage'
export class ListLeverage implements Action<LeverageBit> {
    readonly type = LIST_LEVERAGE
    constructor(public bale: LeverageBit) {}
}

export type Actions =
    | InitLeverage
    | UpdateLeverage
    | MutateStringLeverage
    | SpendStringLeverage
    | GetPairLeverage
    | ListLeverage

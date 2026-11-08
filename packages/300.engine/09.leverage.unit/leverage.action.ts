/**
 * 09.leverage.unit - Leverage Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type LeverageBit from './fce/leverage.bit.js'

export const INIT_LEVERAGE = '[Leverage action] Init Leverage'
export class InitLeverage implements Action {
    readonly type = INIT_LEVERAGE
    constructor(public bale?: LeverageBit) {}
}

export const UPDATE_LEVERAGE = '[Leverage action] Update Leverage'
export class UpdateLeverage implements Action {
    readonly type = UPDATE_LEVERAGE
    constructor(public bale?: LeverageBit) {}
}

export const MUTATE_LEVERAGE_STRINGS =
    '[Leverage action] Mutate Leverage Strings'
export class MutateLeverageStrings implements Action {
    readonly type = MUTATE_LEVERAGE_STRINGS
    constructor(public bale?: LeverageBit) {}
}

export const SPEND_LEVERAGE_STRINGS = '[Leverage action] Spend Leverage Strings'
export class SpendLeverageStrings implements Action {
    readonly type = SPEND_LEVERAGE_STRINGS
    constructor(public bale?: LeverageBit) {}
}

export const GET_LEVERAGE_RECORD = '[Leverage action] Get Leverage Record'
export class GetLeverageRecord implements Action {
    readonly type = GET_LEVERAGE_RECORD
    constructor(public bale?: LeverageBit) {}
}

export const LIST_LEVERAGE_BY_HOLDER =
    '[Leverage action] List Leverage By Holder'
export class ListLeverageByHolder implements Action {
    readonly type = LIST_LEVERAGE_BY_HOLDER
    constructor(public bale?: LeverageBit) {}
}

export const AUDIT_LEVERAGE_SOLVENCY =
    '[Leverage action] Audit Leverage Solvency'
export class AuditLeverageSolvency implements Action {
    readonly type = AUDIT_LEVERAGE_SOLVENCY
    constructor(public bale?: LeverageBit) {}
}

export type Actions =
    | InitLeverage
    | UpdateLeverage
    | MutateLeverageStrings
    | SpendLeverageStrings
    | GetLeverageRecord
    | ListLeverageByHolder
    | AuditLeverageSolvency

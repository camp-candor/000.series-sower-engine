import { Action } from '../99.core/interface/action.interface.js'
import LedgerBit from './fce/ledger.bit.js'

// Ledger actions

export const INIT_LEDGER = '[Ledger action] Init Ledger'
export class InitLedger implements Action {
    readonly type = INIT_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const UPDATE_LEDGER = '[Ledger action] Update Ledger'
export class UpdateLedger implements Action {
    readonly type = UPDATE_LEDGER
    constructor(public bale: LedgerBit) {}
}

export type Actions = InitLedger | UpdateLedger

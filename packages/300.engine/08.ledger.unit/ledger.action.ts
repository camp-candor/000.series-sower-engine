import type { Action } from '../99.core/interface/action.interface'
import type LedgerBit from './fce/ledger.bit'

export const INIT_LEDGER = '[Ledger action] Init Ledger'
export class InitLedger implements Action<LedgerBit> {
    readonly type = INIT_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const UPDATE_LEDGER = '[Ledger action] Update Ledger'
export class UpdateLedger implements Action<LedgerBit> {
    readonly type = UPDATE_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const REDUCE_LEDGER = '[Ledger action] Reduce Ledger'
export class ReduceLedger implements Action<LedgerBit> {
    readonly type = REDUCE_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const STAGE_EVENT_LEDGER = '[Ledger action] Stage Event Ledger'
export class StageEventLedger implements Action<LedgerBit> {
    readonly type = STAGE_EVENT_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const VALIDATE_STAGED_LEDGER = '[Ledger action] Validate Staged Ledger'
export class ValidateStagedLedger implements Action<LedgerBit> {
    readonly type = VALIDATE_STAGED_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const ROLLBACK_STAGED_LEDGER = '[Ledger action] Rollback Staged Ledger'
export class RollbackStagedLedger implements Action<LedgerBit> {
    readonly type = ROLLBACK_STAGED_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const COMMIT_STAGED_LEDGER = '[Ledger action] Commit Staged Ledger'
export class CommitStagedLedger implements Action<LedgerBit> {
    readonly type = COMMIT_STAGED_LEDGER
    constructor(public bale: LedgerBit) {}
}

export const FOLD_LEDGER_EVENTS = '[Ledger action] Fold Ledger Events'
export class FoldLedgerEvents implements Action<LedgerBit> {
    readonly type = FOLD_LEDGER_EVENTS
    constructor(public bale: LedgerBit) {}
}

export type Actions =
    | InitLedger
    | UpdateLedger
    | ReduceLedger
    | StageEventLedger
    | ValidateStagedLedger
    | RollbackStagedLedger
    | CommitStagedLedger
    | FoldLedgerEvents

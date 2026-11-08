/**
 * 08.ledger.unit - Ledger Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type LedgerBit from './fce/ledger.bit.js'

export const INIT_LEDGER = '[Ledger action] Init Ledger'
export class InitLedger implements Action {
    readonly type = INIT_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const UPDATE_LEDGER = '[Ledger action] Update Ledger'
export class UpdateLedger implements Action {
    readonly type = UPDATE_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const STAGE_MUTATION_LEDGER = '[Ledger action] Stage Mutation Ledger'
export class StageMutationLedger implements Action {
    readonly type = STAGE_MUTATION_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const COMMIT_STAGING_LEDGER = '[Ledger action] Commit Staging Ledger'
export class CommitStagingLedger implements Action {
    readonly type = COMMIT_STAGING_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const ROLLBACK_STAGING_LEDGER = '[Ledger action] Rollback Staging Ledger'
export class RollbackStagingLedger implements Action {
    readonly type = ROLLBACK_STAGING_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const VALIDATE_STAGING_LEDGER = '[Ledger action] Validate Staging Ledger'
export class ValidateStagingLedger implements Action {
    readonly type = VALIDATE_STAGING_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export const QUERY_STAGING_STATE = '[Ledger action] Query Staging State'
export class QueryStagingState implements Action {
    readonly type = QUERY_STAGING_STATE
    constructor(public bale?: LedgerBit) {}
}

export const RESOLVE_DUAL_2D6_LEDGER = '[Ledger action] Resolve Dual 2d6 Ledger'
export class ResolveDual2d6Ledger implements Action {
    readonly type = RESOLVE_DUAL_2D6_LEDGER
    constructor(public bale?: LedgerBit) {}
}

export type Actions =
    | InitLedger
    | UpdateLedger
    | StageMutationLedger
    | CommitStagingLedger
    | RollbackStagingLedger
    | ValidateStagingLedger
    | QueryStagingState
    | ResolveDual2d6Ledger

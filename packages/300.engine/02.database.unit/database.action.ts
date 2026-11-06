/**
 * 02.database.unit - Database Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type DatabaseBit from './fce/database.bit.js'

export const INIT_DATABASE = '[Database action] Init Database'
export class InitDatabase implements Action {
    readonly type = INIT_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const UPDATE_DATABASE = '[Database action] Update Database'
export class UpdateDatabase implements Action {
    readonly type = UPDATE_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const ENSURE_SCHEMA_DATABASE = '[Database action] Ensure Schema Database'
export class EnsureSchemaDatabase implements Action {
    readonly type = ENSURE_SCHEMA_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const QUERY_DATABASE = '[Database action] Query Database'
export class QueryDatabase implements Action {
    readonly type = QUERY_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const EXEC_BATCH_DATABASE = '[Database action] Exec Batch Database'
export class ExecBatchDatabase implements Action {
    readonly type = EXEC_BATCH_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const CHECK_INTEGRITY_DATABASE =
    '[Database action] Check Integrity Database'
export class CheckIntegrityDatabase implements Action {
    readonly type = CHECK_INTEGRITY_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const RESET_LOCAL_DATABASE = '[Database action] Reset Local Database'
export class ResetLocalDatabase implements Action {
    readonly type = RESET_LOCAL_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export type Actions =
    | InitDatabase
    | UpdateDatabase
    | EnsureSchemaDatabase
    | QueryDatabase
    | ExecBatchDatabase
    | CheckIntegrityDatabase
    | ResetLocalDatabase

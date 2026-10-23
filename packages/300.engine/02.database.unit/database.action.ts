import type { Action } from '../99.core/interface/action.interface'
import type DatabaseBit from './fce/database.bit'

export const INIT_DATABASE = '[Database action] Init Database'
export class InitDatabase implements Action<DatabaseBit> {
    readonly type = INIT_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const UPDATE_DATABASE = '[Database action] Update Database'
export class UpdateDatabase implements Action<DatabaseBit> {
    readonly type = UPDATE_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const ENSURE_SCHEMA_DATABASE = '[Database action] Ensure Schema Database'
export class EnsureSchemaDatabase implements Action<DatabaseBit> {
    readonly type = ENSURE_SCHEMA_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const EXEC_DATABASE = '[Database action] Exec Database'
export class ExecDatabase implements Action<DatabaseBit> {
    readonly type = EXEC_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const QUERY_DATABASE = '[Database action] Query Database'
export class QueryDatabase implements Action<DatabaseBit> {
    readonly type = QUERY_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const EXEC_BATCH_DATABASE = '[Database action] Exec Batch Database'
export class ExecBatchDatabase implements Action<DatabaseBit> {
    readonly type = EXEC_BATCH_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const CHECK_INTEGRITY_DATABASE =
    '[Database action] Check Integrity Database'
export class CheckIntegrityDatabase implements Action<DatabaseBit> {
    readonly type = CHECK_INTEGRITY_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export const CLOSE_DATABASE = '[Database action] Close Database'
export class CloseDatabase implements Action<DatabaseBit> {
    readonly type = CLOSE_DATABASE
    constructor(public bale: DatabaseBit) {}
}

export type Actions =
    | InitDatabase
    | UpdateDatabase
    | EnsureSchemaDatabase
    | ExecDatabase
    | QueryDatabase
    | ExecBatchDatabase
    | CheckIntegrityDatabase
    | CloseDatabase

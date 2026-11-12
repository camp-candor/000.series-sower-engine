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

export const INSERT_FACT = '[Database action] Insert Fact'
export class InsertFact implements Action {
    readonly type = INSERT_FACT
    constructor(public bale?: DatabaseBit) {}
}

export const UPDATE_FACT_CLAIM = '[Database action] Update Fact Claim'
export class UpdateFactClaim implements Action {
    readonly type = UPDATE_FACT_CLAIM
    constructor(public bale?: DatabaseBit) {}
}

export const SET_FACT_STANDING = '[Database action] Set Fact Standing'
export class SetFactStanding implements Action {
    readonly type = SET_FACT_STANDING
    constructor(public bale?: DatabaseBit) {}
}

export const REGISTER_SCENE = '[Database action] Register Scene'
export class RegisterScene implements Action {
    readonly type = REGISTER_SCENE
    constructor(public bale?: DatabaseBit) {}
}

export const ADD_SCENE_DEPENDENCY = '[Database action] Add Scene Dependency'
export class AddSceneDependency implements Action {
    readonly type = ADD_SCENE_DEPENDENCY
    constructor(public bale?: DatabaseBit) {}
}

export const QUERY_WHY_DIRTY = '[Database action] Query Why Dirty'
export class QueryWhyDirty implements Action {
    readonly type = QUERY_WHY_DIRTY
    constructor(public bale?: DatabaseBit) {}
}

export const GET_CENTRALITY_TELEMETRY =
    '[Database action] Get Centrality Telemetry'
export class GetCentralityTelemetry implements Action {
    readonly type = GET_CENTRALITY_TELEMETRY
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
    | InsertFact
    | UpdateFactClaim
    | SetFactStanding
    | RegisterScene
    | AddSceneDependency
    | QueryWhyDirty
    | GetCentralityTelemetry
    | MountRealmDatabase
    | CloseDatabase
    | ExecDatabase
    | EnsureSchema
    | MigrateSpatialProofSchema
    | AppendEventLogWithProof

export const MOUNT_REALM_DATABASE = '[Database action] Mount Realm Database'
export class MountRealmDatabase implements Action {
    readonly type = MOUNT_REALM_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const CLOSE_DATABASE = '[Database action] Close Database'
export class CloseDatabase implements Action {
    readonly type = CLOSE_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const EXEC_DATABASE = '[Database action] Exec Database'
export class ExecDatabase implements Action {
    readonly type = EXEC_DATABASE
    constructor(public bale?: DatabaseBit) {}
}

export const ENSURE_SCHEMA = '[Database action] Ensure Schema'
export class EnsureSchema implements Action {
    readonly type = ENSURE_SCHEMA
    constructor(public bale?: DatabaseBit) {}
}

export const MIGRATE_SPATIAL_PROOF_SCHEMA =
    '[Database action] Migrate Spatial Proof Schema'
export class MigrateSpatialProofSchema implements Action {
    readonly type = MIGRATE_SPATIAL_PROOF_SCHEMA
    constructor(public bale?: DatabaseBit) {}
}

export const APPEND_EVENT_LOG_WITH_PROOF =
    '[Database action] Append Event Log With Proof'
export class AppendEventLogWithProof implements Action {
    readonly type = APPEND_EVENT_LOG_WITH_PROOF
    constructor(public bale?: DatabaseBit) {}
}

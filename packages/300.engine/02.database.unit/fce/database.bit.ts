/**
 * 02.database.unit - Database Bit Payload Contracts
 */
import type {
    EventLogRecord,
    EntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
    FactRecord,
    SceneRecord,
    SceneFactDependencyRecord,
    FactCentralityTelemetry,
    TableStatusReport,
    DatabaseStateReport,
    FactStanding,
} from './database.interface.js'

export type DatabaseTableName =
    | 'event_log'
    | 'entities_live'
    | 'strings_ledger'
    | 'grievance_status'
    | 'paranoia_clocks'
    | 'actor_beliefs'
    | 'unratified_details'
    | 'facts'
    | 'scenes'
    | 'scene_fact_dependencies'

export type DatabaseRecordUnion =
    | EventLogRecord
    | EntityLiveRecord
    | StringsLedgerRecord
    | GrievanceStatusRecord
    | ParanoiaClockRecord
    | ActorBeliefRecord
    | UnratifiedDetailRecord
    | FactRecord
    | SceneRecord
    | SceneFactDependencyRecord

export interface DatabaseOperation {
    readonly table: DatabaseTableName
    readonly action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'
    readonly key: string
    readonly record?: DatabaseRecordUnion
}

export interface DatabasePayload {
    appendEvent?: import('./database.interface.js').AppendSpatialEventPayload
    migrationApplied?: boolean
    committedRecord?: import('./database.interface.js').EventLogRecord
    databasePath?: string
    seriesSlug?: string
    storageTarget?: string

    readonly table?: DatabaseTableName
    readonly key?: string
    readonly query?: string
    readonly row?: any
    readonly rows?: readonly any[]
    readonly record?: DatabaseRecordUnion
    readonly records?: readonly DatabaseRecordUnion[]
    readonly operations?: readonly DatabaseOperation[]
    readonly fact?: FactRecord
    readonly scene?: SceneRecord
    readonly dependency?: SceneFactDependencyRecord
    readonly factId?: string
    readonly sceneId?: string
    readonly newClaimText?: string
    readonly newVersion?: number
    readonly standing?: FactStanding
    readonly telemetry?: readonly FactCentralityTelemetry[]
    readonly reports?: readonly TableStatusReport[]
    readonly stateReport?: DatabaseStateReport
    readonly rowCount?: number
    readonly error?: string
}

export default interface DatabaseBit {
    idx: string
    src?: string
    val?: number
    dat?: DatabasePayload
    slv?: Function
}

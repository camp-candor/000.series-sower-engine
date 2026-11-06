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
    TableStatusReport,
    DatabaseStateReport,
} from './database.interface.js'

export type DatabaseTableName =
    | 'event_log'
    | 'entities_live'
    | 'strings_ledger'
    | 'grievance_status'
    | 'paranoia_clocks'
    | 'actor_beliefs'
    | 'unratified_details'

export type DatabaseRecordUnion =
    | EventLogRecord
    | EntityLiveRecord
    | StringsLedgerRecord
    | GrievanceStatusRecord
    | ParanoiaClockRecord
    | ActorBeliefRecord
    | UnratifiedDetailRecord

export interface DatabaseOperation {
    readonly table: DatabaseTableName
    readonly action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'
    readonly key: string
    readonly record?: DatabaseRecordUnion
}

export interface DatabasePayload {
    readonly table?: DatabaseTableName
    readonly key?: string
    readonly record?: DatabaseRecordUnion
    readonly records?: readonly DatabaseRecordUnion[]
    readonly operations?: readonly DatabaseOperation[]
    readonly query?: string
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

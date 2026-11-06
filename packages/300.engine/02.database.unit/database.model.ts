/**
 * 02.database.unit - Database State Model Container
 * Pure in-memory relational table storage.
 */
import type Database from './fce/database.interface.js'
import type {
    EventLogRecord,
    EntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from './fce/database.interface.js'

export class DatabaseModel implements Database {
    idx: string = '02.database'
    isInitialized: boolean = false
    tables = {
        event_log: new Map<string, EventLogRecord>(),
        entities_live: new Map<string, EntityLiveRecord>(),
        strings_ledger: new Map<string, StringsLedgerRecord>(),
        grievance_status: new Map<string, GrievanceStatusRecord>(),
        paranoia_clocks: new Map<string, ParanoiaClockRecord>(),
        actor_beliefs: new Map<string, ActorBeliefRecord>(),
        unratified_details: new Map<string, UnratifiedDetailRecord>(),
    }
}

export default DatabaseModel

import type Database from './fce/database.interface'
import type {
    ILocalDatabasePort,
    DatabaseSchemaStatus,
} from './fce/database.interface'

export class DatabaseModel implements Database {
    idx = '02.database'
    dbPath = ':memory:'
    port: ILocalDatabasePort | null = null
    status: DatabaseSchemaStatus = {
        initialized: false,
        tableCount: 0,
        tables: [],
        triggers: [],
        integrity: 'UNINITIALIZED',
        timestamp: new Date().toISOString(),
    }
}

export default DatabaseModel

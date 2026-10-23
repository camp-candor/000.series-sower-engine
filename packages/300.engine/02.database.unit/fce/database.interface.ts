export interface StatementResult<T = any> {
    changes: number
    lastInsertRowid: number | bigint
    rows?: T[]
}

export interface IPreparedStatement {
    run(...params: any[]): StatementResult
    get(...params: any[]): any
    all(...params: any[]): any[]
}

export interface ILocalDatabasePort {
    exec(sql: string): void
    prepare(sql: string): IPreparedStatement
    transaction<T>(fn: () => T): () => T
    pragma(pragmaStr: string): any
    close(): void
    isOpen(): boolean
}

export interface DatabaseSchemaStatus {
    initialized: boolean
    tableCount: number
    tables: string[]
    triggers: string[]
    integrity: string
    timestamp: string
}

export default interface Database {
    idx: string
    dbPath: string
    port: ILocalDatabasePort | null
    status: DatabaseSchemaStatus
}

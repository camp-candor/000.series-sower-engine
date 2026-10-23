import type {
    DatabaseSchemaStatus,
    StatementResult,
} from './database.interface'

export default interface DatabaseBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        dbBit?: Partial<DatabaseBit<TDat, TLst>>
        status?: DatabaseSchemaStatus
        res?: StatementResult
        rows?: any[]
        row?: any
        err?: string
    }) => void
}

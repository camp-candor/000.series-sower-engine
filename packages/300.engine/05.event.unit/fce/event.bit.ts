import type {
    EventEnvelope,
    AppendEventResult,
    EventLogDbRow,
} from './event.interface'

export default interface EventBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        evtBit?: Partial<EventBit<TDat, TLst>>
        envelope?: EventEnvelope
        result?: AppendEventResult
        events?: EventEnvelope[]
        row?: EventLogDbRow
        err?: string
    }) => void
}

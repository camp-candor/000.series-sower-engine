import type {
    TickAdvancedEventPayload,
    DecaySweepReport,
} from './tick.interface'

export default interface TickBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        tckBit?: Partial<TickBit<TDat, TLst>>
        currentTick?: number
        derivedSeed?: string
        advancePayload?: TickAdvancedEventPayload
        decayReport?: DecaySweepReport
        err?: string
    }) => void
}

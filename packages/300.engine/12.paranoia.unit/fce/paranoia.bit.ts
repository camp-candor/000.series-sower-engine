import type { ParanoiaClockRecord } from './paranoia.interface'

export default interface ParanoiaBit<TDat = any, TLst = ParanoiaClockRecord> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { parBit: Partial<ParanoiaBit<any, any>> }) => void
}

import type { GrievanceStatusRecord } from './grievance.interface'

export default interface GrievanceBit<
    TDat = any,
    TLst = GrievanceStatusRecord,
> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { grvBit: Partial<GrievanceBit<any, any>> }) => void
}

import type {
    GenesisSeedingResult,
    PrimordialBaselinePayload,
} from './primordial.interface'

export default interface PrimordialBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        prmBit?: Partial<PrimordialBit<TDat, TLst>>
        result?: GenesisSeedingResult
        hRoot?: string
        baseline?: PrimordialBaselinePayload
        err?: string
    }) => void
}

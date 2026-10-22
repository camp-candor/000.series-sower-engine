import type {
    EventEnvelope,
    HashChainValidationReport,
} from './envelope.interface'

export default interface EnvelopeBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        envBit?: Partial<EnvelopeBit<TDat, TLst>>
        canonical?: string
        hash?: string
        envelope?: EventEnvelope
        report?: HashChainValidationReport
        proofValid?: boolean
        err?: string
    }) => void
}

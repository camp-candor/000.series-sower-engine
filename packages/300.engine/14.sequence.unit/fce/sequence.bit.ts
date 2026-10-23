import type {
    SequenceValidationReport,
    StreamSequenceState,
} from './sequence.interface'

export default interface SequenceBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        seqBit?: Partial<SequenceBit<TDat, TLst>>
        stream?: StreamSequenceState
        report?: SequenceValidationReport
        nextSeq?: number
        err?: string
    }) => void
}

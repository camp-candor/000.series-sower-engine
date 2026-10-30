export default interface FenceBit {
    idx: string
    src?: string
    val?: number // Status integer: 0 = OK, 1 = Error
    dat?: any // Profiling or violation telemetry payload
    lst?: string[] // Array of diagnostic or receipt lines
    slv?: (result: { fncBit: FenceBit }) => void
}

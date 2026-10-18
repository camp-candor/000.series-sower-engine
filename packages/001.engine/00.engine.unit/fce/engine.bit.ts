export default interface EngineBit<TDat = unknown> {
  idx: string
  src?: string
  val?: number
  dat?: TDat
  slv?: (result: { engBit: Partial<EngineBit<TDat>> }) => void
}

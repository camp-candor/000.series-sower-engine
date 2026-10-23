import type {
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from './actor.interface'

export default interface ActorBit<
    TDat = any,
    TLst = ActorBeliefRecord | UnratifiedDetailRecord,
> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { actBit: Partial<ActorBit<any, any>> }) => void
}

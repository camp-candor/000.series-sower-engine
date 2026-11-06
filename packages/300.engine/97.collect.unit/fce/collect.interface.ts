import CaboodleBit from './caboodle.bit.js'

export default interface Collect {
    idx: string
    caboodleBitList: CaboodleBit[]
    caboodleBits: Record<string, CaboodleBit>
}

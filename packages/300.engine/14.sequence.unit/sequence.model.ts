/**
 * 14.sequence.unit - Sequence Model State Container
 */
import type Sequence from './fce/sequence.interface.js'

export class SequenceModel implements Sequence {
    idx: string = '14.sequence'
    currentHeadSeq: number = 0
    seriesSlug: string = 'wiregrass-basin'
    epochVersion: number = 1
    lastCommittedEventId: string = ''
    totalCommitted: number = 0
}

export default SequenceModel

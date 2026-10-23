import type Sequence from './fce/sequence.interface'
import type { StreamSequenceState } from './fce/sequence.interface'

export class SequenceModel implements Sequence {
    idx = '14.sequence'
    defaultStreamId = 'main'
    streams: Record<string, StreamSequenceState> = {
        main: {
            streamId: 'main',
            headSeq: 0,
            lastEventId:
                '0000000000000000000000000000000000000000000000000000000000000000',
            updatedAtMs: 0,
        },
    }
}

export default SequenceModel

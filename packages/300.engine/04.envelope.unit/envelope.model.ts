import type Envelope from './fce/envelope.interface'

export const GENESIS_HASH_64 =
    '0000000000000000000000000000000000000000000000000000000000000000'

export class EnvelopeModel implements Envelope {
    idx = '04.envelope'
    genesisHash = GENESIS_HASH_64
    lastSealedHash = GENESIS_HASH_64
    totalSealedCount = 0
}

export default EnvelopeModel

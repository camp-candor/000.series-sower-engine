/**
 * 04.envelope.unit - Envelope State Model Container
 */
import type Envelope from './fce/envelope.interface.js'
import type { HashChainValidationReport } from './fce/envelope.interface.js'

export const GENESIS_HASH_64 =
    '0000000000000000000000000000000000000000000000000000000000000000'

export class EnvelopeModel implements Envelope {
    idx: string = '04.envelope'
    genesisHash: string = GENESIS_HASH_64
    lastSealedHash: string = GENESIS_HASH_64
    totalSealedCount: number = 0
    lastValidationReport: HashChainValidationReport | null = null
}

export default EnvelopeModel

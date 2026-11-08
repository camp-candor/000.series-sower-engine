/**
 * 09.leverage.unit - Leverage State Model Container
 */
import type Leverage from './fce/leverage.interface.js'
import type { StringsLedgerRecord } from './fce/leverage.interface.js'

export class LeverageModel implements Leverage {
    idx: string = '09.leverage'
    records: Map<string, StringsLedgerRecord> = new Map()
}

export default LeverageModel

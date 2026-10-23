import type Leverage from './fce/leverage.interface'
import type { StringsLedgerRecord } from './fce/leverage.interface'

export class LeverageModel implements Leverage {
    idx = '09.leverage'
    records: Record<string, StringsLedgerRecord> = {}
}

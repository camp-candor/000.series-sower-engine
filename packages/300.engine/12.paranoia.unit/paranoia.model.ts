import type Paranoia from './fce/paranoia.interface'
import type { ParanoiaClockRecord } from './fce/paranoia.interface'

export class ParanoiaModel implements Paranoia {
    idx = '12.paranoia'
    clocks: Record<string, ParanoiaClockRecord> = {}
}

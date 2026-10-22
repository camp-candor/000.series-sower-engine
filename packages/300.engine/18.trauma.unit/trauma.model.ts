import type Trauma from './fce/trauma.interface'
import type { SomaticTraumaState } from './fce/trauma.interface'

export class TraumaModel implements Trauma {
    idx = '18.trauma'
    entities: Record<string, SomaticTraumaState> = {}
}

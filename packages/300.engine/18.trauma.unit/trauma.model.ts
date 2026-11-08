/**
 * 18.trauma.unit - Trauma State Model Container
 */
import type Trauma from './fce/trauma.interface.js'
import type { SomaticTraumaState } from './fce/trauma.interface.js'

export class TraumaModel implements Trauma {
    idx: string = '18.trauma'
    entities: Record<string, SomaticTraumaState> = {}
}

export default TraumaModel

/**
 * 19.wounds.unit - Wounds State Model Container
 */
import type Wounds from './fce/wounds.interface.js'
import type { WoundRecord, SomaticMask } from './fce/wounds.interface.js'

export class WoundsModel implements Wounds {
    idx: string = '19.wounds'
    woundsByEntity: Record<string, WoundRecord[]> = {}
    masksByEntity: Record<string, SomaticMask> = {}
}

export default WoundsModel

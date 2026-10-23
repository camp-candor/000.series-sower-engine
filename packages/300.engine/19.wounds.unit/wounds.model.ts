import type Wounds from './fce/wounds.interface'
import type { WoundRecord, SomaticMask } from './fce/wounds.interface'

export class WoundsModel implements Wounds {
    idx = '19.wounds'
    woundsByEntity: Record<string, WoundRecord[]> = {}
    masksByEntity: Record<string, SomaticMask> = {}
}

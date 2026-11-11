/**
 * 11.belief.unit - Belief State Model
 */
import type {
    BeliefModelDescriptor,
    BeliefRecord,
} from './fce/belief.interface.js'

export class BeliefModel implements BeliefModelDescriptor {
    idx: string = '11.belief'
    beliefsByHolder: Map<string, Map<string, BeliefRecord>> = new Map()
    totalBeliefsRecorded: number = 0
}

export default BeliefModel

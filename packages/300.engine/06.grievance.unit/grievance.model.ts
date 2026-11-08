/**
 * 06.grievance.unit - Grievance State Model Container
 */
import type Grievance from './fce/grievance.interface.js'
import type { GrievanceRecord } from './fce/grievance.interface.js'

export class GrievanceModel implements Grievance {
    idx: string = '06.grievance'
    records: Map<string, GrievanceRecord> = new Map()
    recentEncounterHistory: string[] = [] // Sliding window of last K encounter IDs
}

export default GrievanceModel

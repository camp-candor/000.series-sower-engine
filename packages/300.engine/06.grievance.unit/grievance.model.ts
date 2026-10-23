import type Grievance from './fce/grievance.interface'
import type { GrievanceStatusRecord } from './fce/grievance.interface'

export class GrievanceModel implements Grievance {
    idx = '06.grievance'
    records: Record<string, GrievanceStatusRecord> = {}
}

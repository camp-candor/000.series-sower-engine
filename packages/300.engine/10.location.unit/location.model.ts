import type Location from './fce/location.interface'
import type { LocationRecord } from './fce/location.interface'

export class LocationModel implements Location {
    idx = '10.location'
    locations: Record<string, LocationRecord> = {}
}

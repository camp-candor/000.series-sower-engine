/**
 * 10.location.unit - Location State Model Container
 */
import type Location from './fce/location.interface.js'
import type {
    SpatialNodeDescriptor,
    PortalRecord,
} from './fce/location.interface.js'

export const BASELINE_TOPOLOGY_LOCATIONS: readonly SpatialNodeDescriptor[] =
    Object.freeze([
        {
            locationId: 'loc_the_warm_pipe',
            displayName: 'The Warm Drainage Pipe',
            adjacentLocations: Object.freeze([
                'loc_culvert_junction',
                'loc_drainage_pantry',
            ]),
            acousticDampingBps: 2500,
            lightingLevel: 'FAINT_SEEPAGE',
            maxOccupants: 3,
            isCramped: false,
        },
        {
            locationId: 'loc_culvert_junction',
            displayName: 'Culvert Junction Alpha',
            adjacentLocations: Object.freeze([
                'loc_the_warm_pipe',
                'loc_siphon_chamber',
            ]),
            acousticDampingBps: 1800,
            lightingLevel: 'PITCH_BLACK',
            maxOccupants: 4,
            isCramped: false,
        },
        {
            locationId: 'loc_siphon_chamber',
            displayName: 'Siphon Valve Chamber',
            adjacentLocations: Object.freeze(['loc_culvert_junction']),
            acousticDampingBps: 3200,
            lightingLevel: 'PITCH_BLACK',
            maxOccupants: 2,
            isCramped: true,
        },
        {
            locationId: 'loc_drainage_pantry',
            displayName: 'Sub-Floor Drainage Pantry',
            adjacentLocations: Object.freeze(['loc_the_warm_pipe']),
            acousticDampingBps: 4000,
            lightingLevel: 'PITCH_BLACK',
            maxOccupants: 2,
            isCramped: true,
        },
    ])

export class LocationModel implements Location {
    idx: string = '10.location'
    originHubId: string = 'loc_the_warm_pipe'
    locations: Map<string, SpatialNodeDescriptor> = new Map()
    portals: Map<string, PortalRecord> = new Map()
    occupants: Map<string, Set<string>> = new Map()
}

export default LocationModel

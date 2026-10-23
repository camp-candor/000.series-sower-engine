export type PortalState = 'OPEN' | 'CLOSED' | 'LOCKED'

export interface LocationRecord {
    locationId: string
    name: string
    maxOccupancy: number
    acousticDampingCdB: number // e.g. 1500 cdB (15 dB)
    ambientLuxBps: number // 0 to 10,000 bps
    portals: Record<string, PortalState> // key: destinationLocationId or portalId, val: status
    occupants: string[] // List of entityIds currently inside
    updatedAtMs: number
}

export interface CapacityAuditReceipt {
    locationId: string
    maxOccupancy: number
    currentCount: number
    allowed: boolean
    error?: string
}

export default interface Location {
    idx: string
    locations: Record<string, LocationRecord>
}

/**
 * 10.location.unit - Location Interface Contracts
 * Spatial topology graph, reciprocal portal meshes, and traversal routing.
 */

import type { SpatialPort, TopologyManifest } from './spatial-port.interface.js'

export type LightingLevel =
    | 'PITCH_BLACK'
    | 'FAINT_SEEPAGE'
    | 'INCANDESCENT'
    | 'BLINDING_GLARE'

export type PortalStatus = 'UNLOCKED' | 'LOCKED' | 'COLLAPSED'

export interface SpatialNodeDescriptor {
    readonly locationId: string
    readonly displayName: string
    readonly adjacentLocations: readonly string[]
    readonly acousticDampingBps: number
    readonly lightingLevel: LightingLevel
    readonly maxOccupants: number
    readonly isCramped: boolean
}

export interface PortalRecord {
    readonly portalId: string
    readonly fromLocationId: string
    readonly toLocationId: string
    readonly status: PortalStatus
    readonly clearanceRequirement?: string
    readonly keyItemId?: string
}

export interface TraversalRequest {
    readonly actorId: string
    readonly fromLocationId: string
    readonly toLocationId: string
    readonly tick: number
    readonly timestampMs: number
}

export interface TraversalReceipt {
    readonly permitted: boolean
    readonly actorId: string
    readonly fromLocationId: string
    readonly toLocationId: string
    readonly portalId?: string
    readonly leftEventId?: string
    readonly enteredEventId?: string
    readonly error?: string
    readonly timestampMs: number
}

export interface TopologyValidationReport {
    readonly valid: boolean
    readonly totalLocations: number
    readonly totalPortals: number
    readonly originHubId: string
    readonly isReciprocal: boolean
    readonly isReachable: boolean
    readonly asymmetricTraps: readonly string[]
    readonly orphanIslands: readonly string[]
    readonly selfAdjacencies: readonly string[]
    readonly timestampMs: number
}

export default interface Location {
    idx: string
    originHubId: string
    locations: Map<string, SpatialNodeDescriptor>
    portals: Map<string, PortalRecord>
    occupants: Map<string, Set<string>>
    spatialPort?: SpatialPort
    topologyManifest?: TopologyManifest
}

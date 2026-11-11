/**
 * 98.menu.unit - Menu Interface Contracts
 * Curses navigation models, state descriptors, and spatial probe tracking.
 */
import type Model from '../../99.core/interface/model.interface.js'
import type MenuBit from './menu.bit.js'

export type MenuMode =
    | 'ROOT'
    | 'AIRLOCK'
    | 'DIAGNOSTIC'
    | 'SPATIAL_PROBE'
    | 'SIMULATION_GAUNTLET'

export interface SpatialProbeTelemetry {
    readonly routeLabel: string
    readonly feasible: boolean
    readonly traversalCostUnits: number
    readonly cellsExpanded: number
    readonly queryHash: string
    readonly receiptHash: string
    readonly failureReason?: string
}

export interface MenuModelDescriptor extends Model {
    idx: string
    activeMenuMode?: MenuMode
    totalInteractions?: number
    lastActionTimestamp?: number
    spatialProbeActive?: boolean
    totalProbesDispatched?: number
    lastProbeTelemetry?: SpatialProbeTelemetry | null
    statusMessage?: string
}

export type FlightDeckMode = 'BOOT' | 'RUNTIME'

export interface CompiledUniverseDescriptor {
    seriesSlug: string
    manifestPath: string
    byteSize: number
    merkleRootHex: string
    hasBibleState: boolean
}

export type AirlockState =
    | 'IDLE'
    | 'SCANNING'
    | 'SELECTING'
    | 'DISPATCHED'
    | 'ABORTED'

export interface MenuOptionDescriptor {
    readonly label: string
    readonly targetAction: string
    readonly description: string
}

export interface MenuFlightDeckState {
    readonly isHeadless: boolean
    readonly activeSelection: string
    readonly flightDeckMode?: FlightDeckMode
    readonly totalOptionsCount: number
    readonly lastActionTimestamp: number
}

export default interface Menu extends MenuModelDescriptor {
    discoveredUniverses?: CompiledUniverseDescriptor[]
    activeUniverseSlug?: string
    flightDeckMode?: FlightDeckMode
    activeSeriesSlug?: string
    airlockState?: AirlockState
    activeSelection?: string
    isHeadless?: boolean
    menuBits?: Record<string, MenuBit>
    lst?: string[]
    geoJsonNow?: any
    atlasNow?: any
    sizeNow?: any
    mapShape?: string
    mapNomNow?: string
    mapDimensions?: string
    shapeBit?: any
}

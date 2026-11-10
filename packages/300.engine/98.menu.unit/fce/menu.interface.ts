import type MenuBit from './menu.bit.js'

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

export default interface Menu {
    idx: string
    discoveredUniverses?: CompiledUniverseDescriptor[]
    activeUniverseSlug?: string
    flightDeckMode?: FlightDeckMode
    activeSeriesSlug?: string
    airlockState?: AirlockState
    activeSelection?: string
    lastActionTimestamp?: number
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

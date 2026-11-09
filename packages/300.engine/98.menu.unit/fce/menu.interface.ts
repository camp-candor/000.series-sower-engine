import type MenuBit from './menu.bit.js'
export interface CompiledUniverseDescriptor {
    seriesSlug: string
    manifestPath: string
    byteSize: number
    merkleRootHex: string
    hasBibleState: boolean
}

/**
 * 98.menu.unit - Blessed Terminal Flight Deck Menu Interface Contracts
 */

export interface MenuOptionDescriptor {
    readonly label: string
    readonly targetAction: string
    readonly description: string
}

export interface MenuFlightDeckState {
    readonly isHeadless: boolean
    readonly activeSelection: string
    readonly totalOptionsCount: number
    readonly lastActionTimestamp: number
}

export default interface Menu {
    discoveredUniverses?: CompiledUniverseDescriptor[]
    activeUniverseSlug?: string
    menuBits?: Record<string, MenuBit>
    idx: string
    activeSelection: string
    isHeadless: boolean
    lastActionTimestamp: number
    lst?: string[]
    geoJsonNow?: any
    atlasNow?: any
    sizeNow?: any
    mapShape?: string
    mapNomNow?: string
    mapDimensions?: string
    shapeBit?: any
}

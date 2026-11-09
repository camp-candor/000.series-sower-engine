export interface CompiledUniverseDescriptor {
    readonly seriesSlug: string
    readonly manifestPath: string
    readonly byteSize: number
    readonly merkleRootHex: string
    readonly hasBibleState: boolean
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
    menuBits?: Record<string, import('./menu.bit.js').default>
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

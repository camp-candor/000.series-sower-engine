/**
 * 10.location.unit - Spatial Overlay Interface Contracts
 * Ephemeral dynamic barrier state and occluder bitmasks at logical tick t.
 */

export interface AxialCoord {
    readonly q: number
    readonly r: number
    readonly s: number // Invariant: q + r + s === 0
}

export type PackedAxial = number // Unsigned 32-bit packed axial: (((q + 32768) & 0xFFFF) << 16) | ((r + 32768) & 0xFFFF)

export interface SpatialOverlaySnapshot {
    readonly overlayHash: string // 64-char lowercase hex SHA-256 digest
    readonly closedPortals: readonly string[] // IDs of locked/closed portals
    readonly impassableCells: readonly PackedAxial[] // Ephemeral obstacles
    readonly traversalCostOverrides?: Readonly<Record<number, number>> // cellId -> basis-point multiplier
    readonly acousticDampingOverridesCdB?: Readonly<Record<string, number>> // portalId -> centi-decibels
}

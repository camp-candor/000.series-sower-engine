/**
 * 10.location.unit - Dynamic Spatial Overlay Snapshot Builder
 * Synthesizes room portal occlusions and ephemeral cell obstacles into a deep-frozen snapshot.
 */
import crypto from 'node:crypto'
import type { PortalRecord } from '../fce/location.interface.js'
import type {
    PackedAxial,
    SpatialOverlaySnapshot,
} from '../fce/spatial-overlay.interface.js'

const canonicalizeJson = (val: unknown): string => {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val)
    }
    if (Array.isArray(val)) {
        return '[' + val.map((item) => canonicalizeJson(item)).join(',') + ']'
    }
    const keys = Object.keys(val as Record<string, unknown>).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    return (
        '{' +
        keys
            .map(
                (k) =>
                    JSON.stringify(k) + ':' + canonicalizeJson((val as any)[k]),
            )
            .join(',') +
        '}'
    )
}

export const buildSpatialOverlaySnapshot = (
    portals: ReadonlyMap<string, PortalRecord>,
    dynamicObstacles: readonly PackedAxial[] = [],
    costOverrides?: Readonly<Record<number, number>>,
    acousticOverridesCdB?: Readonly<Record<string, number>>,
): SpatialOverlaySnapshot => {
    const closedPortals: string[] = []

    for (const [portalId, portal] of portals.entries()) {
        if (portal.status === 'LOCKED' || portal.status === 'COLLAPSED') {
            closedPortals.push(portalId)
        }
    }

    closedPortals.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const sortedObstacles = [...dynamicObstacles].sort((a, b) => a - b)

    const preImage = {
        acousticDampingOverridesCdB: acousticOverridesCdB || {},
        closedPortals,
        impassableCells: sortedObstacles,
        traversalCostOverrides: costOverrides || {},
    }

    const canonical = canonicalizeJson(preImage)
    const overlayHash = crypto
        .createHash('sha256')
        .update(canonical)
        .digest('hex')

    return Object.freeze({
        overlayHash,
        closedPortals: Object.freeze(closedPortals),
        impassableCells: Object.freeze(sortedObstacles),
        traversalCostOverrides: costOverrides
            ? Object.freeze({ ...costOverrides })
            : undefined,
        acousticDampingOverridesCdB: acousticOverridesCdB
            ? Object.freeze({ ...acousticOverridesCdB })
            : undefined,
    })
}

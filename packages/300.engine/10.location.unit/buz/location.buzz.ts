/**
 * 10.location.unit - Location Buzz Business Logic
 * Reciprocal adjacency verification, portal crossing checks, and atomic traversal.
 */
import {
    LocationModel,
    BASELINE_TOPOLOGY_LOCATIONS,
} from '../location.model.js'
import type LocationBit from '../fce/location.bit.js'
import type {
    SpatialNodeDescriptor,
    PortalRecord,
    PortalStatus,
    TraversalRequest,
    TraversalReceipt,
    TopologyValidationReport,
} from '../fce/location.interface.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function portalKey(u: string, v: string): string {
    return u < v ? `${u}#${v}` : `${v}#${u}`
}

export function validateLocationAdjacency(
    locations: Map<string, SpatialNodeDescriptor>,
    fromLocationId: string,
    toLocationId: string,
): boolean {
    const from = locations.get(fromLocationId)
    if (!from) return false
    return from.adjacentLocations.includes(toLocationId)
}

export function auditTopologySymmetry(
    locations: Map<string, SpatialNodeDescriptor>,
    originHubId: string,
): TopologyValidationReport {
    const asymmetricTraps: string[] = []
    const selfAdjacencies: string[] = []
    let totalPortals = 0
    const countedPortals = new Set<string>()

    for (const [uId, uNode] of locations.entries()) {
        for (const vId of uNode.adjacentLocations) {
            if (uId === vId) {
                selfAdjacencies.push(uId)
                continue
            }
            const vNode = locations.get(vId)
            if (!vNode || !vNode.adjacentLocations.includes(uId)) {
                asymmetricTraps.push(`${uId} -> ${vId} (Missing return ${vId} -> ${uId})`)
            }
            const pKey = portalKey(uId, vId)
            if (!countedPortals.has(pKey)) {
                countedPortals.add(pKey)
                totalPortals++
            }
        }
    }

    // BFS Reachability from origin hub
    const visited = new Set<string>()
    const queue: string[] = []

    if (locations.has(originHubId)) {
        queue.push(originHubId)
        visited.add(originHubId)
    }

    while (queue.length > 0) {
        const currId = queue.shift()!
        const currNode = locations.get(currId)
        if (currNode) {
            for (const neighborId of currNode.adjacentLocations) {
                if (locations.has(neighborId) && !visited.has(neighborId)) {
                    visited.add(neighborId)
                    queue.push(neighborId)
                }
            }
        }
    }

    const orphanIslands: string[] = []
    for (const locId of locations.keys()) {
        if (!visited.has(locId)) {
            orphanIslands.push(locId)
        }
    }

    const isReciprocal = asymmetricTraps.length === 0 && selfAdjacencies.length === 0
    const isReachable = orphanIslands.length === 0
    const valid = isReciprocal && isReachable

    return {
        valid,
        totalLocations: locations.size,
        totalPortals,
        originHubId,
        isReciprocal,
        isReachable,
        asymmetricTraps: Object.freeze(asymmetricTraps),
        orphanIslands: Object.freeze(orphanIslands),
        selfAdjacencies: Object.freeze(selfAdjacencies),
        timestampMs: 1700000000000,
    }
}

export const initLocation = async (
    cpy: LocationModel,
    bal?: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    cpy.locations.clear()
    cpy.portals.clear()
    cpy.occupants.clear()

    const initialNodes = bal?.dat?.nodes || BASELINE_TOPOLOGY_LOCATIONS

    for (const node of initialNodes) {
        cpy.locations.set(node.locationId, node)
        cpy.occupants.set(node.locationId, new Set())
    }

    // Register bidirectional portals
    for (const node of initialNodes) {
        for (const neighbor of node.adjacentLocations) {
            const key = portalKey(node.locationId, neighbor)
            if (!cpy.portals.has(key)) {
                cpy.portals.set(key, {
                    portalId: key,
                    fromLocationId: node.locationId,
                    toLocationId: neighbor,
                    status: 'UNLOCKED',
                })
            }
        }
    }

    const report = auditTopologySymmetry(cpy.locations, cpy.originHubId)

    await emitConsole(
        ste,
        `>> [LOCATION:INIT] [OK] Ingested ${cpy.locations.size} crawlspace nodes, ${cpy.portals.size} portals. Topology valid: ${report.valid ? '[PASS]' : '[FAIL]'}`,
    )

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'init-location-pass',
                val: cpy.locations.size,
                dat: { topologyReport: report },
            },
        })
    }
    return cpy
}

export const updateLocation = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'update-location-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const registerLocation = async (
    cpy: LocationModel,
    bal: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    const node = bal.dat?.node
    if (!node || !node.locationId) {
        if (bal.slv) {
            bal.slv({
                locBit: {
                    idx: 'register-location-fail',
                    val: 0,
                    dat: { error: '[INVALID_LOCATION_NODE] Missing node or locationId' },
                },
            })
        }
        return cpy
    }

    cpy.locations.set(node.locationId, node)
    if (!cpy.occupants.has(node.locationId)) {
        cpy.occupants.set(node.locationId, new Set())
    }

    for (const neighbor of node.adjacentLocations) {
        const key = portalKey(node.locationId, neighbor)
        if (!cpy.portals.has(key)) {
            cpy.portals.set(key, {
                portalId: key,
                fromLocationId: node.locationId,
                toLocationId: neighbor,
                status: 'UNLOCKED',
            })
        }
    }

    await emitConsole(
        ste,
        `>> [LOCATION:REGISTER] [${node.locationId}] (${node.displayName}) added with ${node.adjacentLocations.length} adjacent edges.`,
    )

    if (bal.slv) {
        bal.slv({
            locBit: {
                idx: 'register-location-pass',
                val: 1,
                dat: { node },
            },
        })
    }
    return cpy
}

export const setPortalLockAction = async (
    cpy: LocationModel,
    bal: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    const portalId = bal.dat?.portalId || bal.src
    const status: PortalStatus = bal.dat?.portalStatus || 'LOCKED'

    if (!portalId || !cpy.portals.has(portalId)) {
        const err = `[PORTAL_NOT_FOUND] Portal '${portalId}' does not exist`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                locBit: {
                    idx: 'set-portal-lock-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const current = cpy.portals.get(portalId)!
    const updated: PortalRecord = { ...current, status }
    cpy.portals.set(portalId, updated)

    await emitConsole(
        ste,
        `>> [PORTAL:LOCK] [${portalId}] Status updated: [${current.status}] -> [${status}]`,
    )

    if (bal.slv) {
        bal.slv({
            locBit: {
                idx: 'set-portal-lock-pass',
                val: status === 'UNLOCKED' ? 1 : 0,
                dat: { portal: updated },
            },
        })
    }
    return cpy
}

export const validateAdjacencyAction = (
    cpy: LocationModel,
    bal: LocationBit,
    _ste?: State,
): LocationModel => {
    const fromId = bal.src || ''
    const toId = bal.dat?.locationId || ''
    const isAdjacent = validateLocationAdjacency(cpy.locations, fromId, toId)

    if (bal.slv) {
        bal.slv({
            locBit: {
                idx: isAdjacent ? 'validate-adjacency-pass' : 'validate-adjacency-fail',
                val: isAdjacent ? 1 : 0,
                dat: { locationId: toId },
            },
        })
    }
    return cpy
}

export const checkPortalCrossingAction = async (
    cpy: LocationModel,
    bal: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    const req = bal.dat?.traversalRequest
    if (!req || !req.fromLocationId || !req.toLocationId) {
        const err = '[INVALID_TRAVERSAL_REQUEST] Missing fromLocationId or toLocationId'
        if (bal.slv) {
            bal.slv({
                locBit: {
                    idx: 'check-portal-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const { actorId, fromLocationId, toLocationId, timestampMs } = req

    // 1. Adjacency Invariant Check
    if (!validateLocationAdjacency(cpy.locations, fromLocationId, toLocationId)) {
        const err = `[PHYSICALLY_IMPOSSIBLE] Location '${toLocationId}' is not adjacent to '${fromLocationId}'`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                traversalReceipt: {
                    permitted: false,
                    actorId,
                    fromLocationId,
                    toLocationId,
                    error: err,
                    timestampMs,
                },
                locBit: {
                    idx: 'physically-impossible',
                    val: -1,
                    src: '[PHYSICALLY_IMPOSSIBLE]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 2. Portal Lock Check
    const pKey = portalKey(fromLocationId, toLocationId)
    const portal = cpy.portals.get(pKey)
    if (portal && portal.status !== 'UNLOCKED') {
        const err = `[SPATIAL_UNAVAILABLE] Portal '${pKey}' is ${portal.status}`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                traversalReceipt: {
                    permitted: false,
                    actorId,
                    fromLocationId,
                    toLocationId,
                    portalId: pKey,
                    error: err,
                    timestampMs,
                },
                locBit: {
                    idx: 'spatial-unavailable',
                    val: -1,
                    src: '[SPATIAL_UNAVAILABLE]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 3. Destination Capacity Check
    const targetNode = cpy.locations.get(toLocationId)!
    const currentOccupants = cpy.occupants.get(toLocationId) || new Set()
    if (currentOccupants.size >= targetNode.maxOccupants) {
        const err = `[CAPACITY_EXCEEDED] Location '${toLocationId}' is full (${currentOccupants.size}/${targetNode.maxOccupants})`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                traversalReceipt: {
                    permitted: false,
                    actorId,
                    fromLocationId,
                    toLocationId,
                    portalId: pKey,
                    error: err,
                    timestampMs,
                },
                locBit: {
                    idx: 'capacity-exceeded',
                    val: -1,
                    src: '[CAPACITY_EXCEEDED]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const receipt: TraversalReceipt = {
        permitted: true,
        actorId,
        fromLocationId,
        toLocationId,
        portalId: pKey,
        timestampMs,
    }

    if (bal.slv) {
        bal.slv({
            traversalReceipt: receipt,
            locBit: {
                idx: 'check-portal-pass',
                val: 1,
                dat: { traversalReceipt: receipt },
            },
        })
    }
    return cpy
}

export const traverseLocationAction = async (
    cpy: LocationModel,
    bal: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    const req = bal.dat?.traversalRequest
    if (!req) return cpy

    const { actorId, fromLocationId, toLocationId, tick, timestampMs } = req

    // Evaluate gate first
    let isPermitted = false
    let failureError: string | undefined

    await checkPortalCrossingAction(
        cpy,
        {
            idx: 'eval-crossing',
            dat: { traversalRequest: req },
            slv: (res: any) => {
                isPermitted = res.traversalReceipt?.permitted ?? false
                failureError = res.traversalReceipt?.error
            },
        },
        ste,
    )

    if (!isPermitted) {
        if (bal.slv) {
            bal.slv({
                traversalReceipt: {
                    permitted: false,
                    actorId,
                    fromLocationId,
                    toLocationId,
                    error: failureError,
                    timestampMs,
                },
                locBit: {
                    idx: 'traverse-location-fail',
                    val: -1,
                    dat: { error: failureError },
                },
            })
        }
        return cpy
    }

    // Atomic Move Execution
    if (fromLocationId && cpy.occupants.has(fromLocationId)) {
        cpy.occupants.get(fromLocationId)!.delete(actorId)
    }

    if (!cpy.occupants.has(toLocationId)) {
        cpy.occupants.set(toLocationId, new Set())
    }
    cpy.occupants.get(toLocationId)!.add(actorId)

    const leftEvtId = `evt_left_${actorId}_${tick}`
    const enteredEvtId = `evt_entered_${actorId}_${tick}`

    // Dispatch atomic event pair through 05.event.unit
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: leftEvtId,
                    eventType: 'ACTOR_LEFT_LOCATION',
                    actorId,
                    tick,
                    payload: { fromLocationId, toLocationId },
                },
            },
        })

        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: enteredEvtId,
                    eventType: 'ACTOR_ENTERED_LOCATION',
                    actorId,
                    tick,
                    payload: { fromLocationId, toLocationId },
                },
            },
        })

        // Update entities_live in 02.database.unit
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'entities_live',
                        action: 'UPDATE',
                        key: actorId,
                        record: { location_id: toLocationId, updated_at_ms: timestampMs },
                    },
                ],
            },
        })
    }

    const receipt: TraversalReceipt = {
        permitted: true,
        actorId,
        fromLocationId,
        toLocationId,
        portalId: portalKey(fromLocationId, toLocationId),
        leftEventId: leftEvtId,
        enteredEventId: enteredEvtId,
        timestampMs,
    }

    await emitConsole(
        ste,
        `>> [TRAVERSE:OK] [${actorId}] Moved: [${fromLocationId}] -> [${toLocationId}] via [${receipt.portalId}]`,
    )

    if (bal.slv) {
        bal.slv({
            traversalReceipt: receipt,
            locBit: {
                idx: 'traverse-location-pass',
                val: 1,
                dat: { traversalReceipt: receipt },
            },
        })
    }

    return cpy
}

export const auditTopologyAction = async (
    cpy: LocationModel,
    bal: LocationBit,
    ste?: State,
): Promise<LocationModel> => {
    const report = auditTopologySymmetry(cpy.locations, cpy.originHubId)

    if (report.valid) {
        await emitConsole(
            ste,
            `>> [TOPOLOGY:AUDIT] [PASS] Reciprocal portal mesh verified (${report.totalLocations} nodes, ${report.totalPortals} portals, connected: 1).`,
        )
    } else {
        await emitConsole(
            ste,
            `:: [TOPOLOGY:AUDIT] [FAIL] Traps: ${report.asymmetricTraps.length} | Orphans: ${report.orphanIslands.length} | Self: ${report.selfAdjacencies.length}`,
        )
    }

    if (bal.slv) {
        bal.slv({
            topologyReport: report,
            locBit: {
                idx: report.valid ? 'audit-topology-pass' : 'audit-topology-fail',
                val: report.valid ? 1 : 0,
                dat: { topologyReport: report },
            },
        })
    }

    return cpy
}

/**
 * 10.location.unit - Location Buzz Business Logic
 * Reciprocal adjacency verification, portal crossing checks, and synchronous SpatialPort binding.
 */
import {
    LocationModel,
    BASELINE_TOPOLOGY_LOCATIONS,
} from '../location.model.js'
import type LocationBit from '../fce/location.bit.js'
import type {
    PortalRecord,
    TopologyValidationReport,
} from '../fce/location.interface.js'
import type {
    PathReceipt,
    PerceptCandidate,
} from '../fce/spatial-port.interface.js'
import type State from '../../99.core/state.js'

const UPDATE_CONSOLE = '[Console action] Update Console'

export const portalKey = (fromId: string, toId: string): string =>
    `${fromId}->${toId}`

const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
            return
        } catch {
            // Degrade gracefully
        }
    }
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
            return
        } catch {
            // Degrade gracefully
        }
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

    for (const node of BASELINE_TOPOLOGY_LOCATIONS) {
        cpy.locations.set(node.locationId, node)
        cpy.occupants.set(node.locationId, new Set<string>())
    }

    for (const node of BASELINE_TOPOLOGY_LOCATIONS) {
        for (const adjId of node.adjacentLocations) {
            const key = portalKey(node.locationId, adjId)
            if (!cpy.portals.has(key)) {
                cpy.portals.set(key, {
                    portalId: key,
                    fromLocationId: node.locationId,
                    toLocationId: adjId,
                    status: 'UNLOCKED',
                })
            }
        }
    }

    await emitConsole(
        ste,
        '>> [LOCATION:INIT] [OK] Baseline topology mesh synchronized.',
    )
    if (bal?.slv) {
        bal.slv({
            locBit: { idx: 'init-location-success', val: cpy.locations.size },
        })
    }
    return cpy
}

export const updateLocation = async (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): Promise<LocationModel> => {
    if (bal?.slv) {
        bal.slv({ locBit: { idx: 'update-location-pass' } })
    }
    return cpy
}

export const registerLocation = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const node = bal?.dat?.node
    if (!node || !node.locationId) {
        if (bal?.slv)
            bal.slv({
                locBit: {
                    idx: 'register-location-fail',
                    dat: { error: 'INVALID_NODE' },
                },
            })
        return cpy
    }
    cpy.locations.set(node.locationId, node)
    if (!cpy.occupants.has(node.locationId)) {
        cpy.occupants.set(node.locationId, new Set<string>())
    }
    if (bal?.slv) {
        bal.slv({ locBit: { idx: 'register-location-success', dat: { node } } })
    }
    return cpy
}

export const setPortalLockAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const portalId = bal?.dat?.portalId
    const status = bal?.dat?.portalStatus
    if (!portalId || !status || !cpy.portals.has(portalId)) {
        if (bal?.slv)
            bal.slv({
                locBit: {
                    idx: 'set-portal-fail',
                    dat: { error: 'PORTAL_NOT_FOUND' },
                },
            })
        return cpy
    }
    const existing = cpy.portals.get(portalId)!
    const updated: PortalRecord = { ...existing, status }
    cpy.portals.set(portalId, updated)
    if (bal?.slv) {
        bal.slv({
            locBit: { idx: 'set-portal-success', dat: { portal: updated } },
        })
    }
    return cpy
}

export const validateLocationAdjacency = (
    model: LocationModel,
    fromId: string,
    toId: string,
): boolean => {
    const node = model.locations.get(fromId)
    if (!node) return false
    return node.adjacentLocations.includes(toId)
}

export const validateAdjacencyAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const req = bal?.dat?.traversalRequest
    if (!req) return cpy
    const isAdjacent = validateLocationAdjacency(
        cpy,
        req.fromLocationId,
        req.toLocationId,
    )
    if (bal?.slv) {
        bal.slv({
            locBit: { idx: 'validate-adjacency-res', val: isAdjacent ? 1 : 0 },
        })
    }
    return cpy
}

export const checkPortalCrossingAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const req = bal?.dat?.traversalRequest
    if (!req) return cpy

    const isAdjacent = validateLocationAdjacency(
        cpy,
        req.fromLocationId,
        req.toLocationId,
    )
    if (!isAdjacent) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'portal-crossing-fail',
                    dat: {
                        traversalReceipt: {
                            permitted: false,
                            actorId: req.actorId,
                            fromLocationId: req.fromLocationId,
                            toLocationId: req.toLocationId,
                            error: 'PHYSICALLY_IMPOSSIBLE: Not adjacent',
                            timestampMs: Date.now(),
                        },
                    },
                },
            })
        }
        return cpy
    }

    const pKey = portalKey(req.fromLocationId, req.toLocationId)
    const portal = cpy.portals.get(pKey)
    if (portal && portal.status !== 'UNLOCKED') {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'portal-crossing-fail',
                    dat: {
                        traversalReceipt: {
                            permitted: false,
                            actorId: req.actorId,
                            fromLocationId: req.fromLocationId,
                            toLocationId: req.toLocationId,
                            portalId: pKey,
                            error: `SPATIAL_UNAVAILABLE: Portal is ${portal.status}`,
                            timestampMs: Date.now(),
                        },
                    },
                },
            })
        }
        return cpy
    }

    const destNode = cpy.locations.get(req.toLocationId)
    const currentOcc = cpy.occupants.get(req.toLocationId)?.size || 0
    if (destNode && currentOcc >= destNode.maxOccupants) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'portal-crossing-fail',
                    dat: {
                        traversalReceipt: {
                            permitted: false,
                            actorId: req.actorId,
                            fromLocationId: req.fromLocationId,
                            toLocationId: req.toLocationId,
                            error: 'CAPACITY_EXCEEDED: Destination is saturated',
                            timestampMs: Date.now(),
                        },
                    },
                },
            })
        }
        return cpy
    }

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'portal-crossing-success',
                dat: {
                    traversalReceipt: {
                        permitted: true,
                        actorId: req.actorId,
                        fromLocationId: req.fromLocationId,
                        toLocationId: req.toLocationId,
                        portalId: pKey,
                        timestampMs: Date.now(),
                    },
                },
            },
        })
    }
    return cpy
}

export const traverseLocationAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const req = bal?.dat?.traversalRequest
    if (!req) return cpy

    const fromSet = cpy.occupants.get(req.fromLocationId)
    const toSet = cpy.occupants.get(req.toLocationId)

    if (fromSet) fromSet.delete(req.actorId)
    if (toSet) toSet.add(req.actorId)

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'traverse-location-success',
                dat: {
                    traversalReceipt: {
                        permitted: true,
                        actorId: req.actorId,
                        fromLocationId: req.fromLocationId,
                        toLocationId: req.toLocationId,
                        leftEventId: `EVT_LEFT_${req.actorId}_${req.tick}`,
                        enteredEventId: `EVT_ENTERED_${req.actorId}_${req.tick}`,
                        timestampMs: Date.now(),
                    },
                },
            },
        })
    }
    return cpy
}

export const auditTopologySymmetry = (
    model: LocationModel,
): TopologyValidationReport => {
    let isReciprocal = true
    const asymmetricTraps: string[] = []
    const selfAdjacencies: string[] = []

    for (const [locId, node] of model.locations.entries()) {
        if (node.adjacentLocations.includes(locId)) {
            selfAdjacencies.push(locId)
        }
        for (const adjId of node.adjacentLocations) {
            const neighbor = model.locations.get(adjId)
            if (!neighbor || !neighbor.adjacentLocations.includes(locId)) {
                isReciprocal = false
                asymmetricTraps.push(`${locId}->${adjId}`)
            }
        }
    }

    return {
        valid: isReciprocal && selfAdjacencies.length === 0,
        totalLocations: model.locations.size,
        totalPortals: model.portals.size,
        originHubId: model.originHubId,
        isReciprocal,
        isReachable: true,
        asymmetricTraps: Object.freeze(asymmetricTraps),
        orphanIslands: Object.freeze([]),
        selfAdjacencies: Object.freeze(selfAdjacencies),
        timestampMs: Date.now(),
    }
}

export const auditTopologyAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    const report = auditTopologySymmetry(cpy)
    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'audit-topology-report',
                dat: { topologyReport: report },
            },
        })
    }
    return cpy
}

// ----------------------------------------------------------------------------
// SYNCHRONOUS SPATIALPORT BINDING & EXECUTION BUZZERS
// ----------------------------------------------------------------------------

export const bindSpatialPortAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    ste?: State,
): LocationModel => {
    const port = bal?.dat?.spatialPort
    const manifest = bal?.dat?.topologyManifest

    if (!port || typeof port.findPath !== 'function') {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'bind-spatial-port-fail',
                    dat: {
                        error: 'SPATIAL_PORT_INVALID: findPath function required',
                    },
                },
            })
        }
        return cpy
    }

    cpy.spatialPort = port
    if (manifest) {
        cpy.topologyManifest = manifest
    }

    // Fire-and-forget cns00 telemetry; the synchronous bind receipt stays pure.
    void emitConsole(
        ste,
        '>> [SPATIAL:PORT] Synchronous SpatialPort bound in 10.location.unit.',
    )

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'bind-spatial-port-success',
                src: port.kernelVersion,
                dat: { spatialPort: port, topologyManifest: manifest },
            },
        })
    }
    return cpy
}

export const evaluateSpatialPathAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    if (!cpy.spatialPort) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'evaluate-spatial-path-fail',
                    dat: {
                        error: 'SPATIAL_UNAVAILABLE: SpatialPort is not bound',
                    },
                },
            })
        }
        return cpy
    }

    const manifest = bal?.dat?.topologyManifest || cpy.topologyManifest
    const overlay = bal?.dat?.overlaySnapshot
    const origin = bal?.dat?.originPacked
    const destination = bal?.dat?.destinationPacked
    const budget = bal?.dat?.maxBudgetCostUnits ?? 1000
    const limit = bal?.dat?.workEnvelopeLimit ?? 512

    if (!manifest || !overlay || origin == null || destination == null) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'evaluate-spatial-path-fail',
                    dat: {
                        error: 'INVALID_QUERY: manifest, overlay, origin, destination mandatory',
                    },
                },
            })
        }
        return cpy
    }

    // Pure synchronous invocation inside local V8 isolate
    const receipt: PathReceipt = cpy.spatialPort.findPath(
        manifest,
        overlay,
        origin,
        destination,
        budget,
        limit,
    )

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'evaluate-spatial-path-success',
                val: receipt.ok ? 1 : 0,
                dat: { pathReceipt: receipt },
            },
        })
    }
    return cpy
}

export const evaluateSpatialPerceptionAction = (
    cpy: LocationModel,
    bal?: LocationBit,
    _ste?: State,
): LocationModel => {
    if (!cpy.spatialPort) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'evaluate-spatial-perception-fail',
                    dat: {
                        error: 'SPATIAL_UNAVAILABLE: SpatialPort is not bound',
                    },
                },
            })
        }
        return cpy
    }

    const manifest = bal?.dat?.topologyManifest || cpy.topologyManifest
    const overlay = bal?.dat?.overlaySnapshot
    const sourceCell = bal?.dat?.sourceCellPacked
    const observerCell = bal?.dat?.observerCellPacked
    const energyCdB = bal?.dat?.emissionEnergyCdB ?? 7000

    if (!manifest || !overlay || sourceCell == null || observerCell == null) {
        if (bal?.slv) {
            bal.slv({
                locBit: {
                    idx: 'evaluate-spatial-perception-fail',
                    dat: {
                        error: 'INVALID_QUERY: manifest, overlay, sourceCell, observerCell mandatory',
                    },
                },
            })
        }
        return cpy
    }

    // Pure synchronous invocation inside local V8 isolate
    const percept: PerceptCandidate = cpy.spatialPort.evaluatePerception(
        manifest,
        overlay,
        sourceCell,
        observerCell,
        energyCdB,
    )

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'evaluate-spatial-perception-success',
                val: percept.isOccluded ? 0 : 1,
                dat: { perceptCandidate: percept },
            },
        })
    }
    return cpy
}

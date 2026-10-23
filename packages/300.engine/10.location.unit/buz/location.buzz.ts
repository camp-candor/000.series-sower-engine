import type { LocationModel } from '../location.model'
import type LocationBit from '../fce/location.bit'
import type State from '../../99.core/state'
import type {
    LocationRecord,
    PortalState,
    CapacityAuditReceipt,
} from '../fce/location.interface'

export const createDefaultLocationRecord = (
    locationId: string,
    name = locationId,
): LocationRecord => ({
    locationId,
    name,
    maxOccupancy: 2,
    acousticDampingCdB: 1500,
    ambientLuxBps: 2000,
    portals: {},
    occupants: [],
    updatedAtMs: 0,
})

export const initLocation = (
    cpy: LocationModel,
    bal: LocationBit,
    _ste: State,
): LocationModel => {
    cpy.locations = {}
    if (bal?.slv) bal.slv({ locBit: { idx: 'init-location', val: 0 } })
    return cpy
}

export const updateLocation = (
    cpy: LocationModel,
    bal: LocationBit,
    _ste: State,
): LocationModel => {
    if (bal?.slv) bal.slv({ locBit: { idx: 'update-location' } })
    return cpy
}

export const registerLocation = (
    cpy: LocationModel,
    bal: LocationBit<any>,
    _ste: State,
): LocationModel => {
    const payload = bal?.dat
    if (!payload?.locationId) {
        if (bal?.slv)
            bal.slv({
                locBit: {
                    idx: 'register-location-err',
                    src: 'MISSING_LOCATION_ID',
                    val: -1,
                },
            })
        return cpy
    }

    const existing =
        cpy.locations[payload.locationId] ||
        createDefaultLocationRecord(payload.locationId)
    const updated: LocationRecord = {
        ...existing,
        ...payload,
        portals: { ...existing.portals, ...(payload.portals || {}) },
        occupants: payload.occupants
            ? Array.from(new Set(payload.occupants))
            : existing.occupants,
        updatedAtMs:
            bal?.val && bal.val > 0 ? bal.val : existing.updatedAtMs + 1,
    }

    cpy.locations[payload.locationId] = updated

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'register-location-ok',
                src: payload.locationId,
                val: updated.occupants.length,
                dat: updated,
            },
        })
    }
    return cpy
}

export const setPortalStateLocation = (
    cpy: LocationModel,
    bal: LocationBit<any>,
    _ste: State,
): LocationModel => {
    const payload = bal?.dat
    if (!payload?.locationId || !payload?.targetPortalId || !payload?.state) {
        if (bal?.slv)
            bal.slv({
                locBit: {
                    idx: 'set-portal-state-err',
                    src: 'INVALID_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    const loc =
        cpy.locations[payload.locationId] ||
        createDefaultLocationRecord(payload.locationId)
    loc.portals[payload.targetPortalId] = payload.state
    loc.updatedAtMs += 1
    cpy.locations[payload.locationId] = loc

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: 'set-portal-state-ok',
                src: payload.locationId,
                dat: {
                    locationId: payload.locationId,
                    targetPortalId: payload.targetPortalId,
                    portalId: payload.targetPortalId,
                    state: payload.state,
                },
            },
        })
    }
    return cpy
}

export const validateCapacityLocation = async (
    cpy: LocationModel,
    bal: LocationBit<any>,
    ste: State,
): Promise<LocationModel> => {
    const payload = bal?.dat
    if (!payload?.locationId) {
        if (bal?.slv)
            bal.slv({
                locBit: {
                    idx: 'validate-capacity-err',
                    src: 'MISSING_LOCATION_ID',
                    val: -1,
                },
            })
        return cpy
    }

    const loc =
        cpy.locations[payload.locationId] ||
        createDefaultLocationRecord(payload.locationId)
    const isAlreadyOccupant = payload.incomingEntityId
        ? loc.occupants.includes(payload.incomingEntityId)
        : false
    const projectedCount = isAlreadyOccupant
        ? loc.occupants.length
        : loc.occupants.length + 1
    const allowed = projectedCount <= loc.maxOccupancy

    const receipt: CapacityAuditReceipt = {
        locationId: payload.locationId,
        maxOccupancy: loc.maxOccupancy,
        currentCount: projectedCount,
        allowed,
        error: allowed
            ? undefined
            : `>> [ROOM_CAPACITY_EXCEEDED] Location '${payload.locationId}' capacity saturated (${projectedCount}/${loc.maxOccupancy})`,
    }

    if (!allowed) {
        const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
        if (lib && typeof lib.hunt === 'function' && lib !== ste) {
            try {
                await lib.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: receipt.error,
                })
            } catch {}
        }
        if (ste && typeof ste.hunt === 'function') {
            await Promise.race([
                ste.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: receipt.error,
                }),
                new Promise((resolve) => setTimeout(resolve, 50)),
            ]).catch(() => {})
        }
    }

    if (bal?.slv) {
        bal.slv({
            locBit: {
                idx: allowed
                    ? 'validate-capacity-ok'
                    : 'validate-capacity-exceeded',
                src: payload.locationId,
                val: allowed ? 0 : -1,
                dat: receipt,
            },
        })
    }
    return cpy
}

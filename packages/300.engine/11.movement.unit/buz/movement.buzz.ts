import type { MovementModel } from '../movement.model'
import type MovementBit from '../fce/movement.bit'
import type State from '../../99.core/state'
import type {
    AxialCoord,
    ActorSpatialPosition,
    MoveEvaluationQuery,
    MoveEvaluationReceipt,
} from '../fce/movement.interface'

export const assertAxialInvariant = (c: {
    q: number
    r: number
    s?: number
}): AxialCoord => {
    const { q, r } = c
    if (!Number.isInteger(q) || !Number.isInteger(r)) {
        throw new Error(
            `[FLOAT_PROHIBITED] Axial coordinates must be integers. Received (${q}, ${r})`,
        )
    }
    const s = c.s !== undefined ? c.s : -q - r
    if (q + r + s !== 0) {
        throw new Error(
            `[AXIAL_INVARIANT_BREACH] q + r + s must equal 0. Received: ${q} + ${r} + ${s} = ${q + r + s}`,
        )
    }
    return { q, r, s }
}

export const computeAxialDistance = (a: AxialCoord, b: AxialCoord): number => {
    return Math.max(
        Math.abs(a.q - b.q),
        Math.abs(a.r - b.r),
        Math.abs(a.s - b.s),
    )
}

export const initMovement = (
    cpy: MovementModel,
    bal: MovementBit,
    _ste: State,
): MovementModel => {
    cpy.positions = {}
    if (bal?.slv) bal.slv({ movBit: { idx: 'init-movement', val: 0 } })
    return cpy
}

export const updateMovement = (
    cpy: MovementModel,
    bal: MovementBit,
    _ste: State,
): MovementModel => {
    if (bal?.slv) bal.slv({ movBit: { idx: 'update-movement' } })
    return cpy
}

export const setActorPositionMovement = (
    cpy: MovementModel,
    bal: MovementBit<any>,
    _ste: State,
): MovementModel => {
    const payload = bal?.dat
    if (
        !payload?.entityId ||
        !payload?.locationId ||
        payload.q === undefined ||
        payload.r === undefined
    ) {
        if (bal?.slv)
            bal.slv({
                movBit: {
                    idx: 'set-actor-position-err',
                    src: 'MISSING_PAYLOAD',
                    val: -1,
                },
            })
        return cpy
    }

    const coord = assertAxialInvariant({ q: payload.q, r: payload.r })
    const existing = cpy.positions[payload.entityId]

    const updated: ActorSpatialPosition = {
        entityId: payload.entityId,
        locationId: payload.locationId,
        coord,
        locomotionTier:
            payload.locomotionTier ||
            existing?.locomotionTier ||
            'UNRESTRICTED',
        updatedAtMs:
            bal?.val && bal.val > 0
                ? bal.val
                : (existing?.updatedAtMs ?? 0) + 1,
    }

    cpy.positions[payload.entityId] = updated

    if (bal?.slv) {
        bal.slv({
            movBit: {
                idx: 'set-actor-position-ok',
                src: payload.entityId,
                dat: updated,
            },
        })
    }
    return cpy
}

export const evaluateMoveMovement = async (
    cpy: MovementModel,
    bal: MovementBit<any>,
    ste: State,
): Promise<MovementModel> => {
    const q = bal?.dat
    if (!q?.entityId || !q?.origin || !q?.destination) {
        if (bal?.slv)
            bal.slv({
                movBit: {
                    idx: 'evaluate-move-err',
                    src: 'MISSING_QUERY',
                    val: -1,
                },
            })
        return cpy
    }

    const origin = assertAxialInvariant(q.origin)
    const destination = assertAxialInvariant(q.destination)
    const distance = computeAxialDistance(origin, destination)

    const logConsole = async (msg: string) => {
        const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
        if (lib && typeof lib.hunt === 'function' && lib !== ste) {
            try {
                await lib.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: msg,
                })
            } catch {}
        }
        if (ste && typeof ste.hunt === 'function') {
            await Promise.race([
                ste.hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: msg,
                }),
                new Promise((resolve) => setTimeout(resolve, 50)),
            ]).catch(() => {})
        }
    }

    // 1. Locomotion Tier Gate: Immobilized characters cannot move
    if (q.locomotionTier === 'IMMOBILIZED') {
        const errorMsg = `>> [LOCOMOTION_IMMOBILIZED_BREACH] Entity '${q.entityId}' is IMMOBILIZED and cannot traverse hex cells`
        await logConsole(errorMsg)
        const receipt: MoveEvaluationReceipt = {
            allowed: false,
            entityId: q.entityId,
            axialDistance: distance,
            traversalCostUnits: 0,
            error: errorMsg,
        }
        if (bal?.slv)
            bal.slv({
                movBit: {
                    idx: 'locomotion-immobilized-breach',
                    val: -1,
                    dat: receipt,
                },
            })
        return cpy
    }

    // 2. Portal Occlusion Gate: Cross-room movement requires OPEN portal
    if (
        q.destinationLocationId &&
        q.destinationLocationId !== q.sourceLocationId
    ) {
        if (q.portalState && q.portalState !== 'OPEN') {
            const errorMsg = `>> [PORTAL_OCCLUDED_BREACH] Portal '${q.portalId || 'unknown'}' between '${q.sourceLocationId}' and '${q.destinationLocationId}' is ${q.portalState}`
            await logConsole(errorMsg)
            const receipt: MoveEvaluationReceipt = {
                allowed: false,
                entityId: q.entityId,
                axialDistance: distance,
                traversalCostUnits: 0,
                error: errorMsg,
            }
            if (bal?.slv)
                bal.slv({
                    movBit: {
                        idx: 'portal-occluded-breach',
                        val: -1,
                        dat: receipt,
                    },
                })
            return cpy
        }
    }

    // 3. Compute Integer Traversal Cost: Limping doubles cost
    const multiplier = q.locomotionTier === 'LIMPING' ? 2 : 1
    const traversalCostUnits = distance * multiplier * 100 // 100 CostUnits per standard hex step

    const receipt: MoveEvaluationReceipt = {
        allowed: true,
        entityId: q.entityId,
        axialDistance: distance,
        traversalCostUnits,
    }

    if (bal?.slv) {
        bal.slv({
            movBit: {
                idx: 'evaluate-move-ok',
                src: q.entityId,
                val: traversalCostUnits,
                dat: receipt,
            },
        })
    }
    return cpy
}

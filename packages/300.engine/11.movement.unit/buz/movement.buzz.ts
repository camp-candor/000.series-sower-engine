/**
 * 11.movement.unit - Movement Buzz Business Logic
 * Axial coordinate distance evaluation, locomotion tier constraints, and atomic movement scheduling.
 */
import { MovementModel } from '../movement.model.js'
import type MovementBit from '../fce/movement.bit.js'
import type {
    AxialCoord,
    TerrainType,
    ActorMovementState,
    MovementRequest,
    MovementReceipt,
    DistanceAuditReceipt,
} from '../fce/movement.interface.js'
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'
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

export function cellKey(locationId: string, coord: AxialCoord): string {
    return `${locationId}#${coord.q}:${coord.r}`
}

export function axialDistance(a: AxialCoord, b: AxialCoord): number {
    if (
        !Number.isInteger(a.q) ||
        !Number.isInteger(a.r) ||
        !Number.isInteger(b.q) ||
        !Number.isInteger(b.r)
    ) {
        throw new TypeError(
            '[FLOAT_PROHIBITED] Axial coordinates must be discrete integers.',
        )
    }
    const dq = a.q - b.q
    const dr = a.r - b.r
    const dsum = a.q + a.r - (b.q + b.r)
    return Math.floor((Math.abs(dq) + Math.abs(dsum) + Math.abs(dr)) / 2)
}

export function calculateTerrainCost(
    terrain: TerrainType,
    tier: LocomotionTier,
): number {
    let baseCost = 1
    switch (terrain) {
        case 'CLEAR':
            baseCost = 1
            break
        case 'RUBBLE':
            baseCost = 2
            break
        case 'WATER_SUBMERGED':
            baseCost = 3
            break
        case 'CRAWLWAY':
            baseCost = 2
            break
        case 'CONSTRICTED':
            baseCost = 3
            break
        default:
            baseCost = 1
            break
    }

    if (tier === 'LIMPING') {
        return baseCost * 2
    }
    return baseCost
}

export const initMovement = async (
    cpy: MovementModel,
    bal?: MovementBit,
    ste?: State,
): Promise<MovementModel> => {
    cpy.actorPositions.clear()
    cpy.occupiedCells.clear()

    await emitConsole(
        ste,
        '>> [MOVEMENT:INIT] [OK] Axial locomotion gating engine online.',
    )

    if (bal?.slv) {
        bal.slv({
            movBit: {
                idx: 'init-movement-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateMovement = (
    cpy: MovementModel,
    bal?: MovementBit,
    _ste?: State,
): MovementModel => {
    if (bal?.slv) {
        bal.slv({
            movBit: {
                idx: 'update-movement-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const setActorPositionAction = async (
    cpy: MovementModel,
    bal: MovementBit,
    ste?: State,
): Promise<MovementModel> => {
    const actorId = bal.dat?.actorId || bal.src
    const locationId = bal.dat?.locationId || 'loc_the_warm_pipe'
    const coord = bal.dat?.coord || { q: 0, r: 0 }
    const tier: LocomotionTier = bal.dat?.locomotionTier || 'UNRESTRICTED'
    const timestampMs = bal.dat?.timestampMs || 1700000000000

    if (!actorId) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'set-actor-position-fail',
                    val: 0,
                    dat: {
                        error: '[INVALID_ACTOR_ID] actorId required to set position',
                    },
                },
            })
        }
        return cpy
    }

    // Clean up old cell if registered
    const existing = cpy.actorPositions.get(actorId)
    if (existing) {
        const oldKey = cellKey(existing.locationId, existing.coord)
        cpy.occupiedCells.delete(oldKey)
    }

    const state: ActorMovementState = {
        actorId,
        locationId,
        coord,
        locomotionTier: tier,
        busyUntilTick: 0,
        updatedAtMs: timestampMs,
    }

    const newKey = cellKey(locationId, coord)
    cpy.actorPositions.set(actorId, state)
    cpy.occupiedCells.set(newKey, actorId)

    await emitConsole(
        ste,
        `>> [MOVEMENT:SET] [${actorId}] Position pinned at [${locationId}] (${coord.q}, ${coord.r}) | Tier: [${tier}]`,
    )

    if (bal.slv) {
        bal.slv({
            actorState: state,
            movBit: {
                idx: 'set-actor-position-pass',
                val: 1,
                dat: { actorState: state },
            },
        })
    }
    return cpy
}

export const calculateDistanceAction = (
    cpy: MovementModel,
    bal: MovementBit,
    _ste?: State,
): MovementModel => {
    const from = bal.dat?.fromCoord
    const to = bal.dat?.toCoord

    if (!from || !to) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'calc-distance-fail',
                    val: -1,
                    dat: {
                        error: '[INVALID_COORDS] fromCoord and toCoord required',
                    },
                },
            })
        }
        return cpy
    }

    try {
        const d = axialDistance(from, to)
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'calc-distance-pass',
                    val: d,
                    dat: {
                        distanceAudit: {
                            fromCoord: from,
                            toCoord: to,
                            distance: d,
                            isAdjacent: d === 1,
                            permittedForInteraction: d <= 1,
                        },
                    },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'calc-distance-fail',
                    val: -1,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }

    return cpy
}

export const assertInteractionRangeAction = async (
    cpy: MovementModel,
    bal: MovementBit,
    ste?: State,
): Promise<MovementModel> => {
    const from = bal.dat?.fromCoord
    const to = bal.dat?.toCoord

    if (!from || !to) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'assert-interaction-fail',
                    val: 0,
                    dat: { error: '[INVALID_COORDS] Coordinates required' },
                },
            })
        }
        return cpy
    }

    try {
        const d = axialDistance(from, to)
        const inRange = d <= 1
        const receipt: DistanceAuditReceipt = {
            fromCoord: from,
            toCoord: to,
            distance: d,
            isAdjacent: d === 1,
            permittedForInteraction: inRange,
        }

        if (!inRange) {
            await emitConsole(
                ste,
                `:: [FAIL] [OUT_OF_INTERACTION_RANGE] Distance ${d} hexes exceeds interaction threshold (d <= 1)`,
            )
        }

        if (bal.slv) {
            bal.slv({
                distanceAudit: receipt,
                movBit: {
                    idx: inRange
                        ? 'assert-interaction-pass'
                        : 'out-of-interaction-range',
                    val: inRange ? 1 : -1,
                    src: inRange ? '[OK]' : '[OUT_OF_INTERACTION_RANGE]',
                    dat: { distanceAudit: receipt },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'assert-interaction-fail',
                    val: -1,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }

    return cpy
}

export const executeMovementAction = async (
    cpy: MovementModel,
    bal: MovementBit,
    ste?: State,
): Promise<MovementModel> => {
    const req: MovementRequest | undefined = bal.dat?.movementRequest
    if (!req || !req.actorId || !req.fromCoord || !req.toCoord) {
        const err = '[INVALID_MOVEMENT_REQUEST] Missing actorId or coordinates'
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'execute-movement-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const {
        actorId,
        locationId,
        fromCoord,
        toCoord,
        currentTick,
        timestampMs,
    } = req
    const terrain: TerrainType = req.terrainType || 'CLEAR'

    // Look up actor state or create default
    let actorState = cpy.actorPositions.get(actorId)
    const tier: LocomotionTier =
        req.locomotionTier || actorState?.locomotionTier || 'UNRESTRICTED'

    if (!actorState) {
        actorState = {
            actorId,
            locationId,
            coord: fromCoord,
            locomotionTier: tier,
            busyUntilTick: 0,
            updatedAtMs: timestampMs,
        }
        cpy.actorPositions.set(actorId, actorState)
        cpy.occupiedCells.set(cellKey(locationId, fromCoord), actorId)
    }

    // 1. Invariant Check: IMMOBILIZED Actors cannot move
    if (tier === 'IMMOBILIZED') {
        const err = `[IMMOBILIZED_ACTOR_BLOCKED] Actor '${actorId}' is IMMOBILIZED and cannot move.`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                movementReceipt: {
                    permitted: false,
                    actorId,
                    locationId,
                    fromCoord,
                    toCoord,
                    distance: 0,
                    traversalCostTicks: 0,
                    busyUntilTick: actorState.busyUntilTick,
                    error: err,
                    timestampMs,
                },
                movBit: {
                    idx: 'immobilized-actor-blocked',
                    val: -1,
                    src: '[IMMOBILIZED_ACTOR_BLOCKED]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 2. Invariant Check: Busy Tick Governor
    if (currentTick < actorState.busyUntilTick) {
        const remaining = actorState.busyUntilTick - currentTick
        const err = `[ACTOR_STILL_BUSY] Actor '${actorId}' is busy until tick ${actorState.busyUntilTick} (${remaining} ticks remaining).`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                movementReceipt: {
                    permitted: false,
                    actorId,
                    locationId,
                    fromCoord,
                    toCoord,
                    distance: 0,
                    traversalCostTicks: 0,
                    busyUntilTick: actorState.busyUntilTick,
                    error: err,
                    timestampMs,
                },
                movBit: {
                    idx: 'actor-still-busy',
                    val: -1,
                    src: '[ACTOR_STILL_BUSY]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 3. Invariant Check: Single-Step Step Gating (distance must be exactly 1)
    let dist = 0
    try {
        dist = axialDistance(fromCoord, toCoord)
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                movBit: {
                    idx: 'execute-movement-fail',
                    val: -1,
                    dat: { error: err.message || String(err) },
                },
            })
        }
        return cpy
    }

    if (dist !== 1) {
        const err = `[EXCESSIVE_STEP_DISTANCE] Step distance ${dist} hexes exceeds single-step locomotion limit (d = 1).`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                movementReceipt: {
                    permitted: false,
                    actorId,
                    locationId,
                    fromCoord,
                    toCoord,
                    distance: dist,
                    traversalCostTicks: 0,
                    busyUntilTick: actorState.busyUntilTick,
                    error: err,
                    timestampMs,
                },
                movBit: {
                    idx: 'excessive-step-distance',
                    val: -1,
                    src: '[EXCESSIVE_STEP_DISTANCE]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 4. Invariant Check: Destination Cell Occupancy
    const destKey = cellKey(locationId, toCoord)
    const existingOccupant = cpy.occupiedCells.get(destKey)
    if (existingOccupant && existingOccupant !== actorId) {
        const err = `[CELL_OCCUPIED] Cell (${toCoord.q}, ${toCoord.r}) in '${locationId}' is already occupied by '${existingOccupant}'.`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                movementReceipt: {
                    permitted: false,
                    actorId,
                    locationId,
                    fromCoord,
                    toCoord,
                    distance: dist,
                    traversalCostTicks: 0,
                    busyUntilTick: actorState.busyUntilTick,
                    error: err,
                    timestampMs,
                },
                movBit: {
                    idx: 'cell-occupied',
                    val: -1,
                    src: '[CELL_OCCUPIED]',
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 5. Calculate Traversal Cost & Busy Scheduling
    const costTicks = calculateTerrainCost(terrain, tier)
    const busyUntil = currentTick + costTicks

    // Update state
    const oldKey = cellKey(locationId, fromCoord)
    cpy.occupiedCells.delete(oldKey)
    cpy.occupiedCells.set(destKey, actorId)

    const updatedState: ActorMovementState = {
        actorId,
        locationId,
        coord: toCoord,
        locomotionTier: tier,
        busyUntilTick: busyUntil,
        updatedAtMs: timestampMs,
    }
    cpy.actorPositions.set(actorId, updatedState)

    // Synchronize coordinates in 02.database.unit and emit event in 05.event.unit
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'entities_live',
                        action: 'UPDATE',
                        key: actorId,
                        record: {
                            q: toCoord.q,
                            r: toCoord.r,
                            updated_at_ms: timestampMs,
                        },
                    },
                ],
            },
        })

        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: `evt_moved_${actorId}_${currentTick}`,
                    eventType: 'ACTOR_MOVED',
                    actorId,
                    tick: currentTick,
                    payload: {
                        fromCoord,
                        toCoord,
                        distance: dist,
                        terrainType: terrain,
                        traversalCostTicks: costTicks,
                        busyUntilTick: busyUntil,
                    },
                },
            },
        })
    }

    const receipt: MovementReceipt = {
        permitted: true,
        actorId,
        locationId,
        fromCoord,
        toCoord,
        distance: dist,
        traversalCostTicks: costTicks,
        busyUntilTick: busyUntil,
        timestampMs,
    }

    await emitConsole(
        ste,
        `>> [MOVEMENT:STEP] [OK] [${actorId}] Step: (${fromCoord.q}, ${fromCoord.r}) -> (${toCoord.q}, ${toCoord.r}) | Cost: ${costTicks} ticks | Busy until: ${busyUntil}`,
    )

    if (bal.slv) {
        bal.slv({
            movementReceipt: receipt,
            movBit: {
                idx: 'execute-movement-pass',
                val: costTicks,
                dat: { movementReceipt: receipt, actorState: updatedState },
            },
        })
    }

    return cpy
}

export const getActorPositionAction = (
    cpy: MovementModel,
    bal: MovementBit,
    _ste?: State,
): MovementModel => {
    const actorId = bal.dat?.actorId || bal.src
    const state = actorId ? cpy.actorPositions.get(actorId) : undefined

    if (bal.slv) {
        bal.slv({
            actorState: state,
            movBit: {
                idx: state ? 'get-position-pass' : 'get-position-not-found',
                val: state ? 1 : 0,
                dat: { actorState: state },
            },
        })
    }
    return cpy
}

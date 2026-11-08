import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MovementModel } from './movement.model.js'
import {
    initMovement,
    setActorPositionAction,
    assertInteractionRangeAction,
    executeMovementAction,
    axialDistance,
    calculateTerrainCost,
} from './buz/movement.buzz.js'
import { EXECUTE_MOVEMENT } from './movement.action.js'
import { reducer } from './movement.reduce.js'

describe('11.movement.unit - Axial Locomotion Gating & Hex Battery', () => {
    let model: MovementModel

    beforeEach(async () => {
        model = new MovementModel()
        await initMovement(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('calculates exact Manhattan axial distance on integer hex lattice', () => {
        // Same cell
        expect(axialDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
        // Immediate neighbors (distance = 1)
        expect(axialDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1)
        expect(axialDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1)
        expect(axialDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1)
        expect(axialDistance({ q: 0, r: 0 }, { q: -1, r: 0 })).toBe(1)
        expect(axialDistance({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(1)
        expect(axialDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1)

        // Diagonal / multi-step (distance = 2)
        expect(axialDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2)
        expect(axialDistance({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(2)
    })

    it('rejects floating-point coordinates with FLOAT_PROHIBITED', () => {
        expect(() => axialDistance({ q: 0.5, r: 0 }, { q: 1, r: 0 })).toThrow(
            /FLOAT_PROHIBITED/,
        )
    })

    it('asserts interaction range: passes for d <= 1, fails for d > 1', async () => {
        const slvPass = vi.fn()
        await assertInteractionRangeAction(
            model,
            {
                idx: 'range-1',
                dat: { fromCoord: { q: 0, r: 0 }, toCoord: { q: 1, r: 0 } },
                slv: slvPass,
            },
            {} as any,
        )
        expect(slvPass).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: 1,
                    idx: 'assert-interaction-pass',
                }),
                distanceAudit: expect.objectContaining({
                    permittedForInteraction: true,
                    distance: 1,
                }),
            }),
        )

        const slvFail = vi.fn()
        await assertInteractionRangeAction(
            model,
            {
                idx: 'range-2',
                dat: { fromCoord: { q: 0, r: 0 }, toCoord: { q: 2, r: 0 } },
                slv: slvFail,
            },
            {} as any,
        )
        expect(slvFail).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: -1,
                    idx: 'out-of-interaction-range',
                }),
                distanceAudit: expect.objectContaining({
                    permittedForInteraction: false,
                    distance: 2,
                }),
            }),
        )
    })

    it('blocks IMMOBILIZED actors from moving with [IMMOBILIZED_ACTOR_BLOCKED]', async () => {
        await setActorPositionAction(
            model,
            {
                idx: 'set-pos',
                dat: {
                    actorId: 'char_wart',
                    locationId: 'loc_the_warm_pipe',
                    coord: { q: 0, r: 0 },
                    locomotionTier: 'IMMOBILIZED',
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await executeMovementAction(
            model,
            {
                idx: 'move-attempt',
                dat: {
                    movementRequest: {
                        actorId: 'char_wart',
                        locationId: 'loc_the_warm_pipe',
                        fromCoord: { q: 0, r: 0 },
                        toCoord: { q: 1, r: 0 },
                        currentTick: 1,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: -1,
                    idx: 'immobilized-actor-blocked',
                    src: '[IMMOBILIZED_ACTOR_BLOCKED]',
                }),
                movementReceipt: expect.objectContaining({ permitted: false }),
            }),
        )
    })

    it('rejects steps exceeding 1 hex cell with [EXCESSIVE_STEP_DISTANCE]', async () => {
        await setActorPositionAction(
            model,
            {
                idx: 'set-pos',
                dat: {
                    actorId: 'char_bog',
                    locationId: 'loc_the_warm_pipe',
                    coord: { q: 0, r: 0 },
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await executeMovementAction(
            model,
            {
                idx: 'jump-attempt',
                dat: {
                    movementRequest: {
                        actorId: 'char_bog',
                        locationId: 'loc_the_warm_pipe',
                        fromCoord: { q: 0, r: 0 },
                        toCoord: { q: 3, r: 0 }, // Distance 3
                        currentTick: 1,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: -1,
                    idx: 'excessive-step-distance',
                    src: '[EXCESSIVE_STEP_DISTANCE]',
                }),
            }),
        )
    })

    it('blocks movement into an already occupied cell with [CELL_OCCUPIED]', async () => {
        await setActorPositionAction(
            model,
            {
                idx: 'set-wart',
                dat: {
                    actorId: 'char_wart',
                    locationId: 'loc_the_warm_pipe',
                    coord: { q: 1, r: 0 },
                },
            },
            {} as any,
        )
        await setActorPositionAction(
            model,
            {
                idx: 'set-bog',
                dat: {
                    actorId: 'char_bog',
                    locationId: 'loc_the_warm_pipe',
                    coord: { q: 0, r: 0 },
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await executeMovementAction(
            model,
            {
                idx: 'collide-attempt',
                dat: {
                    movementRequest: {
                        actorId: 'char_bog',
                        locationId: 'loc_the_warm_pipe',
                        fromCoord: { q: 0, r: 0 },
                        toCoord: { q: 1, r: 0 }, // Cell occupied by char_wart
                        currentTick: 1,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: -1,
                    idx: 'cell-occupied',
                    src: '[CELL_OCCUPIED]',
                }),
            }),
        )
    })

    it('enforces busy tick scheduling and doubles cost for LIMPING actors', async () => {
        expect(calculateTerrainCost('RUBBLE', 'UNRESTRICTED')).toBe(2)
        expect(calculateTerrainCost('RUBBLE', 'LIMPING')).toBe(4) // Doubled for LIMPING

        await setActorPositionAction(
            model,
            {
                idx: 'set-bog',
                dat: {
                    actorId: 'char_bog',
                    locationId: 'loc_the_warm_pipe',
                    coord: { q: 0, r: 0 },
                    locomotionTier: 'LIMPING',
                },
            },
            {} as any,
        )

        // Move across rubble (Cost = 4 ticks, busy until tick 1 + 4 = 5)
        const slvMove = vi.fn()
        await executeMovementAction(
            model,
            {
                idx: 'move-rubble',
                dat: {
                    movementRequest: {
                        actorId: 'char_bog',
                        locationId: 'loc_the_warm_pipe',
                        fromCoord: { q: 0, r: 0 },
                        toCoord: { q: 0, r: 1 },
                        terrainType: 'RUBBLE',
                        currentTick: 1,
                        timestampMs: 1700000000000,
                    },
                },
                slv: slvMove,
            },
            {} as any,
        )

        expect(slvMove).toHaveBeenCalledWith(
            expect.objectContaining({
                movementReceipt: expect.objectContaining({
                    permitted: true,
                    traversalCostTicks: 4,
                    busyUntilTick: 5,
                }),
            }),
        )

        // Attempting to move again at tick 3 while busyUntilTick is 5 should be blocked
        const slvBusy = vi.fn()
        await executeMovementAction(
            model,
            {
                idx: 'move-while-busy',
                dat: {
                    movementRequest: {
                        actorId: 'char_bog',
                        locationId: 'loc_the_warm_pipe',
                        fromCoord: { q: 0, r: 1 },
                        toCoord: { q: 0, r: 2 },
                        currentTick: 3,
                        timestampMs: 1700000000000,
                    },
                },
                slv: slvBusy,
            },
            {} as any,
        )

        expect(slvBusy).toHaveBeenCalledWith(
            expect.objectContaining({
                movBit: expect.objectContaining({
                    val: -1,
                    idx: 'actor-still-busy',
                    src: '[ACTOR_STILL_BUSY]',
                }),
            }),
        )
    })

    it('routes EXECUTE_MOVEMENT cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: EXECUTE_MOVEMENT,
                bale: {
                    idx: 'reducer-test',
                    dat: {
                        movementRequest: {
                            actorId: 'char_bog',
                            locationId: 'loc_the_warm_pipe',
                            fromCoord: { q: 0, r: 0 },
                            toCoord: { q: 1, r: 0 },
                            currentTick: 10,
                            timestampMs: 1700000000000,
                        },
                    },
                    slv,
                } as any,
            },
            { hunt: async () => ({}) } as any,
        )) as MovementModel

        expect(result).toBeInstanceOf(MovementModel)
        expect(slv).toHaveBeenCalled()
    })
})

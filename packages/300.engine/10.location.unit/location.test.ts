import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LocationModel, BASELINE_TOPOLOGY_LOCATIONS } from './location.model.js'
import {
    initLocation,
    setPortalLockAction,
    checkPortalCrossingAction,
    traverseLocationAction,
    auditTopologyAction,
    auditTopologySymmetry,
    validateLocationAdjacency,
} from './buz/location.buzz.js'
import { TRAVERSE_LOCATION } from './location.action.js'
import { reducer } from './location.reduce.js'
import type { SpatialNodeDescriptor } from './fce/location.interface.js'

describe('10.location.unit - Spatial Topology Routing & Portal Mesh Battery', () => {
    let model: LocationModel

    beforeEach(async () => {
        model = new LocationModel()
        await initLocation(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes default crawlspace topology and confirms bidirectional reciprocity', () => {
        expect(model.locations.size).toBe(4)
        expect(model.locations.has('loc_the_warm_pipe')).toBe(true)

        const report = auditTopologySymmetry(model.locations, model.originHubId)
        expect(report.valid).toBe(true)
        expect(report.isReciprocal).toBe(true)
        expect(report.isReachable).toBe(true)
        expect(report.asymmetricTraps).toHaveLength(0)
    })

    it('flags [ASYMMETRIC_PORTAL_TRAP] when a location lacks a reciprocal return link', () => {
        const flawedNodes = new Map<string, SpatialNodeDescriptor>([
            [
                'room_a',
                {
                    locationId: 'room_a',
                    displayName: 'Room A',
                    adjacentLocations: ['room_b'],
                    acousticDampingBps: 1000,
                    lightingLevel: 'INCANDESCENT',
                    maxOccupants: 2,
                    isCramped: false,
                },
            ],
            [
                'room_b',
                {
                    locationId: 'room_b',
                    displayName: 'Room B',
                    adjacentLocations: [], // Missing reciprocal return link to room_a
                    acousticDampingBps: 1000,
                    lightingLevel: 'INCANDESCENT',
                    maxOccupants: 2,
                    isCramped: false,
                },
            ],
        ])

        const report = auditTopologySymmetry(flawedNodes, 'room_a')
        expect(report.valid).toBe(false)
        expect(report.isReciprocal).toBe(false)
        expect(report.asymmetricTraps.length).toBeGreaterThan(0)
        expect(report.asymmetricTraps[0]).toContain('Missing return room_b -> room_a')
    })

    it('flags [ORPHAN_ISLAND_DETECTED] when disconnected subgraphs exist', () => {
        const disconnectedNodes = new Map<string, SpatialNodeDescriptor>([
            [
                'loc_the_warm_pipe',
                {
                    locationId: 'loc_the_warm_pipe',
                    displayName: 'Origin Hub',
                    adjacentLocations: [],
                    acousticDampingBps: 1000,
                    lightingLevel: 'INCANDESCENT',
                    maxOccupants: 2,
                    isCramped: false,
                },
            ],
            [
                'island_bunker',
                {
                    locationId: 'island_bunker',
                    displayName: 'Unreachable Island Bunker',
                    adjacentLocations: [],
                    acousticDampingBps: 1000,
                    lightingLevel: 'INCANDESCENT',
                    maxOccupants: 2,
                    isCramped: false,
                },
            ],
        ])

        const report = auditTopologySymmetry(disconnectedNodes, 'loc_the_warm_pipe')
        expect(report.valid).toBe(false)
        expect(report.isReachable).toBe(false)
        expect(report.orphanIslands).toContain('island_bunker')
    })

    it('rejects non-adjacent spatial teleportation with [PHYSICALLY_IMPOSSIBLE] at T_0 = $0.00', async () => {
        // loc_siphon_chamber is not adjacent to loc_drainage_pantry
        const slv = vi.fn()
        await checkPortalCrossingAction(
            model,
            {
                idx: 'check-impossible',
                dat: {
                    traversalRequest: {
                        actorId: 'char_bog',
                        fromLocationId: 'loc_siphon_chamber',
                        toLocationId: 'loc_drainage_pantry',
                        tick: 1,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                locBit: expect.objectContaining({
                    val: -1,
                    idx: 'physically-impossible',
                    src: '[PHYSICALLY_IMPOSSIBLE]',
                }),
                traversalReceipt: expect.objectContaining({
                    permitted: false,
                    error: expect.stringContaining('PHYSICALLY_IMPOSSIBLE'),
                }),
            }),
        )
    })

    it('blocks portal traversal with [SPATIAL_UNAVAILABLE] when portal is locked', async () => {
        // Lock portal between pipe and culvert
        await setPortalLockAction(
            model,
            {
                idx: 'lock-portal',
                dat: { portalId: 'loc_culvert_junction#loc_the_warm_pipe', portalStatus: 'LOCKED' },
            },
            {} as any,
        )

        const slv = vi.fn()
        await checkPortalCrossingAction(
            model,
            {
                idx: 'check-locked',
                dat: {
                    traversalRequest: {
                        actorId: 'char_wart',
                        fromLocationId: 'loc_the_warm_pipe',
                        toLocationId: 'loc_culvert_junction',
                        tick: 2,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                locBit: expect.objectContaining({
                    val: -1,
                    idx: 'spatial-unavailable',
                    src: '[SPATIAL_UNAVAILABLE]',
                }),
                traversalReceipt: expect.objectContaining({
                    permitted: false,
                    error: expect.stringContaining('SPATIAL_UNAVAILABLE'),
                }),
            }),
        )
    })

    it('blocks traversal when destination room reaches maxOccupants ceiling', async () => {
        // loc_siphon_chamber has maxOccupants: 2
        model.occupants.get('loc_siphon_chamber')!.add('occupant_1')
        model.occupants.get('loc_siphon_chamber')!.add('occupant_2')

        const slv = vi.fn()
        await checkPortalCrossingAction(
            model,
            {
                idx: 'check-crowded',
                dat: {
                    traversalRequest: {
                        actorId: 'char_intruder',
                        fromLocationId: 'loc_culvert_junction',
                        toLocationId: 'loc_siphon_chamber',
                        tick: 3,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                locBit: expect.objectContaining({
                    val: -1,
                    idx: 'capacity-exceeded',
                    src: '[CAPACITY_EXCEEDED]',
                }),
            }),
        )
    })

    it('executes atomic character relocation and dispatches events across units', async () => {
        const eventsAppended: string[] = []
        const mockState: any = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType === '[Event action] Append Event') {
                    eventsAppended.push(payload.dat.appendParams.eventType)
                }
                return { eventBit: { val: 1 }, databaseBit: { val: 1 } }
            }),
        }

        const slv = vi.fn()
        await traverseLocationAction(
            model,
            {
                idx: 'traverse',
                dat: {
                    traversalRequest: {
                        actorId: 'char_bog',
                        fromLocationId: 'loc_the_warm_pipe',
                        toLocationId: 'loc_culvert_junction',
                        tick: 5,
                        timestampMs: 1700000000000,
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                locBit: expect.objectContaining({ val: 1, idx: 'traverse-location-pass' }),
                traversalReceipt: expect.objectContaining({ permitted: true }),
            }),
        )

        expect(eventsAppended).toContain('ACTOR_LEFT_LOCATION')
        expect(eventsAppended).toContain('ACTOR_ENTERED_LOCATION')
        expect(model.occupants.get('loc_the_warm_pipe')!.has('char_bog')).toBe(false)
        expect(model.occupants.get('loc_culvert_junction')!.has('char_bog')).toBe(true)
    })

    it('routes TRAVERSE_LOCATION cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: TRAVERSE_LOCATION,
                bale: {
                    idx: 'traverse-reducer',
                    dat: {
                        traversalRequest: {
                            actorId: 'char_wart',
                            fromLocationId: 'loc_the_warm_pipe',
                            toLocationId: 'loc_drainage_pantry',
                            tick: 1,
                            timestampMs: 1700000000000,
                        },
                    },
                    slv,
                } as any,
            },
            { hunt: async () => ({}) } as any,
        )) as LocationModel

        expect(result).toBeInstanceOf(LocationModel)
        expect(slv).toHaveBeenCalled()
    })
})

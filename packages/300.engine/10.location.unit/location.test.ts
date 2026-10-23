import { describe, it, expect, vi } from 'vitest'
import {
    registerLocation,
    setPortalStateLocation,
    validateCapacityLocation,
} from './buz/location.buzz'
import { LocationModel } from './location.model'

describe('10.location.unit - Topological Site Registry & Capacity Gate', () => {
    it('registers location and verifies portal state mutations', () => {
        const model = new LocationModel()
        registerLocation(
            model,
            {
                idx: 'reg-loc',
                dat: {
                    locationId: 'loc_the_warm_pipe',
                    name: 'The Warm Pipe',
                    maxOccupancy: 2,
                    portals: { hatch_valve_04: 'CLOSED' },
                    occupants: ['char_bog'],
                },
            },
            {} as any,
        )

        expect(model.locations['loc_the_warm_pipe']).toBeDefined()
        expect(
            model.locations['loc_the_warm_pipe'].portals.hatch_valve_04,
        ).toBe('CLOSED')

        setPortalStateLocation(
            model,
            {
                idx: 'set-portal',
                dat: {
                    locationId: 'loc_the_warm_pipe',
                    targetPortalId: 'hatch_valve_04',
                    state: 'LOCKED',
                },
            },
            {} as any,
        )

        expect(
            model.locations['loc_the_warm_pipe'].portals.hatch_valve_04,
        ).toBe('LOCKED')
    })

    it('permits entrance when capacity is available and aborts when saturated', async () => {
        const model = new LocationModel()
        const mockState = { hunt: vi.fn().mockResolvedValue({}) } as any

        registerLocation(
            model,
            {
                idx: 'reg',
                dat: {
                    locationId: 'loc_warm_pipe',
                    maxOccupancy: 2,
                    occupants: ['char_bog'],
                },
            },
            mockState,
        )

        let receipt1: any
        await validateCapacityLocation(
            model,
            {
                idx: 'val-1',
                dat: {
                    locationId: 'loc_warm_pipe',
                    incomingEntityId: 'char_wart',
                },
                slv: (r) => {
                    receipt1 = r.locBit.dat
                },
            },
            mockState,
        )
        expect(receipt1.allowed).toBe(true)

        // Simulate Wart entered
        model.locations['loc_warm_pipe'].occupants.push('char_wart')

        let receipt2: any
        await validateCapacityLocation(
            model,
            {
                idx: 'val-2',
                dat: {
                    locationId: 'loc_warm_pipe',
                    incomingEntityId: 'char_spleen',
                },
                slv: (r) => {
                    receipt2 = r.locBit.dat
                },
            },
            mockState,
        )
        expect(receipt2.allowed).toBe(false)
        expect(receipt2.error).toContain('[ROOM_CAPACITY_EXCEEDED]')
        expect(mockState.hunt).toHaveBeenCalledWith(
            '[Console action] Update Console',
            expect.objectContaining({
                idx: 'cns00',
                src: expect.stringContaining('[ROOM_CAPACITY_EXCEEDED]'),
            }),
        )
    })
})

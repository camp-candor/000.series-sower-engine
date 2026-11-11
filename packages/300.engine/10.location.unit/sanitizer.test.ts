import { describe, it, expect } from 'vitest'
import { packAxial, unpackAxial } from './buz/axial-pack.buzz.js'
import {
    sanitizePathQuery,
    sanitizePerceptionQuery,
} from './buz/sanitizer.buzz.js'
import { buildSpatialOverlaySnapshot } from './buz/overlay-builder.buzz.js'
import type { PortalRecord } from './fce/location.interface.js'

describe('10.location.unit - Outbound Epistemic Sanitizer & Coordinate Packing Battery', () => {
    it('encodes and decodes axial integer coordinates with zero error', () => {
        const coords = [
            { q: 0, r: 0 },
            { q: 12, r: -4 },
            { q: -55, r: 23 },
            { q: 32000, r: -32000 },
        ]

        for (const c of coords) {
            const packed = packAxial(c.q, c.r)
            expect(Number.isInteger(packed)).toBe(true)
            expect(packed).toBeGreaterThanOrEqual(0)

            const unpacked = unpackAxial(packed)
            expect(unpacked.q).toBe(c.q)
            expect(unpacked.r).toBe(c.r)
            expect(unpacked.q + unpacked.r + unpacked.s).toBe(0) // Cubic zero-sum invariant
        }
    })

    it('rejects non-integer coordinates according to Gillian Arithmetic', () => {
        expect(() => packAxial(1.5, 0)).toThrow('discrete integers')
        expect(() => packAxial(0, 3.14159)).toThrow('discrete integers')
    })

    it('sanitizes valid path queries into scrubbed DTO with deterministic SHA-256 hash', () => {
        const raw = {
            qOrigin: 5,
            rOrigin: -2,
            qDest: 8,
            rDest: -5,
            budget: 450,
            workLimit: 256,
            extraneousMeta: 'should_be_stripped',
        }

        const result = sanitizePathQuery(raw)
        expect(result.ok).toBe(true)
        expect(result.scrubbedPayload).toBeDefined()
        expect(result.scrubbedPayload?.maxBudgetCostUnits).toBe(450)
        expect(result.scrubbedPayload?.workEnvelopeLimit).toBe(256)
        expect(result.queryHash).toMatch(/^[0-9a-f]{64}$/)
        expect(result.strippedKeys).toContain('extraneousMeta')
    })

    it('fails closed when forbidden narrative tokens cross the boundary', () => {
        const dirtyQuery = {
            qOrigin: 0,
            rOrigin: 0,
            qDest: 2,
            rDest: -2,
            char_actor_id: 'char_bog',
            dialogue_line: 'We must cross before dawn',
        }

        const result = sanitizePathQuery(dirtyQuery)
        expect(result.ok).toBe(false)
        expect(result.error).toContain('EPISTEMIC_FIREWALL_BREACH')
        expect(result.error).toContain('char_bog')
    })

    it('sanitizes perception queries and validates mandatory inputs', () => {
        const raw = {
            qSource: 1,
            rSource: 1,
            qObserver: 4,
            rObserver: -2,
            energyCdB: 6500,
        }

        const result = sanitizePerceptionQuery(raw)
        expect(result.ok).toBe(true)
        expect(result.scrubbedPayload?.emissionEnergyCdB).toBe(6500)
        expect(result.queryHash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('builds deep-frozen spatial overlay snapshot with deterministic hash', () => {
        const portals = new Map<string, PortalRecord>()
        portals.set('door_a->door_b', {
            portalId: 'door_a->door_b',
            fromLocationId: 'loc_a',
            toLocationId: 'loc_b',
            status: 'LOCKED',
        })
        portals.set('vent_a->vent_b', {
            portalId: 'vent_a->vent_b',
            fromLocationId: 'loc_a',
            toLocationId: 'loc_vent',
            status: 'UNLOCKED',
        })

        const packedObstacle = packAxial(1, -1)
        const snapshot = buildSpatialOverlaySnapshot(portals, [packedObstacle])

        expect(snapshot.overlayHash).toMatch(/^[0-9a-f]{64}$/)
        expect(snapshot.closedPortals).toEqual(['door_a->door_b'])
        expect(snapshot.impassableCells).toEqual([packedObstacle])
        expect(Object.isFrozen(snapshot)).toBe(true)
    })
})

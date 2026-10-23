import { describe, it, expect } from 'vitest'
import {
    recursiveDeepFreeze,
    canonicalizeStateJson,
    computeWorkingStateHash,
} from './buz/state.buzz'
import type { CompositeEntityLiveRecord } from './fce/state.interface'

describe('16.state.unit - State Snapshot & Merkle Digest Suite', () => {
    it('should deeply freeze arbitrary state hierarchies and block mutation', () => {
        const candidate: any = {
            series: 'under-the-floorboards',
            nested: {
                fatigue: 4000,
                tags: ['HUNGRY', 'LIMPING'],
            },
        }

        const frozen = recursiveDeepFreeze(candidate)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(frozen.nested)).toBe(true)
        expect(Object.isFrozen(frozen.nested.tags)).toBe(true)

        expect(() => {
            candidate.nested.fatigue = 9999
        }).toThrow()
    })

    it('should produce identical RFC 8785 canonical JSON regardless of object key order', () => {
        const objA = { z: 1, a: 2, m: { y: 10, b: 20 } }
        const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 }

        const jsonA = canonicalizeStateJson(objA)
        const jsonB = canonicalizeStateJson(objB)

        expect(jsonA).toBe(jsonB)
        expect(jsonA).toBe('{"a":2,"m":{"b":20,"y":10},"z":1}')
    })

    it('should compute deterministic 64-hex SHA-256 state hashes', () => {
        const dummyEntity: CompositeEntityLiveRecord = {
            entity_id: 'char_bog',
            location_id: 'loc_warm_pipe',
            q: 10,
            r: 2,
            arms_available: 2,
            legs_available: 2,
            locomotion_tier: 'UNRESTRICTED',
            concussion_level: 0,
            fatigue_bps: 2000,
            pain_bps: 0,
            refusal_strain_bps: 0,
            open_wounds: [],
            banned_kinetic_verbs: [],
            held_items: ['item_knife'],
            worn_gear: {},
            slung_items: [],
            cached_items: [],
            updated_at_ms: 1000,
        }

        const hash1 = computeWorkingStateHash({
            entities: { char_bog: dummyEntity },
            strings: {},
            grievances: {},
            clocks: {},
            beliefs: {},
            unratifiedDetails: {},
        })

        const hash2 = computeWorkingStateHash({
            entities: { char_bog: { ...dummyEntity } },
            strings: {},
            grievances: {},
            clocks: {},
            beliefs: {},
            unratifiedDetails: {},
        })

        expect(hash1).toMatch(/^[0-9a-f]{64}$/)
        expect(hash1).toBe(hash2)
    })
})

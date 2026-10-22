import { describe, it, expect, beforeEach } from 'vitest'
import { EnvelopeModel, GENESIS_HASH_64 } from './envelope.model'
import {
    initEnvelope,
    canonicalizeJson,
    sha256Hex,
    computeChainedEventHash,
    computeStateHash,
    sealEventEnvelopeAction,
    verifyChainEnvelopeAction,
    isValidSpatialProof,
} from './envelope.buzzer'
import type { EventEnvelope, SpatialProof } from './fce/envelope.interface'

describe('04.envelope.unit - RFC 8785 Canonical JCS & Hash Chain Sealer', () => {
    let model: EnvelopeModel
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new EnvelopeModel()
        await initEnvelope(model, { idx: 'test-init' }, mockState)
    })

    const validProof: SpatialProof = {
        topologyHash: '1'.repeat(64),
        overlayHash: '2'.repeat(64),
        queryHash: '3'.repeat(64),
        receiptHash: '4'.repeat(64),
    }

    it('sorts keys lexicographically by UTF-16 code units regardless of insertion order', () => {
        const objA = { z: 1, a: 2, m: { b: 3, a: 4 } }
        const objB = { a: 2, m: { a: 4, b: 3 }, z: 1 }

        const canonicalA = canonicalizeJson(objA)
        const canonicalB = canonicalizeJson(objB)

        expect(canonicalA).toBe('{"a":2,"m":{"a":4,"b":3},"z":1}')
        expect(canonicalA).toBe(canonicalB)
        expect(sha256Hex(canonicalA)).toBe(sha256Hex(canonicalB))
    })

    it('normalizes string literals to Unicode Normalization Form C (NFC)', () => {
        // e + acute accent combining mark (NFD) vs precomposed e with acute (NFC)
        const nfdString = 'e\u0301'
        const nfcString = '\u00e9'

        expect(nfdString).not.toBe(nfcString)
        expect(canonicalizeJson(nfdString)).toBe(canonicalizeJson(nfcString))
    })

    it('rejects non-finite IEEE 754 numbers with TypeError', () => {
        expect(() => canonicalizeJson({ val: NaN })).toThrow(
            /Non-finite numbers/,
        )
        expect(() => canonicalizeJson({ val: Infinity })).toThrow(
            /Non-finite numbers/,
        )
    })

    it('validates Spatial Audit Quadruple structure', () => {
        expect(isValidSpatialProof(validProof)).toBe(true)

        const invalidProof: SpatialProof = {
            ...validProof,
            receiptHash: 'not-a-64-hex-hash',
        }
        expect(isValidSpatialProof(invalidProof)).toBe(false)
    })

    it('seals an event envelope with recursive SHA-256 hash chaining', async () => {
        let sealedEvent: EventEnvelope | undefined

        await sealEventEnvelopeAction(
            model,
            {
                idx: 'test-seal',
                dat: {
                    eventId: 'evt_001',
                    streamId: 'main',
                    sequenceId: 1,
                    tick: 0,
                    eventType: 'SIMULATION_TICK_COMMITTED',
                    schemaVersion: 1,
                    seed: 'seed_01',
                    payload: { initial: true },
                    spatialProof: validProof,
                    prevEventHash: GENESIS_HASH_64,
                    stateHash: 'a'.repeat(64),
                    timestampMs: 1700000000000,
                },
                slv: (res) => {
                    sealedEvent = res.envelope
                },
            },
            mockState,
        )

        expect(sealedEvent).toBeDefined()
        expect(sealedEvent!.prevEventHash).toBe(GENESIS_HASH_64)
        expect(sealedEvent!.eventHash).toMatch(/^[a-f0-9]{64}$/)
        expect(model.lastSealedHash).toBe(sealedEvent!.eventHash)
        expect(model.totalSealedCount).toBe(1)
    })

    it('verifies an unbroken, tamper-evident hash chain across multiple events', async () => {
        // 1. Create Event 1
        const raw1: Partial<EventEnvelope> = {
            eventId: 'evt_001',
            streamId: 'main',
            sequenceId: 1,
            tick: 0,
            eventType: 'SIMULATION_TICK_COMMITTED',
            schemaVersion: 1,
            seed: 'seed_01',
            payload: { tick: 0 },
            spatialProof: validProof,
            prevEventHash: GENESIS_HASH_64,
            stateHash: 'a'.repeat(64),
            timestampMs: 1000,
        }
        const hash1 = computeChainedEventHash(GENESIS_HASH_64, raw1)
        const event1: EventEnvelope = {
            ...raw1,
            eventHash: hash1,
        } as EventEnvelope

        // 2. Create Event 2 chained to Event 1
        const raw2: Partial<EventEnvelope> = {
            eventId: 'evt_002',
            streamId: 'main',
            sequenceId: 2,
            tick: 1,
            eventType: 'SOMATIC_TRAUMA_APPLIED',
            schemaVersion: 1,
            seed: 'seed_02',
            payload: { actorId: 'char_bog', painBps: 2500 },
            spatialProof: validProof,
            prevEventHash: hash1,
            stateHash: 'b'.repeat(64),
            timestampMs: 2000,
        }
        const hash2 = computeChainedEventHash(hash1, raw2)
        const event2: EventEnvelope = {
            ...raw2,
            eventHash: hash2,
        } as EventEnvelope

        // Verify valid chain
        let validReport: any
        await verifyChainEnvelopeAction(
            model,
            {
                idx: 'test-verify-clean',
                lst: [event1, event2],
                slv: (res) => {
                    validReport = res.report
                },
            },
            mockState,
        )

        expect(validReport.valid).toBe(true)
        expect(validReport.totalEvents).toBe(2)
        expect(validReport.headHash).toBe(hash2)

        // Adversarial: Tamper with Event 1 payload
        const tamperedEvent1: EventEnvelope = {
            ...event1,
            payload: { tick: 999 }, // Modified!
        }

        let tamperReport: any
        await verifyChainEnvelopeAction(
            model,
            {
                idx: 'test-verify-tamper',
                lst: [tamperedEvent1, event2],
                slv: (res) => {
                    tamperReport = res.report
                },
            },
            mockState,
        )

        expect(tamperReport.valid).toBe(false)
        expect(tamperReport.failedIndex).toBe(0)
        expect(tamperReport.error).toContain('HASH_TAMPER_DETECTED')
    })

    it('computes composite state hash deterministically', () => {
        const stateA = {
            entities: { bog: { hp: 10 } },
            clocks: { paranoia: 500 },
        }
        const stateB = {
            clocks: { paranoia: 500 },
            entities: { bog: { hp: 10 } },
        }

        const hashA = computeStateHash(stateA)
        const hashB = computeStateHash(stateB)

        expect(hashA).toMatch(/^[a-f0-9]{64}$/)
        expect(hashA).toBe(hashB)
    })
})

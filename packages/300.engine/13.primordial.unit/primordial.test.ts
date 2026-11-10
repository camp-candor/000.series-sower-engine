import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrimordialModel } from './primordial.model.js'
import {
    seedPrimordialAction,
    computeManifestHRoot,
} from './buz/primordial.buzz.js'
import { GENESIS_HASH_64 } from '../04.envelope.unit/envelope.buzzer.js'
import * as ActSeq from '../14.sequence.unit/sequence.action.js'

describe('13.primordial.unit :: Genesis State Minting (Phase 6)', () => {
    let model: PrimordialModel

    const sampleBibleState = Object.freeze({
        seriesSlug: 'wiregrass-basin',
        schemaVersion: '1.0.0',
        merkleRootHex:
            '7f8a9c1e00000000000000000000000000000000000000000000000000000000',
        entities: {
            locations: {
                loc_warm_pipe: { q: 0, r: 0 },
            },
            characters: {
                char_bog: {
                    locationId: 'loc_warm_pipe',
                    q: 0,
                    r: 0,
                    armsAvailable: 2,
                    legsAvailable: 2,
                },
                char_wart: {
                    locationId: 'loc_warm_pipe',
                    q: 1,
                    r: 0,
                    armsAvailable: 1,
                    legsAvailable: 2,
                },
            },
            grievances: {
                grv_impasse: {
                    initiatorId: 'char_wart',
                    targetId: 'char_bog',
                    intensityBps: 3000,
                },
            },
            clocks: {
                clk_breach: {
                    valueBps: 2000,
                    thresholdBps: 8000,
                    decayRateBps: 50,
                },
            },
        },
    })

    beforeEach(() => {
        model = new PrimordialModel()
    })

    it('computes deterministic H_root from manifest Merkle hex or payload hash', () => {
        const hRoot = computeManifestHRoot(sampleBibleState)
        expect(hRoot).toBe(
            '7f8a9c1e00000000000000000000000000000000000000000000000000000000',
        )
    })

    it('seeds Genesis S_0, mints Sequence #1 into event_log, and commits sequence head', async () => {
        const executedOps: any[] = []
        let sequenceCommitted = false

        const mockHunt = vi
            .fn()
            .mockImplementation((action: string, bale: any) => {
                if (action.includes('Query Database')) {
                    return Promise.resolve({
                        databaseBit: { dat: { row: null, record: null } },
                    })
                }
                if (action.includes('Exec Database')) {
                    executedOps.push(...bale.dat.operations)
                    return Promise.resolve({ databaseBit: { val: 1 } })
                }
                if (action === ActSeq.COMMIT_SEQUENCE) {
                    sequenceCommitted = true
                    expect(bale.val).toBe(1)
                    expect(bale.dat.sequenceNumber).toBe(1)
                    return Promise.resolve({ committedSeq: 1 })
                }
                return Promise.resolve({})
            })

        const mockState: any = { hunt: mockHunt }

        let seedResult: any
        await seedPrimordialAction(
            model,
            {
                idx: 'seed-01',
                dat: {
                    seriesSlug: 'wiregrass-basin',
                    bibleState: sampleBibleState,
                    seededAtMs: 1700000000000,
                },
                slv: (res: any) => {
                    seedResult = res.result
                },
            },
            mockState,
        )

        expect(seedResult.seeded).toBe(true)
        expect(seedResult.entitiesCount).toBe(3) // 1 location + 2 characters
        expect(seedResult.grievancesCount).toBe(1)
        expect(seedResult.clocksCount).toBe(1)
        expect(sequenceCommitted).toBe(true)

        const eventOp = executedOps.find((op) => op.table === 'event_log')
        expect(eventOp).toBeDefined()
        expect(eventOp.record.sequence_number).toBe(1)
        expect(eventOp.record.event_id).toBe('evt_genesis_000')
        expect(eventOp.record.event_type).toBe('GENESIS_SEEDED')
        expect(eventOp.record.prev_hash).toBe(GENESIS_HASH_64)
        expect(eventOp.record.state_hash).toBe(sampleBibleState.merkleRootHex)
    })

    it('preserves existing records idempotently when Sequence #1 already exists in database', async () => {
        const mockHunt = vi.fn().mockImplementation((action: string) => {
            if (action.includes('Query Database')) {
                return Promise.resolve({
                    databaseBit: {
                        dat: {
                            row: {
                                sequence_number: 1,
                                event_id: 'evt_genesis_000',
                                state_hash: sampleBibleState.merkleRootHex,
                            },
                        },
                    },
                })
            }
            return Promise.resolve({})
        })

        const mockState: any = { hunt: mockHunt }

        let idempotentPass = false
        await seedPrimordialAction(
            model,
            {
                idx: 'seed-idempotent',
                dat: {
                    seriesSlug: 'wiregrass-basin',
                    bibleState: sampleBibleState,
                },
                slv: (res: any) => {
                    idempotentPass = res.prmBit?.dat?.seeded === true
                },
            },
            mockState,
        )

        expect(idempotentPass).toBe(true)
        expect(model.genesisSeeded).toBe(true)
    })

    it('reducer routes SEED_GENESIS identically to SEED_PRIMORDIAL and exports callable reducer', async () => {
        const { reducer } = await import('./primordial.reduce.js')
        const Act = await import('./primordial.action.js')

        expect(typeof reducer).toBe('function')
        expect(Act.SEED_GENESIS).toBe('[Primordial action] Seed Genesis')
        expect(new Act.SeedGenesis()).toBeDefined()
        expect(new Act.SeedPrimordial()).toBeDefined()

        const mockState: any = {
            hunt: vi.fn().mockResolvedValue({
                databaseBit: { dat: { row: { sequence_number: 1 } } },
            }),
        }

        let resolved = false
        const actInstance = new Act.SeedGenesis({
            idx: 'seed-genesis-test',
            dat: {
                seriesSlug: 'wiregrass-basin',
                bibleState: sampleBibleState,
            },
            slv: () => {
                resolved = true
            },
        } as any)

        const nextModel = await reducer(model, actInstance, mockState)
        expect(nextModel.genesisSeeded).toBe(true)
        expect(resolved).toBe(true)
    })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PrimordialModel, DEFAULT_PRIMORDIAL_BASELINE } from './primordial.model.js'
import {
    initPrimordial,
    computeBaselineHRoot,
    seedPrimordialAction,
    verifyGenesisPrimordialAction,
} from './primordial.buzzer.js'
import { SEED_PRIMORDIAL, COMPUTE_HROOT_PRIMORDIAL } from './primordial.action.js'
import { reducer } from './primordial.reduce.js'

describe('13.primordial.unit - Primordial Genesis Seeding Battery', () => {
    let model: PrimordialModel
    let memoryDatabase: Record<string, Map<string, any>>

    const createMockState = () => ({
        hunt: vi.fn(async (actionType: string, payload: any) => {
            if (actionType === '[Database action] QUERY_DATABASE' || actionType === '[Database action] Query Database') {
                const table = payload?.dat?.table
                const key = payload?.dat?.key
                if (key && memoryDatabase[table]) {
                    const record = memoryDatabase[table].get(key)
                    return { databaseBit: { val: record ? 1 : 0, dat: { record } } }
                }
                const count = memoryDatabase[table]?.size || 0
                return { databaseBit: { val: count } }
            }
            if (actionType === '[Database action] EXEC_BATCH_DATABASE' || actionType === '[Database action] Exec Batch Database') {
                for (const op of payload.dat.operations) {
                    if (!memoryDatabase[op.table]) {
                        memoryDatabase[op.table] = new Map()
                    }
                    memoryDatabase[op.table].set(op.key, op.record)
                }
                return { databaseBit: { val: payload.dat.operations.length } }
            }
            if (actionType === '[Sequence action] Commit Sequence') {
                return { committedSeq: 1 }
            }
            return {}
        }),
    })

    beforeEach(async () => {
        model = new PrimordialModel()
        memoryDatabase = {
            event_log: new Map(),
            entities_live: new Map(),
            strings_ledger: new Map(),
            grievance_status: new Map(),
            paranoia_clocks: new Map(),
        }
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('computes deterministic 64-hex H_root from primordial baseline', () => {
        const hash1 = computeBaselineHRoot(DEFAULT_PRIMORDIAL_BASELINE)
        const hash2 = computeBaselineHRoot({ ...DEFAULT_PRIMORDIAL_BASELINE })

        expect(hash1).toMatch(/^[a-f0-9]{64}$/)
        expect(hash1).toBe(hash2)
    })

    it('initializes PrimordialModel and sets computed H_root', async () => {
        const slv = vi.fn()
        await initPrimordial(model, { idx: 'init', slv }, {} as any)

        expect(model.hRoot).toMatch(/^[a-f0-9]{64}$/)
        expect(model.genesisSeeded).toBe(false)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                hRoot: model.hRoot,
            }),
        )
    })

    it('seeds Genesis (S_0) into in-memory Four-Vector tables and mints Sequence #1 into event_log', async () => {
        const mockState = createMockState()
        const slv = vi.fn()

        await seedPrimordialAction(
            model,
            {
                idx: 'seed',
                dat: { baseline: DEFAULT_PRIMORDIAL_BASELINE, seededAtMs: 1700000000000 },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const res = slv.mock.calls[0][0].result

        expect(res.seeded).toBe(true)
        expect(res.entitiesCount).toBe(2)
        expect(res.grievancesCount).toBe(1)
        expect(res.clocksCount).toBe(2)
        expect(model.genesisSeeded).toBe(true)

        // Verify entities_live table populated
        expect(memoryDatabase.entities_live.size).toBe(2)
        const bog = memoryDatabase.entities_live.get('char_bog')
        expect(bog.location_id).toBe('loc_the_warm_pipe')
        expect(bog.arms_available).toBe(2)
        expect(bog.held_items_json).toContain('item_founder_token')

        // Verify grievance_status table populated
        expect(memoryDatabase.grievance_status.size).toBe(1)
        const grv = memoryDatabase.grievance_status.get('grv_territorial_impasse')
        expect(grv.instigator_id).toBe('char_wart')
        expect(grv.victim_id).toBe('char_bog')

        // Verify paranoia_clocks table populated
        expect(memoryDatabase.paranoia_clocks.size).toBe(2)
        const clock = memoryDatabase.paranoia_clocks.get('clk_bog_paranoia')
        expect(clock.value_bps).toBe(2400)

        // Verify event_log Sequence #1
        expect(memoryDatabase.event_log.size).toBe(1)
        const evt1 = memoryDatabase.event_log.get('evt_genesis_000')
        expect(evt1.sequence_id).toBe(1)
        expect(evt1.type).toBe('SIMULATION_TICK_COMMITTED')
        expect(evt1.tick).toBe(0)
        expect(evt1.prev_hash).toBe('0'.repeat(64))
        expect(evt1.state_hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('verifies that Genesis seeding is idempotent without re-writing rows', async () => {
        const mockState = createMockState()

        // First seed
        await seedPrimordialAction(model, { idx: 'seed-1' }, mockState as any)
        expect(memoryDatabase.entities_live.size).toBe(2)

        // Second seed (Idempotency assertion)
        const slv = vi.fn()
        await seedPrimordialAction(model, { idx: 'seed-2', slv }, mockState as any)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                prmBit: expect.objectContaining({
                    idx: 'seed-primordial-idempotent',
                    val: 1,
                }),
            }),
        )

        // Verify no duplicate entities added
        expect(memoryDatabase.entities_live.size).toBe(2)
        expect(memoryDatabase.event_log.size).toBe(1)
    })

    it('verifies Genesis state presence via verifyGenesisPrimordialAction', async () => {
        const mockState = createMockState()
        await seedPrimordialAction(model, { idx: 'seed' }, mockState as any)

        const slv = vi.fn()
        await verifyGenesisPrimordialAction(model, { idx: 'verify', slv }, mockState as any)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                prmBit: expect.objectContaining({
                    idx: 'verify-genesis-pass',
                    val: 1,
                }),
            }),
        )
    })

    it('routes actions cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: COMPUTE_HROOT_PRIMORDIAL,
                bale: { idx: 'compute', slv } as any,
            },
            {} as any,
        )) as PrimordialModel

        expect(result).toBeInstanceOf(PrimordialModel)
        expect(slv).toHaveBeenCalled()
    })
})

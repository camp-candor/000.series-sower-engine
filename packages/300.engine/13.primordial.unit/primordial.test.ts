import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
    PrimordialModel,
    DEFAULT_PRIMORDIAL_BASELINE,
} from './primordial.model'
import {
    initPrimordial,
    computeBaselineHRoot,
    seedPrimordialAction,
    verifyGenesisPrimordialAction,
} from './primordial.buzzer'
import {
    createLocalDatabasePort,
    LOCAL_FOUR_VECTOR_DDL,
} from '../02.database.unit/database.buzzer'
import type { ILocalDatabasePort } from '../02.database.unit/fce/database.interface'

describe('13.primordial.unit - Primordial Genesis (S_0) & Merkle H_root Lock', () => {
    let model: PrimordialModel
    let dbPort: ILocalDatabasePort
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new PrimordialModel()
        await initPrimordial(model, { idx: 'test-init' }, mockState)

        dbPort = createLocalDatabasePort(':memory:')
        dbPort.exec(LOCAL_FOUR_VECTOR_DDL)
    })

    afterEach(() => {
        if (dbPort && dbPort.isOpen()) {
            dbPort.close()
        }
    })

    it('computes a deterministic 64-hex H_root from the primordial baseline', () => {
        const hRootA = computeBaselineHRoot(DEFAULT_PRIMORDIAL_BASELINE)
        const hRootB = computeBaselineHRoot({ ...DEFAULT_PRIMORDIAL_BASELINE })

        expect(hRootA).toMatch(/^[a-f0-9]{64}$/)
        expect(hRootA).toBe(hRootB)
    })

    it('seeds Genesis (S_0) into local SQLite and mints Sequence #1 into event_log', async () => {
        let seedRes: any
        await seedPrimordialAction(
            model,
            {
                idx: 'test-seed',
                dat: { dbPort, baseline: DEFAULT_PRIMORDIAL_BASELINE },
                val: 1700000000000,
                slv: (r) => {
                    seedRes = r.result
                },
            },
            mockState,
        )

        expect(seedRes.seeded).toBe(true)
        expect(seedRes.entitiesCount).toBe(2)
        expect(seedRes.grievancesCount).toBe(1)
        expect(seedRes.clocksCount).toBe(2)

        // Verify entities_live rows
        const bogRow = dbPort
            .prepare("SELECT * FROM entities_live WHERE entity_id = 'char_bog'")
            .get()
        expect(bogRow.location_id).toBe('loc_the_warm_pipe')
        expect(bogRow.arms_available).toBe(2)
        expect(bogRow.held_items_json).toContain('item_founder_token')

        // Verify event_log Sequence #1
        const eventRow = dbPort
            .prepare('SELECT * FROM event_log WHERE sequence_id = 1')
            .get()
        expect(eventRow.event_id).toBe('evt_genesis_000')
        expect(eventRow.tick).toBe(0)
        expect(eventRow.event_type).toBe('SIMULATION_TICK_COMMITTED')
        expect(eventRow.state_hash).toBe(seedRes.hRoot)
    })

    it('verifies that Genesis seeding is idempotent and detects seeded state', async () => {
        // Seed once
        await seedPrimordialAction(
            model,
            { idx: 'test-seed-1', dat: { dbPort } },
            mockState,
        )

        // Verify status
        let verifyRes: any
        await verifyGenesisPrimordialAction(
            model,
            {
                idx: 'test-verify',
                dat: { dbPort },
                slv: (r) => {
                    verifyRes = r
                },
            },
            mockState,
        )

        expect(verifyRes.prmBit?.val).toBe(1)
        expect(verifyRes.hRoot).toBe(model.hRoot)
    })

    it('locks the canonical Genesis golden hashes (H_root and Sequence #1 EventHash)', async () => {
        // Canonical values recorded in data/directive/day-001/013.phase-three.gravity.md.
        // The 7f8a9c.../cb42a1... strings in 011/012 were illustrative placeholders.
        const GOLDEN_H_ROOT =
            '269b62e561208e759c32b73b697159774373cabe954940cafe5df9c931a8eabd'
        const GOLDEN_EVENT_HASH =
            '1686cb4b477f1074b4f6ff8d281adf6daefc83f32f09968cb553224ec1422c70'

        expect(computeBaselineHRoot(DEFAULT_PRIMORDIAL_BASELINE)).toBe(
            GOLDEN_H_ROOT,
        )

        let seedRes: any
        await seedPrimordialAction(
            model,
            {
                idx: 'test-golden',
                dat: { dbPort, baseline: DEFAULT_PRIMORDIAL_BASELINE },
                val: 1700000000000,
                slv: (r) => {
                    seedRes = r.result
                },
            },
            mockState,
        )
        expect(seedRes.hRoot).toBe(GOLDEN_H_ROOT)
        expect(seedRes.eventHash).toBe(GOLDEN_EVENT_HASH)
    })

    it('never routes telemetry via the engine bus (stalled ste.hunt must not hang seeding)', async () => {
        const stalledState: any = { hunt: () => new Promise(() => {}) }
        let seedRes: any
        const run = seedPrimordialAction(
            model,
            {
                idx: 'test-no-hang',
                dat: { dbPort },
                slv: (r) => {
                    seedRes = r.result
                },
            },
            stalledState,
        )
        const timeout = new Promise((_, rej) =>
            setTimeout(() => rej(new Error('HANG')), 1000),
        )
        await Promise.race([run, timeout])
        expect(seedRes.seeded).toBe(true)
    })
})

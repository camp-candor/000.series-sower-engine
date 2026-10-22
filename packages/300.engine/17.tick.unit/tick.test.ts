import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TickModel } from './tick.model'
import {
    initTick,
    advanceTickAction,
    deriveTickSeed,
    executeDecaySweepTickAction,
} from './tick.buzzer'
import {
    createLocalDatabasePort,
    LOCAL_FOUR_VECTOR_DDL,
} from '../02.database.unit/database.buzzer'
import type { ILocalDatabasePort } from '../02.database.unit/fce/database.interface'

describe('17.tick.unit - Logical Clock & Deterministic Decay', () => {
    let model: TickModel
    let dbPort: ILocalDatabasePort
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new TickModel()
        await initTick(
            model,
            { idx: 'test-init', src: 'test_world_seed_alpha', val: 0 },
            mockState,
        )

        dbPort = createLocalDatabasePort(':memory:')
        dbPort.exec(LOCAL_FOUR_VECTOR_DDL)
    })

    afterEach(() => {
        if (dbPort && dbPort.isOpen()) {
            dbPort.close()
        }
    })

    it('derives deterministic HMAC-SHA256 seeds without wall-clock reliance', () => {
        const seedA = deriveTickSeed('world_seed', 5, 'simulation')
        const seedB = deriveTickSeed('world_seed', 5, 'simulation')
        const seedDifferentTick = deriveTickSeed('world_seed', 6, 'simulation')

        expect(seedA).toMatch(/^[a-f0-9]{64}$/)
        expect(seedA).toBe(seedB)
        expect(seedA).not.toBe(seedDifferentTick)
    })

    it('advances logical ticks monotonically and updates model state', async () => {
        let advanceRes: any
        await advanceTickAction(
            model,
            {
                idx: 'test-advance',
                val: 1,
                dat: { timestampMs: 1000 },
                slv: (r) => {
                    advanceRes = r.advancePayload
                },
            },
            mockState,
        )

        expect(model.currentTick).toBe(1)
        expect(advanceRes.previousTick).toBe(0)
        expect(advanceRes.newTick).toBe(1)
        expect(advanceRes.derivedTickSeed).toMatch(/^[a-f0-9]{64}$/)
    })

    it('applies passive basis-point decay across paranoia clocks and grievance cooldowns in SQLite', async () => {
        // 1. Seed a decaying paranoia clock (value: 2000 bps, decay: 100 bps/tick)
        dbPort
            .prepare(
                `
      INSERT INTO paranoia_clocks (
        clock_id, entity_id, clock_name, value_bps, threshold_bps, decay_rate_bps, is_triggered, updated_at_ms
      ) VALUES ('clk_01', 'char_bog', 'paranoia', 2000, 8000, 100, 0, 1000)
    `,
            )
            .run()

        // 2. Seed a cooling grievance (cooldown_cycles: 5)
        dbPort
            .prepare(
                `
      INSERT INTO grievance_status (
        grievance_id, instigator_id, victim_id, escalation_depth, cooldown_cycles, intensity_bps, status, updated_at_ms
      ) VALUES ('grv_01', 'char_bog', 'char_wart', 1, 5, 2000, 'ACTIVE', 1000)
    `,
            )
            .run()

        // 3. Advance tick by 2 steps with decay sweep
        await advanceTickAction(
            model,
            {
                idx: 'test-advance-decay',
                val: 2,
                dat: { dbPort, timestampMs: 2000 },
            },
            mockState,
        )

        // Verify clock decayed: 2000 - (100 * 2) = 1800 bps
        const clockRow = dbPort
            .prepare(
                "SELECT value_bps FROM paranoia_clocks WHERE clock_id = 'clk_01'",
            )
            .get()
        expect(clockRow.value_bps).toBe(1800)

        // Verify grievance cooldown decremented: 5 - 2 = 3
        const grievanceRow = dbPort
            .prepare(
                "SELECT cooldown_cycles FROM grievance_status WHERE grievance_id = 'grv_01'",
            )
            .get()
        expect(grievanceRow.cooldown_cycles).toBe(3)
    })

    it('emits advance and decay sweep telemetry to library console without blocking', async () => {
        const consoleMessages: string[] = []
        ;(global as any).LIBRARY = {
            hunt: async (_t: string, o: any) => {
                consoleMessages.push(o?.src)
                return {}
            },
        }

        dbPort
            .prepare(
                `
      INSERT INTO paranoia_clocks (
        clock_id, entity_id, clock_name, value_bps, threshold_bps, decay_rate_bps, is_triggered, updated_at_ms
      ) VALUES ('clk_live_01', 'char_bog', 'paranoia', 2500, 7500, 50, 0, 1000)
    `,
            )
            .run()

        const stalledState: any = { hunt: () => new Promise(() => {}) }
        await advanceTickAction(
            model,
            {
                idx: 'test-advance-live',
                val: 1,
                dat: { dbPort, timestampMs: 2000 },
            },
            stalledState,
        )

        expect(
            consoleMessages.some((m) => m.includes('>> [TICK:ADVANCED]')),
        ).toBe(true)
        expect(
            consoleMessages.some((m) => m.includes('>> [TICK:DECAY_SWEEP]')),
        ).toBe(true)
    })
})

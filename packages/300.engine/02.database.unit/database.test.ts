import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseModel } from './database.model'
import {
    initDatabase,
    queryDatabase,
    execBatchDatabase,
    closeDatabase,
} from './database.buzzer'

describe('02.database.unit - Local SQLite & Four-Vector Schema', () => {
    let model: DatabaseModel
    const mockState: any = {
        hunt: async () => ({}),
    }

    beforeEach(async () => {
        model = new DatabaseModel()
        await initDatabase(
            model,
            { idx: 'test-init', src: ':memory:' },
            mockState,
        )
    })

    afterEach(() => {
        closeDatabase(model, { idx: 'test-close' }, mockState)
    })

    it('provisions all 7 Four-Vector tables and triggers cleanly in local memory', () => {
        expect(model.status.initialized).toBe(true)
        expect(model.status.tableCount).toBe(7)
        expect(model.status.tables).toEqual([
            'actor_beliefs',
            'entities_live',
            'event_log',
            'grievance_status',
            'paranoia_clocks',
            'strings_ledger',
            'unratified_details',
        ])
        expect(model.status.triggers).toContain('trg_event_log_no_update')
        expect(model.status.triggers).toContain('trg_event_log_no_delete')
        expect(model.status.integrity).toBe('ok')
    })

    it('enforces append-only immutability on event_log (rejects UPDATE & DELETE)', () => {
        const port = model.port!
        port.exec(`
      INSERT INTO event_log (
        event_id, stream_id, tick, event_type, seed, payload_json, prev_event_hash, state_hash, timestamp_ms
      ) VALUES (
        'evt_test_01', 'str_main', 1, 'TICK_ADVANCED', 'seed_01', '{"tick":1}',
        '0000000000000000000000000000000000000000000000000000000000000000',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        1700000000000
      );
    `)

        // Verify row inserted
        const row = port
            .prepare("SELECT * FROM event_log WHERE event_id = 'evt_test_01'")
            .get()
        expect(row).toBeDefined()

        // Adversarial: Attempt UPDATE
        expect(() => {
            port.exec(
                "UPDATE event_log SET tick = 2 WHERE event_id = 'evt_test_01'",
            )
        }).toThrow(/IMMUTABILITY_VIOLATION/)

        // Adversarial: Attempt DELETE
        expect(() => {
            port.exec("DELETE FROM event_log WHERE event_id = 'evt_test_01'")
        }).toThrow(/IMMUTABILITY_VIOLATION/)
    })

    it('enforces anti-reflexive leverage strings constraint (holder_id != debtor_id)', () => {
        const port = model.port!
        expect(() => {
            port.exec(`
        INSERT INTO strings_ledger (
          relation_id, holder_id, debtor_id, weight_bps, strings_count, updated_at_ms
        ) VALUES (
          'rel_self_01', 'char_bog', 'char_bog', 5000, 1, 1700000000000
        );
      `)
        }).toThrow(/CHECK constraint failed/)
    })

    it('enforces basis-point bounding constraint (0 to 10000 bps) on paranoia clocks', () => {
        const port = model.port!
        expect(() => {
            port.exec(`
        INSERT INTO paranoia_clocks (
          clock_id, entity_id, clock_name, value_bps, threshold_bps, updated_at_ms
        ) VALUES (
          'clk_invalid_01', 'char_wart', 'paranoia_level', 15000, 8000, 1700000000000
        );
      `)
        }).toThrow(/CHECK constraint failed/)
    })

    it('executes atomic multi-statement batches inside execBatchDatabase', () => {
        let batchResult: any
        execBatchDatabase(
            model,
            {
                idx: 'test-batch',
                dat: {
                    statements: [
                        {
                            sql: `INSERT INTO entities_live (
                entity_id, location_id, arms_available, updated_at_ms
              ) VALUES (?, ?, ?, ?)`,
                            params: [
                                'char_bog',
                                'loc_the_warm_pipe',
                                2,
                                1700000000000,
                            ],
                        },
                        {
                            sql: `INSERT INTO entities_live (
                entity_id, location_id, arms_available, updated_at_ms
              ) VALUES (?, ?, ?, ?)`,
                            params: [
                                'char_wart',
                                'loc_the_warm_pipe',
                                1,
                                1700000000000,
                            ],
                        },
                    ],
                },
                slv: (res) => {
                    batchResult = res
                },
            },
            mockState,
        )

        expect(batchResult.res.changes).toBe(2)

        let queryRows: any[] = []
        queryDatabase(
            model,
            {
                idx: 'test-query',
                dat: {
                    sql: 'SELECT entity_id, arms_available FROM entities_live ORDER BY entity_id ASC',
                },
                slv: (res) => {
                    queryRows = res.rows || []
                },
            },
            mockState,
        )

        expect(queryRows.length).toBe(2)
        expect(queryRows[0].entity_id).toBe('char_bog')
        expect(queryRows[0].arms_available).toBe(2)
        expect(queryRows[1].entity_id).toBe('char_wart')
        expect(queryRows[1].arms_available).toBe(1)
    })
})

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { DatabaseModel } from './database.model.js'
import {
    ensureSchemaDatabase,
    execBatchDatabase,
    checkIntegrityDatabase,
    mountRealmDatabase,
    ensureSchema,
    closeDatabaseConnection,
} from './buz/database.buzz.js'
import { ENSURE_SCHEMA_DATABASE } from './database.action.js'
import { reducer } from './database.reduce.js'
import type {
    EventLogRecord,
    StringsLedgerRecord,
} from './fce/database.interface.js'

describe('02.database.unit - Four-Vector Table Memory Structures Battery', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes DatabaseModel with all 7 Four-Vector in-memory tables', () => {
        const model = new DatabaseModel()
        expect(model.idx).toBe('02.database')
        expect(model.isInitialized).toBe(false)
        expect(model.tables.event_log).toBeInstanceOf(Map)
        expect(model.tables.entities_live).toBeInstanceOf(Map)
        expect(model.tables.strings_ledger).toBeInstanceOf(Map)
        expect(model.tables.grievance_status).toBeInstanceOf(Map)
        expect(model.tables.paranoia_clocks).toBeInstanceOf(Map)
        expect(model.tables.actor_beliefs).toBeInstanceOf(Map)
        expect(model.tables.unratified_details).toBeInstanceOf(Map)
    })

    it('bootstraps in-memory schema on ensureSchemaDatabase', async () => {
        const model = new DatabaseModel()
        const slv = vi.fn()
        await ensureSchemaDatabase(model, { idx: 'schema', slv }, {} as any)

        expect(model.isInitialized).toBe(true)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 10,
                    idx: 'ensure-schema-pass',
                }),
            }),
        )
    })

    it('inserts clean event_log record into in-memory table', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(
            model,
            { idx: 'test-schema-insert' },
            {} as any,
        )

        const eventRecord: EventLogRecord = {
            sequence_id: 1,
            event_id: 'evt_001',
            stream_id: 'stream_alpha',
            tick: 0,
            type: 'SIMULATION_TICK_COMMITTED',
            version: 1,
            seed: 'seed_genesis',
            payload_json: '{}',
            prev_hash: '0'.repeat(64),
            state_hash: 'f'.repeat(64),
            timestamp_ms: 1700000000000,
        }

        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch',
                dat: {
                    operations: [
                        {
                            table: 'event_log',
                            action: 'INSERT',
                            key: eventRecord.event_id,
                            record: eventRecord,
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 1,
                    idx: 'exec-batch-pass',
                }),
            }),
        )
        expect(model.tables.event_log.size).toBe(1)
        expect(model.tables.event_log.get('evt_001')).toEqual(eventRecord)
    })

    it('rejects UPDATE on event_log with IMMUTABILITY_VIOLATION', async () => {
        const model = new DatabaseModel()
        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch',
                dat: {
                    operations: [
                        {
                            table: 'event_log',
                            action: 'UPDATE',
                            key: 'evt_001',
                            record: {} as any,
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'exec-batch-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining(
                            'IMMUTABILITY_VIOLATION',
                        ),
                    }),
                }),
            }),
        )
    })

    it('rejects DELETE on event_log with IMMUTABILITY_VIOLATION', async () => {
        const model = new DatabaseModel()
        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch',
                dat: {
                    operations: [
                        {
                            table: 'event_log',
                            action: 'DELETE',
                            key: 'evt_001',
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'exec-batch-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining(
                            'IMMUTABILITY_VIOLATION',
                        ),
                    }),
                }),
            }),
        )
    })

    it('enforces anti-reflexivity on strings_ledger (holder !== debtor)', async () => {
        const model = new DatabaseModel()
        const invalidDebt: StringsLedgerRecord = {
            relation_id: 'rel_self',
            holder_id: 'char_bog',
            debtor_id: 'char_bog', // Self-debt violation
            weight_bps: 5000,
            strings_count: 1,
            updated_at_ms: 1700000000000,
        }

        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch',
                dat: {
                    operations: [
                        {
                            table: 'strings_ledger',
                            action: 'INSERT',
                            key: invalidDebt.relation_id,
                            record: invalidDebt,
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'exec-batch-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining(
                            'ANTI_REFLEXIVITY_BREACH',
                        ),
                    }),
                }),
            }),
        )
    })

    it('enforces basis-point limits [0, 10000] and float prohibition on table inserts', async () => {
        const model = new DatabaseModel()
        const invalidClock = {
            clock_id: 'clk_01',
            entity_id: 'char_wart',
            clock_name: 'PARANOIA',
            value_bps: 10000.5, // Float prohibited
            threshold_bps: 10000,
            decay_rate_bps: 0,
            is_triggered: 0,
            updated_at_ms: 1700000000000,
        }

        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch',
                dat: {
                    operations: [
                        {
                            table: 'paranoia_clocks',
                            action: 'INSERT',
                            key: invalidClock.clock_id,
                            record: invalidClock as any,
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'exec-batch-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining('FLOAT_PROHIBITED'),
                    }),
                }),
            }),
        )
    })

    it('queries table records and reports total counts via checkIntegrityDatabase', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(
            model,
            { idx: 'test-schema-integrity' },
            {} as any,
        )

        const slv = vi.fn()
        await checkIntegrityDatabase(
            model,
            { idx: 'integrity', slv },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    idx: 'check-integrity-pass',
                    dat: expect.objectContaining({
                        reports: expect.any(Array),
                    }),
                }),
            }),
        )
    })

    it('rolls back batch atomically when a constraint violation occurs', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: 'test-rollback' }, {} as any)

        const validClock = {
            clock_id: 'clk_atomic_test',
            entity_id: 'char_bog',
            clock_name: 'PRESSURE',
            value_bps: 2000,
            threshold_bps: 5000,
            decay_rate_bps: 50,
            is_triggered: 0,
            updated_at_ms: 1700000000000,
        }
        const invalidDebt = {
            relation_id: 'rel_atomic_self',
            holder_id: 'char_wart',
            debtor_id: 'char_wart',
            weight_bps: 3000,
            strings_count: 1,
            updated_at_ms: 1700000000000,
        }

        const slv = vi.fn()
        await execBatchDatabase(
            model,
            {
                idx: 'batch-rollback',
                dat: {
                    operations: [
                        {
                            table: 'paranoia_clocks',
                            action: 'INSERT',
                            key: validClock.clock_id,
                            record: validClock as any,
                        },
                        {
                            table: 'strings_ledger',
                            action: 'INSERT',
                            key: invalidDebt.relation_id,
                            record: invalidDebt as any,
                        },
                    ],
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'exec-batch-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining(
                            'ANTI_REFLEXIVITY_BREACH',
                        ),
                    }),
                }),
            }),
        )
        expect(model.tables.paranoia_clocks.has('clk_atomic_test')).toBe(false)
    })

    it('routes database actions cleanly through reducer using clone-deep', async () => {
        const model = new DatabaseModel()
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: ENSURE_SCHEMA_DATABASE,
                bale: { idx: 'schema', slv } as any,
            },
            {} as any,
        )) as DatabaseModel

        expect(result).toBeInstanceOf(DatabaseModel)
        expect(slv).toHaveBeenCalled()
    })
})

describe('02.database.unit :: Discrete Realm Relational Schema Provisioning (Phase 5)', () => {
    let model: DatabaseModel

    beforeEach(() => {
        model = new DatabaseModel()
    })

    afterEach(() => {
        closeDatabaseConnection(model)
    })

    it('provisions 10 relational tables, 1 view, and 3 triggers on memory instance', async () => {
        await mountRealmDatabase(model, {
            dat: { seriesSlug: 'test-realm', storageTarget: ':memory:' },
        } as any)

        await ensureSchema(model)

        expect(model.schemaReport).toBeDefined()
        expect(model.schemaReport?.tables).toContain('event_log')
        expect(model.schemaReport?.tables).toContain('entities_live')
        expect(model.schemaReport?.tables).toContain('strings_ledger')
        expect(model.schemaReport?.tables).toContain('grievance_status')
        expect(model.schemaReport?.tables).toContain('paranoia_clocks')
        expect(model.schemaReport?.tables).toContain('actor_beliefs')
        expect(model.schemaReport?.tables).toContain('unratified_details')
        expect(model.schemaReport?.tables).toContain('facts')
        expect(model.schemaReport?.tables).toContain('scenes')
        expect(model.schemaReport?.tables).toContain('scene_fact_dependencies')

        expect(model.schemaReport?.views).toContain(
            'v_fact_centrality_telemetry',
        )
        expect(model.schemaReport?.triggers).toContain(
            'trg_event_log_no_update',
        )
        expect(model.schemaReport?.triggers).toContain(
            'trg_event_log_no_delete',
        )
        expect(model.schemaReport?.triggers).toContain('trg_fact_version_bump')
        expect(model.schemaReport?.isArmored).toBe(true)
    })

    it('enforces append-only triggers on event_log, blocking updates and deletes', async () => {
        await mountRealmDatabase(model, {
            dat: { seriesSlug: 'test-immutability', storageTarget: ':memory:' },
        } as any)
        await ensureSchema(model)

        const db = model.connection

        // Insert baseline sequence #1
        db.prepare(
            `
      INSERT INTO event_log (sequence_number, event_id, event_type, tick, payload_json, state_hash, prev_hash, seed, timestamp_ms)
      VALUES (1, 'evt_01', 'GENESIS_SEEDED', 0, '{}', 'hash_01', 'hash_00', 'seed_01', 1700000000000)
    `,
        ).run()

        // Verify UPDATE is blocked
        expect(() => {
            db.prepare(
                "UPDATE event_log SET event_type = 'CORRUPTED' WHERE sequence_number = 1",
            ).run()
        }).toThrow(/\[IMMUTABILITY_VIOLATION\] Updates forbidden on event_log/)

        // Verify DELETE is blocked
        expect(() => {
            db.prepare('DELETE FROM event_log WHERE sequence_number = 1').run()
        }).toThrow(
            /\[IMMUTABILITY_VIOLATION\] Deletions forbidden on event_log/,
        )
    })

    it('enforces anti-reflexive constraint on strings_ledger', async () => {
        await mountRealmDatabase(model, {
            dat: { seriesSlug: 'test-strings', storageTarget: ':memory:' },
        } as any)
        await ensureSchema(model)

        const db = model.connection

        // Self-referential debt must fail
        expect(() => {
            db.prepare(
                `
        INSERT INTO strings_ledger (string_id, holder_id, debtor_id, weight_bps, created_at_ms, updated_at_ms)
        VALUES ('str_01', 'char_bog', 'char_bog', 5000, 1700000000000, 1700000000000)
      `,
            ).run()
        }).toThrow(/CHECK constraint failed/)

        // Valid asymmetric debt succeeds
        expect(() => {
            db.prepare(
                `
        INSERT INTO strings_ledger (string_id, holder_id, debtor_id, weight_bps, created_at_ms, updated_at_ms)
        VALUES ('str_01', 'char_bog', 'char_wart', 5000, 1700000000000, 1700000000000)
      `,
            ).run()
        }).not.toThrow()
    })

    it('executes monotonic version bump trigger on facts and cascades is_dirty to dependent scenes', async () => {
        await mountRealmDatabase(model, {
            dat: { seriesSlug: 'test-cascade', storageTarget: ':memory:' },
        } as any)
        await ensureSchema(model)

        const db = model.connection

        // Seed fact
        db.prepare(
            `
      INSERT INTO facts (id, claim_text, scope, authority_level, standing, author, timestamp_ms, version)
      VALUES ('fact_01', 'Valve is sealed shut', 'LOCATION', 'CANON', 'ACTIVE_ENDORSED', 'Brad', 1700000000000, 1)
    `,
        ).run()

        // Seed clean scene
        db.prepare(
            `
      INSERT INTO scenes (id, episode_num, scene_num, text, status, is_dirty)
      VALUES ('sc_01', 1, 1, 'Bog looks at valve.', 'clean', 0)
    `,
        ).run()

        // Link dependency pinned to v1
        db.prepare(
            `
      INSERT INTO scene_fact_dependencies (scene_id, fact_id, entity_type, pinned_version)
      VALUES ('sc_01', 'fact_01', 'location', 1)
    `,
        ).run()

        // Verify scene is clean
        const beforeScene = db
            .prepare('SELECT status, is_dirty FROM scenes WHERE id = ?')
            .get('sc_01') as any
        expect(beforeScene.status).toBe('clean')
        expect(beforeScene.is_dirty).toBe(0)

        // Bump fact version to v2
        db.prepare('UPDATE facts SET version = 2 WHERE id = ?').run('fact_01')

        // Verify trigger marked scene dirty
        const afterScene = db
            .prepare('SELECT status, is_dirty FROM scenes WHERE id = ?')
            .get('sc_01') as any
        expect(afterScene.status).toBe('dirty')
        expect(afterScene.is_dirty).toBe(1)
    })
})

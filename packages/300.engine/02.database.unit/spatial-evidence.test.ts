import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseModel } from './database.model.js'
import {
    initDatabase,
    ensureSchema,
    migrateSpatialProofSchemaAction,
    appendEventLogWithProof,
} from './buz/database.buzz.js'
import type { EventLogRecord } from './fce/database.interface.js'

describe('02.database.unit - Spatial Quadruple Evidence Schema Migration Battery', () => {
    let model: DatabaseModel

    beforeEach(async () => {
        model = new DatabaseModel()
        await initDatabase(model, {
            idx: 'init',
            dat: { databasePath: ':memory:', seriesSlug: 'wiregrass-test' },
        })
        await ensureSchema(model)
    })

    afterEach(() => {
        if (model.connection) {
            model.connection.close()
        }
    })

    it('provisions event_log table equipped with the spatial proof quadruple', () => {
        const columns = model.connection.pragma(
            'table_info(event_log)',
        ) as Array<{ name: string; type: string }>
        const columnNames = columns.map((c) => c.name)

        expect(columnNames).toContain('topology_hash')
        expect(columnNames).toContain('overlay_hash')
        expect(columnNames).toContain('query_hash')
        expect(columnNames).toContain('receipt_hash')
    })

    it('commits an ACTOR_MOVED event with cryptographic proof hashes successfully', async () => {
        let resultRecord: EventLogRecord | undefined

        await appendEventLogWithProof(model, {
            idx: 'append-test',
            dat: {
                appendEvent: {
                    eventId: 'evt_move_001',
                    tick: 42,
                    eventType: 'ACTOR_MOVED',
                    actorId: 'char_bog',
                    payloadJson: JSON.stringify({
                        originQ: 0,
                        originR: 0,
                        destQ: 1,
                        destR: 0,
                        cost: 100,
                    }),
                    prevEventHash:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    eventHash:
                        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    spatialProof: {
                        topologyHash:
                            'topo_sha256_abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
                        overlayHash:
                            'overlay_sha256_12345678901234567890123456789012345678901234567890',
                        queryHash:
                            'query_sha256_45678901234567890123456789012345678901234567890123',
                        receiptHash:
                            'receipt_sha256_78901234567890123456789012345678901234567890123456',
                    },
                },
            },
            slv: (res: any) => {
                resultRecord = res.datBit.dat?.committedRecord
            },
        })

        expect(resultRecord).toBeDefined()
        expect(resultRecord?.sequence_number).toBe(1)
        expect(resultRecord?.topology_hash).toContain('topo_sha256')
        expect(resultRecord?.overlay_hash).toContain('overlay_sha256')
        expect(resultRecord?.query_hash).toContain('query_sha256')
        expect(resultRecord?.receipt_hash).toContain('receipt_sha256')
    })

    it('aborts any attempt to UPDATE proof columns via trg_event_log_no_update', async () => {
        await appendEventLogWithProof(model, {
            idx: 'append-test',
            dat: {
                appendEvent: {
                    eventId: 'evt_move_002',
                    tick: 43,
                    eventType: 'ACTOR_MOVED',
                    payloadJson: '{}',
                    prevEventHash: 'prev',
                    eventHash: 'curr',
                    spatialProof: {
                        topologyHash: 'original_topology',
                        overlayHash: 'original_overlay',
                        queryHash: 'original_query',
                        receiptHash: 'original_receipt',
                    },
                },
            },
        })

        expect(() => {
            model.connection
                .prepare(
                    "UPDATE event_log SET receipt_hash = 'tampered' WHERE event_id = 'evt_move_002'",
                )
                .run()
        }).toThrow(/IMMUTABILITY_VIOLATION/)
    })

    it('aborts any attempt to DELETE event records via trg_event_log_no_delete', async () => {
        await appendEventLogWithProof(model, {
            idx: 'append-test',
            dat: {
                appendEvent: {
                    eventId: 'evt_move_003',
                    tick: 44,
                    eventType: 'ACTOR_MOVED',
                    payloadJson: '{}',
                    prevEventHash: 'prev',
                    eventHash: 'curr',
                },
            },
        })

        expect(() => {
            model.connection
                .prepare(
                    "DELETE FROM event_log WHERE event_id = 'evt_move_003'",
                )
                .run()
        }).toThrow(/IMMUTABILITY_VIOLATION/)
    })

    it('executes safe idempotent column migration when invoked directly', async () => {
        let migrationStatus = false
        await migrateSpatialProofSchemaAction(model, {
            idx: 'migrate-call',
            slv: (res: any) => {
                migrationStatus = !!res.datBit.dat?.migrationApplied
            },
        })

        expect(migrationStatus).toBe(true)
        expect(model.hasSpatialSchema).toBe(true)
    })
})

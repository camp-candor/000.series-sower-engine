import { describe, it, expect, vi, afterEach } from 'vitest'
import { DatabaseModel } from './database.model.js'
import {
    resetLocalDatabase,
    closeDatabaseAction,
    closeDatabaseConnection,
} from './buz/database.buzz.js'
import { RESET_LOCAL_DATABASE, CLOSE_DATABASE } from './database.action.js'
import { reducer } from './database.reduce.js'

const TABLE_KEYS = [
    'event_log',
    'entities_live',
    'strings_ledger',
    'grievance_status',
    'paranoia_clocks',
    'actor_beliefs',
    'unratified_details',
    'facts',
    'scenes',
    'scene_fact_dependencies',
] as const

function seedOneRowPerTable(model: DatabaseModel): void {
    for (const key of TABLE_KEYS) {
        ;(model.tables as any)[key].set('k_' + key, { id: 'k_' + key } as any)
    }
    model.totalEventsCommitted = 10
    model.hasSpatialSchema = true
    model.isInitialized = true
}

describe('02.database.unit - Relational Ledger Zeroing (Phase 3)', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('clears all 10 tables and resolves row receipts', async () => {
        const model = new DatabaseModel()
        seedOneRowPerTable(model)

        const slv = vi.fn()
        await resetLocalDatabase(model, { idx: 'reset', slv } as any, {} as any)

        for (const key of TABLE_KEYS) {
            expect((model.tables as any)[key].size).toBe(0)
        }
        expect(model.totalEventsCommitted).toBe(0)
        expect(model.hasSpatialSchema).toBe(false)
        expect(model.isInitialized).toBe(true)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    idx: 'reset-database-pass',
                    val: 0,
                    dat: expect.objectContaining({
                        tablesClearedCount: 10,
                        totalRowsCleared: 10,
                        remainingRows: 0,
                        tableRowBreakdown: expect.objectContaining({
                            event_log: 1,
                            scenes: 1,
                        }),
                    }),
                }),
            }),
        )
    })

    it('routes RESET_LOCAL_DATABASE through the reducer', async () => {
        const model = new DatabaseModel()
        seedOneRowPerTable(model)

        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: RESET_LOCAL_DATABASE,
                bale: { idx: 'reset', slv } as any,
            },
            {} as any,
        )) as DatabaseModel

        expect(result.tables.event_log.size).toBe(0)
        expect(result.tables.scenes.size).toBe(0)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    idx: 'reset-database-pass',
                    dat: expect.objectContaining({
                        tablesClearedCount: 10,
                        totalRowsCleared: 10,
                    }),
                }),
            }),
        )
    })

    it('flushes WAL, closes the handle, and nulls connection', async () => {
        const model = new DatabaseModel()
        const exec = vi.fn()
        const close = vi.fn()
        model.connection = { exec, close }
        model.activeMetadata = {
            seriesSlug: 'gotham-trinity-crisis',
            storageTarget: 'data/sqlite/test.local.db',
            isOpen: true,
            walEnabled: true,
            foreignKeysEnabled: true,
            mountedAtMs: 1700000000000,
        } as any
        model.schemaReport = {
            tables: [],
            views: [],
            triggers: [],
            isArmored: false,
        }
        model.isInitialized = true

        const slv = vi.fn()
        await closeDatabaseAction(
            model,
            { idx: 'close', slv } as any,
            {} as any,
        )

        expect(exec).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE);')
        expect(close).toHaveBeenCalled()
        expect(model.connection).toBeNull()
        expect(model.activeMetadata).toBeUndefined()
        expect(model.schemaReport).toBeUndefined()
        expect(model.isInitialized).toBe(false)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    idx: 'close-database-pass',
                    val: 1,
                    dat: expect.objectContaining({ closed: true }),
                }),
            }),
        )
    })

    it('routes CLOSE_DATABASE through the reducer', async () => {
        const model = new DatabaseModel()
        const exec = vi.fn()
        const close = vi.fn()
        model.connection = { exec, close }
        model.activeMetadata = {
            seriesSlug: 'gotham',
            storageTarget: ':memory:',
            isOpen: true,
            walEnabled: false,
            foreignKeysEnabled: true,
            mountedAtMs: 1700000000000,
        } as any
        model.isInitialized = true

        const slv = vi.fn()
        const result = (await reducer(
            model,
            { type: CLOSE_DATABASE, bale: { idx: 'close', slv } as any },
            {} as any,
        )) as DatabaseModel

        expect(exec).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE);')
        expect(close).toHaveBeenCalled()
        expect(result.connection).toBeNull()
        expect(result.isInitialized).toBe(false)
    })

    it('closeDatabaseConnection is idempotent on a null handle', () => {
        const model = new DatabaseModel()
        expect(() => closeDatabaseConnection(model)).not.toThrow()
        expect(model.connection).toBeUndefined()
        expect(model.isInitialized).toBe(false)
    })
})

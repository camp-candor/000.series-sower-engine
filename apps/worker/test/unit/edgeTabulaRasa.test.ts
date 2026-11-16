import { describe, it, expect, vi } from 'vitest'
import app from '../../src/index.js'
import { SowerSessionDO } from '../../src/objects/SowerSessionDO.js'
import {
    createEngineTabulaRasaResetTool,
    createEngineVoidStateAuditTool,
} from '../../src/tools.custom.js'
import { executeSagaRollback } from '../../src/rollbackEngine.js'

function createTestSessionDO(
    ctx: ReturnType<typeof createMockDurableObjectContext>,
    env: unknown = {},
) {
    // NOTE: `new SowerSessionDO(...)` cannot run inside the workerd vitest
    // pool because DurableObjectBase validates its state argument. Bypass
    // the base constructor and attach the mocked state directly.
    const sessionDo = Object.create(
        SowerSessionDO.prototype,
    ) as SowerSessionDO & { ctx: any; env: any }
    Object.defineProperties(sessionDo, {
        ctx: { value: ctx, writable: true, configurable: true },
        env: { value: env, writable: true, configurable: true },
    })
    return sessionDo as SowerSessionDO
}

function createMockDurableObjectContext() {
    const store = new Map<string, unknown>()
    let alarmDeleted = false
    const storage: any = {
        get: vi.fn(async <T>(key: string) => store.get(key) as T | undefined),
        put: vi.fn(async (key: string, val: unknown) => {
            store.set(key, val)
        }),
        deleteAll: vi.fn(async () => {
            store.clear()
        }),
        deleteAlarm: vi.fn(async () => {
            alarmDeleted = true
        }),
        list: vi.fn(async () => new Map(store)),
        sql: {
            exec: vi.fn(() => [] as unknown as Iterable<unknown>),
        },
    }
    return {
        store,
        get alarmDeleted() {
            return alarmDeleted
        },
        storage,
        blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
    }
}

describe('Phase 8: Cloudflare Worker Edge Control Plane Synchronization', () => {
    it('Task 8.3: enforces revoke-first monotonic epoch fencing, cancels alarms, and purges SowerSessionDO storage', async () => {
        const ctx = createMockDurableObjectContext()
        ctx.store.set('fencing_epoch', 3)
        ctx.store.set('active_series', 'gotham-trinity-crisis')
        ctx.store.set('event_seq_1', { id: 'evt_1' })

        const sessionDo = createTestSessionDO(ctx)

        // Stale epoch (2 < 3) must fail closed with HTTP 409
        const staleRes = await sessionDo.executeTabulaRasaReset({
            seriesSlug: 'gotham-trinity-crisis',
            confirmToken1: 'CONFIRM_1_OF_3',
            confirmToken2: 'CONFIRM_2_OF_3',
            confirmToken3: 'CONFIRM_3_OF_3',
            fencingEpoch: 2,
        })
        expect(staleRes.status).toBe(409)
        expect(staleRes.body.error).toBe('STALE_FENCING_EPOCH')
        expect(ctx.store.has('active_series')).toBe(true)

        // Valid epoch (3 >= 3) bumps epoch to 4, deletes alarm, and clears ephemeral keys
        const validRes = await sessionDo.executeTabulaRasaReset({
            seriesSlug: 'gotham-trinity-crisis',
            confirmToken1: 'CONFIRM_1_OF_3',
            confirmToken2: 'CONFIRM_2_OF_3',
            confirmToken3: 'CONFIRM_3_OF_3',
            fencingEpoch: 3,
        })
        expect(validRes.status).toBe(200)
        expect(validRes.body.voidStateVerified).toBe(true)
        expect(validRes.body.previousEpoch).toBe(3)
        expect(validRes.body.fencingEpoch).toBe(4)
        expect(ctx.alarmDeleted).toBe(true)
        expect(ctx.store.has('active_series')).toBe(false)
        expect(ctx.store.get('fencing_epoch')).toBe(4)

        const status = await sessionDo.getVoidStateStatus(
            'gotham-trinity-crisis',
        )
        expect(status.voidStateVerified).toBe(true)
        expect(status.fencingEpoch).toBe(4)
    })

    it('Task 8.1 & 8.2: rejects unconfirmed Hono POST with HTTP 403 and executes TypeBox tools cleanly', async () => {
        const ctx = createMockDurableObjectContext()
        const sessionDo = createTestSessionDO(ctx)
        const mockEnv: any = {
            SOWER_SESSION: {
                idFromName: vi.fn((slug: string) => ({ name: slug })),
                get: vi.fn(() => ({
                    fetch: (req: Request) => sessionDo.fetch(req),
                })),
            },
        }

        // Hono endpoint fails closed with HTTP 403 when tokens are missing
        const forbiddenResp = await app.request(
            '/engine/tabula-rasa-reset',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seriesSlug: 'gotham-trinity-crisis',
                    confirmToken1: 'CONFIRM_1_OF_3',
                }),
            },
            mockEnv,
        )
        expect(forbiddenResp.status).toBe(403)

        // Valid Hono POST clears DO storage and returns HTTP 200
        const okResp = await app.request(
            '/engine/tabula-rasa-reset',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seriesSlug: 'gotham-trinity-crisis',
                    confirmToken1: 'CONFIRM_1_OF_3',
                    confirmToken2: 'CONFIRM_2_OF_3',
                    confirmToken3: 'CONFIRM_3_OF_3',
                    fencingEpoch: 0,
                }),
            },
            mockEnv,
        )
        expect(okResp.status).toBe(200)
        const okJson: any = await okResp.json()
        expect(okJson.voidStateVerified).toBe(true)

        // TypeBox custom tools execute and audit Void State
        const resetTool = createEngineTabulaRasaResetTool(mockEnv)
        const auditTool = createEngineVoidStateAuditTool(mockEnv)
        const toolRes = await resetTool.execute('call_1', {
            seriesSlug: 'gotham-trinity-crisis',
            confirmToken1: 'CONFIRM_1_OF_3',
            confirmToken2: 'CONFIRM_2_OF_3',
            confirmToken3: 'CONFIRM_3_OF_3',
            fencingEpoch: 1,
        })
        expect((toolRes.details as any).voidStateVerified).toBe(true)

        const auditRes = await auditTool.execute('call_2', {
            seriesSlug: 'gotham-trinity-crisis',
        })
        expect((auditRes.details as any).voidStateVerified).toBe(true)
    })

    it('Task 8.4: executes SowerSessionDO Void-State reset inside Stage 4 of executeSagaRollback', async () => {
        const ctx = createMockDurableObjectContext()
        ctx.store.set('dirty_seed', true)
        const sessionDo = createTestSessionDO(ctx)
        const mockEnv: any = {
            GITHUB_TOKEN: 'ghp_test_secret_token',
            SOWER_SESSION: {
                idFromName: vi.fn((slug: string) => ({ name: slug })),
                get: vi.fn(() => ({
                    fetch: (req: Request) => sessionDo.fetch(req),
                })),
            },
        }

        const sagaResult = await executeSagaRollback({
            owner: 'camp-candor',
            repo: '000.series-sower-engine',
            branchName: '',
            reason: 'Initial Genesis verification failed',
            env: mockEnv,
            resetToVoidState: {
                seriesSlug: 'gotham-trinity-crisis',
                confirmToken1: 'CONFIRM_1_OF_3',
                confirmToken2: 'CONFIRM_2_OF_3',
                confirmToken3: 'CONFIRM_3_OF_3',
                fencingEpoch: 0,
            },
        })

        expect(sagaResult.status).toBe('ROLLBACK_COMPLETED')
        expect(
            (sagaResult.details.stage4 as any).voidStateReset
                ?.voidStateVerified,
        ).toBe(true)
        expect(ctx.store.has('dirty_seed')).toBe(false)
    })
})

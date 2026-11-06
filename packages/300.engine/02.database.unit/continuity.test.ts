import { describe, it, expect, vi, afterEach } from 'vitest'
import { DatabaseModel } from './database.model.js'
import {
    ensureSchemaDatabase,
    insertFact,
    updateFactClaim,
    setFactStanding,
    registerScene,
    addSceneDependency,
    queryWhyDirty,
    getFactCentralityTelemetry,
} from './buz/database.buzz.js'

describe('02.database.unit - Flat Continuity Table Invalidation Battery', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes schema and registers flat continuity tables in memory', async () => {
        const model = new DatabaseModel()
        const slv = vi.fn()
        await ensureSchemaDatabase(model, { idx: 'schema', slv }, {} as any)

        expect(model.isInitialized).toBe(true)
        expect(model.tables.facts).toBeInstanceOf(Map)
        expect(model.tables.scenes).toBeInstanceOf(Map)
        expect(model.tables.scene_fact_dependencies).toBeInstanceOf(Map)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({ val: 10 }),
            }),
        )
    })

    it('inserts canonical fact at version 1 and registers scene with clean status', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'fact',
                dat: {
                    fact: {
                        id: 'fact_silas_arm',
                        claim_text: 'Silas right brachial plexus is intact.',
                        scope: 'CHARACTER',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 1,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await registerScene(
            model,
            {
                idx: 'scene',
                dat: {
                    scene: {
                        id: 'ep101_sc03',
                        episode_num: 101,
                        scene_num: 3,
                        text: 'Silas lifts the iron bar with both hands.',
                        status: 'clean',
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                        updated_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await addSceneDependency(
            model,
            {
                idx: 'dep',
                dat: {
                    dependency: {
                        scene_id: 'ep101_sc03',
                        fact_id: 'fact_silas_arm',
                        entity_type: 'character',
                        pinned_version: 1,
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        expect(model.tables.facts.get('fact_silas_arm')?.version).toBe(1)
        expect(model.tables.scenes.get('ep101_sc03')?.status).toBe('clean')
        expect(model.tables.scenes.get('ep101_sc03')?.is_dirty).toBe(0)
    })

    it('aborts fact update with MONOTONIC_VIOLATION when newVersion <= existing.version', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'fact',
                dat: {
                    fact: {
                        id: 'fact_silas_arm',
                        claim_text: 'Silas right arm intact.',
                        scope: 'CHARACTER',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 2,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        const slv = vi.fn()
        await updateFactClaim(
            model,
            {
                idx: 'update',
                dat: {
                    factId: 'fact_silas_arm',
                    newClaimText: 'Silas arm severed.',
                    newVersion: 2, // Non-monotonic update attempt (2 <= 2)
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 0,
                    idx: 'update-fact-claim-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining('MONOTONIC_VIOLATION'),
                    }),
                }),
            }),
        )

        // Verify version remained untouched
        expect(model.tables.facts.get('fact_silas_arm')?.version).toBe(2)
    })

    it('enforces Zero-Cascade Liminal Guarantee: FLAGGED_FOR_REVIEW does not dirty scenes', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'fact',
                dat: {
                    fact: {
                        id: 'fact_silas_arm',
                        claim_text: 'Silas right arm intact.',
                        scope: 'CHARACTER',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 1,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await registerScene(
            model,
            {
                idx: 'scene',
                dat: {
                    scene: {
                        id: 'ep101_sc03',
                        episode_num: 101,
                        scene_num: 3,
                        text: 'Silas lifts the iron bar.',
                        status: 'clean',
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                        updated_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await addSceneDependency(
            model,
            {
                idx: 'dep',
                dat: {
                    dependency: {
                        scene_id: 'ep101_sc03',
                        fact_id: 'fact_silas_arm',
                        entity_type: 'character',
                        pinned_version: 1,
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        // Transition fact to liminal state
        const slv = vi.fn()
        await setFactStanding(
            model,
            {
                idx: 'standing',
                dat: {
                    factId: 'fact_silas_arm',
                    standing: 'FLAGGED_FOR_REVIEW',
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({ val: 0, idx: 'set-fact-standing-pass' }),
            }),
        )

        // Scene must remain completely clean
        expect(model.tables.scenes.get('ep101_sc03')?.status).toBe('clean')
        expect(model.tables.scenes.get('ep101_sc03')?.is_dirty).toBe(0)
        expect(model.tables.scene_fact_dependencies.get('ep101_sc03#fact_silas_arm')?.is_dirty).toBe(0)
    })

    it('cascades is_dirty = 1 and status = dirty when fact version bumps (v1 -> v2)', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'fact',
                dat: {
                    fact: {
                        id: 'fact_silas_arm',
                        claim_text: 'Silas right arm intact.',
                        scope: 'CHARACTER',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 1,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await registerScene(
            model,
            {
                idx: 'scene',
                dat: {
                    scene: {
                        id: 'ep101_sc03',
                        episode_num: 101,
                        scene_num: 3,
                        text: 'Silas lifts the iron bar.',
                        status: 'clean',
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                        updated_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await addSceneDependency(
            model,
            {
                idx: 'dep',
                dat: {
                    dependency: {
                        scene_id: 'ep101_sc03',
                        fact_id: 'fact_silas_arm',
                        entity_type: 'character',
                        pinned_version: 1,
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        // Bump version v1 -> v2
        const slv = vi.fn()
        await updateFactClaim(
            model,
            {
                idx: 'update',
                dat: {
                    factId: 'fact_silas_arm',
                    newClaimText: 'Silas right arm severed.',
                    newVersion: 2,
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({ val: 1, idx: 'update-fact-claim-pass' }),
            }),
        )

        // Dependent scene and dependency must be marked dirty
        expect(model.tables.scenes.get('ep101_sc03')?.status).toBe('dirty')
        expect(model.tables.scenes.get('ep101_sc03')?.is_dirty).toBe(1)
        expect(model.tables.scenes.get('ep101_sc03')?.dirty_reason).toContain('fact_silas_arm')

        const dep = model.tables.scene_fact_dependencies.get('ep101_sc03#fact_silas_arm')
        expect(dep?.is_dirty).toBe(1)
        expect(dep?.invalidation_reason).toContain('v1 -> v2')
    })

    it('cascades is_dirty = 1 when fact standing transitions to DEPRECATED_ARCHIVED', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'fact',
                dat: {
                    fact: {
                        id: 'fact_ancient_rule',
                        claim_text: 'Old guild law.',
                        scope: 'LAW',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 1,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await registerScene(
            model,
            {
                idx: 'scene',
                dat: {
                    scene: {
                        id: 'ep101_sc09',
                        episode_num: 101,
                        scene_num: 9,
                        text: 'Characters recite the guild law.',
                        status: 'clean',
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                        updated_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await addSceneDependency(
            model,
            {
                idx: 'dep',
                dat: {
                    dependency: {
                        scene_id: 'ep101_sc09',
                        fact_id: 'fact_ancient_rule',
                        entity_type: 'axiom',
                        pinned_version: 1,
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        // Archive fact
        const slv = vi.fn()
        await setFactStanding(
            model,
            {
                idx: 'retire',
                dat: {
                    factId: 'fact_ancient_rule',
                    standing: 'DEPRECATED_ARCHIVED',
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({ val: 1 }),
            }),
        )

        expect(model.tables.scenes.get('ep101_sc09')?.status).toBe('dirty')
        expect(model.tables.scenes.get('ep101_sc09')?.is_dirty).toBe(1)
        expect(model.tables.scenes.get('ep101_sc09')?.dirty_reason).toContain('Retired Fact Reference')
    })

    it('queries why-dirty and computes passive centrality telemetry', async () => {
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, { idx: "schema" }, {} as any)

        await insertFact(
            model,
            {
                idx: 'f1',
                dat: {
                    fact: {
                        id: 'fact_hub_prop',
                        claim_text: 'The brass lantern is functional.',
                        scope: 'LOGISTIC',
                        authority_level: 'CANON',
                        standing: 'ACTIVE_ENDORSED',
                        author: 'showrunner',
                        version: 1,
                        timestamp_ms: 1700000000000,
                        last_edited_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await registerScene(
            model,
            {
                idx: 's1',
                dat: {
                    scene: {
                        id: 'sc_01',
                        episode_num: 1,
                        scene_num: 1,
                        text: 'Scene 1',
                        status: 'clean',
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                        updated_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        await addSceneDependency(
            model,
            {
                idx: 'd1',
                dat: {
                    dependency: {
                        scene_id: 'sc_01',
                        fact_id: 'fact_hub_prop',
                        entity_type: 'possession',
                        pinned_version: 1,
                        is_dirty: 0,
                        created_at_ms: 1700000000000,
                    },
                },
            },
            {} as any,
        )

        // Centrality check
        const slvTelemetry = vi.fn()
        await getFactCentralityTelemetry(model, { idx: 'telemetry', slv: slvTelemetry }, {} as any)
        expect(slvTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    dat: expect.objectContaining({
                        telemetry: expect.arrayContaining([
                            expect.objectContaining({
                                fact_id: 'fact_hub_prop',
                                dependent_scenes_count: 1,
                            }),
                        ]),
                    }),
                }),
            }),
        )

        // Mutate fact to trigger dirty state
        await updateFactClaim(
            model,
            {
                idx: 'bump',
                dat: {
                    factId: 'fact_hub_prop',
                    newClaimText: 'The brass lantern is broken.',
                    newVersion: 2,
                },
            },
            {} as any,
        )

        // Query why dirty
        const slvWhy = vi.fn()
        await queryWhyDirty(model, { idx: 'why', dat: { sceneId: 'sc_01' }, slv: slvWhy }, {} as any)
        expect(slvWhy).toHaveBeenCalledWith(
            expect.objectContaining({
                databaseBit: expect.objectContaining({
                    val: 1,
                    src: expect.stringContaining('fact_hub_prop'),
                }),
            }),
        )
    })
})

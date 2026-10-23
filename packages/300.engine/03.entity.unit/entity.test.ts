import { describe, it, expect } from 'vitest'
import {
    assembleCompositeEntity,
    serializeEntityToDbRow,
    deserializeDbRowToEntity,
    upsertEntity,
    getEntity,
    listEntitiesByLocation,
    hydrateAllEntities,
} from './buz/entity.buzz'
import { EntityModel } from './entity.model'
import { DatabaseModel } from '../02.database.unit/database.model'
import {
    initDatabase,
    queryDatabase,
    closeDatabase,
} from '../02.database.unit/database.buzzer'

describe('03.entity.unit - Composite Entity Assembly & Projection', () => {
    it('assembles composite entity across somatic, logistical, and spatial vectors with top-level coords', () => {
        const composite = assembleCompositeEntity({
            entityId: 'char_wart',
            locationId: 'loc_warm_pipe',
            q: 10,
            r: 2,
            somatic: {
                armsAvailable: 1,
                legsAvailable: 2,
                locomotionTier: 'LIMPING',
                painBps: 6000,
                fatigueBps: 2000,
            },
            mask: {
                openWounds: ['SEVERED_LEFT_ARM'],
                bannedKineticVerbs: ['BIMANUAL_LIFT', 'CLIMB'],
            },
            inventory: {
                heldItems: ['item_iron_knife'],
                wornGear: { belt: 'item_holster' },
                cachedItems: ['item_torch'],
            },
            timestampMs: 12345,
        })

        expect(composite.entityId).toBe('char_wart')
        expect(composite.locationId).toBe('loc_warm_pipe')
        expect(composite.q).toBe(10)
        expect(composite.r).toBe(2)
        expect(composite.armsAvailable).toBe(1)
        expect(composite.legsAvailable).toBe(2)
        expect(composite.locomotionTier).toBe('LIMPING')
        expect(composite.painBps).toBe(6000)
        expect(composite.fatigueBps).toBe(2000)
        expect(composite.openWounds).toContain('SEVERED_LEFT_ARM')
        expect(composite.bannedKineticVerbs).toContain('BIMANUAL_LIFT')
        expect(composite.heldItems).toContain('item_iron_knife')
        expect(composite.cachedItems).toContain('item_torch')
    })

    it('assembles composite entity with nested position coords for backwards compatibility', () => {
        const composite = assembleCompositeEntity({
            entityId: 'char_bog',
            position: {
                locationId: 'loc_warm_pipe',
                coord: { q: 10, r: 2, s: -12 },
            },
            somatic: {
                armsAvailable: 2,
                legsAvailable: 2,
                locomotionTier: 'UNRESTRICTED',
            },
        })

        expect(composite.entityId).toBe('char_bog')
        expect(composite.locationId).toBe('loc_warm_pipe')
        expect(composite.q).toBe(10)
        expect(composite.r).toBe(2)
        expect(composite.armsAvailable).toBe(2)
    })

    it('verifies 100% round-trip field parity across serialize and deserialize', () => {
        const original = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_the_warm_pipe',
            q: 4,
            r: -1,
            somatic: {
                armsAvailable: 2,
                legsAvailable: 2,
                locomotionTier: 'UNRESTRICTED',
                fatigueBps: 3000,
                concussionLevel: 1,
            },
            mask: {
                openWounds: ['BRUISED_RIBS'],
                bannedKineticVerbs: ['SPRINT'],
            },
            inventory: {
                heldItems: ['item_torch', 'item_knife'],
                wornGear: { chest: 'item_apron' },
                slungItems: ['item_sack'],
            },
            timestampMs: 98765,
        })

        const row = serializeEntityToDbRow(original)
        expect(typeof row.open_wounds_json).toBe('string')
        expect(typeof row.held_items_json).toBe('string')
        expect(typeof row.worn_gear_json).toBe('string')
        expect(typeof row.banned_kinetic_verbs_json).toBe('string')

        const restored = deserializeDbRowToEntity(row)
        expect(JSON.stringify(original)).toBe(JSON.stringify(restored))
        expect(restored).toEqual(original)
    })

    it('executes upsertEntity with in-memory update and SQLite ON CONFLICT persistence', async () => {
        const model = new EntityModel()
        let executedSql = ''
        let executedParams: any[] = []
        const mockState: any = {
            hunt: async (act: string, payload: any) => {
                if (act === '[Database action] Query Database') {
                    executedSql = payload.src
                    executedParams = payload.dat
                    return { datBit: { lst: [] } }
                }
                return {}
            },
        }

        const composite = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_warm_pipe',
            q: 0,
            r: 0,
        })

        await upsertEntity(
            model,
            { idx: 'u', dat: { composite, persistToDb: true } },
            mockState,
        )

        expect(model.entities['char_bog']).toBeDefined()
        expect(model.entities['char_bog'].entityId).toBe('char_bog')
        expect(executedSql).toContain('INSERT INTO entities_live')
        expect(executedSql).toContain('ON CONFLICT(entity_id) DO UPDATE SET')
        expect(executedParams[0]).toBe('char_bog')
    })

    it('retrieves entity from cache or falls back to SQLite entities_live', async () => {
        const model = new EntityModel()

        // 1. Cache hit
        model.entities['char_bog'] = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_warm_pipe',
            q: 1,
            r: 1,
        })

        let hitResult: any
        await getEntity(
            model,
            {
                idx: 'g1',
                dat: { entityId: 'char_bog' },
                slv: (r) => {
                    hitResult = r.entBit.dat
                },
            },
            {} as any,
        )
        expect(hitResult).toBeDefined()
        expect(hitResult.entityId).toBe('char_bog')

        // 2. Cache miss with DB query fallback
        const mockDbRow = {
            entity_id: 'char_wart',
            location_id: 'loc_culvert',
            q: 2,
            r: 2,
            arms_available: 1,
            legs_available: 2,
            locomotion_tier: 'LIMPING',
            concussion_level: 0,
            fatigue_bps: 0,
            pain_bps: 0,
            refusal_strain_bps: 0,
            open_wounds_json: '[]',
            banned_kinetic_verbs_json: '[]',
            held_items_json: '[]',
            worn_gear_json: '{}',
            slung_items_json: '[]',
            cached_items_json: '[]',
            updated_at_ms: 1000,
        }
        const mockState: any = {
            hunt: async () => ({ datBit: { lst: [mockDbRow] } }),
        }

        let missResult: any
        await getEntity(
            model,
            {
                idx: 'g2',
                dat: { entityId: 'char_wart' },
                slv: (r) => {
                    missResult = r.entBit.dat
                },
            },
            mockState,
        )
        expect(model.entities['char_wart']).toBeDefined()
        expect(model.entities['char_wart'].locationId).toBe('loc_culvert')
        expect(missResult.entityId).toBe('char_wart')
    })

    it('filters entities by locationId correctly', async () => {
        const model = new EntityModel()
        const mockState: any = { hunt: async () => ({ datBit: { lst: [] } }) }

        const e1 = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_warm_pipe',
            q: 0,
            r: 0,
        })
        const e2 = assembleCompositeEntity({
            entityId: 'char_wart',
            locationId: 'loc_warm_pipe',
            q: 1,
            r: 0,
        })
        const e3 = assembleCompositeEntity({
            entityId: 'char_spleen',
            locationId: 'loc_boiler',
            q: 5,
            r: 5,
        })

        await upsertEntity(
            model,
            { idx: 'u1', dat: { composite: e1, persistToDb: false } },
            mockState,
        )
        await upsertEntity(
            model,
            { idx: 'u2', dat: { composite: e2, persistToDb: false } },
            mockState,
        )
        await upsertEntity(
            model,
            { idx: 'u3', dat: { composite: e3, persistToDb: false } },
            mockState,
        )

        let listResult: any
        await listEntitiesByLocation(
            model,
            {
                idx: 'list',
                dat: { locationId: 'loc_warm_pipe' },
                slv: (r) => {
                    listResult = r.entBit.dat
                },
            },
            mockState,
        )

        expect(listResult).toBeDefined()
        expect(listResult.length).toBe(2)
        expect(listResult[0].entityId).toBe('char_bog')
        expect(listResult[1].entityId).toBe('char_wart')
    })

    it('hydrates all entities from SQLite in bulk', async () => {
        const model = new EntityModel()
        const mockRows = [
            {
                entity_id: 'char_bog',
                location_id: 'loc_warm_pipe',
                q: 0,
                r: 0,
                arms_available: 2,
                legs_available: 2,
                locomotion_tier: 'UNRESTRICTED',
                concussion_level: 0,
                fatigue_bps: 0,
                pain_bps: 0,
                refusal_strain_bps: 0,
                open_wounds_json: '[]',
                banned_kinetic_verbs_json: '[]',
                held_items_json: '[]',
                worn_gear_json: '{}',
                slung_items_json: '[]',
                cached_items_json: '[]',
                updated_at_ms: 1000,
            },
            {
                entity_id: 'char_wart',
                location_id: 'loc_warm_pipe',
                q: 1,
                r: 0,
                arms_available: 1,
                legs_available: 2,
                locomotion_tier: 'LIMPING',
                concussion_level: 0,
                fatigue_bps: 0,
                pain_bps: 0,
                refusal_strain_bps: 0,
                open_wounds_json: '[]',
                banned_kinetic_verbs_json: '[]',
                held_items_json: '[]',
                worn_gear_json: '{}',
                slung_items_json: '[]',
                cached_items_json: '[]',
                updated_at_ms: 1000,
            },
        ]

        const mockState: any = {
            hunt: async () => ({ datBit: { lst: mockRows } }),
        }

        let hydratedCount = 0
        await hydrateAllEntities(
            model,
            {
                idx: 'hyd',
                slv: (r) => {
                    hydratedCount = r.entBit.val ?? 0
                },
            },
            mockState,
        )

        expect(hydratedCount).toBe(2)
        expect(Object.keys(model.entities).length).toBe(2)
        expect(model.entities['char_bog']).toBeDefined()
        expect(model.entities['char_wart']).toBeDefined()
    })

    it('executes real SQLite upsert against in-memory database without column errors', async () => {
        const dbModel = new DatabaseModel()
        const mockDbState: any = { hunt: async () => ({}) }
        await initDatabase(
            dbModel,
            { idx: 'test-init', src: ':memory:' },
            mockDbState,
        )

        const ste: any = {
            hunt: async (act: string, bale: any) => {
                if (act === '[Database action] Query Database') {
                    let result: any
                    await queryDatabase(
                        dbModel,
                        {
                            idx: bale.idx || 'q',
                            src: bale.src,
                            dat: bale.dat,
                            slv: (r: any) => {
                                result = r
                            },
                        },
                        mockDbState,
                    )
                    return { ...result, datBit: { lst: result?.rows || [] } }
                }
                return {}
            },
        }

        const entityModel = new EntityModel()
        const composite = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_warm_pipe',
            q: 10,
            r: 2,
            somatic: { armsAvailable: 2, locomotionTier: 'UNRESTRICTED' },
            inventory: { heldItems: ['item_knife'] },
        })

        await upsertEntity(
            entityModel,
            { idx: 'u-real', dat: { composite, persistToDb: true } },
            ste,
        )

        // Query the real SQLite database directly to confirm row was actually written
        let rows: any[] = []
        await queryDatabase(
            dbModel,
            {
                idx: 'check-row',
                src: "SELECT * FROM entities_live WHERE entity_id = 'char_bog'",
                slv: (r: any) => {
                    rows = r.rows || r.datBit?.lst || []
                },
            },
            mockDbState,
        )

        expect(rows.length).toBe(1)
        expect(rows[0].entity_id).toBe('char_bog')
        expect(rows[0].location_id).toBe('loc_warm_pipe')
        expect(rows[0].coord_q).toBe(10)
        expect(rows[0].coord_r).toBe(2)
        expect(rows[0].arms_available).toBe(2)

        // Test getEntity fallback on a fresh model
        const freshModel = new EntityModel()
        let fetched: any
        await getEntity(
            freshModel,
            {
                idx: 'g-real',
                dat: { entityId: 'char_bog' },
                slv: (r: any) => {
                    fetched = r.entBit?.dat
                },
            },
            ste,
        )
        expect(fetched).toBeDefined()
        expect(fetched.entityId).toBe('char_bog')
        expect(fetched.q).toBe(10)
        expect(fetched.r).toBe(2)

        closeDatabase(dbModel, { idx: 'close' }, mockDbState)
    })
})

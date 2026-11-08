import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EntityModel } from './entity.model.js'
import {
    initEntity,
    assembleCompositeEntity,
    serializeEntityToDbRow,
    deserializeDbRowToEntity,
    upsertEntityLiveAction,
    getEntityLiveAction,
    listEntitiesByLocationAction,
    hydrateAllEntitiesAction,
} from './buz/entity.buzz.js'
import { UPSERT_ENTITY_LIVE } from './entity.action.js'
import { reducer } from './entity.reduce.js'
import type { CompositeEntityState } from './fce/entity.interface.js'

describe('03.entity.unit - Live Entity State Aggregation & Projection Battery', () => {
    let model: EntityModel

    beforeEach(async () => {
        model = new EntityModel()
        await initEntity(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('assembles a unified CompositeEntityState from multi-vector parameters', () => {
        const entity = assembleCompositeEntity({
            entityId: 'char_bog',
            locationId: 'loc_the_warm_pipe',
            q: 0,
            r: 0,
            armsAvailable: 2,
            legsAvailable: 2,
            locomotionTier: 'UNRESTRICTED',
            concussionLevel: 0,
            fatigueBps: 2400,
            painBps: 0,
            refusalStrainBps: 0,
            openWounds: [],
            bannedKineticVerbs: [],
            heldItems: ['item_founder_token'],
            wornGear: { head: 'gear_scavenger_hood' },
            slungItems: [],
            cachedItems: ['item_rusted_key'],
            timestampMs: 1700000000000,
        })

        expect(entity.entityId).toBe('char_bog')
        expect(entity.locationId).toBe('loc_the_warm_pipe')
        expect(entity.armsAvailable).toBe(2)
        expect(entity.heldItems).toContain('item_founder_token')
        expect(entity.wornGear['head']).toBe('gear_scavenger_hood')
        expect(entity.cachedItems).toContain('item_rusted_key')
    })

    it('performs bidirectional round-trip serialization between CompositeEntityState and EntityLiveDbRow', () => {
        const original: CompositeEntityState = {
            entityId: 'char_wart',
            locationId: 'loc_the_warm_pipe',
            q: 1,
            r: 0,
            armsAvailable: 1,
            legsAvailable: 2,
            locomotionTier: 'LIMPING',
            concussionLevel: 1,
            fatigueBps: 1800,
            painBps: 1200,
            refusalStrainBps: 500,
            openWounds: Object.freeze(['wnd_crushed_left_forearm']),
            bannedKineticVerbs: Object.freeze(['BIMANUAL_LIFT', 'CLIMB']),
            heldItems: Object.freeze([]),
            wornGear: Object.freeze({ torso: 'gear_canvas_smock' }),
            slungItems: Object.freeze(['item_grease_bucket']),
            cachedItems: Object.freeze([]),
            updatedAtMs: 1700000000000,
        }

        const dbRow = serializeEntityToDbRow(original)
        expect(typeof dbRow.open_wounds_json).toBe('string')
        expect(dbRow.open_wounds_json).toBe('["wnd_crushed_left_forearm"]')
        expect(dbRow.banned_kinetic_verbs_json).toBe('["BIMANUAL_LIFT","CLIMB"]')

        const deserialized = deserializeDbRowToEntity(dbRow)
        expect(deserialized.entityId).toBe(original.entityId)
        expect(deserialized.locationId).toBe(original.locationId)
        expect(deserialized.armsAvailable).toBe(original.armsAvailable)
        expect(deserialized.locomotionTier).toBe(original.locomotionTier)
        expect(deserialized.painBps).toBe(original.painBps)
        expect(deserialized.openWounds).toEqual(original.openWounds)
        expect(deserialized.bannedKineticVerbs).toEqual(original.bannedKineticVerbs)
        expect(deserialized.wornGear).toEqual(original.wornGear)
    })

    it('upserts composite entity into in-memory model and persists to 02.database.unit', async () => {
        const mockDbOps: any[] = []
        const mockState: any = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType === '[Database action] Exec Batch Database') {
                    mockDbOps.push(...payload.dat.operations)
                    return { databaseBit: { val: 1 } }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await upsertEntityLiveAction(
            model,
            {
                idx: 'upsert-bog',
                dat: {
                    assembleParams: {
                        entityId: 'char_bog',
                        locationId: 'loc_the_warm_pipe',
                        q: 0,
                        r: 0,
                        armsAvailable: 2,
                        legsAvailable: 2,
                        locomotionTier: 'UNRESTRICTED',
                        heldItems: ['item_founder_token'],
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(model.entities.has('char_bog')).toBe(true)
        const bog = model.entities.get('char_bog')!
        expect(bog.heldItems).toContain('item_founder_token')

        expect(mockDbOps).toHaveLength(1)
        expect(mockDbOps[0].table).toBe('entities_live')
        expect(mockDbOps[0].key).toBe('char_bog')
        expect(mockDbOps[0].record.entity_id).toBe('char_bog')
    })

    it('queries and retrieves live entities by entityId and filters by locationId', async () => {
        model.entities.set(
            'char_bog',
            assembleCompositeEntity({
                entityId: 'char_bog',
                locationId: 'loc_the_warm_pipe',
            }),
        )
        model.entities.set(
            'char_wart',
            assembleCompositeEntity({
                entityId: 'char_wart',
                locationId: 'loc_culvert_junction',
            }),
        )

        // Query by location
        const slvLocation = vi.fn()
        await listEntitiesByLocationAction(
            model,
            { idx: 'list-pipe', dat: { locationId: 'loc_the_warm_pipe' }, slv: slvLocation },
            {} as any,
        )

        expect(slvLocation).toHaveBeenCalled()
        const pipeEntities = slvLocation.mock.calls[0][0].entities as CompositeEntityState[]
        expect(pipeEntities).toHaveLength(1)
        expect(pipeEntities[0].entityId).toBe('char_bog')

        // Query by ID
        const slvGet = vi.fn()
        await getEntityLiveAction(
            model,
            { idx: 'get-wart', dat: { entityId: 'char_wart' }, slv: slvGet },
            {} as any,
        )

        expect(slvGet).toHaveBeenCalled()
        const wart = slvGet.mock.calls[0][0].entity as CompositeEntityState
        expect(wart.entityId).toBe('char_wart')
    })

    it('hydrates all entities from 02.database.unit into memory cache', async () => {
        const storedRows = [
            serializeEntityToDbRow(
                assembleCompositeEntity({ entityId: 'char_bog', locationId: 'loc_the_warm_pipe' }),
            ),
            serializeEntityToDbRow(
                assembleCompositeEntity({ entityId: 'char_wart', locationId: 'loc_the_warm_pipe' }),
            ),
        ]

        const mockState: any = {
            hunt: vi.fn(async (actionType: string) => {
                if (actionType === '[Database action] Query Database') {
                    return { databaseBit: { val: 2, dat: { records: storedRows } } }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await hydrateAllEntitiesAction(model, { idx: 'hydrate', slv }, mockState)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                entBit: expect.objectContaining({ val: 2, idx: 'hydrate-all-entities-pass' }),
            }),
        )
        expect(model.entities.size).toBe(2)
        expect(model.entities.has('char_bog')).toBe(true)
        expect(model.entities.has('char_wart')).toBe(true)
    })

    it('routes UPSERT_ENTITY_LIVE cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: UPSERT_ENTITY_LIVE,
                bale: {
                    idx: 'reducer-upsert',
                    dat: {
                        assembleParams: {
                            entityId: 'char_bog',
                            locationId: 'loc_the_warm_pipe',
                        },
                    },
                    slv,
                } as any,
            },
            { hunt: async () => ({ databaseBit: { val: 1 } }) } as any,
        )) as EntityModel

        expect(result).toBeInstanceOf(EntityModel)
        expect(slv).toHaveBeenCalled()
    })
})

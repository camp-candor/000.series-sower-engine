import type { EntityModel } from '../entity.model'
import type EntityBit from '../fce/entity.bit'
import type State from '../../99.core/state'
import type {
    CompositeEntityState,
    EntityLiveDbRow,
    UpsertEntityPayload,
} from '../fce/entity.interface'
import type { SomaticTraumaState } from '../../18.trauma.unit/fce/trauma.interface'
import type { EntityInventoryState } from '../../07.inventory.unit/fce/inventory.interface'
import type { ActorSpatialPosition } from '../../11.movement.unit/fce/movement.interface'
import type { SomaticMask } from '../../19.wounds.unit/fce/wounds.interface'
import { canonicalizeStateJson } from '../../16.state.unit/buz/state.buzz'

export const canonicalJson = (value: unknown): string => {
    return canonicalizeStateJson(value)
}

const logConsole = async (ste: State, src: string) => {
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Clean degradation for isolated test environments
        }
    }
}

export const assembleCompositeEntity = (params: {
    entityId: string
    locationId?: string
    q?: number
    r?: number
    somatic?: Partial<SomaticTraumaState> & {
        armsAvailable?: number
        legsAvailable?: number
        locomotionTier?: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED' | string
        concussionLevel?: number
        fatigueBps?: number
        painBps?: number
        refusalStrainBps?: number
    }
    mask?: Partial<SomaticMask> & {
        openWounds?: string[]
        bannedKineticVerbs?: string[]
    }
    inventory?: Partial<EntityInventoryState> & {
        heldItems?: string[]
        wornGear?: Record<string, string>
        slungItems?: string[]
        cachedItems?: string[]
    }
    position?: Partial<ActorSpatialPosition>
    timestampMs?: number
}): CompositeEntityState => {
    const {
        entityId,
        locationId,
        q,
        r,
        somatic,
        mask,
        inventory,
        position,
        timestampMs,
    } = params

    return {
        entityId,
        locationId: locationId || position?.locationId || 'loc_origin_hub',
        q: q ?? position?.coord?.q ?? 0,
        r: r ?? position?.coord?.r ?? 0,
        armsAvailable: somatic?.armsAvailable ?? 2,
        legsAvailable: somatic?.legsAvailable ?? 2,
        locomotionTier: somatic?.locomotionTier || 'UNRESTRICTED',
        concussionLevel: somatic?.concussionLevel ?? 0,
        fatigueBps: somatic?.fatigueBps ?? 0,
        painBps: somatic?.painBps ?? 0,
        refusalStrainBps: somatic?.refusalStrainBps ?? 0,
        openWounds: (mask?.openWounds ? [...mask.openWounds] : []).sort(),
        bannedKineticVerbs: (mask?.bannedKineticVerbs
            ? [...mask.bannedKineticVerbs]
            : []
        ).sort(),
        heldItems: inventory?.heldItems ? [...inventory.heldItems] : [],
        wornGear: inventory?.wornGear ? { ...inventory.wornGear } : {},
        slungItems: inventory?.slungItems ? [...inventory.slungItems] : [],
        cachedItems: inventory?.cachedItems ? [...inventory.cachedItems] : [],
        updatedAtMs: timestampMs ?? Date.now(),
    }
}

export const serializeEntityToDbRow = (
    entity: CompositeEntityState,
): EntityLiveDbRow => ({
    entity_id: entity.entityId,
    location_id: entity.locationId,
    coord_q: entity.q,
    coord_r: entity.r,
    q: entity.q,
    r: entity.r,
    arms_available: entity.armsAvailable,
    legs_available: entity.legsAvailable,
    locomotion_tier: entity.locomotionTier,
    concussion_level: entity.concussionLevel,
    fatigue_bps: entity.fatigueBps,
    pain_bps: entity.painBps,
    refusal_strain_bps: entity.refusalStrainBps,
    open_wounds_json: canonicalizeStateJson(entity.openWounds),
    banned_kinetic_verbs_json: canonicalizeStateJson(entity.bannedKineticVerbs),
    held_items_json: canonicalizeStateJson(entity.heldItems),
    worn_gear_json: canonicalizeStateJson(entity.wornGear),
    slung_items_json: canonicalizeStateJson(entity.slungItems),
    cached_items_json: canonicalizeStateJson(entity.cachedItems),
    updated_at_ms: entity.updatedAtMs,
})

export const deserializeDbRowToEntity = (
    row: EntityLiveDbRow | any,
): CompositeEntityState => ({
    entityId: row.entity_id,
    locationId: row.location_id,
    q: row.coord_q !== undefined ? row.coord_q : (row.q ?? 0),
    r: row.coord_r !== undefined ? row.coord_r : (row.r ?? 0),
    armsAvailable: row.arms_available,
    legsAvailable: row.legs_available,
    locomotionTier: (row.locomotion_tier as any) || 'UNRESTRICTED',
    concussionLevel: row.concussion_level,
    fatigueBps: row.fatigue_bps,
    painBps: row.pain_bps,
    refusalStrainBps: row.refusal_strain_bps,
    openWounds: JSON.parse(row.open_wounds_json || '[]'),
    bannedKineticVerbs: JSON.parse(row.banned_kinetic_verbs_json || '[]'),
    heldItems: JSON.parse(row.held_items_json || '[]'),
    wornGear: JSON.parse(row.worn_gear_json || '{}'),
    slungItems: JSON.parse(row.slung_items_json || '[]'),
    cachedItems: JSON.parse(row.cached_items_json || '[]'),
    updatedAtMs: row.updated_at_ms,
})

export const initEntity = (
    cpy: EntityModel,
    bal: EntityBit,
    _ste: State,
): EntityModel => {
    cpy.entities = {}
    if (bal?.slv) bal.slv({ entBit: { idx: 'init-entity', val: 0 } })
    return cpy
}

export const updateEntity = (
    cpy: EntityModel,
    bal: EntityBit,
    _ste: State,
): EntityModel => {
    if (bal?.slv) bal.slv({ entBit: { idx: 'update-entity' } })
    return cpy
}

export const upsertEntity = async (
    cpy: EntityModel,
    bal: EntityBit<UpsertEntityPayload | any>,
    ste: State,
): Promise<EntityModel> => {
    const payload =
        bal?.dat?.composite || (bal?.dat?.entityId ? bal.dat : undefined)
    if (!payload?.entityId) {
        if (bal?.slv)
            bal.slv({
                entBit: {
                    idx: 'upsert-entity-err',
                    src: 'MISSING_COMPOSITE',
                    val: -1,
                },
            })
        return cpy
    }

    cpy.entities[payload.entityId] = payload

    const persistToDb =
        bal?.dat?.persistToDb !== undefined ? bal.dat.persistToDb : true

    if (persistToDb && ste && typeof ste.hunt === 'function') {
        const row = serializeEntityToDbRow(payload)
        try {
            const res: any = await ste.hunt(
                '[Database action] Query Database',
                {
                    src: `INSERT INTO entities_live (
        entity_id, location_id, coord_q, coord_r, arms_available, legs_available,
        locomotion_tier, concussion_level, fatigue_bps, pain_bps, refusal_strain_bps,
        open_wounds_json, banned_kinetic_verbs_json, held_items_json, worn_gear_json,
        slung_items_json, cached_items_json, updated_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity_id) DO UPDATE SET
        location_id = excluded.location_id,
        coord_q = excluded.coord_q,
        coord_r = excluded.coord_r,
        arms_available = excluded.arms_available,
        legs_available = excluded.legs_available,
        locomotion_tier = excluded.locomotion_tier,
        concussion_level = excluded.concussion_level,
        fatigue_bps = excluded.fatigue_bps,
        pain_bps = excluded.pain_bps,
        refusal_strain_bps = excluded.refusal_strain_bps,
        open_wounds_json = excluded.open_wounds_json,
        banned_kinetic_verbs_json = excluded.banned_kinetic_verbs_json,
        held_items_json = excluded.held_items_json,
        worn_gear_json = excluded.worn_gear_json,
        slung_items_json = excluded.slung_items_json,
        cached_items_json = excluded.cached_items_json,
        updated_at_ms = excluded.updated_at_ms`,
                    dat: [
                        row.entity_id,
                        row.location_id,
                        row.coord_q ?? row.q ?? 0,
                        row.coord_r ?? row.r ?? 0,
                        row.arms_available,
                        row.legs_available,
                        row.locomotion_tier,
                        row.concussion_level,
                        row.fatigue_bps,
                        row.pain_bps,
                        row.refusal_strain_bps,
                        row.open_wounds_json,
                        row.banned_kinetic_verbs_json,
                        row.held_items_json,
                        row.worn_gear_json,
                        row.slung_items_json,
                        row.cached_items_json,
                        row.updated_at_ms,
                    ],
                },
            )

            if (res?.err) {
                delete cpy.entities[payload.entityId]
                if (bal?.slv) {
                    bal.slv({
                        entBit: {
                            idx: 'upsert-entity-err',
                            src: payload.entityId,
                            val: -1,
                            dat: res.err,
                        },
                    })
                }
                throw new Error(res.err)
            }

            await logConsole(
                ste,
                `>> [ENTITY:UPSERT] Persisted '${payload.entityId}' to entities_live | Room: ${payload.locationId} (${payload.q}, ${payload.r})`,
            )
        } catch (err: any) {
            delete cpy.entities[payload.entityId]
            if (bal?.slv) {
                bal.slv({
                    entBit: {
                        idx: 'upsert-entity-err',
                        src: payload.entityId,
                        val: -1,
                        dat: String(err?.message || err) as any,
                    },
                })
            }
            throw err
        }
    }

    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: 'upsert-entity-ok',
                src: payload.entityId,
                dat: payload as any,
            },
        })
    }
    return cpy
}

export const getEntity = async (
    cpy: EntityModel,
    bal: EntityBit<{ entityId?: string } | any>,
    ste: State,
): Promise<EntityModel> => {
    const entityId = bal?.dat?.entityId || bal?.src
    if (!entityId) {
        if (bal?.slv)
            bal.slv({
                entBit: {
                    idx: 'get-entity-err',
                    src: 'MISSING_ENTITY_ID',
                    val: -1,
                },
            })
        return cpy
    }

    let entity = cpy.entities[entityId]

    // If absent from in-memory cache, attempt fetch from SQLite entities_live
    if (!entity && ste && typeof ste.hunt === 'function') {
        const res: any = await ste
            .hunt('[Database action] Query Database', {
                src: 'SELECT * FROM entities_live WHERE entity_id = ?',
                dat: [entityId],
            })
            .catch(() => null)

        const row = (res?.datBit?.lst || [])[0]
        if (row) {
            entity = deserializeDbRowToEntity(row)
            cpy.entities[entityId] = entity
        }
    }

    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: entity ? 'get-entity-ok' : 'get-entity-not-found',
                src: entityId,
                val: entity ? 0 : -1,
                dat: entity as any,
            },
        })
    }
    return cpy
}

export const listEntitiesByLocation = async (
    cpy: EntityModel,
    bal: EntityBit<{ locationId?: string } | any>,
    ste: State,
): Promise<EntityModel> => {
    const locationId = bal?.dat?.locationId || bal?.src || ''

    // Query SQLite directly for complete spatial authority
    let matched: CompositeEntityState[] = []

    if (ste && typeof ste.hunt === 'function') {
        const res: any = await ste
            .hunt('[Database action] Query Database', {
                src: 'SELECT * FROM entities_live WHERE location_id = ? ORDER BY entity_id ASC',
                dat: [locationId],
            })
            .catch(() => null)

        const rows: EntityLiveDbRow[] = res?.datBit?.lst || []
        if (rows.length > 0) {
            matched = rows.map((r) => {
                const ent = deserializeDbRowToEntity(r)
                cpy.entities[ent.entityId] = ent
                return ent
            })
        }
    }

    // Fallback to in-memory matching if database query yielded empty or failed
    if (matched.length === 0) {
        matched = Object.values(cpy.entities)
            .filter((e) => e.locationId === locationId)
            .sort((a, b) => a.entityId.localeCompare(b.entityId))
    }

    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: 'list-entities-by-location-ok',
                src: locationId,
                val: matched.length,
                lst: matched as any[],
                dat: matched as any,
            },
        })
    }
    return cpy
}

export const hydrateAllEntities = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste: State,
): Promise<EntityModel> => {
    let count = 0
    if (ste && typeof ste.hunt === 'function') {
        const res: any = await ste
            .hunt('[Database action] Query Database', {
                src: 'SELECT * FROM entities_live ORDER BY entity_id ASC',
            })
            .catch(() => null)

        const rows: EntityLiveDbRow[] = res?.datBit?.lst || []
        count = rows.length
        for (const r of rows) {
            const ent = deserializeDbRowToEntity(r)
            cpy.entities[ent.entityId] = ent
        }

        await logConsole(
            ste,
            `>> [ENTITY:HYDRATE] Hydrated ${rows.length} entity record(s) from SQLite entities_live.`,
        )
    }

    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: 'hydrate-all-entities-ok',
                val: count || Object.keys(cpy.entities).length,
                dat: cpy.entities as any,
            },
        })
    }
    return cpy
}

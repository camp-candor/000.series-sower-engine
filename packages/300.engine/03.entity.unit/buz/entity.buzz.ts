/**
 * 03.entity.unit - Entity Buzz Business Logic
 * Multi-vector assembly, RFC 8785 canonical serialization, and entities_live projection.
 */
import { EntityModel } from '../entity.model.js'
import type EntityBit from '../fce/entity.bit.js'
import type {
    CompositeEntityState,
    EntityLiveDbRow,
    AssembleEntityParams,
} from '../fce/entity.interface.js'
import { canonicalizeJson } from '../../04.envelope.unit/envelope.buzzer.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function serializeEntityToDbRow(
    state: CompositeEntityState,
): EntityLiveDbRow {
    return {
        entity_id: state.entityId,
        location_id: state.locationId,
        q: state.q,
        r: state.r,
        arms_available: state.armsAvailable,
        legs_available: state.legsAvailable,
        locomotion_tier: state.locomotionTier,
        concussion_level: state.concussionLevel,
        fatigue_bps: state.fatigueBps,
        pain_bps: state.painBps,
        refusal_strain_bps: state.refusalStrainBps,
        open_wounds_json: canonicalizeJson(state.openWounds),
        banned_kinetic_verbs_json: canonicalizeJson(state.bannedKineticVerbs),
        held_items_json: canonicalizeJson(state.heldItems),
        worn_gear_json: canonicalizeJson(state.wornGear),
        slung_items_json: canonicalizeJson(state.slungItems),
        cached_items_json: canonicalizeJson(state.cachedItems),
        updated_at_ms: state.updatedAtMs,
    }
}

export function deserializeDbRowToEntity(
    row: EntityLiveDbRow,
): CompositeEntityState {
    let openWounds: string[] = []
    let bannedKineticVerbs: string[] = []
    let heldItems: string[] = []
    let wornGear: Record<string, string> = {}
    let slungItems: string[] = []
    let cachedItems: string[] = []

    try {
        openWounds = JSON.parse(row.open_wounds_json || '[]')
    } catch {
        openWounds = []
    }

    try {
        bannedKineticVerbs = JSON.parse(row.banned_kinetic_verbs_json || '[]')
    } catch {
        bannedKineticVerbs = []
    }

    try {
        heldItems = JSON.parse(row.held_items_json || '[]')
    } catch {
        heldItems = []
    }

    try {
        wornGear = JSON.parse(row.worn_gear_json || '{}')
    } catch {
        wornGear = {}
    }

    try {
        slungItems = JSON.parse(row.slung_items_json || '[]')
    } catch {
        slungItems = []
    }

    try {
        cachedItems = JSON.parse(row.cached_items_json || '[]')
    } catch {
        cachedItems = []
    }

    return {
        entityId: row.entity_id,
        locationId: row.location_id,
        q: row.q,
        r: row.r,
        armsAvailable: row.arms_available,
        legsAvailable: row.legs_available,
        locomotionTier: row.locomotion_tier as any,
        concussionLevel: row.concussion_level,
        fatigueBps: row.fatigue_bps,
        painBps: row.pain_bps,
        refusalStrainBps: row.refusal_strain_bps,
        openWounds: Object.freeze(openWounds),
        bannedKineticVerbs: Object.freeze(bannedKineticVerbs),
        heldItems: Object.freeze(heldItems),
        wornGear: Object.freeze(wornGear),
        slungItems: Object.freeze(slungItems),
        cachedItems: Object.freeze(cachedItems),
        updatedAtMs: row.updated_at_ms,
    }
}

export function assembleCompositeEntity(
    params: AssembleEntityParams,
    existing?: CompositeEntityState,
): CompositeEntityState {
    const ts = params.timestampMs || existing?.updatedAtMs || 1700000000000
    return {
        entityId: params.entityId,
        locationId:
            params.locationId ?? existing?.locationId ?? 'loc_the_warm_pipe',
        q: params.q ?? existing?.q ?? 0,
        r: params.r ?? existing?.r ?? 0,
        armsAvailable: params.armsAvailable ?? existing?.armsAvailable ?? 2,
        legsAvailable: params.legsAvailable ?? existing?.legsAvailable ?? 2,
        locomotionTier:
            params.locomotionTier ?? existing?.locomotionTier ?? 'UNRESTRICTED',
        concussionLevel:
            params.concussionLevel ?? existing?.concussionLevel ?? 0,
        fatigueBps: params.fatigueBps ?? existing?.fatigueBps ?? 0,
        painBps: params.painBps ?? existing?.painBps ?? 0,
        refusalStrainBps:
            params.refusalStrainBps ?? existing?.refusalStrainBps ?? 0,
        openWounds: Object.freeze(
            params.openWounds ?? existing?.openWounds ?? [],
        ),
        bannedKineticVerbs: Object.freeze(
            params.bannedKineticVerbs ?? existing?.bannedKineticVerbs ?? [],
        ),
        heldItems: Object.freeze(params.heldItems ?? existing?.heldItems ?? []),
        wornGear: Object.freeze(params.wornGear ?? existing?.wornGear ?? {}),
        slungItems: Object.freeze(
            params.slungItems ?? existing?.slungItems ?? [],
        ),
        cachedItems: Object.freeze(
            params.cachedItems ?? existing?.cachedItems ?? [],
        ),
        updatedAtMs: ts,
    }
}

export const initEntity = async (
    cpy: EntityModel,
    bal?: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    cpy.entities.clear()

    await emitConsole(
        ste,
        '>> [ENTITY:INIT] [OK] Multi-vector entity aggregation unit online.',
    )

    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: 'init-entity-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateEntity = (
    cpy: EntityModel,
    bal?: EntityBit,
    _ste?: State,
): EntityModel => {
    if (bal?.slv) {
        bal.slv({
            entBit: {
                idx: 'update-entity-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const assembleEntityAction = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    const params = bal.dat?.assembleParams
    if (!params || !params.entityId) {
        const err = '[INVALID_ASSEMBLE_PARAMS] Missing entityId'
        if (bal.slv) {
            bal.slv({
                entBit: {
                    idx: 'assemble-entity-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const current = cpy.entities.get(params.entityId)
    const assembled = assembleCompositeEntity(params, current)
    cpy.entities.set(params.entityId, assembled)

    await emitConsole(
        ste,
        `>> [ENTITY:ASSEMBLE] [${assembled.entityId}] Unified 4-vector state assembled at [${assembled.locationId}] (${assembled.q}, ${assembled.r}).`,
    )

    if (bal.slv) {
        bal.slv({
            entity: assembled,
            entBit: {
                idx: 'assemble-entity-pass',
                val: 1,
                dat: { entity: assembled },
            },
        })
    }

    return cpy
}

export const upsertEntityLiveAction = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    let entity = bal.dat?.entity
    if (!entity && bal.dat?.assembleParams) {
        const existing = cpy.entities.get(bal.dat.assembleParams.entityId)
        entity = assembleCompositeEntity(bal.dat.assembleParams, existing)
    }

    if (!entity || !entity.entityId) {
        const err = '[INVALID_UPSERT_ENTITY] Missing entity or entityId'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                entBit: {
                    idx: 'upsert-entity-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    cpy.entities.set(entity.entityId, entity)
    const row = serializeEntityToDbRow(entity)

    // Execute atomic upsert against 02.database.unit entities_live
    if (ste && typeof ste.hunt === 'function') {
        const dbRes: any = await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'entities_live',
                        action: 'INSERT', // Database unit uses INSERT OR REPLACE / ON CONFLICT
                        key: entity.entityId,
                        record: row,
                    },
                ],
            },
        })

        if (dbRes?.databaseBit?.val === 0) {
            const err =
                dbRes?.databaseBit?.dat?.error || 'Database upsert rejected'
            throw new Error(`[ENTITY_DB_UPSERT_FAILURE] ${err}`)
        }
    }

    await emitConsole(
        ste,
        `>> [ENTITY:UPSERT] Persisted '${entity.entityId}' to entities_live | Room: ${entity.locationId} (${entity.q}, ${entity.r}) | Arms: ${entity.armsAvailable}/2 | Tier: [${entity.locomotionTier}]`,
    )

    if (bal.slv) {
        bal.slv({
            entity,
            dbRow: row,
            entBit: {
                idx: 'upsert-entity-pass',
                val: 1,
                dat: { entity, dbRow: row },
            },
        })
    }

    return cpy
}

export const getEntityLiveAction = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    const entityId = bal.dat?.entityId || bal.src

    if (!entityId) {
        if (bal.slv) {
            bal.slv({
                entBit: {
                    idx: 'get-entity-fail',
                    val: 0,
                    dat: { error: '[MISSING_ENTITY_ID] entityId required' },
                },
            })
        }
        return cpy
    }

    let found = cpy.entities.get(entityId)

    // If not in local model cache, query 02.database.unit
    if (!found && ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'entities_live', key: entityId },
        })

        if (
            queryRes?.databaseBit?.val === 1 &&
            queryRes?.databaseBit?.dat?.record
        ) {
            found = deserializeDbRowToEntity(queryRes.databaseBit.dat.record)
            cpy.entities.set(entityId, found)
        }
    }

    if (found) {
        await emitConsole(
            ste,
            `>> [ENTITY:GET] Loaded '${found.entityId}' (${found.locomotionTier}, ${found.armsAvailable} Arm(s), Pain: ${found.painBps} bps)`,
        )
    }

    if (bal.slv) {
        bal.slv({
            entity: found,
            entBit: {
                idx: found ? 'get-entity-pass' : 'get-entity-not-found',
                val: found ? 1 : 0,
                dat: { entity: found },
            },
        })
    }

    return cpy
}

export const listEntitiesByLocationAction = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    const locationId = bal.dat?.locationId || bal.src

    let allEntities = Array.from(cpy.entities.values())

    // If cache is empty, query from 02.database.unit
    if (allEntities.length === 0 && ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'entities_live' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const r of queryRes.databaseBit.dat.records) {
                const ent = deserializeDbRowToEntity(r)
                cpy.entities.set(ent.entityId, ent)
            }
            allEntities = Array.from(cpy.entities.values())
        }
    }

    const filtered = locationId
        ? allEntities.filter((e) => e.locationId === locationId)
        : allEntities

    if (bal.slv) {
        bal.slv({
            entities: filtered,
            entBit: {
                idx: 'list-entities-pass',
                val: filtered.length,
                dat: { entities: filtered, rowCount: filtered.length },
                lst: filtered,
            },
        })
    }

    return cpy
}

export const hydrateAllEntitiesAction = async (
    cpy: EntityModel,
    bal: EntityBit,
    ste?: State,
): Promise<EntityModel> => {
    let hydratedCount = 0

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'entities_live' },
        })

        if (queryRes?.databaseBit?.dat?.records) {
            cpy.entities.clear()
            for (const r of queryRes.databaseBit.dat.records) {
                const ent = deserializeDbRowToEntity(r)
                cpy.entities.set(ent.entityId, ent)
                hydratedCount++
            }
        }
    }

    await emitConsole(
        ste,
        `>> [ENTITY:HYDRATE] [OK] Hydrated ${hydratedCount} entity records from entities_live.`,
    )

    if (bal.slv) {
        bal.slv({
            entBit: {
                idx: 'hydrate-all-entities-pass',
                val: hydratedCount,
                dat: { rowCount: hydratedCount },
            },
        })
    }

    return cpy
}

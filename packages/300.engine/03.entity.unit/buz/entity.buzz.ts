import type { EntityModel } from '../entity.model';
import type EntityBit from '../fce/entity.bit';
import type State from '../../99.core/state';
import type { CompositeEntityState, EntityLiveDbRow } from '../fce/entity.interface';
import type { SomaticTraumaState } from '../../18.trauma.unit/fce/trauma.interface';
import type { EntityInventoryState } from '../../07.inventory.unit/fce/inventory.interface';
import type { ActorSpatialPosition } from '../../11.movement.unit/fce/movement.interface';
import type { SomaticMask } from '../../19.wounds.unit/fce/wounds.interface';

export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const sortedObj: Record<string, any> = {};
  Object.keys(value as any)
    .sort()
    .forEach((k) => {
      sortedObj[k] = (value as any)[k];
    });
  return JSON.stringify(sortedObj);
};

export const assembleCompositeEntity = (params: {
  entityId: string;
  somatic?: Partial<SomaticTraumaState>;
  mask?: Partial<SomaticMask>;
  inventory?: Partial<EntityInventoryState>;
  position?: Partial<ActorSpatialPosition>;
  timestampMs?: number;
}): CompositeEntityState => {
  const { entityId, somatic, mask, inventory, position, timestampMs } = params;

  return {
    entityId,
    locationId: position?.locationId || 'loc_origin_hub',
    q: position?.coord?.q ?? 0,
    r: position?.coord?.r ?? 0,
    armsAvailable: somatic?.armsAvailable ?? 2,
    legsAvailable: somatic?.legsAvailable ?? 2,
    locomotionTier: somatic?.locomotionTier || 'UNRESTRICTED',
    concussionLevel: somatic?.concussionLevel ?? 0,
    fatigueBps: somatic?.fatigueBps ?? 0,
    painBps: somatic?.painBps ?? 0,
    refusalStrainBps: somatic?.refusalStrainBps ?? 0,
    openWounds: (mask?.openWounds ? [...mask.openWounds] : []).sort(),
    bannedKineticVerbs: (mask?.bannedKineticVerbs ? [...mask.bannedKineticVerbs] : []).sort(),
    heldItems: inventory?.heldItems ? [...inventory.heldItems] : [],
    wornGear: inventory?.wornGear ? { ...inventory.wornGear } : {},
    slungItems: inventory?.slungItems ? [...inventory.slungItems] : [],
    cachedItems: inventory?.cachedItems ? [...inventory.cachedItems] : [],
    updatedAtMs: timestampMs ?? Date.now(),
  };
};

export const serializeEntityToDbRow = (entity: CompositeEntityState): EntityLiveDbRow => ({
  entity_id: entity.entityId,
  location_id: entity.locationId,
  q: entity.q,
  r: entity.r,
  arms_available: entity.armsAvailable,
  legs_available: entity.legsAvailable,
  locomotion_tier: entity.locomotionTier,
  concussion_level: entity.concussionLevel,
  fatigue_bps: entity.fatigueBps,
  pain_bps: entity.painBps,
  refusal_strain_bps: entity.refusalStrainBps,
  open_wounds_json: canonicalJson(entity.openWounds),
  banned_kinetic_verbs_json: canonicalJson(entity.bannedKineticVerbs),
  held_items_json: canonicalJson(entity.heldItems),
  worn_gear_json: canonicalJson(entity.wornGear),
  slung_items_json: canonicalJson(entity.slungItems),
  cached_items_json: canonicalJson(entity.cachedItems),
  updated_at_ms: entity.updatedAtMs,
});

export const deserializeDbRowToEntity = (row: EntityLiveDbRow): CompositeEntityState => ({
  entityId: row.entity_id,
  locationId: row.location_id,
  q: row.q,
  r: row.r,
  armsAvailable: row.arms_available,
  legsAvailable: row.legs_available,
  locomotionTier: row.locomotion_tier,
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
});

export const initEntity = (cpy: EntityModel, bal: EntityBit, _ste: State): EntityModel => {
  cpy.entities = {};
  if (bal?.slv) bal.slv({ entBit: { idx: 'init-entity', val: 0 } });
  return cpy;
};

export const updateEntity = (cpy: EntityModel, bal: EntityBit, _ste: State): EntityModel => {
  if (bal?.slv) bal.slv({ entBit: { idx: 'update-entity' } });
  return cpy;
};

export const upsertEntity = (
  cpy: EntityModel,
  bal: EntityBit<any>,
  _ste: State
): EntityModel => {
  const payload = bal?.dat?.composite || bal?.dat;
  if (!payload?.entityId) {
    if (bal?.slv) bal.slv({ entBit: { idx: 'upsert-entity-err', src: 'MISSING_COMPOSITE', val: -1 } });
    return cpy;
  }

  cpy.entities[payload.entityId] = payload;

  if (bal?.slv) {
    bal.slv({
      entBit: {
        idx: 'upsert-entity-ok',
        src: payload.entityId,
        dat: payload,
      },
    });
  }
  return cpy;
};

export const getEntity = (
  cpy: EntityModel,
  bal: EntityBit<any>,
  _ste: State
): EntityModel => {
  const entityId = bal?.dat?.entityId || bal?.src;
  const entity = entityId ? cpy.entities[entityId] : undefined;

  if (bal?.slv) {
    bal.slv({
      entBit: {
        idx: entity ? 'get-entity-ok' : 'get-entity-not-found',
        src: entityId,
        val: entity ? 0 : -1,
        dat: entity,
      },
    });
  }
  return cpy;
};

export const listEntitiesByLocation = (
  cpy: EntityModel,
  bal: EntityBit<any>,
  _ste: State
): EntityModel => {
  const locationId = bal?.dat?.locationId || bal?.src || '';
  const matched = Object.values(cpy.entities).filter((e) => e.locationId === locationId);

  if (bal?.slv) {
    bal.slv({
      entBit: {
        idx: 'list-entities-by-location-ok',
        src: locationId,
        val: matched.length,
        lst: matched.map((m) => m.entityId),
        dat: matched,
      },
    });
  }
  return cpy;
};
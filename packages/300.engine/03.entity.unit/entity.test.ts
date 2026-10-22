import { describe, it, expect } from 'vitest';
import {
  assembleCompositeEntity,
  serializeEntityToDbRow,
  deserializeDbRowToEntity,
  upsertEntity,
  listEntitiesByLocation,
} from './buz/entity.buzz';
import { EntityModel } from './entity.model';

describe('03.entity.unit - Composite Entity Assembly & Projection', () => {
  it('assembles composite entity across somatic, logistical, and spatial vectors', () => {
    const composite = assembleCompositeEntity({
      entityId: 'char_wart',
      position: { locationId: 'loc_warm_pipe', coord: { q: 10, r: 2, s: -12 } },
      somatic: { armsAvailable: 1, legsAvailable: 2, locomotionTier: 'LIMPING', painBps: 6000 },
      mask: { openWounds: ['SEVERED_LEFT_ARM'], bannedKineticVerbs: ['BIMANUAL_LIFT', 'CLIMB'] },
      inventory: { heldItems: ['item_iron_knife'], wornGear: { belt: 'item_holster' } },
      timestampMs: 1000,
    });

    expect(composite.entityId).toBe('char_wart');
    expect(composite.locationId).toBe('loc_warm_pipe');
    expect(composite.q).toBe(10);
    expect(composite.r).toBe(2);
    expect(composite.armsAvailable).toBe(1);
    expect(composite.locomotionTier).toBe('LIMPING');
    expect(composite.openWounds).toContain('SEVERED_LEFT_ARM');
    expect(composite.bannedKineticVerbs).toContain('BIMANUAL_LIFT');
    expect(composite.heldItems).toContain('item_iron_knife');

    const dbRow = serializeEntityToDbRow(composite);
    expect(dbRow.entity_id).toBe('char_wart');
    expect(dbRow.open_wounds_json).toBe(JSON.stringify(['SEVERED_LEFT_ARM']));
    expect(dbRow.held_items_json).toBe(JSON.stringify(['item_iron_knife']));

    const restored = deserializeDbRowToEntity(dbRow);
    expect(restored).toEqual(composite);
  });

  it('manages in-memory entities and filters by locationId', () => {
    const model = new EntityModel();
    const e1 = assembleCompositeEntity({
      entityId: 'char_bog',
      position: { locationId: 'loc_warm_pipe', coord: { q: 0, r: 0, s: 0 } },
    });
    const e2 = assembleCompositeEntity({
      entityId: 'char_wart',
      position: { locationId: 'loc_warm_pipe', coord: { q: 1, r: 0, s: -1 } },
    });
    const e3 = assembleCompositeEntity({
      entityId: 'char_spleen',
      position: { locationId: 'loc_culvert', coord: { q: 5, r: 5, s: -10 } },
    });

    upsertEntity(model, { idx: 'u1', dat: { composite: e1 } }, {} as any);
    upsertEntity(model, { idx: 'u2', dat: { composite: e2 } }, {} as any);
    upsertEntity(model, { idx: 'u3', dat: { composite: e3 } }, {} as any);

    let listResult: any;
    listEntitiesByLocation(
      model,
      { idx: 'list-pipe', dat: { locationId: 'loc_warm_pipe' }, slv: (r) => { listResult = r.entBit.dat; } },
      {} as any
    );

    expect(listResult.length).toBe(2);
    expect(listResult.map((x: any) => x.entityId)).toEqual(['char_bog', 'char_wart']);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateModel } from './state.model.js';
import {
  recursiveDeepFreeze,
  computeWorkingStateHash,
  hydrateState,
} from './buz/state.buzz.js';
import * as ActDbs from '../02.database.unit/database.action.js';

describe('16.state.unit :: Cryptographic State Verification (Phase 7)', () => {
  let model: StateModel;

  beforeEach(() => {
    model = new StateModel();
  });

  it('computes deterministic RFC 8785 SHA-256 state hash regardless of map key insertion order', () => {
    const rawA = {
      schemaVersion: '1.0.0' as const,
      seriesSlug: 'wiregrass-basin',
      tick: 0,
      entities: {
        char_wart: { entityId: 'char_wart', locationId: 'loc_pipe', q: 1, r: 0, armsAvailable: 2, legsAvailable: 2, locomotionTier: 'UNRESTRICTED' as const, concussionLevel: 0, wounds: [], heldItems: [], wornGear: [], slungItems: [], updatedAtMs: 100 },
        char_bog: { entityId: 'char_bog', locationId: 'loc_pipe', q: 0, r: 0, armsAvailable: 2, legsAvailable: 2, locomotionTier: 'UNRESTRICTED' as const, concussionLevel: 0, wounds: [], heldItems: [], wornGear: [], slungItems: [], updatedAtMs: 100 },
      },
      strings: {},
      grievances: {},
      clocks: {},
      beliefs: {},
      details: {},
    };

    const rawB = {
      seriesSlug: 'wiregrass-basin',
      schemaVersion: '1.0.0' as const,
      tick: 0,
      clocks: {},
      details: {},
      beliefs: {},
      grievances: {},
      strings: {},
      entities: {
        char_bog: { entityId: 'char_bog', locationId: 'loc_pipe', q: 0, r: 0, armsAvailable: 2, legsAvailable: 2, locomotionTier: 'UNRESTRICTED' as const, concussionLevel: 0, wounds: [], heldItems: [], wornGear: [], slungItems: [], updatedAtMs: 100 },
        char_wart: { entityId: 'char_wart', locationId: 'loc_pipe', q: 1, r: 0, armsAvailable: 2, legsAvailable: 2, locomotionTier: 'UNRESTRICTED' as const, concussionLevel: 0, wounds: [], heldItems: [], wornGear: [], slungItems: [], updatedAtMs: 100 },
      },
    };

    const hashA = computeWorkingStateHash(rawA);
    const hashB = computeWorkingStateHash(rawB);

    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    expect(hashA).toBe(hashB);
  });

  it('enforces recursive deep-freeze immutability and rejects mutation attempts with TypeError', () => {
    const mutableState = {
      schemaVersion: '1.0.0' as const,
      seriesSlug: 'wiregrass-basin',
      tick: 0,
      stateHash: 'a'.repeat(64),
      entities: {
        char_bog: {
          entityId: 'char_bog',
          heldItems: ['item_founder_token'],
        },
      },
    };

    const frozen = recursiveDeepFreeze(mutableState);

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.entities)).toBe(true);
    expect(Object.isFrozen(frozen.entities.char_bog)).toBe(true);
    expect(Object.isFrozen(frozen.entities.char_bog.heldItems)).toBe(true);

    expect(() => {
      (frozen.entities.char_bog as any).entityId = 'tampered';
    }).toThrow(TypeError);

    expect(() => {
      (frozen.entities.char_bog.heldItems as any).push('item_illegal');
    }).toThrow(TypeError);
  });

  it('hydrates 4-vector state from database and seals active working state', async () => {
    const mockEntities = [
      {
        entity_id: 'char_bog',
        location_id: 'loc_hub',
        q: 0,
        r: 0,
        arms_available: 2,
        legs_available: 2,
        locomotion_tier: 'UNRESTRICTED',
        concussion_level: 0,
        wounds_json: '[]',
        held_items_json: '["item_token"]',
        worn_gear_json: '[]',
        slung_items_json: '[]',
        updated_at_ms: 1000,
      },
    ];

    const mockHunt = vi.fn().mockImplementation((action: string, bale: any) => {
      if (action === ActDbs.QUERY_DATABASE) {
        if (bale.dat.query.includes('entities_live')) {
          return Promise.resolve({ databaseBit: { dat: { rows: mockEntities } } });
        }
        return Promise.resolve({ databaseBit: { dat: { rows: [] } } });
      }
      return Promise.resolve({});
    });

    const mockState: any = { hunt: mockHunt };

    const updated = await hydrateState(
      model,
      {
        idx: 'hydrate-01',
        dat: { seriesSlug: 'wiregrass-basin', tick: 0 },
      },
      mockState,
    );

    expect(updated.workingState).toBeDefined();
    expect(updated.activeStateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(updated.workingState?.entities.char_bog.heldItems).toContain('item_token');
    expect(Object.isFrozen(updated.workingState)).toBe(true);
  });

  it('fails closed when computed hash diverges from expectedHash', async () => {
    const mockHunt = vi.fn().mockImplementation((action: string) => {
      if (action === ActDbs.QUERY_DATABASE) {
        return Promise.resolve({ databaseBit: { dat: { rows: [] } } });
      }
      return Promise.resolve({});
    });

    const mockState: any = { hunt: mockHunt };

    await expect(
      hydrateState(
        model,
        {
          idx: 'hydrate-fail',
          dat: {
            seriesSlug: 'wiregrass-basin',
            expectedHash: '0'.repeat(64),
          },
        },
        mockState,
      ),
    ).rejects.toThrow(/\[CANON_DESYNCHRONIZED\] State hash parity breach/);
  });
});


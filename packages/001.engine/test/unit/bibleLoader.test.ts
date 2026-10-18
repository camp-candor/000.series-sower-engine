import { describe, it, expect } from 'vitest';
import {
  loadBibleState,
  deepFreeze,
  rfc8785Canonicalize,
  computeSha256,
  compute1HopDependencyHash,
  CanonDriftError,
  CanonValidationError,
} from '../../src/canon/bibleLoader.js';
import { BibleState } from '../../src/canon/types.js';

describe('Canon Ingestion & Dual-Rail Contract Suite', () => {
  const baseEntities = {
    characters: {
      char_silas: {
        id: 'char_silas',
        name: 'Silas Vance',
        scope: 'CHARACTER' as const,
        version: 1,
        factionId: 'basin_labor',
        somatic: {
          armsAvailable: 1,
          locomotionTier: 'LIMPING' as const,
          concussionLevel: 1,
          openWounds: ['brachial_plexus_strain'],
          bannedKineticVerbs: ['SPRINT', 'TWO_HANDED_LEVER_PULL'],
        },
        logistical: {
          held: ['item_brass_nozzle'],
          worn: { torso: 'grease_slicked_duster' },
          slung: [],
        },
        voice: {
          surfaceArgument: 'The siphon valve was cross-threaded before I arrived.',
          theUnderneath: 'Guilt over abandoning the turbine crew.',
          refusalVectors: ['NEVER_SURRENDER_REPAIR_KIT'],
          callbackPhrases: ['Check the thread pitch.', 'Cold iron does not lie.'],
          centralIrony: 'Fixes everyone else engines while letting his own pump freeze.',
        },
      },
    },
    locations: {
      loc_culvert_basin: {
        id: 'loc_culvert_basin',
        name: 'Culvert Basin 04',
        scope: 'LOCATION' as const,
        version: 1,
        portals: ['loc_turbine_gallery'],
        acousticDampingFactor: 2500,
        environmentalModifiers: { water_level_inches: 14 },
      },
    },
    possessions: {
      item_brass_nozzle: {
        id: 'item_brass_nozzle',
        name: 'Machined Brass Siphon Nozzle',
        scope: 'LOGISTIC' as const,
        version: 1,
        holderId: 'char_silas',
        massBasisPoints: 450,
        requiresLimbs: 1,
      },
    },
    grievances: {
      grv_stripped_threads: {
        id: 'grv_stripped_threads',
        scope: 'LAW' as const,
        version: 1,
        sourceActorId: 'char_silas',
        targetActorId: 'char_rc_spurl',
        escalatesToId: null,
        intensityBasisPoints: 6000,
        cooldownCycles: 3,
      },
    },
  };

  const canonicalForm = rfc8785Canonicalize(baseEntities);
  const validStateHash = computeSha256(canonicalForm);

  const validBibleState: BibleState = {
    _meta: {
      seriesSlug: 'wiregrass-basin',
      version: 1,
      compiled_at: '2026-10-17T00:00:00.000Z',
      state_hash: validStateHash,
      compiler_version: '1.0.0',
    },
    ...baseEntities,
  };

  it('>> [TEST] successfully loads and hydrates valid canon into sealed state', () => {
    const sealed = loadBibleState(validBibleState);
    expect(sealed.meta.seriesSlug).toBe('wiregrass-basin');
    expect(sealed.characters.char_silas).toBeDefined();
    expect(sealed.characters.char_silas.machine.somatic.armsAvailable).toBe(1);
    expect(sealed.characters.char_silas.voice.surfaceArgument).toContain('cross-threaded');
    expect(sealed.locations.loc_culvert_basin.acousticDampingFactor).toBe(2500);
  });

  it('>> [TEST] deepFreeze prevents runtime mutations with fatal TypeError', () => {
    const sealed = loadBibleState(validBibleState);

    expect(() => {
      // @ts-expect-error mutating frozen state
      sealed.characters.char_silas.machine.somatic.armsAvailable = 2;
    }).toThrow(TypeError);

    expect(() => {
      // @ts-expect-error pushing into frozen array
      (sealed.characters.char_silas.machine.somatic.bannedKineticVerbs as string[]).push('JUMP');
    }).toThrow(TypeError);

    expect(() => {
      // @ts-expect-error adding property to frozen object
      (sealed as any).newProperty = 'mutated';
    }).toThrow(TypeError);
  });

  it('>> [TEST] RFC 8785 canonicalization produces bit-identical hashes regardless of key ordering', () => {
    const objA = { z: 1, a: 2, m: { nested_b: true, nested_a: 'test' } };
    const objB = { a: 2, m: { nested_a: 'test', nested_b: true }, z: 1 };

    const hashA = computeSha256(rfc8785Canonicalize(objA));
    const hashB = computeSha256(rfc8785Canonicalize(objB));

    expect(hashA).toBe(hashB);
  });

  it('>> [TEST] throws CanonDriftError if embedded state_hash diverges from content', () => {
    const tamperedPayload = {
      ...validBibleState,
      _meta: {
        ...validBibleState._meta,
        state_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    };

    expect(() => loadBibleState(tamperedPayload)).toThrow(CanonDriftError);
  });

  it('>> [TEST] throws CanonValidationError on schema contract violations', () => {
    const invalidPayload = {
      ...validBibleState,
      characters: {
        char_silas: {
          ...validBibleState.characters.char_silas,
          somatic: {
            ...validBibleState.characters.char_silas.somatic,
            armsAvailable: 5, // Exceeds upper limit of 2
          },
        },
      },
    };

    expect(() => loadBibleState(invalidPayload)).toThrow(CanonValidationError);
  });

  it('>> [TEST] computes 1-hop dependency hash H_dep deterministically', () => {
    const targetHash = validStateHash;
    const fkHashes = ['hash_b_2222', 'hash_a_1111'];
    const hDep1 = compute1HopDependencyHash(targetHash, fkHashes);
    const hDep2 = compute1HopDependencyHash(targetHash, ['hash_a_1111', 'hash_b_2222']);

    expect(hDep1).toBe(hDep2);
    expect(hDep1).toHaveLength(64);
  });
});

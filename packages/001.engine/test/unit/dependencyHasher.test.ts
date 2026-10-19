import { describe, it, expect } from 'vitest';
import {
  computeEntityContentHash,
  compute1HopDependencyHash,
  computeTransitiveDependencyClosure,
  compareOneHopAdvisory,
  extractDependencyGraph,
  buildTwoTierDependencyFingerprints,
  loadBibleState,
  rfc8785Canonicalize,
  computeSha256,
} from '../../src/canon/bibleLoader.js';
import { BibleState } from '../../src/canon/types.js';

describe('Two-Tier Dependency Fingerprinting (H_dep) Test Suite', () => {
  // Construct a 3-tier causal chain:
  // char_silas -> holds item_brass_nozzle -> belongs to loc_culvert_basin
  // grv_spurl_debt -> targets char_silas
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
          bannedKineticVerbs: ['SPRINT'],
        },
        logistical: {
          held: ['item_brass_nozzle'],
          worn: { torso: 'grease_slicked_duster' },
          slung: [],
        },
        voice: {
          surfaceArgument: 'The siphon valve was cross-threaded.',
          theUnderneath: 'Guilt over abandoning turbine.',
          refusalVectors: ['NEVER_SURRENDER_KIT'],
          callbackPhrases: ['Check thread pitch.'],
          centralIrony: 'Fixes engines while pump freezes.',
        },
      },
    },
    locations: {
      loc_culvert_basin: {
        id: 'loc_culvert_basin',
        name: 'Culvert Basin 04',
        scope: 'LOCATION' as const,
        version: 1,
        portals: [],
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
      grv_spurl_debt: {
        id: 'grv_spurl_debt',
        scope: 'LAW' as const,
        version: 1,
        sourceActorId: 'char_silas',
        targetActorId: 'char_silas', // Minimal valid target
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

  it('>> [TEST] extracts dependency graph with accurate foreign keys', () => {
    const graph = extractDependencyGraph(validBibleState);

    expect(graph.char_silas).toBeDefined();
    expect(graph.char_silas.directFkIds).toContain('item_brass_nozzle');
    expect(graph.item_brass_nozzle.directFkIds).toContain('char_silas');
    expect(graph.grv_spurl_debt.directFkIds).toContain('char_silas');
  });

  it('>> [TEST] builds two-tier fingerprints for all entities', () => {
    const fingerprints = buildTwoTierDependencyFingerprints(validBibleState);

    expect(fingerprints.char_silas).toBeDefined();
    expect(fingerprints.char_silas.oneHopHash).toHaveLength(64);
    expect(fingerprints.char_silas.transitiveHash).toHaveLength(64);
    expect(fingerprints.char_silas.directFkIds).toContain('item_brass_nozzle');
  });

  it('>> [TEST] 2-hop modification leaves 1-hop hash invariant while altering transitive hash', () => {
    // Modify a 2-hop descendant: modify item_brass_nozzle and check grv_spurl_debt
    // grv_spurl_debt -> char_silas (1-hop) -> item_brass_nozzle (2-hop)
    const initialFingerprints = buildTwoTierDependencyFingerprints(validBibleState);
    const initialGrvOneHop = initialFingerprints.grv_spurl_debt.oneHopHash;
    const initialGrvTransitive = initialFingerprints.grv_spurl_debt.transitiveHash;

    // Mutate item_brass_nozzle mass
    const mutatedState: BibleState = {
      ...validBibleState,
      possessions: {
        ...validBibleState.possessions,
        item_brass_nozzle: {
          ...validBibleState.possessions.item_brass_nozzle,
          massBasisPoints: 9999, // Mutated 2-hop entity
        },
      },
    };

    const mutatedFingerprints = buildTwoTierDependencyFingerprints(mutatedState);

    // 1-Hop of grv_spurl_debt depends directly on char_silas's content hash, NOT item_brass_nozzle's
    // Therefore grv_spurl_debt's 1-hop hash remains completely identical!
    expect(mutatedFingerprints.grv_spurl_debt.oneHopHash).toBe(initialGrvOneHop);

    // Transitive closure hash walks grv -> silas -> item, so it MUST change
    expect(mutatedFingerprints.grv_spurl_debt.transitiveHash).not.toBe(initialGrvTransitive);
  });

  it('>> [TEST] 1-hop direct modification alters both 1-hop and transitive hashes', () => {
    const initialFingerprints = buildTwoTierDependencyFingerprints(validBibleState);
    const initialSilasOneHop = initialFingerprints.char_silas.oneHopHash;
    const initialSilasTransitive = initialFingerprints.char_silas.transitiveHash;

    // Mutate direct 1-hop link (item_brass_nozzle is direct 1-hop of char_silas)
    const mutatedState: BibleState = {
      ...validBibleState,
      possessions: {
        ...validBibleState.possessions,
        item_brass_nozzle: {
          ...validBibleState.possessions.item_brass_nozzle,
          name: 'Modified High-Pressure Brass Nozzle',
        },
      },
    };

    const mutatedFingerprints = buildTwoTierDependencyFingerprints(mutatedState);

    expect(mutatedFingerprints.char_silas.oneHopHash).not.toBe(initialSilasOneHop);
    expect(mutatedFingerprints.char_silas.transitiveHash).not.toBe(initialSilasTransitive);
  });

  it('>> [TEST] circular dependency in graph terminates safely in transitive closure', () => {
    // char_silas holds item_brass_nozzle, and item_brass_nozzle holder is char_silas (cyclic mutual ref)
    const graph = extractDependencyGraph(validBibleState);

    // computeTransitiveDependencyClosure must not throw stack overflow
    const closure = computeTransitiveDependencyClosure('char_silas', graph);

    expect(closure.transitiveHash).toHaveLength(64);
    expect(closure.transitiveFkIds).toContain('item_brass_nozzle');
  });

  it('>> [TEST] compareOneHopAdvisory generates accurate non-blocking rebase receipts', () => {
    const prevHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const currHash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    const mismatch = compareOneHopAdvisory('char_silas', prevHash, currHash, ['item_brass_nozzle']);
    expect(mismatch.requiresRebase).toBe(true);
    expect(mismatch.advisoryMessage).toContain('[ADVISORY]');
    expect(mismatch.changedFkIds).toContain('item_brass_nozzle');

    const match = compareOneHopAdvisory('char_silas', currHash, currHash);
    expect(match.requiresRebase).toBe(false);
    expect(match.advisoryMessage).toContain('[OK]');
  });
});

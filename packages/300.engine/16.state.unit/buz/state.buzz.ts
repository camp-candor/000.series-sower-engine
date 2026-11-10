import { StateModel } from '../state.model.js';
import type StateBit from '../fce/state.bit.js';
import type {
  LedgerWorkingState,
  SomaticEntitySnapshot,
  StringDebtSnapshot,
  GrievanceSnapshot,
  ParanoiaClockSnapshot,
  ActorBeliefSnapshot,
  UnratifiedDetailSnapshot,
} from '../fce/state.interface.js';
import * as ActDbs from '../../02.database.unit/database.action.js';
import {
  canonicalizeJson,
  sha256Hex,
} from '../../04.envelope.unit/envelope.buzzer.js';
import type State from '../../99.core/state.js';

const UPDATE_CONSOLE = '[Console action] Update Console';

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
  if (ste && typeof ste.hunt === 'function') {
    await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {});
  }
  const lib =
    (globalThis as any).LIBRARY ||
    (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined);
  if (lib && typeof lib.hunt === 'function') {
    await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {});
  }
}

export function recursiveDeepFreeze<T>(obj: T, visited = new WeakSet<object>()): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (visited.has(obj as object)) {
    return Object.freeze(obj);
  }
  visited.add(obj as object);

  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = (obj as any)[key];
    if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
      recursiveDeepFreeze(val, visited);
    }
  }
  return Object.freeze(obj);
}

export function computeWorkingStateHash(state: Omit<LedgerWorkingState, 'stateHash'>): string {
  const hashPayload = {
    beliefs: state.beliefs,
    clocks: state.clocks,
    details: state.details,
    entities: state.entities,
    grievances: state.grievances,
    schemaVersion: state.schemaVersion,
    seriesSlug: state.seriesSlug,
    strings: state.strings,
    tick: state.tick,
  };
  const canonicalString = canonicalizeJson(hashPayload);
  return sha256Hex(canonicalString);
}

function parseJsonSafe(val: any, fallback: any): any {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export const initState = async (
  cpy: StateModel,
  bal?: StateBit,
  ste?: State,
): Promise<StateModel> => {
  cpy.activeSeriesSlug = bal?.dat?.seriesSlug || cpy.activeSeriesSlug;
  cpy.activeStateHash = '';
  cpy.workingState = null;

  await emitConsole(
    ste,
    `>> [STATE:INIT] [OK] State unit armed for realm: [${cpy.activeSeriesSlug}]`,
  );

  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'init-state-pass',
        val: 1,
        src: cpy.activeSeriesSlug,
      },
    });
  }
  return cpy;
};

export const updateState = async (
  cpy: StateModel,
  bal?: StateBit,
  _ste?: State,
): Promise<StateModel> => {
  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'update-state-pass',
        val: cpy.workingState ? 1 : 0,
        src: cpy.activeStateHash,
      },
    });
  }
  return cpy;
};

export const hydrateState = async (
  cpy: StateModel,
  bal?: StateBit,
  ste?: State,
): Promise<StateModel> => {
  const seriesSlug = bal?.dat?.seriesSlug || bal?.dat?.hydrateParams?.seriesSlug || cpy.activeSeriesSlug;
  const tick = bal?.dat?.tick || bal?.dat?.hydrateParams?.tick || 0;
  const expectedHash = bal?.dat?.expectedHash;

  await emitConsole(ste, `>> [STATE:HYDRATE] Aggregating 4-vector working tables for [${seriesSlug}]...`);

  const entities: Record<string, SomaticEntitySnapshot> = {};
  const strings: Record<string, StringDebtSnapshot> = {};
  const grievances: Record<string, GrievanceSnapshot> = {};
  const clocks: Record<string, ParanoiaClockSnapshot> = {};
  const beliefs: Record<string, ActorBeliefSnapshot> = {};
  const details: Record<string, UnratifiedDetailSnapshot> = {};

  if (ste && typeof ste.hunt === 'function') {
    // 1. Entities live
    const entRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM entities_live ORDER BY entity_id ASC' },
    });
    const entRows = entRes?.databaseBit?.dat?.rows || [];
    for (const r of entRows) {
      entities[r.entity_id] = {
        entityId: r.entity_id,
        locationId: r.location_id,
        q: Number(r.q || 0),
        r: Number(r.r || 0),
        armsAvailable: Number(r.arms_available ?? 2),
        legsAvailable: Number(r.legs_available ?? 2),
        locomotionTier: r.locomotion_tier || 'UNRESTRICTED',
        concussionLevel: Number(r.concussion_level || 0),
        wounds: parseJsonSafe(r.wounds_json, []),
        heldItems: parseJsonSafe(r.held_items_json, []),
        wornGear: parseJsonSafe(r.worn_gear_json, []),
        slungItems: parseJsonSafe(r.slung_items_json, []),
        updatedAtMs: Number(r.updated_at_ms || 0),
      };
    }

    // 2. Strings ledger
    const strRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM strings_ledger ORDER BY string_id ASC' },
    });
    const strRows = strRes?.databaseBit?.dat?.rows || [];
    for (const r of strRows) {
      strings[r.string_id] = {
        stringId: r.string_id,
        holderId: r.holder_id,
        debtorId: r.debtor_id,
        weightBps: Number(r.weight_bps || 0),
        createdAtMs: Number(r.created_at_ms || 0),
        updatedAtMs: Number(r.updated_at_ms || 0),
      };
    }

    // 3. Grievances status
    const grvRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM grievance_status ORDER BY grievance_id ASC' },
    });
    const grvRows = grvRes?.databaseBit?.dat?.rows || [];
    for (const r of grvRows) {
      grievances[r.grievance_id] = {
        grievanceId: r.grievance_id,
        initiatorId: r.initiator_id,
        targetId: r.target_id,
        escalationStage: Number(r.escalation_stage || 0),
        cooldownCycles: Number(r.cooldown_cycles || 0),
        intensityBps: Number(r.intensity_bps || 0),
        status: r.status || 'DORMANT',
        updatedAtMs: Number(r.updated_at_ms || 0),
      };
    }

    // 4. Paranoia clocks
    const clkRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM paranoia_clocks ORDER BY clock_id ASC' },
    });
    const clkRows = clkRes?.databaseBit?.dat?.rows || [];
    for (const r of clkRows) {
      clocks[r.clock_id] = {
        clockId: r.clock_id,
        entityId: r.entity_id || null,
        valueBps: Number(r.value_bps || 0),
        thresholdBps: Number(r.threshold_bps || 0),
        decayRateBps: Number(r.decay_rate_bps || 0),
        updatedAtMs: Number(r.updated_at_ms || 0),
      };
    }

    // 5. Actor beliefs
    const blfRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM actor_beliefs ORDER BY belief_id ASC' },
    });
    const blfRows = blfRes?.databaseBit?.dat?.rows || [];
    for (const r of blfRows) {
      beliefs[r.belief_id] = {
        beliefId: r.belief_id,
        observerId: r.observer_id,
        factId: r.fact_id,
        subjectiveProbabilityBps: Number(r.subjective_probability_bps || 0),
        sourceType: r.source_type || 'DIRECT_OBSERVATION',
        isFalseBelief: Boolean(r.is_false_belief === 1),
        learnedAtMs: Number(r.learned_at_ms || 0),
        updatedAtMs: Number(r.updated_at_ms || 0),
      };
    }

    // 6. Unratified details
    const detRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
      dat: { query: 'SELECT * FROM unratified_details ORDER BY detail_id ASC' },
    });
    const detRows = detRes?.databaseBit?.dat?.rows || [];
    for (const r of detRows) {
      details[r.detail_id] = {
        detailId: r.detail_id,
        sceneId: r.scene_id,
        entityId: r.entity_id || null,
        salienceBps: Number(r.salience_bps || 0),
        claimProposal: r.claim_proposal,
        status: r.status || 'STAGED',
        createdAtMs: Number(r.created_at_ms || 0),
        reviewedAtMs: r.reviewed_at_ms ? Number(r.reviewed_at_ms) : null,
      };
    }
  }

  // Assemble unsealed state structure
  const rawState: Omit<LedgerWorkingState, 'stateHash'> = {
    schemaVersion: '1.0.0',
    seriesSlug,
    tick,
    entities,
    strings,
    grievances,
    clocks,
    beliefs,
    details,
  };

  // Compute canonical RFC 8785 SHA-256 Merkle root digest
  const stateHash = computeWorkingStateHash(rawState);

  // Parity Assertion: if expectedHash was specified, fail-closed on mismatch
  if (expectedHash && expectedHash.toLowerCase() !== stateHash.toLowerCase()) {
    const errorMsg = `[CANON_DESYNCHRONIZED] State hash parity breach! Expected: ${expectedHash} Computed: ${stateHash}`;
    await emitConsole(ste, `:: [STATE:ERR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Build complete working state and apply defensive deep freeze
  const completedState: LedgerWorkingState = {
    ...rawState,
    stateHash,
  };

  const frozenWorkingState = recursiveDeepFreeze(completedState);

  cpy.activeSeriesSlug = seriesSlug;
  cpy.activeStateHash = stateHash;
  cpy.workingState = frozenWorkingState;

  await emitConsole(
    ste,
    `>> [STATE:SEAL] Hydrated and deep-frozen snapshot for [${seriesSlug}].`,
  );
  await emitConsole(
    ste,
    `>> [STATE:HASH] Merkle root digest: ${stateHash}`,
  );
  await emitConsole(
    ste,
    `:: [STATE:OK] Composite state snapshot active (${Object.keys(entities).length} entities online).`,
  );

  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'hydrate-state-pass',
        val: 1,
        src: stateHash,
        dat: {
          workingState: frozenWorkingState,
          stateHash,
          seriesSlug,
        },
      },
      workingState: frozenWorkingState,
      stateHash,
    });
  }

  return cpy;
};

export const getStateAction = (
  cpy: StateModel,
  bal?: StateBit,
  _ste?: State,
): StateModel => {
  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'get-state-pass',
        val: cpy.workingState ? 1 : 0,
        src: cpy.activeStateHash,
        dat: {
          workingState: cpy.workingState,
          stateHash: cpy.activeStateHash,
        },
      },
      workingState: cpy.workingState,
      stateHash: cpy.activeStateHash,
    });
  }
  return cpy;
};

export const freezeStateAction = (
  cpy: StateModel,
  bal?: StateBit,
  _ste?: State,
): StateModel => {
  if (cpy.workingState) {
    cpy.workingState = recursiveDeepFreeze(cpy.workingState);
  }
  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'freeze-state-pass',
        val: 1,
        src: cpy.activeStateHash,
      },
    });
  }
  return cpy;
};

export const whyDirtyStateAction = (
  cpy: StateModel,
  bal?: StateBit,
  _ste?: State,
): StateModel => {
  const entityId = bal?.dat?.whyDirtyParams?.entityId || 'all';
  if (bal?.slv) {
    bal.slv({
      steBit: {
        idx: 'why-dirty-pass',
        val: 1,
        src: entityId,
        dat: { dirtyRecords: [] },
      },
    });
  }
  return cpy;
};


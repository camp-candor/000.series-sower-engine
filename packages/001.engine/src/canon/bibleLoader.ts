import * as crypto from 'node:crypto';
import {
  BibleState,
  BibleStateSchema,
  BibleLoaderOptions,
  SealedBibleState,
  DualRailCharacter,
  DeepReadonly,
} from './types.js';

export const LOADER_TAG = '[CANON::LOADER]' as const;

export class CanonDriftError extends Error {
  constructor(message: string) {
    super(`${LOADER_TAG} [FAIL] CANON_DRIFT_ERROR: ${message}`);
    this.name = 'CanonDriftError';
  }
}

export class CanonValidationError extends Error {
  constructor(message: string) {
    super(`${LOADER_TAG} [FAIL] CANON_VALIDATION_ERROR: ${message}`);
    this.name = 'CanonValidationError';
  }
}

export function rfc8785Canonicalize(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const elements = val.map((item) => rfc8785Canonicalize(item));
    return `[${elements.join(',')}]`;
  }

  const sortedKeys = Object.keys(val as Record<string, unknown>).sort((a, b) => {
    return a < b ? -1 : a > b ? 1 : 0;
  });

  const members = sortedKeys
    .filter((k) => (val as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${rfc8785Canonicalize((val as Record<string, unknown>)[k])}`);

  return `{${members.join(',')}}`;
}

export function computeSha256(canonicalPayload: string): string {
  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

export function compute1HopDependencyHash(targetHash: string, foreignKeyHashes: readonly string[]): string {
  const combined = [targetHash, ...foreignKeyHashes].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return computeSha256(rfc8785Canonicalize(combined));
}

export function deepFreeze<T>(obj: T): DeepReadonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as DeepReadonly<T>;
  }

  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as DeepReadonly<T>;
}

export function extractDualRailCharacters(
  characters: Record<string, BibleState['characters'][string]>
): Record<string, DualRailCharacter> {
  const result: Record<string, DualRailCharacter> = {};

  for (const [id, char] of Object.entries(characters)) {
    result[id] = {
      id: char.id,
      machine: {
        id: char.id,
        name: char.name,
        scope: char.scope,
        version: char.version,
        factionId: char.factionId,
        somatic: char.somatic,
        logistical: char.logistical,
      },
      voice: {
        surfaceArgument: char.voice.surfaceArgument,
        theUnderneath: char.voice.theUnderneath,
        refusalVectors: char.voice.refusalVectors,
        callbackPhrases: char.voice.callbackPhrases,
        centralIrony: char.voice.centralIrony,
      },
    };
  }

  return result;
}

export function loadBibleState(rawPayload: unknown, options: BibleLoaderOptions = {}): SealedBibleState {
  const parseResult = BibleStateSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    throw new CanonValidationError(parseResult.error.message);
  }

  const state = parseResult.data;
  const canonicalForm = rfc8785Canonicalize({
    characters: state.characters,
    locations: state.locations,
    possessions: state.possessions,
    grievances: state.grievances,
  });

  const computedStateHash = computeSha256(canonicalForm);

  if (!options.skipHashVerification) {
    const expected = options.expectedRootHash || state._meta.state_hash;
    if (expected.toLowerCase() !== state._meta.state_hash.toLowerCase()) {
      throw new CanonDriftError(
        `Payload state_hash mismatch. Embedded: [${state._meta.state_hash}], Expected: [${expected}]`
      );
    }

    if (computedStateHash !== state._meta.state_hash.toLowerCase()) {
      throw new CanonDriftError(
        `Cryptographic integrity breach: Computed H_root [${computedStateHash}] diverges from declared [${state._meta.state_hash}]`
      );
    }
  }

  const dualRailChars = extractDualRailCharacters(state.characters);

  const sealedState: SealedBibleState = {
    meta: deepFreeze(state._meta),
    characters: deepFreeze(dualRailChars),
    locations: deepFreeze(state.locations),
    possessions: deepFreeze(state.possessions),
    grievances: deepFreeze(state.grievances),
    rawState: deepFreeze(state),
  };

  return deepFreeze(sealedState) as SealedBibleState;
}

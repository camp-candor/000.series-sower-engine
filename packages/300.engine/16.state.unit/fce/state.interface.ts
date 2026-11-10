import type StateBit from './state.bit.js';

export interface SomaticEntitySnapshot {
  readonly entityId: string;
  readonly locationId: string;
  readonly q: number;
  readonly r: number;
  readonly armsAvailable: number;
  readonly legsAvailable: number;
  readonly locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED';
  readonly concussionLevel: number;
  readonly wounds: readonly string[];
  readonly heldItems: readonly string[];
  readonly wornGear: readonly string[];
  readonly slungItems: readonly string[];
  readonly updatedAtMs: number;
}

export interface StringDebtSnapshot {
  readonly stringId: string;
  readonly holderId: string;
  readonly debtorId: string;
  readonly weightBps: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface GrievanceSnapshot {
  readonly grievanceId: string;
  readonly initiatorId: string;
  readonly targetId: string;
  readonly escalationStage: number;
  readonly cooldownCycles: number;
  readonly intensityBps: number;
  readonly status: 'DORMANT' | 'ACTIVE' | 'RESOLVED' | 'ABANDONED';
  readonly updatedAtMs: number;
}

export interface ParanoiaClockSnapshot {
  readonly clockId: string;
  readonly entityId: string | null;
  readonly valueBps: number;
  readonly thresholdBps: number;
  readonly decayRateBps: number;
  readonly updatedAtMs: number;
}

export interface ActorBeliefSnapshot {
  readonly beliefId: string;
  readonly observerId: string;
  readonly factId: string;
  readonly subjectiveProbabilityBps: number;
  readonly sourceType: 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION';
  readonly isFalseBelief: boolean;
  readonly learnedAtMs: number;
  readonly updatedAtMs: number;
}

export interface UnratifiedDetailSnapshot {
  readonly detailId: string;
  readonly sceneId: string;
  readonly entityId: string | null;
  readonly salienceBps: number;
  readonly claimProposal: string;
  readonly status: 'STAGED' | 'DISCARDED' | 'RATIFIED';
  readonly createdAtMs: number;
  readonly reviewedAtMs: number | null;
}

export interface LedgerWorkingState {
  readonly schemaVersion: '1.0.0';
  readonly seriesSlug: string;
  readonly tick: number;
  readonly stateHash: string;
  readonly entities: Readonly<Record<string, SomaticEntitySnapshot>>;
  readonly strings: Readonly<Record<string, StringDebtSnapshot>>;
  readonly grievances: Readonly<Record<string, GrievanceSnapshot>>;
  readonly clocks: Readonly<Record<string, ParanoiaClockSnapshot>>;
  readonly beliefs: Readonly<Record<string, ActorBeliefSnapshot>>;
  readonly details: Readonly<Record<string, UnratifiedDetailSnapshot>>;
}

export default interface StateSnapshotModel {
  idx: string;
  activeSeriesSlug: string;
  activeStateHash: string;
  workingState: LedgerWorkingState | null;
  stateBits?: Record<string, StateBit>;
}


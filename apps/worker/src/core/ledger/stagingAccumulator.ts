// Phase 4: DO hot buffer staging accumulator.
// Stages validated events in volatile RAM over a base ledger state.
// Rollback is zero-cost: it discards the RAM scratchpad and restores the
// base state with no persistent writes. Only commit() advances the base,
// and only compileD1BatchStatements() materializes D1 work.

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import type { EventEnvelope } from './events.js'
import {
    cloneLedgerState,
    reduceLedgerState,
    type LedgerState,
} from './reducer.js'

export function cloneWorkingState(state: LedgerState): LedgerState {
    return cloneLedgerState(state)
}

export interface StagingCommitResult {
    state: LedgerState
    events: EventEnvelope[]
    eventCount: number
}

export class StagingAccumulator {
    private baseState: LedgerState
    private workingState: LedgerState
    private stagedEvents: EventEnvelope[] = []
    private stagedHashes: string[] = []

    constructor(baseState: LedgerState) {
        this.baseState = cloneWorkingState(baseState)
        this.workingState = cloneWorkingState(baseState)
    }

    stageEvent(envelope: EventEnvelope, seed?: string): LedgerState {
        try {
            const next = reduceLedgerState(this.workingState, envelope, seed)
            this.workingState = next
            this.stagedEvents.push(envelope)
            this.stagedHashes.push(next.stateHash)
            return cloneWorkingState(this.workingState)
        } catch (err) {
            // Invariant failure: discard the volatile scratchpad locally.
            this.rollback()
            throw err
        }
    }

    rollback(): void {
        this.workingState = cloneWorkingState(this.baseState)
        this.stagedEvents = []
        this.stagedHashes = []
    }

    commit(): StagingCommitResult {
        const events = [...this.stagedEvents]
        this.baseState = cloneWorkingState(this.workingState)
        this.stagedEvents = []
        this.stagedHashes = []
        return {
            state: cloneWorkingState(this.baseState),
            events,
            eventCount: events.length,
        }
    }

    getStagedCount(): number {
        return this.stagedEvents.length
    }

    getStagedEvents(): EventEnvelope[] {
        return [...this.stagedEvents]
    }

    getWorkingState(): LedgerState {
        return cloneWorkingState(this.workingState)
    }

    getBaseState(): LedgerState {
        return cloneWorkingState(this.baseState)
    }

    compileD1BatchStatements(db: D1Database): D1PreparedStatement[] {
        const statements: D1PreparedStatement[] = []
        for (let i = 0; i < this.stagedEvents.length; i += 1) {
            const envelope = this.stagedEvents[i]
            statements.push(
                db
                    .prepare(
                        'INSERT INTO event_log (event_id, sequence_number, event_type, payload_json, state_hash, seed, timestamp_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    )
                    .bind(
                        envelope.eventId,
                        envelope.sequenceNumber,
                        envelope.eventType,
                        JSON.stringify(envelope.payload),
                        this.stagedHashes[i] ?? this.workingState.stateHash,
                        envelope.seed,
                        envelope.timestampMs,
                    ),
            )
        }
        for (const entity of Object.values(this.workingState.entities)) {
            statements.push(
                db
                    .prepare(
                        'INSERT INTO entities_live (entity_id, entity_type, q, r, location_id, arms_available, locomotion_tier, concussion_level, open_wounds_json, held_items_json, worn_gear_json, slung_items_json, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(entity_id) DO UPDATE SET entity_type = excluded.entity_type, q = excluded.q, r = excluded.r, location_id = excluded.location_id, arms_available = excluded.arms_available, locomotion_tier = excluded.locomotion_tier, concussion_level = excluded.concussion_level, open_wounds_json = excluded.open_wounds_json, held_items_json = excluded.held_items_json, worn_gear_json = excluded.worn_gear_json, slung_items_json = excluded.slung_items_json, updated_at_ms = excluded.updated_at_ms',
                    )
                    .bind(
                        entity.id,
                        entity.entityType,
                        entity.q,
                        entity.r,
                        entity.locationId,
                        entity.arms_available,
                        entity.locomotionTier,
                        entity.concussionLevel,
                        JSON.stringify(entity.openWounds),
                        JSON.stringify(entity.held),
                        JSON.stringify(entity.worn),
                        JSON.stringify(entity.slung),
                        entity.updatedAtMs,
                    ),
            )
        }
        for (const leverage of Object.values(this.workingState.strings)) {
            statements.push(
                db
                    .prepare(
                        'INSERT INTO strings_ledger (id, holder_id, debtor_id, weight_bps, created_at_ms) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET holder_id = excluded.holder_id, debtor_id = excluded.debtor_id, weight_bps = excluded.weight_bps',
                    )
                    .bind(
                        leverage.id,
                        leverage.holderId,
                        leverage.debtorId,
                        leverage.weightBps,
                        leverage.createdAtMs,
                    ),
            )
        }
        for (const grievance of Object.values(this.workingState.grievances)) {
            statements.push(
                db
                    .prepare(
                        'INSERT INTO grievance_status (grievance_id, escalation_depth, cooldown_cycles, intensity_bps, updated_at_ms) VALUES (?, ?, ?, ?, ?) ON CONFLICT(grievance_id) DO UPDATE SET escalation_depth = excluded.escalation_depth, cooldown_cycles = excluded.cooldown_cycles, intensity_bps = excluded.intensity_bps, updated_at_ms = excluded.updated_at_ms',
                    )
                    .bind(
                        grievance.grievanceId,
                        grievance.escalationDepth,
                        grievance.cooldownCycles,
                        grievance.intensityBps,
                        grievance.updatedAtMs,
                    ),
            )
        }
        for (const clock of Object.values(this.workingState.clocks)) {
            statements.push(
                db
                    .prepare(
                        'INSERT INTO paranoia_clocks (clock_id, clock_name, value_bps, threshold_bps, decay_rate_bps, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(clock_id) DO UPDATE SET clock_name = excluded.clock_name, value_bps = excluded.value_bps, threshold_bps = excluded.threshold_bps, decay_rate_bps = excluded.decay_rate_bps, updated_at_ms = excluded.updated_at_ms',
                    )
                    .bind(
                        clock.clockId,
                        clock.clockName,
                        clock.valueBps,
                        clock.thresholdBps,
                        clock.decayRateBps,
                        clock.updatedAtMs,
                    ),
            )
        }
        return statements
    }
}

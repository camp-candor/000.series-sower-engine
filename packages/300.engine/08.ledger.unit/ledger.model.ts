import clone from 'clone-deep'
import { createHash } from 'node:crypto'
import type Ledger from './fce/ledger.interface'
import type {
    EventEnvelope,
    LedgerEventType,
    PreparedBatchStatement,
    InvariantValidationResult,
} from './fce/ledger.interface'
import type { LedgerWorkingState } from '../16.state.unit/fce/state.interface'
import { canonicalizeStateJson } from '../16.state.unit/buz/state.buzz'
import { reduceLedgerState } from './buz/ledger.buzz'

export class StagingAccumulator {
    private baseState: LedgerWorkingState
    private volatileWorkingState: LedgerWorkingState
    private pendingEvents: EventEnvelope[] = []
    private lastHash: string

    constructor(initialState: LedgerWorkingState) {
        this.baseState = initialState
        this.volatileWorkingState = clone(initialState, true)
        this.lastHash = initialState.stateHash
    }

    public get workingState(): Readonly<LedgerWorkingState> {
        return this.volatileWorkingState
    }

    public get stagedCount(): number {
        return this.pendingEvents.length
    }

    public get stagedEvents(): readonly EventEnvelope[] {
        return this.pendingEvents
    }

    /**
     * Stages an event into volatile RAM. Evaluates the pure state transition immediately.
     */
    public stageEvent<T>(
        type: LedgerEventType,
        payload: T,
        meta: {
            eventId: string
            streamId: string
            tick: number
            actorId: string | null
            targetId: string | null
            seed: string
            timestamp_ms: number
            topologyHash?: string
            overlayHash?: string
            queryHash?: string
            receiptHash?: string
        },
    ): EventEnvelope<T> {
        const nextSeq = this.volatileWorkingState.lastSequenceNumber + 1
        const unsignedEnvelope = {
            sequenceNumber: nextSeq,
            eventId: meta.eventId,
            streamId: meta.streamId,
            tick: meta.tick,
            type,
            version: 1,
            actorId: meta.actorId,
            targetId: meta.targetId,
            seed: meta.seed,
            payload,
            topologyHash: meta.topologyHash || '0'.repeat(64),
            overlayHash: meta.overlayHash || '0'.repeat(64),
            queryHash: meta.queryHash || '0'.repeat(64),
            receiptHash: meta.receiptHash || '0'.repeat(64),
            prevEventHash: this.lastHash,
            timestamp_ms: meta.timestamp_ms,
        }

        const envelopeHash = createHash('sha256')
            .update(canonicalizeStateJson(unsignedEnvelope), 'utf8')
            .digest('hex')

        const sealedEnvelope: EventEnvelope<T> = {
            ...unsignedEnvelope,
            stateHash: envelopeHash,
        }

        // Evaluates reducer in volatile memory; throws if invariants breach
        this.volatileWorkingState = reduceLedgerState(
            this.volatileWorkingState,
            sealedEnvelope as EventEnvelope,
            meta.seed,
        )

        this.lastHash = envelopeHash
        this.pendingEvents.push(sealedEnvelope as EventEnvelope)
        return sealedEnvelope
    }

    public validateInvariants(): InvariantValidationResult {
        const violations: string[] = []
        const entities = this.volatileWorkingState.entities

        for (const [id, ent] of Object.entries(entities)) {
            if (ent.held_items.length > ent.arms_available) {
                violations.push(
                    `[HAND_CAPACITY_BREACH]: Entity ${id} holds ${ent.held_items.length} items with only ${ent.arms_available} arm(s)`,
                )
            }
            if (ent.fatigue_bps < 0 || ent.fatigue_bps > 10000) {
                violations.push(
                    `[BASIS_POINTS_BREACH]: Entity ${id} fatigue_bps ${ent.fatigue_bps} out of [0, 10000]`,
                )
            }
            if (ent.pain_bps < 0 || ent.pain_bps > 10000) {
                violations.push(
                    `[BASIS_POINTS_BREACH]: Entity ${id} pain_bps ${ent.pain_bps} out of [0, 10000]`,
                )
            }
            if (ent.refusal_strain_bps < 0 || ent.refusal_strain_bps > 10000) {
                violations.push(
                    `[BASIS_POINTS_BREACH]: Entity ${id} refusal_strain_bps ${ent.refusal_strain_bps} out of [0, 10000]`,
                )
            }
        }

        for (const [key, str] of Object.entries(
            this.volatileWorkingState.strings,
        )) {
            if (str.holder_id === str.debtor_id) {
                violations.push(
                    `[ANTI_REFLEXIVITY_BREACH]: String relation ${key} has identical holder and debtor`,
                )
            }
        }

        return {
            valid: violations.length === 0,
            violations,
        }
    }

    public rollback(): void {
        this.volatileWorkingState = clone(this.baseState, true)
        this.pendingEvents = []
        this.lastHash = this.baseState.stateHash
    }

    public commit(): {
        readonly committedEvents: readonly EventEnvelope[]
        readonly newState: LedgerWorkingState
    } {
        const validation = this.validateInvariants()
        if (!validation.valid) {
            throw new Error(
                `Cannot commit invalid staging accumulator: ${validation.violations.join('; ')}`,
            )
        }

        const eventsToCommit = [...this.pendingEvents]
        this.baseState = this.volatileWorkingState
        this.pendingEvents = []
        return {
            committedEvents: eventsToCommit,
            newState: this.baseState,
        }
    }

    /**
     * Compiles pending changes into atomic parameterized SQL statements for local SQLite.
     */
    public compileBatchStatements(
        events: readonly EventEnvelope[],
    ): PreparedBatchStatement[] {
        const stmts: PreparedBatchStatement[] = []

        // 1. Insert into append-only event_log
        for (const ev of events) {
            stmts.push({
                sql: `INSERT INTO event_log (
          event_id, stream_id, tick, type, version,
          actor_id, target_id, seed, payload_json,
          topology_hash, overlay_hash, query_hash, receipt_hash,
          prev_hash, state_hash, timestamp_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    ev.eventId,
                    ev.streamId,
                    ev.tick,
                    ev.type,
                    ev.version,
                    ev.actorId,
                    ev.targetId,
                    ev.seed,
                    JSON.stringify(ev.payload),
                    ev.topologyHash || '0'.repeat(64),
                    ev.overlayHash || '0'.repeat(64),
                    ev.queryHash || '0'.repeat(64),
                    ev.receiptHash || '0'.repeat(64),
                    ev.prevEventHash,
                    ev.stateHash,
                    ev.timestamp_ms,
                ],
            })
        }

        // 2. Materialize entities_live
        for (const ent of Object.values(this.baseState.entities)) {
            stmts.push({
                sql: `INSERT INTO entities_live (
          entity_id, location_id, q, r, arms_available, legs_available,
          locomotion_tier, concussion_level, fatigue_bps, pain_bps, refusal_strain_bps,
          open_wounds_json, banned_kinetic_verbs_json, held_items_json, worn_gear_json,
          slung_items_json, cached_items_json, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_id) DO UPDATE SET
          location_id = excluded.location_id,
          q = excluded.q,
          r = excluded.r,
          arms_available = excluded.arms_available,
          legs_available = excluded.legs_available,
          locomotion_tier = excluded.locomotion_tier,
          concussion_level = excluded.concussion_level,
          fatigue_bps = excluded.fatigue_bps,
          pain_bps = excluded.pain_bps,
          refusal_strain_bps = excluded.refusal_strain_bps,
          open_wounds_json = excluded.open_wounds_json,
          banned_kinetic_verbs_json = excluded.banned_kinetic_verbs_json,
          held_items_json = excluded.held_items_json,
          worn_gear_json = excluded.worn_gear_json,
          slung_items_json = excluded.slung_items_json,
          cached_items_json = excluded.cached_items_json,
          updated_at_ms = excluded.updated_at_ms`,
                params: [
                    ent.entity_id,
                    ent.location_id,
                    ent.q,
                    ent.r,
                    ent.arms_available,
                    ent.legs_available,
                    ent.locomotion_tier,
                    ent.concussion_level,
                    ent.fatigue_bps,
                    ent.pain_bps,
                    ent.refusal_strain_bps,
                    JSON.stringify(ent.open_wounds),
                    JSON.stringify(ent.banned_kinetic_verbs),
                    JSON.stringify(ent.held_items),
                    JSON.stringify(ent.worn_gear),
                    JSON.stringify(ent.slung_items),
                    JSON.stringify(ent.cached_items),
                    ent.updated_at_ms,
                ],
            })
        }

        // 3. Materialize strings_ledger
        for (const str of Object.values(this.baseState.strings)) {
            stmts.push({
                sql: `INSERT INTO strings_ledger (
          relation_id, holder_id, debtor_id, weight_bps, strings_count, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(holder_id, debtor_id) DO UPDATE SET
          weight_bps = excluded.weight_bps,
          strings_count = excluded.strings_count,
          updated_at_ms = excluded.updated_at_ms`,
                params: [
                    str.relation_id,
                    str.holder_id,
                    str.debtor_id,
                    str.weight_bps,
                    str.strings_count,
                    str.updated_at_ms,
                ],
            })
        }

        // 4. Materialize grievance_status
        for (const grv of Object.values(this.baseState.grievances)) {
            stmts.push({
                sql: `INSERT INTO grievance_status (
          grievance_id, instigator_id, victim_id, escalation_depth,
          cooldown_cycles, intensity_bps, status, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(grievance_id) DO UPDATE SET
          escalation_depth = excluded.escalation_depth,
          cooldown_cycles = excluded.cooldown_cycles,
          intensity_bps = excluded.intensity_bps,
          status = excluded.status,
          updated_at_ms = excluded.updated_at_ms`,
                params: [
                    grv.grievance_id,
                    grv.instigator_id,
                    grv.victim_id,
                    grv.escalation_depth,
                    grv.cooldown_cycles,
                    grv.intensity_bps,
                    grv.status,
                    grv.updated_at_ms,
                ],
            })
        }

        // 5. Materialize paranoia_clocks
        for (const clk of Object.values(this.baseState.clocks)) {
            stmts.push({
                sql: `INSERT INTO paranoia_clocks (
          clock_id, entity_id, clock_name, value_bps, threshold_bps, decay_rate_bps, is_triggered, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_id, clock_name) DO UPDATE SET
          value_bps = excluded.value_bps,
          threshold_bps = excluded.threshold_bps,
          decay_rate_bps = excluded.decay_rate_bps,
          is_triggered = excluded.is_triggered,
          updated_at_ms = excluded.updated_at_ms`,
                params: [
                    clk.clock_id,
                    clk.entity_id,
                    clk.clock_name,
                    clk.value_bps,
                    clk.threshold_bps,
                    clk.decay_rate_bps,
                    clk.is_triggered,
                    clk.updated_at_ms,
                ],
            })
        }

        // 6. Materialize actor_beliefs
        for (const blf of Object.values(this.baseState.beliefs)) {
            stmts.push({
                sql: `INSERT INTO actor_beliefs (
          belief_id, observer_id, fact_id, subjective_probability_bps,
          source_type, is_false_belief, learned_at_ms, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(observer_id, fact_id) DO UPDATE SET
          subjective_probability_bps = excluded.subjective_probability_bps,
          source_type = excluded.source_type,
          is_false_belief = excluded.is_false_belief,
          updated_at_ms = excluded.updated_at_ms`,
                params: [
                    blf.belief_id,
                    blf.observer_id,
                    blf.fact_id,
                    blf.subjective_probability_bps,
                    blf.source_type,
                    blf.is_false_belief,
                    blf.learned_at_ms,
                    blf.updated_at_ms,
                ],
            })
        }

        // 7. Materialize unratified_details
        for (const dtl of Object.values(this.baseState.unratifiedDetails)) {
            stmts.push({
                sql: `INSERT INTO unratified_details (
          detail_id, scene_id, entity_id, salience_bps, claim_proposal, status, created_at_ms, reviewed_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(detail_id) DO UPDATE SET
          salience_bps = excluded.salience_bps,
          claim_proposal = excluded.claim_proposal,
          status = excluded.status,
          reviewed_at_ms = excluded.reviewed_at_ms`,
                params: [
                    dtl.detail_id,
                    dtl.scene_id,
                    dtl.entity_id || null,
                    dtl.salience_bps,
                    dtl.claim_proposal,
                    dtl.status,
                    dtl.created_at_ms,
                    dtl.reviewed_at_ms || null,
                ],
            })
        }

        return stmts
    }
}

export class LedgerModel implements Ledger {
    idx = '08.ledger'
    activeSequence = 0
    activeAccumulator: StagingAccumulator | null = null
}

export default LedgerModel

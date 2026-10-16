// Phase 4: Pure event-sourced reducer engine.
// Implements S_{n+1} = R(S_n, E_n, sigma_n): a pure, synchronous fold over
// the append-only event log. The reducer never mutates its input state,
// never reads a clock, and never performs I/O, so replaying the same
// event sequence with the same seeds always yields the same state hash.

import type {
    EventEnvelope,
    GrievanceEscalatedPayload,
    InventoryTransferredPayload,
    LeverageStringMutatedPayload,
    ParanoiaClockTickedPayload,
    SomaticTraumaPayload,
} from './events.js'

export interface LedgerEntity {
    id: string
    entityType: 'CHARACTER' | 'LOCATION' | 'OBJECT'
    q: number | null
    r: number | null
    locationId: string | null
    arms_available: number
    locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    concussionLevel: number
    openWounds: string[]
    held: string[]
    worn: Record<string, string>
    slung: string[]
    updatedAtMs: number
}

export interface LeverageString {
    id: string
    holderId: string
    debtorId: string
    weightBps: number
    createdAtMs: number
}

export interface GrievanceState {
    grievanceId: string
    escalationDepth: number
    cooldownCycles: number
    intensityBps: number
    updatedAtMs: number
}

export interface ParanoiaClockState {
    clockId: string
    clockName: string
    valueBps: number
    thresholdBps: number
    decayRateBps: number
    updatedAtMs: number
}

export interface LedgerState {
    entities: Record<string, LedgerEntity>
    strings: Record<string, LeverageString>
    grievances: Record<string, GrievanceState>
    clocks: Record<string, ParanoiaClockState>
    lastSequence: number
    stateHash: string
}

export class LedgerInvariantError extends Error {
    readonly code: string

    constructor(code: string, detail: string) {
        super(`[${code}] ${detail}`)
        this.name = 'LedgerInvariantError'
        this.code = code
    }
}

// Truncates toward an integer and clamps strictly into [0, 10000].
// This is the single basis-point gate for the whole ledger, which
// prevents float drift from leaking into persisted state.
export function clampBps(value: number): number {
    if (!Number.isFinite(value)) return 0
    const truncated = Math.trunc(value)
    if (truncated <= 0) return 0
    if (truncated > 10000) return 10000
    return truncated
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min
    const truncated = Math.trunc(value)
    if (truncated < min) return min
    if (truncated > max) return max
    return truncated
}

export function createLedgerEntity(
    partial: Partial<LedgerEntity> & { id: string },
): LedgerEntity {
    const entity: LedgerEntity = {
        entityType: 'CHARACTER',
        q: null,
        r: null,
        locationId: null,
        arms_available: 2,
        locomotionTier: 'UNRESTRICTED',
        concussionLevel: 0,
        openWounds: [],
        held: [],
        worn: {},
        slung: [],
        updatedAtMs: 0,
        ...partial,
    }
    entity.openWounds = [...(partial.openWounds ?? [])]
    entity.held = [...(partial.held ?? [])]
    entity.worn = { ...(partial.worn ?? {}) }
    entity.slung = [...(partial.slung ?? [])]
    return entity
}

export function cloneLedgerState(state: LedgerState): LedgerState {
    const entities: Record<string, LedgerEntity> = {}
    for (const [id, entity] of Object.entries(state.entities)) {
        entities[id] = {
            ...entity,
            openWounds: [...entity.openWounds],
            held: [...entity.held],
            worn: { ...entity.worn },
            slung: [...entity.slung],
        }
    }
    const strings: Record<string, LeverageString> = {}
    for (const [id, value] of Object.entries(state.strings)) {
        strings[id] = { ...value }
    }
    const grievances: Record<string, GrievanceState> = {}
    for (const [id, value] of Object.entries(state.grievances)) {
        grievances[id] = { ...value }
    }
    const clocks: Record<string, ParanoiaClockState> = {}
    for (const [id, value] of Object.entries(state.clocks)) {
        clocks[id] = { ...value }
    }
    return {
        entities,
        strings,
        grievances,
        clocks,
        lastSequence: state.lastSequence,
        stateHash: state.stateHash,
    }
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value) ?? 'null'
    }
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
    }
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const parts = keys.map(
        (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
    )
    return `{${parts.join(',')}}`
}

// Deterministic FNV-1a hash over the canonical state encoding plus the
// seed sigma_n. Same state + same seed always yields the same hash.
export function computeStateHash(state: LedgerState, seed: string): string {
    const canonical = stableStringify({
        entities: state.entities,
        strings: state.strings,
        grievances: state.grievances,
        clocks: state.clocks,
        lastSequence: state.lastSequence,
    })
    const input = `${seed}::${canonical}`
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createInitialLedgerState(
    entities: LedgerEntity[] = [],
): LedgerState {
    const state: LedgerState = {
        entities: {},
        strings: {},
        grievances: {},
        clocks: {},
        lastSequence: 0,
        stateHash: '',
    }
    for (const entity of entities) {
        state.entities[entity.id] = createLedgerEntity(entity)
    }
    state.stateHash = computeStateHash(state, 'genesis')
    return state
}

function ensureEntity(state: LedgerState, entityId: string): LedgerEntity {
    const existing = state.entities[entityId]
    if (existing) return existing
    const created = createLedgerEntity({ id: entityId })
    state.entities[entityId] = created
    return created
}

function applySomaticTrauma(
    state: LedgerState,
    payload: SomaticTraumaPayload,
    timestampMs: number,
): void {
    const entity = ensureEntity(state, payload.entityId)
    if (payload.armsLost !== undefined) {
        entity.arms_available = clampInt(
            entity.arms_available - payload.armsLost,
            0,
            2,
        )
    }
    if (payload.woundId !== undefined && payload.woundId.length > 0) {
        if (!entity.openWounds.includes(payload.woundId)) {
            entity.openWounds.push(payload.woundId)
        }
    }
    if (payload.concussionDelta !== undefined) {
        entity.concussionLevel = clampInt(
            entity.concussionLevel + payload.concussionDelta,
            0,
            3,
        )
    }
    if (payload.locomotionTier !== undefined) {
        entity.locomotionTier = payload.locomotionTier
    }
    entity.updatedAtMs = timestampMs
}

function applyInventoryTransferred(
    state: LedgerState,
    payload: InventoryTransferredPayload,
    timestampMs: number,
): void {
    const target = ensureEntity(state, payload.toEntityId)
    // SAT invariant: a transfer may only land while the holder still has
    // a free hand, i.e. held.length < arms_available before the transfer.
    if (!(target.held.length < target.arms_available)) {
        throw new LedgerInvariantError(
            'HAND_CAPACITY_BREACH',
            `Entity ${target.id} cannot hold ${payload.itemId}: held=${target.held.length} arms_available=${target.arms_available}`,
        )
    }
    if (payload.fromEntityId !== undefined) {
        const source = state.entities[payload.fromEntityId]
        if (source) {
            source.held = source.held.filter((item) => item !== payload.itemId)
            source.updatedAtMs = timestampMs
        }
    }
    if (!target.held.includes(payload.itemId)) {
        target.held.push(payload.itemId)
    }
    target.updatedAtMs = timestampMs
}

function applyLeverageStringMutated(
    state: LedgerState,
    payload: LeverageStringMutatedPayload,
    timestampMs: number,
): void {
    const holderId = payload.holderId
    const debtorId = payload.debtorId
    // Anti-reflexive guard: an actor cannot hold debt over itself.
    if (holderId === debtorId) {
        throw new LedgerInvariantError(
            'ANTI_REFLEXIVE_VIOLATION',
            `Leverage string ${payload.stringId} has holderId === debtorId (${holderId})`,
        )
    }
    if (payload.remove === true) {
        delete state.strings[payload.stringId]
        return
    }
    const existing = state.strings[payload.stringId]
    const baseWeight = existing ? existing.weightBps : 0
    const nextWeight =
        payload.weightBps !== undefined
            ? clampBps(payload.weightBps)
            : clampBps(baseWeight + (payload.deltaBps ?? 0))
    state.strings[payload.stringId] = {
        id: payload.stringId,
        holderId,
        debtorId,
        weightBps: nextWeight,
        createdAtMs: existing ? existing.createdAtMs : timestampMs,
    }
}

function applyGrievanceEscalated(
    state: LedgerState,
    payload: GrievanceEscalatedPayload,
    timestampMs: number,
): void {
    const existing = state.grievances[payload.grievanceId]
    const grievance: GrievanceState = existing
        ? { ...existing }
        : {
              grievanceId: payload.grievanceId,
              escalationDepth: 0,
              cooldownCycles: 0,
              intensityBps: 0,
              updatedAtMs: timestampMs,
          }
    grievance.escalationDepth = Math.max(
        0,
        Math.trunc(grievance.escalationDepth + (payload.escalationDelta ?? 0)),
    )
    grievance.intensityBps = clampBps(
        grievance.intensityBps + (payload.intensityDeltaBps ?? 0),
    )
    if (payload.cooldownCycles !== undefined) {
        grievance.cooldownCycles = Math.max(
            0,
            Math.trunc(payload.cooldownCycles),
        )
    }
    grievance.updatedAtMs = timestampMs
    state.grievances[payload.grievanceId] = grievance
}

function applyParanoiaClockTicked(
    state: LedgerState,
    payload: ParanoiaClockTickedPayload,
    timestampMs: number,
): void {
    const existing = state.clocks[payload.clockId]
    const clock: ParanoiaClockState = existing
        ? { ...existing }
        : {
              clockId: payload.clockId,
              clockName: payload.clockName ?? payload.clockId,
              valueBps: 0,
              thresholdBps: clampBps(payload.thresholdBps ?? 10000),
              decayRateBps: clampBps(payload.decayRateBps ?? 0),
              updatedAtMs: timestampMs,
          }
    if (payload.clockName !== undefined) clock.clockName = payload.clockName
    if (payload.thresholdBps !== undefined) {
        clock.thresholdBps = clampBps(payload.thresholdBps)
    }
    if (payload.decayRateBps !== undefined) {
        clock.decayRateBps = clampBps(payload.decayRateBps)
    }
    clock.valueBps = clampBps(
        clock.valueBps + (payload.tickDeltaBps ?? 0) - clock.decayRateBps,
    )
    clock.updatedAtMs = timestampMs
    state.clocks[payload.clockId] = clock
}

// Pure transition: S_{n+1} = R(S_n, E_n, sigma_n).
// Returns a new state object; the input state is never mutated, so a
// caller may deep-freeze S_n and still fold events over it.
export function reduceLedgerState(
    state: LedgerState,
    envelope: EventEnvelope,
    seed?: string,
): LedgerState {
    // Sequence continuity: once the log has started, every event must be
    // exactly lastSequence + 1. Gaps and regressions both fail closed.
    // lastSequence === 0 is the genesis sentinel, so the first event of a
    // log may carry any sequence number.
    if (
        state.lastSequence > 0 &&
        envelope.sequenceNumber !== state.lastSequence + 1
    ) {
        throw new LedgerInvariantError(
            'SEQUENCE_GAP_DETECTED',
            `Event sequence ${envelope.sequenceNumber} does not continue lastSequence ${state.lastSequence}; expected ${state.lastSequence + 1}`,
        )
    }
    const next = cloneLedgerState(state)
    const sigma = seed ?? envelope.seed
    switch (envelope.eventType) {
        case 'SOMATIC_TRAUMA_APPLIED':
            applySomaticTrauma(
                next,
                envelope.payload as SomaticTraumaPayload,
                envelope.timestampMs,
            )
            break
        case 'INVENTORY_TRANSFERRED':
            applyInventoryTransferred(
                next,
                envelope.payload as InventoryTransferredPayload,
                envelope.timestampMs,
            )
            break
        case 'LEVERAGE_STRING_MUTATED':
            applyLeverageStringMutated(
                next,
                envelope.payload as LeverageStringMutatedPayload,
                envelope.timestampMs,
            )
            break
        case 'GRIEVANCE_ESCALATED':
            applyGrievanceEscalated(
                next,
                envelope.payload as GrievanceEscalatedPayload,
                envelope.timestampMs,
            )
            break
        case 'PARANOIA_CLOCK_TICKED':
            applyParanoiaClockTicked(
                next,
                envelope.payload as ParanoiaClockTickedPayload,
                envelope.timestampMs,
            )
            break
        default:
            throw new LedgerInvariantError(
                'UNKNOWN_EVENT_TYPE',
                `Unsupported event type: ${String(envelope.eventType)}`,
            )
    }
    next.lastSequence = envelope.sequenceNumber
    next.stateHash = computeStateHash(next, sigma)
    return next
}

// Mathematical fold: reduces an ordered event log over an initial state.
// Folding the same log twice yields deep-equal states and equal hashes.
export function foldLedgerEvents(
    initialState: LedgerState,
    events: EventEnvelope[],
    seed?: string,
): LedgerState {
    let current = cloneLedgerState(initialState)
    for (const envelope of events) {
        current = reduceLedgerState(current, envelope, seed ?? envelope.seed)
    }
    return current
}

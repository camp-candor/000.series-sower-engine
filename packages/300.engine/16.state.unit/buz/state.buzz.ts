import { createHash } from 'node:crypto'
import type { StateModel } from '../state.model'
import type StateBit from '../fce/state.bit'
import type State from '../../99.core/state'
import type {
    LedgerWorkingState,
    CompositeEntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from '../fce/state.interface'

export const REDUCER_CONTRACT_VERSION = '1.0.0'
export const GENESIS_EVENT_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000'

const logConsole = async (ste: State, src: string) => {
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Degrades cleanly in isolated unit test environments
        }
    }
}

/**
 * Deeply and recursively freezes an object to guarantee immutability.
 */
export function recursiveDeepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }
    Object.freeze(obj)
    for (const key of Object.keys(obj)) {
        const val = (obj as any)[key]
        if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
            recursiveDeepFreeze(val)
        }
    }
    return obj as Readonly<T>
}

/**
 * Deterministically canonicalizes an object using RFC 8785 UTF-16 code-point order.
 */
export function canonicalizeStateJson(obj: unknown): string {
    if (typeof obj === 'number') {
        if (!Number.isFinite(obj)) {
            throw new TypeError(
                '[RFC8785_ERROR] Non-finite numbers (NaN, Infinity) are prohibited in canonical JSON',
            )
        }
        return JSON.stringify(obj)
    }
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj)
    }
    if (Array.isArray(obj)) {
        return `[${obj.map((item) => canonicalizeStateJson(item)).join(',')}]`
    }
    const sortedKeys = Object.keys(obj as Record<string, unknown>).sort()
    const pairs = sortedKeys
        .map((key) => {
            const val = (obj as Record<string, unknown>)[key]
            if (val === undefined || typeof val === 'symbol') {
                return ''
            }
            return `${JSON.stringify(key)}:${canonicalizeStateJson(val)}`
        })
        .filter(Boolean)
    return `{${pairs.join(',')}}`
}

/**
 * Computes a 64-character lowercase hexadecimal SHA-256 state hash.
 */
export function computeWorkingStateHash(maps: {
    entities: Record<string, CompositeEntityLiveRecord>
    strings: Record<string, StringsLedgerRecord>
    grievances: Record<string, GrievanceStatusRecord>
    clocks: Record<string, ParanoiaClockRecord>
    beliefs: Record<string, ActorBeliefRecord>
    unratifiedDetails: Record<string, UnratifiedDetailRecord>
}): string {
    const canonical = canonicalizeStateJson({
        beliefs: maps.beliefs,
        clocks: maps.clocks,
        details: maps.unratifiedDetails,
        entities: maps.entities,
        grievances: maps.grievances,
        strings: maps.strings,
    })
    return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

export const initState = async (cpy: StateModel, bal: StateBit, ste: State) => {
    await logConsole(
        ste,
        '>> [STATE:INIT] Initializing 16.state.unit snapshot store...',
    )
    cpy.activeSnapshot = null
    if (bal?.slv != null) {
        bal.slv({ steBit: { idx: 'init-state', val: 1 } })
    }
    return cpy
}

export const updateState = async (
    cpy: StateModel,
    bal: StateBit,
    _ste: State,
) => {
    if (bal?.dat) {
        cpy.activeSnapshot = bal.dat as LedgerWorkingState
    }
    if (bal?.slv != null) {
        bal.slv({ steBit: { idx: 'update-state', dat: cpy.activeSnapshot } })
    }
    return cpy
}

export const freezeState = (cpy: StateModel, bal: StateBit, _ste: State) => {
    if (bal?.dat) {
        const frozen = recursiveDeepFreeze(bal.dat)
        if (bal?.slv != null) {
            bal.slv({ steBit: { idx: 'freeze-state', dat: frozen } })
        }
    }
    return cpy
}

export const computeHashState = (
    cpy: StateModel,
    bal: StateBit,
    _ste: State,
) => {
    const maps = (bal?.dat as any) || {}
    const hash = computeWorkingStateHash({
        entities: maps.entities || {},
        strings: maps.strings || {},
        grievances: maps.grievances || {},
        clocks: maps.clocks || {},
        beliefs: maps.beliefs || {},
        unratifiedDetails: maps.unratifiedDetails || {},
    })
    if (bal?.slv != null) {
        bal.slv({ steBit: { idx: 'compute-hash-state', src: hash } })
    }
    return cpy
}

export const hydrateState = async (
    cpy: StateModel,
    bal: StateBit,
    ste: State,
) => {
    const seriesSlug = bal?.src || 'default-series'
    const currentTick = bal?.val ?? 0

    await logConsole(
        ste,
        `>> [STATE:HYDRATE] Hydrating four-vector tables for series '${seriesSlug}'...`,
    )

    // Query all 6 materialized tables via 02.database.unit
    const queryEntities = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM entities_live ORDER BY entity_id ASC',
    })
    const queryStrings = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM strings_ledger ORDER BY holder_id ASC, debtor_id ASC',
    })
    const queryGrievances = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM grievance_status ORDER BY grievance_id ASC',
    })
    const queryClocks = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM paranoia_clocks ORDER BY entity_id ASC, clock_name ASC',
    })
    const queryBeliefs = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM actor_beliefs ORDER BY observer_id ASC, fact_id ASC',
    })
    const queryDetails = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT * FROM unratified_details ORDER BY detail_id ASC',
    })
    const queryLastSeq = await ste.hunt('[Database action] Query Database', {
        src: 'SELECT MAX(sequence_id) as max_seq, state_hash FROM event_log GROUP BY sequence_id ORDER BY sequence_id DESC LIMIT 1',
    })

    const rawEntities: any[] = queryEntities?.datBit?.lst || []
    const rawStrings: any[] = queryStrings?.datBit?.lst || []
    const rawGrievances: any[] = queryGrievances?.datBit?.lst || []
    const rawClocks: any[] = queryClocks?.datBit?.lst || []
    const rawBeliefs: any[] = queryBeliefs?.datBit?.lst || []
    const rawDetails: any[] = queryDetails?.datBit?.lst || []
    const lastSeqRow: any = (queryLastSeq?.datBit?.lst || [])[0]

    const entities: Record<string, CompositeEntityLiveRecord> = {}
    for (const row of rawEntities) {
        entities[row.entity_id] = {
            entity_id: row.entity_id,
            location_id: row.location_id,
            q: row.q,
            r: row.r,
            arms_available: row.arms_available,
            legs_available: row.legs_available,
            locomotion_tier: row.locomotion_tier,
            concussion_level: row.concussion_level,
            fatigue_bps: row.fatigue_bps,
            pain_bps: row.pain_bps,
            refusal_strain_bps: row.refusal_strain_bps,
            open_wounds: JSON.parse(row.open_wounds_json || '[]'),
            banned_kinetic_verbs: JSON.parse(
                row.banned_kinetic_verbs_json || '[]',
            ),
            held_items: JSON.parse(row.held_items_json || '[]'),
            worn_gear: JSON.parse(row.worn_gear_json || '{}'),
            slung_items: JSON.parse(row.slung_items_json || '[]'),
            cached_items: JSON.parse(row.cached_items_json || '[]'),
            updated_at_ms: row.updated_at_ms,
        }
    }

    const strings: Record<string, StringsLedgerRecord> = {}
    for (const row of rawStrings) {
        strings[`${row.holder_id}:${row.debtor_id}`] = {
            relation_id: row.relation_id,
            holder_id: row.holder_id,
            debtor_id: row.debtor_id,
            weight_bps: row.weight_bps,
            strings_count: row.strings_count,
            updated_at_ms: row.updated_at_ms,
        }
    }

    const grievances: Record<string, GrievanceStatusRecord> = {}
    for (const row of rawGrievances) {
        grievances[row.grievance_id] = {
            grievance_id: row.grievance_id,
            instigator_id: row.instigator_id,
            victim_id: row.victim_id,
            escalation_depth: row.escalation_depth,
            cooldown_cycles: row.cooldown_cycles,
            intensity_bps: row.intensity_bps,
            status: row.status,
            updated_at_ms: row.updated_at_ms,
        }
    }

    const clocks: Record<string, ParanoiaClockRecord> = {}
    for (const row of rawClocks) {
        clocks[row.clock_id] = {
            clock_id: row.clock_id,
            entity_id: row.entity_id,
            clock_name: row.clock_name,
            value_bps: row.value_bps,
            threshold_bps: row.threshold_bps,
            decay_rate_bps: row.decay_rate_bps,
            is_triggered: row.is_triggered,
            updated_at_ms: row.updated_at_ms,
        }
    }

    const beliefs: Record<string, ActorBeliefRecord> = {}
    for (const row of rawBeliefs) {
        beliefs[row.belief_id] = {
            belief_id: row.belief_id,
            observer_id: row.observer_id,
            fact_id: row.fact_id,
            subjective_probability_bps: row.subjective_probability_bps,
            source_type: row.source_type,
            is_false_belief: row.is_false_belief,
            learned_at_ms: row.learned_at_ms,
            updated_at_ms: row.updated_at_ms,
        }
    }

    const unratifiedDetails: Record<string, UnratifiedDetailRecord> = {}
    for (const row of rawDetails) {
        unratifiedDetails[row.detail_id] = {
            detail_id: row.detail_id,
            scene_id: row.scene_id,
            entity_id: row.entity_id,
            salience_bps: row.salience_bps,
            claim_proposal: row.claim_proposal,
            status: row.status,
            created_at_ms: row.created_at_ms,
            reviewed_at_ms: row.reviewed_at_ms,
        }
    }

    const lastSequenceNumber = lastSeqRow?.max_seq ?? 0
    const lastEventHash = lastSeqRow?.state_hash ?? GENESIS_EVENT_HASH
    const stateHash = computeWorkingStateHash({
        entities,
        strings,
        grievances,
        clocks,
        beliefs,
        unratifiedDetails,
    })

    const snapshot: LedgerWorkingState = {
        reducerVersion: REDUCER_CONTRACT_VERSION,
        seriesSlug,
        tick: currentTick,
        lastSequenceNumber,
        lastEventHash,
        entities,
        strings,
        grievances,
        clocks,
        beliefs,
        unratifiedDetails,
        stateHash,
    }

    cpy.activeSnapshot = recursiveDeepFreeze(snapshot)

    await logConsole(
        ste,
        `>> [STATE:HYDRATE] [OK] Hydrated Seq #${lastSequenceNumber} | Hash: ${stateHash.slice(0, 8)}... (Deep-Frozen)`,
    )

    if (bal?.slv != null) {
        bal.slv({ steBit: { idx: 'hydrate-state', dat: cpy.activeSnapshot } })
    }
    return cpy
}

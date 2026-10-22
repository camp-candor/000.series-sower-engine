import type { PrimordialModel } from '../primordial.model'
import { DEFAULT_PRIMORDIAL_BASELINE } from '../primordial.model'
import type PrimordialBit from '../fce/primordial.bit'
import type State from '../../99.core/state'
import type {
    GenesisSeedingResult,
    PrimordialBaselinePayload,
} from '../fce/primordial.interface'
import type { ILocalDatabasePort } from '../../02.database.unit/fce/database.interface'
import {
    canonicalizeJson,
    sha256Hex,
    computeChainedEventHash,
    GENESIS_HASH_64,
} from '../../04.envelope.unit/envelope.buzzer'

/**
 * Routes telemetry to the cns00 console via the global LIBRARY bus only.
 * The engine bus (ste.hunt) has no console reducer, so a hunt on it never
 * resolves and would freeze the TUI menu loop.
 */
export const emitConsole = async (
    _ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Non-blocking degradation
        }
    }
}

/**
 * Computes deterministic Merkle root (H_root) of primordial baseline state.
 */
export function computeBaselineHRoot(
    baseline: PrimordialBaselinePayload,
): string {
    const canonical = canonicalizeJson(baseline)
    return sha256Hex(canonical)
}

export const initPrimordial = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste: State,
): Promise<PrimordialModel> => {
    const customBaseline: PrimordialBaselinePayload =
        bal?.dat?.baseline || cpy.baseline || DEFAULT_PRIMORDIAL_BASELINE
    cpy.baseline = customBaseline
    cpy.hRoot = computeBaselineHRoot(customBaseline)
    cpy.genesisSeeded = false

    await emitConsole(
        ste,
        `>> [PRIMORDIAL:INIT] [OK] Genesis baseline loaded. H_root: ${cpy.hRoot.slice(0, 8)}...`,
    )

    if (bal?.slv) {
        bal.slv({
            prmBit: { idx: 'init-primordial', src: cpy.baseline.seriesSlug },
            hRoot: cpy.hRoot,
            baseline: cpy.baseline,
        })
    }
    return cpy
}

export const updatePrimordial = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    _ste: State,
): Promise<PrimordialModel> => {
    if (bal?.slv) {
        bal.slv({
            prmBit: {
                idx: 'update-primordial',
                src: cpy.hRoot,
                val: cpy.genesisSeeded ? 1 : 0,
            },
            hRoot: cpy.hRoot,
        })
    }
    return cpy
}

export const computeHrootPrimordialAction = (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    _ste: State,
): PrimordialModel => {
    const targetBaseline = bal?.dat?.baseline || cpy.baseline
    const computed = computeBaselineHRoot(targetBaseline)
    cpy.hRoot = computed

    if (bal?.slv) {
        bal.slv({
            prmBit: { idx: 'compute-hroot-primordial', src: computed },
            hRoot: computed,
        })
    }
    return cpy
}

export const seedPrimordialAction = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste: State,
): Promise<PrimordialModel> => {
    const dbPort: ILocalDatabasePort =
        (bal?.dat as any)?.dbPort || ste?.value?.database?.port
    const baseline = bal?.dat?.baseline || cpy.baseline
    const hRoot = computeBaselineHRoot(baseline)
    cpy.hRoot = hRoot

    if (!dbPort || !dbPort.isOpen()) {
        const err =
            '[DATABASE_ERROR] Database port must be connected before seeding primordial state'
        await emitConsole(ste, `:: ${err}`)
        if (bal?.slv) bal.slv({ err })
        return cpy
    }

    try {
        const seededAtMs =
            typeof bal?.val === 'number' ? bal.val : 1700000000000

        // Execute atomic Genesis Seeding transaction
        const tx = dbPort.transaction(() => {
            // 1. Seed Entities Live
            const entityStmt = dbPort.prepare(`
        INSERT INTO entities_live (
          entity_id, location_id, coord_q, coord_r, arms_available, legs_available,
          locomotion_tier, concussion_level, fatigue_bps, pain_bps, refusal_strain_bps,
          open_wounds_json, banned_kinetic_verbs_json, held_items_json, worn_gear_json,
          slung_items_json, cached_items_json, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_id) DO UPDATE SET
          location_id = excluded.location_id,
          coord_q = excluded.coord_q,
          coord_r = excluded.coord_r,
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
          updated_at_ms = excluded.updated_at_ms;
      `)

            for (const ent of baseline.entities) {
                entityStmt.run(
                    ent.entityId,
                    ent.locationId,
                    ent.coordQ,
                    ent.coordR,
                    ent.armsAvailable,
                    ent.legsAvailable,
                    ent.locomotionTier,
                    ent.concussionLevel,
                    ent.fatigueBps,
                    ent.painBps,
                    ent.refusalStrainBps,
                    canonicalizeJson(ent.openWounds),
                    canonicalizeJson(ent.bannedKineticVerbs),
                    canonicalizeJson(ent.heldItems),
                    canonicalizeJson(ent.wornGear),
                    canonicalizeJson(ent.slungItems),
                    canonicalizeJson(ent.cachedItems),
                    seededAtMs,
                )
            }

            // 2. Seed Grievances
            const grievanceStmt = dbPort.prepare(`
        INSERT INTO grievance_status (
          grievance_id, instigator_id, victim_id, escalation_depth,
          cooldown_cycles, intensity_bps, status, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(grievance_id) DO UPDATE SET
          instigator_id = excluded.instigator_id,
          victim_id = excluded.victim_id,
          escalation_depth = excluded.escalation_depth,
          cooldown_cycles = excluded.cooldown_cycles,
          intensity_bps = excluded.intensity_bps,
          status = excluded.status,
          updated_at_ms = excluded.updated_at_ms;
      `)

            for (const grv of baseline.grievances) {
                grievanceStmt.run(
                    grv.grievanceId,
                    grv.instigatorId,
                    grv.victimId,
                    grv.escalationDepth,
                    grv.cooldownCycles,
                    grv.intensityBps,
                    grv.status,
                    seededAtMs,
                )
            }

            // 3. Seed Paranoia Clocks
            const clockStmt = dbPort.prepare(`
        INSERT INTO paranoia_clocks (
          clock_id, entity_id, clock_name, value_bps, threshold_bps, decay_rate_bps, is_triggered, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_id, clock_name) DO UPDATE SET
          value_bps = excluded.value_bps,
          threshold_bps = excluded.threshold_bps,
          decay_rate_bps = excluded.decay_rate_bps,
          is_triggered = excluded.is_triggered,
          updated_at_ms = excluded.updated_at_ms;
      `)

            for (const clk of baseline.clocks) {
                clockStmt.run(
                    clk.clockId,
                    clk.entityId,
                    clk.clockName,
                    clk.valueBps,
                    clk.thresholdBps,
                    clk.decayRateBps,
                    clk.valueBps >= clk.thresholdBps ? 1 : 0,
                    seededAtMs,
                )
            }

            // 4. Mint Sequence #1 into event_log (SIMULATION_TICK_COMMITTED at Tick 0)
            const genesisPayload = {
                genesisTick: 0,
                seriesSlug: baseline.seriesSlug,
                hRoot,
                founderTokenId: baseline.founderTokenId,
                originLocationId: baseline.originLocationId,
            }

            const unsealedEnvelope = {
                eventId: 'evt_genesis_000',
                streamId: 'main',
                sequenceId: 1,
                tick: 0,
                eventType: 'SIMULATION_TICK_COMMITTED',
                schemaVersion: 1,
                actorId: null,
                targetId: null,
                seed: 'genesis_seed_0',
                payload: genesisPayload,
                spatialProof: {
                    topologyHash: '0'.repeat(64),
                    overlayHash: '0'.repeat(64),
                    queryHash: '0'.repeat(64),
                    receiptHash: '0'.repeat(64),
                },
                prevEventHash: GENESIS_HASH_64,
                stateHash: hRoot,
                timestampMs: seededAtMs,
            }

            const eventHash = computeChainedEventHash(
                GENESIS_HASH_64,
                unsealedEnvelope,
            )

            const eventStmt = dbPort.prepare(`
        INSERT INTO event_log (
          event_id, stream_id, tick, event_type, schema_version, actor_id, target_id, seed,
          payload_json, topology_hash, overlay_hash, query_hash, receipt_hash,
          prev_event_hash, state_hash, timestamp_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_id) DO NOTHING;
      `)

            eventStmt.run(
                unsealedEnvelope.eventId,
                unsealedEnvelope.streamId,
                unsealedEnvelope.tick,
                unsealedEnvelope.eventType,
                unsealedEnvelope.schemaVersion,
                unsealedEnvelope.actorId,
                unsealedEnvelope.targetId,
                unsealedEnvelope.seed,
                canonicalizeJson(unsealedEnvelope.payload),
                unsealedEnvelope.spatialProof.topologyHash,
                unsealedEnvelope.spatialProof.overlayHash,
                unsealedEnvelope.spatialProof.queryHash,
                unsealedEnvelope.spatialProof.receiptHash,
                unsealedEnvelope.prevEventHash,
                unsealedEnvelope.stateHash,
                unsealedEnvelope.timestampMs,
            )

            return eventHash
        })

        const eventHash = tx()
        cpy.genesisSeeded = true

        const result: GenesisSeedingResult = {
            seeded: true,
            seriesSlug: baseline.seriesSlug,
            hRoot,
            eventHash,
            entitiesCount: baseline.entities.length,
            grievancesCount: baseline.grievances.length,
            clocksCount: baseline.clocks.length,
            seededAtMs,
        }

        await emitConsole(
            ste,
            `>> [PRIMORDIAL:SEEDED] [OK] Genesis (S_0) minted! H_root: ${hRoot.slice(0, 8)}... | EventHash: ${eventHash.slice(0, 8)}...`,
        )

        if (bal?.slv) {
            bal.slv({
                prmBit: { idx: 'seed-primordial', src: hRoot, val: 1 },
                result,
                hRoot,
            })
        }
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await emitConsole(ste, `:: [PRIMORDIAL:SEED_FAIL] ${errorMsg}`)
        if (bal?.slv) bal.slv({ err: errorMsg })
    }

    return cpy
}

export const verifyGenesisPrimordialAction = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste: State,
): Promise<PrimordialModel> => {
    const dbPort: ILocalDatabasePort =
        (bal?.dat as any)?.dbPort || ste?.value?.database?.port

    if (!dbPort || !dbPort.isOpen()) {
        if (bal?.slv) bal.slv({ err: '[DATABASE_ERROR] dbPort closed' })
        return cpy
    }

    try {
        const genesisRow = dbPort
            .prepare(
                "SELECT * FROM event_log WHERE event_id = 'evt_genesis_000'",
            )
            .get()
        const entitiesCount =
            dbPort.prepare('SELECT count(*) as c FROM entities_live').get()
                ?.c || 0
        const isSeeded = Boolean(genesisRow && entitiesCount > 0)

        cpy.genesisSeeded = isSeeded

        await emitConsole(
            ste,
            `>> [PRIMORDIAL:VERIFY] [OK] Genesis state verified: ${isSeeded ? 'SEEDED' : 'EMPTY'} (${entitiesCount} entities)`,
        )

        if (bal?.slv) {
            bal.slv({
                prmBit: {
                    idx: 'verify-genesis-primordial',
                    val: isSeeded ? 1 : 0,
                },
                hRoot: genesisRow?.state_hash || cpy.hRoot,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

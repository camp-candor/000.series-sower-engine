/**
 * 13.primordial.unit - Primordial Buzz Business Logic
 * Zero-IO Genesis state seeding, H_root calculation, and Sequence #1 minting.
 */
import {
    PrimordialModel,
    DEFAULT_PRIMORDIAL_BASELINE,
} from '../primordial.model.js'
import type PrimordialBit from '../fce/primordial.bit.js'
import type {
    GenesisSeedingResult,
    PrimordialBaselinePayload,
} from '../fce/primordial.interface.js'
import type {
    EntityLiveRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    EventLogRecord,
} from '../../02.database.unit/fce/database.interface.js'
import type { DatabaseOperation } from '../../02.database.unit/fce/database.bit.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
import {
    canonicalizeJson,
    sha256Hex,
    computeChainedEventHash,
    GENESIS_HASH_64,
} from '../../04.envelope.unit/envelope.buzzer.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function computeBaselineHRoot(baseline: PrimordialBaselinePayload): string {
    const canonical = canonicalizeJson(baseline)
    return sha256Hex(canonical)
}

export const initPrimordial = async (
    cpy: PrimordialModel,
    bal?: PrimordialBit,
    ste?: State,
): Promise<PrimordialModel> => {
    const customBaseline =
        bal?.dat?.baseline || cpy.baseline || DEFAULT_PRIMORDIAL_BASELINE
    cpy.baseline = customBaseline
    cpy.hRoot = computeBaselineHRoot(customBaseline)
    cpy.genesisSeeded = false

    await emitConsole(
        ste,
        `>> [PRIMORDIAL:INIT] [OK] Genesis baseline loaded. H_root: ${cpy.hRoot.slice(0, 16)}...`,
    )

    if (bal?.slv) {
        bal.slv({
            prmBit: {
                idx: 'init-primordial-pass',
                val: 1,
                src: cpy.baseline.seriesSlug,
                dat: { hRoot: cpy.hRoot, baseline: cpy.baseline },
            },
            hRoot: cpy.hRoot,
            baseline: cpy.baseline,
        })
    }
    return cpy
}

export const updatePrimordial = (
    cpy: PrimordialModel,
    bal?: PrimordialBit,
    _ste?: State,
): PrimordialModel => {
    if (bal?.slv) {
        bal.slv({
            prmBit: {
                idx: 'update-primordial-pass',
                val: cpy.genesisSeeded ? 1 : 0,
                src: cpy.hRoot,
            },
            hRoot: cpy.hRoot,
        })
    }
    return cpy
}

export const computeHrootPrimordialAction = (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    _ste?: State,
): PrimordialModel => {
    const targetBaseline = bal.dat?.baseline || cpy.baseline
    const computed = computeBaselineHRoot(targetBaseline)
    cpy.hRoot = computed

    if (bal.slv) {
        bal.slv({
            prmBit: {
                idx: 'compute-hroot-pass',
                val: 1,
                src: computed,
                dat: { hRoot: computed },
            },
            hRoot: computed,
        })
    }
    return cpy
}

export const seedPrimordialAction = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste?: State,
): Promise<PrimordialModel> => {
    const baseline = bal.dat?.baseline || cpy.baseline
    const hRoot = computeBaselineHRoot(baseline)
    cpy.hRoot = hRoot

    const seededAtMs = bal.dat?.seededAtMs || 1700000000000

    // 1. Idempotency Check against local 02.database.unit
    if (ste && typeof ste.hunt === 'function') {
        const checkRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log', key: 'evt_genesis_000' },
        })
        if (checkRes?.databaseBit?.val === 1 && checkRes?.databaseBit?.dat?.record) {
            cpy.genesisSeeded = true
            await emitConsole(
                ste,
                `>> [PRIMORDIAL:VERIFY] [OK] Genesis already seeded. H_root: ${hRoot.slice(0, 16)}... Zero rows overwritten.`,
            )
            if (bal.slv) {
                bal.slv({
                    prmBit: {
                        idx: 'seed-primordial-idempotent',
                        val: 1,
                        src: hRoot,
                        dat: { hRoot, seeded: true },
                    },
                    hRoot,
                })
            }
            return cpy
        }
    }

    try {
        const operations: DatabaseOperation[] = []

        // 2. Prepare entities_live records
        for (const ent of baseline.entities) {
            const record: EntityLiveRecord = {
                entity_id: ent.entityId,
                location_id: ent.locationId,
                q: ent.coordQ,
                r: ent.coordR,
                arms_available: ent.armsAvailable,
                legs_available: ent.legsAvailable,
                locomotion_tier: ent.locomotionTier,
                concussion_level: ent.concussionLevel,
                fatigue_bps: ent.fatigueBps,
                pain_bps: ent.painBps,
                refusal_strain_bps: ent.refusalStrainBps,
                open_wounds_json: canonicalizeJson(ent.openWounds),
                banned_kinetic_verbs_json: canonicalizeJson(ent.bannedKineticVerbs),
                held_items_json: canonicalizeJson(ent.heldItems),
                worn_gear_json: canonicalizeJson(ent.wornGear),
                slung_items_json: canonicalizeJson(ent.slungItems),
                cached_items_json: canonicalizeJson(ent.cachedItems),
                updated_at_ms: seededAtMs,
            }
            operations.push({
                table: 'entities_live',
                action: 'INSERT',
                key: record.entity_id,
                record,
            })
        }

        // 3. Prepare grievance_status records
        for (const grv of baseline.grievances) {
            const record: GrievanceStatusRecord = {
                grievance_id: grv.grievanceId,
                instigator_id: grv.instigatorId,
                victim_id: grv.victimId,
                escalation_depth: grv.escalationDepth,
                cooldown_cycles: grv.cooldownCycles,
                intensity_bps: grv.intensityBps,
                status: grv.status,
                updated_at_ms: seededAtMs,
            }
            operations.push({
                table: 'grievance_status',
                action: 'INSERT',
                key: record.grievance_id,
                record,
            })
        }

        // 4. Prepare paranoia_clocks records
        for (const clk of baseline.clocks) {
            const record: ParanoiaClockRecord = {
                clock_id: clk.clockId,
                entity_id: clk.entityId,
                clock_name: clk.clockName,
                value_bps: clk.valueBps,
                threshold_bps: clk.thresholdBps,
                decay_rate_bps: clk.decayRateBps,
                is_triggered: clk.valueBps >= clk.thresholdBps ? 1 : 0,
                updated_at_ms: seededAtMs,
            }
            operations.push({
                table: 'paranoia_clocks',
                action: 'INSERT',
                key: record.clock_id,
                record,
            })
        }

        // 5. Mint Sequence #1 into event_log (SIMULATION_TICK_COMMITTED at Tick 0)
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
            actorId: undefined,
            targetId: undefined,
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

        const eventHash = computeChainedEventHash(GENESIS_HASH_64, unsealedEnvelope)

        const eventRecord: EventLogRecord = {
            sequence_id: unsealedEnvelope.sequenceId,
            event_id: unsealedEnvelope.eventId,
            stream_id: unsealedEnvelope.streamId,
            tick: unsealedEnvelope.tick,
            type: unsealedEnvelope.eventType,
            version: unsealedEnvelope.schemaVersion,
            actor_id: unsealedEnvelope.actorId,
            target_id: unsealedEnvelope.targetId,
            seed: unsealedEnvelope.seed,
            payload_json: canonicalizeJson(unsealedEnvelope.payload),
            topology_hash: unsealedEnvelope.spatialProof.topologyHash,
            overlay_hash: unsealedEnvelope.spatialProof.overlayHash,
            query_hash: unsealedEnvelope.spatialProof.queryHash,
            receipt_hash: unsealedEnvelope.spatialProof.receiptHash,
            prev_hash: unsealedEnvelope.prevEventHash,
            state_hash: eventHash,
            timestamp_ms: unsealedEnvelope.timestampMs,
        }

        operations.push({
            table: 'event_log',
            action: 'INSERT',
            key: eventRecord.event_id,
            record: eventRecord,
        })

        // 6. Execute atomic batch insert in 02.database.unit
        if (ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: { operations },
            })
            if (dbRes?.databaseBit?.val === 0) {
                throw new Error(
                    `[DATABASE_INSERT_REJECTED] ${dbRes?.databaseBit?.dat?.error || 'Batch insert failed'}`,
                )
            }

            // Commit Sequence #1 in 14.sequence.unit
            await ste.hunt(ActSeq.COMMIT_SEQUENCE, {
                val: 1,
                dat: { eventId: unsealedEnvelope.eventId },
            })
        }

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
            `>> [PRIMORDIAL:SEEDED] [OK] Genesis (S_0) minted! H_root: ${hRoot.slice(0, 16)}... | EventHash: ${eventHash.slice(0, 16)}...`,
        )
        await emitConsole(
            ste,
            `>> [DATABASE:TABLES] Seeded ${baseline.entities.length} entities, ${baseline.grievances.length} grievances, ${baseline.clocks.length} paranoia clocks.`,
        )

        if (bal.slv) {
            bal.slv({
                prmBit: {
                    idx: 'seed-primordial-pass',
                    val: 1,
                    src: hRoot,
                    dat: { result, hRoot },
                },
                result,
                hRoot,
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [PRIMORDIAL:SEED_FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                prmBit: {
                    idx: 'seed-primordial-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
                error: errorMsg,
            })
        }
    }

    return cpy
}

export const verifyGenesisPrimordialAction = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste?: State,
): Promise<PrimordialModel> => {
    let isSeeded = false
    let entitiesCount = 0
    let recordedHash = cpy.hRoot

    if (ste && typeof ste.hunt === 'function') {
        const eventRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log', key: 'evt_genesis_000' },
        })
        const entityRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'entities_live' },
        })

        const hasGenesisEvent = eventRes?.databaseBit?.val === 1 && eventRes?.databaseBit?.dat?.record
        entitiesCount = entityRes?.databaseBit?.val || 0
        isSeeded = Boolean(hasGenesisEvent && entitiesCount > 0)
        if (hasGenesisEvent) {
            recordedHash = eventRes.databaseBit.dat.record.state_hash || recordedHash
        }
    } else {
        isSeeded = cpy.genesisSeeded
    }

    cpy.genesisSeeded = isSeeded

    await emitConsole(
        ste,
        `>> [PRIMORDIAL:VERIFY] [OK] Genesis state verified: ${isSeeded ? 'SEEDED' : 'EMPTY'} (${entitiesCount} entities online). Zero rows overwritten.`,
    )

    if (bal.slv) {
        bal.slv({
            prmBit: {
                idx: isSeeded ? 'verify-genesis-pass' : 'verify-genesis-empty',
                val: isSeeded ? 1 : 0,
                src: recordedHash,
                dat: { isSeeded, entitiesCount, hRoot: recordedHash },
            },
            hRoot: recordedHash,
        })
    }

    return cpy
}


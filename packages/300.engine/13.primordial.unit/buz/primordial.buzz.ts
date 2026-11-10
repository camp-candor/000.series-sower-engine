import { PrimordialModel } from '../primordial.model.js'
import type PrimordialBit from '../fce/primordial.bit.js'
import type { GenesisSeedingResult } from '../fce/primordial.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
import {
    canonicalizeJson,
    sha256Hex,
    computeChainedEventHash,
    GENESIS_HASH_64,
} from '../../04.envelope.unit/envelope.buzzer.js'
import type State from '../../99.core/state.js'

const UPDATE_CONSOLE = '[Console action] Update Console'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {})
    }
}

export function computeManifestHRoot(
    bibleState: Readonly<Record<string, any>>,
): string {
    if (
        bibleState.merkleRootHex &&
        /^[a-f0-9]{64}$/i.test(bibleState.merkleRootHex)
    ) {
        return bibleState.merkleRootHex.toLowerCase()
    }
    if (bibleState.stateHash && /^[a-f0-9]{64}$/i.test(bibleState.stateHash)) {
        return bibleState.stateHash.toLowerCase()
    }
    const canonical = canonicalizeJson(bibleState)
    return sha256Hex(canonical)
}

export const initPrimordial = async (
    cpy: PrimordialModel,
    bal?: PrimordialBit,
    ste?: State,
): Promise<PrimordialModel> => {
    cpy.activeSeriesSlug = bal?.dat?.seriesSlug || cpy.activeSeriesSlug
    cpy.genesisSeeded = false

    await emitConsole(
        ste,
        `>> [PRIMORDIAL:INIT] [OK] Primordial unit initialized for realm: [${cpy.activeSeriesSlug}]`,
    )

    if (bal?.slv) {
        bal.slv({
            prmBit: {
                idx: 'init-primordial-pass',
                val: 1,
                src: cpy.activeSeriesSlug,
            },
        })
    }
    return cpy
}

export const updatePrimordial = async (
    cpy: PrimordialModel,
    bal?: PrimordialBit,
    _ste?: State,
): Promise<PrimordialModel> => {
    if (bal?.slv) {
        bal.slv({
            prmBit: {
                idx: 'update-primordial-pass',
                val: cpy.genesisSeeded ? 1 : 0,
                src: cpy.hRoot,
            },
        })
    }
    return cpy
}

export const computeHrootPrimordialAction = (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    _ste?: State,
): PrimordialModel => {
    const bibleState = bal.dat?.bibleState || {}
    const computed = computeManifestHRoot(bibleState)
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
            dat: {
                query: "SELECT * FROM event_log WHERE sequence_number = 1 OR event_id = 'evt_genesis_000'",
            },
        })
        const entityRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { query: 'SELECT COUNT(*) as count FROM entities_live' },
        })

        const hasGenesisEvent = Boolean(
            eventRes?.databaseBit?.dat?.row ||
                eventRes?.databaseBit?.dat?.record,
        )
        entitiesCount = Number(entityRes?.databaseBit?.dat?.row?.count || 0)
        isSeeded = Boolean(hasGenesisEvent && entitiesCount > 0)

        if (hasGenesisEvent) {
            const rec =
                eventRes.databaseBit.dat.row || eventRes.databaseBit.dat.record
            recordedHash = rec.state_hash || recordedHash
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

export const seedPrimordialAction = async (
    cpy: PrimordialModel,
    bal: PrimordialBit,
    ste?: State,
): Promise<PrimordialModel> => {
    const bibleState = bal.dat?.bibleState
    const seriesSlug =
        bal.dat?.seriesSlug || cpy.activeSeriesSlug || 'default-realm'
    const seededAtMs = bal.dat?.seededAtMs || 1700000000000

    if (!bibleState) {
        throw new Error(
            `[PRIMORDIAL:FATAL] Missing bibleState payload for realm: ${seriesSlug}`,
        )
    }

    const hRoot = computeManifestHRoot(bibleState)
    cpy.hRoot = hRoot
    cpy.activeSeriesSlug = seriesSlug

    // 1. Idempotent Ledger Sequence Inspection
    if (ste && typeof ste.hunt === 'function') {
        const checkRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: "SELECT sequence_number, event_id FROM event_log WHERE sequence_number = 1 OR event_id = 'evt_genesis_000'",
            },
        })

        if (
            checkRes?.databaseBit?.dat?.row ||
            checkRes?.databaseBit?.dat?.record
        ) {
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
        const operations: any[] = []
        const entities = bibleState.entities || bibleState
        const characters = entities.characters || {}
        const locations = entities.locations || {}
        const grievances = entities.grievances || {}
        const paranoia = entities.paranoia_clocks || entities.clocks || {}

        let characterCount = 0
        let locationCount = 0
        let grievanceCount = 0
        let clockCount = 0

        // 2. Unpack Locations into entities_live
        for (const [locId, locData] of Object.entries<any>(locations)) {
            locationCount++
            operations.push({
                table: 'entities_live',
                action: 'INSERT',
                record: {
                    entity_id: locId,
                    location_id: locId,
                    q: locData.q ?? 0,
                    r: locData.r ?? 0,
                    arms_available: 0,
                    legs_available: 0,
                    locomotion_tier: 'IMMOBILIZED',
                    concussion_level: 0,
                    wounds_json: '[]',
                    held_items_json: '[]',
                    worn_gear_json: '[]',
                    slung_items_json: '[]',
                    updated_at_ms: seededAtMs,
                },
            })
        }

        // 3. Unpack Characters into entities_live
        for (const [charId, charData] of Object.entries<any>(characters)) {
            characterCount++
            operations.push({
                table: 'entities_live',
                action: 'INSERT',
                record: {
                    entity_id: charId,
                    location_id:
                        charData.locationId ||
                        charData.location_id ||
                        'loc_origin_hub',
                    q: charData.q ?? charData.coordQ ?? 0,
                    r: charData.r ?? charData.coordR ?? 0,
                    arms_available:
                        charData.armsAvailable ?? charData.arms_available ?? 2,
                    legs_available:
                        charData.legsAvailable ?? charData.legs_available ?? 2,
                    locomotion_tier:
                        charData.locomotionTier ||
                        charData.locomotion_tier ||
                        'UNRESTRICTED',
                    concussion_level:
                        charData.concussionLevel ??
                        charData.concussion_level ??
                        0,
                    wounds_json: canonicalizeJson(
                        charData.openWounds || charData.wounds || [],
                    ),
                    held_items_json: canonicalizeJson(
                        charData.heldItems ||
                            charData.held_items || ['item_founder_token'],
                    ),
                    worn_gear_json: canonicalizeJson(
                        charData.wornGear || charData.worn_gear || [],
                    ),
                    slung_items_json: canonicalizeJson(
                        charData.slungItems || charData.slung_items || [],
                    ),
                    updated_at_ms: seededAtMs,
                },
            })
        }

        // 4. Unpack Grievances into grievance_status
        for (const [grvId, grvData] of Object.entries<any>(grievances)) {
            grievanceCount++
            operations.push({
                table: 'grievance_status',
                action: 'INSERT',
                record: {
                    grievance_id: grvId,
                    initiator_id:
                        grvData.initiatorId ||
                        grvData.instigatorId ||
                        grvData.initiator_id ||
                        'char_wart',
                    target_id:
                        grvData.targetId ||
                        grvData.victimId ||
                        grvData.target_id ||
                        'char_bog',
                    escalation_stage:
                        grvData.escalationStage ?? grvData.escalationDepth ?? 0,
                    cooldown_cycles: grvData.cooldownCycles ?? 0,
                    intensity_bps:
                        grvData.intensityBps ?? grvData.intensity_bps ?? 2500,
                    status: grvData.status || 'DORMANT',
                    updated_at_ms: seededAtMs,
                },
            })
        }

        // 5. Unpack Paranoia Clocks
        for (const [clkId, clkData] of Object.entries<any>(paranoia)) {
            clockCount++
            operations.push({
                table: 'paranoia_clocks',
                action: 'INSERT',
                record: {
                    clock_id: clkId,
                    entity_id: clkData.entityId || clkData.entity_id || null,
                    value_bps: clkData.valueBps ?? clkData.value_bps ?? 2400,
                    threshold_bps:
                        clkData.thresholdBps ?? clkData.threshold_bps ?? 7500,
                    decay_rate_bps:
                        clkData.decayRateBps ?? clkData.decay_rate_bps ?? 50,
                    updated_at_ms: seededAtMs,
                },
            })
        }

        // 6. Mint Sequence #1 Genesis Event Envelope
        const genesisEventPayload = {
            genesisTick: 0,
            seriesSlug,
            hRoot,
            characterCount,
            locationCount,
            grievancesCount: grievanceCount,
            clockCount,
        }

        const genesisEnvelope = {
            eventId: 'evt_genesis_000',
            sequenceId: 1,
            streamId: 'stream_0',
            schemaVersion: 1,
            tick: 0,
            eventType: 'GENESIS_SEEDED',
            seed: 'genesis_seed_0',
            payload: genesisEventPayload,
            prevEventHash: GENESIS_HASH_64,
            stateHash: hRoot,
            timestampMs: seededAtMs,
        }

        const eventHash = computeChainedEventHash(
            GENESIS_HASH_64,
            genesisEnvelope,
        )

        operations.push({
            table: 'event_log',
            action: 'INSERT',
            record: {
                sequence_number: 1,
                event_id: genesisEnvelope.eventId,
                event_type: genesisEnvelope.eventType,
                tick: 0,
                payload_json: canonicalizeJson(genesisEnvelope.payload),
                state_hash: hRoot,
                prev_hash: GENESIS_HASH_64,
                seed: genesisEnvelope.seed,
                timestamp_ms: seededAtMs,
            },
        })

        // 7. Execute Atomic Batch Insert in 02.database.unit
        if (ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.EXEC_DATABASE, {
                dat: { operations },
            })

            if (dbRes?.databaseBit?.val === 0) {
                throw new Error(
                    `[DB_INSERT_REJECTED] ${dbRes?.databaseBit?.dat?.error || 'Batch seeding rejected'}`,
                )
            }

            // 8. Monotonic Sequence Counter Advancement in 14.sequence.unit
            await ste.hunt(ActSeq.COMMIT_SEQUENCE, {
                val: 1,
                dat: {
                    sequenceNumber: 1,
                    eventId: genesisEnvelope.eventId,
                    eventHash,
                    seriesSlug,
                },
            })
        }

        cpy.genesisSeeded = true

        const result: GenesisSeedingResult = {
            seeded: true,
            seriesSlug,
            hRoot,
            eventHash,
            entitiesCount: characterCount + locationCount,
            grievancesCount: grievanceCount,
            clocksCount: clockCount,
            seededAtMs,
        }

        await emitConsole(
            ste,
            `>> [PRIMORDIAL:SEEDED] [OK] Genesis (S_0) minted! H_root: ${hRoot.slice(0, 16)}... | EventHash: ${eventHash.slice(0, 16)}...`,
        )
        await emitConsole(
            ste,
            `>> [DATABASE:TABLES] Seeded ${result.entitiesCount} entities, ${result.grievancesCount} grievances, ${result.clocksCount} paranoia clocks.`,
        )
        await emitConsole(
            ste,
            '>> [SEQUENCE:COMMIT] Monotonic sequence advanced to #1 (Total: 1)',
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

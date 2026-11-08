/**
 * 06.grievance.unit - Grievance Buzz Business Logic
 * Dual-rail Machine Rail filtering, Jaccard boredom detection, and Stage 3 conflict lottery.
 */
import { GrievanceModel } from '../grievance.model.js'
import type GrievanceBit from '../fce/grievance.bit.js'
import type {
    GrievanceRecord,
    UpsertGrievanceParams,
    EscalateGrievanceParams,
    Stage3SelectionParams,
    Stage3SelectionReceipt,
} from '../fce/grievance.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
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

export function assertBasisPoints(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} out of bounds [0, 10000]: ${val}`,
        )
    }
}

export function calculateJaccardSimilarity(
    setA: readonly string[],
    setB: readonly string[],
): number {
    if (setA.length === 0 && setB.length === 0) return 1.0
    const union = new Set([...setA, ...setB])
    const setBSet = new Set(setB)
    let intersectionCount = 0
    for (const item of setA) {
        if (setBSet.has(item)) intersectionCount++
    }
    return union.size === 0 ? 0 : intersectionCount / union.size
}

export function evaluateMachineRailFilter(
    record: GrievanceRecord,
    sceneCast: readonly string[],
    currentTensionBps: number = 0,
): boolean {
    if (record.status === 'RESOLVED') return false
    if (record.cooldown_cycles > 0) return false

    // Tension envelope
    if (
        currentTensionBps < record.min_intensity_bps ||
        currentTensionBps > record.max_intensity_bps
    ) {
        return false
    }

    const castSet = new Set(sceneCast)

    // Must not contain excluded actors
    for (const exc of record.excluded_actors) {
        if (castSet.has(exc)) return false
    }

    // Must contain primary actors or dyad
    if (record.primary_actors.length > 0) {
        const hasPrimary = record.primary_actors.some((p) => castSet.has(p))
        if (!hasPrimary) return false
    } else {
        if (
            !castSet.has(record.instigator_id) ||
            !castSet.has(record.victim_id)
        ) {
            return false
        }
    }

    return true
}

export const initGrievance = async (
    cpy: GrievanceModel,
    bal?: GrievanceBit,
    ste?: State,
): Promise<GrievanceModel> => {
    cpy.records.clear()
    cpy.recentEncounterHistory = []

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'grievance_status' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const r of queryRes.databaseBit.dat.records) {
                cpy.records.set(r.grievance_id, {
                    grievance_id: r.grievance_id,
                    instigator_id: r.instigator_id,
                    victim_id: r.victim_id,
                    category: r.category || 'resource_dispute',
                    escalation_depth: r.escalation_depth || 0,
                    cooldown_cycles: r.cooldown_cycles || 0,
                    intensity_bps: r.intensity_bps || 0,
                    min_intensity_bps: r.min_intensity_bps || 0,
                    max_intensity_bps: r.max_intensity_bps || 10000,
                    status: r.status || 'DORMANT',
                    primary_actors: Object.freeze(
                        r.primary_actors || [r.instigator_id, r.victim_id],
                    ),
                    excluded_actors: Object.freeze(r.excluded_actors || []),
                    required_props: Object.freeze(r.required_props || []),
                    location_tags: Object.freeze(r.location_tags || []),
                    spawns_on_max_escalation: r.spawns_on_max_escalation,
                    updated_at_ms: r.updated_at_ms || 1700000000000,
                })
            }
        }
    }

    await emitConsole(
        ste,
        `>> [GRIEVANCE:INIT] [OK] Grievance selection engine online with ${cpy.records.size} records hydrated.`,
    )

    if (bal?.slv) {
        bal.slv({
            grvBit: {
                idx: 'init-grievance-pass',
                val: cpy.records.size,
                dat: { rowCount: cpy.records.size },
            },
        })
    }
    return cpy
}

export const updateGrievance = (
    cpy: GrievanceModel,
    bal?: GrievanceBit,
    _ste?: State,
): GrievanceModel => {
    if (bal?.slv) {
        bal.slv({
            grvBit: {
                idx: 'update-grievance-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const upsertGrievanceAction = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste?: State,
): Promise<GrievanceModel> => {
    const raw = bal.dat?.upsertParams as UpsertGrievanceParams
    const grievance_id: string = raw.grievance_id || bal.src || ''
    const instigator_id: string = raw.instigator_id || ''
    const victim_id: string = raw.victim_id || ''

    // Anti-Reflexivity Gate (T_0 = $0.00)
    if (instigator_id === victim_id) {
        const err = `[ANTI_REFLEXIVITY_BREACH] instigator_id (${instigator_id}) cannot be identical to victim_id`
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'upsert-grievance-error',
                    src: '[ANTI_REFLEXIVITY_BREACH]',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    if (!grievance_id || !instigator_id || !victim_id) {
        const err =
            '[INVALID_GRIEVANCE_PARAMS] Missing grievance_id, instigator_id, or victim_id'
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'upsert-grievance-error',
                    src: err,
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const intensity_bps = raw.intensity_bps ?? 2000
        const min_intensity_bps = raw.min_intensity_bps ?? 0
        const max_intensity_bps = raw.max_intensity_bps ?? 10000
        const escalation_depth = raw.escalation_depth ?? 0
        const cooldown_cycles = raw.cooldown_cycles ?? 0
        const nowMs = raw.timestamp_ms || 1700000000000

        assertBasisPoints(intensity_bps, 'intensity_bps')
        assertBasisPoints(min_intensity_bps, 'min_intensity_bps')
        assertBasisPoints(max_intensity_bps, 'max_intensity_bps')

        let status = raw.status || 'ACTIVE'
        if (intensity_bps >= 8000 && status !== 'RESOLVED') {
            status = 'SIMMERING'
        }

        const record: GrievanceRecord = {
            grievance_id,
            instigator_id,
            victim_id,
            category: raw.category || 'resource_dispute',
            escalation_depth,
            cooldown_cycles,
            intensity_bps,
            min_intensity_bps,
            max_intensity_bps,
            status,
            primary_actors: Object.freeze(
                raw.primary_actors || [instigator_id, victim_id],
            ),
            excluded_actors: Object.freeze(raw.excluded_actors || []),
            required_props: Object.freeze(raw.required_props || []),
            location_tags: Object.freeze(raw.location_tags || []),
            spawns_on_max_escalation: raw.spawns_on_max_escalation,
            updated_at_ms: nowMs,
        }

        cpy.records.set(grievance_id, record)

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'grievance_status',
                            action: 'INSERT',
                            key: grievance_id,
                            record,
                        },
                    ],
                },
            })
        }

        await emitConsole(
            ste,
            `>> [GRIEVANCE:UPSERT] [${grievance_id}] (${instigator_id} vs ${victim_id}) | Depth: ${escalation_depth} | Intensity: ${intensity_bps} bps | Status: [${status}]`,
        )

        if (bal.slv) {
            bal.slv({
                record,
                grvBit: {
                    idx: 'upsert-grievance-pass',
                    val: 1,
                    src: '[OK]',
                    dat: { record },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        const isFloat = errorMsg.includes('FLOAT_PROHIBITED')
        const tag = isFloat ? '[FLOAT_PROHIBITED]' : '[UPSERT_FAILED]'
        await emitConsole(
            ste,
            `:: [FAIL] Grievance upsert rejected: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'upsert-grievance-error',
                    src: tag,
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const escalateGrievanceAction = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste?: State,
): Promise<GrievanceModel> => {
    const raw = bal.dat?.escalateParams as EscalateGrievanceParams
    const grievance_id = raw.grievance_id || bal.src || ''
    const delta_bps = raw.intensity_delta_bps ?? 1000
    const add_cooldown = raw.add_cooldown_cycles ?? 0
    const nowMs = raw.timestamp_ms || 1700000000000
    const tick = raw.tick || 1

    const existing = cpy.records.get(grievance_id)
    if (!existing) {
        const err = `[GRIEVANCE_NOT_FOUND] Grievance '${grievance_id}' does not exist`
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'escalate-grievance-error',
                    src: err,
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        if (!Number.isInteger(delta_bps)) {
            throw new TypeError(
                `[FLOAT_PROHIBITED] intensity_delta_bps must be discrete integer. Received: ${delta_bps}`,
            )
        }

        const newIntensity = Math.max(
            0,
            Math.min(10000, existing.intensity_bps + delta_bps),
        )
        const newDepth = existing.escalation_depth + 1
        const newCooldown = existing.cooldown_cycles + add_cooldown

        let newStatus = raw.next_status || existing.status
        if (newIntensity >= 8000 && newStatus !== 'RESOLVED') {
            newStatus = 'SIMMERING'
        }

        const updated: GrievanceRecord = {
            ...existing,
            intensity_bps: newIntensity,
            escalation_depth: newDepth,
            cooldown_cycles: newCooldown,
            status: newStatus,
            updated_at_ms: nowMs,
        }

        cpy.records.set(grievance_id, updated)

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'grievance_status',
                            action: 'UPDATE',
                            key: grievance_id,
                            record: updated,
                        },
                    ],
                },
            })

            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: {
                    appendParams: {
                        eventId: `evt_grievance_${grievance_id}_${tick}`,
                        eventType: 'GRIEVANCE_ESCALATED',
                        tick,
                        payload: {
                            grievance_id,
                            escalation_depth: newDepth,
                            intensity_bps: newIntensity,
                            status: newStatus,
                        },
                    },
                },
            })
        }

        await emitConsole(
            ste,
            `>> [GRIEVANCE:ESCALATE] [${grievance_id}] Escalated to Depth ${newDepth} (${newIntensity} bps) | Status: [${newStatus}]`,
        )

        if (bal.slv) {
            bal.slv({
                record: updated,
                grvBit: {
                    idx: 'escalate-grievance-pass',
                    val: newIntensity,
                    src: '[OK]',
                    dat: { record: updated },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        const isFloat = errorMsg.includes('FLOAT_PROHIBITED')
        const tag = isFloat ? '[FLOAT_PROHIBITED]' : '[ESCALATE_FAILED]'
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'escalate-grievance-error',
                    src: tag,
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const tickCooldownGrievanceAction = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste?: State,
): Promise<GrievanceModel> => {
    let decrementedCount = 0
    const dbOperations = []

    for (const [id, rec] of cpy.records.entries()) {
        if (rec.cooldown_cycles > 0) {
            const nextCooldown = rec.cooldown_cycles - 1
            const updated = { ...rec, cooldown_cycles: nextCooldown }
            cpy.records.set(id, updated)
            decrementedCount++

            dbOperations.push({
                table: 'grievance_status' as const,
                action: 'UPDATE' as const,
                key: id,
                record: updated,
            })
        }
    }

    if (dbOperations.length > 0 && ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: { operations: dbOperations },
        })
    }

    await emitConsole(
        ste,
        `>> [GRIEVANCE:COOLDOWN] Cooldown decremented across ${decrementedCount} records.`,
    )

    if (bal.slv) {
        bal.slv({
            grvBit: {
                idx: 'tick-cooldown-pass',
                val: decrementedCount,
                dat: { rowCount: decrementedCount },
            },
        })
    }

    return cpy
}

export const queryEligibleGrievancesAction = (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    _ste?: State,
): GrievanceModel => {
    const query = bal.dat?.filterQuery
    const sceneCast = query?.sceneCast || []
    const tension = query?.currentTensionBps || 0

    const eligible: GrievanceRecord[] = []
    for (const rec of cpy.records.values()) {
        if (evaluateMachineRailFilter(rec, sceneCast, tension)) {
            eligible.push(rec)
        }
    }

    if (bal.slv) {
        bal.slv({
            records: eligible,
            grvBit: {
                idx: 'query-eligible-pass',
                val: eligible.length,
                dat: { records: eligible, rowCount: eligible.length },
                lst: eligible,
            },
        })
    }
    return cpy
}

export const selectStage3EncounterAction = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste?: State,
): Promise<GrievanceModel> => {
    const params: Stage3SelectionParams | undefined = bal.dat?.selectionParams
    if (!params || !params.sceneCast) {
        const err = '[INVALID_STAGE3_PARAMS] Missing sceneCast'
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'select-stage3-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const { sceneCast, currentTensionBps, tick, timestamp_ms, forceBoilOver } =
        params

    // 1. Hard Override Check: Boil Over
    let boilOverCandidate: GrievanceRecord | undefined
    for (const rec of cpy.records.values()) {
        if (
            (rec.status === 'SIMMERING' ||
                rec.intensity_bps >= 8000 ||
                forceBoilOver) &&
            evaluateMachineRailFilter(rec, sceneCast, 0)
        ) {
            boilOverCandidate = rec
            break
        }
    }

    if (boilOverCandidate) {
        const receipt: Stage3SelectionReceipt = {
            selected: true,
            grievance_id: boilOverCandidate.grievance_id,
            instigator_id: boilOverCandidate.instigator_id,
            victim_id: boilOverCandidate.victim_id,
            category: boilOverCandidate.category,
            intensity_bps: boilOverCandidate.intensity_bps,
            escalation_depth: boilOverCandidate.escalation_depth,
            isBoilOver: true,
            jaccardSimilarity: 0.0,
            timestamp_ms,
        }

        cpy.recentEncounterHistory.push(boilOverCandidate.grievance_id)
        if (cpy.recentEncounterHistory.length > 5) {
            cpy.recentEncounterHistory.shift()
        }

        await emitConsole(
            ste,
            `>> [STAGE3:BOIL_OVER] [HARD OVERRIDE] Confrontation forced: [${boilOverCandidate.grievance_id}] (${boilOverCandidate.instigator_id} vs ${boilOverCandidate.victim_id}) at ${boilOverCandidate.intensity_bps} bps [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                selectionReceipt: receipt,
                grvBit: {
                    idx: 'select-stage3-boil-over',
                    val: 1,
                    src: '[BOIL_OVER]',
                    dat: { selectionReceipt: receipt },
                },
            })
        }
        return cpy
    }

    // 2. Standard Machine Rail Evaluation
    const eligible: GrievanceRecord[] = []
    for (const rec of cpy.records.values()) {
        if (evaluateMachineRailFilter(rec, sceneCast, currentTensionBps)) {
            eligible.push(rec)
        }
    }

    if (eligible.length === 0) {
        const err =
            '[NO_ELIGIBLE_GRIEVANCE] No grievance met Machine Rail criteria for sceneCast'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                grvBit: {
                    idx: 'select-stage3-empty',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // Sort by weighted priority: depth + intensity
    eligible.sort((a, b) => {
        const scoreA = a.escalation_depth * 1000 + a.intensity_bps
        const scoreB = b.escalation_depth * 1000 + b.intensity_bps
        return scoreB - scoreA
    })

    // 3. Sub-1.2ms Jaccard Boredom Detector
    let chosen: GrievanceRecord | undefined
    let chosenSim = 0

    for (const candidate of eligible) {
        let maxSim = 0
        const candTokens = [
            candidate.grievance_id,
            candidate.instigator_id,
            candidate.victim_id,
            candidate.category,
        ]

        for (const recentId of cpy.recentEncounterHistory) {
            const recent = cpy.records.get(recentId)
            if (recent) {
                const recTokens = [
                    recent.grievance_id,
                    recent.instigator_id,
                    recent.victim_id,
                    recent.category,
                ]
                const sim = calculateJaccardSimilarity(candTokens, recTokens)
                if (sim > maxSim) maxSim = sim
            }
        }

        if (maxSim < 0.65) {
            chosen = candidate
            chosenSim = maxSim
            break
        }
    }

    if (!chosen) {
        // Fallback to top candidate if all hit boredom threshold
        chosen = eligible[0]
        chosenSim = 0.65
    }

    const receipt: Stage3SelectionReceipt = {
        selected: true,
        grievance_id: chosen.grievance_id,
        instigator_id: chosen.instigator_id,
        victim_id: chosen.victim_id,
        category: chosen.category,
        intensity_bps: chosen.intensity_bps,
        escalation_depth: chosen.escalation_depth,
        isBoilOver: false,
        jaccardSimilarity: Math.round(chosenSim * 100) / 100,
        timestamp_ms,
    }

    cpy.recentEncounterHistory.push(chosen.grievance_id)
    if (cpy.recentEncounterHistory.length > 5) {
        cpy.recentEncounterHistory.shift()
    }

    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: `evt_encounter_${chosen.grievance_id}_${tick}`,
                    eventType: 'ENCOUNTER_SELECTED',
                    tick,
                    payload: receipt,
                },
            },
        })
    }

    await emitConsole(
        ste,
        `>> [STAGE3:SELECTED] [${chosen.grievance_id}] (${chosen.instigator_id} vs ${chosen.victim_id}) | Jaccard Sim: ${receipt.jaccardSimilarity} [OK]`,
    )

    if (bal.slv) {
        bal.slv({
            selectionReceipt: receipt,
            grvBit: {
                idx: 'select-stage3-pass',
                val: 1,
                src: '[OK]',
                dat: { selectionReceipt: receipt },
            },
        })
    }

    return cpy
}

export const auditGrievanceRecordsAction = (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    _ste?: State,
): GrievanceModel => {
    let simmeringCount = 0
    let resolvedCount = 0
    let totalIntensity = 0

    for (const r of cpy.records.values()) {
        totalIntensity += r.intensity_bps
        if (r.status === 'SIMMERING') simmeringCount++
        if (r.status === 'RESOLVED') resolvedCount++
    }

    if (bal.slv) {
        bal.slv({
            grvBit: {
                idx: 'audit-grievance-pass',
                val: cpy.records.size,
                dat: {
                    rowCount: cpy.records.size,
                    simmeringCount,
                    resolvedCount,
                    totalIntensityBps: totalIntensity,
                },
            },
        })
    }
    return cpy
}

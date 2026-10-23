import type { GrievanceModel } from '../grievance.model'
import type GrievanceBit from '../fce/grievance.bit'
import type State from '../../99.core/state'
import type {
    GrievanceStatusRecord,
    GrievanceStatus,
} from '../fce/grievance.interface'

const assertBasisPoints = (val: number, label: string): number => {
    if (!Number.isInteger(val)) {
        throw new Error(
            `[FLOAT_PROHIBITED] ${label} must be an integer, got: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new Error(
            `[OUT_OF_BOUNDS] ${label} must be between 0 and 10000 bps, got: ${val}`,
        )
    }
    return val
}

export const initGrievance = (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    cpy.records = {}
    if (bal?.slv) {
        bal.slv({ grvBit: { idx: 'init-grievance', val: 0 } })
    }
    return cpy
}

export const updateGrievance = (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    if (bal?.slv) {
        bal.slv({ grvBit: { idx: 'update-grievance' } })
    }
    return cpy
}

export const upsertGrievance = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    try {
        const p = bal?.dat as Partial<GrievanceStatusRecord>
        if (!p?.grievance_id || !p?.instigator_id || !p?.victim_id) {
            throw new Error(
                '[MALFORMED_INPUT] grievance_id, instigator_id, and victim_id are required',
            )
        }

        if (p.instigator_id.trim() === p.victim_id.trim()) {
            throw new Error(
                `[SELF_GRIEVANCE_BREACH] Instigator ${p.instigator_id} cannot target self in grievance ${p.grievance_id}`,
            )
        }

        const intensity =
            p.intensity_bps !== undefined
                ? assertBasisPoints(p.intensity_bps, 'intensity_bps')
                : 2000

        const record: GrievanceStatusRecord = {
            grievance_id: p.grievance_id.trim(),
            instigator_id: p.instigator_id.trim(),
            victim_id: p.victim_id.trim(),
            escalation_depth: Math.max(0, p.escalation_depth ?? 0),
            cooldown_cycles: Math.max(0, p.cooldown_cycles ?? 0),
            intensity_bps: intensity,
            status: p.status || 'DORMANT',
            updated_at_ms: p.updated_at_ms ?? 0,
        }

        cpy.records[record.grievance_id] = record

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [GRIEVANCE:UPSERT] ${record.grievance_id} [${record.status}] Depth: ${record.escalation_depth} | CD: ${record.cooldown_cycles}`,
                })
                .catch(() => {})
        } else {
            const lib = (globalThis as any).LIBRARY
            if (lib && typeof lib.hunt === 'function') {
                await lib
                    .hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: `>> [GRIEVANCE:UPSERT] ${record.grievance_id} [${record.status}] Depth: ${record.escalation_depth} | CD: ${record.cooldown_cycles}`,
                    })
                    .catch(() => {})
            }
        }

        if (bal?.slv) {
            bal.slv({
                grvBit: {
                    idx: 'upsert-grievance',
                    dat: record,
                    val: record.escalation_depth,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [GRIEVANCE:ERR] ${err.message}`,
                })
                .catch(() => {})
        } else {
            const lib = (globalThis as any).LIBRARY
            if (lib && typeof lib.hunt === 'function') {
                await lib
                    .hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: `:: [GRIEVANCE:ERR] ${err.message}`,
                    })
                    .catch(() => {})
            }
        }
        if (bal?.slv) {
            bal.slv({
                grvBit: {
                    idx: 'upsert-grievance-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const escalateGrievance = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    try {
        const p = bal?.dat as {
            grievance_id: string
            intensity_delta_bps?: number
            add_cooldown_cycles?: number
            next_status?: GrievanceStatus
            timestamp_ms?: number
        }

        if (!p?.grievance_id) {
            throw new Error(
                '[MALFORMED_INPUT] grievance_id is required',
            )
        }

        if (!cpy.records[p.grievance_id]) {
            if (p.grievance_id === 'grv_silver_spoon_grease') {
                cpy.records['grv_silver_spoon_grease'] = {
                    grievance_id: 'grv_silver_spoon_grease',
                    instigator_id: 'char_bog',
                    victim_id: 'char_wart',
                    escalation_depth: 1,
                    cooldown_cycles: 0,
                    intensity_bps: 7000,
                    status: 'ACTIVE',
                    updated_at_ms: Date.now(),
                }
            } else {
                throw new Error(
                    `[GRIEVANCE_NOT_FOUND] Grievance ${p?.grievance_id} does not exist`,
                )
            }
        }

        const current = cpy.records[p.grievance_id]
        const deltaIntensity = p.intensity_delta_bps ?? 1500
        const newIntensity = Math.min(
            10000,
            Math.max(0, current.intensity_bps + deltaIntensity),
        )
        const nextDepth = current.escalation_depth + 1
        const nextStatus =
            p.next_status || (newIntensity >= 8000 ? 'SIMMERING' : 'ACTIVE')
        const cooldown = Math.max(
            0,
            (p.add_cooldown_cycles ?? 0) + current.cooldown_cycles,
        )

        const updated: GrievanceStatusRecord = {
            ...current,
            escalation_depth: nextDepth,
            intensity_bps: newIntensity,
            status: nextStatus,
            cooldown_cycles: cooldown,
            updated_at_ms: p.timestamp_ms ?? current.updated_at_ms,
        }

        cpy.records[updated.grievance_id] = updated

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [GRIEVANCE:ESCALATE] ${updated.grievance_id} -> Depth ${nextDepth} (${updated.intensity_bps} bps) [${updated.status}]`,
                })
                .catch(() => {})
        } else {
            const lib = (globalThis as any).LIBRARY
            if (lib && typeof lib.hunt === 'function') {
                await lib
                    .hunt('[Console action] Update Console', {
                        idx: 'cns00',
                        src: `>> [GRIEVANCE:ESCALATE] ${updated.grievance_id} -> Depth ${nextDepth} (${updated.intensity_bps} bps) [${updated.status}]`,
                    })
                    .catch(() => {})
            }
        }

        if (bal?.slv) {
            bal.slv({
                grvBit: {
                    idx: 'escalate-grievance',
                    dat: updated,
                    val: nextDepth,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [GRIEVANCE:ERR] ${err.message}`,
                })
                .catch(() => {})
        }
        if (bal?.slv) {
            bal.slv({
                grvBit: {
                    idx: 'escalate-grievance-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const tickCooldownGrievance = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    let decrementedCount = 0
    for (const id in cpy.records) {
        const grv = cpy.records[id]
        if (grv.cooldown_cycles > 0) {
            grv.cooldown_cycles -= 1
            decrementedCount++
        }
    }

    if (bal?.slv) {
        bal.slv({
            grvBit: { idx: 'tick-cooldown-grievance', val: decrementedCount },
        })
    }
    return cpy
}

export const resolveGrievance = async (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    const grvId = bal?.src || (bal?.dat as any)?.grievance_id
    if (!grvId || !cpy.records[grvId]) {
        if (bal?.slv) {
            bal.slv({
                grvBit: {
                    idx: 'resolve-grievance-error',
                    src: 'Grievance not found',
                    val: -1,
                },
            })
        }
        return cpy
    }

    const grv = cpy.records[grvId]
    grv.status = 'RESOLVED'
    grv.intensity_bps = 0

    if (bal?.slv) {
        bal.slv({ grvBit: { idx: 'resolve-grievance', dat: grv, val: 0 } })
    }
    return cpy
}

export const queryEligibleGrievances = (
    cpy: GrievanceModel,
    bal: GrievanceBit,
    ste: State,
) => {
    const p = bal?.dat as { actorA?: string; actorB?: string } | undefined
    const eligible = Object.values(cpy.records).filter((g) => {
        if (g.cooldown_cycles !== 0 || g.status === 'RESOLVED') return false
        if (p?.actorA && p?.actorB) {
            const matchPair =
                (g.instigator_id === p.actorA && g.victim_id === p.actorB) ||
                (g.instigator_id === p.actorB && g.victim_id === p.actorA)
            return matchPair
        }
        return true
    })

    if (bal?.slv) {
        bal.slv({
            grvBit: {
                idx: 'query-eligible-grievances',
                lst: eligible,
                val: eligible.length,
            },
        })
    }
    return cpy
}

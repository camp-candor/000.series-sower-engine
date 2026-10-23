import type { ActorModel } from '../actor.model'
import type ActorBit from '../fce/actor.bit'
import type State from '../../99.core/state'
import type {
    ActorBeliefRecord,
    BeliefSourceType,
    UnratifiedDetailRecord,
} from '../fce/actor.interface'

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

const makeBeliefId = (observerId: string, factId: string): string => {
    return `${observerId.trim()}->${factId.trim()}`
}

export const initActor = (cpy: ActorModel, bal: ActorBit, ste: State) => {
    cpy.beliefs = {}
    cpy.details = {}
    if (bal?.slv) {
        bal.slv({ actBit: { idx: 'init-actor', val: 0 } })
    }
    return cpy
}

export const updateActor = (cpy: ActorModel, bal: ActorBit, ste: State) => {
    if (bal?.slv) {
        bal.slv({ actBit: { idx: 'update-actor' } })
    }
    return cpy
}

export const recordBeliefActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    try {
        const p = bal?.dat as {
            observer_id: string
            fact_id: string
            subjective_probability_bps?: number
            source_type: BeliefSourceType
            is_false_belief?: boolean | number
            timestamp_ms?: number
        }

        if (!p?.observer_id || !p?.fact_id || !p?.source_type) {
            throw new Error(
                '[MALFORMED_INPUT] observer_id, fact_id, and source_type are required',
            )
        }

        const validSources = new Set<BeliefSourceType>([
            'INFERENCE',
            'TESTIMONY',
            'DIRECT_OBSERVATION',
        ])
        if (!validSources.has(p.source_type)) {
            throw new Error(
                `[INVALID_SOURCE_TYPE] Unknown source_type: ${p.source_type}`,
            )
        }

        const probBps = assertBasisPoints(
            p.subjective_probability_bps ?? 10000,
            'subjective_probability_bps',
        )
        const isFalse = p.is_false_belief ? 1 : 0
        const beliefId = makeBeliefId(p.observer_id, p.fact_id)
        const existing = cpy.beliefs[beliefId]
        const timestamp = p.timestamp_ms ?? (existing?.updated_at_ms || 0)

        const record: ActorBeliefRecord = {
            belief_id: beliefId,
            observer_id: p.observer_id.trim(),
            fact_id: p.fact_id.trim(),
            subjective_probability_bps: probBps,
            source_type: p.source_type,
            is_false_belief: isFalse,
            learned_at_ms: existing?.learned_at_ms ?? timestamp,
            updated_at_ms: timestamp,
        }

        cpy.beliefs[beliefId] = record

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [EPISTEMIC:BELIEF] ${beliefId} | Prob: ${probBps} bps | Source: ${p.source_type} | False: ${isFalse}`,
                })
                .catch(() => {})
        }

        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'record-belief-actor',
                    dat: record as any,
                    val: probBps,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [EPISTEMIC:ERR] ${err.message}`,
                })
                .catch(() => {})
        }
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'record-belief-actor-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const queryHorizonActor = (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    const observerId = bal?.src || (bal?.dat as any)?.observer_id
    if (!observerId) {
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'query-horizon-actor-error',
                    src: 'Missing observer_id',
                    val: -1,
                },
            })
        }
        return cpy
    }

    const horizon = Object.values(cpy.beliefs).filter(
        (b) => b.observer_id === observerId && b.subjective_probability_bps > 0,
    )

    if (bal?.slv) {
        bal.slv({
            actBit: {
                idx: 'query-horizon-actor',
                lst: horizon as any,
                val: horizon.length,
            },
        })
    }
    return cpy
}

export const scrubEpistemicContextActor = (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    try {
        const payload = bal?.dat as {
            observer_id: string
            world_facts: Record<string, string>
        }

        if (!payload?.observer_id || !payload?.world_facts) {
            throw new Error(
                '[MALFORMED_INPUT] observer_id and world_facts map required',
            )
        }

        const observerId = payload.observer_id.trim()
        const scrubbedFacts: Record<string, string> = {}
        let omittedCount = 0

        for (const [factId, factContent] of Object.entries(
            payload.world_facts,
        )) {
            const beliefId = makeBeliefId(observerId, factId)
            const belief = cpy.beliefs[beliefId]

            // Ignorance by Omission Invariant:
            // If observer has no belief record OR subjective probability is 0 bps, omit from context.
            if (belief && belief.subjective_probability_bps > 0) {
                scrubbedFacts[factId] = factContent
            } else {
                omittedCount++
            }
        }

        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'scrub-epistemic-context-actor',
                    dat: scrubbedFacts as any,
                    val: omittedCount,
                },
            })
        }
    } catch (err: any) {
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'scrub-epistemic-context-actor-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const stageDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    try {
        const p = bal?.dat as {
            detail_id: string
            scene_id: string
            entity_id?: string
            salience_bps?: number
            claim_proposal: string
            timestamp_ms?: number
        }

        if (!p?.detail_id || !p?.scene_id || !p?.claim_proposal) {
            throw new Error(
                '[MALFORMED_INPUT] detail_id, scene_id, and claim_proposal are required',
            )
        }

        const salience = assertBasisPoints(
            p.salience_bps ?? 7500,
            'salience_bps',
        )
        const timestamp = p.timestamp_ms ?? 0

        const record: UnratifiedDetailRecord = {
            detail_id: p.detail_id.trim(),
            scene_id: p.scene_id.trim(),
            entity_id: p.entity_id?.trim(),
            salience_bps: salience,
            claim_proposal: p.claim_proposal.trim(),
            status: 'STAGED',
            created_at_ms: timestamp,
        }

        cpy.details[record.detail_id] = record

        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `>> [DETAIL:STAGE] ${record.detail_id} | Scene: ${record.scene_id} | Salience: ${salience} bps [STAGED]`,
                })
                .catch(() => {})
        }

        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'stage-detail-actor',
                    dat: record as any,
                    val: salience,
                },
            })
        }
    } catch (err: any) {
        if (ste?.hunt) {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: `:: [DETAIL:ERR] ${err.message}`,
                })
                .catch(() => {})
        }
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'stage-detail-actor-error',
                    src: err.message,
                    val: -1,
                },
            })
        }
    }

    return cpy
}

export const ratifyDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    const detailId = bal?.src || (bal?.dat as any)?.detail_id
    const timestamp = (bal?.dat as any)?.timestamp_ms ?? 0

    if (!detailId || !cpy.details[detailId]) {
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'ratify-detail-actor-error',
                    src: 'Detail not found',
                    val: -1,
                },
            })
        }
        return cpy
    }

    const detail = cpy.details[detailId]
    detail.status = 'RATIFIED'
    detail.reviewed_at_ms = timestamp

    if (ste?.hunt) {
        await ste
            .hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: `>> [DETAIL:RATIFY] ${detailId} promoted to RATIFIED canon staging queue.`,
            })
            .catch(() => {})
    }

    if (bal?.slv) {
        bal.slv({
            actBit: { idx: 'ratify-detail-actor', dat: detail as any, val: 0 },
        })
    }
    return cpy
}

export const discardDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    const detailId = bal?.src || (bal?.dat as any)?.detail_id
    const timestamp = (bal?.dat as any)?.timestamp_ms ?? 0

    if (!detailId || !cpy.details[detailId]) {
        if (bal?.slv) {
            bal.slv({
                actBit: {
                    idx: 'discard-detail-actor-error',
                    src: 'Detail not found',
                    val: -1,
                },
            })
        }
        return cpy
    }

    const detail = cpy.details[detailId]
    detail.status = 'DISCARDED'
    detail.reviewed_at_ms = timestamp

    if (ste?.hunt) {
        await ste
            .hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: `>> [DETAIL:DISCARD] ${detailId} discarded from harvest queue.`,
            })
            .catch(() => {})
    }

    if (bal?.slv) {
        bal.slv({
            actBit: { idx: 'discard-detail-actor', dat: detail as any, val: 0 },
        })
    }
    return cpy
}

export const listUnratifiedDetailsActor = (
    cpy: ActorModel,
    bal: ActorBit,
    ste: State,
) => {
    const filterStatus = (bal?.dat as any)?.status as string | undefined
    const list = Object.values(cpy.details).filter((d) => {
        if (filterStatus) return d.status === filterStatus
        return true
    })

    if (bal?.slv) {
        bal.slv({
            actBit: {
                idx: 'list-unratified-details-actor',
                lst: list as any,
                val: list.length,
            },
        })
    }
    return cpy
}

/**
 * 05.event.unit - Event Interface Contracts
 * Discriminated union event schemas, version maps, and pure read-time upcasters.
 */
import type { EventEnvelope } from '../../04.envelope.unit/fce/envelope.interface.js'

export type EventDomain =
    | 'SOMATIC'
    | 'LOGISTICAL'
    | 'RELATIONAL'
    | 'EPISTEMIC'
    | 'TEMPORAL'
    | 'GENESIS'

export type CanonicalSimulationEventType =
    | 'SOMATIC_TRAUMA_APPLIED'
    | 'INVENTORY_TRANSFERRED'
    | 'LEVERAGE_STRING_MUTATED'
    | 'GRIEVANCE_ESCALATED'
    | 'PARANOIA_CLOCK_TICKED'
    | 'BELIEF_RECORDED'
    | 'UNRATIFIED_DETAIL_STAGED'
    | 'SIMULATION_TICK_COMMITTED'

export interface SomaticTraumaPayloadV1 {
    readonly damageTier: 'MINOR' | 'MODERATE' | 'SEVERE'
}

export interface SomaticTraumaPayloadV2 {
    readonly painBps: number
    readonly fatigueBps?: number
}

export interface SomaticTraumaPayloadV3 {
    readonly painBps: number
    readonly fatigueBps: number
    readonly bannedKineticVerbs: readonly string[]
    readonly armsAvailable: number
    readonly legsAvailable: number
}

export interface InventoryTransferredPayload {
    readonly actorId: string
    readonly itemId: string
    readonly fromSlot: 'HELD' | 'WORN' | 'SLUNG' | 'CACHED' | 'FLOOR'
    readonly toSlot: 'HELD' | 'WORN' | 'SLUNG' | 'CACHED' | 'FLOOR'
    readonly targetActorId?: string
}

export interface LeverageStringMutatedPayload {
    readonly holderId: string
    readonly debtorId: string
    readonly weightBps: number
    readonly deltaStrings: number
}

export interface GrievanceEscalatedPayload {
    readonly grievanceId: string
    readonly instigatorId: string
    readonly victimId: string
    readonly intensityBps: number
    readonly escalationDepth: number
    readonly previousStatus: string
    readonly nextStatus: string
}

export interface ParanoiaClockTickedPayload {
    readonly clockId: string
    readonly entityId: string
    readonly clockName: string
    readonly deltaBps: number
    readonly valueBps: number
    readonly thresholdBps: number
    readonly isTriggered: boolean
}

export interface BeliefRecordedPayload {
    readonly beliefId: string
    readonly observerId: string
    readonly factId: string
    readonly subjectiveProbabilityBps: number
    readonly sourceType: 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'
    readonly isFalseBelief: boolean
}

export interface UnratifiedDetailStagedPayload {
    readonly detailId: string
    readonly sceneId: string
    readonly entityId?: string
    readonly salienceBps: number
    readonly claimProposal: string
    readonly status: 'STAGED' | 'DISCARDED' | 'RATIFIED'
}

export interface SimulationTickCommittedPayload {
    readonly tick: number
    readonly masterSeed: string
    readonly actorsUpdatedCount: number
}

export type DomainEventPayloadMap = {
    SOMATIC_TRAUMA_APPLIED: SomaticTraumaPayloadV3
    INVENTORY_TRANSFERRED: InventoryTransferredPayload
    LEVERAGE_STRING_MUTATED: LeverageStringMutatedPayload
    GRIEVANCE_ESCALATED: GrievanceEscalatedPayload
    PARANOIA_CLOCK_TICKED: ParanoiaClockTickedPayload
    BELIEF_RECORDED: BeliefRecordedPayload
    UNRATIFIED_DETAIL_STAGED: UnratifiedDetailStagedPayload
    SIMULATION_TICK_COMMITTED: SimulationTickCommittedPayload
}

export const CURRENT_EVENT_VERSIONS: Record<CanonicalSimulationEventType, number> = {
    SOMATIC_TRAUMA_APPLIED: 3,
    INVENTORY_TRANSFERRED: 1,
    LEVERAGE_STRING_MUTATED: 1,
    GRIEVANCE_ESCALATED: 1,
    PARANOIA_CLOCK_TICKED: 1,
    BELIEF_RECORDED: 1,
    UNRATIFIED_DETAIL_STAGED: 1,
    SIMULATION_TICK_COMMITTED: 1,
}

export type UpcasterFn<TOld = any, TNew = any> = (oldPayload: TOld) => TNew

export class EventUpcasterRegistry {
    private readonly upcasters = new Map<string, UpcasterFn>()

    register<TOld = any, TNew = any>(
        type: CanonicalSimulationEventType | string,
        fromVersion: number,
        fn: UpcasterFn<TOld, TNew>,
    ): void {
        this.upcasters.set(`${type}:v${fromVersion}->v${fromVersion + 1}`, fn)
    }

    has(type: string, fromVersion: number): boolean {
        return this.upcasters.has(`${type}:v${fromVersion}->v${fromVersion + 1}`)
    }

    upcast<T = unknown>(envelope: EventEnvelope<any>): EventEnvelope<T> {
        let currentVersion = envelope.schemaVersion
        let currentPayload = envelope.payload
        const targetVersion =
            CURRENT_EVENT_VERSIONS[envelope.eventType as CanonicalSimulationEventType] ||
            envelope.schemaVersion

        while (currentVersion < targetVersion) {
            const key = `${envelope.eventType}:v${currentVersion}->v${currentVersion + 1}`
            const upcaster = this.upcasters.get(key)
            if (!upcaster) {
                throw new Error(
                    `[MISSING_UPCASTER] Cannot migrate event '${envelope.eventType}' from v${currentVersion} to v${targetVersion}`,
                )
            }
            currentPayload = upcaster(currentPayload)
            currentVersion++
        }

        return {
            ...envelope,
            schemaVersion: currentVersion,
            payload: currentPayload,
        }
    }
}

export default interface Event {
    idx: string
    totalAppended: number
    lastSequenceId: number
    lastEventHash: string
    registry: EventUpcasterRegistry
}

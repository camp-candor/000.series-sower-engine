// Phase 4: Event models & envelopes for the pure event-sourced ledger.
// All payloads are plain JSON-serializable data. Timestamps and seeds are
// carried inside the envelope so reducers never read a wall clock.

export const CURRENT_EVENT_SCHEMA_VERSION = 1

export type LedgerEventType =
    | 'SOMATIC_TRAUMA_APPLIED'
    | 'INVENTORY_TRANSFERRED'
    | 'LEVERAGE_STRING_MUTATED'
    | 'GRIEVANCE_ESCALATED'
    | 'PARANOIA_CLOCK_TICKED'

export interface SomaticTraumaPayload {
    entityId: string
    woundId?: string
    armsLost?: number
    concussionDelta?: number
    locomotionTier?: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
}

export interface InventoryTransferredPayload {
    itemId: string
    toEntityId: string
    fromEntityId?: string
}

export interface LeverageStringMutatedPayload {
    stringId: string
    holderId: string
    debtorId: string
    weightBps?: number
    deltaBps?: number
    remove?: boolean
}

export interface GrievanceEscalatedPayload {
    grievanceId: string
    escalationDelta?: number
    intensityDeltaBps?: number
    cooldownCycles?: number
}

export interface ParanoiaClockTickedPayload {
    clockId: string
    clockName?: string
    tickDeltaBps?: number
    thresholdBps?: number
    decayRateBps?: number
}

export type LedgerEventPayload =
    | SomaticTraumaPayload
    | InventoryTransferredPayload
    | LeverageStringMutatedPayload
    | GrievanceEscalatedPayload
    | ParanoiaClockTickedPayload

export interface EventEnvelope {
    eventId: string
    sequenceNumber: number
    eventType: LedgerEventType
    schemaVersion: number
    payload: LedgerEventPayload
    seed: string
    timestampMs: number
    actorId?: string
}

export type EventUpcaster = (envelope: EventEnvelope) => EventEnvelope

// Chains registered upcasters until the envelope reaches
// CURRENT_EVENT_SCHEMA_VERSION. Deterministic and side-effect free:
// the input envelope is never mutated.
export class EventUpcasterRegistry {
    private readonly upcasters = new Map<number, EventUpcaster>()

    registerUpcaster(fromVersion: number, upcaster: EventUpcaster): this {
        this.upcasters.set(fromVersion, upcaster)
        return this
    }

    hasUpcaster(fromVersion: number): boolean {
        return this.upcasters.has(fromVersion)
    }

    upcast(envelope: EventEnvelope): EventEnvelope {
        let current: EventEnvelope = {
            ...envelope,
            payload: { ...envelope.payload },
        }
        let guard = 0
        while (current.schemaVersion < CURRENT_EVENT_SCHEMA_VERSION) {
            const step = this.upcasters.get(current.schemaVersion)
            if (!step) {
                throw new Error(
                    `[EVENT_UPCAST_ERROR] No upcaster registered from schema version ${current.schemaVersion}`,
                )
            }
            current = step(current)
            guard += 1
            if (guard > 100) {
                throw new Error(
                    '[EVENT_UPCAST_ERROR] Upcaster chain exceeded 100 steps',
                )
            }
        }
        return current
    }
}

export function createEventEnvelope(
    input: Omit<EventEnvelope, 'schemaVersion'> & { schemaVersion?: number },
): EventEnvelope {
    return {
        ...input,
        payload: { ...input.payload },
        schemaVersion: input.schemaVersion ?? CURRENT_EVENT_SCHEMA_VERSION,
    }
}

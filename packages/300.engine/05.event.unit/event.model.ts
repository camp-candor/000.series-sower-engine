import type Event from './fce/event.interface'
import type { UpcasterFunction } from './fce/event.interface'

export const DEFAULT_TARGET_SCHEMA_VERSIONS: Record<string, number> = {
    SOMATIC_TRAUMA_APPLIED: 3,
    INVENTORY_TRANSFERRED: 1,
    LEVERAGE_STRING_MUTATED: 1,
    GRIEVANCE_ESCALATED: 1,
    PARANOIA_CLOCK_TICKED: 1,
    BELIEF_RECORDED: 1,
    UNRATIFIED_DETAIL_STAGED: 1,
    SIMULATION_TICK_COMMITTED: 1,
}

export class EventUpcasterRegistry {
    private upcasters = new Map<string, UpcasterFunction>()

    public register(
        type: string,
        fromVersion: number,
        upcaster: UpcasterFunction,
    ): void {
        const key = `${type}:v${fromVersion}->v${fromVersion + 1}`
        this.upcasters.set(key, upcaster)
    }

    public upcast<T = unknown>(envelope: any, targetVersion: number): any {
        let currentVersion = envelope.schemaVersion || envelope.version || 1
        let currentPayload = envelope.payload

        while (currentVersion < targetVersion) {
            const key = `${envelope.eventType || envelope.type}:v${currentVersion}->v${currentVersion + 1}`
            const fn = this.upcasters.get(key)

            if (!fn) {
                throw new Error(
                    `[MISSING_UPCASTER] Cannot migrate ${envelope.eventType || envelope.type} from v${currentVersion} to v${targetVersion}`,
                )
            }

            currentPayload = fn(currentPayload)
            currentVersion += 1
        }

        return {
            ...envelope,
            schemaVersion: currentVersion,
            version: currentVersion,
            payload: currentPayload as T,
        }
    }

    public hasUpcaster(type: string, fromVersion: number): boolean {
        return this.upcasters.has(
            `${type}:v${fromVersion}->v${fromVersion + 1}`,
        )
    }
}

export class EventModel implements Event {
    idx = '05.event'
    targetSchemaVersions = { ...DEFAULT_TARGET_SCHEMA_VERSIONS }
    registry = new EventUpcasterRegistry()
    totalAppended = 0
}

export default EventModel

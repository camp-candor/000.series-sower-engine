/**
 * 05.event.unit - Event State Model Container
 */
import type Event from './fce/event.interface.js'
import {
    EventUpcasterRegistry,
    type SomaticTraumaPayloadV1,
    type SomaticTraumaPayloadV2,
    type SomaticTraumaPayloadV3,
} from './fce/event.interface.js'

export function createDefaultUpcasterRegistry(): EventUpcasterRegistry {
    const registry = new EventUpcasterRegistry()

    // Step 1: Somatic trauma v1 -> v2 (damage tier -> basis-point mapping)
    registry.register<SomaticTraumaPayloadV1, SomaticTraumaPayloadV2>(
        'SOMATIC_TRAUMA_APPLIED',
        1,
        (oldPayload) => {
            let painBps = 1000
            if (oldPayload.damageTier === 'MODERATE') painBps = 4000
            if (oldPayload.damageTier === 'SEVERE') painBps = 8000
            return {
                painBps,
                fatigueBps: 2000,
            }
        },
    )

    // Step 2: Somatic trauma v2 -> v3 (basis-point math -> kinetic verb mask)
    registry.register<SomaticTraumaPayloadV2, SomaticTraumaPayloadV3>(
        'SOMATIC_TRAUMA_APPLIED',
        2,
        (oldPayload) => {
            const banned: string[] = []
            let armsAvailable = 2
            let legsAvailable = 2

            if (oldPayload.painBps >= 7000) {
                banned.push('BIMANUAL_LIFT', 'SPRINT', 'CLIMB')
                armsAvailable = 1
                legsAvailable = 1
            } else if (oldPayload.painBps >= 3000) {
                banned.push('SPRINT')
                legsAvailable = 1
            }

            return {
                painBps: oldPayload.painBps,
                fatigueBps: oldPayload.fatigueBps ?? 1000,
                bannedKineticVerbs: Object.freeze(banned.sort()),
                armsAvailable,
                legsAvailable,
            }
        },
    )

    return registry
}

export class EventModel implements Event {
    idx: string = '05.event'
    totalAppended: number = 0
    lastSequenceId: number = 0
    lastEventHash: string =
        '0000000000000000000000000000000000000000000000000000000000000000'
    registry: EventUpcasterRegistry = createDefaultUpcasterRegistry()
}

export default EventModel

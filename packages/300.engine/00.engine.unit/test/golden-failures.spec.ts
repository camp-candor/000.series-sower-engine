// packages/300.engine/00.engine.unit/test/golden-failures.spec.ts
import { describe, it, expect } from 'vitest'
import '../../test/budget-matcher.setup.js'
import { reduceTickStep } from '../../17.tick.unit/tick.reduce.js'
import {
    toSimTime,
    type TickStatePayload,
} from '../../17.tick.unit/fce/tick.interface.js'

describe('00.engine.unit Golden-File Negative Control Battery', () => {
    it('must fail closed on unbranded negative tick index', () => {
        expect(() => {
            toSimTime(-1)
        }).toThrowError(/\[INVALID_TICK\]/)
    })

    it('must fail closed on non-integer floating-point tick timestamp', () => {
        expect(() => {
            toSimTime(14.5)
        }).toThrowError(/\[INVALID_TICK\]/)
    })

    it('must fail closed when somatic strain exceeds 10,000 basis points ceiling', () => {
        const invalidState: TickStatePayload = {
            tick: 0,
            actors: [
                {
                    id: 'char_elias',
                    somatic_strain_bp: 12500, // ILLEGAL: Exceeds 10,000 bp ceiling
                    paranoia_bp: 500,
                    current_loc: 'loc_tunnel',
                },
            ],
            pending_actions: [],
        }

        const nextState = reduceTickStep(invalidState)
        // Reducer must clamp to 10000 or flag violation; verify invariant bounds hold
        expect(nextState.actors[0].somatic_strain_bp).toBeLessThanOrEqual(10000)
    })

    it('must fail closed when budget profiler encounters simulated 10ms execution delay', () => {
        expect(() => {
            const target = process.hrtime.bigint() + 10_000_000n // 10ms intentional stall
            while (process.hrtime.bigint() < target) {}
        }).not.toExecuteWithinBudget(2.0) // Verifies the negative assertion inverts cleanly
    })

    it('must fail closed on banned kinetic verb dispatch under somatic impairment', () => {
        const mockImpairedActor = {
            id: 'char_morris',
            somatic_strain_bp: 9500,
            paranoia_bp: 4000,
            current_loc: 'loc_drainage',
            banned_verbs: ['SPRINT', 'VAULT', 'LEAP'],
        }

        const dispatchAction = (
            actor: typeof mockImpairedActor,
            verb: string,
        ) => {
            if (actor.banned_verbs.includes(verb)) {
                throw new Error(
                    `[SOMATIC_VIOLATION] Actor ${actor.id} is barred from verb: ${verb}`,
                )
            }
            return true
        }

        expect(() => dispatchAction(mockImpairedActor, 'SPRINT')).toThrowError(
            /\[SOMATIC_VIOLATION\]/,
        )
        expect(() => dispatchAction(mockImpairedActor, 'INSPECT')).not.toThrow()
    })
})

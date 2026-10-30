import '../test/budget-matcher.setup.js'
import { describe, it, expect } from 'vitest'
import { reducer, reduceTickStep } from './tick.reduce.js'
import { TickModel } from './tick.model.js'
import { INIT_TICK, UPDATE_TICK } from './tick.action.js'
import { toSimTime, type TickStatePayload } from './fce/tick.interface.js'

describe('tick execution budget', () => {
    it('reduces an UPDATE_TICK state transition within 2.0ms', () => {
        expect(() => {
            reducer(
                new TickModel(),
                {
                    type: UPDATE_TICK,
                    bale: { idx: 'budget-probe' },
                } as any,
                {} as any,
            )
        }).toExecuteWithinBudget(2.0)
    })

    it('reduces an INIT_TICK state transition within 2.0ms', () => {
        expect(() => {
            reducer(
                new TickModel(),
                {
                    type: INIT_TICK,
                    bale: { idx: 'budget-probe' },
                } as any,
                {} as any,
            )
        }).toExecuteWithinBudget(2.0)
    })
})

describe('17.tick.unit Performance & Determinism Gauntlet', () => {
    it('must reduce discrete somatic and spatial tick within 2ms budget', () => {
        const initialState: TickStatePayload = {
            tick: toSimTime(42),
            actors: [
                {
                    id: 'char_elias',
                    somatic_strain_bp: 4500,
                    paranoia_bp: 1200,
                    current_loc: 'loc_culvert',
                    busyUntil: toSimTime(42),
                },
                {
                    id: 'char_vance',
                    somatic_strain_bp: 1200,
                    paranoia_bp: 3400,
                    current_loc: 'loc_warm_pipe',
                    busyUntil: toSimTime(45),
                },
            ],
            pending_actions: [
                {
                    actor_id: 'char_elias',
                    verb: 'INSPECT',
                    target: 'item_lantern',
                },
            ],
        }

        expect(() => {
            reduceTickStep(initialState)
        }).toExecuteWithinBudget(2.0)
    })

    it('must sustain batch throughput exceeding 50,000 ticks/sec in memory', () => {
        let currentState: TickStatePayload = {
            tick: toSimTime(0),
            actors: [
                {
                    id: 'char_bog',
                    somatic_strain_bp: 0,
                    paranoia_bp: 2400,
                    current_loc: 'loc_warm_pipe',
                    busyUntil: toSimTime(0),
                },
            ],
            pending_actions: [],
        }

        const totalBatchTicks = 10000
        const start = process.hrtime.bigint()

        for (let i = 0; i < totalBatchTicks; i++) {
            currentState = reduceTickStep(currentState)
        }

        const elapsedNs = process.hrtime.bigint() - start
        const elapsedSeconds = Number(elapsedNs) / 1_000_000_000
        const throughput = totalBatchTicks / elapsedSeconds

        expect(currentState.tick).toBe(toSimTime(10000))
        expect(throughput).toBeGreaterThan(50000)
    })
})

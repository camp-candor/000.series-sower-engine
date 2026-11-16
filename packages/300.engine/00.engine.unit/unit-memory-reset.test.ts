import { describe, it, expect, vi } from 'vitest'
import { reducer as tickReducer } from '../17.tick.unit/tick.reduce.js'
import { RESET_TICK } from '../17.tick.unit/tick.action.js'
import { TickModel } from '../17.tick.unit/tick.model.js'
import { reducer as actorReducer } from '../01.actor.unit/actor.reduce.js'
import { RESET_ACTOR } from '../01.actor.unit/actor.action.js'
import { ActorModel } from '../01.actor.unit/actor.model.js'
import { reducer as entityReducer } from '../03.entity.unit/entity.reduce.js'
import { RESET_ENTITY } from '../03.entity.unit/entity.action.js'
import { EntityModel } from '../03.entity.unit/entity.model.js'
import { reducer as grievanceReducer } from '../06.grievance.unit/grievance.reduce.js'
import { RESET_GRIEVANCE } from '../06.grievance.unit/grievance.action.js'
import { GrievanceModel } from '../06.grievance.unit/grievance.model.js'
import { reducer as envelopeReducer } from '../04.envelope.unit/envelope.reduce.js'
import { RESET_ENVELOPE } from '../04.envelope.unit/envelope.action.js'
import { EnvelopeModel } from '../04.envelope.unit/envelope.model.js'
import { reducer as eventReducer } from '../05.event.unit/event.reduce.js'
import { RESET_EVENT } from '../05.event.unit/event.action.js'
import { EventModel } from '../05.event.unit/event.model.js'
import { reducer as inventoryReducer } from '../07.inventory.unit/inventory.reduce.js'
import { RESET_INVENTORY } from '../07.inventory.unit/inventory.action.js'
import { InventoryModel } from '../07.inventory.unit/inventory.model.js'
import { reducer as leverageReducer } from '../09.leverage.unit/leverage.reduce.js'
import { RESET_LEVERAGE } from '../09.leverage.unit/leverage.action.js'
import { LeverageModel } from '../09.leverage.unit/leverage.model.js'
import { reducer as paranoiaReducer } from '../12.paranoia.unit/paranoia.reduce.js'
import { RESET_PARANOIA } from '../12.paranoia.unit/paranoia.action.js'
import { ParanoiaModel } from '../12.paranoia.unit/paranoia.model.js'
import { reducer as locationReducer } from '../10.location.unit/location.reduce.js'
import { RESET_LOCATION } from '../10.location.unit/location.action.js'
import { LocationModel } from '../10.location.unit/location.model.js'
import { reducer as beliefReducer } from '../11.belief.unit/belief.reduce.js'
import { RESET_BELIEF } from '../11.belief.unit/belief.action.js'
import { BeliefModel } from '../11.belief.unit/belief.model.js'
import { reducer as movementReducer } from '../11.movement.unit/movement.reduce.js'
import { RESET_MOVEMENT } from '../11.movement.unit/movement.action.js'
import { MovementModel } from '../11.movement.unit/movement.model.js'
import { reducer as traumaReducer } from '../18.trauma.unit/trauma.reduce.js'
import { RESET_TRAUMA } from '../18.trauma.unit/trauma.action.js'
import { TraumaModel } from '../18.trauma.unit/trauma.model.js'
import { reducer as woundsReducer } from '../19.wounds.unit/wounds.reduce.js'
import { RESET_WOUNDS } from '../19.wounds.unit/wounds.action.js'
import { WoundsModel } from '../19.wounds.unit/wounds.model.js'
import { reducer as arithmeticReducer } from '../20.arithmetic.unit/arithmetic.reduce.js'
import { RESET_ARITHMETIC } from '../20.arithmetic.unit/arithmetic.action.js'
import { ArithmeticModel } from '../20.arithmetic.unit/arithmetic.model.js'
import { reducer as compileReducer } from '../21.compile.unit/compile.reduce.js'
import { RESET_COMPILE } from '../21.compile.unit/compile.action.js'
import { CompileModel } from '../21.compile.unit/compile.model.js'
import { reducer as collectReducer } from '../97.collect.unit/collect.reduce.js'
import { RESET_COLLECT } from '../97.collect.unit/collect.action.js'
import { CollectModel } from '../97.collect.unit/collect.model.js'

describe('Tasks 3.5-3.11: Pure Simulation Unit Memory Re-Initialization', () => {
    const mockState = { hunt: vi.fn(async () => ({})) } as any

    it('resets 17.tick, 01.actor, 03.entity, and 06.grievance to primordial defaults', async () => {
        const tickModel = new TickModel()
        tickModel.tickCount = 99
        tickModel.simTime = 99
        ;(tickModel as any).currentTick = 99
        const resetTick = await tickReducer(
            tickModel,
            { type: RESET_TICK, bale: { idx: 'reset-tick' } } as any,
            mockState,
        )
        expect((resetTick as any).tickCount).toBe(0)
        expect((resetTick as any).simTime).toBe(0)
        expect((resetTick as any).currentTick ?? 0).toBe(0)

        const actorModel = new ActorModel()
        actorModel.beliefs.set('fact_01', {} as any)
        actorModel.details.set('detail_01', {} as any)
        const resetActor = await actorReducer(
            actorModel,
            { type: RESET_ACTOR, bale: { idx: 'reset-actor' } } as any,
            mockState,
        )
        expect(resetActor).toBeDefined()
        expect((resetActor as ActorModel).beliefs.size).toBe(0)
        expect((resetActor as ActorModel).details.size).toBe(0)
        expect((resetActor as ActorModel).compiledBeats.size).toBe(0)

        const entityModel = new EntityModel()
        entityModel.entities.set('char_wonder_woman', {} as any)
        const resetEntity = await entityReducer(
            entityModel,
            { type: RESET_ENTITY, bale: { idx: 'reset-entity' } } as any,
            mockState,
        )
        expect(resetEntity.entities.size).toBe(0)

        const grievanceModel = new GrievanceModel()
        grievanceModel.records.set('grv_01', {} as any)
        grievanceModel.recentEncounterHistory.push('enc_01')
        const resetGrievance = await grievanceReducer(
            grievanceModel,
            { type: RESET_GRIEVANCE, bale: { idx: 'reset-grievance' } } as any,
            mockState,
        )
        expect(resetGrievance).toBeDefined()
        expect(resetGrievance.records.size).toBe(0)
        expect(resetGrievance.recentEncounterHistory).toEqual([])
    })

    it('resets 04.envelope, 05.event, 07.inventory, 09.leverage, and 12.paranoia trackers', async () => {
        const envModel = new EnvelopeModel()
        envModel.totalSealedCount = 5
        envModel.lastSealedHash = 'f'.repeat(64)
        const envReset = await envelopeReducer(
            envModel,
            { type: RESET_ENVELOPE, bale: { idx: 'reset-env' } } as any,
            mockState,
        )
        expect(envReset).toBeDefined()
        expect(envReset.totalSealedCount).toBe(0)
        expect(envReset.lastSealedHash).toBe('0'.repeat(64))
        expect(envReset.lastValidationReport).toBeNull()

        const evtModel = new EventModel()
        evtModel.totalAppended = 15
        evtModel.lastSequenceId = 15
        const evtReset = await eventReducer(
            evtModel,
            { type: RESET_EVENT, bale: { idx: 'reset-evt' } } as any,
            mockState,
        )
        expect(evtReset.totalAppended).toBe(0)
        expect(evtReset.lastSequenceId).toBe(0)
        expect(evtReset.lastEventHash).toBe('0'.repeat(64))

        const invModel = new InventoryModel()
        ;(invModel.inventories as any)['char_batman'] = {
            entityId: 'char_batman',
        }
        const invReset = await inventoryReducer(
            invModel,
            { type: RESET_INVENTORY, bale: { idx: 'reset-inv' } } as any,
            mockState,
        )
        expect(invReset).toBeDefined()
        expect(invReset.inventories).toEqual({})

        const levModel = new LeverageModel()
        levModel.records.set('str_01', {
            stringId: 'str_01',
            holderId: 'char_batman',
            debtorId: 'char_joker',
            weightBps: 5000,
            stringsCount: 1,
        } as any)
        const levReset = await leverageReducer(
            levModel,
            { type: RESET_LEVERAGE, bale: { idx: 'reset-lev' } } as any,
            mockState,
        )
        expect(levReset.records.size).toBe(0)

        const parModel = new ParanoiaModel()
        parModel.clocks.set('clock_01', {} as any)
        parModel.activeDispatchCount = 2
        const parReset = await paranoiaReducer(
            parModel,
            { type: RESET_PARANOIA, bale: { idx: 'reset-par' } } as any,
            mockState,
        )
        expect(parReset).toBeDefined()
        expect(parReset.clocks.size).toBe(0)
        expect(parReset.activeDispatchCount).toBe(0)
    })

    it('resets 10.location, 11.belief, 11.movement, 18.trauma, 19.wounds, 20.arithmetic, 21.compile, and 97.collect', async () => {
        const locModel = new LocationModel()
        locModel.locations.set('loc_x', {} as any)
        locModel.portals.set('p_x', {} as any)
        const locReset = await locationReducer(
            locModel,
            { type: RESET_LOCATION, bale: { idx: 'reset-loc' } } as any,
            mockState,
        )
        expect(locReset).toBeDefined()
        expect(locReset.locations.size).toBe(0)
        expect(locReset.portals.size).toBe(0)

        const blfModel = new BeliefModel()
        blfModel.beliefsByHolder.set(
            'char_01',
            new Map([['fact_x', {} as any]]),
        )
        blfModel.totalBeliefsRecorded = 3
        const blfReset = await beliefReducer(
            blfModel,
            { type: RESET_BELIEF, bale: { idx: 'reset-blf' } } as any,
            mockState,
        )
        expect(blfReset).toBeDefined()
        expect(blfReset.beliefsByHolder.size).toBe(0)
        expect(blfReset.totalBeliefsRecorded).toBe(0)

        const movModel = new MovementModel()
        movModel.actorPositions.set('char_01', {} as any)
        movModel.occupiedCells.set('cell_01', 'char_01')
        const movReset = await movementReducer(
            movModel,
            { type: RESET_MOVEMENT, bale: { idx: 'reset-mov' } } as any,
            mockState,
        )
        expect(movReset).toBeDefined()
        expect(movReset.actorPositions.size).toBe(0)
        expect(movReset.occupiedCells.size).toBe(0)

        const trmModel = new TraumaModel()
        trmModel.entities['char_01'] = {} as any
        const trmReset = await traumaReducer(
            trmModel,
            { type: RESET_TRAUMA, bale: { idx: 'reset-trm' } } as any,
            mockState,
        )
        expect(trmReset).toBeDefined()
        expect(trmReset.entities).toEqual({})

        const wndModel = new WoundsModel()
        wndModel.woundsByEntity['char_01'] = [{} as any]
        wndModel.masksByEntity['char_01'] = {} as any
        const wndReset = await woundsReducer(
            wndModel,
            { type: RESET_WOUNDS, bale: { idx: 'reset-wnd' } } as any,
            mockState,
        )
        expect(wndReset).toBeDefined()
        expect(wndReset.woundsByEntity).toEqual({})
        expect(wndReset.masksByEntity).toEqual({})

        const arithSeeded = new ArithmeticModel().copyWith({
            totalCalculations: 7,
        })
        const arithReset = await arithmeticReducer(
            arithSeeded,
            { type: RESET_ARITHMETIC, bale: { idx: 'reset-arth' } } as any,
            mockState,
        )
        expect(arithReset).toBeDefined()
        expect(arithReset.totalCalculations).toBe(0)

        const cmpModel = new CompileModel()
        ;(cmpModel as any).validationReport = { valid: false }
        ;(cmpModel as any).lastError = 'boom'
        const cmpReset = await compileReducer(
            cmpModel,
            { type: RESET_COMPILE, bale: { idx: 'reset-cmp' } } as any,
            mockState,
        )
        expect(cmpReset).toBeDefined()
        expect(cmpReset.status).toBe('IDLE')
        expect(cmpReset.validationReport).toBeUndefined()
        expect(cmpReset.lastError).toBeUndefined()

        const collectModel = new CollectModel()
        collectModel.caboodleBitList.push({
            idx: 'test',
            dex: 0,
            bitList: [],
            bits: {},
        })
        collectModel.caboodleBits['test'] = {
            idx: 'test',
            dex: 0,
            bitList: [],
            bits: {},
        }
        const collectReset = await collectReducer(
            collectModel,
            { type: RESET_COLLECT, bale: { idx: 'reset-clc' } } as any,
            mockState,
        )
        expect(collectReset.caboodleBitList).toEqual([])
        expect(collectReset.caboodleBits).toEqual({})
    })
})

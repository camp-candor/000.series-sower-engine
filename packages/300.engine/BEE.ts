import Model from './99.core/interface/model.interface.js'

import EngineUnit from './00.engine.unit/engine.unit.js'
import ActorUnit from './01.actor.unit/actor.unit.js'
import DatabaseUnit from './02.database.unit/database.unit.js'
import EntityUnit from './03.entity.unit/entity.unit.js'
import EnvelopeUnit from './04.envelope.unit/envelope.unit.js'
import EventUnit from './05.event.unit/event.unit.js'
import GrievanceUnit from './06.grievance.unit/grievance.unit.js'
import InventoryUnit from './07.inventory.unit/inventory.unit.js'
import LedgerUnit from './08.ledger.unit/ledger.unit.js'
import LeverageUnit from './09.leverage.unit/leverage.unit.js'
import LocationUnit from './10.location.unit/location.unit.js'
import MovementUnit from './11.movement.unit/movement.unit.js'
import ParanoiaUnit from './12.paranoia.unit/paranoia.unit.js'
import PrimordialUnit from './13.primordial.unit/primordial.unit.js'
import SequenceUnit from './14.sequence.unit/sequence.unit.js'
import SeriesUnit from './15.series.unit/series.unit.js'
import StateUnit from './16.state.unit/state.unit.js'
import TickUnit from './17.tick.unit/tick.unit.js'
import TraumaUnit from './18.trauma.unit/trauma.unit.js'
import WoundsUnit from './19.wounds.unit/wounds.unit.js'
import CollectUnit from './97.collect.unit/collect.unit.js'
import MenuUnit from './98.menu.unit/menu.unit.js'
import BusUnit from './99.bus.unit/bus.unit.js'

import Engine from './00.engine.unit/fce/engine.interface.js'
import { EngineModel } from './00.engine.unit/engine.model.js'
import Actor from './01.actor.unit/fce/actor.interface.js'
import { ActorModel } from './01.actor.unit/actor.model.js'
import Database from './02.database.unit/fce/database.interface.js'
import { DatabaseModel } from './02.database.unit/database.model.js'
import Entity from './03.entity.unit/fce/entity.interface.js'
import { EntityModel } from './03.entity.unit/entity.model.js'
import Envelope from './04.envelope.unit/fce/envelope.interface.js'
import { EnvelopeModel } from './04.envelope.unit/envelope.model.js'
import Event from './05.event.unit/fce/event.interface.js'
import { EventModel } from './05.event.unit/event.model.js'
import Grievance from './06.grievance.unit/fce/grievance.interface.js'
import { GrievanceModel } from './06.grievance.unit/grievance.model.js'
import Inventory from './07.inventory.unit/fce/inventory.interface.js'
import { InventoryModel } from './07.inventory.unit/inventory.model.js'
import Ledger from './08.ledger.unit/fce/ledger.interface.js'
import { LedgerModel } from './08.ledger.unit/ledger.model.js'
import Leverage from './09.leverage.unit/fce/leverage.interface.js'
import { LeverageModel } from './09.leverage.unit/leverage.model.js'
import Location from './10.location.unit/fce/location.interface.js'
import { LocationModel } from './10.location.unit/location.model.js'
import Movement from './11.movement.unit/fce/movement.interface.js'
import { MovementModel } from './11.movement.unit/movement.model.js'
import Paranoia from './12.paranoia.unit/fce/paranoia.interface.js'
import { ParanoiaModel } from './12.paranoia.unit/paranoia.model.js'
import Primordial from './13.primordial.unit/fce/primordial.interface.js'
import { PrimordialModel } from './13.primordial.unit/primordial.model.js'
import Sequence from './14.sequence.unit/fce/sequence.interface.js'
import { SequenceModel } from './14.sequence.unit/sequence.model.js'
import Series from './15.series.unit/fce/series.interface.js'
import { SeriesModel } from './15.series.unit/series.model.js'
import State from './16.state.unit/fce/state.interface.js'
import { StateModel } from './16.state.unit/state.model.js'
import Tick from './17.tick.unit/fce/tick.interface.js'
import { TickModel } from './17.tick.unit/tick.model.js'
import Trauma from './18.trauma.unit/fce/trauma.interface.js'
import { TraumaModel } from './18.trauma.unit/trauma.model.js'
import Wounds from './19.wounds.unit/fce/wounds.interface.js'
import { WoundsModel } from './19.wounds.unit/wounds.model.js'
import Collect from './97.collect.unit/fce/collect.interface.js'
import { CollectModel } from './97.collect.unit/collect.model.js'
import Menu from './98.menu.unit/fce/menu.interface.js'
import { MenuModel } from './98.menu.unit/menu.model.js'
import Bus from './99.bus.unit/fce/bus.interface.js'
import { BusModel } from './99.bus.unit/bus.model.js'

export const list: Array<any> = [
    EngineUnit,
    ActorUnit,
    DatabaseUnit,
    EntityUnit,
    EnvelopeUnit,
    EventUnit,
    GrievanceUnit,
    InventoryUnit,
    LedgerUnit,
    LeverageUnit,
    LocationUnit,
    MovementUnit,
    ParanoiaUnit,
    PrimordialUnit,
    SequenceUnit,
    SeriesUnit,
    StateUnit,
    TickUnit,
    TraumaUnit,
    WoundsUnit,
    CollectUnit,
    MenuUnit,
    BusUnit,
]

import * as reduceFromEngine from './00.engine.unit/engine.reduce.js'
import * as reduceFromActor from './01.actor.unit/actor.reduce.js'
import * as reduceFromDatabase from './02.database.unit/database.reduce.js'
import * as reduceFromEntity from './03.entity.unit/entity.reduce.js'
import * as reduceFromEnvelope from './04.envelope.unit/envelope.reduce.js'
import * as reduceFromEvent from './05.event.unit/event.reduce.js'
import * as reduceFromGrievance from './06.grievance.unit/grievance.reduce.js'
import * as reduceFromInventory from './07.inventory.unit/inventory.reduce.js'
import * as reduceFromLedger from './08.ledger.unit/ledger.reduce.js'
import * as reduceFromLeverage from './09.leverage.unit/leverage.reduce.js'
import * as reduceFromLocation from './10.location.unit/location.reduce.js'
import * as reduceFromMovement from './11.movement.unit/movement.reduce.js'
import * as reduceFromParanoia from './12.paranoia.unit/paranoia.reduce.js'
import * as reduceFromPrimordial from './13.primordial.unit/primordial.reduce.js'
import * as reduceFromSequence from './14.sequence.unit/sequence.reduce.js'
import * as reduceFromSeries from './15.series.unit/series.reduce.js'
import * as reduceFromState from './16.state.unit/state.reduce.js'
import * as reduceFromTick from './17.tick.unit/tick.reduce.js'
import * as reduceFromTrauma from './18.trauma.unit/trauma.reduce.js'
import * as reduceFromWounds from './19.wounds.unit/wounds.reduce.js'
import * as reduceFromCollect from './97.collect.unit/collect.reduce.js'
import * as reduceFromMenu from './98.menu.unit/menu.reduce.js'
import * as reduceFromBus from './99.bus.unit/bus.reduce.js'

export const reducer: any = {
    engine: reduceFromEngine.reducer,
    actor: reduceFromActor.reducer,
    database: reduceFromDatabase.reducer,
    entity: reduceFromEntity.reducer,
    envelope: reduceFromEnvelope.reducer,
    event: reduceFromEvent.reducer,
    grievance: reduceFromGrievance.reducer,
    inventory: reduceFromInventory.reducer,
    ledger: reduceFromLedger.reducer,
    leverage: reduceFromLeverage.reducer,
    location: reduceFromLocation.reducer,
    movement: reduceFromMovement.reducer,
    paranoia: reduceFromParanoia.reducer,
    primordial: reduceFromPrimordial.reducer,
    sequence: reduceFromSequence.reducer,
    series: reduceFromSeries.reducer,
    state: reduceFromState.reducer,
    tick: reduceFromTick.reducer,
    trauma: reduceFromTrauma.reducer,
    wounds: reduceFromWounds.reducer,
    collect: reduceFromCollect.reducer,
    menu: reduceFromMenu.reducer,
    bus: reduceFromBus.reducer,
}

export default class UnitData implements Model {
    engine: Engine = new EngineModel()
    actor: Actor = new ActorModel()
    database: Database = new DatabaseModel()
    entity: Entity = new EntityModel()
    envelope: Envelope = new EnvelopeModel()
    event: Event = new EventModel()
    grievance: Grievance = new GrievanceModel()
    inventory: Inventory = new InventoryModel()
    ledger: Ledger = new LedgerModel()
    leverage: Leverage = new LeverageModel()
    location: Location = new LocationModel()
    movement: Movement = new MovementModel()
    paranoia: Paranoia = new ParanoiaModel()
    primordial: Primordial = new PrimordialModel()
    sequence: Sequence = new SequenceModel()
    series: Series = new SeriesModel()
    state: State = new StateModel()
    tick: Tick = new TickModel()
    trauma: Trauma = new TraumaModel()
    wounds: Wounds = new WoundsModel()
    collect: Collect = new CollectModel()
    menu: Menu = new MenuModel()
    bus: Bus = new BusModel()
}

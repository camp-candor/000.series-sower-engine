import type Model from './99.core/interface/model.interface'

// 1. Units
import EngineUnit from './00.engine.unit/engine.unit'
import ActorUnit from './01.actor.unit/actor.unit'
import DatabaseUnit from './02.database.unit/database.unit'
import EntityUnit from './03.entity.unit/entity.unit'
import EnvelopeUnit from './04.envelope.unit/envelope.unit'
import EventUnit from './05.event.unit/event.unit'
import GrievanceUnit from './06.grievance.unit/grievance.unit'
import InventoryUnit from './07.inventory.unit/inventory.unit'
import LedgerUnit from './08.ledger.unit/ledger.unit'
import LeverageUnit from './09.leverage.unit/leverage.unit'
import LocationUnit from './10.location.unit/location.unit'
import MovementUnit from './11.movement.unit/movement.unit'
import ParanoiaUnit from './12.paranoia.unit/paranoia.unit'
import PrimordialUnit from './13.primordial.unit/primordial.unit'
import SequenceUnit from './14.sequence.unit/sequence.unit'
import SeriesUnit from './15.series.unit/series.unit'
import StateUnit from './16.state.unit/state.unit'
import TickUnit from './17.tick.unit/tick.unit'
import TraumaUnit from './18.trauma.unit/trauma.unit'
import WoundsUnit from './19.wounds.unit/wounds.unit'
import CollectUnit from './97.collect.unit/collect.unit'
import MenuUnit from './98.menu.unit/menu.unit'
import BusUnit from './99.bus.unit/bus.unit'

// 2. Interfaces & Models
import type Engine from './00.engine.unit/fce/engine.interface'
import { EngineModel } from './00.engine.unit/engine.model'
import type Actor from './01.actor.unit/fce/actor.interface'
import { ActorModel } from './01.actor.unit/actor.model'
import type Database from './02.database.unit/fce/database.interface'
import { DatabaseModel } from './02.database.unit/database.model'
import type Entity from './03.entity.unit/fce/entity.interface'
import { EntityModel } from './03.entity.unit/entity.model'
import type Envelope from './04.envelope.unit/fce/envelope.interface'
import { EnvelopeModel } from './04.envelope.unit/envelope.model'
import type Event from './05.event.unit/fce/event.interface'
import { EventModel } from './05.event.unit/event.model'
import type Grievance from './06.grievance.unit/fce/grievance.interface'
import { GrievanceModel } from './06.grievance.unit/grievance.model'
import type Inventory from './07.inventory.unit/fce/inventory.interface'
import { InventoryModel } from './07.inventory.unit/inventory.model'
import type Ledger from './08.ledger.unit/fce/ledger.interface'
import { LedgerModel } from './08.ledger.unit/ledger.model'
import type Leverage from './09.leverage.unit/fce/leverage.interface'
import { LeverageModel } from './09.leverage.unit/leverage.model'
import type Location from './10.location.unit/fce/location.interface'
import { LocationModel } from './10.location.unit/location.model'
import type Movement from './11.movement.unit/fce/movement.interface'
import { MovementModel } from './11.movement.unit/movement.model'
import type Paranoia from './12.paranoia.unit/fce/paranoia.interface'
import { ParanoiaModel } from './12.paranoia.unit/paranoia.model'
import type Primordial from './13.primordial.unit/fce/primordial.interface'
import { PrimordialModel } from './13.primordial.unit/primordial.model'
import type Sequence from './14.sequence.unit/fce/sequence.interface'
import { SequenceModel } from './14.sequence.unit/sequence.model'
import type Series from './15.series.unit/fce/series.interface'
import { SeriesModel } from './15.series.unit/series.model'
import type StateSnapshot from './16.state.unit/fce/state.interface'
import { StateModel } from './16.state.unit/state.model'
import type Tick from './17.tick.unit/fce/tick.interface'
import { TickModel } from './17.tick.unit/tick.model'
import type Trauma from './18.trauma.unit/fce/trauma.interface'
import { TraumaModel } from './18.trauma.unit/trauma.model'
import type Wounds from './19.wounds.unit/fce/wounds.interface'
import { WoundsModel } from './19.wounds.unit/wounds.model'
import type Collect from './97.collect.unit/fce/collect.interface'
import { CollectModel } from './97.collect.unit/collect.model'
import type Menu from './98.menu.unit/fce/menu.interface'
import { MenuModel } from './98.menu.unit/menu.model'
import type Bus from './99.bus.unit/fce/bus.interface'
import { BusModel } from './99.bus.unit/bus.model'

// 3. Execution Registration List
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

// 4. Reducer Registrations
import * as reduceFromEngine from './00.engine.unit/engine.reduce'
import * as reduceFromActor from './01.actor.unit/actor.reduce'
import * as reduceFromDatabase from './02.database.unit/database.reduce'
import * as reduceFromEntity from './03.entity.unit/entity.reduce'
import * as reduceFromEnvelope from './04.envelope.unit/envelope.reduce'
import * as reduceFromEvent from './05.event.unit/event.reduce'
import * as reduceFromGrievance from './06.grievance.unit/grievance.reduce'
import * as reduceFromInventory from './07.inventory.unit/inventory.reduce'
import * as reduceFromLedger from './08.ledger.unit/ledger.reduce'
import * as reduceFromLeverage from './09.leverage.unit/leverage.reduce'
import * as reduceFromLocation from './10.location.unit/location.reduce'
import * as reduceFromMovement from './11.movement.unit/movement.reduce'
import * as reduceFromParanoia from './12.paranoia.unit/paranoia.reduce'
import * as reduceFromPrimordial from './13.primordial.unit/primordial.reduce'
import * as reduceFromSequence from './14.sequence.unit/sequence.reduce'
import * as reduceFromSeries from './15.series.unit/series.reduce'
import * as reduceFromState from './16.state.unit/state.reduce'
import * as reduceFromTick from './17.tick.unit/tick.reduce'
import * as reduceFromTrauma from './18.trauma.unit/trauma.reduce'
import * as reduceFromWounds from './19.wounds.unit/wounds.reduce'
import * as reduceFromCollect from './97.collect.unit/collect.reduce'
import * as reduceFromMenu from './98.menu.unit/menu.reduce'
import * as reduceFromBus from './99.bus.unit/bus.reduce'

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

// 5. Composite State Container
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
    state: StateSnapshot = new StateModel()
    tick: Tick = new TickModel()
    trauma: Trauma = new TraumaModel()
    wounds: Wounds = new WoundsModel()
    collect: Collect = new CollectModel()
    menu: Menu = new MenuModel()
    bus: Bus = new BusModel()
}

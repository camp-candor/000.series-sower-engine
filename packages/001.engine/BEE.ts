import type Model from './99.core/interface/model.interface.js'

import EngineUnit from './00.engine.unit/engine.unit.js'
import MenuUnit from './98.menu.unit/menu.unit.js'

import type Engine from './00.engine.unit/fce/engine.interface.js'
import { EngineModel } from './00.engine.unit/engine.model.js'
import type Menu from './98.menu.unit/fce/menu.interface.js'
import { MenuModel } from './98.menu.unit/menu.model.js'

import * as reduceFromEngine from './00.engine.unit/engine.reduce.js'
import * as reduceFromMenu from './98.menu.unit/menu.reduce.js'

export const list: any[] = [EngineUnit, MenuUnit]

export const reducer: any = {
    engine: reduceFromEngine.reducer,
    menu: reduceFromMenu.reducer,
}

export default class UnitData implements Model {
    engine: Engine = new EngineModel()
    menu: Menu = new MenuModel()
}

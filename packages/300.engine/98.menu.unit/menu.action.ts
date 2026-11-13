/**
 * 98.menu.unit - Menu Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type MenuBit from './fce/menu.bit.js'

export const INIT_MENU = '[Menu action] Init Menu'
export class InitMenu implements Action {
    readonly type = INIT_MENU
    constructor(public bale?: MenuBit) {}
}

export const UPDATE_MENU = '[Menu action] Update Menu'
export class UpdateMenu implements Action {
    readonly type = UPDATE_MENU
    constructor(public bale?: MenuBit) {}
}

export const SELECT_MENU_OPTION = '[Menu action] Select Menu Option'
export class SelectMenuOption implements Action {
    readonly type = SELECT_MENU_OPTION
    constructor(public bale?: MenuBit) {}
}

export const SWITCH_FLIGHT_DECK_MODE = '[Menu action] Switch Flight Deck Mode'
export class SwitchFlightDeckMode implements Action {
    readonly type = SWITCH_FLIGHT_DECK_MODE
    constructor(public bale?: MenuBit) {}
}

export const ROUTE_MENU = '[Menu action] Route Menu'
export const OPEN_ARITHMETIC_MENU = '[Menu action] Open Arithmetic Menu'
export const EXECUTE_ARITHMETIC_AUDIT = '[Menu action] Execute Arithmetic Audit'

export interface MenuActionPayload {
    readonly idx?: string
    readonly val?: number
    readonly dat?: any
    readonly slv?: (res: any) => void
}

export class InitMenuAction implements Action {
    readonly type = INIT_MENU
    constructor(public readonly bale: MenuActionPayload = {}) {}
}

export class UpdateMenuAction implements Action {
    readonly type = UPDATE_MENU
    constructor(public readonly bale: MenuActionPayload = {}) {}
}

export class OpenArithmeticMenuAction implements Action {
    readonly type = OPEN_ARITHMETIC_MENU
    constructor(public readonly bale: MenuActionPayload = {}) {}
}

export class ExecuteArithmeticAuditAction implements Action {
    readonly type = EXECUTE_ARITHMETIC_AUDIT
    constructor(public readonly bale: MenuActionPayload = {}) {}
}

export type MenuActions =
    | InitMenuAction
    | UpdateMenuAction
    | OpenArithmeticMenuAction
    | ExecuteArithmeticAuditAction

export const TEST_MENU = '[Menu action] Test Menu'
export class TestMenu implements Action {
    readonly type = TEST_MENU
    constructor(public bale?: MenuBit) {}
}

export const CLOSE_MENU = '[Menu action] Close Menu'
export class CloseMenu implements Action {
    readonly type = CLOSE_MENU
    constructor(public bale?: MenuBit) {}
}

export const GITHUB_MENU = '[Time action] Github Menu'
export class GithubMenu implements Action {
    readonly type = GITHUB_MENU
    constructor(public bale?: MenuBit) {}
}

export const LIBRARY_MENU = '[Menu action] Library Menu'
export class LibraryMenu implements Action {
    readonly type = LIBRARY_MENU
    constructor(public bale?: MenuBit) {}
}

export const STABLE_MENU = '[Menu action] Stable Menu'
export class StableMenu implements Action {
    readonly type = STABLE_MENU
    constructor(public bale?: MenuBit) {}
}

export const GEMINI_MENU = '[Menu action] Gemini Menu'
export class GeminiMenu implements Action {
    readonly type = GEMINI_MENU
    constructor(public bale?: MenuBit) {}
}

export const SOWER_MENU = '[Menu action] Sower Menu'
export class SowerMenu implements Action {
    readonly type = SOWER_MENU
    constructor(public bale?: MenuBit) {}
}

export const CLICKUP_MENU = '[Menu action] Clickup Menu'
export class ClickupMenu implements Action {
    readonly type = CLICKUP_MENU
    constructor(public bale?: MenuBit) {}
}

export const DATA_MENU = '[Menu action] Data Menu'
export class DataMenu implements Action {
    readonly type = DATA_MENU
    constructor(public bale?: MenuBit) {}
}

export const AGENT_MENU = '[Menu action] Agent Menu'
export class AgentMenu implements Action {
    readonly type = AGENT_MENU
    constructor(public bale?: MenuBit) {}
}

export const ENGINE_MENU = '[Menu action] Engine Menu'
export class EngineMenu implements Action {
    readonly type = ENGINE_MENU
    constructor(public bale?: MenuBit) {}
}

export const TELEGRAM_MENU = '[Menu action] Telegram Menu'
export class TelegramMenu implements Action {
    readonly type = TELEGRAM_MENU
    constructor(public bale?: MenuBit) {}
}

export const TIME_MENU = '[Menu action] Time Menu'
export class TimeMenu implements Action {
    readonly type = TIME_MENU
    constructor(public bale?: MenuBit) {}
}

export const COLOR_MENU = '[Menu action] Color Menu'
export class ColorMenu implements Action {
    readonly type = COLOR_MENU
    constructor(public bale?: MenuBit) {}
}

export const FATE_MENU = '[Menu action] Fate Menu'
export class FateMenu implements Action {
    readonly type = FATE_MENU
    constructor(public bale?: MenuBit) {}
}

export const BEING_MENU = '[Menu action] Being Menu'
export class BeingMenu implements Action {
    readonly type = BEING_MENU
    constructor(public bale?: MenuBit) {}
}

export const UPDATE_FOCUS_PLAY_MENU = '[Focus action] Update Focus Play Menu'
export class UpdateFocusPlayMenu implements Action {
    readonly type = UPDATE_FOCUS_PLAY_MENU
    constructor(public bale?: MenuBit) {}
}

export const CREATE_MENU = '[Create action] Create Menu'
export class CreateMenu implements Action {
    readonly type = CREATE_MENU
    constructor(public bale?: MenuBit) {}
}

export const HEXMAP_MENU = '[Hexmap action] Hexmap Menu'
export class HexmapMenu implements Action {
    readonly type = HEXMAP_MENU
    constructor(public bale?: MenuBit) {}
}

export const CREATE_HEXMAP_MENU = '[Hexmap action] Create Hexmap Menu'
export class CreateHexmapMenu implements Action {
    readonly type = CREATE_HEXMAP_MENU
    constructor(public bale?: MenuBit) {}
}

export const RENDER_MENU = '[Render action] Render Menu'
export class RenderMenu implements Action {
    readonly type = RENDER_MENU
    constructor(public bale?: MenuBit) {}
}

export const YIELD_MENU = '[Render action] Yield Menu'
export class YieldMenu implements Action {
    readonly type = YIELD_MENU
    constructor(public bale?: MenuBit) {}
}

export const PRINT_MENU = '[Render action] Print Menu'
export class PrintMenu implements Action {
    readonly type = PRINT_MENU
    constructor(public bale?: MenuBit) {}
}

export const GRAPHICSMAGIC_MENU = '[Menu action] Graphicsmagic Menu'
export class GraphicsmagicMenu implements Action {
    readonly type = GRAPHICSMAGIC_MENU
    constructor(public bale?: MenuBit) {}
}

export const OPEN_SPATIAL_PROBE_MENU = '[Menu action] Open Spatial Probe Menu'
export class OpenSpatialProbeMenu implements Action {
    readonly type = OPEN_SPATIAL_PROBE_MENU
    constructor(public bale?: MenuBit) {}
}

export const DISPATCH_SPATIAL_PROBE = '[Menu action] Dispatch Spatial Probe'
export class DispatchSpatialProbe implements Action {
    readonly type = DISPATCH_SPATIAL_PROBE
    constructor(public bale?: MenuBit) {}
}

export const DISPATCH_EDGE_SYNC_PROBE = '[Menu action] Dispatch Edge Sync Probe'
export class DispatchEdgeSyncProbe implements Action {
    readonly type = DISPATCH_EDGE_SYNC_PROBE
    constructor(public bale?: MenuBit) {}
}

export const TEST_SPATIAL_WORK_CEILING =
    '[Menu action] Test Spatial Work Ceiling'
export class TestSpatialWorkCeiling implements Action {
    readonly type = TEST_SPATIAL_WORK_CEILING
    constructor(public bale?: MenuBit) {}
}

export const STAGE_FOUNTAIN_SCREENPLAY_EDITOR =
    '[Menu action] Stage Spatial Header With Fountain Screenplay Editor'
export class StageFountainScreenplayEditor implements Action {
    readonly type = STAGE_FOUNTAIN_SCREENPLAY_EDITOR
    constructor(public bale?: MenuBit) {}
}

export const COMPILE_FULL_FOUNTAIN_DRAFT =
    '[Menu action] Compile Full Fountain Draft To Dialogue AST'
export class CompileFullFountainDraft implements Action {
    readonly type = COMPILE_FULL_FOUNTAIN_DRAFT
    constructor(public bale?: MenuBit) {}
}

export const EXPORT_TO_CONDUCTOR = '[Menu action] Export To Conductor'
export class ExportToConductor implements Action {
    readonly type = EXPORT_TO_CONDUCTOR
    constructor(public bale?: MenuBit) {}
}

export type Actions =
    | InitMenu
    | UpdateMenu
    | SwitchFlightDeckMode
    | SelectMenuOption
    | ClickupMenu
    | TestMenu
    | CloseMenu
    | GithubMenu
    | TimeMenu
    | CreateMenu
    | HexmapMenu
    | RenderMenu
    | CreateHexmapMenu
    | YieldMenu
    | ColorMenu
    | UpdateFocusPlayMenu
    | PrintMenu
    | LibraryMenu
    | StableMenu
    | SowerMenu
    | GeminiMenu
    | FateMenu
    | EngineMenu
    | TelegramMenu
    | BeingMenu
    | DataMenu
    | AgentMenu
    | GraphicsmagicMenu
    | OpenArithmeticMenuAction
    | ExecuteArithmeticAuditAction
    | OpenSpatialProbeMenu
    | DispatchSpatialProbe
    | DispatchEdgeSyncProbe
    | TestSpatialWorkCeiling
    | StageFountainScreenplayEditor
    | CompileFullFountainDraft
    | ExportToConductor

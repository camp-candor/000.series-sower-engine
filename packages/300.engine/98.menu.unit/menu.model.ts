/**
 * 98.menu.unit - Menu State Model Container
 */
import type Menu from './fce/menu.interface.js'
import type {
    CompiledUniverseDescriptor,
    AirlockState,
    FlightDeckMode,
    MenuMode,
    SpatialProbeTelemetry,
} from './fce/menu.interface.js'
import type MenuBit from './fce/menu.bit.js'

export const MAIN_MENU_CHOICES: readonly string[] = Object.freeze([
    '[01] BOOT ENGINE & ENSURE SCHEMA',
    '[02] STATUS ENGINE & TABLE',
    '[03] SEED PRIMORDIAL GENESIS (S_0)',
    '[04] ADVANCE TICK',
    '[14] EXECUTE DETERMINISTIC SIMULATION',
    '[17] SPATIAL FEASIBILITY PROBE',
    '[ROOT MENU]',
])

export const SPATIAL_PROBE_CHOICES: readonly string[] = Object.freeze([
    '[01] TEST CANONICAL PASSAGE (Pipe -> Culvert Junction)',
    '[02] TEST OCCLUDED ROUTE (Locked Sluice Valve)',
    '[03] TEST WORK CEILING TRIPWIRE (512-Cell Exhaustion)',
    '[04] TEST SENSORY PERCEPTION SNR (Optical & Acoustic)',
    '[ROOT MENU]',
])

export class MenuModel implements Menu {
    idx = '98.menu'
    discoveredUniverses: CompiledUniverseDescriptor[] = []
    activeUniverseSlug = ''
    flightDeckMode: FlightDeckMode = 'BOOT'
    activeSeriesSlug = ''
    airlockState: AirlockState = 'IDLE'
    activeSelection = ''
    lastActionTimestamp = 1700000000000
    isHeadless = false
    menuBits: Record<string, MenuBit> = {}
    activeMenuMode: MenuMode = 'ROOT'
    totalInteractions: number = 0
    spatialProbeActive: boolean = false
    totalProbesDispatched: number = 0
    lastProbeTelemetry: SpatialProbeTelemetry | null = null
    statusMessage: string = 'MENU_STANDBY'
}

export default MenuModel

import type Menu from './fce/menu.interface.js'
import type {
    CompiledUniverseDescriptor,
    AirlockState,
} from './fce/menu.interface.js'
import type MenuBit from './fce/menu.bit.js'

export class MenuModel implements Menu {
    idx = '98.menu'
    discoveredUniverses: CompiledUniverseDescriptor[] = []
    activeUniverseSlug = ''
    airlockState: AirlockState = 'IDLE'
    activeSelection = ''
    lastActionTimestamp = 1700000000000
    isHeadless = false
    menuBits: Record<string, MenuBit> = {}
}

export default MenuModel

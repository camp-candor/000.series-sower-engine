/**
 * 98.menu.unit - Menu State Model Container
 */
import type Menu from './fce/menu.interface.js'
import type { CompiledUniverseDescriptor } from './fce/menu.interface.js'
import type MenuBit from './fce/menu.bit.js'

export class MenuModel implements Menu {
    idx: string = '98.menu'
    activeSelection: string = ''
    discoveredUniverses: CompiledUniverseDescriptor[] = []
    activeUniverseSlug: string = ''
    menuBits: Record<string, MenuBit> = {}
    isHeadless: boolean = false
    lastActionTimestamp: number = 0

    lst: string[] = []
    geoJsonNow: any
    atlasNow: any
    sizeNow: any = 0
    mapShape: string = 'none'
    mapNomNow: string = 'none'
    mapDimensions: string = 'none'
    shapeBit: any
}

export default MenuModel

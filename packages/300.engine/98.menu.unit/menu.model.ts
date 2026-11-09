/**
 * 98.menu.unit - Menu State Model Container
 */
import type Menu from './fce/menu.interface.js'

export class MenuModel implements Menu {
    idx: string = '98.menu'
    activeSelection: string = ''
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

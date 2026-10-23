import type Menu from './fce/menu.interface'

export class MenuModel implements Menu {
    idx = '98.menu'
    activeSelection = ''
    lastActionTimestamp = 0
}

export default MenuModel

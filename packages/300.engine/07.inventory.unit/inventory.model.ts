/**
 * 07.inventory.unit - Inventory State Model Container
 */
import type Inventory from './fce/inventory.interface.js'
import type { EntityInventoryState } from './fce/inventory.interface.js'

export class InventoryModel implements Inventory {
    idx: string = '07.inventory'
    inventories: Record<string, EntityInventoryState> = {}
}

export default InventoryModel

import type Inventory from './fce/inventory.interface'
import type { EntityInventoryState } from './fce/inventory.interface'

export class InventoryModel implements Inventory {
    idx = '07.inventory'
    inventories: Record<string, EntityInventoryState> = {}
}

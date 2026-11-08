/**
 * 03.entity.unit - Entity State Model Container
 */
import type Entity from './fce/entity.interface.js'
import type { CompositeEntityState } from './fce/entity.interface.js'

export class EntityModel implements Entity {
    idx: string = '03.entity'
    entities: Map<string, CompositeEntityState> = new Map()
}

export default EntityModel

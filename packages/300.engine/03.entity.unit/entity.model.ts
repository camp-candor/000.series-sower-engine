import type Entity from './fce/entity.interface'
import type { CompositeEntityState } from './fce/entity.interface'

export class EntityModel implements Entity {
    idx = '03.entity'
    entities: Record<string, CompositeEntityState> = {}
}

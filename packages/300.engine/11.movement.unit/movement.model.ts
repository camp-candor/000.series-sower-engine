import type Movement from './fce/movement.interface'
import type { ActorSpatialPosition } from './fce/movement.interface'

export class MovementModel implements Movement {
    idx = '11.movement'
    positions: Record<string, ActorSpatialPosition> = {}
}

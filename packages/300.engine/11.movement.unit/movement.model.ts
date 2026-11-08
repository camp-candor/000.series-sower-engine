/**
 * 11.movement.unit - Movement State Model Container
 */
import type Movement from './fce/movement.interface.js'
import type { ActorMovementState } from './fce/movement.interface.js'

export class MovementModel implements Movement {
    idx: string = '11.movement'
    actorPositions: Map<string, ActorMovementState> = new Map()
    occupiedCells: Map<string, string> = new Map()
}

export default MovementModel

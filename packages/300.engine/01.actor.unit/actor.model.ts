import type Actor from './fce/actor.interface'
import type {
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from './fce/actor.interface'

export class ActorModel implements Actor {
    idx = '01.actor'
    beliefs: Record<string, ActorBeliefRecord> = {}
    details: Record<string, UnratifiedDetailRecord> = {}
}

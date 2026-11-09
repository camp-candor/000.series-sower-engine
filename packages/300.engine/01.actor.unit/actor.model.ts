/**
 * 01.actor.unit - Actor State Model Container
 */
import type Actor from './fce/actor.interface.js'
import type {
    ActorBeliefRecord,
    UnratifiedDetailRecord,
    DialogueBeatAST,
} from './fce/actor.interface.js'

export class ActorModel implements Actor {
    idx: string = '01.actor'
    beliefs: Map<string, ActorBeliefRecord> = new Map()
    details: Map<string, UnratifiedDetailRecord> = new Map()
    compiledBeats: Map<string, DialogueBeatAST> = new Map()
}

export default ActorModel

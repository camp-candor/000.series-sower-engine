import type Tick from './fce/tick.interface'

export class TickModel implements Tick {
    idx = '17.tick'
    currentTick = 0
    worldSeed = 'series_world_seed_genesis_alpha'
    lastDerivedSeed = '0'.repeat(64)
    totalTicksAdvanced = 0
    lastTickAtMs = 0
}

export default TickModel

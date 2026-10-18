import type Engine from './fce/engine.interface.js'

export class EngineModel implements Engine {
  idx = '001.engine'
  status = 'OFFLINE'
  val = 0
}

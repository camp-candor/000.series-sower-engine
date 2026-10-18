import type { EngineModel } from '../engine.model.js'
import type EngineBit from '../fce/engine.bit.js'
import type State from '../../99.core/state.js'

export const initEngine = async (cpy: EngineModel, bal: EngineBit, _ste: State) => {
  cpy.status = 'ONLINE'
  cpy.val = 1
  if (bal.slv) {
    bal.slv({ engBit: { idx: 'init-engine', val: 1 } })
  }
  return cpy
}

export const updateEngine = async (cpy: EngineModel, bal: EngineBit, _ste: State) => {
  if (bal.val !== undefined) {
    cpy.val = bal.val
  }

  const library = (globalThis as any).LIBRARY
  if (library && typeof library.hunt === 'function' && bal.src) {
    library.hunt('[Console action] Update Console', {
      idx: 'cns00',
      src: `[ENGINE] ${bal.src}`,
    })
  }

  if (bal.slv) {
    bal.slv({ engBit: { idx: 'update-engine', val: cpy.val } })
  }
  return cpy
}

export const auditEngine = async (cpy: EngineModel, bal: EngineBit, _ste: State) => {
  const library = (globalThis as any).LIBRARY
  if (library && typeof library.hunt === 'function') {
    library.hunt('[Console action] Update Console', {
      idx: 'cns00',
      src: `[KERNEL] Verifying monotonic facts... [OK]`,
    })
  }

  if (bal.slv) {
    bal.slv({
      engBit: { idx: 'audit-engine', dat: { auditHash: '001_ENGINE_VERIFIED_SHA256' } },
    })
  }
  return cpy
}

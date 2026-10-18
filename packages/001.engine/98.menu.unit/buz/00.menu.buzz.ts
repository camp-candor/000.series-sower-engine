import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type State from '../../99.core/state.js'
import * as ActEng from '../../00.engine.unit/engine.action.js'

export const initMenu = async (cpy: MenuModel, bal: MenuBit, _ste: State) => {
  if (bal && bal.slv != null) {
    bal.slv({ mnuBit: { idx: 'init-menu' } })
  }
  return cpy
}

export const updateMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
  const library = (globalThis as any).LIBRARY

  // Headless or Non-TUI Fallback
  if (!library || typeof library.hunt !== 'function') {
    if (bal && bal.slv != null) {
      bal.slv({ mnuBit: { idx: 'update-menu-headless', src: 'HEADLESS_BYPASS' } })
    }
    return cpy
  }

  const lst = [
    'INSPECT FACTS LEDGER',
    'RUN SOMATIC PANOPTICON LINTER',
    'AUDIT SIMULATION KERNEL',
    'ROOT MENU',
  ]

  try {
    const bit = await library.hunt('[Grid action] Update Grid', {
      x: 0,
      y: 4,
      xSpan: 4,
      ySpan: 8,
    })

    const choiceBit = await library.hunt('[Open action] Open Choice', {
      dat: { clr0: 'black', clr1: 'yellow' },
      src: 'vertical',
      lst,
      net: bit.grdBit?.dat,
    })

    const selection = choiceBit.chcBit?.src

    switch (selection) {
      case 'INSPECT FACTS LEDGER':
        await ste.hunt(ActEng.UPDATE_ENGINE, {
          src: 'Inspecting Canon Facts Ledger D1 State',
        })
        break

      case 'RUN SOMATIC PANOPTICON LINTER':
        await ste.hunt(ActEng.UPDATE_ENGINE, {
          src: 'Executing O(1) Somatic SAT Panopticon',
        })
        break

      case 'AUDIT SIMULATION KERNEL':
        await ste.hunt(ActEng.AUDIT_ENGINE, {
          src: 'Verifying dependency purity and monotonic triggers',
        })
        break

      case 'ROOT MENU':
      default:
        if (bal && bal.slv != null) {
          bal.slv({ mnuBit: { idx: 'root-menu' } })
          return cpy
        }
        break
    }
  } catch (err: any) {
    await ste.hunt(ActEng.UPDATE_ENGINE, {
      src: `:: [FAIL] Menu error: ${err.message}`,
    })
  }

  if (bal && bal.slv != null) {
    bal.slv({ mnuBit: { idx: 'update-menu-complete' } })
  }
  return cpy
}

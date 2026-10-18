// ============================================================================
// @camp_candor/001.engine - PURE SIMULATION KERNEL & FACTS LEDGER CORE
// Architectural Law: Zero Cloudflare Worker / Edge Runtime Dependencies
// ============================================================================

export const ENGINE_KERNEL_VERSION = '0.1.0'
export const ENGINE_WORKSPACE_NAME = '@camp_candor/001.engine'

export interface EngineKernelStatus {
  service: string
  version: string
  pure: boolean
}

export function getEngineKernelStatus(): EngineKernelStatus {
  return {
    service: ENGINE_WORKSPACE_NAME,
    version: ENGINE_KERNEL_VERSION,
    pure: true,
  }
}

// Re-export reactive bus and unit orchestration
export { default as hunt } from '../hunt.js'
export { default as UnitData, list, reducer } from '../BEE.js'
export * as ActEng from '../00.engine.unit/engine.action.js'
export * as ActMnu from '../98.menu.unit/menu.action.js'

export * from './canon/types.js';
export * from './canon/bibleLoader.js';

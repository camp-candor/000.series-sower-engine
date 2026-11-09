import type MenuBit from './menu.bit.js';

export interface CompiledUniverseDescriptor {
  seriesSlug: string;
  manifestPath: string;
  byteSize: number;
  merkleRootHex: string;
  hasBibleState: boolean;
}

export type AirlockState = 'IDLE' | 'SCANNING' | 'SELECTING' | 'DISPATCHED' | 'ABORTED';

export default interface Menu {
  idx: string;
  discoveredUniverses?: CompiledUniverseDescriptor[];
  activeUniverseSlug?: string;
  airlockState?: AirlockState;
  activeSelection?: string;
  lastActionTimestamp?: number;
  isHeadless?: boolean;
  menuBits?: Record<string, MenuBit>;
}

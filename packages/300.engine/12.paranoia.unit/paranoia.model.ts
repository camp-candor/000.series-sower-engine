/**
 * 12.paranoia.unit - Paranoia State Model Container
 */
import type Paranoia from './fce/paranoia.interface.js'
import type { ParanoiaClockState } from './fce/paranoia.interface.js'

export class ParanoiaModel implements Paranoia {
    idx: string = '12.paranoia'
    clocks: Map<string, ParanoiaClockState> = new Map()
    activeDispatchCount: number = 0
    lastDispatchedClockId: string = ''
}

export default ParanoiaModel

import type Primordial from './fce/primordial.interface.js'

export class PrimordialModel implements Primordial {
    idx = '13.primordial'
    hRoot = '0'.repeat(64)
    genesisSeeded = false
    activeSeriesSlug = ''
}

export default PrimordialModel

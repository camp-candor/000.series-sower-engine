/**
 * 03.entity.unit - Entity Bit Payload Contracts
 */
import type {
    CompositeEntityState,
    EntityLiveDbRow,
    AssembleEntityParams,
    EntityQueryFilter,
} from './entity.interface.js'

export interface EntityPayload {
    readonly entityId?: string
    readonly locationId?: string
    readonly assembleParams?: AssembleEntityParams
    readonly queryFilter?: EntityQueryFilter
    readonly entity?: CompositeEntityState
    readonly entities?: readonly CompositeEntityState[]
    readonly dbRow?: EntityLiveDbRow
    readonly dbRows?: readonly EntityLiveDbRow[]
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface EntityBit {
    idx: string
    src?: string
    val?: number
    dat?: EntityPayload
    lst?: readonly CompositeEntityState[]
    slv?: Function
}

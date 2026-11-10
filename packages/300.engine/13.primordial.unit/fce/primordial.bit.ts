import type { GenesisSeedingResult } from './primordial.interface.js'

export interface PrimordialPayload {
    readonly seriesSlug?: string
    readonly bibleState?: Readonly<Record<string, any>>
    readonly seededAtMs?: number
    readonly result?: GenesisSeedingResult
    readonly hRoot?: string
    readonly isSeeded?: boolean
    readonly entitiesCount?: number
    readonly error?: string
    [key: string]: any
}

export default interface PrimordialBit {
    idx: string
    src?: string
    val?: number
    dat?: PrimordialPayload
    slv?: Function
}

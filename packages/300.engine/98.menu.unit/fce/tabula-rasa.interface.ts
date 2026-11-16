/**
 * 98.menu.unit - Tabula Rasa Void-State Reset Payload Contracts
 * Defines triple-lock confirmation tokens, blast-radius inventory, and reset receipts.
 */

export type TabulaRasaConfirmToken1 = 'CONFIRM_1_OF_3'
export type TabulaRasaConfirmToken2 = 'CONFIRM_2_OF_3'
export type TabulaRasaConfirmToken3 = 'CONFIRM_3_OF_3'

export const TABULA_RASA_TOKEN_1: TabulaRasaConfirmToken1 = 'CONFIRM_1_OF_3'
export const TABULA_RASA_TOKEN_2: TabulaRasaConfirmToken2 = 'CONFIRM_2_OF_3'
export const TABULA_RASA_TOKEN_3: TabulaRasaConfirmToken3 = 'CONFIRM_3_OF_3'

export type TabulaRasaCascadeOrigin =
    | 'LOCAL_TUI'
    | 'CAULDRON_MASTER_CASCADE'
    | 'HEADLESS_AGENT'
    | 'EDGE_WORKER'

export interface EngineTabulaRasaRequest {
    readonly baseDir?: string
    readonly confirmToken1?: string
    readonly confirmToken2?: string
    readonly confirmToken3?: string
    readonly cascadeStep?: number
    readonly cascadeOrigin?: TabulaRasaCascadeOrigin
    readonly fencingEpoch?: number
}

export interface EnginePurgedCounts {
    readonly compiledUniverseDirs: number
    readonly fountainDraftFiles: number
    readonly dialogueAstFiles: number
    readonly conductorExportFiles: number
    readonly sqliteDbFiles: number
    readonly inMemoryTableRows: number
}

export interface EngineBlastRadiusInventory {
    readonly engineRoot: string
    readonly compiledUniverseDirs: number
    readonly compiledUniverseSlugs: readonly string[]
    readonly fountainDraftFiles: number
    readonly dialogueAstFiles: number
    readonly conductorExportFiles: number
    readonly sqliteDbFiles: number
    readonly inMemoryTableRows: number
    readonly tableRowBreakdown: Readonly<Record<string, number>>
    readonly totalDiskArtifacts: number
    readonly isAlreadyVoidState: boolean
}

export interface EngineTabulaRasaReceipt {
    readonly ok: boolean
    readonly voidStateVerified: boolean
    readonly purgedCounts: EnginePurgedCounts
    readonly tablesClearedCount: number
    readonly unitsResetList: readonly string[]
    readonly stateSnapshotHash: string
    readonly timestampIso: string
    readonly receipts: readonly string[]
    readonly abortedAtStage?: 0 | 1 | 2 | 3
    readonly error?: string
}

import {
    CompilationStatus,
    CompileCatalogSummary,
    CompileValidationReport,
    CompileGateFailure,
} from './compile.interface.js'

export type { CompilationStatus }

export type CompileActionType =
    | 'init-compile'
    | 'run-compile'
    | 'pass1-shape-eval'
    | 'pass2-relational-sweep'
    | 'pass3-deterministic-seal'
    | 'gate0-verify'
    | 'offline-deletion-test'

export interface CompileCharacterEntity {
    readonly id: string
    readonly name: string
    readonly aliases?: readonly string[]
    readonly vocalCue?: string
    readonly speakable?: boolean
    readonly somaticState?: {
        readonly motorCapabilityMask?: readonly string[]
        readonly enduranceBp?: number
        readonly stressBp?: number
        readonly coherenceBp?: number
    }
    readonly [key: string]: unknown
}

export interface CompileLocationEntity {
    readonly id: string
    readonly name: string
    readonly connectedLocationIds: readonly string[]
    readonly capacityBp?: number
    readonly [key: string]: unknown
}

export interface CompilePossessionEntity {
    readonly id: string
    readonly name: string
    readonly holderCharacterId: string
    readonly durabilityBp?: number
    readonly [key: string]: unknown
}

export interface CompileGrievanceEntity {
    readonly id: string
    readonly sourceCharacterId: string
    readonly targetCharacterId: string
    readonly intensityBp: number
    readonly dependsOnGrievanceIds?: readonly string[]
    readonly [key: string]: unknown
}

export interface CompileCorpusPayload {
    readonly characters: readonly CompileCharacterEntity[]
    readonly locations: readonly CompileLocationEntity[]
    readonly possessions: readonly CompilePossessionEntity[]
    readonly grievances: readonly CompileGrievanceEntity[]
}

export interface CompileExecutionOptions {
    seriesSlug?: string
    sourceDir?: string
    outputDir?: string
    dryRun?: boolean
    skipArchive?: boolean
    verifyDriftTripwire?: boolean
    strictFailClosed?: boolean
    corpus?: CompileCorpusPayload
    expectedRootMerkleHash?: string
    timestamp?: string
}

export interface CompileResultPayload {
    seriesSlug: string
    rootMerkleHash: string
    entityHashes: Record<string, string>
    canonicalPath: string
    archivePath: string
    catalogSummary: CompileCatalogSummary
    executionDurationMs: number
    cleanExit: boolean
    validationReport?: CompileValidationReport
    errors?: string[]
}

export interface CompileErrorPayload {
    code: string
    message: string
    failures?: CompileGateFailure[]
    stack?: string
}

export default interface CompileBit {
    idx: string
    src?: string // Target root directory or series path
    val?: number // Numeric flags: 0 = silent, 1 = verbose telemetry, 2 = strict fail-closed
    dat?: CompileExecutionOptions
    slv?: (result: {
        cmpBit?: Partial<CompileBit>
        resBit?: Partial<CompileResultPayload>
        errBit?: CompileErrorPayload
    }) => void
}

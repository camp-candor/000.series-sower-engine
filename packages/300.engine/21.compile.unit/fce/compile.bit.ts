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

export interface CompileExecutionOptions {
    seriesSlug?: string
    sourceDir?: string
    outputDir?: string
    dryRun?: boolean
    skipArchive?: boolean
    verifyDriftTripwire?: boolean
    strictFailClosed?: boolean
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

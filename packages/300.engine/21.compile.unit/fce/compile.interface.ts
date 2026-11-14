export type CompilationStatus =
    | 'IDLE'
    | 'SCANNING'
    | 'PASS_1_EVALUATING'
    | 'PASS_2_TRAVERSING'
    | 'PASS_3_SEALING'
    | 'SEALED'
    | 'FAILED'

export interface CompileCatalogSummary {
    characterCount: number
    locationCount: number
    possessionCount: number
    grievanceCount: number
    totalEntities: number
}

export interface CompileGateFailure {
    gate:
        | 'GATE_0_PREFLIGHT'
        | 'GATE_1_SYNTAX_BOUNDS'
        | 'GATE_2_RELATIONAL_DAG'
        | 'GATE_3_SEAL_DRIFT'
    targetFile?: string
    entityId?: string
    field?: string
    message: string
}

export interface CompileValidationReport {
    valid: boolean
    timestamp: string
    seriesSlug: string
    evaluatedFiles: number
    failures: CompileGateFailure[]
    warnings: string[]
}

export default interface Compile {
    idx: string
    status: CompilationStatus
    activeSeriesSlug?: string
    sourceDirectory?: string
    outputDirectory?: string
    rootMerkleHash?: string
    lastSealedAt?: string
    catalogSummary?: CompileCatalogSummary
    validationReport?: CompileValidationReport
    lastError?: string
}

export interface SynthesizedEventScreenplay {
    readonly fountainText: string
    readonly contentSha256: string
    readonly sceneSummaryAst: {
        readonly seriesSlug: string
        readonly eventSequence: number
        readonly tick: number
        readonly category: string
        readonly isoDate: string
        readonly clockTimeHm: string
        readonly daypart: string
        readonly triggerReason: string
        readonly severityBps: number
    }
}

export interface SixCategoryScreenplayAudit {
    readonly hasSlugline: boolean
    readonly hasActionLines: boolean
    readonly hasCharacterCue: boolean
    readonly hasParenthetical: boolean
    readonly hasDialogue: boolean
    readonly hasTransition: boolean
    readonly hasDateHeader: boolean
    readonly hasStartTimeHm: boolean
    readonly allValid: boolean
}

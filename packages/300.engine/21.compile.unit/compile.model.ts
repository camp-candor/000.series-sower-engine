import Compile, {
    CompilationStatus,
    CompileCatalogSummary,
    CompileValidationReport,
} from './fce/compile.interface.js'

export class CompileModel implements Compile {
    idx: string = '21.compile'
    status: CompilationStatus = 'IDLE'
    activeSeriesSlug?: string = '001.goblin-lore'
    sourceDirectory?: string = 'corpus'
    outputDirectory?: string = 'compiled'
    rootMerkleHash?: string
    lastSealedAt?: string
    catalogSummary?: CompileCatalogSummary
    validationReport?: CompileValidationReport
    lastError?: string
}

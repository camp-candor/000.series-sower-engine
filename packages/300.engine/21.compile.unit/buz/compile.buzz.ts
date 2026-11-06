import { createHash } from 'node:crypto'
import { CompileModel } from '../compile.model.js'
import CompileBit, {
    CompileCorpusPayload,
    CompileResultPayload,
} from '../fce/compile.bit.js'
import {
    CompileCatalogSummary,
    CompileGateFailure,
    CompileValidationReport,
} from '../fce/compile.interface.js'
import State from '../../99.core/state.js'

const DEFAULT_TIMESTAMP = '2026-11-05T00:00:00.000Z'

const EMPTY_CORPUS: CompileCorpusPayload = {
    characters: [],
    locations: [],
    possessions: [],
    grievances: [],
}

export function canonicalizeJcs(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value)
    }
    if (Array.isArray(value)) {
        return '[' + value.map((item) => canonicalizeJcs(item)).join(',') + ']'
    }
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    return (
        '{' +
        keys
            .map(
                (key) =>
                    JSON.stringify(key) + ':' + canonicalizeJcs(record[key]),
            )
            .join(',') +
        '}'
    )
}

export function sha256Hex(payload: string): string {
    return createHash('sha256').update(payload, 'utf8').digest('hex')
}

function isPure7BitAscii(text: string): boolean {
    for (let i = 0; i < text.length; i += 1) {
        if (text.charCodeAt(i) > 127) {
            return false
        }
    }
    return true
}

function validateBpField(
    value: number | undefined,
    entityId: string,
    field: string,
    failures: CompileGateFailure[],
): void {
    if (value === undefined) {
        return
    }
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
        failures.push({
            gate: 'GATE_1_SYNTAX_BOUNDS',
            entityId,
            field,
            message: `Entity "${entityId}" field "${field}" (${String(value)}) violates integer basis-point bounds [0, 10000].`,
        })
    }
}

function buildCatalogSummary(
    corpus: CompileCorpusPayload,
): CompileCatalogSummary {
    const characterCount = corpus.characters.length
    const locationCount = corpus.locations.length
    const possessionCount = corpus.possessions.length
    const grievanceCount = corpus.grievances.length
    return {
        characterCount,
        locationCount,
        possessionCount,
        grievanceCount,
        totalEntities:
            characterCount + locationCount + possessionCount + grievanceCount,
    }
}

function ensureValidationReport(
    cpy: CompileModel,
    bal: CompileBit,
    corpus: CompileCorpusPayload,
): CompileValidationReport {
    const summary = buildCatalogSummary(corpus)
    cpy.catalogSummary = summary
    if (!cpy.validationReport) {
        cpy.validationReport = {
            valid: true,
            timestamp: bal.dat?.timestamp ?? DEFAULT_TIMESTAMP,
            seriesSlug:
                bal.dat?.seriesSlug ??
                cpy.activeSeriesSlug ??
                'wiregrass-basin',
            evaluatedFiles: summary.totalEntities,
            failures: [],
            warnings: [],
        }
    } else {
        cpy.validationReport.evaluatedFiles = summary.totalEntities
    }
    return cpy.validationReport
}

export const initCompile = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    cpy.status = 'IDLE'
    cpy.activeSeriesSlug =
        bal.dat?.seriesSlug ??
        bal.src ??
        cpy.activeSeriesSlug ??
        'wiregrass-basin'
    cpy.sourceDirectory = bal.dat?.sourceDir ?? cpy.sourceDirectory ?? 'corpus'
    cpy.outputDirectory =
        bal.dat?.outputDir ?? cpy.outputDirectory ?? 'compiled'
    cpy.lastError = undefined
    cpy.validationReport = undefined

    if (bal.slv) {
        bal.slv({
            cmpBit: {
                idx: 'init-compile',
                src: cpy.activeSeriesSlug,
                val: 0,
            },
        })
    }
    return cpy
}

export const pass1Evaluate = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    cpy.status = 'PASS_1_EVALUATING'
    const corpus = bal.dat?.corpus ?? EMPTY_CORPUS
    const report = ensureValidationReport(cpy, bal, corpus)
    const seenIds = new Set<string>()

    const registerId = (id: string, name: string | undefined, kind: string) => {
        if (!id || id.trim().length === 0) {
            report.failures.push({
                gate: 'GATE_1_SYNTAX_BOUNDS',
                entityId: id || `<empty-${kind}>`,
                field: 'id',
                message: `Missing or empty ${kind} entity id.`,
            })
            return
        }
        if (seenIds.has(id)) {
            report.failures.push({
                gate: 'GATE_1_SYNTAX_BOUNDS',
                entityId: id,
                field: 'id',
                message: `Duplicate entity id "${id}" detected in ${kind} collection.`,
            })
        }
        seenIds.add(id)

        if (!isPure7BitAscii(id) || (name && !isPure7BitAscii(name))) {
            report.failures.push({
                gate: 'GATE_1_SYNTAX_BOUNDS',
                entityId: id,
                field: 'name',
                message: `Entity "${id}" contains non-7-bit ASCII characters.`,
            })
        }
    }

    for (const ch of corpus.characters) {
        registerId(ch.id, ch.name, 'character')
        validateBpField(
            ch.somaticState?.enduranceBp,
            ch.id,
            'somaticState.enduranceBp',
            report.failures,
        )
        validateBpField(
            ch.somaticState?.stressBp,
            ch.id,
            'somaticState.stressBp',
            report.failures,
        )
        validateBpField(
            ch.somaticState?.coherenceBp,
            ch.id,
            'somaticState.coherenceBp',
            report.failures,
        )
    }

    for (const loc of corpus.locations) {
        registerId(loc.id, loc.name, 'location')
        validateBpField(loc.capacityBp, loc.id, 'capacityBp', report.failures)
    }

    for (const pos of corpus.possessions) {
        registerId(pos.id, pos.name, 'possession')
        validateBpField(
            pos.durabilityBp,
            pos.id,
            'durabilityBp',
            report.failures,
        )
    }

    for (const grv of corpus.grievances) {
        registerId(grv.id, grv.id, 'grievance')
        validateBpField(grv.intensityBp, grv.id, 'intensityBp', report.failures)
    }

    report.valid = report.failures.length === 0
    if (!report.valid) {
        cpy.status = 'FAILED'
        cpy.lastError = report.failures[0]?.message
    }

    if (bal.slv) {
        bal.slv({
            cmpBit: {
                idx: 'pass1-shape-eval',
                val: report.valid ? 0 : -1,
            },
            ...(report.valid
                ? {}
                : {
                      errBit: {
                          code: 'GATE_1_SYNTAX_BOUNDS',
                          message:
                              report.failures[0]?.message ??
                              'Pass 1 syntax bounds evaluation failed.',
                          failures: [...report.failures],
                      },
                  }),
        })
    }
    return cpy
}

export const pass2Traverse = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    cpy.status = 'PASS_2_TRAVERSING'
    const corpus = bal.dat?.corpus ?? EMPTY_CORPUS
    const report = ensureValidationReport(cpy, bal, corpus)

    const characterMap = new Map(
        corpus.characters.map((ch) => [ch.id, ch] as const),
    )
    const locationMap = new Map(
        corpus.locations.map((loc) => [loc.id, loc] as const),
    )
    const grievanceMap = new Map(
        corpus.grievances.map((grv) => [grv.id, grv] as const),
    )

    // 1. Possession foreign keys
    for (const pos of corpus.possessions) {
        if (!characterMap.has(pos.holderCharacterId)) {
            report.failures.push({
                gate: 'GATE_2_RELATIONAL_DAG',
                entityId: pos.id,
                field: 'holderCharacterId',
                message: `Possession "${pos.id}" references dangling holderCharacterId "${pos.holderCharacterId}".`,
            })
        }
    }

    // 2. Location reciprocal portal symmetry
    for (const loc of corpus.locations) {
        for (const targetLocId of loc.connectedLocationIds) {
            const targetLoc = locationMap.get(targetLocId)
            if (!targetLoc) {
                report.failures.push({
                    gate: 'GATE_2_RELATIONAL_DAG',
                    entityId: loc.id,
                    field: 'connectedLocationIds',
                    message: `Location "${loc.id}" connects to non-existent location "${targetLocId}".`,
                })
            } else if (!targetLoc.connectedLocationIds.includes(loc.id)) {
                report.failures.push({
                    gate: 'GATE_2_RELATIONAL_DAG',
                    entityId: loc.id,
                    field: 'connectedLocationIds',
                    message: `Asymmetric portal: location "${loc.id}" connects to "${targetLocId}" without reciprocal edge.`,
                })
            }
        }
    }

    // 3. Grievance character foreign keys & self-loop check
    for (const grv of corpus.grievances) {
        if (!characterMap.has(grv.sourceCharacterId)) {
            report.failures.push({
                gate: 'GATE_2_RELATIONAL_DAG',
                entityId: grv.id,
                field: 'sourceCharacterId',
                message: `Grievance "${grv.id}" references unknown sourceCharacterId "${grv.sourceCharacterId}".`,
            })
        }
        if (!characterMap.has(grv.targetCharacterId)) {
            report.failures.push({
                gate: 'GATE_2_RELATIONAL_DAG',
                entityId: grv.id,
                field: 'targetCharacterId',
                message: `Grievance "${grv.id}" references unknown targetCharacterId "${grv.targetCharacterId}".`,
            })
        }
        if (grv.sourceCharacterId === grv.targetCharacterId) {
            report.failures.push({
                gate: 'GATE_2_RELATIONAL_DAG',
                entityId: grv.id,
                field: 'targetCharacterId',
                message: `Grievance "${grv.id}" forms a self-referential loop on "${grv.sourceCharacterId}".`,
            })
        }
    }

    // 4. 3-color DFS (WHITE=0, GRAY=1, BLACK=2) on grievance dependency DAG
    const color = new Map<string, 0 | 1 | 2>()
    for (const grv of corpus.grievances) {
        color.set(grv.id, 0)
    }

    const dfsGrievance = (grvId: string, stack: string[]): void => {
        color.set(grvId, 1)
        const grv = grievanceMap.get(grvId)
        const deps = grv?.dependsOnGrievanceIds ?? []

        for (const depId of deps) {
            if (!grievanceMap.has(depId)) {
                report.failures.push({
                    gate: 'GATE_2_RELATIONAL_DAG',
                    entityId: grvId,
                    field: 'dependsOnGrievanceIds',
                    message: `Grievance "${grvId}" depends on unknown grievance "${depId}".`,
                })
                continue
            }
            const depState = color.get(depId) ?? 0
            if (depState === 1) {
                const cyclePath = [...stack, depId].join(' -> ')
                report.failures.push({
                    gate: 'GATE_2_RELATIONAL_DAG',
                    entityId: grvId,
                    field: 'dependsOnGrievanceIds',
                    message: `Cyclic grievance dependency detected: ${cyclePath}`,
                })
            } else if (depState === 0) {
                dfsGrievance(depId, [...stack, depId])
            }
        }

        color.set(grvId, 2)
    }

    for (const grv of corpus.grievances) {
        if ((color.get(grv.id) ?? 0) === 0) {
            dfsGrievance(grv.id, [grv.id])
        }
    }

    report.valid = report.failures.length === 0
    if (!report.valid) {
        cpy.status = 'FAILED'
        cpy.lastError = report.failures[0]?.message
    }

    if (bal.slv) {
        bal.slv({
            cmpBit: {
                idx: 'pass2-relational-sweep',
                val: report.valid ? 0 : -1,
            },
            ...(report.valid
                ? {}
                : {
                      errBit: {
                          code: 'GATE_2_RELATIONAL_DAG',
                          message:
                              report.failures[0]?.message ??
                              'Pass 2 relational DAG traversal failed.',
                          failures: [...report.failures],
                      },
                  }),
        })
    }
    return cpy
}

function computeCorpusMerkleSeal(corpus: CompileCorpusPayload): {
    readonly rootMerkleHash: string
    readonly entityHashes: Record<string, string>
} {
    const allEntities = [
        ...corpus.characters,
        ...corpus.locations,
        ...corpus.possessions,
        ...corpus.grievances,
    ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    const entityHashes: Record<string, string> = {}
    const leafLines: string[] = []

    for (const entity of allEntities) {
        const jcs = canonicalizeJcs(entity)
        const leafHash = sha256Hex(jcs)
        entityHashes[entity.id] = leafHash
        leafLines.push(`${entity.id}:${leafHash}`)
    }

    const rootMerkleHash = sha256Hex(leafLines.join('\n'))
    return { rootMerkleHash, entityHashes }
}

export const pass3Seal = (cpy: CompileModel, bal: CompileBit, ste?: State) => {
    void ste
    cpy.status = 'PASS_3_SEALING'
    const corpus = bal.dat?.corpus ?? EMPTY_CORPUS
    const report = ensureValidationReport(cpy, bal, corpus)

    const { rootMerkleHash, entityHashes } = computeCorpusMerkleSeal(corpus)
    const expectedHash = bal.dat?.expectedRootMerkleHash

    if (expectedHash && expectedHash !== rootMerkleHash) {
        report.failures.push({
            gate: 'GATE_3_SEAL_DRIFT',
            field: 'rootMerkleHash',
            message: `Merkle seal drift detected: expected "${expectedHash}", computed "${rootMerkleHash}".`,
        })
    }

    report.valid = report.failures.length === 0
    const seriesSlug =
        bal.dat?.seriesSlug ?? cpy.activeSeriesSlug ?? 'wiregrass-basin'
    const summary = buildCatalogSummary(corpus)

    if (report.valid) {
        cpy.status = 'SEALED'
        cpy.rootMerkleHash = rootMerkleHash
        cpy.lastSealedAt = bal.dat?.timestamp ?? DEFAULT_TIMESTAMP
        cpy.lastError = undefined
    } else {
        cpy.status = 'FAILED'
        cpy.lastError = report.failures[0]?.message
    }

    const resultPayload: CompileResultPayload = {
        seriesSlug,
        rootMerkleHash,
        entityHashes,
        canonicalPath: `compiled/${seriesSlug}/bible-state.json`,
        archivePath: `compiled/${seriesSlug}/archive/${rootMerkleHash.slice(0, 12)}.json`,
        catalogSummary: summary,
        executionDurationMs: 0,
        cleanExit: report.valid,
        validationReport: report,
        ...(report.valid
            ? {}
            : { errors: report.failures.map((f) => f.message) }),
    }

    if (bal.slv) {
        bal.slv({
            cmpBit: {
                idx: 'pass3-deterministic-seal',
                src: rootMerkleHash,
                val: report.valid ? 0 : -1,
            },
            resBit: resultPayload,
            ...(report.valid
                ? {}
                : {
                      errBit: {
                          code: report.failures[0]?.gate ?? 'GATE_3_SEAL_DRIFT',
                          message:
                              report.failures[0]?.message ??
                              'Pass 3 Merkle seal verification failed.',
                          failures: [...report.failures],
                      },
                  }),
        })
    }
    return cpy
}

function executeFullPipeline(
    cpy: CompileModel,
    bal: CompileBit,
    actionIdx: 'run-compile' | 'gate0-verify',
): CompileModel {
    cpy.validationReport = undefined
    cpy.lastError = undefined

    pass1Evaluate(cpy, { idx: 'pass1-shape-eval', dat: bal.dat })
    pass2Traverse(cpy, { idx: 'pass2-relational-sweep', dat: bal.dat })

    let capturedRes: Partial<CompileResultPayload> | undefined
    let capturedErr:
        | {
              code: string
              message: string
              failures?: CompileGateFailure[]
          }
        | undefined

    pass3Seal(cpy, {
        idx: 'pass3-deterministic-seal',
        dat: bal.dat,
        slv: (res) => {
            capturedRes = res.resBit
            capturedErr = res.errBit
        },
    })

    if (bal.slv) {
        bal.slv({
            cmpBit: {
                idx: actionIdx,
                src: cpy.rootMerkleHash,
                val: cpy.status === 'SEALED' ? 0 : -1,
            },
            ...(capturedRes ? { resBit: capturedRes } : {}),
            ...(capturedErr ? { errBit: capturedErr } : {}),
        })
    }
    return cpy
}

export const gate0Verify = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    return executeFullPipeline(cpy, bal, 'gate0-verify')
}

export const runCompile = (cpy: CompileModel, bal: CompileBit, ste?: State) => {
    void ste
    return executeFullPipeline(cpy, bal, 'run-compile')
}

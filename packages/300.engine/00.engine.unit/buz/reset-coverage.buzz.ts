/**
 * 00.engine.unit - Pure Zero-IO Reset Coverage Sentinel
 * Verifies that every BEE unit mounted in packages/300.engine/BEE.ts is registered
 * in ENGINE_RESET_MANIFEST and wired into the Tabula Rasa reset pipeline, and
 * validates disk write path coverage without importing node:fs.
 */

import type State from '../../99.core/state.js'
import type EngineBit from '../fce/engine.bit.js'
import { list as beeUnitList, reducer as beeReducerMap } from '../../BEE.js'
import {
    ENGINE_PURGEABLE_TARGETS,
    ENGINE_RESET_MANIFEST,
    validateEngineResetManifest,
} from '../val/reset-manifest.val.js'
import { ENGINE_COMPANION_RESET_ACTIONS } from './engine.buzz.js'

export interface ResetCoverageSourceEntry {
    readonly filePath: string
    readonly content: string
}

export interface DiskWriteCoverageReport {
    readonly valid: boolean
    readonly scannedFilesCount: number
    readonly detectedPaths: readonly string[]
    readonly violations: readonly string[]
}

export interface ResetCoverageAuditReport {
    readonly valid: boolean
    readonly mountedUnitCount: number
    readonly registeredUnitCount: number
    readonly statefulUnitCount: number
    readonly statelessUnitCount: number
    readonly unhookedUnits: readonly string[]
    readonly missingCompanionActions: readonly string[]
    readonly writePathReport: DiskWriteCoverageReport
    readonly receipts: readonly string[]
}

const KNOWN_DISALLOWED_WRITE_DIRS: readonly string[] = Object.freeze([
    'exports',
    'broadcast_logs',
    'tmp_output',
    'artifacts_out',
    'scenes_out',
    'series_out',
])

async function emitCoverageTelemetry(
    ste: State | undefined,
    lines: readonly string[],
): Promise<void> {
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    for (const line of lines) {
        if (lib && typeof lib.hunt === 'function') {
            await lib
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: line,
                })
                .catch(() => {})
        } else if (ste && typeof ste.hunt === 'function') {
            await ste
                .hunt('[Console action] Update Console', {
                    idx: 'cns00',
                    src: line,
                })
                .catch(() => {})
        }
    }
}

/**
 * Pure zero-IO static scanner that inspects source text entries for filesystem
 * write calls and asserts that target directories map to ENGINE_PURGEABLE_TARGETS.
 */
export function auditDiskWritePathsCoverage(
    sourceFiles: readonly ResetCoverageSourceEntry[] = [],
): DiskWriteCoverageReport {
    const allowedRoots = new Set(
        ENGINE_PURGEABLE_TARGETS.map(
            (t) => t.relativePath.replace(/\\/g, '/').split('/')[0],
        ),
    )
    const detectedPaths: string[] = []
    const violations: string[] = []

    const writeCallRegex =
        /\b(?:writeFileSync|mkdirSync|rmSync|unlinkSync|outputFile)\s*\(([^)]+)\)/g
    const stringLiteralRegex = /['"]([a-zA-Z0-9_./-]+)['"]/g

    for (const entry of sourceFiles) {
        let callMatch: RegExpExecArray | null
        while ((callMatch = writeCallRegex.exec(entry.content)) !== null) {
            const argExpr = callMatch[1] || ''
            let litMatch: RegExpExecArray | null
            while ((litMatch = stringLiteralRegex.exec(argExpr)) !== null) {
                const candidate = litMatch[1].replace(/\\/g, '/')
                if (!candidate || candidate.startsWith('.')) {
                    continue
                }
                const topDir = candidate.split('/')[0]
                if (!detectedPaths.includes(candidate)) {
                    detectedPaths.push(candidate)
                }
                if (
                    KNOWN_DISALLOWED_WRITE_DIRS.includes(topDir) ||
                    (candidate.includes('/') &&
                        !allowedRoots.has(topDir) &&
                        topDir !== 'data')
                ) {
                    violations.push(
                        `[BREACH] Unmanifested disk write path '${candidate}' in ${entry.filePath}`,
                    )
                }
            }
        }
    }

    return {
        valid: violations.length === 0,
        scannedFilesCount: sourceFiles.length,
        detectedPaths,
        violations,
    }
}

/**
 * Pure zero-IO reset coverage auditor comparing BEE.ts unit slices and constructors
 * against ENGINE_RESET_MANIFEST and ENGINE_COMPANION_RESET_ACTIONS.
 */
export function evaluateResetCoveragePure(
    sourceFiles: readonly ResetCoverageSourceEntry[] = [],
): ResetCoverageAuditReport {
    const manifestValidation = validateEngineResetManifest(
        ENGINE_RESET_MANIFEST,
    )
    const unhookedUnits: string[] = [...manifestValidation.errors]
    const missingCompanionActions: string[] = []

    const reducerSlices = Object.keys(beeReducerMap || {})
    const mountedCount = Array.isArray(beeUnitList) ? beeUnitList.length : 0

    const registeredBySlice = new Map(
        ENGINE_RESET_MANIFEST.unitRegistry.map((u) => [u.sliceKey, u]),
    )

    for (const sliceKey of reducerSlices) {
        const spec = registeredBySlice.get(sliceKey)
        if (!spec) {
            unhookedUnits.push(
                `BEE reducer slice '${sliceKey}' missing from ENGINE_RESET_MANIFEST`,
            )
            continue
        }
        if (
            spec.classification === 'STATEFUL_RESETTABLE' &&
            spec.unitFolder !== '00.engine.unit' &&
            spec.unitFolder !== '98.menu.unit'
        ) {
            if (
                !spec.resetActionType ||
                !ENGINE_COMPANION_RESET_ACTIONS.includes(spec.resetActionType)
            ) {
                missingCompanionActions.push(
                    `${spec.unitFolder} (${spec.resetActionType || 'UNDECLARED'})`,
                )
            }
        }
    }

    if (mountedCount !== ENGINE_RESET_MANIFEST.unitRegistry.length) {
        unhookedUnits.push(
            `BEE.list unit count (${mountedCount}) != ENGINE_RESET_MANIFEST count (${ENGINE_RESET_MANIFEST.unitRegistry.length})`,
        )
    }

    const writePathReport = auditDiskWritePathsCoverage(sourceFiles)

    const statefulUnitCount = ENGINE_RESET_MANIFEST.unitRegistry.filter(
        (u) => u.classification === 'STATEFUL_RESETTABLE',
    ).length
    const statelessUnitCount = ENGINE_RESET_MANIFEST.unitRegistry.filter(
        (u) => u.classification === 'STATELESS_PURE',
    ).length

    const valid =
        unhookedUnits.length === 0 &&
        missingCompanionActions.length === 0 &&
        writePathReport.valid

    const receipts: string[] = [
        '>> ============================================================',
        '>> [SENTINEL:RESET_COVERAGE] TABULA RASA COVERAGE AUDIT',
        `>> BEE Units Mounted : ${mountedCount} | Manifest Registered: ${ENGINE_RESET_MANIFEST.unitRegistry.length}`,
        `>> Stateful Units    : ${statefulUnitCount} | Stateless Pure: ${statelessUnitCount}`,
        `>> Write Path Scan   : ${writePathReport.scannedFilesCount} file(s) | Violations: ${writePathReport.violations.length}`,
    ]

    for (const unit of ENGINE_RESET_MANIFEST.unitRegistry) {
        const tag =
            unit.classification === 'STATEFUL_RESETTABLE'
                ? unit.resetActionType || 'MISSING'
                : 'STATELESS_PURE'
        receipts.push(`>>   [PASS] ${unit.unitFolder.padEnd(20)} -> ${tag}`)
    }

    for (const err of unhookedUnits) {
        receipts.push(`::   [BREACH] ${err}`)
    }
    for (const miss of missingCompanionActions) {
        receipts.push(`::   [BREACH] Missing companion fan-out: ${miss}`)
    }
    for (const violation of writePathReport.violations) {
        receipts.push(`::   ${violation}`)
    }

    receipts.push(
        `>> [SENTINEL:VERDICT] ${valid ? '[PASS] 100% TABULA RASA RESET COVERAGE VERIFIED' : '[FAIL] RESET COVERAGE DRIFT DETECTED'}`,
    )
    receipts.push(
        '>> ============================================================',
    )

    return {
        valid,
        mountedUnitCount: mountedCount,
        registeredUnitCount: ENGINE_RESET_MANIFEST.unitRegistry.length,
        statefulUnitCount,
        statelessUnitCount,
        unhookedUnits,
        missingCompanionActions,
        writePathReport,
        receipts,
    }
}

export const auditResetCoverage = async (
    cpy: any,
    bal?: EngineBit,
    ste?: State,
): Promise<any> => {
    const sourceFiles: ResetCoverageSourceEntry[] = Array.isArray(
        (bal?.dat as any)?.sourceFiles,
    )
        ? (bal?.dat as any).sourceFiles
        : []

    const report = evaluateResetCoveragePure(sourceFiles)
    await emitCoverageTelemetry(ste, report.receipts)

    if (bal?.slv) {
        bal.slv({
            engBit: {
                idx: report.valid
                    ? 'audit-reset-coverage-pass'
                    : 'audit-reset-coverage-fail',
                val: report.valid ? 0 : -1,
                src: report.valid ? 'PASS' : 'BREACH',
                dat: report as any,
                lst: [...report.receipts],
            },
        })
    }

    return cpy
}

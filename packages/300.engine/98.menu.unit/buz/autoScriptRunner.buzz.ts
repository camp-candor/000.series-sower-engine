import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
} from '../../00.engine.unit/buz/engine.buzz.js'
import { synthesizeEventFountainScreenplay } from '../../21.compile.unit/buz/eventFountainSynth.buzz.js'

export interface AutoScriptRunParams {
    readonly seriesSlug: string
    readonly outputDir?: string
    readonly startDate?: string
    readonly startTime?: string
    readonly tickSeconds?: number
    readonly totalTicks?: number
    readonly masterSeed?: string
    readonly maxScripts?: number
    readonly bibleState?: Record<string, unknown>
    readonly cleanOutputDir?: boolean
    readonly repoRoot?: string
}

export interface AutoScriptStackEntry {
    readonly sequence: number
    readonly tick: number
    readonly isoDate: string
    readonly startTimeHm: string
    readonly daypart: string
    readonly category: string
    readonly fountainFile: string
    readonly astFile: string
    readonly contentSha256: string
    readonly byteLength: number
}

export interface AutoScriptRunReceipt {
    readonly seriesSlug: string
    readonly outputDir: string
    readonly totalTicks: number
    readonly stackedCount: number
    readonly entries: readonly AutoScriptStackEntry[]
    readonly indexPath: string
}

function resolveRepoRoot(startDir: string): string {
    let curr = path.resolve(startDir)
    while (true) {
        try {
            const pkgPath = path.join(curr, 'package.json')
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
                    workspaces?: unknown
                }
                if (Array.isArray(pkg.workspaces)) return curr
            }
        } catch {
            // continue walking
        }
        const parent = path.dirname(curr)
        if (parent === curr) return path.resolve(startDir)
        curr = parent
    }
}

function sanitizeSlug(value: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('[INVALID_SERIES_SLUG] seriesSlug must be non-empty.')
    }
    const trimmed = value.trim()
    if (
        trimmed.includes('..') ||
        trimmed.includes('/') ||
        trimmed.includes('\\')
    ) {
        throw new Error(
            '[UNSAFE_AUTO_SCRIPT_OUTPUT_DIR] seriesSlug traversal rejected.',
        )
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed)) {
        throw new Error(
            '[INVALID_SERIES_SLUG] seriesSlug contains illegal characters.',
        )
    }
    return trimmed
}

function resolveOutputDir(params: AutoScriptRunParams): string {
    const slug = sanitizeSlug(params.seriesSlug)
    if (params.outputDir != null) {
        const repoRoot = params.repoRoot
            ? path.resolve(params.repoRoot)
            : resolveRepoRoot(process.cwd())
        const resolved = path.resolve(repoRoot, params.outputDir)
        const relative = path.relative(repoRoot, resolved)
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(
                '[UNSAFE_AUTO_SCRIPT_OUTPUT_DIR] outputDir escapes repo root.',
            )
        }
        if (relative.split(path.sep).includes('..')) {
            throw new Error(
                '[UNSAFE_AUTO_SCRIPT_OUTPUT_DIR] outputDir traversal rejected.',
            )
        }
        return resolved
    }
    const repoRoot = params.repoRoot
        ? path.resolve(params.repoRoot)
        : resolveRepoRoot(process.cwd())
    return path.join(repoRoot, 'drafts', 'auto-script', slug)
}

async function emitCns00(ste: unknown, src: string): Promise<void> {
    const lib =
        (globalThis as unknown as { LIBRARY?: { hunt?: unknown } }).LIBRARY ??
        (typeof global !== 'undefined'
            ? (global as unknown as { LIBRARY?: { hunt?: unknown } }).LIBRARY
            : undefined)
    if (lib != null && typeof (lib as { hunt?: unknown }).hunt === 'function') {
        try {
            await (
                lib as { hunt: (t: string, b: unknown) => Promise<unknown> }
            ).hunt('[Console action] Update Console', { idx: 'cns00', src })
            return
        } catch {
            // fall through
        }
    }
    const hunter = (
        ste as
            | { hunt?: (t: string, b: unknown) => Promise<unknown> }
            | undefined
    )?.hunt
    if (typeof hunter === 'function') {
        try {
            await hunter.call(ste, '[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // headless fallback: swallow telemetry faults
        }
    }
}

function loadBibleState(
    params: AutoScriptRunParams,
): Record<string, unknown> | undefined {
    if (params.bibleState != null)
        return params.bibleState as Record<string, unknown>
    const roots: string[] = []
    try {
        roots.push(resolveRepoRoot(process.cwd()))
    } catch {
        // ignore
    }
    if (params.repoRoot) roots.push(path.resolve(params.repoRoot))
    const slug = params.seriesSlug
    const candidates: string[] = []
    for (const root of roots) {
        candidates.push(path.join(root, 'compiled', slug, 'bible-state.json'))
        candidates.push(path.join(root, 'data', 'canon', 'bible-state.json'))
    }
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return JSON.parse(fs.readFileSync(candidate, 'utf8')) as Record<
                    string,
                    unknown
                >
            }
        } catch {
            // next candidate
        }
    }
    return undefined
}

function pad4(value: number): string {
    return String(value).padStart(4, '0')
}

export const runUnattendedAutoScriptSimulation = async (
    params: AutoScriptRunParams,
    ste?: unknown,
): Promise<AutoScriptRunReceipt> => {
    const slug = sanitizeSlug(params.seriesSlug)
    const outputDir = resolveOutputDir({ ...params, seriesSlug: slug })
    const totalTicks = params.totalTicks ?? 24
    if (
        !Number.isInteger(totalTicks) ||
        totalTicks <= 0 ||
        totalTicks > 10000
    ) {
        throw new Error(
            `[OUT_OF_BOUNDS] totalTicks must be integer in [1, 10000]: ${String(totalTicks)}`,
        )
    }
    const masterSeed = params.masterSeed ?? `auto_${slug}_seed01`
    const maxScripts = params.maxScripts ?? 64
    if (!Number.isInteger(maxScripts) || maxScripts < 0) {
        throw new Error(
            `[OUT_OF_BOUNDS] maxScripts must be non-negative integer: ${String(maxScripts)}`,
        )
    }
    const cleanOutput = params.cleanOutputDir ?? true
    const tickSeconds = params.tickSeconds ?? 60

    const bibleState = loadBibleState(params)
    const chronologyInput = bibleState?.['chronology'] as
        | {
              start_date?: string
              start_time?: string
              tick_seconds?: number
              frames_per_second?: number
          }
        | undefined
    const startDate =
        params.startDate ?? chronologyInput?.start_date ?? '2026-10-31'
    const startTime =
        params.startTime ?? chronologyInput?.start_time ?? '21:00:00'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Malformed start_date: ${startDate}`,
        )
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Malformed start_time: ${startTime}`,
        )
    }
    const clock = normalizeLoreChronology({
        start_date: startDate,
        start_time: startTime,
        tick_seconds: tickSeconds,
        frames_per_second: chronologyInput?.frames_per_second ?? 24,
    })

    if (cleanOutput && fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true })
    }
    fs.mkdirSync(outputDir, { recursive: true })

    await emitCns00(
        ste,
        `>> [AUTO:START] series=${slug} ticks=${totalTicks} seed=${masterSeed}`,
    )

    let simState = createInitialAutonomousSimState(masterSeed, clock)
    const entries: AutoScriptStackEntry[] = []
    let stacked = 0
    for (let tick = 1; tick <= totalTicks; tick += 1) {
        const receipt = stepAutonomousSimulationTick(simState)
        simState = receipt.nextState
        const nextClock = receipt.nextState.clock
        await emitCns00(
            ste,
            `>> [AUTO:TIMECODE] ${nextClock.isoDate} ${nextClock.clockTimeHms} | TC ${nextClock.timecodeSmpte} | DAYPART: ${nextClock.daypart} | TICK ${tick}/${totalTicks}`,
        )
        await emitCns00(
            ste,
            `>> [AUTO:TICK] tick=${tick} events=${receipt.significantEvents.length}`,
        )
        for (const evt of receipt.significantEvents) {
            if (stacked >= maxScripts) break
            await emitCns00(
                ste,
                `>> [AUTO:EVENT] #${evt.eventSequence} ${evt.category} tick=${evt.tick}`,
            )
            const prevClock = tick > 1 ? receipt.nextState.clock : clock
            void prevClock
            const screenplay = synthesizeEventFountainScreenplay({
                seriesSlug: slug,
                displayName: slug,
                masterSeed,
                significantEvent: {
                    eventSequence: evt.eventSequence,
                    tick: evt.tick,
                    clockSnapshot: evt.clockSnapshot,
                    category: evt.category,
                    severityBps: evt.severityBps,
                    triggerReason: evt.triggerReason,
                    actorsInvolved: evt.actorsInvolved,
                    locationId: evt.locationId,
                    stateDeltaSummary: evt.stateDeltaSummary,
                    causalHash: evt.causalHash,
                },
                clockBefore: {
                    isoDate: evt.clockSnapshot.isoDate,
                    clockTimeHm: evt.clockSnapshot.clockTimeHm,
                    clockTimeHms: evt.clockSnapshot.clockTimeHms,
                    timecodeSmpte: evt.clockSnapshot.timecodeSmpte,
                    daypart: evt.clockSnapshot.daypart,
                },
                clockAfter: {
                    isoDate: evt.clockSnapshot.isoDate,
                    clockTimeHm: evt.clockSnapshot.clockTimeHm,
                    clockTimeHms: evt.clockSnapshot.clockTimeHms,
                    timecodeSmpte: evt.clockSnapshot.timecodeSmpte,
                    daypart: evt.clockSnapshot.daypart,
                    tickSeconds,
                },
            })
            const dateCompact = evt.clockSnapshot.isoDate.replace(/-/g, '')
            const hmCompact = evt.clockSnapshot.clockTimeHm.replace(/:/g, '')
            const base = `${pad4(evt.eventSequence)}_t${pad4(evt.tick)}_${dateCompact}-${hmCompact}_${evt.category}`
            const fountainFile = `${base}.fountain`
            const astFile = `${base}.ast.json`
            const fountainPath = path.join(outputDir, fountainFile)
            const astPath = path.join(outputDir, astFile)
            const normalizedFountain = screenplay.fountainText.replace(
                /\r\n/g,
                '\n',
            )
            fs.writeFileSync(fountainPath, normalizedFountain, 'utf8')
            const astPayload = {
                seriesSlug: slug,
                eventSequence: evt.eventSequence,
                tick: evt.tick,
                category: evt.category,
                isoDate: evt.clockSnapshot.isoDate,
                startTimeHm: evt.clockSnapshot.clockTimeHm,
                daypart: evt.clockSnapshot.daypart,
                contentSha256: screenplay.contentSha256,
                sceneSummaryAst: screenplay.sceneSummaryAst,
                chronology: {
                    isoDate: evt.clockSnapshot.isoDate,
                    clockTimeHm: evt.clockSnapshot.clockTimeHm,
                    daypart: evt.clockSnapshot.daypart,
                },
            }
            fs.writeFileSync(
                astPath,
                `${JSON.stringify(astPayload, null, 2)}\n`,
                'utf8',
            )
            stacked += 1
            entries.push({
                sequence: evt.eventSequence,
                tick: evt.tick,
                isoDate: evt.clockSnapshot.isoDate,
                startTimeHm: evt.clockSnapshot.clockTimeHm,
                daypart: evt.clockSnapshot.daypart,
                category: evt.category,
                fountainFile,
                astFile,
                contentSha256: screenplay.contentSha256,
                byteLength: Buffer.byteLength(normalizedFountain, 'utf8'),
            })
            await emitCns00(
                ste,
                `>> [AUTO:STACKED] #${pad4(evt.eventSequence)} -> ${fountainFile} (${normalizedFountain.length} bytes)`,
            )
        }
        if (stacked >= maxScripts) break
    }

    const sorted = [...entries].sort((a, b) =>
        a.fountainFile < b.fountainFile
            ? -1
            : a.fountainFile > b.fountainFile
              ? 1
              : 0,
    )
    const indexPayload = {
        seriesSlug: slug,
        masterSeed,
        startDate,
        startTime,
        tickSeconds,
        totalTicks,
        stackedCount: sorted.length,
        entries: sorted,
    }
    const indexPath = path.join(outputDir, 'index.json')
    fs.writeFileSync(
        indexPath,
        `${JSON.stringify(indexPayload, null, 2)}\n`,
        'utf8',
    )
    await emitCns00(
        ste,
        `>> [AUTO:DONE] stacked=${sorted.length} dir=${outputDir}`,
    )
    return {
        seriesSlug: slug,
        outputDir,
        totalTicks,
        stackedCount: sorted.length,
        entries: Object.freeze(sorted),
        indexPath,
    }
}

export const computeAutoScriptStackManifest = (
    outputDir: string,
): {
    files: Array<{ fileName: string; byteLength: number; sha256: string }>
    stackDigestSha256: string
} => {
    const resolved = path.resolve(outputDir)
    if (!fs.existsSync(resolved)) {
        return {
            files: [],
            stackDigestSha256: createHash('sha256')
                .update('', 'utf8')
                .digest('hex'),
        }
    }
    const names = fs
        .readdirSync(resolved)
        .filter(
            (n) =>
                n.endsWith('.fountain') ||
                n.endsWith('.ast.json') ||
                n === 'index.json',
        )
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const files = names.map((fileName) => {
        const full = path.join(resolved, fileName)
        const buf = fs.readFileSync(full)
        return {
            fileName,
            byteLength: buf.length,
            sha256: createHash('sha256').update(buf).digest('hex'),
        }
    })
    const stackDigestSha256 = createHash('sha256')
        .update(
            files
                .map((f) => `${f.fileName}:${f.sha256}:${f.byteLength}`)
                .join('\n'),
            'utf8',
        )
        .digest('hex')
    return { files, stackDigestSha256 }
}

export const verifyAutoScriptReplayDeterminism = async (
    params: AutoScriptRunParams,
    ste?: unknown,
): Promise<{
    deterministic: boolean
    fileCount: number
    mismatchedFiles: string[]
    stackDigestSha256: string
}> => {
    const first = await runUnattendedAutoScriptSimulation(params, ste)
    const firstManifest = computeAutoScriptStackManifest(first.outputDir)
    try {
        fs.rmSync(first.outputDir, { recursive: true, force: true })
    } catch {
        // best effort wipe
    }
    const second = await runUnattendedAutoScriptSimulation(params, ste)
    const secondManifest = computeAutoScriptStackManifest(second.outputDir)
    const mismatchedFiles: string[] = []
    const firstMap = new Map(firstManifest.files.map((f) => [f.fileName, f]))
    const secondMap = new Map(secondManifest.files.map((f) => [f.fileName, f]))
    const allNames = new Set<string>([...firstMap.keys(), ...secondMap.keys()])
    for (const name of allNames) {
        const a = firstMap.get(name)
        const b = secondMap.get(name)
        if (
            a == null ||
            b == null ||
            a.sha256 !== b.sha256 ||
            a.byteLength !== b.byteLength
        ) {
            mismatchedFiles.push(name)
        }
    }
    if (firstManifest.stackDigestSha256 !== secondManifest.stackDigestSha256) {
        if (mismatchedFiles.length === 0) {
            mismatchedFiles.push('STACK_DIGEST_MISMATCH')
        }
    }
    const deterministic = mismatchedFiles.length === 0
    await emitCns00(
        ste,
        `>> [REPLAY:DETERMINISTIC] Files=${secondManifest.files.length} | StackSHA256=${secondManifest.stackDigestSha256.slice(0, 12)} | Mismatches=${mismatchedFiles.length}`,
    )
    return {
        deterministic,
        fileCount: secondManifest.files.length,
        mismatchedFiles,
        stackDigestSha256: secondManifest.stackDigestSha256,
    }
}

export const exportAutoScriptBatchToConductor = async (
    params: AutoScriptRunParams & {
        conductorIngressDir?: string
        conductorRoot?: string
    },
    ste?: unknown,
): Promise<{
    copiedCount: number
    destinationDir: string
    verified: boolean
}> => {
    const outputDir = resolveOutputDir(params)
    const slug = sanitizeSlug(params.seriesSlug)
    const destinationDir =
        params.conductorIngressDir != null
            ? path.resolve(params.conductorIngressDir)
            : params.conductorRoot != null
              ? path.join(
                    path.resolve(params.conductorRoot),
                    'data',
                    'ingress',
                    slug,
                    'auto-script',
                )
              : path.join(
                    resolveRepoRoot(process.cwd()),
                    '..',
                    '000.series-sower-conductor',
                    'data',
                    'ingress',
                    slug,
                    'auto-script',
                )
    fs.mkdirSync(destinationDir, { recursive: true })
    const manifest = computeAutoScriptStackManifest(outputDir)
    let copiedCount = 0
    for (const file of manifest.files) {
        const src = path.join(outputDir, file.fileName)
        const dest = path.join(destinationDir, file.fileName)
        fs.copyFileSync(src, dest)
        const destBuf = fs.readFileSync(dest)
        const destHash = createHash('sha256').update(destBuf).digest('hex')
        if (destHash !== file.sha256) {
            throw new Error(
                `[EXPORT_PARITY_FAIL] Hash mismatch for ${file.fileName}`,
            )
        }
        copiedCount += 1
    }
    await emitCns00(
        ste,
        `>> [EXPORT:BATCH] Exported ${copiedCount} artifacts to Conductor ingress`,
    )
    return { copiedCount, destinationDir, verified: true }
}

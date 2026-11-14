import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'
import type { ScheduledStoryBeat } from '../../17.tick.unit/fce/tick.interface.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
    extractScheduledBeatsFromBible,
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
    readonly minTicksBetweenScenes?: number
    readonly maxDrySpellTicks?: number
    readonly actWindowMode?: string
    readonly actIMultiplierBps?: number
    readonly actIIMultiplierBps?: number
    readonly actIIIMultiplierBps?: number
    readonly scheduledBeats?: readonly ScheduledStoryBeat[]
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

    const pacingOverrides: Record<string, unknown> = {}
    if (params.minTicksBetweenScenes !== undefined) {
        pacingOverrides['min_ticks_between_scenes'] =
            params.minTicksBetweenScenes
    }
    if (params.maxDrySpellTicks !== undefined) {
        pacingOverrides['max_dry_spell_ticks'] = params.maxDrySpellTicks
    }
    if (params.actWindowMode !== undefined) {
        pacingOverrides['act_window_mode'] = params.actWindowMode
    }
    if (params.actIMultiplierBps !== undefined) {
        pacingOverrides['act_i_multiplier_bps'] = params.actIMultiplierBps
    }
    if (params.actIIMultiplierBps !== undefined) {
        pacingOverrides['act_ii_multiplier_bps'] = params.actIIMultiplierBps
    }
    if (params.actIIIMultiplierBps !== undefined) {
        pacingOverrides['act_iii_multiplier_bps'] = params.actIIIMultiplierBps
    }
    let simState = createInitialAutonomousSimState(masterSeed, clock)
    const scheduledFromParams = Array.isArray(params.scheduledBeats)
        ? (params.scheduledBeats as readonly ScheduledStoryBeat[])
        : undefined
    let scheduledBeats: readonly ScheduledStoryBeat[] = Object.freeze([])
    try {
        if (scheduledFromParams !== undefined) {
            scheduledBeats = Object.freeze([...scheduledFromParams])
        } else {
            scheduledBeats = extractScheduledBeatsFromBible(bibleState)
        }
    } catch {
        scheduledBeats = Object.freeze([])
    }
    if (scheduledBeats.length > 0) {
        simState = Object.freeze({
            ...simState,
            scheduledBeats,
            consumedAgendaKeys: Object.freeze([]),
            droughtBreakersHeldByReserve: 0,
            triggeredAgendaBeats: Object.freeze([]),
        })
    }
    if (Object.keys(pacingOverrides).length > 0) {
        const basePolicy = simState.pacingPolicy
        if (basePolicy != null) {
            simState = Object.freeze({
                ...simState,
                pacingPolicy: Object.freeze({
                    ...basePolicy,
                    ...pacingOverrides,
                }),
            })
        }
    }
    const entries: AutoScriptStackEntry[] = []
    let stacked = 0
    const actCounts = { ACT_I: 0, ACT_II: 0, ACT_III: 0 }
    let maxDrySpellObservedTicks = 0
    let lastSceneTickSeen: number | null = null
    const sceneSpacingTicks: number[] = []
    let prevAct: string | null = null
    let prevCooldownSuppressions = 0
    let prevReserveHeld = 0
    for (let tick = 1; tick <= totalTicks; tick += 1) {
        const receipt = stepAutonomousSimulationTick(simState)
        simState = receipt.nextState
        const nextClock = receipt.nextState.clock
        const policy = simState.pacingPolicy
        await emitCns00(
            ste,
            `>> [AUTO:TIMECODE] ${nextClock.isoDate} ${nextClock.clockTimeHms} | TC ${nextClock.timecodeSmpte} | DAYPART: ${nextClock.daypart} | TICK ${tick}/${totalTicks}`,
        )
        await emitCns00(
            ste,
            `>> [AUTO:TICK] tick=${tick} events=${receipt.significantEvents.length}`,
        )
        const currentReserveHeld = simState.droughtBreakersHeldByReserve ?? 0
        if (currentReserveHeld > prevReserveHeld) {
            const pendingId =
                scheduledBeats.find(
                    (b) =>
                        !(simState.consumedAgendaKeys ?? []).includes(
                            `${b.beat_id}@${nextClock.isoDate}`,
                        ) &&
                        !(simState.consumedAgendaKeys ?? []).includes(
                            `${b.beat_id}@${b.isoDate}`,
                        ),
                )?.beat_id ?? 'agenda_beat'
            await emitCns00(
                ste,
                `>> [AGENDA:RESERVE] Holding drought filler (${currentReserveHeld - prevReserveHeld}t to ${pendingId})`,
            )
        }
        prevReserveHeld = currentReserveHeld
        const currentSuppressions = simState.cooldownSuppressions ?? 0
        if (currentSuppressions > prevCooldownSuppressions) {
            await emitCns00(
                ste,
                `>> [PACING:COOLDOWN] Suppressed ${currentSuppressions - prevCooldownSuppressions} sub-critical scene(s) at tick ${tick} window=${policy?.min_ticks_between_scenes ?? 3}t`,
            )
        }
        prevCooldownSuppressions = currentSuppressions
        const currentAct = simState.currentAct ?? 'ACT_I'
        if (prevAct == null || prevAct !== currentAct) {
            await emitCns00(
                ste,
                `>> [PACING:ACT] Transitioned to ${currentAct} at ${nextClock.isoDate} ${nextClock.clockTimeHms}`,
            )
            prevAct = currentAct
        }
        for (const evt of receipt.significantEvents) {
            if (stacked >= maxScripts) break
            await emitCns00(
                ste,
                `>> [AUTO:EVENT] #${evt.eventSequence} ${evt.category} tick=${evt.tick}`,
            )
            const paced = evt as unknown as {
                actStage?: 'ACT_I' | 'ACT_II' | 'ACT_III'
                actMultiplierBps?: number
                diurnalWeightBps?: number
                droughtBreaker?: boolean
                ticksSinceLastScene?: number
            }
            const evtAct = paced.actStage ?? currentAct ?? 'ACT_I'
            if (
                evtAct === 'ACT_I' ||
                evtAct === 'ACT_II' ||
                evtAct === 'ACT_III'
            ) {
                actCounts[evtAct] += 1
            }
            const droughtTicks = paced.ticksSinceLastScene ?? 0
            if (droughtTicks > maxDrySpellObservedTicks) {
                maxDrySpellObservedTicks = droughtTicks
            }
            if (lastSceneTickSeen != null) {
                sceneSpacingTicks.push(evt.tick - lastSceneTickSeen)
            }
            lastSceneTickSeen = evt.tick
            if (paced.droughtBreaker === true) {
                await emitCns00(
                    ste,
                    `>> [PACING:DROUGHT_BREAK] Recovered quiet stretch (${droughtTicks}t) at ${nextClock.clockTimeHms}`,
                )
            }
            const prevClock = tick > 1 ? receipt.nextState.clock : clock
            void prevClock
            const agendaEvt = evt as unknown as {
                agendaScheduled?: boolean
                agendaBeatId?: string
                agendaTitle?: string
                scheduledIsoDate?: string
                scheduledTimeHm?: string
                scheduledTimestamp?: string
                reserveHeldTicks?: number
            }
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
                    agendaScheduled: agendaEvt.agendaScheduled,
                    agendaBeatId: agendaEvt.agendaBeatId,
                    agendaTitle: agendaEvt.agendaTitle,
                    scheduledIsoDate: agendaEvt.scheduledIsoDate,
                    scheduledTimeHm: agendaEvt.scheduledTimeHm,
                    scheduledTimestamp: agendaEvt.scheduledTimestamp,
                    reserveHeldTicks: agendaEvt.reserveHeldTicks,
                },
                pacing: {
                    actStage: evtAct,
                    actMultiplierBps: paced.actMultiplierBps ?? 10000,
                    diurnalWeightBps: paced.diurnalWeightBps ?? 10000,
                    droughtTicks,
                    droughtBreaker: paced.droughtBreaker ?? false,
                    cooldownWindowTicks: policy?.min_ticks_between_scenes ?? 3,
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
            const pacedAst = evt as unknown as {
                actStage?: string
                actMultiplierBps?: number
                diurnalWeightBps?: number
                droughtBreaker?: boolean
                ticksSinceLastScene?: number
                agendaScheduled?: boolean
                agendaBeatId?: string
                agendaTitle?: string
                scheduledIsoDate?: string
                scheduledTimeHm?: string
                scheduledTimestamp?: string
                reserveHeldTicks?: number
            }
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
                    agenda:
                        pacedAst.agendaScheduled === true
                            ? {
                                  agendaBeatId: pacedAst.agendaBeatId,
                                  agendaTitle: pacedAst.agendaTitle,
                                  scheduledIsoDate: pacedAst.scheduledIsoDate,
                                  scheduledTimeHm: pacedAst.scheduledTimeHm,
                                  scheduledTimestamp:
                                      pacedAst.scheduledTimestamp,
                                  reserveHeldTicks:
                                      pacedAst.reserveHeldTicks ?? 0,
                              }
                            : undefined,
                    pacing: {
                        actStage: pacedAst.actStage ?? 'ACT_I',
                        actMultiplierBps: pacedAst.actMultiplierBps ?? 10000,
                        diurnalWeightBps: pacedAst.diurnalWeightBps ?? 10000,
                        droughtTicks: pacedAst.ticksSinceLastScene ?? 0,
                        droughtBreaker: pacedAst.droughtBreaker ?? false,
                    },
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
            if (agendaEvt.agendaScheduled === true) {
                await emitCns00(
                    ste,
                    `>> [AGENDA:TRIGGERED] ${agendaEvt.agendaBeatId ?? 'agenda_beat'} @ ${agendaEvt.scheduledIsoDate ?? evt.clockSnapshot.isoDate} ${agendaEvt.scheduledTimeHm ?? evt.clockSnapshot.clockTimeHm} -> ${fountainFile}`,
                )
            }
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
    const finalPolicy = simState.pacingPolicy
    const pacingSummary = {
        actWindowMode: finalPolicy?.act_window_mode ?? 'MULTI_DAY_ARC',
        minTicksBetweenScenes: finalPolicy?.min_ticks_between_scenes ?? 3,
        maxDrySpellTicks: finalPolicy?.max_dry_spell_ticks ?? 8,
        actCounts: { ...actCounts },
        maxDrySpellObservedTicks,
        cooldownSuppressionsCount: simState.cooldownSuppressions ?? 0,
        droughtBreakersCount: simState.droughtBreakersCount ?? 0,
        sceneSpacingTicks: [...sceneSpacingTicks],
    }
    const triggeredBeatIds: readonly string[] = Object.freeze([
        ...((simState.triggeredAgendaBeats ?? []) as readonly string[]),
    ])
    const triggeredOccurrences: readonly string[] = Object.freeze([
        ...((simState.consumedAgendaKeys ?? []) as readonly string[]),
    ])
    const agendaSummary = Object.freeze({
        configuredCount: scheduledBeats.length,
        triggeredCount: triggeredBeatIds.length,
        triggeredBeatIds,
        triggeredOccurrences,
        droughtBreakersHeldByReserve:
            simState.droughtBreakersHeldByReserve ?? 0,
    })
    const indexPayload = {
        seriesSlug: slug,
        masterSeed,
        startDate,
        startTime,
        tickSeconds,
        totalTicks,
        stackedCount: sorted.length,
        entries: sorted,
        pacingSummary,
        agendaSummary,
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

export interface ChronoAgendaReplayReceipt {
    readonly deterministic: boolean
    readonly fileCount: number
    readonly mismatchedFiles: readonly string[]
    readonly stackDigestSha256: string
    readonly triggeredCount: number
    readonly triggeredBeatIds: readonly string[]
    readonly droughtBreakersHeldByReserve: number
    readonly replayMismatches: number
}

export const verifyChronoAgendaReplayDeterminism = async (
    params: AutoScriptRunParams,
    ste?: unknown,
): Promise<ChronoAgendaReplayReceipt> => {
    const replay = await verifyAutoScriptReplayDeterminism(params, ste)
    const outputDir = resolveOutputDir(params)
    const indexPath = path.join(outputDir, 'index.json')
    let triggeredCount = 0
    let triggeredBeatIds: readonly string[] = Object.freeze([])
    let droughtBreakersHeldByReserve = 0
    try {
        const raw = fs.readFileSync(indexPath, 'utf8')
        const parsed = JSON.parse(raw) as {
            agendaSummary?: {
                configuredCount?: number
                triggeredCount?: number
                triggeredBeatIds?: string[]
                droughtBreakersHeldByReserve?: number
            }
        }
        const summary = parsed.agendaSummary
        if (summary != null) {
            triggeredCount = Number.isInteger(summary.triggeredCount)
                ? (summary.triggeredCount as number)
                : 0
            triggeredBeatIds = Object.freeze([
                ...(summary.triggeredBeatIds ?? []),
            ])
            droughtBreakersHeldByReserve = Number.isInteger(
                summary.droughtBreakersHeldByReserve,
            )
                ? (summary.droughtBreakersHeldByReserve as number)
                : 0
        }
    } catch {
        // missing index treated as zero agenda activity
    }
    const replayMismatches = replay.mismatchedFiles.length
    await emitCns00(
        ste,
        `>> [AGENDA:REPLAY] Triggered=${triggeredCount} ReserveHeld=${droughtBreakersHeldByReserve} Mismatches=${replayMismatches}`,
    )
    return Object.freeze({
        deterministic: replay.deterministic,
        fileCount: replay.fileCount,
        mismatchedFiles: Object.freeze([...replay.mismatchedFiles]),
        stackDigestSha256: replay.stackDigestSha256,
        triggeredCount,
        triggeredBeatIds,
        droughtBreakersHeldByReserve,
        replayMismatches,
    })
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

export interface PacingDistributionAuditReceipt {
    readonly seriesSlug: string
    readonly totalTicks: number
    readonly tickSeconds: number
    readonly stackedCount: number
    readonly actCounts: {
        readonly ACT_I: number
        readonly ACT_II: number
        readonly ACT_III: number
    }
    readonly maxDrySpellObservedTicks: number
    readonly minSpacingObservedTicks: number
    readonly averageSpacingTicks: number
    readonly stackDigestSha256: string
    readonly replayMismatches: number
    readonly noClusterViolation: boolean
    readonly noDrySpellViolation: boolean
    readonly escalatingClimaxCadence: boolean
    readonly deterministic: boolean
    readonly fileCount: number
    readonly midnightRollover: boolean
    readonly daypartsSeen: readonly string[]
}

export const auditThreeActPacingSimulation = async (
    params: AutoScriptRunParams,
    ste?: unknown,
): Promise<PacingDistributionAuditReceipt> => {
    const totalTicks = params.totalTicks ?? 96
    const tickSeconds = params.tickSeconds ?? 900
    const startDate = params.startDate ?? '2026-10-31'
    const startTime = params.startTime ?? '08:00'
    const seriesSlug = params.seriesSlug
    const merged: AutoScriptRunParams = {
        ...params,
        totalTicks,
        tickSeconds,
        startDate,
        startTime,
    }
    const replay = await verifyAutoScriptReplayDeterminism(merged, ste)
    const outputDir = resolveOutputDir(merged)
    const indexPath = path.join(outputDir, 'index.json')
    const indexRaw = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
        entries: Array<{ tick: number; fountainFile: string }>
        pacingSummary: {
            actWindowMode: string
            minTicksBetweenScenes: number
            maxDrySpellTicks: number
            actCounts: { ACT_I: number; ACT_II: number; ACT_III: number }
            maxDrySpellObservedTicks: number
            cooldownSuppressionsCount: number
            droughtBreakersCount: number
            sceneSpacingTicks: number[]
        }
        stackedCount: number
    }
    const pacingSummary = indexRaw.pacingSummary
    const entries = [...indexRaw.entries].sort((a, b) => a.tick - b.tick)
    const spacing = pacingSummary.sceneSpacingTicks ?? []
    let minSpacingObservedTicks = Number.MAX_SAFE_INTEGER
    for (const gap of spacing) {
        if (gap < minSpacingObservedTicks) minSpacingObservedTicks = gap
    }
    if (minSpacingObservedTicks === Number.MAX_SAFE_INTEGER) {
        minSpacingObservedTicks = totalTicks
    }
    const averageSpacingTicks =
        spacing.length > 0
            ? spacing.reduce((a, b) => a + b, 0) / spacing.length
            : totalTicks
    const minTicks = pacingSummary.minTicksBetweenScenes ?? 3
    let noClusterViolation = true
    const astSeverities: number[] = []
    const astCategories: string[] = []
    for (const entry of entries) {
        try {
            const astPath = path.join(
                outputDir,
                entry.fountainFile.replace(/\.fountain$/, '.ast.json'),
            )
            const ast = JSON.parse(fs.readFileSync(astPath, 'utf8')) as {
                sceneSummaryAst?: { severityBps?: number; category?: string }
                category?: string
            }
            const sev = ast.sceneSummaryAst?.severityBps
            astSeverities.push(typeof sev === 'number' ? sev : 3000)
            const cat =
                ast.sceneSummaryAst?.category ?? ast.category ?? 'UNKNOWN'
            astCategories.push(String(cat))
        } catch {
            astSeverities.push(3000)
            astCategories.push('UNKNOWN')
        }
    }
    for (let i = 1; i < entries.length; i += 1) {
        const prev = entries[i - 1] as { tick: number }
        const curr = entries[i] as { tick: number }
        const gap = curr.tick - prev.tick
        const currSev = astSeverities[i] ?? 3000
        const prevCat = astCategories[i - 1] ?? 'UNKNOWN'
        const currCat = astCategories[i] ?? 'UNKNOWN'
        const isOverride = currSev >= 8500
        const isChronoPair =
            prevCat === 'CHRONO_MILESTONE' || currCat === 'CHRONO_MILESTONE'
        if (!isOverride && !isChronoPair && gap < minTicks) {
            noClusterViolation = false
            break
        }
    }
    const maxDry = pacingSummary.maxDrySpellObservedTicks ?? 0
    const maxAllowed = pacingSummary.maxDrySpellTicks ?? 8
    const noDrySpellViolation =
        maxAllowed >= totalTicks ? true : maxDry <= maxAllowed
    const actCounts = pacingSummary.actCounts ?? {
        ACT_I: 0,
        ACT_II: 0,
        ACT_III: 0,
    }
    const escalatingClimaxCadence =
        actCounts.ACT_III >= actCounts.ACT_I ||
        actCounts.ACT_II + actCounts.ACT_III >= actCounts.ACT_I
    const dayparts = new Set<string>()
    let midnightRollover = false
    for (const entry of entries) {
        try {
            const fountainPath = path.join(outputDir, entry.fountainFile)
            const text = fs.readFileSync(fountainPath, 'utf8')
            const dateMatch = /^Date:\s*(\d{4}-\d{2}-\d{2})/m.exec(text)
            if (dateMatch?.[1] && dateMatch[1] !== startDate) {
                midnightRollover = true
            }
            const dayMatch = /^Daypart:\s*(\S+)/m.exec(text)
            if (dayMatch?.[1]) dayparts.add(dayMatch[1].trim())
        } catch {
            // ignore unreadable artifact
        }
    }
    const daypartsSeen = [...dayparts].sort()
    await emitCns00(
        ste,
        `>> [PACING:AUDIT24H] ActI=${actCounts.ACT_I} ActII=${actCounts.ACT_II} ActIII=${actCounts.ACT_III} MaxDry=${maxDry}t ReplayMismatches=${replay.mismatchedFiles.length}`,
    )
    return Object.freeze({
        seriesSlug,
        totalTicks,
        tickSeconds,
        stackedCount: indexRaw.stackedCount,
        actCounts: Object.freeze({ ...actCounts }),
        maxDrySpellObservedTicks: maxDry,
        minSpacingObservedTicks,
        averageSpacingTicks,
        stackDigestSha256: replay.stackDigestSha256,
        replayMismatches: replay.mismatchedFiles.length,
        noClusterViolation,
        noDrySpellViolation,
        escalatingClimaxCadence,
        deterministic: replay.deterministic,
        fileCount: replay.fileCount,
        midnightRollover,
        daypartsSeen: Object.freeze(daypartsSeen),
    })
}

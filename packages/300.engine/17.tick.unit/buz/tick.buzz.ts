import { TickModel } from '../tick.model.js'
import TickBit from '../fce/tick.bit.js'
import State from '../../99.core/state.js'
import {
    normalizeLoreChronology,
    deriveSimDaypart,
    type SimulationClockState,
} from '../fce/tick.interface.js'

function pad2Local(value: number): string {
    return value < 10 ? `0${value}` : `${value}`
}

function isLeapLocal(year: number): boolean {
    if (year % 4 !== 0) return false
    if (year % 100 !== 0) return true
    return year % 400 === 0
}

function dimLocal(year: number, month: number): number {
    if (month === 2) return isLeapLocal(year) ? 29 : 28
    if (month === 4 || month === 6 || month === 9 || month === 11) return 30
    return 31
}

function advanceClockLocal(
    clock: SimulationClockState,
    deltaCs: number,
): SimulationClockState {
    const wholeSeconds = Math.floor(deltaCs / 100)
    const remainderCs = deltaCs % 100
    let centisecond = clock.centisecond + remainderCs
    let extraSeconds = wholeSeconds
    if (centisecond >= 100) {
        centisecond -= 100
        extraSeconds += 1
    }
    let second = clock.second
    let minute = clock.minute
    let hour = clock.hour
    let year = clock.year
    let month = clock.month
    let day = clock.day
    const carryMin = Math.floor((second + extraSeconds) / 60)
    second = (second + extraSeconds) % 60
    const carryHr = Math.floor((minute + carryMin) / 60)
    minute = (minute + carryMin) % 60
    let carryDay = Math.floor((hour + carryHr) / 24)
    hour = (hour + carryHr) % 24
    while (carryDay > 0) {
        const dim = dimLocal(year, month)
        if (day + 1 > dim) {
            day = 1
            if (month === 12) {
                month = 1
                year += 1
            } else {
                month += 1
            }
        } else {
            day += 1
        }
        carryDay -= 1
    }
    const addedSeconds =
        wholeSeconds + (remainderCs + clock.centisecond >= 100 ? 1 : 0)
    const isoDate = `${String(year).padStart(4, '0')}-${pad2Local(month)}-${pad2Local(day)}`
    const totalElapsedSeconds = clock.totalElapsedSeconds + addedSeconds
    const safeFps = clock.framesPerSecond > 0 ? clock.framesPerSecond : 24
    const totalFrames = Math.floor(
        totalElapsedSeconds * safeFps +
            Math.floor((centisecond * safeFps) / 100),
    )
    const frames = totalFrames % safeFps
    const totalSec = Math.floor(totalFrames / safeFps)
    const timecodeSmpte = `${pad2Local(Math.floor(totalSec / 3600) % 24)}:${pad2Local(Math.floor(totalSec / 60) % 60)}:${pad2Local(totalSec % 60)}:${pad2Local(frames)}`
    return {
        calendarSystem: 'GREGORIAN_24H',
        year,
        month,
        day,
        hour,
        minute,
        second,
        centisecond,
        tickSeconds: clock.tickSeconds,
        framesPerSecond: clock.framesPerSecond,
        totalElapsedSeconds,
        totalFrames,
        isoDate,
        clockTimeHm: `${pad2Local(hour)}:${pad2Local(minute)}`,
        clockTimeHms: `${pad2Local(hour)}:${pad2Local(minute)}:${pad2Local(second)}`,
        timecodeSmpte,
        daypart: deriveSimDaypart(hour),
        timezoneLabel: clock.timezoneLabel,
        eraLabel: clock.eraLabel,
    }
}

export const initTick = (cpy: TickModel, bal: TickBit, _ste: State) => {
    const input =
        (bal as any)?.dat?.chronology ??
        (bal as any)?.dat?.loreChronology ??
        null
    try {
        cpy.clockState = normalizeLoreChronology(input)
    } catch {
        cpy.clockState = normalizeLoreChronology(null)
    }
    cpy.tickCount = 0
    cpy.simTime = 0
    cpy.tickSeconds = cpy.clockState.tickSeconds
    cpy.framesPerSecond = cpy.clockState.framesPerSecond
    if (bal?.slv) {
        bal.slv({
            tckBit: {
                idx: 'init-tick-pass',
                val: 1,
                src: '>> [TICK:INIT] Simulation clock initialized.',
                dat: { clock: cpy.clockState, tickCount: cpy.tickCount },
            },
        })
    }
    return cpy
}

export const updateTick = (cpy: TickModel, bal: TickBit, _ste: State) => {
    void _ste
    cpy.tickCount += 1
    cpy.simTime += 1
    if (cpy.clockState != null) {
        cpy.clockState = advanceClockLocal(
            cpy.clockState,
            cpy.clockState.tickSeconds * 100,
        )
    }
    if (bal?.slv) {
        bal.slv({
            tckBit: {
                idx: 'update-tick-pass',
                val: cpy.tickCount,
                src: `>> [TICK:STEP] tick ${cpy.tickCount} | ${cpy.clockState.isoDate} ${cpy.clockState.clockTimeHms}`,
                dat: { clock: cpy.clockState, tickCount: cpy.tickCount },
            },
        })
    }
    return cpy
}

export const setSimulationChronology = (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
) => {
    void _ste
    const input =
        (bal as any)?.dat?.chronology ??
        (bal as any)?.dat?.loreChronology ??
        null
    cpy.clockState = normalizeLoreChronology(input)
    cpy.tickSeconds = cpy.clockState.tickSeconds
    cpy.framesPerSecond = cpy.clockState.framesPerSecond
    if (bal?.slv) {
        bal.slv({
            tckBit: {
                idx: 'set-simulation-chronology-pass',
                val: 1,
                src: `>> [SIM:CHRONOLOGY] ${cpy.clockState.isoDate} ${cpy.clockState.clockTimeHms}`,
                dat: { clock: cpy.clockState },
            },
        })
    }
    return cpy
}

export const advanceSimulationClock = (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
) => {
    void _ste
    const rawTicks = Number((bal as any)?.dat?.ticks ?? (bal as any)?.val ?? 1)
    const ticks = Number.isInteger(rawTicks) && rawTicks > 0 ? rawTicks : 1
    for (let i = 0; i < ticks; i += 1) {
        cpy.clockState = advanceClockLocal(
            cpy.clockState,
            cpy.clockState.tickSeconds * 100,
        )
        cpy.tickCount += 1
        cpy.simTime += 1
    }
    if (bal?.slv) {
        bal.slv({
            tckBit: {
                idx: 'advance-simulation-clock-pass',
                val: cpy.tickCount,
                src: `>> [SIM:TIMECODE] ${cpy.clockState.isoDate} ${cpy.clockState.clockTimeHms} | TC ${cpy.clockState.timecodeSmpte} | DAYPART: ${cpy.clockState.daypart} | TICK ${cpy.tickCount - ticks} -> ${cpy.tickCount}`,
                dat: { clock: cpy.clockState, tickCount: cpy.tickCount },
            },
        })
    }
    return cpy
}

export const readSimulationTimecode = (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
) => {
    void _ste
    if (bal?.slv) {
        bal.slv({
            tckBit: {
                idx: 'read-simulation-timecode-pass',
                val: cpy.tickCount,
                src: `>> [SIM:TIMECODE] ${cpy.clockState.isoDate} ${cpy.clockState.clockTimeHms} | TC ${cpy.clockState.timecodeSmpte} | DAYPART: ${cpy.clockState.daypart} | TICK ${cpy.tickCount}`,
                dat: { clock: cpy.clockState, tickCount: cpy.tickCount },
            },
        })
    }
    return cpy
}

import type {
    ChronoAgendaWindowStatus,
    ResolvedAgendaBeatWindow,
    ScheduledStoryBeat,
    SimulationClockState as AgendaClockState,
    WeekdayToken,
    LunarPhaseToken,
    BlackoutEvaluationResult,
    BlackoutSkipNotice,
} from '../fce/tick.interface.js'
import { agendaOccurrenceKey } from '../fce/tick.interface.js'

function agendaDaysFromCivil(y: number, m: number, d: number): number {
    const yAdj = m <= 2 ? y - 1 : y
    const era = Math.floor((yAdj >= 0 ? yAdj : yAdj - 399) / 400)
    const yoe = yAdj - era * 400
    const mp = Math.floor((m + 9) % 12)
    const doy = Math.floor((153 * mp + 2) / 5) + d - 1
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
    return era * 146097 + doe - 719468
}

function agendaParseIsoDate(isoDate: string): {
    year: number
    month: number
    day: number
} {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
    if (
        match == null ||
        match[1] == null ||
        match[2] == null ||
        match[3] == null
    ) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Malformed start_date: ${isoDate}`,
        )
    }
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Malformed start_date: ${isoDate}`,
        )
    }
    if (month < 1 || month > 12) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Impossible calendar date: ${isoDate}`,
        )
    }
    const dim =
        month === 2
            ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
                ? 29
                : 28
            : month === 4 || month === 6 || month === 9 || month === 11
              ? 30
              : 31
    if (day < 1 || day > dim) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Impossible calendar date: ${isoDate}`,
        )
    }
    return { year, month, day }
}

function agendaParseTimeHm(timeHm: string): { hour: number; minute: number } {
    const match = /^(\d{2}):(\d{2})$/.exec(timeHm)
    if (match == null || match[1] == null || match[2] == null) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Malformed start_time: ${timeHm}`,
        )
    }
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Malformed start_time: ${timeHm}`,
        )
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Impossible clock time: ${timeHm}`,
        )
    }
    return { hour, minute }
}

function agendaNextIsoDate(isoDate: string): string {
    const { year, month, day } = agendaParseIsoDate(isoDate)
    const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const dim =
        month === 2
            ? isLeap
                ? 29
                : 28
            : month === 4 || month === 6 || month === 9 || month === 11
              ? 30
              : 31
    if (day < dim) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
    }
    if (month < 12) {
        return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`
    }
    return `${String(year + 1).padStart(4, '0')}-01-01`
}

export function computeGregorianTimestampSeconds(
    isoDate: string,
    timeHm: string,
): number {
    const { year, month, day } = agendaParseIsoDate(isoDate)
    const { hour, minute } = agendaParseTimeHm(timeHm)
    const days = agendaDaysFromCivil(year, month, day)
    return days * 86400 + hour * 3600 + minute * 60
}

export function computeAgendaBeatDeltaSeconds(
    targetEpochSeconds: number,
    referenceEpochSeconds: number,
): number {
    if (
        !Number.isInteger(targetEpochSeconds) ||
        !Number.isInteger(referenceEpochSeconds)
    ) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] Epoch seconds must be discrete integers.`,
        )
    }
    return targetEpochSeconds - referenceEpochSeconds
}

function agendaClockEpochSeconds(clock: AgendaClockState): number {
    const base = computeGregorianTimestampSeconds(
        clock.isoDate,
        clock.clockTimeHm,
    )
    const sec = Number.isInteger(clock.second) ? clock.second : 0
    return base + sec
}

export function computeAgendaBeatTargetTick(
    beat: ScheduledStoryBeat,
    effectiveIsoDate: string,
    referenceClock: AgendaClockState,
    referenceTick: number,
    tickSeconds: number,
): number {
    if (!Number.isInteger(referenceTick) || referenceTick < 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] referenceTick must be non-negative integer: ${String(referenceTick)}`,
        )
    }
    if (!Number.isInteger(tickSeconds) || tickSeconds <= 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] tickSeconds must be positive integer: ${String(tickSeconds)}`,
        )
    }
    const targetEpoch = computeGregorianTimestampSeconds(
        effectiveIsoDate,
        beat.startTimeHm,
    )
    const refEpoch = agendaClockEpochSeconds(referenceClock)
    const delta = targetEpoch - refEpoch
    const ticksUntil = Math.ceil(delta / tickSeconds)
    return referenceTick + ticksUntil
}

const SAKAMOTO_TABLE: readonly number[] = Object.freeze([
    0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4,
])

const WEEKDAY_ORDER: readonly WeekdayToken[] = Object.freeze([
    'SUN',
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
    'SAT',
])

function ruleOf(beat: ScheduledStoryBeat): {
    readonly frequency: string
    readonly weekdayMask?: readonly string[]
    readonly intervalDays?: number
    readonly lunarPhase?: string
    readonly solarMarkers?: readonly string[]
    readonly blackoutDates?: readonly string[]
    readonly blackoutWeekdays?: readonly string[]
    readonly blackoutShiftPolicy?: string
    readonly untilIsoDate?: string
    readonly maxOccurrences?: number
} {
    const r = (beat as unknown as Record<string, unknown>)?.[
        'recurrenceRule'
    ] as unknown as Record<string, unknown> | undefined
    if (
        r != null &&
        typeof r === 'object' &&
        typeof r['frequency'] === 'string'
    ) {
        return r as unknown as {
            readonly frequency: string
            readonly weekdayMask?: readonly string[]
            readonly intervalDays?: number
            readonly lunarPhase?: string
            readonly solarMarkers?: readonly string[]
            readonly blackoutDates?: readonly string[]
            readonly blackoutWeekdays?: readonly string[]
            readonly blackoutShiftPolicy?: string
            readonly untilIsoDate?: string
            readonly maxOccurrences?: number
        }
    }
    const legacy =
        (beat as unknown as Record<string, unknown>)?.['recurringDaily'] ===
        true
    return {
        frequency: legacy ? 'DAILY' : 'ONCE',
        blackoutDates: [],
        blackoutWeekdays: [],
        blackoutShiftPolicy: 'SKIP',
    }
}

export function resolveEngineGregorianWeekday(isoDate: string): WeekdayToken {
    const { year, month, day } = agendaParseIsoDate(isoDate)
    let y = year
    if (month < 3) y -= 1
    const t = SAKAMOTO_TABLE[month - 1] as number
    const w =
        (y +
            Math.floor(y / 4) -
            Math.floor(y / 100) +
            Math.floor(y / 400) +
            t +
            day) %
        7
    return WEEKDAY_ORDER[((w % 7) + 7) % 7] as WeekdayToken
}

export function computeDaysBetweenIsoDates(
    anchorIsoDate: string,
    currentIsoDate: string,
): number {
    const a = computeGregorianTimestampSeconds(anchorIsoDate, '00:00')
    const b = computeGregorianTimestampSeconds(currentIsoDate, '00:00')
    return Math.round((b - a) / 86400)
}

function addDaysIsoDate(isoDate: string, delta: number): string {
    const { year, month, day } = agendaParseIsoDate(isoDate)
    let y = year
    let m = month
    let d = day
    if (delta >= 0) {
        let n = delta
        while (n > 0) {
            const dim =
                m === 2
                    ? y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
                        ? 29
                        : 28
                    : m === 4 || m === 6 || m === 9 || m === 11
                      ? 30
                      : 31
            if (d < dim) {
                d += 1
            } else {
                d = 1
                if (m === 12) {
                    m = 1
                    y += 1
                } else {
                    m += 1
                }
            }
            n -= 1
        }
    } else {
        let n = -delta
        while (n > 0) {
            if (d > 1) {
                d -= 1
            } else {
                if (m === 1) {
                    m = 12
                    y -= 1
                } else {
                    m -= 1
                }
                const dim =
                    m === 2
                        ? y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
                            ? 29
                            : 28
                        : m === 4 || m === 6 || m === 9 || m === 11
                          ? 30
                          : 31
                d = dim
            }
            n -= 1
        }
    }
    const pad = (v: number, w: number): string => String(v).padStart(w, '0')
    return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`
}

export function matchesWeekdayOrIntervalCadence(
    beat: ScheduledStoryBeat,
    currentIsoDate: string,
): boolean {
    if (currentIsoDate < beat.isoDate) return false
    const rule = ruleOf(beat)
    if (rule.untilIsoDate != null && currentIsoDate > rule.untilIsoDate) {
        return false
    }
    const freq = rule.frequency
    if (freq === 'ONCE') return currentIsoDate === beat.isoDate
    if (freq === 'DAILY') {
        return computeDaysBetweenIsoDates(beat.isoDate, currentIsoDate) >= 0
    }
    if (freq === 'WEEKLY_MASK') {
        const delta = computeDaysBetweenIsoDates(beat.isoDate, currentIsoDate)
        if (delta < 0) return false
        const mask = (rule.weekdayMask ?? []) as readonly string[]
        if (mask.length === 0) return false
        return mask.includes(resolveEngineGregorianWeekday(currentIsoDate))
    }
    if (freq === 'INTERVAL_DAYS') {
        const delta = computeDaysBetweenIsoDates(beat.isoDate, currentIsoDate)
        if (delta < 0) return false
        const interval =
            Number.isInteger(rule.intervalDays) &&
            (rule.intervalDays as number) >= 1
                ? (rule.intervalDays as number)
                : 1
        return delta % interval === 0
    }
    return false
}

export const SYNODIC_MONTH_SECONDS = 2551443
export const REF_NEW_MOON_SEC = 947182440

export interface EngineLunarPhaseSnapshot {
    readonly phase: LunarPhaseToken
    readonly illuminationBps: number
    readonly ageSeconds: number
    readonly cycleProgressBps: number
}

export function computeEngineLunarPhaseSnapshot(
    isoDate: string,
    startTimeHm = '00:00',
): EngineLunarPhaseSnapshot {
    const ts = computeGregorianTimestampSeconds(isoDate, startTimeHm)
    let age = (ts - REF_NEW_MOON_SEC) % SYNODIC_MONTH_SECONDS
    if (age < 0) age += SYNODIC_MONTH_SECONDS
    const cycleProgressBps = Math.floor((age * 10000) / SYNODIC_MONTH_SECONDS)
    const quarter = SYNODIC_MONTH_SECONDS / 4
    let phase: LunarPhaseToken = 'NEW_MOON'
    if (age < quarter * 0.5 || age >= SYNODIC_MONTH_SECONDS - quarter * 0.5) {
        phase = 'NEW_MOON'
    } else if (age < quarter * 1.5) {
        phase = 'FIRST_QUARTER'
    } else if (age < quarter * 2.5) {
        phase = 'FULL_MOON'
    } else {
        phase = 'LAST_QUARTER'
    }
    const progress = age / SYNODIC_MONTH_SECONDS
    const illum = Math.round(
        ((1 - Math.cos(2 * Math.PI * progress)) / 2) * 10000,
    )
    const illuminationBps = Math.max(0, Math.min(10000, illum))
    return Object.freeze({
        phase,
        illuminationBps,
        ageSeconds: age,
        cycleProgressBps,
    })
}

export function resolveEngineSolarMarker(
    isoDate: string,
): import('../fce/tick.interface.js').SolarMarkerToken | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
    if (m == null || m[2] == null || m[3] == null) return null
    const mmdd = `${m[2]}-${m[3]}`
    if (mmdd === '03-20') return 'VERNAL_EQUINOX'
    if (mmdd === '06-21') return 'SUMMER_SOLSTICE'
    if (mmdd === '09-22') return 'AUTUMN_EQUINOX'
    if (mmdd === '12-21') return 'WINTER_SOLSTICE'
    return null
}

export function matchesLunarOrSolarRecurrence(
    beat: ScheduledStoryBeat,
    currentIsoDate: string,
): boolean {
    if (currentIsoDate < beat.isoDate) return false
    const rule = ruleOf(beat)
    if (rule.untilIsoDate != null && currentIsoDate > rule.untilIsoDate) {
        return false
    }
    if (rule.frequency === 'LUNAR_PHASE') {
        if (rule.lunarPhase == null) return false
        const snap = computeEngineLunarPhaseSnapshot(
            currentIsoDate,
            beat.startTimeHm,
        )
        return snap.phase === rule.lunarPhase
    }
    if (rule.frequency === 'SOLAR_SOLSTICE_EQUINOX') {
        const marker = resolveEngineSolarMarker(currentIsoDate)
        if (marker == null) return false
        const markers = (rule.solarMarkers ?? []) as readonly string[]
        return markers.includes(marker)
    }
    return false
}

export function matchesBeatRecurrenceOnDate(
    beat: ScheduledStoryBeat,
    currentIsoDate: string,
): boolean {
    const rule = ruleOf(beat)
    if (currentIsoDate < beat.isoDate) return false
    if (rule.untilIsoDate != null && currentIsoDate > rule.untilIsoDate) {
        return false
    }
    switch (rule.frequency) {
        case 'ONCE':
            return currentIsoDate === beat.isoDate
        case 'DAILY':
        case 'WEEKLY_MASK':
        case 'INTERVAL_DAYS':
            return matchesWeekdayOrIntervalCadence(beat, currentIsoDate)
        case 'LUNAR_PHASE':
        case 'SOLAR_SOLSTICE_EQUINOX':
            return matchesLunarOrSolarRecurrence(beat, currentIsoDate)
        default:
            return currentIsoDate === beat.isoDate
    }
}

export function evaluateBlackoutException(
    beat: ScheduledStoryBeat,
    candidateIsoDate: string,
    seriesBlackouts: readonly string[] = [],
): BlackoutEvaluationResult {
    const rule = ruleOf(beat)
    const policy =
        rule.blackoutShiftPolicy === 'DEFER_NEXT_VALID_DAY'
            ? 'DEFER_NEXT_VALID_DAY'
            : 'SKIP'
    const beatDates = new Set<string>(
        ((rule.blackoutDates ?? []) as readonly string[]).filter(
            (d) => typeof d === 'string',
        ),
    )
    const seriesSet = new Set<string>(
        (seriesBlackouts ?? []).filter((d) => typeof d === 'string'),
    )
    let weekday: WeekdayToken
    try {
        weekday = resolveEngineGregorianWeekday(candidateIsoDate)
    } catch {
        return Object.freeze({
            isBlackedOut: false,
            policy,
            effectiveIsoDate: candidateIsoDate,
            deferredFromIsoDate: null,
        })
    }
    const weekdaySet = new Set<string>(
        ((rule.blackoutWeekdays ?? []) as readonly string[]).filter(
            (d) => typeof d === 'string',
        ),
    )
    const isBlacked =
        beatDates.has(candidateIsoDate) ||
        seriesSet.has(candidateIsoDate) ||
        weekdaySet.has(weekday)
    if (!isBlacked) {
        return Object.freeze({
            isBlackedOut: false,
            policy,
            effectiveIsoDate: candidateIsoDate,
            deferredFromIsoDate: null,
        })
    }
    if (policy === 'SKIP') {
        return Object.freeze({
            isBlackedOut: true,
            policy,
            effectiveIsoDate: null,
            deferredFromIsoDate: candidateIsoDate,
        })
    }
    for (let i = 1; i <= 7; i += 1) {
        let shifted: string
        try {
            shifted = addDaysIsoDate(candidateIsoDate, i)
        } catch {
            continue
        }
        if (rule.untilIsoDate != null && shifted > rule.untilIsoDate) {
            continue
        }
        let shiftedWeekday: string
        try {
            shiftedWeekday = resolveEngineGregorianWeekday(shifted)
        } catch {
            continue
        }
        if (beatDates.has(shifted)) continue
        if (seriesSet.has(shifted)) continue
        if (weekdaySet.has(shiftedWeekday)) continue
        return Object.freeze({
            isBlackedOut: true,
            policy,
            effectiveIsoDate: shifted,
            deferredFromIsoDate: candidateIsoDate,
        })
    }
    return Object.freeze({
        isBlackedOut: true,
        policy,
        effectiveIsoDate: null,
        deferredFromIsoDate: candidateIsoDate,
    })
}

export function evaluateChronoAgendaWindow(
    tick: number,
    previousClock: AgendaClockState,
    nextClock: AgendaClockState,
    beats: readonly ScheduledStoryBeat[],
    consumedKeys: readonly string[] | ReadonlySet<string>,
    tickSeconds: number,
    seriesBlackouts?: readonly string[],
    beatOccurrenceCounts?: Readonly<Record<string, number>>,
): ChronoAgendaWindowStatus {
    if (!Number.isInteger(tick) || tick < 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] tick must be non-negative integer: ${String(tick)}`,
        )
    }
    if (!Number.isInteger(tickSeconds) || tickSeconds <= 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] tickSeconds must be positive integer: ${String(tickSeconds)}`,
        )
    }
    const consumedSet =
        consumedKeys instanceof Set
            ? consumedKeys
            : new Set<string>(consumedKeys ?? [])
    const seriesList: readonly string[] = Array.isArray(seriesBlackouts)
        ? seriesBlackouts
        : []
    const prevEpoch = agendaClockEpochSeconds(previousClock)
    const nextEpoch = agendaClockEpochSeconds(nextClock)
    const dueBeats: ResolvedAgendaBeatWindow[] = []
    const activeReserveLocks: ResolvedAgendaBeatWindow[] = []
    const blackoutSkips: BlackoutSkipNotice[] = []
    const seenDue = new Set<string>()
    const seenReserve = new Set<string>()
    for (const beat of beats ?? []) {
        if (beat == null) continue
        const rule = ruleOf(beat)
        if (
            beatOccurrenceCounts != null &&
            rule.maxOccurrences != null &&
            Number.isInteger(rule.maxOccurrences) &&
            (beatOccurrenceCounts[beat.beat_id] ?? 0) >=
                (rule.maxOccurrences as number)
        ) {
            continue
        }
        const tolerance =
            Number.isInteger(beat.toleranceTicks) &&
            (beat.toleranceTicks as number) >= 0
                ? (beat.toleranceTicks as number)
                : 0
        const reserve =
            Number.isInteger(beat.reserveCooldownTicks) &&
            (beat.reserveCooldownTicks as number) >= 0
                ? (beat.reserveCooldownTicks as number)
                : 0
        const freq = rule.frequency ?? 'ONCE'
        const isRecurring = freq !== 'ONCE' || beat.recurringDaily === true
        let anchorDates: string[]
        if (!isRecurring) {
            anchorDates = [beat.isoDate]
        } else {
            const dates = new Set<string>()
            dates.add(previousClock.isoDate)
            dates.add(nextClock.isoDate)
            try {
                dates.add(agendaNextIsoDate(nextClock.isoDate))
            } catch {
                // ignore
            }
            for (let i = 1; i <= 7; i += 1) {
                try {
                    dates.add(addDaysIsoDate(nextClock.isoDate, -i))
                } catch {
                    // ignore
                }
            }
            if (typeof beat.isoDate === 'string') {
                dates.add(beat.isoDate)
            }
            anchorDates = [...dates]
        }
        for (const anchor of anchorDates) {
            let matches = false
            try {
                matches = matchesBeatRecurrenceOnDate(beat, anchor)
            } catch {
                continue
            }
            if (!matches) continue
            let evaluated: BlackoutEvaluationResult
            try {
                evaluated = evaluateBlackoutException(beat, anchor, seriesList)
            } catch {
                continue
            }
            if (evaluated.isBlackedOut) {
                if (
                    evaluated.policy === 'SKIP' ||
                    evaluated.effectiveIsoDate == null
                ) {
                    const key = `${beat.beat_id}@${anchor}:skip`
                    if (!seenDue.has(key)) {
                        seenDue.add(key)
                        blackoutSkips.push(
                            Object.freeze({
                                beatId: beat.beat_id,
                                blackoutDate: anchor,
                                policy: evaluated.policy,
                                effectiveIsoDate: null,
                                deferredFromIsoDate: anchor,
                            }),
                        )
                    }
                    continue
                }
                const effectiveIsoDate = evaluated.effectiveIsoDate as string
                const occurrenceKey = agendaOccurrenceKey(
                    beat.beat_id,
                    effectiveIsoDate,
                )
                if (consumedSet.has(occurrenceKey)) continue
                if (seenDue.has(occurrenceKey)) continue
                let targetEpoch: number
                try {
                    targetEpoch = computeGregorianTimestampSeconds(
                        effectiveIsoDate,
                        beat.startTimeHm,
                    )
                } catch {
                    continue
                }
                const deltaSeconds = targetEpoch - nextEpoch
                const ticksUntilBeat = Math.ceil(
                    (targetEpoch - nextEpoch) / tickSeconds,
                )
                let targetTick = tick + ticksUntilBeat
                try {
                    targetTick = computeAgendaBeatTargetTick(
                        beat,
                        effectiveIsoDate,
                        nextClock,
                        tick,
                        tickSeconds,
                    )
                } catch {
                    targetTick = tick + ticksUntilBeat
                }
                const inInterval =
                    targetEpoch > prevEpoch && targetEpoch <= nextEpoch
                const withinTolerance = Math.abs(targetTick - tick) <= tolerance
                if (inInterval || withinTolerance) {
                    dueBeats.push(
                        Object.freeze({
                            beat,
                            effectiveIsoDate,
                            occurrenceKey,
                            targetTick,
                            targetEpochSeconds: targetEpoch,
                            deltaSeconds,
                            ticksUntilBeat,
                            deferredFromIsoDate: anchor,
                        }),
                    )
                    seenDue.add(occurrenceKey)
                    continue
                }
                if (targetEpoch > nextEpoch) {
                    if (ticksUntilBeat >= 1 && ticksUntilBeat <= reserve) {
                        if (!seenReserve.has(occurrenceKey)) {
                            seenReserve.add(occurrenceKey)
                            activeReserveLocks.push(
                                Object.freeze({
                                    beat,
                                    effectiveIsoDate,
                                    occurrenceKey,
                                    targetTick,
                                    targetEpochSeconds: targetEpoch,
                                    deltaSeconds,
                                    ticksUntilBeat,
                                    deferredFromIsoDate: anchor,
                                }),
                            )
                        }
                    }
                }
                continue
            }
            const effectiveIsoDate = anchor
            const occurrenceKey = agendaOccurrenceKey(
                beat.beat_id,
                effectiveIsoDate,
            )
            if (consumedSet.has(occurrenceKey)) continue
            if (seenDue.has(occurrenceKey)) continue
            let targetEpoch: number
            try {
                targetEpoch = computeGregorianTimestampSeconds(
                    effectiveIsoDate,
                    beat.startTimeHm,
                )
            } catch {
                continue
            }
            const deltaSeconds = targetEpoch - nextEpoch
            const ticksUntilBeat = Math.ceil(
                (targetEpoch - nextEpoch) / tickSeconds,
            )
            let targetTick = tick + ticksUntilBeat
            try {
                targetTick = computeAgendaBeatTargetTick(
                    beat,
                    effectiveIsoDate,
                    nextClock,
                    tick,
                    tickSeconds,
                )
            } catch {
                targetTick = tick + ticksUntilBeat
            }
            const inInterval =
                targetEpoch > prevEpoch && targetEpoch <= nextEpoch
            const withinTolerance = Math.abs(targetTick - tick) <= tolerance
            if (inInterval || withinTolerance) {
                dueBeats.push(
                    Object.freeze({
                        beat,
                        effectiveIsoDate,
                        occurrenceKey,
                        targetTick,
                        targetEpochSeconds: targetEpoch,
                        deltaSeconds,
                        ticksUntilBeat,
                        deferredFromIsoDate: null,
                    }),
                )
                seenDue.add(occurrenceKey)
                continue
            }
            if (targetEpoch > nextEpoch) {
                if (ticksUntilBeat >= 1 && ticksUntilBeat <= reserve) {
                    activeReserveLocks.push(
                        Object.freeze({
                            beat,
                            effectiveIsoDate,
                            occurrenceKey,
                            targetTick,
                            targetEpochSeconds: targetEpoch,
                            deltaSeconds,
                            ticksUntilBeat,
                            deferredFromIsoDate: null,
                        }),
                    )
                }
            }
        }
    }
    dueBeats.sort((a, b) => {
        if (a.deltaSeconds !== b.deltaSeconds)
            return a.deltaSeconds - b.deltaSeconds
        return a.beat.beat_id < b.beat.beat_id
            ? -1
            : a.beat.beat_id > b.beat.beat_id
              ? 1
              : 0
    })
    activeReserveLocks.sort((a, b) => {
        if (a.ticksUntilBeat !== b.ticksUntilBeat)
            return a.ticksUntilBeat - b.ticksUntilBeat
        return a.beat.beat_id < b.beat.beat_id
            ? -1
            : a.beat.beat_id > b.beat.beat_id
              ? 1
              : 0
    })
    return Object.freeze({
        tick,
        dueBeats: Object.freeze([...dueBeats]),
        activeReserveLocks: Object.freeze([...activeReserveLocks]),
        blackoutSkips: Object.freeze([...blackoutSkips]),
    })
}

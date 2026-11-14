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

export function evaluateChronoAgendaWindow(
    tick: number,
    previousClock: AgendaClockState,
    nextClock: AgendaClockState,
    beats: readonly ScheduledStoryBeat[],
    consumedKeys: readonly string[] | ReadonlySet<string>,
    tickSeconds: number,
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
    const prevEpoch = agendaClockEpochSeconds(previousClock)
    const nextEpoch = agendaClockEpochSeconds(nextClock)
    const dueBeats: ResolvedAgendaBeatWindow[] = []
    const activeReserveLocks: ResolvedAgendaBeatWindow[] = []
    const seenDue = new Set<string>()
    for (const beat of beats ?? []) {
        if (beat == null) continue
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
        const recurring = beat.recurringDaily === true
        let candidateDates: string[]
        if (recurring) {
            const dates = new Set<string>([
                previousClock.isoDate,
                nextClock.isoDate,
            ])
            try {
                dates.add(agendaNextIsoDate(nextClock.isoDate))
            } catch {
                // ignore malformed date
            }
            candidateDates = [...dates]
        } else {
            candidateDates = [beat.isoDate]
        }
        for (const effectiveIsoDate of candidateDates) {
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
    })
}

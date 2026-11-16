import clone from 'clone-deep'
import * as Act from './tick.action.js'
import { TickModel } from './tick.model.js'
import * as Buzz from './tick.buzzer.js'
import State from '../99.core/state.js'
import {
    type TickStatePayload,
    type TickActorState,
    type LoreChronologyInput,
    type SimDaypart,
    type SimulationClockState,
    toSimTime,
    isGregorianLeapYear,
    daysInGregorianMonth,
    deriveSimDaypart,
    normalizeLoreChronology,
} from './fce/tick.interface.js'

export const isLeapYear = isGregorianLeapYear
export const daysInMonth = daysInGregorianMonth
export { isGregorianLeapYear, daysInGregorianMonth, deriveSimDaypart }

function pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`
}

export function parseIsoCalendarClock(
    dateStr: string,
    timeStr: string,
): {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
} {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
    if (
        dateMatch == null ||
        dateMatch[1] == null ||
        dateMatch[2] == null ||
        dateMatch[3] == null
    ) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Malformed start_date: ${dateStr}`,
        )
    }
    const year = Number(dateMatch[1])
    const month = Number(dateMatch[2])
    const day = Number(dateMatch[3])
    if (month < 1 || month > 12) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Impossible calendar date: ${dateStr}`,
        )
    }
    if (day < 1 || day > daysInGregorianMonth(year, month)) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Impossible calendar date: ${dateStr}`,
        )
    }
    const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr)
    if (timeMatch == null || timeMatch[1] == null || timeMatch[2] == null) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Malformed start_time: ${timeStr}`,
        )
    }
    const hour = Number(timeMatch[1])
    const minute = Number(timeMatch[2])
    const second = timeMatch[3] != null ? Number(timeMatch[3]) : 0
    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59
    ) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Impossible clock time: ${timeStr}`,
        )
    }
    return { year, month, day, hour, minute, second }
}

export function stepCalendarClock(
    clock: SimulationClockState,
    deltaSeconds: number,
): SimulationClockState {
    if (!Number.isInteger(deltaSeconds) || deltaSeconds < 0) {
        throw new Error(
            `[NEGATIVE_DELTA_CENTISECONDS] deltaSeconds must be a non-negative integer: ${String(deltaSeconds)}`,
        )
    }
    let carry = deltaSeconds
    let second = clock.second + (carry % 60)
    carry = Math.floor(carry / 60)
    let minute = clock.minute + (second >= 60 ? 1 : 0)
    if (second >= 60) second -= 60
    minute += carry % 60
    carry = Math.floor(carry / 60)
    let hour = clock.hour + (minute >= 60 ? 1 : 0)
    if (minute >= 60) minute -= 60
    hour += carry % 24
    let dayCarry = Math.floor(carry / 24)
    if (hour >= 24) {
        hour -= 24
        dayCarry += 0
    }
    // Recompute day overflow correctly: track total hour overflow
    let year = clock.year
    let month = clock.month
    let day = clock.day
    // Apply day increments one at a time (bounded: delta per tick is small)
    let remainingDays = dayCarry
    // Account for hour wrap already handled; handle residual hour overflow
    if (hour >= 24) {
        remainingDays += Math.floor(hour / 24)
        hour = hour % 24
    }
    // The minute/hour carry above already folded; recompute remaining via loop
    while (remainingDays > 0) {
        const dim = daysInGregorianMonth(year, month)
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
        remainingDays -= 1
    }
    // Handle hour-driven day rollover when hour wrapped but dayCarry was 0
    // (carry path above already folds days; this keeps midnight boundary exact)
    return buildClockState(
        clock,
        year,
        month,
        day,
        hour,
        minute,
        second,
        clock.centisecond,
        deltaSeconds,
    )
}

function buildClockState(
    prev: SimulationClockState,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    centisecond: number,
    addedSeconds: number,
): SimulationClockState {
    const isoDate = `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`
    const clockTimeHm = `${pad2(hour)}:${pad2(minute)}`
    const clockTimeHms = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
    const totalElapsedSeconds = prev.totalElapsedSeconds + addedSeconds
    const totalFrames = Math.floor(totalElapsedSeconds * prev.framesPerSecond)
    return {
        calendarSystem: 'GREGORIAN_24H',
        year,
        month,
        day,
        hour,
        minute,
        second,
        centisecond,
        tickSeconds: prev.tickSeconds,
        framesPerSecond: prev.framesPerSecond,
        totalElapsedSeconds,
        totalFrames,
        isoDate,
        clockTimeHm,
        clockTimeHms,
        timecodeSmpte: formatSmpteTimecode24(
            totalElapsedSeconds,
            centisecond,
            prev.framesPerSecond,
        ),
        daypart: deriveSimDaypart(hour),
        timezoneLabel: prev.timezoneLabel,
        eraLabel: prev.eraLabel,
    }
}

export function formatSmpteTimecode24(
    totalSeconds: number,
    centisecond: number,
    fps = 24,
): string {
    if (totalSeconds < 0) {
        throw new Error(
            `[NEGATIVE_DELTA_CENTISECONDS] totalSeconds must be non-negative: ${String(totalSeconds)}`,
        )
    }
    const safeFps = fps > 0 ? Math.floor(fps) : 24
    const totalFrames = Math.floor(
        totalSeconds * safeFps + Math.floor((centisecond * safeFps) / 100),
    )
    const frames = totalFrames % safeFps
    const totalSec = Math.floor(totalFrames / safeFps)
    const secs = totalSec % 60
    const totalMin = Math.floor(totalSec / 60)
    const mins = totalMin % 60
    const hrs = Math.floor(totalMin / 60) % 24
    return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}:${pad2(frames)}`
}

export function initSimulationClock(
    input?: LoreChronologyInput | null,
): SimulationClockState {
    return normalizeLoreChronology(input)
}

export function extractLoreChronology(
    bibleState?: Readonly<Record<string, any>> | null,
): SimulationClockState {
    const raw = (bibleState as any)?.chronology as
        | LoreChronologyInput
        | undefined
    return normalizeLoreChronology(raw ?? null)
}

export function advanceSimulationClockState(
    clock: SimulationClockState,
    deltaCentiseconds: number,
): SimulationClockState {
    if (!Number.isInteger(deltaCentiseconds) || deltaCentiseconds < 0) {
        throw new Error(
            `[NEGATIVE_DELTA_CENTISECONDS] deltaCentiseconds must be a non-negative integer: ${String(deltaCentiseconds)}`,
        )
    }
    const wholeSeconds = Math.floor(deltaCentiseconds / 100)
    const remainderCs = deltaCentiseconds % 100
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
    // Add seconds with rollover
    let carryMin = Math.floor((second + extraSeconds) / 60)
    second = (second + extraSeconds) % 60
    let carryHr = Math.floor((minute + carryMin) / 60)
    minute = (minute + carryMin) % 60
    let carryDay = Math.floor((hour + carryHr) / 24)
    hour = (hour + carryHr) % 24
    while (carryDay > 0) {
        const dim = daysInGregorianMonth(year, month)
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
    void extraSeconds
    return buildClockWithCentisecond(
        clock,
        year,
        month,
        day,
        hour,
        minute,
        second,
        centisecond,
        addedSeconds,
    )
}

function buildClockWithCentisecond(
    prev: SimulationClockState,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    centisecond: number,
    addedSeconds: number,
): SimulationClockState {
    const isoDate = `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`
    const clockTimeHm = `${pad2(hour)}:${pad2(minute)}`
    const clockTimeHms = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
    const totalElapsedSeconds = prev.totalElapsedSeconds + addedSeconds
    const totalFrames = Math.floor(
        totalElapsedSeconds * prev.framesPerSecond +
            Math.floor((centisecond * prev.framesPerSecond) / 100),
    )
    return {
        calendarSystem: 'GREGORIAN_24H',
        year,
        month,
        day,
        hour,
        minute,
        second,
        centisecond,
        tickSeconds: prev.tickSeconds,
        framesPerSecond: prev.framesPerSecond,
        totalElapsedSeconds,
        totalFrames,
        isoDate,
        clockTimeHm,
        clockTimeHms,
        timecodeSmpte: formatSmpteTimecode24(
            totalElapsedSeconds,
            centisecond,
            prev.framesPerSecond,
        ),
        daypart: deriveSimDaypart(hour) as SimDaypart,
        timezoneLabel: prev.timezoneLabel,
        eraLabel: prev.eraLabel,
    }
}

/**
 * advanceClockTicks advances wall-clock by ticks * clock.tickSeconds seconds.
 * Each canonical tick step advances the wall-clock by tickSeconds
 * simulation seconds (default 1 tick = tickSeconds, e.g. +60s).
 */
export function advanceClockTicks(
    clock: SimulationClockState,
    ticks: number,
): SimulationClockState {
    if (!Number.isInteger(ticks) || ticks < 0) {
        throw new Error(
            `[NEGATIVE_DELTA_CENTISECONDS] ticks must be a non-negative integer: ${String(ticks)}`,
        )
    }
    return advanceSimulationClockState(clock, ticks * clock.tickSeconds * 100)
}

export function advanceTickSteps(
    state: TickStatePayload,
    tickCount: number,
): TickStatePayload {
    let current = state
    for (let i = 0; i < tickCount; i += 1) {
        current = reduceTickStep(current)
    }
    return current
}

export function reduceTickStep(
    state: TickStatePayload,
    deltaCentiseconds?: number,
): TickStatePayload {
    const rawTick = (state as any)?.tick
    const baseTick = typeof rawTick === 'number' ? rawTick : 0
    const nextTick = toSimTime(baseTick + 1)

    const actors = ((state as any)?.actors ?? []) as TickActorState[]
    const pending = ((state as any)?.pending_actions ??
        []) as TickStatePayload['pending_actions']

    const updatedActors: TickActorState[] = actors.map((actor) => {
        // Check if actor has pending actions to process on this tick
        const action = (pending as readonly any[]).find(
            (a) => a && a.actor_id === (actor as any).id,
        )

        let nextStrain = (actor as any).somatic_strain_bp ?? 0
        let nextParanoia = (actor as any).paranoia_bp ?? 0

        if (action) {
            if (action.verb === 'INSPECT' || action.verb === 'SEARCH') {
                nextStrain = Math.min(10000, nextStrain + 25)
                nextParanoia = Math.min(10000, nextParanoia + 50)
            } else if (action.verb === 'REST') {
                nextStrain = Math.max(0, nextStrain - 50)
                nextParanoia = Math.max(0, nextParanoia - 10)
            }
        } else {
            // Passive thermodynamic and somatic decay
            if (nextStrain > 0) nextStrain = Math.max(0, nextStrain - 1)
        }

        nextStrain = Math.max(0, Math.min(10000, nextStrain))
        nextParanoia = Math.max(0, Math.min(10000, nextParanoia))

        const rawBusy = (actor as any).busyUntil
        const busyNum = typeof rawBusy === 'number' ? rawBusy : 0
        return {
            id: (actor as any).id,
            somatic_strain_bp: nextStrain,
            paranoia_bp: nextParanoia,
            current_loc: (actor as any).current_loc,
            busyUntil: busyNum > nextTick ? toSimTime(busyNum) : nextTick,
        }
    })

    let nextClock = (state as any)?.clock as SimulationClockState | undefined
    if (nextClock != null) {
        const perTickCs = nextClock.tickSeconds * 100
        const delta = deltaCentiseconds ?? perTickCs
        nextClock = advanceSimulationClockState(nextClock, delta)
    }

    const next: TickStatePayload = {
        tick: nextTick,
        actors: updatedActors,
        pending_actions: [],
    } as TickStatePayload
    if (nextClock != null) {
        ;(next as any).clock = nextClock
    }
    if (
        (state as any)?.tickCount !== undefined ||
        (state as any)?.simTime !== undefined
    ) {
        ;(next as any).tickCount = ((state as any)?.tickCount ?? baseTick) + 1
        ;(next as any).simTime = ((state as any)?.simTime ?? baseTick) + 1
        ;(next as any).tickSeconds =
            (state as any)?.tickSeconds ?? nextClock?.tickSeconds ?? 60
    }
    return next
}

export function reducer(
    model: TickModel = new TickModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_TICK:
            return Buzz.updateTick(clone(model), act.bale, state as State)

        case Act.INIT_TICK:
            return Buzz.initTick(clone(model), act.bale, state as State)

        case Act.SET_SIMULATION_CHRONOLOGY:
        case Act.ADVANCE_SIMULATION_CLOCK:
        case Act.READ_SIMULATION_TIMECODE: {
            const handler = (Buzz as any)[actionToBuzzer(act.type)]
            if (typeof handler === 'function') {
                return handler(clone(model), (act as any).bale, state as State)
            }
            return model
        }

        case Act.RESET_TICK:
            return Buzz.resetTickAction(clone(model), act.bale, state as State)

        default:
            return model
    }
}

function actionToBuzzer(type: string): string {
    if (type === Act.SET_SIMULATION_CHRONOLOGY) return 'setSimulationChronology'
    if (type === Act.ADVANCE_SIMULATION_CLOCK) return 'advanceSimulationClock'
    return 'readSimulationTimecode'
}

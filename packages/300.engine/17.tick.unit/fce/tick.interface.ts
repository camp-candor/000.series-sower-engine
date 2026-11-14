export type SimTime = number & { readonly __brand: unique symbol }

export function toSimTime(value: number): SimTime {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(
            `[INVALID_TICK] SimTime must be a non-negative integer. Received: ${value}`,
        )
    }
    return value as SimTime
}

export const CENTISECONDS_PER_SECOND = 100

export interface TickActorState {
    readonly id: string
    readonly somatic_strain_bp: number // [0, 10000]
    readonly paranoia_bp: number // [0, 10000]
    readonly current_loc: string
    readonly busyUntil: SimTime
}

export interface PendingAction {
    readonly actor_id: string
    readonly verb: string
    readonly target?: string
}

export type SimDaypart = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'DUSK' | 'NIGHT'

export interface LoreChronologyInput {
    readonly calendar_system?: 'GREGORIAN_24H'
    readonly start_date?: string
    readonly start_time?: string
    readonly tick_seconds?: number
    readonly frames_per_second?: number
    readonly timezone_label?: string
    readonly era_label?: string
}

export interface SimulationClockState {
    readonly calendarSystem: 'GREGORIAN_24H'
    readonly year: number
    readonly month: number
    readonly day: number
    readonly hour: number
    readonly minute: number
    readonly second: number
    readonly centisecond: number
    readonly tickSeconds: number
    readonly framesPerSecond: number
    readonly totalElapsedSeconds: number
    readonly totalFrames: number
    readonly isoDate: string
    readonly clockTimeHm: string
    readonly clockTimeHms: string
    readonly timecodeSmpte: string
    readonly daypart: SimDaypart
    readonly timezoneLabel: string
    readonly eraLabel: string
}

export const DEFAULT_SIM_CHRONOLOGY: Required<LoreChronologyInput> = {
    calendar_system: 'GREGORIAN_24H',
    start_date: '2026-10-31',
    start_time: '21:00:00',
    tick_seconds: 60,
    frames_per_second: 24,
    timezone_label: 'UTC+00:00',
    era_label: 'CANON_PRESENT',
}

export interface TickStatePayload {
    readonly tick: SimTime
    readonly actors: readonly TickActorState[]
    readonly pending_actions: readonly PendingAction[]
    readonly clock?: SimulationClockState
    readonly tickCount?: number
    readonly simTime?: number
    readonly tickSeconds?: number
}

export interface TickStepParams {
    readonly tickSeconds?: number
    readonly deltaCentiseconds?: number
}

export interface TickFastForwardParams {
    readonly tickCount?: number
    readonly tickSeconds?: number
}

function pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`
}

export function isGregorianLeapYear(year: number): boolean {
    if (year % 4 !== 0) return false
    if (year % 100 !== 0) return true
    return year % 400 === 0
}

export function daysInGregorianMonth(year: number, month: number): number {
    if (month === 2) return isGregorianLeapYear(year) ? 29 : 28
    if (month === 4 || month === 6 || month === 9 || month === 11) return 30
    return 31
}

export function deriveSimDaypart(hour: number): SimDaypart {
    if (hour >= 5 && hour <= 6) return 'DAWN'
    if (hour >= 7 && hour <= 11) return 'MORNING'
    if (hour >= 12 && hour <= 16) return 'AFTERNOON'
    if (hour >= 17 && hour <= 19) return 'DUSK'
    return 'NIGHT'
}

function formatSmpte(
    totalSeconds: number,
    centisecond: number,
    fps: number,
): string {
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

export function normalizeLoreChronology(
    input?: LoreChronologyInput | null,
): SimulationClockState {
    const src = input ?? {}
    const dateStr = src.start_date ?? DEFAULT_SIM_CHRONOLOGY.start_date
    const timeStr = src.start_time ?? DEFAULT_SIM_CHRONOLOGY.start_time
    const tickSeconds = src.tick_seconds ?? DEFAULT_SIM_CHRONOLOGY.tick_seconds
    const framesPerSecond =
        src.frames_per_second ?? DEFAULT_SIM_CHRONOLOGY.frames_per_second
    const timezoneLabel =
        src.timezone_label ?? DEFAULT_SIM_CHRONOLOGY.timezone_label
    const eraLabel = src.era_label ?? DEFAULT_SIM_CHRONOLOGY.era_label

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
    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Malformed start_date: ${dateStr}`,
        )
    }
    if (month < 1 || month > 12) {
        throw new Error(
            `[INVALID_SIM_START_DATE] Impossible calendar date: ${dateStr}`,
        )
    }
    const dim = daysInGregorianMonth(year, month)
    if (day < 1 || day > dim) {
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
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        !Number.isInteger(second)
    ) {
        throw new Error(
            `[INVALID_SIM_START_TIME] Malformed start_time: ${timeStr}`,
        )
    }
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
    if (!Number.isInteger(tickSeconds) || tickSeconds <= 0) {
        throw new Error(
            `[INVALID_SIM_TICK_SECONDS] tick_seconds must be a positive integer: ${String(tickSeconds)}`,
        )
    }
    if (!Number.isInteger(framesPerSecond) || framesPerSecond <= 0) {
        throw new Error(
            `[INVALID_SIM_FPS] frames_per_second must be a positive integer: ${String(framesPerSecond)}`,
        )
    }

    const isoDate = `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`
    const clockTimeHm = `${pad2(hour)}:${pad2(minute)}`
    const clockTimeHms = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
    const daypart = deriveSimDaypart(hour)
    return {
        calendarSystem: 'GREGORIAN_24H',
        year,
        month,
        day,
        hour,
        minute,
        second,
        centisecond: 0,
        tickSeconds,
        framesPerSecond,
        totalElapsedSeconds: 0,
        totalFrames: 0,
        isoDate,
        clockTimeHm,
        clockTimeHms,
        timecodeSmpte: formatSmpte(0, 0, framesPerSecond),
        daypart,
        timezoneLabel,
        eraLabel,
    }
}

export function createInitialTickState(
    chronologyInput?: LoreChronologyInput | null,
): TickStatePayload {
    return {
        tick: toSimTime(0),
        actors: [],
        pending_actions: [],
        clock: normalizeLoreChronology(chronologyInput),
        tickCount: 0,
        simTime: 0,
        tickSeconds:
            chronologyInput?.tick_seconds ??
            DEFAULT_SIM_CHRONOLOGY.tick_seconds,
    }
}

export default interface Tick {
    // idx:string;
    // tickBitList: TickBit[];
    // tickBits:any;
}

export type AgendaBeatCategory =
    | 'PARANOIA_TRIGGERED'
    | 'GRIEVANCE_BREACH'
    | 'SOMATIC_TRAUMA'
    | 'INVENTORY_TRANSFER'
    | 'EPISTEMIC_REVEAL'
    | 'CHRONO_MILESTONE'

export interface ScheduledStoryBeat {
    readonly beat_id: string
    readonly title: string
    readonly isoDate: string
    readonly startTimeHm: string
    readonly beatCategory: AgendaBeatCategory
    readonly priorityBps: number
    readonly reserveCooldownTicks: number
    readonly toleranceTicks?: number
    readonly recurringDaily?: boolean
}

export interface ResolvedAgendaBeatWindow {
    readonly beat: ScheduledStoryBeat
    readonly effectiveIsoDate: string
    readonly occurrenceKey: string
    readonly targetTick: number
    readonly targetEpochSeconds: number
    readonly deltaSeconds: number
    readonly ticksUntilBeat: number
}

export interface ChronoAgendaWindowStatus {
    readonly tick: number
    readonly dueBeats: readonly ResolvedAgendaBeatWindow[]
    readonly activeReserveLocks: readonly ResolvedAgendaBeatWindow[]
}

export function agendaOccurrenceKey(
    beatId: string,
    effectiveIsoDate: string,
): string {
    return `${beatId}@${effectiveIsoDate}`
}

export const computeAgendaOccurrenceKey = agendaOccurrenceKey
export const resolveAgendaOccurrenceKey = agendaOccurrenceKey

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

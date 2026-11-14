import { describe, expect, it } from 'vitest'
import { MANAGE_ENGINE_RECURRENCE } from '../menu.action.js'
import { openAutoScriptCockpitMenu } from '../buz/00.menu.buzz.js'
import type { MenuModel } from '../menu.model.js'

function makeModel(): MenuModel {
    return {
        activeSelection: '',
        pacingOverrides: {},
    } as unknown as MenuModel
}

function makeSte(captured: string[]): unknown {
    return {
        hunt: async (type: string, bale: unknown) => {
            if (type === '[Console action] Update Console') {
                const src = (bale as { src?: string })?.src
                if (typeof src === 'string') captured.push(src)
            }
            if (
                type === '[Menu action] Manage Engine Recurrence' ||
                type === MANAGE_ENGINE_RECURRENCE
            ) {
                captured.push('>> [RECURRENCE:DISPATCH] manage')
            }
            return {}
        },
    }
}

const demoBeats = [
    {
        beat_id: 'friday_court',
        title: 'Friday Court',
        isoDate: '2026-10-30',
        startTimeHm: '09:00',
        beatCategory: 'GRIEVANCE_BREACH',
        priorityBps: 7000,
        reserveCooldownTicks: 1,
        recurrenceRule: {
            frequency: 'WEEKLY_MASK',
            weekdayMask: ['FRI'],
            blackoutDates: [],
            blackoutWeekdays: [],
            blackoutShiftPolicy: 'SKIP',
        },
    },
]

describe('phase eight recurrence cockpit menu', () => {
    it('exposes MANAGE_ENGINE_RECURRENCE action constant', () => {
        expect(MANAGE_ENGINE_RECURRENCE).toBe(
            '[Menu action] Manage Engine Recurrence',
        )
    })
    it('renders 14-day slot forecast to cns00', async () => {
        const captured: string[] = []
        await openAutoScriptCockpitMenu(
            makeModel(),
            {
                dat: {
                    action: 'recurrence-inspect',
                    startDate: '2026-10-30',
                    scheduledBeats: demoBeats,
                },
            } as never,
            makeSte(captured) as never,
        )
        const slots = captured.filter((s) => s.includes('>> [RECURRENCE:SLOT]'))
        expect(slots.length).toBeGreaterThan(0)
        for (const line of captured) {
            for (let i = 0; i < line.length; i += 1) {
                expect(line.charCodeAt(i)).toBeLessThanOrEqual(127)
            }
        }
    })
    it('fails closed on invalid session blackout date', async () => {
        const captured: string[] = []
        await openAutoScriptCockpitMenu(
            makeModel(),
            {
                dat: {
                    action: 'recurrence-inspect',
                    startDate: '2026-10-30',
                    scheduledBeats: demoBeats,
                    addBlackoutDate: '2025-02-29',
                },
            } as never,
            makeSte(captured) as never,
        )
        expect(captured.some((s) => s.includes(':: [RECURRENCE:ERR]'))).toBe(
            true,
        )
    })
    it('accepts valid session blackout override', async () => {
        const captured: string[] = []
        const model = makeModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                dat: {
                    action: 'recurrence-inspect',
                    startDate: '2026-10-30',
                    scheduledBeats: demoBeats,
                    addBlackoutDate: '2026-11-06',
                },
            } as never,
            makeSte(captured) as never,
        )
        expect(
            captured.some((s) => s.includes('>> [RECURRENCE:BLACKOUT]')),
        ).toBe(true)
    })
    it('renders deferred slot with the shifted date weekday', async () => {
        const captured: string[] = []
        await openAutoScriptCockpitMenu(
            makeModel(),
            {
                dat: {
                    action: 'recurrence-inspect',
                    startDate: '2026-10-30',
                    addBlackoutDate: '2026-10-30',
                    scheduledBeats: [
                        {
                            ...demoBeats[0],
                            recurrenceRule: {
                                ...demoBeats[0]!.recurrenceRule,
                                blackoutShiftPolicy: 'DEFER_NEXT_VALID_DAY',
                            },
                        },
                    ],
                },
            } as never,
            makeSte(captured) as never,
        )
        expect(
            captured.some((s) =>
                s.includes(
                    '>> [RECURRENCE:SLOT] friday_court | 2026-10-31 (SAT)',
                ),
            ),
        ).toBe(true)
    })
})

import { describe, expect, it } from 'vitest'
import { verifyRecurrenceGrammarReplayDeterminism } from '../buz/autoScriptRunner.buzz.js'

describe('phase seven wipe determinism', () => {
    it('replays multi-week recurrence bit-for-bit', async () => {
        const beats = [
            Object.freeze({
                beat_id: 'friday_court',
                title: 'Friday Court',
                isoDate: '2026-10-30',
                startTimeHm: '09:00',
                beatCategory: 'GRIEVANCE_BREACH',
                priorityBps: 9000,
                reserveCooldownTicks: 1,
                toleranceTicks: 10000,
                recurrenceRule: {
                    frequency: 'WEEKLY_MASK',
                    weekdayMask: ['FRI'],
                    blackoutDates: [],
                    blackoutWeekdays: [],
                    blackoutShiftPolicy: 'SKIP',
                },
            }),
            Object.freeze({
                beat_id: 'supply_drop',
                title: 'Supply Drop',
                isoDate: '2026-10-31',
                startTimeHm: '10:00',
                beatCategory: 'INVENTORY_TRANSFER',
                priorityBps: 9000,
                reserveCooldownTicks: 0,
                toleranceTicks: 10000,
                recurrenceRule: {
                    frequency: 'INTERVAL_DAYS',
                    intervalDays: 3,
                    blackoutDates: [],
                    blackoutWeekdays: [],
                    blackoutShiftPolicy: 'SKIP',
                },
            }),
        ] as never
        const receipt = await verifyRecurrenceGrammarReplayDeterminism({
            seriesSlug: 'recur_wipe_probe',
            startDate: '2026-10-30',
            startTime: '08:00:00',
            tickSeconds: 3600,
            totalTicks: 24,
            masterSeed: 'recur_seed_07',
            maxScripts: 8,
            scheduledBeats: beats,
            outputDir: 'drafts/auto-script/recur_wipe_probe',
            repoRoot: process.cwd(),
        })
        expect(receipt.equivalent).toBe(true)
        expect(receipt.runADigest).toBe(receipt.runBDigest)
        expect(receipt.runBDigest.length).toBe(64)
    }, 60000)
})

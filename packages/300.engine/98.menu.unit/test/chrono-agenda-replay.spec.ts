import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    runUnattendedAutoScriptSimulation,
    verifyChronoAgendaReplayDeterminism,
} from '../buz/autoScriptRunner.buzz.js'
import type { ScheduledStoryBeat } from '../../17.tick.unit/fce/tick.interface.js'

const singleBeat: ScheduledStoryBeat = Object.freeze({
    beat_id: 'curfew_2330',
    title: 'Midnight Curfew Tribunal',
    isoDate: '2026-10-31',
    startTimeHm: '23:30',
    beatCategory: 'GRIEVANCE_BREACH',
    priorityBps: 9000,
    reserveCooldownTicks: 3,
    toleranceTicks: 0,
    recurringDaily: false,
}) as ScheduledStoryBeat

const dailyBeat: ScheduledStoryBeat = Object.freeze({
    beat_id: 'dawn_0800',
    title: 'Dawn Muster',
    isoDate: '2026-10-31',
    startTimeHm: '08:00',
    beatCategory: 'CHRONO_MILESTONE',
    priorityBps: 8000,
    reserveCooldownTicks: 2,
    toleranceTicks: 0,
    recurringDaily: true,
}) as ScheduledStoryBeat

describe('chrono agenda replay determinism', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('fires single once and recurring once per day across midnight crossings', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const repoRoot = fs.mkdtempSync(
            path.join(os.tmpdir(), 'agenda-replay-'),
        )
        const outputDir = path.join(repoRoot, 'out')
        const receipt = await runUnattendedAutoScriptSimulation(
            {
                seriesSlug: 'agenda-replay-slug',
                outputDir,
                repoRoot,
                startDate: '2026-10-31',
                startTime: '21:00:00',
                tickSeconds: 3600,
                totalTicks: 52,
                masterSeed: 'agenda_replay_seed01',
                scheduledBeats: [singleBeat, dailyBeat],
            },
            undefined,
        )
        expect(receipt.stackedCount).toBeGreaterThan(0)
        const indexRaw = JSON.parse(
            fs.readFileSync(path.join(outputDir, 'index.json'), 'utf8'),
        ) as {
            agendaSummary: {
                configuredCount: number
                triggeredCount: number
                triggeredBeatIds: string[]
                triggeredOccurrences: string[]
                droughtBreakersHeldByReserve: number
            }
        }
        expect(indexRaw.agendaSummary.configuredCount).toBe(2)
        const singleHits = indexRaw.agendaSummary.triggeredOccurrences.filter(
            (occ) => occ.startsWith('curfew_2330@'),
        ).length
        expect(singleHits).toBe(1)
        const dailyHits = indexRaw.agendaSummary.triggeredOccurrences.filter(
            (occ) => occ.startsWith('dawn_0800@'),
        ).length
        expect(dailyHits).toBe(2)
        expect(indexRaw.agendaSummary.triggeredOccurrences).toContain(
            'curfew_2330@2026-10-31',
        )
        expect(indexRaw.agendaSummary.triggeredOccurrences).toContain(
            'dawn_0800@2026-11-01',
        )
        expect(indexRaw.agendaSummary.triggeredOccurrences).toContain(
            'dawn_0800@2026-11-02',
        )
        expect(indexRaw.agendaSummary.triggeredBeatIds).toContain('curfew_2330')
        expect(indexRaw.agendaSummary.triggeredBeatIds).toContain('dawn_0800')
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('holds drought filler inside reserve window', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-hold-'))
        const outputDir = path.join(repoRoot, 'out')
        const receipt = await runUnattendedAutoScriptSimulation(
            {
                seriesSlug: 'agenda-hold-slug',
                outputDir,
                repoRoot,
                startDate: '2026-10-31',
                startTime: '22:00:00',
                tickSeconds: 900,
                totalTicks: 8,
                masterSeed: 'agenda_hold_seed01',
                minTicksBetweenScenes: 1000,
                scheduledBeats: [singleBeat],
            } as never,
            undefined,
        )
        void receipt
        const indexRaw = JSON.parse(
            fs.readFileSync(path.join(outputDir, 'index.json'), 'utf8'),
        ) as {
            agendaSummary: { droughtBreakersHeldByReserve: number }
        }
        expect(
            indexRaw.agendaSummary.droughtBreakersHeldByReserve,
        ).toBeGreaterThanOrEqual(1)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('wipes output and replays with identical sha256', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-wipe-'))
        const outputDir = path.join(repoRoot, 'out')
        const params = {
            seriesSlug: 'agenda-wipe-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 52,
            masterSeed: 'agenda_wipe_seed01',
            scheduledBeats: [singleBeat, dailyBeat],
        }
        const verdict = await verifyChronoAgendaReplayDeterminism(
            params,
            undefined,
        )
        expect(verdict.replayMismatches).toBe(0)
        expect(verdict.deterministic).toBe(true)
        expect(seen.some((s) => s.includes('[AGENDA:REPLAY]'))).toBe(true)
        expect(seen.some((s) => s.includes('Mismatches=0'))).toBe(true)
        for (const ch of seen.join('\n')) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })
})

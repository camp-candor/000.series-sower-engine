import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runUnattendedAutoScriptSimulation } from '../../98.menu.unit/buz/autoScriptRunner.buzz.js'

function makeTempRoot(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'auto-script-'))
}

describe('Unattended Auto-Script Runner', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('stacks screenplays with lexical chronological ordering and index', async () => {
        const repoRoot = makeTempRoot()
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_type: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'test-slug',
        )
        const receipt = await runUnattendedAutoScriptSimulation({
            seriesSlug: 'test-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 24,
            masterSeed: 'auto_test_slug_seed01',
            maxScripts: 64,
        })
        expect(receipt.stackedCount).toBeGreaterThan(0)
        expect(fs.existsSync(path.join(outputDir, 'index.json'))).toBe(true)
        const files = fs
            .readdirSync(outputDir)
            .filter((n) => n.endsWith('.fountain'))
            .sort()
        expect(files.length).toBe(receipt.stackedCount)
        const sorted = [...files].sort()
        expect(files).toEqual(sorted)
        const index = JSON.parse(
            fs.readFileSync(path.join(outputDir, 'index.json'), 'utf8'),
        ) as {
            entries: Array<{ fountainFile: string }>
            pacingSummary?: {
                actCounts?: { ACT_I: number; ACT_II: number; ACT_III: number }
                maxDrySpellObservedTicks?: number
                cooldownSuppressionsCount?: number
                droughtBreakersCount?: number
                sceneSpacingTicks?: number[]
            }
        }
        expect(index.entries.map((e) => e.fountainFile)).toEqual(sorted)
        expect(index.pacingSummary).toBeDefined()
        expect(index.pacingSummary?.actCounts).toBeDefined()
        expect(typeof index.pacingSummary?.maxDrySpellObservedTicks).toBe(
            'number',
        )
        expect(typeof index.pacingSummary?.cooldownSuppressionsCount).toBe(
            'number',
        )
        expect(typeof index.pacingSummary?.droughtBreakersCount).toBe('number')
        expect(Array.isArray(index.pacingSummary?.sceneSpacingTicks)).toBe(true)
        expect(seen.some((s) => s.includes('>> [PACING:ACT]'))).toBe(true)
        expect(seen.some((s) => s.includes('[AUTO:TICK]'))).toBe(true)
        expect(seen.some((s) => s.includes('[AUTO:STACKED]'))).toBe(true)
        expect(seen.some((s) => s.includes('[AUTO:DONE]'))).toBe(true)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('rejects path traversal outside repo root fail-closed', async () => {
        await expect(
            runUnattendedAutoScriptSimulation({
                seriesSlug: 'test-slug',
                outputDir: '../escape-dir',
                repoRoot: makeTempRoot(),
                totalTicks: 2,
            }),
        ).rejects.toThrow('UNSAFE_AUTO_SCRIPT_OUTPUT_DIR')
    })

    it('respects max scripts cap without crashing', async () => {
        const repoRoot = makeTempRoot()
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'cap-slug',
        )
        const receipt = await runUnattendedAutoScriptSimulation({
            seriesSlug: 'cap-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 24,
            masterSeed: 'auto_test_slug_seed01',
            maxScripts: 1,
        })
        expect(receipt.stackedCount).toBeLessThanOrEqual(1)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('handles midnight rollover stacking .fountain + .ast.json and emitting AUTO:TIMECODE', async () => {
        const repoRoot = makeTempRoot()
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_type: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'midnight-slug',
        )
        const t0 = Date.now()
        const receipt = await runUnattendedAutoScriptSimulation({
            seriesSlug: 'midnight-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '23:50:00',
            tickSeconds: 60,
            totalTicks: 24,
            masterSeed: 'SEED-COWS-2026',
            maxScripts: 64,
        })
        const elapsedMs = Date.now() - t0
        expect(elapsedMs).toBeLessThan(2000)
        expect(receipt.stackedCount).toBeGreaterThan(0)

        const allFiles = fs.readdirSync(outputDir).sort()
        const fountains = allFiles.filter((f) => f.endsWith('.fountain'))
        const asts = allFiles.filter((f) => f.endsWith('.ast.json'))
        expect(fountains.length).toBe(receipt.stackedCount)
        expect(asts.length).toBe(receipt.stackedCount)
        expect(fountains[0]?.startsWith('0001_t')).toBe(true)

        const rolledOver = fountains.some((f) => {
            const text = fs.readFileSync(path.join(outputDir, f), 'utf8')
            return (
                text.includes('Date: 2026-11-01') &&
                text.includes('Start-Time: 00:00')
            )
        })
        expect(rolledOver).toBe(true)
        expect(seen.some((s) => s.includes('>> [AUTO:TIMECODE]'))).toBe(true)
        expect(seen.some((s) => s.includes('>> [AUTO:STACKED]'))).toBe(true)

        await expect(
            runUnattendedAutoScriptSimulation({
                seriesSlug: 'midnight-slug',
                outputDir: '../../outside',
                repoRoot,
                totalTicks: 2,
            }),
        ).rejects.toThrow('UNSAFE_AUTO_SCRIPT_OUTPUT_DIR')

        fs.rmSync(repoRoot, { recursive: true, force: true })
    })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Task 1.3.1: Engine Runner Incoming Canon Drop Plus Spatial Receipt Detection Hooks', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-drop-sync-'))
    })

    afterEach(() => {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    it('auto-detects incoming bible-state.json payload drops and staged spatial receipts on boot', async () => {
        const runnerSpec = [
            '..',
            '..',
            '..',
            '..',
            'apps',
            '995.library',
            'run.ts',
        ].join('/')
        const { detectIncomingCanonPayloads } = (await import(
            runnerSpec
        )) as any
        const gothamCompiledDir = path.join(
            tmpDir,
            'compiled',
            'gotham-trinity-crisis',
        )
        fs.mkdirSync(gothamCompiledDir, { recursive: true })
        fs.writeFileSync(
            path.join(gothamCompiledDir, 'bible-state.json'),
            JSON.stringify(
                {
                    series_slug: 'gotham-trinity-crisis',
                    root_merkle_hash: 'a'.repeat(64),
                    entities: {
                        characters: {
                            char_bruce_wayne: { name: 'Bruce Wayne' },
                        },
                        locations: {
                            loc_batcave: { name: 'Batcave' },
                            loc_clocktower: { name: 'Clocktower' },
                        },
                        possessions: {
                            item_grapnel_gun: { name: 'Grapnel Gun' },
                        },
                        grievances: {
                            grv_asylum_breach: { title: 'Asylum Breach' },
                        },
                    },
                },
                null,
                2,
            ),
            'utf8',
        )

        const gothamSpatialDir = path.join(
            tmpDir,
            'data',
            'spatial',
            'gotham-trinity-crisis',
        )
        fs.mkdirSync(gothamSpatialDir, { recursive: true })
        fs.writeFileSync(
            path.join(gothamSpatialDir, 'spatial_proof_1.json'),
            JSON.stringify(
                {
                    percept_candidate: {
                        observer_id: 'char_bruce_wayne',
                        subject_id: 'char_joker',
                        evidence: {
                            modality: 'OPTICAL',
                            transmission_bps: 8500,
                            topological_distance: 2,
                            occluding_barrier_coord: null,
                        },
                    },
                    spatial_audit_quadruple: {
                        topology_hash: '1'.repeat(64),
                        overlay_hash: '2'.repeat(64),
                        query_hash: '3'.repeat(64),
                        receipt_hash: '4'.repeat(64),
                    },
                    feasible: true,
                },
                null,
                2,
            ),
            'utf8',
        )

        const consoleLogs: string[] = []
        const mockLibrary = {
            hunt: async (_act: string, bal: any) => {
                if (bal?.src) {
                    consoleLogs.push(bal.src)
                }
            },
        }

        const report = await detectIncomingCanonPayloads({
            repoRoot: tmpDir,
            libraryBus: mockLibrary,
        })

        expect(report.canonPayloads).toHaveLength(1)
        expect(report.canonPayloads[0]?.seriesSlug).toBe(
            'gotham-trinity-crisis',
        )
        expect(report.canonPayloads[0]?.entityCount).toBe(5)
        expect(report.canonPayloads[0]?.merkleRootHex).toBe('a'.repeat(64))

        expect(report.spatialReceipts).toHaveLength(1)
        expect(report.spatialReceipts[0]?.seriesSlug).toBe(
            'gotham-trinity-crisis',
        )
        expect(report.spatialReceipts[0]?.modality).toBe('OPTICAL')
        expect(report.spatialReceipts[0]?.receiptHash).toBe('4'.repeat(64))

        expect(report.activeCanonSlug).toBe('gotham-trinity-crisis')
        expect(
            (globalThis as any).INGESTED_BIBLE_STATES?.[
                'gotham-trinity-crisis'
            ],
        ).toBeDefined()
        expect(
            (globalThis as any).STAGED_SPATIAL_PROOFS?.[
                'gotham-trinity-crisis'
            ],
        ).toHaveLength(1)
        expect(
            consoleLogs.some((l) =>
                l.includes(
                    "[ENGINE:INGEST] [OK] Auto-detected incoming canon payload 'gotham-trinity-crisis'",
                ),
            ),
        ).toBe(true)
        expect(
            consoleLogs.some((l) =>
                l.includes(
                    "[ENGINE:SPATIAL] [OK] Auto-detected 1 staged spatial receipt(s) for 'gotham-trinity-crisis'",
                ),
            ),
        ).toBe(true)
    })
})

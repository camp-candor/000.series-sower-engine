import { afterEach, describe, expect, it } from 'vitest'
import {
    openCompileMenu,
    runParallaxCompileAudit,
} from '../../98.menu.unit/buz/compile-menu.buzz.js'

declare const global: any

describe('Phase IV: Blessed Switchboard Compile & Parallax Preflight Telemetry Integration', () => {
    const originalLibrary = global.LIBRARY

    afterEach(() => {
        global.LIBRARY = originalLibrary
    })

    it('resolves headlessly when global.LIBRARY is undefined and returns 7-bit ASCII receipts with Merkle root', async () => {
        delete global.LIBRARY

        let resolvedBit: any
        const audit = await runParallaxCompileAudit(
            {},
            {
                slv: (res: any) => {
                    resolvedBit = res.mnuBit
                },
            },
        )

        expect(audit.status).toBe('SEALED')
        expect(audit.preflightValid).toBe(true)
        expect(audit.rootMerkleHash).toMatch(/^[a-f0-9]{64}$/)
        expect(resolvedBit?.idx).toBe('compile-menu-headless')
        expect(resolvedBit?.val).toBe(0)
        expect(
            audit.receipts.some((line) => line.startsWith('>> [MERKLE:ROOT] ')),
        ).toBe(true)
    })

    it('streams pure 7-bit ASCII telemetry lines directly to cns00 when global.LIBRARY.hunt is active', async () => {
        const consoleCalls: Array<{ action: string; payload: any }> = []
        global.LIBRARY = {
            hunt: async (action: string, payload: any) => {
                consoleCalls.push({ action, payload })
                return { cnsBit: { idx: 'cns00' } }
            },
        }

        await openCompileMenu({}, {})

        expect(consoleCalls.length).toBeGreaterThanOrEqual(7)
        for (const call of consoleCalls) {
            expect(call.action).toBe('[Console action] Update Console')
            expect(call.payload.idx).toBe('cns00')
            const src: string = call.payload.src
            for (let i = 0; i < src.length; i += 1) {
                expect(src.charCodeAt(i)).toBeLessThanOrEqual(127)
            }
        }

        const emittedLines = consoleCalls.map((c) => c.payload.src as string)
        expect(
            emittedLines.some((l) => l.includes('>> [COMPILE:PASS_1]')),
        ).toBe(true)
        expect(
            emittedLines.some((l) => l.includes('>> [COMPILE:PASS_2]')),
        ).toBe(true)
        expect(
            emittedLines.some((l) => l.includes('>> [COMPILE:PASS_3]')),
        ).toBe(true)
        expect(
            emittedLines.some((l) => l.includes('>> [PREFLIGHT:PASS]')),
        ).toBe(true)
    })
})

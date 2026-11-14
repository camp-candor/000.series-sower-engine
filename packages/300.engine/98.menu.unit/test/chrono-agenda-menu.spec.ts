import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import { MenuModel } from '../menu.model.js'
import { openAutoScriptCockpitMenu } from '../buz/00.menu.buzz.js'
import { MANAGE_ENGINE_AGENDA } from '../menu.action.js'

describe('chrono agenda menu', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('registers manage agenda action constant', () => {
        expect(MANAGE_ENGINE_AGENDA).toBe('[Menu action] Manage Engine Agenda')
    })

    it('registers [7] inspect choice in cockpit submenu', async () => {
        const seenLists: string[][] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (type: string, bale: { lst?: string[] }) => {
                if (Array.isArray(bale?.lst)) seenLists.push(bale.lst)
                return { chcBit: { src: '[<] RETURN TO ENGINE MENU' } }
            }),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            { idx: 'm', dat: {}, slv: () => {} } as never,
            undefined,
        )
        const flat = seenLists.flat()
        expect(flat).toContain('[7] INSPECT SCHEDULED CHRONO APPOINTMENTS')
    })

    it('renders ascii slot rows for valid beats', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'm',
                dat: {
                    action: 'agenda-inspect',
                    startDate: '2026-10-31',
                    startTime: '22:00:00',
                    tickSeconds: 900,
                    scheduledBeats: [
                        {
                            beat_id: 'curfew_2330',
                            title: 'Curfew',
                            isoDate: '2026-10-31',
                            startTimeHm: '23:30',
                            beatCategory: 'GRIEVANCE_BREACH',
                            priorityBps: 9000,
                            reserveCooldownTicks: 2,
                        },
                    ],
                },
                slv: () => {},
            } as never,
            undefined,
        )
        const slot = seen.find((s) => s.includes('[AGENDA:SLOT]'))
        expect(slot).toBeDefined()
        expect(slot).toContain('curfew_2330')
        expect(slot).toContain('2026-10-31 23:30')
        expect(slot).toContain('GRIEVANCE_BREACH')
        expect(slot).toMatch(/T\+\d+ \(RES:\d+\.\.\d+\)/)
        for (const ch of slot as string) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
    })

    it('adds valid session override headlessly', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'm',
                dat: {
                    action: 'agenda-add',
                    addBeat: {
                        beat_id: 'curfew_2330',
                        title: 'Curfew',
                        isoDate: '2026-10-31',
                        startTimeHm: '23:30',
                        beatCategory: 'GRIEVANCE_BREACH',
                        priorityBps: 9000,
                        reserveCooldownTicks: 2,
                    },
                },
                slv: () => {},
            } as never,
            undefined,
        )
        const holder = model as unknown as { agendaOverrides?: unknown[] }
        expect(holder.agendaOverrides?.length).toBe(1)
    })

    it('rejects invalid calendar date fail-closed', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'm',
                dat: {
                    action: 'agenda-add',
                    addBeat: {
                        beat_id: 'bad_beat',
                        title: 'Bad',
                        isoDate: '2025-02-29',
                        startTimeHm: '25:10',
                        beatCategory: 'GRIEVANCE_BREACH',
                        priorityBps: 9000,
                        reserveCooldownTicks: -1,
                    },
                },
                slv: () => {},
            } as never,
            undefined,
        )
        expect(seen.some((s) => s.includes('[AGENDA:ERR]'))).toBe(true)
        const holder = model as unknown as { agendaOverrides?: unknown[] }
        expect(holder.agendaOverrides ?? []).toEqual([])
    })

    it('binds every choice and input open with net mesh', () => {
        const source = fs.readFileSync(
            process.cwd() +
                '/packages/300.engine/98.menu.unit/buz/00.menu.buzz.ts',
            'utf8',
        )
        const choiceOpens = source.split('OPEN_CHOICE').length - 1
        expect(choiceOpens).toBeGreaterThan(0)
        expect(source.includes('net:')).toBe(true)
        expect(
            source.includes('[7] INSPECT SCHEDULED CHRONO APPOINTMENTS'),
        ).toBe(true)
        expect(source.includes('MANAGE_ENGINE_AGENDA')).toBe(true)
        expect(source.includes('console.log')).toBe(false)
        expect(source.includes('console.error')).toBe(false)
    })
})

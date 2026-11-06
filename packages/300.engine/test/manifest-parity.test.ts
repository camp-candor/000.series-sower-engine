import { describe, it, expect } from 'vitest'
import * as Import from '../BEE.js'
import UnitData from '../BEE.js'
import sim from '../hunt.js'
import * as ActArm from '../20.arithmetic.unit/arithmetic.action.js'
import * as ActClc from '../97.collect.unit/collect.action.js'
import * as ActBus from '../99.bus.unit/bus.action.js'

describe('Phase 1 Manifest Parity & Engine Synchronization Battery', () => {
    it('registers exactly 25 units in BEE.list', () => {
        expect(Array.isArray(Import.list)).toBe(true)
        expect(Import.list.length).toBe(25)
    })

    it('contains all 25 reducer handlers in BEE.reducer', () => {
        const expectedKeys = [
            'engine',
            'actor',
            'database',
            'entity',
            'envelope',
            'event',
            'grievance',
            'inventory',
            'ledger',
            'leverage',
            'location',
            'movement',
            'paranoia',
            'primordial',
            'sequence',
            'series',
            'state',
            'tick',
            'trauma',
            'wounds',
            'arithmetic',
            'compile',
            'collect',
            'menu',
            'bus',
        ]

        for (const key of expectedKeys) {
            expect(typeof Import.reducer[key]).toBe('function')
        }
        expect(Object.keys(Import.reducer).length).toBe(25)
    })

    it('instantiates all 25 unit models cleanly in UnitData', () => {
        const data = new UnitData()
        expect(data.engine).toBeDefined()
        expect(data.arithmetic).toBeDefined()
        expect(data.compile).toBeDefined()
        expect(data.collect).toBeDefined()
        expect(data.bus).toBeDefined()
    })

    it('dispatches INIT_ARITHMETIC through sim.hunt() without error', async () => {
        const res: any = await sim.hunt(ActArm.INIT_ARITHMETIC, {})
        expect(res).toBeDefined()
        expect(res.armBit.idx).toBe('init-arithmetic')
    })

    it('executes in-memory collect write and hash operations', async () => {
        await sim.hunt(ActClc.INIT_COLLECT, {})
        await sim.hunt(ActClc.WRITE_COLLECT, {
            idx: 'char_test',
            dat: { name: 'Test Character', status: 'ACTIVE' },
        })

        const readRes: any = await sim.hunt(ActClc.READ_COLLECT, {
            idx: 'char_test',
        })
        expect(readRes.clcBit.dat.bits.name).toBe('Test Character')

        const hashRes: any = await sim.hunt(ActClc.HASH_COLLECT, {})
        expect(hashRes.clcBit.src).toMatch(/^[0-9a-f]{64}$/)
    })

    it('dispatches bus message in-memory without external network broker', async () => {
        await sim.hunt(ActBus.INIT_BUS, {})
        const msgRes: any = await sim.hunt(ActBus.MESSAGE_BUS, {
            src: ActArm.UPDATE_ARITHMETIC,
            dat: {},
        })
        expect(msgRes.busBit.idx).toBe('message-bus')
        expect(msgRes.busBit.dat.armBit.idx).toBe('update-arithmetic')
    })
})

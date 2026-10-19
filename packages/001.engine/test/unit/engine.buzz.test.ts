import { describe, it, expect } from 'vitest'
import sim from '../../hunt.js'
import * as ActEng from '../../00.engine.unit/engine.action.js'
import * as ActMnu from '../../98.menu.unit/menu.action.js'

describe('001.engine 7-File Unit Architecture & Reactive Bus Gauntlet', () => {
    it('should initialize engine and receive async bal.slv response', async () => {
        const res: any = await sim.hunt(ActEng.INIT_ENGINE, {
            src: 'test-init',
        })

        expect(res).toBeDefined()
        expect(res.engBit).toBeDefined()
        expect(res.engBit.idx).toBe('init-engine')
        expect(res.engBit.val).toBe(1)
    })

    it('should handle state mutations and preserve model immutability', async () => {
        const res: any = await sim.hunt(ActEng.UPDATE_ENGINE, {
            val: 5,
            src: 'session-count-bump',
        })

        expect(res.engBit).toBeDefined()
        expect(res.engBit.val).toBe(5)
    })

    it('should execute auditEngine and return verification receipt', async () => {
        const res: any = await sim.hunt(ActEng.AUDIT_ENGINE, {})

        expect(res.engBit).toBeDefined()
        expect(res.engBit.idx).toBe('audit-engine')
        expect(res.engBit.dat?.auditHash).toBe('001_ENGINE_VERIFIED_SHA256')
    })

    it('should resolve menu action gracefully in headless mode', async () => {
        const res: any = await sim.hunt(ActMnu.UPDATE_MENU, {})

        expect(res).toBeDefined()
        expect(res.mnuBit).toBeDefined()
        expect(res.mnuBit.src).toBe('HEADLESS_BYPASS')
    })
})

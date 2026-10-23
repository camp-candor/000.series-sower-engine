import { describe, it, expect } from 'vitest'
import sim from '../hunt'
import * as ActEng from './engine.action'

describe('00.engine.unit & Master BEE.ts Orchestration Suite', () => {
    it('should initialize engine and confirm status READY', async () => {
        const res: any = await sim.hunt(ActEng.INIT_ENGINE, {
            src: 'test-init',
        })

        expect(res).toBeDefined()
        expect(res.engBit.idx).toBe('init-engine')
        expect(res.status).toBe('READY')
    })

    it('should execute bootEngine 3-step sovereign boot choreography and seed primordial state', async () => {
        const res: any = await sim.hunt(ActEng.BOOT_ENGINE, {
            src: 'under-the-floorboards',
        })

        expect(res).toBeDefined()
        expect(res.engBit.idx).toBe('boot-engine')
        expect(res.status).toBe('READY')
    })

    it('should execute statusEngine and return table inventory report', async () => {
        // Mock 02.database.unit query handler if in memory
        const res: any = await sim.hunt(ActEng.STATUS_ENGINE, {})

        expect(res).toBeDefined()
        expect(res.report).toBeDefined()
        expect(typeof res.report.event_log_count).toBe('number')
        expect(typeof res.report.entities_live_count).toBe('number')
        expect(res.report.current_state_hash).toBeDefined()
    })

    it('should execute auditEngine and compile cryptographic audit receipt', async () => {
        const res: any = await sim.hunt(ActEng.AUDIT_ENGINE, {})

        expect(res).toBeDefined()
        expect(res.receipt).toBeDefined()
        expect(res.receipt.audit_hash).toMatch(/^[0-9a-f]{64}$/)
        expect(res.receipt.probes.immutability_trigger_probe).toBeDefined()
        expect(res.receipt.probes.hand_capacity_probe).toBeDefined()
        expect(res.receipt.probes.anti_reflexivity_probe).toBeDefined()
    })

    it('should reset engine and transition state to OFFLINE', async () => {
        const res: any = await sim.hunt(ActEng.RESET_ENGINE, {})

        expect(res).toBeDefined()
        expect(res.status).toBe('OFFLINE')
    })
})

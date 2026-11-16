import { describe, it, expect } from 'vitest'
import { StateModel } from './state.model.js'
import { reducer } from './state.reduce.js'
import { RESET_STATE, ResetState } from './state.action.js'

describe('16.state.unit :: Reset Deep-Frozen State Snapshot Folds', () => {
    it('exposes RESET_STATE action contract', () => {
        expect(RESET_STATE).toBe('[State action] Reset State')
        expect(new ResetState()).toBeDefined()
        expect(new ResetState().type).toBe(RESET_STATE)
    })

    it('flushes snapshot folds back to GENESIS_HASH_64 through reducer', async () => {
        const model = new StateModel()
        model.activeSeriesSlug = 'gotham-trinity-crisis'
        model.activeStateHash = 'f'.repeat(64)
        model.workingState = { tick: 42, stateHash: 'f'.repeat(64) } as any
        model.activeSnapshot = { tick: 42, stateHash: 'f'.repeat(64) } as any
        model.stateBits = { 'fold-01': { idx: 'fold-01' } as any }

        let captured: any
        const next = (await reducer(
            model,
            new ResetState({
                idx: 'reset-state-test',
                slv: (res: any) => {
                    captured = res.stateBit
                },
            }),
            undefined,
        )) as StateModel

        expect(next.idx).toBe('16.state')
        expect(next.workingState).toBeNull()
        expect(next.activeSnapshot).toBeNull()
        expect(next.stateBits).toEqual({})
        expect(next.activeStateHash).toBe('0'.repeat(64))
        if ('stateHash' in next) {
            expect((next as any).stateHash).toBe('0'.repeat(64))
        }
        if ('lastStateHash' in next) {
            expect((next as any).lastStateHash).toBe('0'.repeat(64))
        }
        expect(captured?.idx).toBe('reset-state-pass')
        expect(captured?.dat?.snapshotCleared).toBe(true)
    })

    it('restores exact fresh constructor defaults without frozen residue', async () => {
        const fresh = new StateModel()
        const model = new StateModel()
        model.activeSeriesSlug = 'gotham-trinity-crisis'
        model.activeStateHash = 'a'.repeat(64)
        model.workingState = { tick: 7 } as any
        model.activeSnapshot = { tick: 7 } as any

        const lines: string[] = []
        const mockState: any = {
            hunt: (_action: string, bale: any) => {
                lines.push(String(bale?.src || ''))
                return Promise.resolve({})
            },
        }

        const next = (await reducer(
            model,
            new ResetState({ idx: 'reset-state-defaults' }),
            mockState,
        )) as StateModel

        expect(next.idx).toBe(fresh.idx)
        expect(next.activeSeriesSlug).toBe(fresh.activeSeriesSlug)
        expect(next.stateBits).toEqual(fresh.stateBits)
        expect(next.workingState).toBe(fresh.workingState)
        expect(next.activeSnapshot).toBe(fresh.activeSnapshot)
        expect(lines.some((line) => line.includes('[STATE:RESET]'))).toBe(true)
    })
})

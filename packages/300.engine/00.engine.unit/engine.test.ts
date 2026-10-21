import { describe, it, expect, vi } from 'vitest'
import { initEngine } from './buz/engine.buzz.js'
import { EngineModel } from './engine.model.js'

describe('engine', () => {
    it('should initialize engine', () => {
        const model = new EngineModel()
        const state = {
            hunt: vi.fn().mockResolvedValue({}),
            dispatch: vi.fn(),
        } as any

        const slv = vi.fn()
        const bal = { idx: 'test', slv } as any

        // Check if initEngine is a function and can be called
        expect(typeof initEngine).toBe('function')

        const result = initEngine(model, bal, state)
        expect(result).toBe(model)
        //expect(slv).toHaveBeenCalledWith({ intBit: { idx: 'init-engine' } });
    })

    it('should wake up the engine if url is provided', async () => {
        const model = new EngineModel()
        const state = {} as any
        const slv = vi.fn()
        const bal = { idx: 'test', slv } as any

        const urlengine =
            'https://zero00-engine.onrender.com/api/engine/test'

        const mockResponseengine = { status: 'engine-awake' }

        const globalFetch = vi
            .spyOn(global, 'fetch')
            .mockImplementation((url) => {
                if (url === urlengine) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockResponseengine),
                    } as any)
                }
                return Promise.reject(new Error('Unknown URL'))
            })

        initEngine(model, bal, state)

        // Wait for the promise in initEngine to resolve
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(globalFetch).toHaveBeenCalledWith(urlengine)
        expect(slv).toHaveBeenCalledWith({
            intBit: {
                idx: 'init-engine',
                dat: {
                    engine: mockResponseengine,
                },
            },
        })

        globalFetch.mockRestore()
    })

    it('should handle fetch errors', async () => {
        const model = new EngineModel()
        const state = {} as any
        const slv = vi.fn()
        const bal = { idx: 'test', slv } as any

        const urlengine =
            'https://zero00-engine.onrender.com/api/engine/test'

        const errorMessage = 'Network error'
        const globalFetch = vi
            .spyOn(global, 'fetch')
            .mockImplementation((url) => {
                if (url === urlengine) {
                    return Promise.reject(new Error(errorMessage))
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                } as any)
            })

        initEngine(model, bal, state)

        // Wait for the promise in initEngine to resolve
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(globalFetch).toHaveBeenCalledWith(urlengine)

        expect(slv).toHaveBeenCalledWith({
            intBit: { idx: 'init-engine-err', dat: errorMessage },
        })

        globalFetch.mockRestore()
    })
})

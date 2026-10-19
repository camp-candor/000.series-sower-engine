import { describe, it, expect } from 'vitest'
import app, { systemPrompt } from '../../src/index.js'

describe('Worker-Sower-Engine Ingress & Telemetry Audit', () => {
    it('should return live edge control plane text on GET /', async () => {
        const res = await app.fetch(new Request('http://localhost/'))
        expect(res.status).toBe(200)
        const text = await res.text()
        expect(text).toBe('WORKER-SOWER-ENGINE EDGE CONTROL PLANE IS LIVE')
    })

    it('should emit canonical worker-sower-engine telemetry on GET /health', async () => {
        const res = await app.fetch(new Request('http://localhost/health'))
        expect(res.status).toBe(200)
        const data = (await res.json()) as any
        expect(data.status).toBe('healthy')
        expect(data.service).toBe('worker-sower-engine')
        expect(data.engine).toBe('Worker-Sower-Engine')
    })

    it('should configure the narrative state authority system persona', () => {
        const prompt = systemPrompt()
        expect(prompt).toContain('Worker-Sower-Engine')
        expect(prompt).toContain(
            'authoritative epistemological narrative state engine',
        )
        expect(prompt).not.toContain(
            'repo-bot, deterministic DevOps Control Plane',
        )
    })
})

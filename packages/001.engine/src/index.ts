// ============================================================================
// @camp_candor/001.engine - PURE SIMULATION KERNEL & FACTS LEDGER CORE
// Architectural Law: Zero Cloudflare Worker / Edge Runtime Dependencies
// ============================================================================

export const ENGINE_KERNEL_VERSION = '0.1.0'
export const ENGINE_WORKSPACE_NAME = '@camp_candor/001.engine'

export interface EngineKernelStatus {
    service: string
    version: string
    pure: boolean
}

export function getEngineKernelStatus(): EngineKernelStatus {
    return {
        service: ENGINE_WORKSPACE_NAME,
        version: ENGINE_KERNEL_VERSION,
        pure: true,
    }
}

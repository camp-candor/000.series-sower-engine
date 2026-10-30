export interface GauntletStageResult {
    readonly stageId: string
    readonly name: string
    readonly passed: boolean
    readonly durationMs: number
    readonly error?: string
}

export default interface GauntletBit {
    idx: string
    src?: string
    val?: number // 0 = OK, -1 = Error
    dat?: {
        stageId?: string
        stages?: readonly GauntletStageResult[]
        totalDurationMs?: number
        passed?: boolean
    }
    lst?: string[] // 7-bit ASCII log lines for cns00
    slv?: (result: { gntBit: GauntletBit }) => void
}

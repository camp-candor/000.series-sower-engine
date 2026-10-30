/**
 * apps/terminal/cns00/views/arithmetic-monitor.view.ts
 * Blessed box visual component displaying arithmetic kernel invariants.
 */

export interface ArithmeticTelemetryStats {
    readonly totalCalculations: number
    readonly lastScaledBp: number
    readonly lastDivisionOutput: number | null
    readonly lastBigIntOutput: bigint | null
    readonly tieDetected: boolean
    readonly kernelStatus: 'INITIALIZING' | 'VERIFIED' | 'TRIPPED'
}

export function renderArithmeticHudAscii(
    stats: ArithmeticTelemetryStats,
): string[] {
    const statusBadge =
        stats.kernelStatus === 'VERIFIED'
            ? '[PASS: VERIFIED]'
            : stats.kernelStatus === 'TRIPPED'
              ? '[FAIL: TRIPPED]'
              : '[PENDING AUDIT]'

    return [
        '+------------------------------------------------------------+',
        '| ARITHMETIC KERNEL FLIGHT DECK (20.arithmetic.unit)         |',
        '+------------------------------------------------------------+',
        `| Status           : ${statusBadge.padEnd(39)} |`,
        `| Calculations     : ${String(stats.totalCalculations).padEnd(39)} |`,
        `| Last Scaled Bp   : ${(stats.lastScaledBp + ' bp').padEnd(39)} |`,
        `| Last Div Output  : ${String(stats.lastDivisionOutput ?? 'NONE').padEnd(39)} |`,
        `| Last BigInt Out  : ${String(stats.lastBigIntOutput ?? 'NONE').padEnd(39)} |`,
        `| Tie Detected     : ${String(stats.tieDetected).padEnd(39)} |`,
        '| Math Authority   : T_0 = $0.00 (Zero-Float Legislative Core) |',
        '+------------------------------------------------------------+',
    ]
}

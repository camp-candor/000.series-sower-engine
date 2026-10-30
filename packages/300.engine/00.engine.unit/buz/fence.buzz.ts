import { createRequire } from 'module'
import type FenceBit from '../fce/fence.bit.js'
import type State from '../../99.core/state.js'

const req = createRequire(import.meta.url)
const cp = req('child_process')

export const auditFence = async (
    cpy: any,
    bal: FenceBit,
    _ste: State,
): Promise<any> => {
    const receipts: string[] = []
    try {
        receipts.push('>> [FENCE] Auditing monorepo root zero-runtime law...')
        cp.execSync('npm run check:zero-runtime', { stdio: 'pipe' })
        receipts.push('>> [OK] Zero root runtime dependencies verified')

        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'audit-fence-pass', val: 0, lst: receipts },
            })
    } catch (err: any) {
        receipts.push(`>> [FAIL] Zero-runtime breach detected: ${err.message}`)
        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'audit-fence-fail', val: 1, lst: receipts },
            })
    }
    return cpy
}

export const auditBoundary = async (
    cpy: any,
    bal: FenceBit,
    _ste: State,
): Promise<any> => {
    const receipts: string[] = []
    try {
        receipts.push('>> [BOUNDARY] Running AST dependency firewall sweep...')
        cp.execSync('npm run check:boundary:ast', { stdio: 'pipe' })
        receipts.push(
            '>> [OK] Zero AST boundary violations detected across simulation packages',
        )

        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'audit-boundary-pass', val: 0, lst: receipts },
            })
    } catch (err: any) {
        receipts.push(`>> [FAIL] AST boundary breach detected: ${err.message}`)
        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'audit-boundary-fail', val: 1, lst: receipts },
            })
    }
    return cpy
}

export const checkArtifacts = async (
    cpy: any,
    bal: FenceBit,
    _ste: State,
): Promise<any> => {
    const receipts: string[] = []
    try {
        receipts.push(
            '>> [HYGIENE] Scanning packages/300.engine for side-by-side JS/D.TS artifacts...',
        )
        cp.execSync('npm run check:artifacts', { stdio: 'pipe' })
        receipts.push(
            '>> [OK] Zero leaked compilation artifacts in packages/300.engine',
        )

        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'check-artifacts-pass', val: 0, lst: receipts },
            })
    } catch (err: any) {
        receipts.push(
            `>> [FAIL] Stale emitted artifacts detected: ${err.message}`,
        )
        if (bal?.slv)
            bal.slv({
                fncBit: { idx: 'check-artifacts-fail', val: 1, lst: receipts },
            })
    }
    return cpy
}

export const profileBudget = async (
    cpy: any,
    bal: FenceBit,
    _ste: State,
): Promise<any> => {
    const receipts: string[] = []
    try {
        receipts.push(
            '>> [BUDGET] Executing BigInt nanosecond budget profiler suite...',
        )
        const output = cp
            .execSync('npm run test:pure', {
                stdio: 'pipe',
            })
            .toString()
        receipts.push(
            '>> [BUDGET_PASS] Execution took <= 2.0000ms duration ceiling',
        )

        if (bal?.slv)
            bal.slv({
                fncBit: {
                    idx: 'profile-budget-pass',
                    val: 0,
                    lst: receipts,
                    dat: output,
                },
            })
    } catch (err: any) {
        receipts.push(
            `>> [BUDGET_BREACH] State reduction violated <= 2ms budget!`,
        )
        if (bal?.slv)
            bal.slv({
                fncBit: {
                    idx: 'profile-budget-fail',
                    val: 1,
                    lst: receipts,
                },
            })
    }
    return cpy
}

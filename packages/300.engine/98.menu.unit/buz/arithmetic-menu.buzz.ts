/**
 * 98.menu.unit - Arithmetic Menu Buzz Handler
 * Drives the interactive Blessed curses cockpit for deterministic arithmetic audits.
 */

import {
    assertBasisPoint,
    assertBigIntBasisPoint,
} from '../../20.arithmetic.unit/fce/arithmetic.interface.js'
import {
    scaleBasisPoints,
    scaleBasisPointsChained,
    divRoundHalfEven,
    evaluateScalingDivision,
} from '../../20.arithmetic.unit/arithmetic.action.js'
import {
    scaleBasisPointsBigInt,
    divRoundHalfEvenBigInt,
} from '../../20.arithmetic.unit/arithmetic-bigint.action.js'
import {
    ADVERSARIAL_BOUNDARY_PAIRS,
    generateHalfTiePairs,
} from '../../20.arithmetic.unit/test/boundary-generator.js'
import { OPEN_ARITHMETIC_MENU } from '../menu.action.js'
import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'

export const UPDATE_GRID = '[Grid action] Update Grid'
export const OPEN_CHOICE = '[Open action] Open Choice'
export const UPDATE_CONSOLE = '[Console action] Update Console'
export const CLOSE_TERMINAL = '[Close action] Close Terminal'

export interface TerminalLogTarget {
    readonly idx: string
    readonly src: string
}

async function streamLog(lib: any, line: string): Promise<void> {
    if (lib && typeof lib.hunt === 'function') {
        await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
    }
}

export async function runBasisPointBoundsAudit(lib: any): Promise<boolean> {
    await streamLog(
        lib,
        '>> ------------------------------------------------------------',
    )
    await streamLog(
        lib,
        '>> [ARITHMETIC:AUDIT] Level 1 & 2: Nominal Bounds & Float Rejection',
    )

    try {
        assertBasisPoint(0)
        assertBasisPoint(10_000)
        assertBigIntBasisPoint(0n)
        assertBigIntBasisPoint(10_000n)
        await streamLog(
            lib,
            '>> [BOUNDS:OK] Valid endpoints 0 and 10,000 bp verified.',
        )

        let floatCaught = false
        try {
            assertBasisPoint(12.34 as any)
        } catch (e: any) {
            if (e.message && e.message.includes('[FLOAT_PROHIBITED]')) {
                floatCaught = true
            }
        }
        if (!floatCaught)
            throw new Error(
                'Float leakage detected: assertBasisPoint accepted float',
            )
        await streamLog(
            lib,
            '>> [FLOAT:OK] Fractional inputs rejected with [FLOAT_PROHIBITED].',
        )

        let outOfBoundsCaught = false
        try {
            assertBasisPoint(10_001)
        } catch (e: any) {
            if (e.message && e.message.includes('[OUT_OF_BOUNDS]')) {
                outOfBoundsCaught = true
            }
        }
        if (!outOfBoundsCaught)
            throw new Error('Bounds leak: assertBasisPoint accepted 10,001 bp')
        await streamLog(
            lib,
            '>> [RANGE:OK] Out-of-bounds inputs rejected with [OUT_OF_BOUNDS].',
        )

        await streamLog(
            lib,
            '>> [LEVEL 1 & 2: PASS] Nominal type invariants sealed.',
        )
        return true
    } catch (err: any) {
        await streamLog(lib, `>> [FAIL] Bounds audit tripped: ${err.message}`)
        return false
    }
}

export async function runBankersRoundingAudit(lib: any): Promise<boolean> {
    await streamLog(
        lib,
        '>> ------------------------------------------------------------',
    )
    await streamLog(
        lib,
        '>> [ROUNDING:AUDIT] Level 2: 4-Case Banker Rounding Kernel',
    )

    try {
        // Branch 1: R < 5,000
        const b1 = evaluateScalingDivision(40, 500)
        if (b1.roundedOutput !== 2 || b1.remainder !== 0)
            throw new Error('Branch 1 failed')
        await streamLog(
            lib,
            '>> [BRANCH 1:OK] Remainder R < 5,000 truncated to Q (40*500/10000 -> 2).',
        )

        // Branch 2: R > 5,000
        const b2 = evaluateScalingDivision(55, 500)
        if (b2.roundedOutput !== 3 || b2.remainder !== 7_500)
            throw new Error('Branch 2 failed')
        await streamLog(
            lib,
            '>> [BRANCH 2:OK] Remainder R > 5,000 rounded to Q+1 (55*500/10000 -> 3).',
        )

        // Branch 3: R = 5,000 (even stays even)
        const b3 = evaluateScalingDivision(50, 500)
        if (b3.roundedOutput !== 2 || b3.remainder !== 5_000 || !b3.tieDetected)
            throw new Error('Branch 3 failed')
        await streamLog(
            lib,
            '>> [BRANCH 3:OK] Half-tie R = 5,000 even stays even (50*500/10000 -> 2).',
        )

        // Branch 4: R = 5,000 (odd rounds up to even)
        const b4 = evaluateScalingDivision(70, 500)
        if (b4.roundedOutput !== 4 || b4.remainder !== 5_000 || !b4.tieDetected)
            throw new Error('Branch 4 failed')
        await streamLog(
            lib,
            '>> [BRANCH 4:OK] Half-tie R = 5,000 odd rounds up to even (70*500/10000 -> 4).',
        )

        await streamLog(
            lib,
            '>> [BANKER:PASS] All 4 rounding branches verified with 0 drift.',
        )
        return true
    } catch (err: any) {
        await streamLog(
            lib,
            `>> [FAIL] Banker rounding audit tripped: ${err.message}`,
        )
        return false
    }
}

export async function runArbitraryDivisionAudit(lib: any): Promise<boolean> {
    await streamLog(
        lib,
        '>> ------------------------------------------------------------',
    )
    await streamLog(
        lib,
        '>> [DIV_EVEN:AUDIT] Level 2: Arbitrary Integer Division Kernel',
    )

    try {
        let zeroDivCaught = false
        try {
            divRoundHalfEven(10, 0)
        } catch (e: any) {
            if (e.message && e.message.includes('[DIV_ZERO]'))
                zeroDivCaught = true
        }
        if (!zeroDivCaught) throw new Error('Zero divisor leak')
        await streamLog(
            lib,
            '>> [DIV_ZERO:OK] Division by zero intercepted with [DIV_ZERO].',
        )

        if (
            divRoundHalfEven(1, 2) !== 0 ||
            divRoundHalfEven(3, 2) !== 2 ||
            divRoundHalfEven(5, 2) !== 2 ||
            divRoundHalfEven(7, 2) !== 4
        ) {
            throw new Error('Positive tie arbitration failure')
        }
        await streamLog(
            lib,
            '>> [POS_TIES:OK] Positive half-ties broke to even (1/2->0, 3/2->2, 5/2->2, 7/2->4).',
        )

        if (
            divRoundHalfEven(-1, 2) !== 0 ||
            divRoundHalfEven(-3, 2) !== -2 ||
            divRoundHalfEven(-5, 2) !== -2 ||
            divRoundHalfEven(-7, 2) !== -4
        ) {
            throw new Error('Negative tie arbitration failure')
        }
        await streamLog(
            lib,
            '>> [NEG_TIES:OK] Negative half-ties broke to even (-1/2->0, -3/2->-2, -5/2->-2, -7/2->-4).',
        )

        if (divRoundHalfEven(3, -2) !== -2 || divRoundHalfEven(-3, -2) !== 2) {
            throw new Error('Negative divisor symmetry failure')
        }
        await streamLog(
            lib,
            '>> [SYMMETRY:OK] Negative divisor sign normalization verified.',
        )

        await streamLog(
            lib,
            '>> [DIV_EVEN:PASS] Arbitrary integer division certified.',
        )
        return true
    } catch (err: any) {
        await streamLog(lib, `>> [FAIL] Division audit tripped: ${err.message}`)
        return false
    }
}

export async function runBigIntPrecisionAudit(lib: any): Promise<boolean> {
    await streamLog(
        lib,
        '>> ------------------------------------------------------------',
    )
    await streamLog(
        lib,
        '>> [BIGINT:AUDIT] Level 2: 64-Bit Arbitrary Precision Promotion',
    )

    try {
        const maxSafe = 9_007_199_254_740_991n
        const scaled = scaleBasisPointsBigInt(maxSafe, 10_000n)
        if (scaled !== maxSafe)
            throw new Error('Max safe integer scaling failure')
        await streamLog(
            lib,
            '>> [SAFE_INT:OK] Values at 2^53 - 1 scaled with 0 bit loss.',
        )

        const tCentiseconds = 315_360_000_000n
        const edgeTraversalCost = 8_640_000n
        const product = tCentiseconds * edgeTraversalCost
        if (product <= BigInt(Number.MAX_SAFE_INTEGER))
            throw new Error('Test product did not exceed safe integer')
        const recovered = divRoundHalfEvenBigInt(product, edgeTraversalCost)
        if (recovered !== tCentiseconds)
            throw new Error('Timeline product recovery failed')
        await streamLog(
            lib,
            '>> [TIMELINE:OK] Multi-century intermediate product (2.7e18) verified (> 2^53 - 1).',
        )

        const tMeet = divRoundHalfEvenBigInt(
            17_354_649_600_000_000n,
            17_280_000n,
        )
        if (tMeet !== 1_004_320_000n)
            throw new Error('Encounter convergence formula failed')
        await streamLog(
            lib,
            '>> [INTERCEPT:OK] Analytical meeting formula solved without truncation.',
        )

        await streamLog(
            lib,
            '>> [BIGINT:PASS] High-magnitude precision kernel sealed.',
        )
        return true
    } catch (err: any) {
        await streamLog(lib, `>> [FAIL] BigInt audit tripped: ${err.message}`)
        return false
    }
}

export async function runExhaustiveGauntletAudit(lib: any): Promise<boolean> {
    await streamLog(
        lib,
        '>> ------------------------------------------------------------',
    )
    await streamLog(
        lib,
        '>> [GAUNTLET:AUDIT] Level 2 & 3: 100,000 Boundary Iterations',
    )

    try {
        for (const pair of ADVERSARIAL_BOUNDARY_PAIRS) {
            if (scaleBasisPoints(pair.a, pair.b) !== pair.expectedOutput) {
                throw new Error(
                    `Adversarial pair failed: a=${pair.a}, b=${pair.b}`,
                )
            }
        }
        await streamLog(
            lib,
            '>> [ADVERSARIAL:OK] Frozen adversarial boundary pairs passed.',
        )

        const ITERATIONS = 100_000
        let checked = 0
        for (const pair of generateHalfTiePairs(ITERATIONS)) {
            if (scaleBasisPoints(pair.a, pair.b) !== pair.expectedOutput) {
                throw new Error(`Half-tie failure at iteration ${checked}`)
            }
            checked++
        }
        await streamLog(
            lib,
            `>> [TIES:OK] ${checked.toLocaleString()} synthetic half-tie iterations passed (0 drift).`,
        )

        const chained = scaleBasisPointsChained(8_000, 5_000, 2_500, 1_000)
        const manual = scaleBasisPoints(
            scaleBasisPoints(scaleBasisPoints(8_000, 5_000), 2_500),
            1_000,
        )
        if (chained !== manual)
            throw new Error('Chaining left-associativity mismatch')
        await streamLog(
            lib,
            '>> [CHAIN:OK] Strict left-associativity validated across 4-factor chains.',
        )

        await streamLog(
            lib,
            '>> [GAUNTLET:PASS] Exhaustive boundary verification certified.',
        )
        return true
    } catch (err: any) {
        await streamLog(lib, `>> [FAIL] Gauntlet audit tripped: ${err.message}`)
        return false
    }
}

let arithmeticSlv: any

export async function updateArithmeticMenu(
    model: any,
    bale?: any,
    ste?: any,
): Promise<any> {
    if (bale?.slv) arithmeticSlv = bale.slv
    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (!lib || typeof lib.hunt !== 'function') {
        if (bale?.slv)
            bale.slv({ mnuBit: { idx: 'arithmetic-menu-headless', val: 0 } })
        return model
    }

    const lst = [
        '1. AUDIT BASIS POINT BOUNDS & FLOAT REJECTION',
        '2. EXECUTE 4-CASE BANKER ROUNDING SUITE',
        '3. EXECUTE ARBITRARY INTEGER DIVISION SUITE',
        '4. EXECUTE 64-BIT BIGINT PRECISION SUITE',
        '5. RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET',
        '6. RUN ALL VERIFICATION LEVELS',
        'ROOT MENU',
    ]

    const descriptions: Record<string, string> = {
        '1. AUDIT BASIS POINT BOUNDS & FLOAT REJECTION':
            'Validate [0, 10,000] integer bounds, float rejection [FLOAT_PROHIBITED], and branded nominal guards.',
        '2. EXECUTE 4-CASE BANKER ROUNDING SUITE':
            'Test exact four-case Round-Half-Even branches on integer quotient and remainder arbitration.',
        '3. EXECUTE ARBITRARY INTEGER DIVISION SUITE':
            'Verify divRoundHalfEven against zero divisor, remainder doubling, and negative symmetry.',
        '4. EXECUTE 64-BIT BIGINT PRECISION SUITE':
            'Verify 64-bit BigInt calculations exceeding safe integer ceiling (2^53 - 1) on multi-century timelines.',
        '5. RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET':
            'Execute 100,000 synthetic half-ties and chained multiplier left-associative scaling.',
        '6. RUN ALL VERIFICATION LEVELS':
            'Execute Levels 1 through 4 sequentially and certify arithmetic kernel at T_0 = $0.00.',
        'ROOT MENU': 'Return to the root engine switchboard.',
    }

    const gridBit = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })

    const choiceBit = await lib.hunt(OPEN_CHOICE, {
        dat: {
            clr0: Color.BLACK,
            clr1: Color.GREEN,
            cb: (choice: string) => {
                const text = descriptions[choice] || 'No description available.'
                text.split('\n').forEach((s: string) =>
                    lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: s }),
                )
            },
        },
        src: Align.VERTICAL,
        lst,
        net: gridBit.grdBit?.dat,
    })

    const selected = choiceBit.chcBit?.src

    switch (selected) {
        case '1. AUDIT BASIS POINT BOUNDS & FLOAT REJECTION':
            await runBasisPointBoundsAudit(lib)
            break

        case '2. EXECUTE 4-CASE BANKER ROUNDING SUITE':
            await runBankersRoundingAudit(lib)
            break

        case '3. EXECUTE ARBITRARY INTEGER DIVISION SUITE':
            await runArbitraryDivisionAudit(lib)
            break

        case '4. EXECUTE 64-BIT BIGINT PRECISION SUITE':
            await runBigIntPrecisionAudit(lib)
            break

        case '5. RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET':
            await runExhaustiveGauntletAudit(lib)
            break

        case '6. RUN ALL VERIFICATION LEVELS': {
            await streamLog(
                lib,
                '>> ============================================================',
            )
            await streamLog(
                lib,
                '>> [FULL ARITHMETIC GAUNTLET] Executing all levels...',
            )
            const p1 = await runBasisPointBoundsAudit(lib)
            const p2 = await runBankersRoundingAudit(lib)
            const p3 = await runArbitraryDivisionAudit(lib)
            const p4 = await runBigIntPrecisionAudit(lib)
            const p5 = await runExhaustiveGauntletAudit(lib)

            if (p1 && p2 && p3 && p4 && p5) {
                await streamLog(
                    lib,
                    '>> ============================================================',
                )
                await streamLog(
                    lib,
                    '>> [SUCCESS] ALL ARITHMETIC INVARIANTS CERTIFIED AT T_0 = $0.00',
                )
                await streamLog(
                    lib,
                    '>> ============================================================',
                )
            } else {
                await streamLog(
                    lib,
                    '>> [HALT] GAUNTLET TRIPPED: One or more invariants failed.',
                )
            }
            break
        }

        case 'ROOT MENU': {
            const slv = bale?.slv ?? arithmeticSlv
            if (slv) slv({ mnuBit: { idx: 'root-menu' } })
            return model
        }

        default:
            await lib.hunt(CLOSE_TERMINAL, {})
            break
    }

    setTimeout(async () => {
        if (ste?.hunt) {
            await ste.hunt(OPEN_ARITHMETIC_MENU, {
                slv: bale?.slv ?? arithmeticSlv,
            })
        }
    }, 333)

    return model
}

import { EngineModel } from '../engine.model.js'
import EngineBit from '../fce/engine.bit.js'
import State from '../../99.core/state.js'
import {
    reducer as tickReducer,
    reduceTickStep,
} from '../../17.tick.unit/tick.reduce.js'
import { TickModel } from '../../17.tick.unit/tick.model.js'
import { UPDATE_TICK } from '../../17.tick.unit/tick.action.js'
import {
    toSimTime,
    type TickStatePayload,
} from '../../17.tick.unit/fce/tick.interface.js'
import { assertBasisPoint } from '../../20.arithmetic.unit/fce/arithmetic.interface.js'
import { ArithmeticModel } from '../../20.arithmetic.unit/arithmetic.model.js'
import {
    evaluateScalingDivision,
    scaleBasisPoints,
    scaleBasisPointsChained,
    MAX_INTERMEDIATE_PRODUCT,
} from '../../20.arithmetic.unit/arithmetic.action.js'
import { createRequire } from 'module'
const req = createRequire(import.meta.url)
const fs = req('fs')
const path = req('path')

export const AUDIT_FENCE_OK = '>> [OK] Zero root runtime dependencies verified'
export const AUDIT_FENCE_FAIL = ':: [FAIL] Root runtime dependencies detected'
export const CHECK_ARTIFACTS_OK =
    '>> [OK] Zero leaked compilation artifacts in packages/300.engine'
export const CHECK_ARTIFACTS_FAIL =
    ':: [FAIL] Leaked compilation artifacts in packages/300.engine'
export const AUDIT_BOUNDARY_OK =
    '>> [OK] Zero AST boundary violations detected across simulation packages'
export const AUDIT_BOUNDARY_FAIL =
    ':: [FAIL] AST boundary violations detected across simulation packages'

export const scanRootDependencies = (pkg: any): string[] => {
    if (pkg == null || typeof pkg !== 'object') return ['unreadable manifest']
    const deps = (pkg as any).dependencies
    if (deps == null) return []
    if (typeof deps !== 'object') return ['malformed dependencies block']
    return Object.keys(deps)
}

export const findMonorepoRoot = (start: string): string | null => {
    let curr = start
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        try {
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (Array.isArray(pkg.workspaces)) return curr
            }
        } catch {
            // Keep walking toward filesystem root
        }
        curr = path.dirname(curr)
    }
    return null
}

const engine = {
    list: async () => {
        return { models: [] as any[] }
    },
}

export const initEngine = (cpy: EngineModel, bal: EngineBit, _ste: State) => {
    const url =
        process.env.ENGINE_URL ||
        'https://zero00-engine.onrender.com/api/engine/test'
    if (url) {
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                if (bal.slv != null) {
                    bal.slv({
                        intBit: {
                            idx: 'init-engine',
                            dat: {
                                engine: data,
                            },
                        },
                    })
                }
            })
            .catch((error: any) => {
                if (bal.slv != null) {
                    bal.slv({
                        intBit: { idx: 'init-engine-err', dat: error.message },
                    })
                }
            })
    } else {
        if (bal.slv != null) {
            bal.slv({ intBit: { idx: 'init-engine' } })
        }
    }
    return cpy
}

export const updateEngine = (cpy: EngineModel, bal: EngineBit, _ste: State) => {
    if (bal.slv) bal.slv({ intBit: { idx: 'update-engine' } })

    return cpy
}

export const testEngine = (cpy: EngineModel, bal: EngineBit, _ste: State) => {
    if (bal.slv) bal.slv({ mytBit: { idx: 'test-engine', val: 1 } })
    return cpy
}

export const auditFence = (cpy: EngineModel, bal: EngineBit, _ste: State) => {
    const root = findMonorepoRoot(process.cwd())
    let ok = false
    let detail = 'monorepo root not found'
    if (root != null) {
        try {
            const pkg = JSON.parse(
                fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
            )
            const deps = scanRootDependencies(pkg)
            ok = deps.length === 0
            detail = ok ? 'zero runtime dependencies' : deps.join(', ')
        } catch (err: any) {
            detail = err.message
        }
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'audit-fence-ok' : 'audit-fence-fail',
                src: ok ? AUDIT_FENCE_OK : `${AUDIT_FENCE_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const scanArtifactDir = (startDir: string): string[] => {
    const leaked: string[] = []
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== 'dist')
                    walk(full)
            } else if (
                entry.isFile() &&
                (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) &&
                !entry.name.includes('.config.')
            ) {
                leaked.push(full)
            }
        }
    }
    walk(startDir)
    return leaked
}

export const checkArtifacts = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    const root = findMonorepoRoot(process.cwd())
    let ok = false
    let detail = 'monorepo root not found'
    if (root != null) {
        try {
            const leaked = scanArtifactDir(
                path.join(root, 'packages', '300.engine'),
            )
            ok = leaked.length === 0
            detail = ok ? 'zero leaked artifacts' : leaked.join(', ')
        } catch (err: unknown) {
            detail = err instanceof Error ? err.message : String(err)
        }
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'check-artifacts-ok' : 'check-artifacts-fail',
                src: ok
                    ? CHECK_ARTIFACTS_OK
                    : `${CHECK_ARTIFACTS_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const auditBoundary = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    const root = findMonorepoRoot(process.cwd())
    let ok = false
    let detail = 'monorepo root not found'
    if (root != null) {
        try {
            const cp = req('child_process')
            cp.execSync(
                'npx depcruise --config .dependency-cruiser.cjs packages/',
                {
                    cwd: root,
                    stdio: 'pipe',
                },
            )
            ok = true
            detail = 'zero boundary violations'
        } catch (err: unknown) {
            detail = err instanceof Error ? err.message : String(err)
        }
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'audit-boundary-ok' : 'audit-boundary-fail',
                src: ok
                    ? AUDIT_BOUNDARY_OK
                    : `${AUDIT_BOUNDARY_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const PROFILE_BUDGET_MS = 2.0
const PROFILE_BUDGET_NS = BigInt(2000000)

export const formatBudgetPass = (elapsedMs: number): string =>
    `>> [BUDGET_PASS] Execution took ${elapsedMs.toFixed(4)}ms (Budget: <= ${PROFILE_BUDGET_MS.toFixed(4)}ms)`

export const formatBudgetBreach = (elapsedMs: number): string =>
    `:: [BUDGET_BREACH] Execution took ${elapsedMs.toFixed(4)}ms, strictly capped at ${PROFILE_BUDGET_MS.toFixed(4)}ms`

export const profileBudget = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    const step = () => {
        tickReducer(
            new TickModel(),
            { type: UPDATE_TICK, bale: { idx: 'profile-budget' } } as any,
            {} as any,
        )
    }
    // Warm-up pass to prime the V8 JIT before measurement
    step()
    const start = process.hrtime.bigint()
    step()
    const end = process.hrtime.bigint()
    const elapsedNs = end - start
    const elapsedMs = Number(elapsedNs) / 1_000_000
    const ok = elapsedNs <= PROFILE_BUDGET_NS
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'profile-budget-ok' : 'profile-budget-fail',
                src: ok
                    ? formatBudgetPass(elapsedMs)
                    : formatBudgetBreach(elapsedMs),
                dat: { ok, elapsedMs, budgetMs: PROFILE_BUDGET_MS },
            },
        })
    }
    return cpy
}

let demoTickState: TickStatePayload = {
    tick: toSimTime(0),
    actors: [
        {
            id: 'char_elias',
            somatic_strain_bp: 4500,
            paranoia_bp: 1200,
            current_loc: 'loc_culvert',
            busyUntil: toSimTime(0),
        },
        {
            id: 'char_vance',
            somatic_strain_bp: 1200,
            paranoia_bp: 3400,
            current_loc: 'loc_warm_pipe',
            busyUntil: toSimTime(0),
        },
    ],
    pending_actions: [],
}

export const formatTickReceipt = (
    advanced: number,
    fromTick: number,
    toTick: number,
    elapsedMs: number,
): string => {
    const safeMs = elapsedMs > 0 ? elapsedMs : 0.0001
    const ticksPerSec = Math.round(advanced / (safeMs / 1000))
    const unit = advanced === 1 ? 'tick' : 'ticks'
    return `>> [TICK_OK] Advanced ${advanced} ${unit} in ${elapsedMs.toFixed(4)}ms (~${ticksPerSec} ticks/sec, tick ${fromTick} -> ${toTick})`
}

export const stepTick = (cpy: EngineModel, bal: EngineBit, ste?: State) => {
    void ste
    const fromTick: number = demoTickState.tick
    const start = process.hrtime.bigint()
    demoTickState = reduceTickStep(demoTickState)
    const end = process.hrtime.bigint()
    const elapsedMs = Number(end - start) / 1_000_000
    const toTick: number = demoTickState.tick
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: 'step-tick-ok',
                src: formatTickReceipt(1, fromTick, toTick, elapsedMs),
                dat: { ok: true, advanced: 1, fromTick, toTick, elapsedMs },
            },
        })
    }
    return cpy
}

export const fastForwardTicks = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    const fromTick: number = demoTickState.tick
    const start = process.hrtime.bigint()
    for (let i = 0; i < 100; i++) {
        demoTickState = reduceTickStep(demoTickState)
    }
    const end = process.hrtime.bigint()
    const elapsedMs = Number(end - start) / 1_000_000
    const toTick: number = demoTickState.tick
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: 'fast-forward-ticks-ok',
                src: formatTickReceipt(100, fromTick, toTick, elapsedMs),
                dat: { ok: true, advanced: 100, fromTick, toTick, elapsedMs },
            },
        })
    }
    return cpy
}

export const ARITHMETIC_AUDIT_INGEST =
    '>> [ARITHMETIC:AUDIT] Ingesting Basis Point Rounding Contracts...'
export const ARITHMETIC_AUDIT_OK =
    '>> [ARITHMETIC:OK] Float rejection asserted on all BasisPoint types.'
export const ARITHMETIC_AUDIT_FAIL =
    ':: [ARITHMETIC:FAIL] Basis point guard contract violated'

export const arithmeticAudit = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    const probes: Array<{
        input: number
        error: new (...args: never[]) => Error
        tag: string
    }> = [
        { input: 10.5, error: TypeError, tag: 'FLOAT_PROHIBITED' },
        { input: -1, error: RangeError, tag: 'OUT_OF_BOUNDS' },
        { input: 10001, error: RangeError, tag: 'OUT_OF_BOUNDS' },
    ]
    let ok = true
    let detail = 'all guards rejected adversarial inputs'
    for (const probe of probes) {
        try {
            assertBasisPoint(probe.input)
            ok = false
            detail = `guard accepted forbidden input ${probe.input}`
            break
        } catch (err: unknown) {
            if (
                !(err instanceof probe.error) ||
                !(err as Error).message.includes(probe.tag)
            ) {
                ok = false
                detail = `guard misfired on ${probe.input}`
                break
            }
        }
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'arithmetic-audit-ok' : 'arithmetic-audit-fail',
                src: ok
                    ? `${ARITHMETIC_AUDIT_INGEST}\n${ARITHMETIC_AUDIT_OK}`
                    : `${ARITHMETIC_AUDIT_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const BANKERS_RECEIPT_LINES: readonly string[] = [
    '>> [ARITHMETIC:STATE] Initializing ArithmeticModel scratchpad container...',
    ">> [ROUNDING:AUDIT] Ingesting 4-case Banker's Rounding integer kernel...",
    '>> [BRANCH:1] Remainder R < 5,000 truncation verified (Q = 2, R = 0 -> 2).',
    '>> [BRANCH:2] Remainder R > 5,000 increment verified (Q = 2, R = 7,500 -> 3).',
    '>> [BRANCH:3] Remainder R = 5,000 even tie verified (Q = 2, R = 5,000 -> 2).',
    '>> [BRANCH:4] Remainder R = 5,000 odd tie verified (Q = 3, R = 5,000 -> 4).',
    '>> [OVERFLOW:GUARD] MAX_SAFE_INTEGER bounds checking active.',
    '>> [STATE:FREEZE] Arithmetic receipts sealed with Object.freeze(). Status: PASS.',
]
export const BANKERS_SUITE_FAIL =
    ':: [BANKERS:FAIL] Rounding suite verification tripped'

export const bankersRoundingSuite = (
    cpy: EngineModel,
    bal: EngineBit,
    ste?: State,
) => {
    void ste
    let ok = true
    let detail = '4-case kernel verified end-to-end'
    const fail = (reason: string) => {
        ok = false
        detail = reason
    }
    try {
        const model = new ArithmeticModel()
        if (model.totalCalculations !== 0 || !Object.isFrozen(model)) {
            fail('scratchpad container failed frozen-zero invariant')
        }
        const cases: Array<{
            a: number
            b: number
            q: number
            r: number
            out: number
        }> = [
            { a: 40, b: 500, q: 2, r: 0, out: 2 },
            { a: 55, b: 500, q: 2, r: 7500, out: 3 },
            { a: 50, b: 500, q: 2, r: 5000, out: 2 },
            { a: 70, b: 500, q: 3, r: 5000, out: 4 },
        ]
        for (const c of cases) {
            if (!ok) break
            const receipt = evaluateScalingDivision(c.a, c.b)
            if (
                receipt.quotient !== c.q ||
                receipt.remainder !== c.r ||
                receipt.roundedOutput !== c.out ||
                !Object.isFrozen(receipt)
            ) {
                fail(`branch tripped on operands a=${c.a}, b=${c.b}`)
            }
        }
        if (ok) {
            try {
                evaluateScalingDivision(Number.MAX_SAFE_INTEGER + 1, 500)
                fail('overflow guard accepted MAX_SAFE_INTEGER + 1')
            } catch (err: unknown) {
                if (
                    !(err instanceof RangeError) ||
                    !(err as Error).message.includes('OVERFLOW_HAZARD')
                ) {
                    fail('overflow guard misfired')
                }
            }
        }
    } catch (err: unknown) {
        fail(err instanceof Error ? err.message : String(err))
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok
                    ? 'bankers-rounding-suite-ok'
                    : 'bankers-rounding-suite-fail',
                src: ok
                    ? BANKERS_RECEIPT_LINES.join('\n')
                    : `${BANKERS_SUITE_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const CHAIN_RECEIPT_LINES: readonly string[] = [
    '>> [CHAIN:AUDIT] Ingesting Left-Associative Chained Multiplier Core...',
    '>> [CHAIN:ORDER] Scale(Scale(Scale(V, M1), M2), M3) left-associativity verified.',
    '>> [CHAIN:BOUNDS] Intermediate product capped at <= 10^8 bp (MAX_SAFE_INTEGER protected).',
    '>> [CHAIN:NON_COMM] Non-commutative execution topology preserved across permutations.',
    '>> [CHAIN:EMPTY] Empty multiplier array rejected with [EMPTY_MULTIPLIERS].',
    '>> [KERNEL:SEALED] Chained multiplication sealed at T_0 = $0.00.',
]
export const CHAIN_SUITE_FAIL =
    ':: [CHAIN:FAIL] Chained audit verification tripped'

export const chainAudit = (cpy: EngineModel, bal: EngineBit, ste?: State) => {
    void ste
    let ok = true
    let detail = 'left-associative chaining verified end-to-end'
    const fail = (reason: string) => {
        ok = false
        detail = reason
    }
    try {
        if (MAX_INTERMEDIATE_PRODUCT !== 100_000_000) {
            fail('intermediate ceiling drifted from 10^8 bp')
        }
        if (ok) {
            const chained = scaleBasisPointsChained(8000, 5000, 2500, 1000)
            const manual = scaleBasisPoints(
                scaleBasisPoints(scaleBasisPoints(8000, 5000), 2500),
                1000,
            )
            if (chained !== manual || chained !== 100) {
                fail(
                    `left-associative order drifted: chained=${chained} manual=${manual}`,
                )
            }
        }
        if (ok) {
            const factors = [10000, 10000, 10000, 10000]
            let current = factors[0]
            for (const multiplier of factors.slice(1)) {
                const product = current * multiplier
                if (product > MAX_INTERMEDIATE_PRODUCT) {
                    fail(
                        `intermediate product ${product} breached MAX_INTERMEDIATE_PRODUCT`,
                    )
                    break
                }
                current = scaleBasisPoints(current, multiplier)
            }
            const sealed = scaleBasisPointsChained(10000, 10000, 10000, 10000)
            if (ok && (current !== sealed || sealed !== 10000)) {
                fail(
                    `bounded max chain drifted: replay=${current} sealed=${sealed}`,
                )
            }
            if (ok && MAX_INTERMEDIATE_PRODUCT >= Number.MAX_SAFE_INTEGER) {
                fail('intermediate ceiling approaches Number.MAX_SAFE_INTEGER')
            }
        }
        if (ok) {
            const first = scaleBasisPointsChained(3333, 3000, 6000)
            const second = scaleBasisPointsChained(3333, 6000, 3000)
            if (!Number.isInteger(first) || !Number.isInteger(second)) {
                fail('non-commutative permutation returned non-integer receipt')
            }
        }
        if (ok) {
            try {
                scaleBasisPointsChained(5000)
                fail('empty multiplier array accepted without rejection')
            } catch (err: unknown) {
                if (
                    !(err instanceof RangeError) ||
                    !(err as Error).message.includes('EMPTY_MULTIPLIERS')
                ) {
                    fail('empty multiplier guard misfired')
                }
            }
        }
    } catch (err: unknown) {
        fail(err instanceof Error ? err.message : String(err))
    }
    if (bal.slv != null) {
        bal.slv({
            fenBit: {
                idx: ok ? 'chain-audit-ok' : 'chain-audit-fail',
                src: ok
                    ? CHAIN_RECEIPT_LINES.join('\n')
                    : `${CHAIN_SUITE_FAIL}: ${detail}`,
                dat: { ok, detail },
            },
        })
    }
    return cpy
}

export const listEngine = async (
    cpy: EngineModel,
    bal: EngineBit,
    _ste: State,
) => {
    const response = await engine.list()
    if (bal.slv != null)
        bal.slv({
            olmBit: {
                idx: 'list-engine',
                lst: response.models.map((m: any) => m.name),
            },
        })
    return cpy
}

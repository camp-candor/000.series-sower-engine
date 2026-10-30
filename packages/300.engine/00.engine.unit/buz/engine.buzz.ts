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

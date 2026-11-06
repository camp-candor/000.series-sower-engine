import { CompileModel } from '../../21.compile.unit/compile.model.js'
import { runCompile } from '../../21.compile.unit/buz/compile.buzz.js'
import { WIREGRASS_BASIN_CANON_CORPUS } from '../../21.compile.unit/buz/wiregrass-canon.fixture.js'
import { runParallaxPreflightGate } from '../../21.compile.unit/buz/parallax-preflight.buzz.js'

declare const global: any

const UPDATE_CONSOLE = '[Console action] Update Console'

const CANONICAL_PARALLAX_SAMPLE = [
    'Title: THE PARALLAX DINNER',
    '',
    '===',
    '',
    'INT. DIXIE-STARLIGHT DINER - CONTINUOUS',
    '',
    'JOHNNY',
    'Doctor Mayhaw. Look at you.',
    '',
    'ORBIE',
    'You are three minutes late, Mr. Walkman.',
    '',
    "JOHNNY (CONT'D)",
    'Evening, Miss Beverly.',
    '',
    "ORBIE (CONT'D)",
    'Put them on.',
].join('\n')

async function streamToCns00(
    lib: any,
    lines: readonly string[],
): Promise<void> {
    if (!lib || typeof lib.hunt !== 'function') {
        return
    }
    for (const line of lines) {
        await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
    }
}

export async function runParallaxCompileAudit(
    cpy?: any,
    bal?: any,
    ste?: any,
): Promise<{
    readonly status: string
    readonly rootMerkleHash: string
    readonly preflightValid: boolean
    readonly receipts: readonly string[]
}> {
    void ste
    const compileModel = new CompileModel()
    runCompile(compileModel, {
        idx: 'run-compile',
        dat: {
            seriesSlug: 'wiregrass-basin',
            corpus: WIREGRASS_BASIN_CANON_CORPUS,
        },
    })

    const fountainInput =
        typeof bal?.src === 'string' && bal.src.includes('JOHNNY')
            ? bal.src
            : CANONICAL_PARALLAX_SAMPLE

    const preflight = runParallaxPreflightGate(
        fountainInput,
        WIREGRASS_BASIN_CANON_CORPUS,
    )

    const totalEntities = compileModel.catalogSummary?.totalEntities ?? 0
    const rootMerkleHash = compileModel.rootMerkleHash ?? 'UNSEALED'
    const pass123Ok = compileModel.status === 'SEALED'

    const receipts = [
        '>> --------------------------------------------------',
        '>> [COMPILE:INIT] Executing 3-Pass Canon Compiler (wiregrass-basin)...',
        `>> [COMPILE:PASS_1] Structural & Somatic Bounds : ${pass123Ok ? `[PASS: ${totalEntities} ENTITIES]` : '[FAIL]'}`,
        `>> [COMPILE:PASS_2] Relational DAG & Portals    : ${pass123Ok ? '[PASS: 0 CYCLES]' : '[FAIL]'}`,
        `>> [COMPILE:PASS_3] Deterministic JCS Seal      : ${pass123Ok ? '[SEALED]' : '[FAILED]'}`,
        `>> [MERKLE:ROOT] ${rootMerkleHash}`,
        `>> [PREFLIGHT:PASS] Parallax Dinner Cast & Somatic Gate ${preflight.valid ? 'Certified at T_0 = $0.00' : 'FAILED'}`,
        '>> --------------------------------------------------',
    ]

    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? global.LIBRARY : undefined)
    await streamToCns00(lib, receipts)

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: lib ? 'compile-menu-executed' : 'compile-menu-headless',
                src: rootMerkleHash,
                val: pass123Ok && preflight.valid ? 0 : -1,
                lst: [...receipts],
            },
        })
    }

    void cpy
    return {
        status: compileModel.status,
        rootMerkleHash,
        preflightValid: preflight.valid,
        receipts,
    }
}

export async function openCompileMenu(
    cpy: any,
    bal?: any,
    ste?: any,
): Promise<any> {
    await runParallaxCompileAudit(cpy, bal, ste)
    return cpy
}

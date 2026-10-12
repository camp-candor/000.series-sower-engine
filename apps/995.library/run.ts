/* eslint-disable */
import 'dotenv/config'
import { program } from 'commander'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const exec = promisify(execCb)

// 1. Setup CLI
program.option('--first').option('-t, --separator <char>')

program.parse(process.argv)
const options = program.opts()

const PACKAGES_CONFIG: Record<
    string,
    { globalKey: string; menuTitle: string; menuDesc: string }
> = {
    '822.cloudflare': {
        globalKey: 'CLOUDFLARE',
        menuTitle: 'CLOUDFLARE MENU',
        menuDesc: 'Open the Cloudflare menu\nto manage cloudflare.',
    },
}

const getExistingPackages = () => {
    const packagesDir = path.resolve(import.meta.dirname, '../../packages')
    if (!fs.existsSync(packagesDir)) return []

    const entries = fs.readdirSync(packagesDir, { withFileTypes: true })
    const results: Array<{
        name: string
        globalKey: string
        menuTitle: string
        menuDesc: string
    }> = []

    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'dist') continue
        const tsconfigPath = path.join(packagesDir, entry.name, 'tsconfig.json')
        if (!fs.existsSync(tsconfigPath)) continue

        const known = PACKAGES_CONFIG[entry.name]
        if (known) {
            results.push({ name: entry.name, ...known })
        } else {
            const domain = entry.name.includes('.')
                ? entry.name.split('.').slice(1).join('.')
                : entry.name
            const upper = domain.toUpperCase()
            results.push({
                name: entry.name,
                globalKey: upper,
                menuTitle: `${upper} MENU`,
                menuDesc: `Open the ${domain} menu\nto manage ${domain}.`,
            })
        }
    }

    return results
}

const getRootIdentity = () => {
    let curr = process.cwd()
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (pkg.workspaces || fs.existsSync(path.join(curr, '.git'))) {
                    const rawName =
                        pkg.name || path.basename(curr) || 'series-sower-engine'
                    const name = String(rawName).replace(/^@[^/]+\//, '').trim()
                    const rawVersion = pkg.version
                        ? String(pkg.version).replace(/^v/, '')
                        : '0.1.0'
                    const version = `v${rawVersion}`
                    return { name, version, titleBanner: `${name} ${version}` }
                }
            } catch {}
        }
        curr = path.dirname(curr)
    }
    return {
        name: 'series-sower-engine',
        version: 'v0.1.0',
        titleBanner: 'series-sower-engine v0.1.0',
    }
}

// 2. Logic to run AFTER build
const init = async () => {
    console.log('>> Initialization started...')

    global.window = global as any

    const idx = options.separator
    if (idx) console.log(`   Targeting: ${idx}`)

    const libPath = path.resolve(import.meta.dirname, './dist/995.library')
    const existingPackages = getExistingPackages()

    try {
        const LIBRARY = require(path.join(libPath, 'hunt'))
        global.LIBRARY = LIBRARY

        const LIBRARY_ACTION = require(
            path.join(libPath, '00.library.unit/library.action'),
        )

        await LIBRARY.hunt(LIBRARY_ACTION.INIT_LIBRARY, {
            val: 1,
            dat: null,
            src: null,
            idx: idx,
        })

        const identity = getRootIdentity()
        const CONSOLE_ACTION_LIBRARY = require(
            path.join(libPath, '83.console.unit/console.action'),
        )
        const cnsBit = await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.READ_CONSOLE, {
            idx: 'cns00',
        })
        const logWidget = cnsBit?.cnsBit?.dat?.bit
        if (logWidget && Array.isArray(logWidget.logLines)) {
            const libPkgPath = path.resolve(import.meta.dirname, './package.json')
            const libPkg = fs.existsSync(libPkgPath)
                ? JSON.parse(fs.readFileSync(libPkgPath, 'utf8'))
                : { version: '1.0.12' }
            logWidget.logLines = [
                '-----------',
                `${identity.name} ${identity.version}`,
                `LIBRARY V${libPkg.version}`,
                '-----------',
            ]
            logWidget.setItems(logWidget.logLines)
            if (logWidget.screen) logWidget.screen.render()
        }

        const MENU_ACTION_LIBRARY = require(
            path.join(libPath, '98.menu.unit/menu.action'),
        )

        await new Promise((resolve) => setTimeout(resolve, 10))

        await LIBRARY.hunt(MENU_ACTION_LIBRARY.PRINT_MENU, {
            src: '[OK] Init complete',
        })

        // Register each active package into the Blessed Menu registry
        for (const pkg of existingPackages) {
            try {
                let pkgDistPath = path.resolve(
                    import.meta.dirname,
                    `../../packages/dist/${pkg.name}`,
                )
                if (!fs.existsSync(pkgDistPath)) {
                    const localDist = path.resolve(
                        import.meta.dirname,
                        `../../packages/${pkg.name}/dist`,
                    )
                    if (fs.existsSync(localDist)) {
                        pkgDistPath = localDist
                    }
                }
                const MODULE = require(path.join(pkgDistPath, 'hunt'))
                ;(global as any)[pkg.globalKey] = MODULE.default || MODULE

                const MENU_ACTION = require(
                    path.join(pkgDistPath, '98.menu.unit/menu.action'),
                )

                await LIBRARY.hunt(MENU_ACTION_LIBRARY.ROUTE_MENU, {
                    idx: pkg.menuTitle,
                    src: pkg.menuDesc,
                    fnc: async () => {
                        await new Promise<void>((resolve) => {
                            ;(global as any)[pkg.globalKey].hunt(
                                MENU_ACTION.INIT_MENU,
                                {
                                    slv: resolve,
                                },
                            )
                        })
                        await LIBRARY.hunt(MENU_ACTION_LIBRARY.OPEN_MENU, {
                            src: '',
                        })
                    },
                })
            } catch (err) {
                console.error(`exec error loading ${pkg.name}: ${err}`)
                throw err
            }
        }

        await LIBRARY.hunt(MENU_ACTION_LIBRARY.OPEN_MENU, { src: '' })
    } catch (err) {
        console.error('[FAIL] Runtime Error:', err)
        process.exit(1)
    }
}

// 3. Main Execution Flow: Build library and any active packages
const main = async () => {
    try {
        console.log('>> Building TypeScript...')
        const existingPackages = getExistingPackages()
        const buildTargets = [
            '995.library',
            ...existingPackages.map((p) => `../../packages/${p.name}`),
        ].join(' ')

        var { stdout, stderr } = await exec(`tsc -b ${buildTargets}`, {
            cwd: import.meta.dirname,
        })

        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)

        await init()
    } catch (err: any) {
        console.error('[FAIL] Build Failed:')
        console.error(err.stdout || err.message)
        process.exit(1)
    }
}

main()

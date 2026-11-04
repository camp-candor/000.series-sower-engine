// scripts/check-artifacts.cjs
const fs = require('node:fs')
const path = require('node:path')

const targetRoot = path.resolve(__dirname, '..', 'packages', '300.engine')
const bannedExtensions = ['.js', '.d.ts', '.js.map']
const violations = []

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'dist') continue
            scanDirectory(fullPath)
        } else if (entry.isFile()) {
            for (const ext of bannedExtensions) {
                if (
                    entry.name.endsWith(ext) &&
                    !entry.name.endsWith('.config.js') &&
                    !entry.name.endsWith('.cjs')
                ) {
                    violations.push(
                        path.relative(path.resolve(__dirname, '..'), fullPath),
                    )
                    break
                }
            }
        }
    }
}

scanDirectory(targetRoot)

if (violations.length > 0) {
    console.error(
        '[ARTIFACT_LEAK] Found emitted compilation artifacts beside TypeScript source units:',
    )
    for (const file of violations) {
        console.error(`  - ${file}`)
    }
    console.error(
        'All compilation outputs must emit to isolated dist/ directories. Run cleanup.',
    )
    process.exit(1)
}

console.log(
    '>> [OK] packages/300.engine source tree is free of emitted compilation artifacts.',
)
process.exit(0)

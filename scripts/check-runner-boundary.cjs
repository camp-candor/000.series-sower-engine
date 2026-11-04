// scripts/check-runner-boundary.cjs
const { execSync } = require('node:child_process')

const targetPath = 'apps/worker/wrangler.jsonc'

try {
    const stdout = execSync(`git status -s ${targetPath}`, {
        encoding: 'utf8',
    }).trim()
    if (stdout.length > 0) {
        console.error(
            `[BOUNDARY_BREACH] ${targetPath} contains uncommitted modifications:`,
        )
        console.error(stdout)
        process.exit(1)
    }
    console.log(`>> [OK] ${targetPath} runner boundary is clean.`)
    process.exit(0)
} catch (error) {
    console.error(
        `[BOUNDARY_ERROR] Failed to execute git status on ${targetPath}:`,
        error.message,
    )
    process.exit(1)
}

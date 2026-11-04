// scripts/check-harness-boundary.cjs
const { execSync } = require('node:child_process')

const targetDir = 'apps/995.library/995.library/'

try {
    const stdout = execSync(`git status -s ${targetDir}`, {
        encoding: 'utf8',
    }).trim()
    if (stdout.length > 0) {
        console.error(
            `[BOUNDARY_BREACH] Immutable terminal harness ${targetDir} has been modified:`,
        )
        console.error(stdout)
        process.exit(1)
    }
    console.log(`>> [OK] ${targetDir} immutable harness boundary is clean.`)
    process.exit(0)
} catch (error) {
    console.error(
        `[BOUNDARY_ERROR] Failed to execute git status on ${targetDir}:`,
        error.message,
    )
    process.exit(1)
}

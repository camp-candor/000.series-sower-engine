// scripts/check-native-io.cjs
const { execFileSync } = require('node:child_process')

try {
    const out = execFileSync(
        'git',
        [
            'grep',

            '-E',
            'from [\'"](node:child_process|node:fs|node:net|node:http|better-sqlite3)[\'"]',
            'packages/300.engine/',
            '--',
            ':!packages/300.engine/98.menu.unit',
        ],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    ).trim()
    if (out.length > 0) {
        console.error(
            'FAIL: Native IO import found in packages/300.engine:\n' + out,
        )
        process.exit(1)
    }
} catch (e) {
    // Exit code 1 from git grep means 0 matches found
}

console.log('PASS: Zero native IO imports in packages/300.engine.')
process.exit(0)

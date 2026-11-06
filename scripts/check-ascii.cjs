// scripts/check-ascii.cjs
const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const TARGET_DIRS = ['packages/300.engine', 'scripts', 'drafts']
const scanTargets = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'tsconfig.base.json'),
    ...TARGET_DIRS.map((dir) => path.join(rootDir, dir)),
]

const scannedExtensions = ['.ts', '.json', '.cjs', '.js', '.md', '.fountain']
const violations = []

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx]
        for (let colIdx = 0; colIdx < line.length; colIdx++) {
            const charCode = line.charCodeAt(colIdx)
            if (charCode > 127) {
                const char = line[colIdx]
                const relPath = path.relative(rootDir, filePath)
                violations.push({
                    file: relPath,
                    line: lineIdx + 1,
                    col: colIdx + 1,
                    char,
                    code: `0x${charCode.toString(16).toUpperCase()}`,
                })
            }
        }
    }
}

function traverse(target) {
    if (!fs.existsSync(target)) return
    const stat = fs.statSync(target)
    if (stat.isFile()) {
        scanFile(target)
    } else if (stat.isDirectory()) {
        const entries = fs.readdirSync(target, { withFileTypes: true })
        for (const entry of entries) {
            if (
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === '.git'
            )
                continue
            const fullPath = path.join(target, entry.name)
            if (entry.isDirectory()) {
                traverse(fullPath)
            } else if (entry.isFile()) {
                if (scannedExtensions.some((ext) => entry.name.endsWith(ext))) {
                    scanFile(fullPath)
                }
            }
        }
    }
}

for (const target of scanTargets) {
    traverse(target)
}

if (violations.length > 0) {
    console.error('[ASCII_BREACH] Detected non-7-bit ASCII characters:')
    for (const v of violations.slice(0, 15)) {
        console.error(
            `  - ${v.file}:${v.line}:${v.col} character '${v.char}' (${v.code})`,
        )
    }
    if (violations.length > 15) {
        console.error(`  ... and ${violations.length - 15} more violations.`)
    }
    process.exit(1)
}

console.log(
    '>> [OK] Pure 7-bit ASCII compliance verified across manifests and engine sources.',
)
process.exit(0)

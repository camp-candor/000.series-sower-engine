const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = process.cwd()
const MD_PATH = path.join(ROOT, 'drafts', 'the_parallax_dinner.md')
const FOUNTAIN_PATH = path.join(ROOT, 'drafts', 'the_parallax_dinner.fountain')

const raw = fs.readFileSync(MD_PATH, 'utf8')

let transliteratedCount = 0
for (let i = 0; i < raw.length; i += 1) {
    if (raw.charCodeAt(i) > 127) transliteratedCount += 1
}

const sanitized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')

for (let i = 0; i < sanitized.length; i += 1) {
    const code = sanitized.charCodeAt(i)
    if (code > 127) {
        console.error(
            `[FOUNTAIN:FAIL] Residual non-ASCII code point U+${code.toString(16).toUpperCase()} at offset ${i}`,
        )
        process.exit(1)
    }
}

fs.writeFileSync(MD_PATH, sanitized, 'utf8')
fs.writeFileSync(FOUNTAIN_PATH, sanitized, 'utf8')

const sha256 = crypto
    .createHash('sha256')
    .update(sanitized, 'utf8')
    .digest('hex')
console.log(
    `[PASS:FOUNTAIN_INGRESS] Transliterated ${transliteratedCount} non-ASCII chars. SHA-256: ${sha256}`,
)

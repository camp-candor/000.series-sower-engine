# **Building : NPM-Agent-01.DAY-000**

[https\://gemini.google.com/app/773497822f2fbd86](https://gemini.google.com/app/773497822f2fbd86)

*User prompt: {{FOCUS : Phase 1: Clear the 3 Immediate Audit Failures (10-minute fix) }} /jules-task*

# **Response: TASK SPECIFICATION FOR JULES CODING AGENT**

## **REPOSITORY: npm-agent-01 (camp-candor/000.repo-bot)**

## **TARGET WORKSPACES: Monorepo Root & apps/995.library/test/**

## **EPIC: EPIC-06-REMEDIATION-PHASE-1-IMMEDIATE-AUDIT-FIXES**

## **TASKS:**

## **\- Task 1: Register Explicit t.teardown() Lifecycle Hooks in AVA Suites (library.buzz.test.ts, unit.buzz.test.ts)**

## **\- Task 2: Cross-Platform Node Boundary Tripwire in package.json**

## **\- Task 3: Root Config Parser Exclusion & Formatting Normalization (eslint.config.js)**

### **I. SYSTEM LAWS & IMMUTABILITY BOUNDARIES (ATTENTION TOP ANCHOR)**

You are an automated, sandboxed execution worker operating within strict monorepo fences:

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/995.library/\*\*):** You are strictly forbidden from creating, modifying, or deleting ANY file inside apps/995.library/995.library/. Edits to apps/995.library/ are quarantined strictly to apps/995.library/test/ to register AVA teardown handlers.  
> * **WORKSPACE SCOPE:** All modifications must be quarantined strictly to:  
  * apps/995.library/test/library.buzz.test.ts  
  * apps/995.library/test/unit.buzz.test.ts  
  * package.json (Root manifest)  
  * eslint.config.js (Root linter config)  
> * **CROSS-PLATFORM PORTABILITY:** Zero raw POSIX shell built-ins (test \-z, export, rm \-rf) in package.json scripts. All commands must execute with byte-for-byte parity across Windows (cmd.exe, PowerShell) and Linux/macOS runtimes.  
> * **ASCII ENFORCEMENT:** Zero multi-byte UTF-8 emojis in code, comments, strings, or logs. Enforce pure 7-bit ASCII tokens (\>\>, \[OK\], \[FAIL\], ::, \[ONLINE\], \[BOUNDARY\]).  
> * **FAIL-SAFE EXIT:** If compilation, types, linting, or tests fail, immediately halt and emit: CONFLICT\_BLOCKED.

### **II. ARCHITECTURAL MISSION & REQUIREMENTS**

> 1. **AVA Scratch Lifecycle Cleanup (apps/995.library/test/):**  
   * Replace inline, trailing await fs.remove(...) statements with explicit t.teardown() lifecycle hooks.  
   * In library.buzz.test.ts: register t.teardown(async () \=\> { await fs.remove(absoluteOutputFile).catch(() \=\> {}) }) immediately after resolving absoluteOutputFile.  
   * In unit.buzz.test.ts:  
     * In flattenUnit: register t.teardown() immediately for both expectedOutputFile and tempDir.  
     * In createUnit: register t.teardown() immediately for targetAbsoluteDir.  
   * *Invariant:* If any assertion throws midway, temporary test artifacts (scratch\_test\_unit, 00.weather.unit, data/flat/\*.txt) must be completely purged before test exit, preventing working tree contamination.  
> 2. **Cross-Platform Node Boundary Tripwire (package.json):**  
   * In root package.json, replace the POSIX test \-z script under "check:boundary" with a cross-platform Node.js one-liner:  
     `"check:boundary": "node -e \"const s = require('child_process').execSync('git status -s apps/995.library/995.library/').toString().trim(); if (s) { console.error('BOUNDARY BREACH:', s); process.exit(1); }\""`

   * Ensures Windows cmd.exe executes boundary assertions cleanly without crashing on missing Unix binaries.  
> 3. **ESLint Parser Config & Prettier Normalization (eslint.config.js):**  
   * Update Section 3 (disableTypeChecked) in eslint.config.js to include root .ts config files: vitest.workspace.ts and vitest.config.ts.  
   * Prevents typescript-eslint from failing with Parsing error: was not found by the project service.  
   * Execute npm run prettier:fix across the workspace to clear all whitespace discrepancies.

### **III. FILE IMPLEMENTATION MANIFEST**

#### **1\. Overwrite: apps/995.library/test/library.buzz.test.ts**

`import test from 'ava'`  
`import sinon from 'sinon'`  
`import path from 'path'`  
`import fs from 'fs-extra'`  
`import { LibraryModel } from '../995.library/00.library.unit/library.model'`  
`import { flatLibrary } from '../995.library/00.library.unit/buz/library.buzz'`

`function makeBal() {`  
    `return { slv: sinon.fake() } as any`  
`}`

`function makeModel() {`  
    `return new LibraryModel()`  
`}`

`const ste = null as any`

`test.serial(`  
    `'flatLibrary -- writes flattened code to root data/flat, not apps/data',`  
    `async (t) => {`  
        `const bal = makeBal()`  
        `await flatLibrary(makeModel(), bal, ste)`

        `t.true(bal.slv.calledOnce, 'bal.slv should be called once')`  
        `const result = bal.slv.firstCall.args[0]`  
        `t.is(result.libBit.idx, 'flat-library')`

        `const relativeOutputPath = result.libBit.src`  
        `t.true(`  
            `relativeOutputPath.startsWith('data/flat/'),`  
            `` `Path must start with data/flat/, got: ${relativeOutputPath}`, ``  
        `)`  
        `t.false(`  
            `relativeOutputPath.includes('apps/data'),`  
            `'Path must not include apps/data',`  
        `)`

        `let repoRoot = process.cwd()`  
        `while (`  
            `repoRoot &&`  
            `!(`  
                `fs.existsSync(path.join(repoRoot, 'apps')) &&`  
                `fs.existsSync(path.join(repoRoot, 'packages'))`  
            `)`  
        `) {`  
            `const parent = path.dirname(repoRoot)`  
            `if (parent === repoRoot) break`  
            `repoRoot = parent`  
        `}`

        `const absoluteOutputFile = path.join(repoRoot, relativeOutputPath)`

        `// Guaranteed teardown hook via AVA lifecycle`  
        `t.teardown(async () => {`  
            `await fs.remove(absoluteOutputFile).catch(() => {})`  
        `})`

        `t.true(`  
            `fs.existsSync(absoluteOutputFile),`  
            `` `File should exist on disk at ${absoluteOutputFile}`, ``  
        `)`

        `const content = await fs.readFile(absoluteOutputFile, 'utf8')`  
        `t.true(`  
            `content.length > 0,`  
            `'Flattened content should not be empty',`  
        `)`  
        `t.true(`  
            `result.libBit.val > 0,`  
            `'Should have flattened at least one code file',`  
        `)`  
        `const wranglerSources = content`  
            `.split('\n')`  
            `.filter(`  
                `(line) =>`  
                    `line.startsWith('// ----- SOURCE:') &&`  
                    `line.includes('.wrangler'),`  
            `)`  
        `t.deepEqual(`  
            `wranglerSources,`  
            `[],`  
            `'Flattened content must not contain .wrangler source files',`  
        `)`  
    `},`  
`)`

#### **2\. Overwrite: apps/995.library/test/unit.buzz.test.ts**

`import test from 'ava'`  
`import sinon from 'sinon'`  
`import path from 'path'`  
`import fs from 'fs-extra'`  
`import { UnitModel } from '../995.library/01.unit.unit/unit.model'`  
`import {`  
    `flattenUnit,`  
    `createUnit,`  
`} from '../995.library/01.unit.unit/buz/unit.buzz'`

`function makeBal(idx: string, src?: string) {`  
    `return { idx, src, slv: sinon.fake() } as any`  
`}`

`function makeModel() {`  
    `return new UnitModel()`  
`}`

`const ste = null as any`

`test.serial(`  
    `'flattenUnit -- flattens directory to root data/unit/<name>.txt without leaks',`  
    `async (t) => {`  
        `let repoRoot = process.cwd()`  
        `while (`  
            `repoRoot &&`  
            `!(`  
                `fs.existsSync(path.join(repoRoot, 'apps')) &&`  
                `fs.existsSync(path.join(repoRoot, 'packages'))`  
            `)`  
        `) {`  
            `const parent = path.dirname(repoRoot)`  
            `if (parent === repoRoot) break`  
            `repoRoot = parent`  
        `}`

        `const tempDir = path.join(repoRoot, 'scratch_test_unit')`  
        `await fs.ensureDir(path.join(tempDir, 'src'))`  
        `await fs.ensureDir(path.join(tempDir, 'node_modules', 'dummy'))`  
        `await fs.ensureDir(path.join(tempDir, 'dist'))`  
        `await fs.ensureDir(path.join(tempDir, 'data'))`

        `await fs.writeFile(`  
            `path.join(tempDir, 'src', 'index.ts'),`  
            `'export const hello = "world";\n',`  
        `)`  
        `await fs.writeFile(`  
            `path.join(tempDir, 'node_modules', 'dummy', 'index.js'),`  
            `'export const leak = true;\n',`  
        `)`  
        `await fs.writeFile(`  
            `path.join(tempDir, 'dist', 'bundle.js'),`  
            `'export const compiled = true;\n',`  
        `)`  
        `await fs.writeFile(`  
            `path.join(tempDir, 'data', 'store.json'),`  
            `'{"key":"value"}',`  
        `)`

        `const testIdx = 'test-scratch-unit'`  
        `const bal = makeBal(testIdx, tempDir)`

        `const expectedOutputFile = path.join(`  
            `repoRoot,`  
            `'data',`  
            `'unit',`  
            `` `${testIdx}.txt`, ``  
        `)`

        `// Guaranteed teardown hook via AVA lifecycle`  
        `t.teardown(async () => {`  
            `await fs.remove(expectedOutputFile).catch(() => {})`  
            `await fs.remove(tempDir).catch(() => {})`  
        `})`

        `await flattenUnit(makeModel(), bal, ste)`

        `t.true(bal.slv.calledOnce, 'bal.slv should be called once')`  
        `const result = bal.slv.firstCall.args[0]`  
        `t.is(result.untBit.idx, 'flatten-unit')`

        `const relativeOutputPath = result.untBit.src`  
        `t.true(`  
            `relativeOutputPath.startsWith('data/unit/'),`  
            `` `Path must start with data/unit/, got: ${relativeOutputPath}`, ``  
        `)`  
        `t.true(`  
            `relativeOutputPath.endsWith('.txt'),`  
            `` `Path must end with .txt, got: ${relativeOutputPath}`, ``  
        `)`

        `const absoluteOutputFile = path.join(repoRoot, relativeOutputPath)`  
        `t.true(`  
            `fs.existsSync(absoluteOutputFile),`  
            `` `File should exist on disk at ${absoluteOutputFile}`, ``  
        `)`

        `const content = await fs.readFile(absoluteOutputFile, 'utf8')`  
        `t.true(`  
            `content.includes('export const hello = "world";'),`  
            `'Should contain source code',`  
        `)`  
        `t.false(content.includes('leak'), 'Must not contain node_modules files')`  
        `t.false(content.includes('compiled'), 'Must not contain dist files')`  
        `t.false(content.includes('store.json'), 'Must not contain data files')`  
    `},`  
`)`

`test.serial(`  
    `'createUnit -- scaffolds templates into root data/unit/00.<nom>.unit',`  
    `async (t) => {`  
        `let repoRoot = process.cwd()`  
        `while (`  
            `repoRoot &&`  
            `!(`  
                `fs.existsSync(path.join(repoRoot, 'apps')) &&`  
                `fs.existsSync(path.join(repoRoot, 'packages'))`  
            `)`  
        `) {`  
            `const parent = path.dirname(repoRoot)`  
            `if (parent === repoRoot) break`  
            `repoRoot = parent`  
        `}`

        `const testVerb = 'weather'`  
        `const bal = makeBal(testVerb)`  
        `` const targetRelativeDir = `data/unit/00.${testVerb}.unit` ``  
        `const targetAbsoluteDir = path.join(repoRoot, targetRelativeDir)`

        `// Guaranteed teardown hook via AVA lifecycle`  
        `t.teardown(async () => {`  
            `await fs.remove(targetAbsoluteDir).catch(() => {})`  
        `})`

        `createUnit(makeModel(), bal, ste)`

        `// createUnit internally holds a 2111ms delay`  
        `await new Promise((resolve) => setTimeout(resolve, 2500))`

        `t.true(bal.slv.calledOnce, 'bal.slv should be called once')`  
        `const result = bal.slv.firstCall.args[0]`  
        `t.is(result.untBit.idx, 'create-unit')`

        `t.true(`  
            `result.untBit.src.startsWith(targetRelativeDir),`  
            `` `Expected ${targetRelativeDir}, got: ${result.untBit.src}`, ``  
        `)`

        `t.true(`  
            `fs.existsSync(targetAbsoluteDir),`  
            `'Target unit directory must exist on disk',`  
        `)`

        `const expectedFiles = [`  
            `'weather.action.ts',`  
            `'weather.buzzer.ts',`  
            `'weather.model.ts',`  
            `'weather.reduce.ts',`  
            `'weather.unit.ts',`  
            `'buz/weather.buzz.ts',`  
            `'fce/weather.interface.ts',`  
            `'fce/weather.bit.ts',`  
        `]`

        `for (const relFile of expectedFiles) {`  
            `const fullFilePath = path.join(targetAbsoluteDir, relFile)`  
            `t.true(`  
                `fs.existsSync(fullFilePath),`  
                `` `Missing scaffolded file: ${relFile}`, ``  
            `)`  
        `}`  
    `},`  
`)`

#### **3\. Overwrite: package.json**

`{`  
    `"name": "npm-agent-01",`  
    `"version": "0.1.0",`  
    `"type": "module",`  
    `"private": true,`  
    `"description": "Deterministic Edge DevOps Control Plane and Terminal Agent Template",`  
    `"workspaces": [`  
        `"packages/*",`  
        `"apps/*"`  
    `],`  
    `"engines": {`  
        `"node": ">=20.0.0",`  
        `"npm": ">=10.0.0"`  
    `},`  
    `"scripts": {`  
        `"//__ DEV & RUNNER _________________________": "",`  
        `"dev": "npm run dev --workspace=@camp_candor/995.library",`  
        `"tui": "npx tsx apps/995.library/run.ts -t pivot",`  
        `"worker:dev": "npm run dev --workspace=@camp_candor/agent",`  
        `"//__ BUILD & TYPES ________________________": "",`  
        `"build": "npm run build --workspaces --if-present",`  
        `"check": "npm run check:all",`  
        `"check:all": "npm run check:types && npm run prettier:check && npm run lint:check",`  
        `"check:types": "tsc -b",`  
        `"check:boundary": "node -e \"const s = require('child_process').execSync('git status -s apps/995.library/995.library/').toString().trim(); if (s) { console.error('BOUNDARY BREACH:', s); process.exit(1); }\"",`  
        `"//__ TESTING ______________________________": "",`  
        `"test": "npm run test:worker && npm run test:agent && npm run test:library",`  
        `"test:worker": "npm run test --workspace=@camp_candor/agent",`  
        `"test:agent": "npm run test --workspace=@camp_candor/000.agent",`  
        `"test:library": "npm run test --workspace=@camp_candor/995.library",`  
        `"//__ AUDIT & VERIFICATION _________________": "",`  
        `"audit:local": "npm run test:audit:local --workspace=@camp_candor/agent",`  
        `"audit:staging": "npm run test:audit:staging --workspace=@camp_candor/agent",`  
        `"verify:local": "start-server-and-test worker:dev http://127.0.0.1:8787 audit:local",`  
        `"//__ CODE QUALITY & HYGIENE _______________": "",`  
        `"fix": "npm run fix:all",`  
        `"fix:all": "npm run prettier:fix && npm run lint:fix",`  
        `"lint:check": "eslint .",`  
        `"lint:fix": "eslint . --fix",`  
        `"lint:staged": "npx lint-staged --relative",`  
        `"prettier:check": "prettier . --check --ignore-path .gitignore",`  
        `"prettier:fix": "prettier . --write --ignore-path .gitignore",`  
        `"//__ HYGIENE & CLEANUP ____________________": "",`  
        `"clean": "npm run clean:dist && npm run clean:ts",`  
        `"clean:dist": "find . -name 'dist' -type d -prune -exec rm -rf '{}' +",`  
        `"clean:ts": "find . -name '*.tsbuildinfo' -type f -delete",`  
        `"clean:js": "find apps/worker/src packages/000.agent -name '*.js' -o -name '*.d.ts' -delete",`  
        `"reset": "npm run clean && rm -rf node_modules package-lock.json && npm install && npm run build",`  
        `"//__ DEPLOYMENT ___________________________": "",`  
        `"ship:staging": "npm run build && npm run deploy --workspace=@camp_candor/agent -- --env staging && npm run audit:staging"`  
    `},`  
    `"lint-staged": {`  
        `"*.{js,ts,tsx,json,css,md}": [`  
            `"prettier --write"`  
        `],`  
        `"*.{ts,tsx}": [`  
            `"eslint --fix --no-warn-ignored"`  
        `]`  
    `},`  
    `"devDependencies": {`  
        `"@cloudflare/vitest-pool-workers": "0.12.1",`  
        `"@cloudflare/workers-types": "4.20260108.0",`  
        `"@eslint/js": "9.39.5",`  
        `"@types/clone-deep": "4.0.4",`  
        `"@types/dot": "1.1.7",`  
        `"@types/node": "^24.0.3",`  
        `"@types/rx-lite": "4.0.10",`  
        `"@types/string": "0.0.34",`  
        `"@vitest/ui": "3.2.4",`  
        `"clone-deep": "4.0.1",`  
        `"commander": "^13.1.0",`  
        `"dotenv": "^16.6.1",`  
        `"eslint": "^9.0.0",`  
        `"globals": "^15.0.0",`  
        `"lint-staged": "^15.0.0",`  
        `"markdownlint-cli2": "^0.13.0",`  
        `"playwright-core": "1.57.0",`  
        `"prettier": "^3.0.0",`  
        `"rx-lite": "4.0.8",`  
        `"start-server-and-test": "2.1.3",`  
        `"string": "3.3.3",`  
        `"tsx": "^4.20.4",`  
        `"typescript": "^5.5.2",`  
        `"typescript-eslint": "^8.0.0",`  
        `"vitest": "3.2.4",`  
        `"wrangler": "4.58.0",`  
        `"zod": "^3.25.76"`  
    `},`  
    `"dependencies": {`  
        `"lodash": "4.18.1"`  
    `}`  
`}`

#### **4\. Overwrite: eslint.config.js**

`// eslint.config.js`  
`import js from '@eslint/js'`  
`import tseslint from 'typescript-eslint'`  
`import globals from 'globals'`

`export default tseslint.config(`  
    `// 1. Global Ignores`  
    `{`  
        `ignores: [`  
            `'**/dist/**',`  
            `'**/packages/**',`  
            `'**/data/**',`  
            `'**/apps/worker/**',`  
            `'**/apps/sower/**',`  
            `'**/vcode/**',`  
            `'**/coverage/**',`  
            `'**/node_modules/**',`  
            `'**/*.d.ts',`  
            `'**/.wrangler/**',`  
            `'**/apps/995.library/**',`  
        `],`  
    `},`

    `// 2. Main Config`  
    `{`  
        `extends: [`  
            `js.configs.recommended,`  
            `...tseslint.configs.recommendedTypeChecked,`  
            `...tseslint.configs.stylisticTypeChecked,`  
        `],`  
        `files: ['**/*.{ts,tsx}'],`  
        `languageOptions: {`  
            `ecmaVersion: 2020,`  
            `globals: globals.node,`  
            `parserOptions: {`  
                `projectService: true,`  
                `tsconfigRootDir: import.meta.dirname,`  
            `},`  
        `},`  
        `rules: {`  
            `'no-console': 'warn',`  
            `'@typescript-eslint/no-floating-promises': 'error',`  
            `'@typescript-eslint/await-thenable': 'error',`  
            `'@typescript-eslint/no-explicit-any': 'error',`  
            `'@typescript-eslint/consistent-type-imports': 'error',`  
        `},`  
    `},`

    `// 3. Disable type-checking for JS files & root config scripts`  
    `{`  
        `extends: [tseslint.configs.disableTypeChecked],`  
        `files: [`  
            `'**/*.js',`  
            `'**/*.mjs',`  
            `'**/*.cjs',`  
            `'vitest.workspace.ts',`  
            `'vitest.config.ts',`  
        `],`  
    `},`  
`)`

### **IV. FALSIFIABLE ACCEPTANCE CRITERIA (ATTENTION BOTTOM ANCHOR)**

Execute this validation sequence in order from the monorepo root. Every check must exit with code 0:

`# 1. Automatic Prettier Formatting Sweep`  
`npm run prettier:fix`  
`# ASSERT: Exit code 0[cite: 2]`

`# 2. Verify ESLint passes cleanly with root configs handled`  
`npm run lint:check`  
`# ASSERT: Exit code 0 (Zero errors on vitest.workspace.ts or vitest.config.ts)[cite: 2]`

`# 3. Assert presence of t.teardown in AVA test suites`  
`git grep -n "t\.teardown" apps/995.library/test/library.buzz.test.ts`  
`git grep -n "t\.teardown" apps/995.library/test/unit.buzz.test.ts`  
`# ASSERT: Exit code 0 for both checks[cite: 2]`

`# 4. Verify cross-platform boundary check passes on Windows cmd.exe & POSIX`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, 0 lines output[cite: 2]`

`# 5. Static TypeScript Compilation across all project references`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean)[cite: 2]`

`# 6. Execute full sequential monorepo test battery`  
`npm test`  
`# ASSERT: Exit code 0 across worker, agent, and library suites[cite: 2]`

`# 7. Execute comprehensive quality gate`  
`npm run check:all`  
`# ASSERT: Exit code 0 (check:types, prettier:check, lint:check all green)[cite: 2]`

---

*User prompt: {{FOCUS : Phase 1: Clear the 3 Immediate Audit Failures (10-minute fix) }} /tgrav-check*

# **Response: TASK: Antigravity Audit & Verification Directive — Immediate Audit Failures Remediation (Phase 1 Clearance)**

## **REPOSITORY: npm-agent-01 (camp-candor/000.repo-bot)**

## **TARGET WORKSPACES: Monorepo Root & apps/995.library/test/**

## **AUDIT TARGETS:**

## **\- apps/995.library/test/library.buzz.test.ts (t.teardown registration for data/flat/\*.txt)**

## **\- apps/995.library/test/unit.buzz.test.ts (t.teardown registration for scratch\_test\_unit and 00.weather.unit)**

## **\- package.json (Cross-platform Node.js check:boundary command replacing POSIX test \-z)**

## **\- eslint.config.js (disableTypeChecked for vitest.workspace.ts and vitest.config.ts)**

## **\- apps/995.library/995.library/\*\* (Immutable Harness Boundary Invariance)**

### **I. SYSTEM MANDATE & AUDITOR DIRECTIVES**

You are Antigravity, the autonomous adversarial verification auditor. Your mandate is to conduct a forensic audit verifying that the **3 Immediate Audit Failures** identified in 014.check-up.gravity.md have been mechanically resolved on disk and execute with complete cross-platform parity.

Under the **Universal Negative-Control Law**, a test cleanup mechanism that has not been observed actively purging disk scratch files during assertion failures, a boundary check that relies on platform-dependent binaries, or a linter that fails on un-indexed root configuration files has not been verified. You must execute terminal commands directly, inspect source configurations on disk, evaluate test teardown lifecycles, and produce an objective **PASSED / FAILED** verification dossier.

Do not modify functional code without reporting your findings first. Execute terminal validation commands directly, inspect files, and provide an objective verification report.

### **II. VERIFICATION PHASES & COMMAND CHECKLIST**

Execute every check in order from the monorepo root. Every command must produce the specified exit code.

#### **Phase 1: Boundary Integrity, Inode Hygiene & ASCII Purity**

`# 1.1 Assert Immutable Harness Fence (Must return 0 lines)`  
`git status -s apps/995.library/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines returned (harness fence held completely firm)[cite: 8, 30]`

`# 1.2 Verify Workspace Scope Quarantine`  
`git status -s | grep -v -E "package\.json|eslint\.config\.js|apps/995\.library/test/"`  
`# ASSERT: Exit code 1 (0 lines outside declared phase remediation scope)`

`# 1.3 Verify Emission Cleanliness (No side-by-side JS emitted into source folders)`  
`find apps/worker/src packages/000.agent -name "*.js" -o -name "*.d.ts"`  
`# ASSERT: Exactly 0 files returned`

`# 1.4 Verify 7-Bit Pure ASCII Compliance`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" apps/995.library/test/ package.json eslint.config.js`  
`# ASSERT: Exit code 1 (0 matches found; zero multi-byte emojis)[cite: 8, 30]`

#### **Phase 2: AVA Scratch Lifecycle & t.teardown() Registration Audit**

Inspect apps/995.library/test/library.buzz.test.ts and apps/995.library/test/unit.buzz.test.ts to confirm fail-safe test teardown hooks:

`# 2.1 Verify Registration of t.teardown in library.buzz.test.ts`  
`git grep -n "t\.teardown" apps/995.library/test/library.buzz.test.ts`  
`# ASSERT: Exit code 0 (Hook registered immediately after resolving absoluteOutputFile)`

`# 2.2 Verify Registration of t.teardown in unit.buzz.test.ts`  
`git grep -n "t\.teardown" apps/995.library/test/unit.buzz.test.ts`  
`# ASSERT: Exit code 0 (Hooks registered in both flattenUnit and createUnit test blocks)`

`# 2.3 Verify Absence of Un-guarded Trailing fs.remove at Test Ends`  
`node -e "`  
`const fs = require('fs');`  
`const libTest = fs.readFileSync('apps/995.library/test/library.buzz.test.ts', 'utf8');`  
`const unitTest = fs.readFileSync('apps/995.library/test/unit.buzz.test.ts', 'utf8');`

`if (!libTest.includes('t.teardown(') || !unitTest.includes('t.teardown(')) {`  
  `console.error('FAIL: Missing t.teardown lifecycle hooks');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: AVA test files correctly register lifecycle teardown hooks.');`  
`"`  
`# ASSERT: Exit code 0`

`# 2.4 Execute AVA Library Test Battery`  
`npm run test:library`  
`# ASSERT: Exit code 0 (100% assertions green across library and unit tests)`

`# 2.5 Assert Zero Residual Scratch Files Post-Test`  
`git status -s data/flat/ data/unit/ scratch*`  
`# ASSERT: Exactly 0 lines output (No untracked flat outputs or scratch directories remain on disk)`

#### **Phase 3: Cross-Platform Boundary Tripwire Execution (package.json)**

Verify that the "check:boundary" npm script executes with full cross-platform compatibility without relying on POSIX shell built-ins:

`# 3.1 Verify Cross-Platform Node Script in package.json`  
`node -e "`  
`const pkg = require('./package.json');`  
`const cmd = pkg.scripts['check:boundary'];`  
`if (!cmd || cmd.includes('test -z') || !cmd.includes('child_process')) {`  
  `console.error('FAIL: check:boundary still relies on POSIX test -z binary: ' + cmd);`  
  `process.exit(1);`  
`}`  
`console.log('PASS: check:boundary is powered by cross-platform Node.js invocation.');`  
`"`  
`# ASSERT: Exit code 0`

`# 3.2 Execute check:boundary Script via Terminal Harness`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines of error output on both Windows cmd.exe and POSIX shells`

`# 3.3 Negative Control: Assert check:boundary Fails Closed upon Simulated Breach`  
`node -e "`  
`const fs = require('fs');`  
`const cp = require('child_process');`  
`const testFile = 'apps/995.library/995.library/BREACH_PROBE.tmp';`

`try {`  
  `fs.writeFileSync(testFile, 'illegal_mutation');`  
  `try {`  
    `cp.execSync('npm run check:boundary', { stdio: 'pipe' });`  
    `console.error('FAIL: check:boundary failed to catch boundary breach!');`  
    `process.exit(1);`  
  `} catch (err) {`  
    `console.log('PASS: Negative control confirmed: check:boundary threw exit code 1 upon harness mutation.');`  
  `}`  
`} finally {`  
  `if (fs.existsSync(testFile)) fs.unlinkSync(testFile);`  
`}`  
`"`  
`# ASSERT: Exit code 0 (Breach correctly trips error code 1 and aborts)[cite: 8]`

#### **Phase 4: Root Linter Parser Exclusion & Prettier Style Gate**

Inspect eslint.config.js and execute the full formatting and static code quality gates:

`# 4.1 Verify Parser Exclusion for Root .ts Configs in eslint.config.js`  
`node -e "`  
`const fs = require('fs');`  
`const conf = fs.readFileSync('eslint.config.js', 'utf8');`  
`if (!conf.includes('vitest.workspace.ts') || !conf.includes('vitest.config.ts')) {`  
  `console.error('FAIL: eslint.config.js does not exclude vitest config files from type checking');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: vitest.workspace.ts and vitest.config.ts present in disableTypeChecked block.');`  
`"`  
`# ASSERT: Exit code 0`

`# 4.2 Run Monorepo ESLint Inspection`  
`npm run lint:check`  
`# ASSERT: Exit code 0 (Zero parsing errors or project service failures)`

`# 4.3 Run Monorepo Prettier Style Inspection`  
`npm run prettier:check`  
`# ASSERT: Exit code 0 (All files match formatting specification without style warnings)`

#### **Phase 5: Comprehensive Quality Gate & Monorepo Regressions**

Validate static compilation, sequential workspace test execution, and the unified quality gate:

`# 5.1 Static TypeScript Compilation across Monorepo References`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean across all project references)[cite: 8, 43]`

`# 5.2 Sequential Monorepo Test Aggregator`  
`npm test`  
`# ASSERT: Exit code 0 (Executes test:worker, test:agent, and test:library cleanly with zero collisions)[cite: 8]`

`# 5.3 Unified Quality Gate`  
`npm run check:all`  
`# ASSERT: Exit code 0 (check:types, prettier:check, and lint:check pass simultaneously)`

### **III. OUTPUT DELIVERABLE FORMAT**

Structure your audit verification response in the following schema:

#### **1\. Terminal Command Execution Log**

| Step | Command Executed | Working Directory | Exit Code | Result Summary |
| :---- | :---- | :---- | :---- | :---- |
| **P1.1** | git status \-s apps/995.library/995.library/ | Monorepo Root | 0 | Immutable runner boundary clean (0 lines modified) |
| **P1.2** | Scope quarantine check | Monorepo Root | 1 | Modifications strictly isolated to Phase 1 target files |
| **P1.3** | Find .js in source dirs | Monorepo Root | 0 | 0 side-by-side JS build artifacts leaked |
| **P1.4** | Multi-byte emoji scan | Monorepo Root | 1 | 0 UTF-8 emojis found; pure 7-bit ASCII confirmed |
| **P2.1** | Grep teardown in library.buzz.test.ts | apps/995.library | 0 | t.teardown registered for flat output file |
| **P2.2** | Grep teardown in unit.buzz.test.ts | apps/995.library | 0 | t.teardown registered for scratch directories |
| **P2.3** | Node check on AVA teardown hooks | Monorepo Root | 0 | Explicit lifecycle teardown hooks verified on disk |
| **P2.4** | npm run test:library | Monorepo Root | 0 | AVA library test battery passed with 100% green assertions |
| **P2.5** | Check untracked test debris | Monorepo Root | 0 | Zero residual files in data/flat, data/unit, or scratch\* |
| **P3.1** | Node evaluation of check:boundary | Monorepo Root | 0 | Replaced POSIX test \-z with cross-platform Node script |
| **P3.2** | npm run check:boundary | Monorepo Root | 0 | Cross-platform boundary tripwire passed cleanly |
| **P3.3** | Negative control: Breach simulation | Monorepo Root | 0 | Negative control verified: tripwire caught simulated file breach |
| **P4.1** | Node inspection of eslint.config.js | Monorepo Root | 0 | Root config files excluded from type-checked rules |
| **P4.2** | npm run lint:check | Monorepo Root | 0 | ESLint passed with 0 errors across the monorepo |
| **P4.3** | npm run prettier:check | Monorepo Root | 0 | Prettier code style confirmed clean |
| **P5.1** | npm run check:types | Monorepo Root | 0 | Static TypeScript compilation passed (tsc \-b) |
| **P5.2** | npm test | Monorepo Root | 0 | Full sequential monorepo test battery passed |
| **P5.3** | npm run check:all | Monorepo Root | 0 | Unified quality gate cleared cleanly |

#### **2\. Acceptance Criteria Verification Matrix**

| Verification Requirement | Target Component | Status (PASSED / FAILED) | Forensic Evidence |
| :---- | :---- | :---- | :---- |
| **AVA Lifecycle Teardown** | apps/995.library/test/ |  | t.teardown() registered; no residual test files leaked |
| **Cross-Platform Tripwire** | package.json (check:boundary) |  | Node.js script executes cleanly on Windows cmd.exe and POSIX |
| **Negative Control Tripwire** | check:boundary |  | Simulated file breach in apps/995.library/ trips non-zero exit code |
| **ESLint Project Service Bounds** | eslint.config.js |  | vitest.workspace.ts and vitest.config.ts parse without errors |
| **Prettier Formatting Sweep** | Monorepo files |  | 100% of workspace files adhere to formatting standards |
| **Immutable Runner Boundary** | apps/995.library/995.library/\*\* |  | git status \-s apps/995.library/995.library/ returns 0 modified lines |
| **Pure 7-Bit ASCII Compliance** | Touched files |  | Zero multi-byte UTF-8 emojis found across code and configs |
| **Static TypeScript Compilation** | Monorepo references |  | npm run check:types (tsc \-b) exits with code 0 |
| **Monorepo Suite Regression** | npm test |  | Worker, agent, and library suites pass in sequential order |

#### **3\. Identified Violations & Immediate Patches**

*(Detail any lingering syntax parsing errors, uncleaned scratch directories, or boundary leaks; or state "None" if certified clean.)*

#### **4\. Final Architectural Verdict**

Declare explicitly:

> * **PASSED (Phase 1 Immediate Audit Failures Remediation Certified)**  
> * or **CONFLICT\_BLOCKED (Remediation Required)** accompanied by diagnostic failure traces.

---

*User prompt: {{FOCUS: Phase 2: Boilerplate Generalization & Hardening }} /extreme-details*

Response: Phase 2 (Boilerplate Generalization & Hardening) converts npm-agent-01 from a customized repository into a clean, unbranded, edge-native boilerplate that can be cloned and configured for any downstream autonomous DevOps agent. This phase decouples tenant-specific identities, establishes clear extension boundaries for custom tooling, standardizes environment configurations, and validates the entire repository against a clean-slate verification gauntlet.

### **I. Systemic Parameterization & Tenant De-Vendoring**

A reusable boilerplate must contain zero hardcoded account IDs, personal usernames, or proprietary Cloudflare subdomain slugs. Every operational boundary must resolve its targets dynamically through environment cascades or repository-level variable bindings.

                    `TENANT DE-VENDORING ARCHITECTURE`  
`┌─────────────────────────────────┬─────────────────────────────────┐`  
`│     PROPRIETARY RESIDUE         │     PARAMETERIZED BOILERPLATE   │`  
`├─────────────────────────────────┼─────────────────────────────────┤`  
`│ camp-candor                     │ process.env.GITHUB_DEFAULT_OWNER│`  
`│                                 │ (fallback: current repo owner)  │`  
`│ berad4000.workers.dev           │ process.env.LIVE_WORKER_URL     │`  
`│                                 │ (fallback: http://127.0.0.1:8787│`  
`│ goblin-lore-00 / 000.repo-bot   │ npm-agent-01                    │`  
`│ repo-bot-00.berad4000...        │ npm-agent-01-staging.<subdomain>│`  
`└─────────────────────────────────┴─────────────────────────────────┘`

#### **1\. Ingress URL Cascade Neutralization (packages/000.agent/src/cascade.ts)**

In packages/000.agent/src/cascade.ts, the Tier 4 fallback must not point to a hardcoded personal staging URL. It must resolve to a generic local loopback address or an explicitly injected environment variable:

`// packages/000.agent/src/cascade.ts`  
`import fs from 'fs'`  
`import path from 'path'`  
`import dotenv from 'dotenv'`

`let envLoaded = false`

`export const resolveRootEnv = (): string | null => {`  
    `let curr = process.cwd()`  
    `while (curr && curr !== path.dirname(curr)) {`  
        `const candidate = path.join(curr, '.env')`  
        `if (fs.existsSync(candidate)) {`  
            `return candidate`  
        `}`  
        `curr = path.dirname(curr)`  
    `}`  
    `return null`  
`}`

`const ensureEnv = () => {`  
    `if (envLoaded) return`  
    `const rootEnv = resolveRootEnv()`  
    `if (rootEnv) {`  
        `dotenv.config({ path: rootEnv })`  
    `} else {`  
        `dotenv.config()`  
    `}`  
    `envLoaded = true`  
`}`

`/**`  
 `* Resolves the outbound HTTP base URL across the 4-Tier Precedence Cascade:`  
 `*   Tier 1: (global as any).agentBaseUrl (Active local/live switchboard pointer)`  
 `*   Tier 2: (global as any).packageBaseUrl (Domain package override)`  
 `*   Tier 3: process.env.LIVE_WORKER_URL || process.env.WORKER_URL (Environment bindings)`  
 `*   Tier 4: Loopback default fallback (http://127.0.0.1:8787)`  
 `*/`  
`export const getBaseUrl = (): string => {`  
    `ensureEnv()`

    `const raw =`  
        `(global as any).agentBaseUrl ||`  
        `(global as any).packageBaseUrl ||`  
        `process.env.LIVE_WORKER_URL ||`  
        `process.env.WORKER_URL ||`  
        `'http://127.0.0.1:8787'`

    `return String(raw).trim().replace(/\/+$/, '')`  
`}`

`/**`  
 `* Derives the corresponding WebSocket URL from the active base HTTP URL:`  
 `*   http://  -> ws://`  
 `*   https:// -> wss://`  
 `*/`  
`export const getBaseWsUrl = (): string => {`  
    `const httpUrl = getBaseUrl()`  
    `if (httpUrl.startsWith('https://')) {`  
        `return httpUrl.replace(/^https:\/\//, 'wss://')`  
    `}`  
    `return httpUrl.replace(/^http:\/\//, 'ws://')`  
`}`

#### **2\. Worker Configuration Parameterization (apps/worker/wrangler.jsonc)**

All service bindings, worker names, and staging environments in apps/worker/wrangler.jsonc must use standardized template identifiers rather than tenant names:

`{`  
    `"$schema": "node_modules/wrangler/config-schema.json",`  
    `"name": "npm-agent-01-worker",`  
    `"main": "src/index.ts",`  
    `"compatibility_date": "2026-01-07",`  
    `"compatibility_flags": ["nodejs_compat"],`  
    `"observability": {`  
        `"enabled": true`  
    `},`  
    `"ai": {`  
        `"binding": "AI"`  
    `},`  
    `"durable_objects": {`  
        `"bindings": [`  
            `{`  
                `"name": "AGENT_SESSION",`  
                `"class_name": "AgentSessionDO"`  
            `}`  
        `]`  
    `},`  
    `"migrations": [`  
        `{`  
            `"tag": "v1",`  
            `"new_sqlite_classes": ["AgentSessionDO"]`  
        `}`  
    `],`  
    `"alias": {`  
        `"ajv": "../../node_modules/@funtuantw/pi-agent-cf/stubs/ajv.js"`  
    `},`  
    `"env": {`  
        `"staging": {`  
            `"name": "npm-agent-01-staging",`  
            `"ai": {`  
                `"binding": "AI"`  
            `},`  
            `"durable_objects": {`  
                `"bindings": [`  
                    `{`  
                        `"name": "AGENT_SESSION",`  
                        `"class_name": "AgentSessionDO"`  
                    `}`  
                `]`  
            `},`  
            `"migrations": [`  
                `{`  
                    `"tag": "v1",`  
                    `"new_sqlite_classes": ["AgentSessionDO"]`  
                `}`  
            `]`  
        `}`  
    `}`  
`}`

#### **3\. CI/CD Deployment Workflow Decoupling (.github/workflows/deploy-do.yml)**

The deployment workflow must dynamically resolve repository owners and deployment endpoints via GitHub context variables (vars.\* and secrets.\*), with clean defaults for forks:

`name: Deploy Durable Objects`

`on:`  
    `push:`  
        `branches: [main]`  
        `paths:`  
            `- 'apps/worker/**'`  
            `- 'packages/**'`  
    `workflow_dispatch:`

`concurrency:`  
    `group: deploy-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: read`

`jobs:`  
    `deploy:`  
        `runs-on: ubuntu-latest`  
        `name: Deploy Edge Control Plane`  
        `steps:`  
            `- uses: actions/checkout@v4`

            `- name: Setup Node`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: 20`  
                  `cache: 'npm'`

            `- name: Install Dependencies`  
              `run: npm ci`

            `- name: Verify Types across Project References`  
              `run: npm run check:types`

            `- name: Run Pre-Deploy Worker Unit Tests`  
              `run: npm run test:worker`

            `- name: Deploy to Cloudflare Staging`  
              `working-directory: apps/worker`  
              `run: |`  
                  `if [ -n "${{ secrets.AI_GATEWAY_TOKEN }}" ]; then`  
                    `echo "${{ secrets.AI_GATEWAY_TOKEN }}" | npx wrangler secret put AI_GATEWAY_TOKEN --env staging`  
                  `fi`  
                  `echo "$RUNTIME_GITHUB_TOKEN" | npx wrangler secret put GITHUB_TOKEN --env staging`  
                  `npx wrangler deploy --env staging --var GITHUB_DEFAULT_OWNER:"$DEFAULT_OWNER"`  
              `env:`  
                  `CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}`  
                  `CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`  
                  `RUNTIME_GITHUB_TOKEN: ${{ secrets.AGENT_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}`  
                  `DEFAULT_OWNER: ${{ vars.GITHUB_DEFAULT_OWNER || github.repository_owner }}`

            `- name: Run Live Staging Audit`  
              `if: ${{ vars.STAGING_WORKER_URL != '' }}`  
              `run: npm run test:audit:staging --workspace=@camp_candor/agent`  
              `env:`  
                  `STAGING_URL: ${{ vars.STAGING_WORKER_URL }}`

### **II. Authoritative Environment Templates**

A production boilerplate must provide clean, documented .example configuration files so new developers can hydrate their runtime environments without guessing secret formats.

#### **1\. Root .env.example**

Create .env.example at the monorepo root:

`# ==============================================================================`  
`# :: NPM-AGENT-01 CONFIGURATION TEMPLATE`  
`# ==============================================================================`  
`# Copy this file to .env at the monorepo root:`  
`#   cp .env.example .env`  
`# ==============================================================================`

`# ------------------------------------------------------------------------------`  
`# 1. GITHUB CONTROL PLANE CREDENTIALS`  
`# ------------------------------------------------------------------------------`  
`# Required for tools.core.ts (branch creation, file commits, PRs, check audits).`  
`# Permissions needed:`  
`#   - repo (full control of private repositories)`  
`#   - workflow (update GitHub Action workflows)`  
`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`

`# Default GitHub organization or user account to target for Git operations`  
`GITHUB_DEFAULT_OWNER=your-github-username-or-org`

`# ------------------------------------------------------------------------------`  
`# 2. CLOUDFLARE EDGE & AI GATEWAY CREDENTIALS`  
`# ------------------------------------------------------------------------------`  
`# Cloudflare Account ID (found on Cloudflare Dashboard URL or Workers overview)`  
`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here`

`# Cloudflare API Token with Workers, Durable Objects, and AI permissions`  
`CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here`

`# Cloudflare AI Gateway Slug (e.g., 'default' or custom gateway name)`  
`CLOUDFLARE_AI_GATEWAY=default`

`# Optional: Cloudflare AI Gateway Universal Token (format: cfut_...)`  
`CLOUDFLARE_AI_GATEWAY_TOKEN=`

`# ------------------------------------------------------------------------------`  
`# 3. ROUTING & SWITCHBOARD POINTERS`  
`# ------------------------------------------------------------------------------`  
`# URL of your deployed Cloudflare Worker (Tier 3 fallback in cascade.ts).`  
`# Leave as loopback during local development:`  
`LIVE_WORKER_URL=http://127.0.0.1:8787`

#### **2\. Worker Secret Template (apps/worker/.dev.vars.example)**

Create apps/worker/.dev.vars.example for local Miniflare isolate development:

`# ==============================================================================`  
`# :: APPS/WORKER LOCAL SECRETS (.dev.vars)`  
`# ==============================================================================`  
`# Copy this file to apps/worker/.dev.vars for local wrangler dev runs:`  
`#   cp apps/worker/.dev.vars.example apps/worker/.dev.vars`  
`# NOTE: Wrangler loads .dev.vars into c.env during local execution.`  
`# ==============================================================================`

`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`  
`CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here`  
`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here`  
`CLOUDFLARE_AI_GATEWAY=default`  
`GITHUB_DEFAULT_OWNER=your-github-username-or-org`

### **III. Sovereign Extension Boundary & Merge Shielding**

Downstream developers fork boilerplates to build bespoke agents. If the boilerplate does not decouple core DevOps tools from custom tools, every upstream git merge or git pull from the template repository triggers merge conflicts in the tool registry.

                 `TOOL REGISTRY DECOUPLING & MERGE SHIELD`  
`┌────────────────────────────────────────────────────────────────────────┐`  
`│                        apps/worker/src/index.ts                        │`  
`│                 Dynamic Aggregator: [...core, ...custom]               │`  
`└───────────────────┬────────────────────────────────┬───────────────────┘`  
                    `│                                │`  
                    `▼                                ▼`  
`┌──────────────────────────────────────┐ ┌───────────────────────────────┐`  
`│       tools.core.ts (Upstream)       │ │   tools.custom.ts (Downstream)│`  
`│ • S_clean anchor (get_commit_sha)    │ │ • Sovereign extension hook    │`  
`│ • Ephemeral branch creator           │ │ • Isolated domain tools       │`  
`│ • Bounded file writer & PR creator   │ │ • Protected by .gitattributes │`  
`│ • CI check inspector                 │ │   merge=ours driver           │`  
`└──────────────────────────────────────┘ └───────────────────────────────┘`

#### **1\. Merge Shield Specification (.gitattributes)**

The root .gitattributes file must enforce merge drivers on files that downstream developers modify:

`# ==============================================================================`  
`# :: UPSTREAM MERGE SHIELDS`  
`# ==============================================================================`  
`# Protects downstream sovereign customizations when pulling updates from`  
`# the upstream template repository.`

`apps/worker/src/tools.custom.ts merge=ours`  
`apps/worker/wrangler.jsonc merge=ours`  
`.env merge=ours`

#### **2\. Downstream Sovereign Extension Hook (apps/worker/src/tools.custom.ts)**

apps/worker/src/tools.custom.ts must export an empty array baseline while providing an explicit, commented-out TypeBox blueprint demonstrating how to build a valid tool that adheres to the parameter firewall:

`// apps/worker/src/tools.custom.ts`  
`import type { AgentTool } from '@funtuantw/pi-agent-cf'`  
`import { Type, type Static } from '@sinclair/typebox'`  
`import type { Env } from './tools.core.js'`

`// ============================================================================`  
`// :: SOVEREIGN CUSTOM TOOLS REGISTRY (DOWNSTREAM EXTENSION HOOK)`  
`// ============================================================================`  
`// Downstream consumers: register your custom domain tools in this file.`  
`// This file is protected by .gitattributes (merge=ours), ensuring upstream`  
`// template pulls will never overwrite your custom tools.`  
`//`  
`// INVARIANTS:`  
`// 1. All tool parameter schemas MUST declare { additionalProperties: false }.`  
`// 2. Wrap all error returns with redactSecrets(err.message).`  
`// 3. Keep all terminal and log telemetry in pure 7-bit ASCII.`  
`// ============================================================================`

`/*`  
`// EXAMPLE CUSTOM TOOL BLUEPRINT:`  
`export const CustomEchoParams = Type.Object(`  
    `{`  
        `message: Type.String({`  
            `minLength: 1,`  
            `maxLength: 500,`  
            `description: 'Message payload to echo back',`  
        `}),`  
    `},`  
    `{ additionalProperties: false },`  
`)`

`export const createCustomEchoTool = (`  
    `_env: Env,`  
`): AgentTool<typeof CustomEchoParams> => ({`  
    `name: 'custom_echo',`  
    `label: 'Custom Echo Tool',`  
    `description: 'Example downstream extension tool demonstrating schema invariants.',`  
    `parameters: CustomEchoParams,`  
    `execute: async (_id: any, args: Static<typeof CustomEchoParams>) => {`  
        `return {`  
            ``content: [{ type: 'text', text: `Echo: ${args.message}` }],``  
            `details: { echoed: args.message },`  
        `}`  
    `},`  
`})`  
`*/`

`/**`  
 `* Returns an array of sovereign custom tools to be concatenated into the agent.`  
 `* Defaults to an empty array in the baseline boilerplate.`  
 `*/`  
`export const customTools = (_env: Env): AgentTool<any>[] => [`  
    `// Register custom tool factories here:`  
    `// createCustomEchoTool(_env),`  
`]`

### **IV. Saga Rollback Engine & Circuit Breaker Verification**

The boilerplate's deterministic safety net relies on the 4-Stage Compensating Saga Rollback engine in apps/worker/src/rollbackEngine.ts. Downstream agents running unattended overnight builds can encounter CI failure cascades; the rollback engine guarantees that ephemeral branches and failed pull requests are cleaned up automatically without human intervention.

#### **The 4-Stage Compensating Teardown Pipeline**

                 `SAGA ROLLBACK EXECUTION TIMELINE`  
`┌────────────────────────────────────────────────────────────────────────┐`  
`│ STAGE 1: INVENTORY & DISARM                                            │`  
`│ • Set task status to FAILED_ABORTED                                    │`  
`│ • Disarm in-memory watchdog timers                                     │`  
`│ • Isolate root-cause error trace via redactSecrets()                   │`  
`└───────────────────────────────────┬────────────────────────────────────┘`  
                                    `│`  
                                    `▼`  
`┌────────────────────────────────────────────────────────────────────────┐`  
`│ STAGE 2: PULL REQUEST REVOCATION                                       │`  
`│ • Issue PATCH /repos/{owner}/{repo}/pulls/{prNumber} { state: closed } │`  
`│ • Post tombstone comment with audit trail and saga ID                  │`  
`│ • Idempotently absorb HTTP 404 (absent) & HTTP 422 (already closed)    │`  
`└───────────────────────────────────┬────────────────────────────────────┘`  
                                    `│`  
                                    `▼`  
`┌────────────────────────────────────────────────────────────────────────┐`  
`│ STAGE 3: EPHEMERAL BRANCH OBLITERATION                                 │`  
`│ • Assert branch matches ^spec/ and NOT in PROTECTED_BRANCHES           │`  
`│ • Issue DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}           │`  
`│ • Idempotently absorb HTTP 404 (already deleted / never pushed)        │`  
`└───────────────────────────────────┬────────────────────────────────────┘`  
                                    `│`  
                                    `▼`  
`┌────────────────────────────────────────────────────────────────────────┐`  
`│ STAGE 4: TRUNK INTEGRITY PINNING                                       │`  
`│ • Confirm trunk HEAD remains pinned to immutable S_clean anchor        │`  
`│ • Emit RollbackReceipt with stageLog metadata                          │`  
`└────────────────────────────────────────────────────────────────────────┘`

#### **Idempotent Status Handling Matrix**

| HTTP Status | Target API | Engine Response | State Flag |
| :---- | :---- | :---- | :---- |
| **200 OK** | PATCH /pulls/{id} | PR closed successfully | prClosed: true |
| **404 Not Found** | PATCH /pulls/{id} | PR never created; absorbed | prClosed: true (ABSORBED) |
| **422 Unprocessable** | PATCH /pulls/{id} | PR was already closed; absorbed | prClosed: true (ABSORBED) |
| **204 No Content** | DELETE /git/refs/... | Branch deleted cleanly | branchDeleted: true |
| **404 Not Found** | DELETE /git/refs/... | Branch already absent; absorbed | branchDeleted: true (ABSORBED) |
| **403 Forbidden** | Any | Token permission error; fails closed | status: ROLLBACK\_FAILED |

### **V. Operational Documentation (README.md & AGENTS.md)**

#### **1\. Boilerplate Quickstart (README.md)**

Overwrite root README.md with operational onboarding instructions:

`# npm-agent-01`

`> Deterministic Edge DevOps Control Plane & Autonomous Agent Boilerplate.`  
`> Built on Cloudflare Workers, Durable Objects, TypeBox, and Blessed TUI.`

`---`

`## Architecture Overview`

```` ```text ````  
`.`  
`├── apps/`  
`│   ├── worker/              # Cloudflare Worker Edge Control Plane (@camp_candor/agent)`  
`│   │   ├── src/index.ts     # Hono router + AgentSessionDO + edge endpoints`  
`│   │   ├── src/tools.core.ts# Deterministic Git & DevOps tools (S_clean anchor)`  
`│   │   ├── src/tools.custom.ts # Sovereign tool extension boundary (merge=ours)`  
`│   │   ├── src/redaction.ts # In-flight secret redaction firewall`  
`│   │   ├── src/rollbackEngine.ts # 4-Stage compensating saga rollback engine`  
`│   │   └── test/            # Vitest worker pool and E2E audit suites`  
`│   └── 995.library/         # Blessed Terminal UI Harness (@camp_candor/995.library)`  
`│       ├── run.ts           # Dynamic package loader & CLI entrypoint`  
`│       └── 995.library/     # [IMMUTABLE] Core Blessed Curses engine`  
`│`  
`└── packages/`  
    `└── 000.agent/           # Core Agent Domain & Terminal Cockpit`  
        `├── BEE.ts           # Unit registration & state manifest`  
        `├── src/cascade.ts   # 4-tier endpoint resolution cascade & WS derivation`  
        `├── 00.agent.unit/   # Agent core actions, reducers, WS connections`  
        `└── 98.menu.unit/    # Blessed Menu Screen, Local/Live Switchboard`

## **Prerequisites**

> * **Node.js:** \>= 20.0.0  
> * **npm:** \>= 10.0.0  
> * **Cloudflare Account:** With Workers, Durable Objects, and Workers AI enabled  
> * **GitHub PAT:** With repo and workflow scopes

## **Quickstart**

### **1\. Clone & Install**

`git clone [https://github.com/your-org/npm-agent-01.git](https://github.com/your-org/npm-agent-01.git)`  
`cd npm-agent-01`  
`npm ci`

### **2\. Configure Environment**

`# Root environment (used by packages/000.agent and CI scripts)`  
`cp .env.example .env`

`# Worker environment (used by local wrangler dev)`  
`cp apps/worker/.dev.vars.example apps/worker/.dev.vars`

Fill in GITHUB\_TOKEN, CLOUDFLARE\_ACCOUNT\_ID, and CLOUDFLARE\_API\_TOKEN.

### **3\. Verify Local Quality Gates**

`# Verify static compilation across all project references`  
`npm run check:types`

`# Run the full monorepo sequential test battery`  
`npm test`

`# Verify code formatting and linting`  
`npm run check:all`

### **4\. Run the Local Control Plane**

`# Terminal 1: Boot the edge worker locally on port 8787`  
`npm run worker:dev`

`# Terminal 2: Launch the Blessed curses cockpit`  
`npm run tui`

## **Adding Custom Tools**

Downstream tools must be added to apps/worker/src/tools.custom.ts. This file is protected by .gitattributes (merge=ours), ensuring upstream template updates will never overwrite your proprietary tools.

All custom tool parameter schemas must enforce TypeBox { additionalProperties: false }.

`---`

`### VI. Clean-Slate Verification Gauntlet`

`To prove that the boilerplate is ready for production distribution, execute this clean-slate verification procedure. This simulates a developer cloning the repository onto an unconfigured machine.`

```` ```bash ````  
`# ==============================================================================`  
`# :: THE ZERO-KNOWLEDGE CLEAN-SLATE SMOKE TEST`  
`# ==============================================================================`

`# Step 1: Clean build artifacts and verify fresh state`  
`npm run clean`  
`npm run clean:js`

`# Step 2: Verify package references compile cleanly without emitted artifacts`  
`npm run check:types`  
`# ASSERT: Exit code 0, zero diagnostic errors`

`# Step 3: Run comprehensive formatting and linter suite`  
`npm run check:all`  
`# ASSERT: Exit code 0 (Prettier and ESLint clean)`

`# Step 4: Run the sequential monorepo test battery`  
`npm test`  
`# ASSERT: Exit code 0:`  
`#   - Worker Workspace: 43/43 tests green (unit, redaction, refShield, rollback)`  
`#   - Agent Workspace: 10/10 tests green (cascade, agent, menu)`  
`#   - Library Workspace: 3/3 tests green (AVA lifecycle teardowns)`

`# Step 5: Verify the immutable harness boundary held firm`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output`

`# Step 6: Verify cross-platform local worker verification gate`  
`npm run verify:local`  
`# ASSERT: Exit code 0 (start-server-and-test boots worker:dev on 8787,`  
`#         validates audit:local HTTP contracts, and tears down cleanly)`

`# Step 7: Verify working tree hygiene (Zero untracked test debris)`  
`git status -s`  
`# ASSERT: Working tree clean (zero modified files in data/, scratch/, or src/)`

Executing this gauntlet certifies that all tenant-specific bindings have been parameterized, the sovereign tool boundary is shielded from merge conflicts, the saga rollback engine fail-safes are operational, and the codebase functions as a clean, repeatable boilerplate ready for downstream deployment.

---

*User prompt: {{FOCUS: Phase 2: Boilerplate Generalization & Hardening }} /jules-task*

# **Response: TASK SPECIFICATION FOR JULES CODING AGENT**

## **REPOSITORY: npm-agent-01 (camp-candor/000.repo-bot)**

## **TARGET WORKSPACES: Monorepo Root, apps/worker, packages/000.agent, .github/workflows**

## **EPIC: EPIC-07-PHASE-2-BOILERPLATE-GENERALIZATION-AND-HARDENING**

## **TASKS:**

## **\- Task 1: Ingress URL Cascade Neutralization & Test Alignment (cascade.ts, cascade.test.ts)**

## **\- Task 2: Worker Configuration Parameterization (wrangler.jsonc)**

## **\- Task 3: CI/CD Deployment Workflow Decoupling (deploy-do.yml)**

## **\- Task 4: Authoritative Environment Templates (.env.example, .dev.vars.example)**

## **\- Task 5: Upstream Merge Shields (.gitattributes)**

## **\- Task 6: Sovereign Downstream Extension Registry (tools.custom.ts)**

## **\- Task 7: Production Template Documentation (README.md, AGENTS.md)**

### **I. SYSTEM LAWS & IMMUTABILITY BOUNDARIES (ATTENTION TOP ANCHOR)**

You are an automated, sandboxed execution worker operating within strict monorepo guardrails:

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/):** You are strictly forbidden from creating, altering, touching, or deleting ANY file inside apps/995.library/.  
> * **WORKSPACE SCOPE:** All modifications and creations must be quarantined strictly to:  
  * packages/000.agent/src/cascade.ts (UPDATE: De-vendor fallback URL)  
  * packages/000.agent/00.agent.unit/cascade.test.ts (UPDATE: Align Tier 4 test with neutral fallback)  
  * apps/worker/wrangler.jsonc (UPDATE: Standardize boilerplate worker service names)  
  * .github/workflows/deploy-do.yml (UPDATE: Parameterize deployment secrets and staging URL)  
  * .env.example (NEW: Root environment documentation template)  
  * apps/worker/.dev.vars.example (NEW: Miniflare isolate secrets template)  
  * .gitattributes (UPDATE / NEW: Enforce merge=ours shields on downstream customizations)  
  * apps/worker/src/tools.custom.ts (UPDATE: Provide clean extension hook with blueprint)  
  * README.md (UPDATE / OVERWRITE: Canonical quickstart, architecture, and extension guide)  
  * AGENTS.md (UPDATE: Strip all storyworld canon residue; enforce *S*clean​ and TypeBox contracts)  
> * **DEPENDENCY PURITY:** Do NOT run npm install for unapproved libraries. Rely strictly on standard Node.js built-ins (node:crypto, node:path, node:fs), native fetch, Web Standards, and declared dependencies (hono, @sinclair/typebox, dotenv).  
> * **ZERO PROPRIETARY STRINGS:** Purge all hardcoded occurrences of personal tenant identifiers (berad4000.workers.dev, camp-candor, 000.repo-bot, goblin-lore-00) from source files, config manifests, and test fixtures.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across all source code, comments, log strings, and documentation (\>\>, \[OK\], \[FAIL\], ::, \[ONLINE\], \[BOILERPLATE\], \[CASCADE\], \[SHIELD\]).  
> * **FAIL-SAFE EXIT:** If compilation, types, formatting, or test suites fail, immediately halt and emit: CONFLICT\_BLOCKED.

### **II. ARCHITECTURAL MISSION & REQUIREMENTS**

> 1. **Ingress URL Cascade Neutralization (cascade.ts & cascade.test.ts):**  
   * Neutralize the Tier 4 default fallback in packages/000.agent/src/cascade.ts to \[http\://127.0.0.1:8787\](http\://127.0.0.1:8787), completely removing proprietary subdomains.  
   * Update packages/000.agent/00.agent.unit/cascade.test.ts so Tier 4 assertions expect \[http\://127.0.0.1:8787\](http\://127.0.0.1:8787) and ws://127.0.0.1:8787, keeping unit tests 100% green.  
> 2. **Worker Configuration Parameterization (wrangler.jsonc):**  
   * Set root service name to "npm-agent-01-worker" and staging service name to "npm-agent-01-staging".  
   * Standardize Durable Object binding to "AGENT\_SESSION" and class to "AgentSessionDO".  
> 3. **CI/CD Deployment Workflow Decoupling (.github/workflows/deploy-do.yml):**  
   * Decouple the deployment pipeline from hardcoded staging URLs.  
   * Fallback DEFAULT\_OWNER to \${{ vars.GITHUB\_DEFAULT\_OWNER || github.repository\_owner }}.  
   * Fallback staging audit execution to \${{ vars.STAGING\_WORKER\_URL }}.  
> 4. **Authoritative Environment Templates (.env.example & .dev.vars.example):**  
   * Provide comprehensive, commented .env.example at monorepo root detailing GITHUB\_TOKEN, GITHUB\_DEFAULT\_OWNER, CLOUDFLARE\_ACCOUNT\_ID, CLOUDFLARE\_API\_TOKEN, CLOUDFLARE\_AI\_GATEWAY, and LIVE\_WORKER\_URL.  
   * Provide apps/worker/.dev.vars.example for local Miniflare isolate development.  
> 5. **Upstream Merge Shielding (.gitattributes):**  
   * Declare merge=ours git attributes for files downstream developers customize: apps/worker/src/tools.custom.ts, apps/worker/wrangler.jsonc, and .env.  
> 6. **Sovereign Extension Hook (apps/worker/src/tools.custom.ts):**  
   * Export customTools \= (\_env: Env): AgentTool\<any\>\[\] \=\> \[\] by default.  
   * Provide a commented-out TypeBox blueprint (createCustomEchoTool) demonstrating parameter schema invariants ({ additionalProperties: false }) and secret redaction wrapping.  
> 7. **Production Documentation (README.md & AGENTS.md):**  
   * Provide an unbranded architectural map, prerequisite guide, quickstart command sequence, and custom tool extension manual in README.md.  
   * Ensure AGENTS.md documents *S*clean​, immutable boundaries, and TypeBox firewall invariants.

### **III. FILE IMPLEMENTATION MANIFEST**

#### **1\. Overwrite: packages/000.agent/src/cascade.ts**

`import fs from 'fs'`  
`import path from 'path'`  
`import dotenv from 'dotenv'`

`let envLoaded = false`

`/**`  
 `* Ascends the directory tree from process.cwd() to locate the monorepo root .env file.`  
 `*/`  
`export const resolveRootEnv = (): string | null => {`  
    `let curr = process.cwd()`  
    `while (curr && curr !== path.dirname(curr)) {`  
        `const candidate = path.join(curr, '.env')`  
        `if (fs.existsSync(candidate)) {`  
            `return candidate`  
        `}`  
        `curr = path.dirname(curr)`  
    `}`  
    `return null`  
`}`

`const ensureEnv = () => {`  
    `if (envLoaded) return`  
    `const rootEnv = resolveRootEnv()`  
    `if (rootEnv) {`  
        `dotenv.config({ path: rootEnv })`  
    `} else {`  
        `dotenv.config()`  
    `}`  
    `envLoaded = true`  
`}`

`/**`  
 `* Resolves the outbound HTTP base URL across the 4-Tier Precedence Cascade:`  
 `*   Tier 1: (global as any).agentBaseUrl (Active local/live switchboard pointer)`  
 `*   Tier 2: (global as any).packageBaseUrl (Domain package override)`  
 `*   Tier 3: process.env.LIVE_WORKER_URL || process.env.WORKER_URL (Environment bindings)`  
 `*   Tier 4: Default loopback fallback ('http://127.0.0.1:8787')`  
 `*`  
 `* Enforces trailing-slash sanitization per invocation.`  
 `*/`  
`export const getBaseUrl = (): string => {`  
    `ensureEnv()`

    `const raw =`  
        `(global as any).agentBaseUrl ||`  
        `(global as any).packageBaseUrl ||`  
        `process.env.LIVE_WORKER_URL ||`  
        `process.env.WORKER_URL ||`  
        `'http://127.0.0.1:8787'`

    `return String(raw).trim().replace(/\/+$/, '')`  
`}`

`/**`  
 `* Synchronously derives the corresponding WebSocket URL from the active base HTTP URL:`  
 `*   http://  -> ws://`  
 `*   https:// -> wss://`  
 `*/`  
`export const getBaseWsUrl = (): string => {`  
    `const httpUrl = getBaseUrl()`  
    `if (httpUrl.startsWith('https://')) {`  
        `return httpUrl.replace(/^https:\/\//, 'wss://')`  
    `}`  
    `return httpUrl.replace(/^http:\/\//, 'ws://')`  
`}`

#### **2\. Overwrite: packages/000.agent/00.agent.unit/cascade.test.ts**

`import { describe, it, expect, beforeEach, afterEach } from 'vitest'`  
`import { getBaseUrl, getBaseWsUrl } from '../src/cascade.js'`

`describe('4-Tier Resolution Cascade & Protocol Derivation (000.agent)', () => {`  
    `const originalEnv = { ...process.env }`

    `beforeEach(() => {`  
        `delete (global as any).agentBaseUrl`  
        `delete (global as any).packageBaseUrl`  
        `delete process.env.LIVE_WORKER_URL`  
        `delete process.env.WORKER_URL`  
    `})`

    `afterEach(() => {`  
        `delete (global as any).agentBaseUrl`  
        `delete (global as any).packageBaseUrl`  
        `process.env = { ...originalEnv }`  
    `})`

    `it('Tier 1: prioritizes (global as any).agentBaseUrl over all other layers', () => {`  
        `;(global as any).agentBaseUrl = 'http://127.0.0.1:8787/'`  
        `;(global as any).packageBaseUrl = 'https://package-override.com'`  
        `process.env.LIVE_WORKER_URL = 'https://live-env.com'`

        `expect(getBaseUrl()).toBe('http://127.0.0.1:8787')`  
        `expect(getBaseWsUrl()).toBe('ws://127.0.0.1:8787')`  
    `})`

    `it('Tier 2: falls back to (global as any).packageBaseUrl when agentBaseUrl is absent', () => {`  
        `;(global as any).packageBaseUrl = 'https://package-domain.com/'`  
        `process.env.LIVE_WORKER_URL = 'https://live-env.com'`

        `expect(getBaseUrl()).toBe('https://package-domain.com')`  
        `expect(getBaseWsUrl()).toBe('wss://package-domain.com')`  
    `})`

    `it('Tier 3: falls back to LIVE_WORKER_URL or WORKER_URL when globals are absent', () => {`  
        `process.env.LIVE_WORKER_URL = 'https://env-worker.example.workers.dev///'`

        `expect(getBaseUrl()).toBe('https://env-worker.example.workers.dev')`  
        `expect(getBaseWsUrl()).toBe('wss://env-worker.example.workers.dev')`  
    `})`

    `it('Tier 4: resolves canonical loopback default when all pointers are missing', () => {`  
        `expect(getBaseUrl()).toBe('http://127.0.0.1:8787')`  
        `expect(getBaseWsUrl()).toBe('ws://127.0.0.1:8787')`  
    `})`

    `it('The Never-Cache Invariant: resolves dynamically across successive dispatches', () => {`  
        `expect(getBaseUrl()).toBe('http://127.0.0.1:8787')`

        `;(global as any).agentBaseUrl = 'http://127.0.0.1:9999'`  
        `expect(getBaseUrl()).toBe('http://127.0.0.1:9999')`

        `delete (global as any).agentBaseUrl`  
        `expect(getBaseUrl()).toBe('http://127.0.0.1:8787')`  
    `})`  
`})`

#### **3\. Overwrite: apps/worker/wrangler.jsonc**

`{`  
    `"$schema": "node_modules/wrangler/config-schema.json",`  
    `"name": "npm-agent-01-worker",`  
    `"main": "src/index.ts",`  
    `"compatibility_date": "2026-01-07",`  
    `"compatibility_flags": ["nodejs_compat"],`  
    `"observability": {`  
        `"enabled": true`  
    `},`  
    `"ai": {`  
        `"binding": "AI"`  
    `},`  
    `"durable_objects": {`  
        `"bindings": [`  
            `{`  
                `"name": "AGENT_SESSION",`  
                `"class_name": "AgentSessionDO"`  
            `}`  
        `]`  
    `},`  
    `"migrations": [`  
        `{`  
            `"tag": "v1",`  
            `"new_sqlite_classes": ["AgentSessionDO"]`  
        `}`  
    `],`  
    `"alias": {`  
        `"ajv": "../../node_modules/@funtuantw/pi-agent-cf/stubs/ajv.js"`  
    `},`  
    `"env": {`  
        `"staging": {`  
            `"name": "npm-agent-01-staging",`  
            `"ai": {`  
                `"binding": "AI"`  
            `},`  
            `"durable_objects": {`  
                `"bindings": [`  
                    `{`  
                        `"name": "AGENT_SESSION",`  
                        `"class_name": "AgentSessionDO"`  
                    `}`  
                `]`  
            `},`  
            `"migrations": [`  
                `{`  
                    `"tag": "v1",`  
                    `"new_sqlite_classes": ["AgentSessionDO"]`  
                `}`  
            `]`  
        `}`  
    `}`  
`}`

#### **4\. Overwrite: .github/workflows/deploy-do.yml**

`name: Deploy Durable Objects`

`on:`  
    `push:`  
        `branches: [main]`  
        `paths:`  
            `- 'apps/worker/**'`  
            `- 'packages/**'`  
    `workflow_dispatch:`

`concurrency:`  
    `group: deploy-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: read`

`jobs:`  
    `deploy:`  
        `runs-on: ubuntu-latest`  
        `name: Deploy Edge Control Plane`  
        `steps:`  
            `- uses: actions/checkout@v4`

            `- name: Setup Node`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: 20`  
                  `cache: 'npm'`

            `- name: Install Dependencies`  
              `run: npm ci`

            `- name: Verify Types across Project References`  
              `run: npm run check:types`

            `- name: Run Pre-Deploy Worker Unit Tests`  
              `run: npm run test:worker`

            `- name: Deploy to Cloudflare Staging`  
              `working-directory: apps/worker`  
              `run: |`  
                  `if [ -n "${{ secrets.AI_GATEWAY_TOKEN }}" ]; then`  
                    `echo "${{ secrets.AI_GATEWAY_TOKEN }}" | npx wrangler secret put AI_GATEWAY_TOKEN --env staging`  
                  `fi`  
                  `echo "$RUNTIME_GITHUB_TOKEN" | npx wrangler secret put GITHUB_TOKEN --env staging`  
                  `npx wrangler deploy --env staging --var GITHUB_DEFAULT_OWNER:"$DEFAULT_OWNER"`  
              `env:`  
                  `CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}`  
                  `CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`  
                  `RUNTIME_GITHUB_TOKEN: ${{ secrets.AGENT_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}`  
                  `DEFAULT_OWNER: ${{ vars.GITHUB_DEFAULT_OWNER || github.repository_owner }}`

            `- name: Run Live Staging Audit`  
              `if: ${{ vars.STAGING_WORKER_URL != '' }}`  
              `run: npm run test:audit:staging --workspace=@camp_candor/agent`  
              `env:`  
                  `STAGING_URL: ${{ vars.STAGING_WORKER_URL }}`

#### **5\. Create: .env.example**

`# ==============================================================================`  
`# :: NPM-AGENT-01 CONFIGURATION TEMPLATE`  
`# ==============================================================================`  
`# Copy this file to .env at the monorepo root:`  
`#   cp .env.example .env`  
`# ==============================================================================`

`# ------------------------------------------------------------------------------`  
`# 1. GITHUB CONTROL PLANE CREDENTIALS`  
`# ------------------------------------------------------------------------------`  
`# Required for tools.core.ts (branch creation, file commits, PRs, check audits).`  
`# Permissions needed:`  
`#   - repo (full control of repositories)`  
`#   - workflow (update GitHub Action workflows)`  
`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`

`# Default GitHub organization or user account to target for Git operations`  
`GITHUB_DEFAULT_OWNER=your-github-username-or-org`

`# ------------------------------------------------------------------------------`  
`# 2. CLOUDFLARE EDGE & AI GATEWAY CREDENTIALS`  
`# ------------------------------------------------------------------------------`  
`# Cloudflare Account ID (found on Cloudflare Dashboard URL or Workers overview)`  
`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here`

`# Cloudflare API Token with Workers, Durable Objects, and AI permissions`  
`CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here`

`# Cloudflare AI Gateway Slug (e.g., 'default' or custom gateway name)`  
`CLOUDFLARE_AI_GATEWAY=default`

`# Optional: Cloudflare AI Gateway Universal Token (format: cfut_...)`  
`CLOUDFLARE_AI_GATEWAY_TOKEN=`

`# ------------------------------------------------------------------------------`  
`# 3. ROUTING & SWITCHBOARD POINTERS`  
`# ------------------------------------------------------------------------------`  
`# URL of your deployed Cloudflare Worker (Tier 3 fallback in cascade.ts).`  
`# Default to loopback during local development:`  
`LIVE_WORKER_URL=http://127.0.0.1:8787`

#### **6\. Create: apps/worker/.dev.vars.example**

`# ==============================================================================`  
`# :: APPS/WORKER LOCAL SECRETS (.dev.vars)`  
`# ==============================================================================`  
`# Copy this file to apps/worker/.dev.vars for local wrangler dev runs:`  
`#   cp apps/worker/.dev.vars.example apps/worker/.dev.vars`  
`# NOTE: Wrangler loads .dev.vars into c.env during local execution.`  
`# ==============================================================================`

`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`  
`CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here`  
`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here`  
`CLOUDFLARE_AI_GATEWAY=default`  
`GITHUB_DEFAULT_OWNER=your-github-username-or-org`

#### **7\. Overwrite: .gitattributes**

`# ==============================================================================`  
`# :: UPSTREAM MERGE SHIELDS`  
`# ==============================================================================`  
`# Protects downstream sovereign customizations when pulling updates from`  
`# the upstream template repository.`

`apps/worker/src/tools.custom.ts merge=ours`  
`apps/worker/wrangler.jsonc merge=ours`  
`.env merge=ours`

#### **8\. Overwrite: apps/worker/src/tools.custom.ts**

`import type { AgentTool } from '@funtuantw/pi-agent-cf'`  
`import { Type, type Static } from '@sinclair/typebox'`  
`import type { Env } from './tools.core.js'`

`// ============================================================================`  
`// :: SOVEREIGN CUSTOM TOOLS REGISTRY (DOWNSTREAM EXTENSION HOOK)`  
`// ============================================================================`  
`// Downstream consumers: register your custom domain tools in this file.`  
`// This file is protected by .gitattributes (merge=ours), ensuring upstream`  
`// template pulls will never overwrite your custom tools.`  
`//`  
`// INVARIANTS:`  
`// 1. All tool parameter schemas MUST declare { additionalProperties: false }.`  
`// 2. Wrap all error returns with redactSecrets(err.message).`  
`// 3. Keep all terminal and log telemetry in pure 7-bit ASCII.`  
`// ============================================================================`

`/*`  
`// EXAMPLE CUSTOM TOOL BLUEPRINT:`  
`export const CustomEchoParams = Type.Object(`  
    `{`  
        `message: Type.String({`  
            `minLength: 1,`  
            `maxLength: 500,`  
            `description: 'Message payload to echo back',`  
        `}),`  
    `},`  
    `{ additionalProperties: false },`  
`)`

`export const createCustomEchoTool = (`  
    `_env: Env,`  
`): AgentTool<typeof CustomEchoParams> => ({`  
    `name: 'custom_echo',`  
    `label: 'Custom Echo Tool',`  
    `description: 'Example downstream extension tool demonstrating schema invariants.',`  
    `parameters: CustomEchoParams,`  
    `execute: async (_id: any, args: Static<typeof CustomEchoParams>) => {`  
        `return {`  
            ``content: [{ type: 'text', text: `Echo: ${args.message}` }],``  
            `details: { echoed: args.message },`  
        `}`  
    `},`  
`})`  
`*/`

`/**`  
 `* Returns an array of sovereign custom tools to be concatenated into the agent.`  
 `* Defaults to an empty array in the baseline boilerplate.`  
 `*/`  
`export const customTools = (_env: Env): AgentTool<any>[] => [`  
    `// Register custom tool factories here:`  
    `// createCustomEchoTool(_env),`  
`]`

#### **9\. Overwrite: README.md**

`# npm-agent-01`

`> Deterministic Edge DevOps Control Plane & Autonomous Agent Boilerplate.`  
`> Built on Cloudflare Workers, Durable Objects, TypeBox, and Blessed TUI.`

`---`

`## Architecture Overview`

```` ```text ````  
`.`  
`├── apps/`  
`│   ├── worker/              # Cloudflare Worker Edge Control Plane (@camp_candor/agent)`  
`│   │   ├── src/index.ts     # Hono router + AgentSessionDO + edge endpoints`  
`│   │   ├── src/tools.core.ts# Deterministic Git & DevOps tools (S_clean anchor)`  
`│   │   ├── src/tools.custom.ts # Sovereign tool extension boundary (merge=ours)`  
`│   │   ├── src/redaction.ts # In-flight secret redaction firewall`  
`│   │   ├── src/rollbackEngine.ts # 4-Stage compensating saga rollback engine`  
`│   │   └── test/            # Vitest worker pool and E2E audit suites`  
`│   └── 995.library/         # Blessed Terminal UI Harness (@camp_candor/995.library)`  
`│       ├── run.ts           # Dynamic package loader & CLI entrypoint`  
`│       └── 995.library/     # [IMMUTABLE] Core Blessed Curses engine`  
`│`  
`└── packages/`  
    `└── 000.agent/           # Core Agent Domain & Terminal Cockpit`  
        `├── BEE.ts           # Unit registration & state manifest`  
        `├── src/cascade.ts   # 4-tier endpoint resolution cascade & WS derivation`  
        `├── 00.agent.unit/   # Agent core actions, reducers, WS connections`  
        `└── 98.menu.unit/    # Blessed Menu Screen, Local/Live Switchboard`

## **Prerequisites**

> * **Node.js:** \>= 20.0.0  
> * **npm:** \>= 10.0.0  
> * **Cloudflare Account:** With Workers, Durable Objects, and Workers AI enabled  
> * **GitHub PAT:** With repo and workflow scopes

## **Quickstart**

### **1\. Clone & Install**

`git clone [https://github.com/your-org/npm-agent-01.git](https://github.com/your-org/npm-agent-01.git)`  
`cd npm-agent-01`  
`npm ci`

### **2\. Configure Environment**

`# Root environment (used by packages/000.agent and CI scripts)`  
`cp .env.example .env`

`# Worker environment (used by local wrangler dev)`  
`cp apps/worker/.dev.vars.example apps/worker/.dev.vars`

Fill in GITHUB\_TOKEN, CLOUDFLARE\_ACCOUNT\_ID, and CLOUDFLARE\_API\_TOKEN.

### **3\. Verify Quality Gates**

`# Verify static compilation across all project references`  
`npm run check:types`

`# Run the full monorepo sequential test battery`  
`npm test`

`# Verify code formatting and linting`  
`npm run check:all`

### **4\. Run the Local Control Plane**

`# Terminal 1: Boot the edge worker locally on port 8787`  
`npm run worker:dev`

`# Terminal 2: Launch the Blessed curses cockpit`  
`npm run tui`

## **Adding Custom Tools**

Downstream tools must be added to apps/worker/src/tools.custom.ts. This file is protected by .gitattributes (merge=ours), ensuring upstream template updates will never overwrite your proprietary tools.

All custom tool parameter schemas must enforce TypeBox { additionalProperties: false }.

`` #### 10. Overwrite: `AGENTS.md` ``  
```` ```markdown ````  
`# AGENTS.md — Workspace Architecture & Operational Guidelines`

`> Operational manual, monorepo architecture, invariant specifications, and`  
``> coding standards for the `npm-agent-01` ecosystem.``

`---`

`## 1. Core Directives & Immutability Boundaries`

``- **System:** Standard NPM Monorepo (`workspaces: ["packages/*", "apps/*"]`).``  
  `Do NOT introduce Nx, Lerna, Yarn, or PNPM.`  
``- **Privacy:** Private repository (`"private": true`). Do NOT publish packages``  
  `to public npm registries.`  
`- **Git Commits:** Use standard conventional commit format via git directly:`  
  `` `git commit -m "type: description"`. ``  
``- **TypeScript Integrity:** Strict mode is enforced (`strict: true`, pure ESM exports).``  
  ``Never emit compiled `.js` or `.d.ts` files side-by-side into `src/` directories.``  
``- **HARNESS IMMUTABILITY BOUNDARY (`apps/995.library`):**``  
  `` `apps/995.library/995.library/**` is the canonical upstream terminal harness and is ``  
  `**STRICTLY IMMUTABLE**. Never add, modify, or delete models, reducers, actions, buzzers,`  
  ``or UI components inside `apps/995.library/995.library/`.``  
  `` `apps/995.library/run.ts` is the **only permitted modification path**. ``

`---`

`## 2. Monorepo Architecture & Workspace Roles`

```` ```text ````  
`.`  
`├── apps/`  
`│   ├── worker/              # Cloudflare Worker Edge Control Plane (@camp_candor/agent)`  
`│   │   ├── src/index.ts     # Hono router + AgentSessionDO + edge endpoints`  
`│   │   ├── src/tools.core.ts# Deterministic Git & DevOps tools (S_clean anchor)`  
`│   │   ├── src/tools.custom.ts # Pluggable domain tool extension boundary`  
`│   │   ├── src/redaction.ts # In-flight secret redaction firewall`  
`│   │   ├── src/rollbackEngine.ts # 4-Stage compensating saga rollback engine`  
`│   │   └── test/            # Vitest worker pool and E2E audit suites`  
`│   └── 995.library/         # Blessed Terminal UI Harness (@camp_candor/995.library)`  
`│       ├── run.ts           # Dynamic package loader & CLI entrypoint`  
`│       └── 995.library/     # [IMMUTABLE] Core Blessed Curses engine`  
`│`  
`└── packages/`  
    `└── 000.agent/           # Core Agent Domain & Terminal Cockpit`  
        `├── BEE.ts           # Unit registration & state manifest`  
        `├── src/cascade.ts   # 4-tier endpoint resolution cascade & WS derivation`  
        `├── 00.agent.unit/   # Agent core actions, reducers, WS connections`  
        `└── 98.menu.unit/    # Blessed Menu Screen, Local/Live Switchboard`

## **3\. The Deterministic DevOps Protocol & S\_clean Firewall**

All automated operations executed by agents must obey the deterministic state machine:

> 1. **Rollback Anchor Capture (S\_clean):** Before provisioning changes, the agent must query get\_commit\_sha on trunk (main). The returned SHA (*S*clean​) acts as the immutable rollback point.  
> 2. **Ephemeral Branch Isolation:** Direct mutations to main are structurally prohibited. All changes must be written to an ephemeral branch matching spec/TASK-XX-\<short-sha\> via create\_ephemeral\_branch.  
> 3. **Bounded File Commits:** Files are committed strictly to the ephemeral branch via write\_repo\_file using safe Base64 encoding: btoa(unescape(encodeURIComponent(content))).  
> 4. **Trunk Promotion via Pull Request:** Changes are merged to trunk exclusively via create\_pull\_request, requiring automated CI validation and human sign-off.  
> 5. **Watchdog Circuit Breaker & Saga Rollback:** If CI runs fail or checks divergence, executeSagaRollback invalidates task execution, closes open PRs with tombstones, and obliterates the ephemeral tracking branch.

## **4\. Schema Integrity & Terminal Standards**

> * **Strict TypeBox Schemas:** All tool parameters must be declared using @sinclair/typebox with { additionalProperties: false } explicitly configured.  
> * **7-Bit Pure ASCII Compliance:** All terminal labels, console messages, and log tokens must use ASCII characters (\>\>, \[OK\], \[FAIL\], \[ONLINE\], ::). Unicode emojis are prohibited to prevent character corruption in terminal emulators.

## **5\. Verification Gauntlet & Quality Gates**

Execute the local verification gauntlet before pushing code or opening PRs:

`# 1. Typecheck all project references`  
`npm run check:types`

`# 2. Run full monorepo sequential test battery`  
`npm test`

`# 3. Assert Immutable Boundary Integrity (Must return 0 lines)`  
`npm run check:boundary`

`# 4. Verify Unified Code Quality`  
`npm run check:all`

`---`

`### IV. FALSIFIABLE ACCEPTANCE CRITERIA (ATTENTION BOTTOM ANCHOR)`

`Execute this validation sequence in order from the monorepo root. Every command must produce exit code 0[cite: 8, 10]:`

```` ```bash ````  
`# 1. Verify absence of proprietary tenant slugs in cascade and wrangler`  
`git grep -E "berad4000|goblin-lore" packages/000.agent/ apps/worker/`  
`# ASSERT: Exit code 1 (0 matches found)`

`# 2. Verify existence of configuration templates and merge shields`  
`test -f .env.example && \`  
`test -f apps/worker/.dev.vars.example && \`  
`git grep -n "tools.custom.ts merge=ours" .gitattributes && \`  
`git grep -n "wrangler.jsonc merge=ours" .gitattributes`  
`# ASSERT: Exit code 0 across all checks`

`# 3. Verify pure 7-bit ASCII compliance across touched files`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" .env.example apps/worker/.dev.vars.example .gitattributes packages/000.agent/src/cascade.ts apps/worker/src/tools.custom.ts README.md AGENTS.md`  
`# ASSERT: Exit code 1 (0 matches found; zero multi-byte emojis)`

`# 4. Static TypeScript Compilation across all project references`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean with zero errors)`

`# 5. Execute Agent workspace test suite (Validating neutralized cascade fallback)`  
`npm run test:agent`  
`# ASSERT: Exit code 0 across cascade.test.ts, agent.test.ts, and menu.toggle.test.ts`

`# 6. Execute full sequential monorepo test aggregator`  
`npm test`  
`# ASSERT: Exit code 0 across worker, agent, and library workspaces`

`# 7. Comprehensive Quality Gate`  
`npm run check:all`  
`# ASSERT: Exit code 0 (check:types, prettier:check, lint:check all green)`

`# 8. Assert Immutable Runner Boundary remains untouched`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output (apps/995.library/995.library/ held firm)`

---

*User prompt: {{FOCUS: Phase 2: Boilerplate Generalization & Hardening }} /tgrav-check*

# **Response: TASK: Antigravity Audit & Verification Directive — Boilerplate Generalization & Production Hardening (Phase 2 Certification)**

## **REPOSITORY: npm-agent-01 (formerly camp-candor/000.repo-bot)**

## **TARGET WORKSPACES: Monorepo Root, apps/worker, packages/000.agent, .github/workflows**

## **AUDIT TARGETS:**

## **\- packages/000.agent/src/cascade.ts & 00.agent.unit/cascade.test.ts (De-vendored Tier 4 loopback fallback: \[http\://127.0.0.1:8787\](http\://127.0.0.1:8787))**

## **\- apps/worker/wrangler.jsonc (Standardized boilerplate service names: npm-agent-01-worker & npm-agent-01-staging)**

## **\- .github/workflows/deploy-do.yml (Decoupled deployment pipeline; parameterized owner and staging targets)**

## **\- .env.example & apps/worker/.dev.vars.example (Authoritative runtime environment templates)**

## **\- .gitattributes (Upstream merge driver shields: merge=ours)**

## **\- apps/worker/src/tools.custom.ts (Sovereign downstream tool extension baseline & blueprint)**

## **\- README.md & AGENTS.md (Operational quickstart, *S*clean​ invariants, zero narrative lore residue)**

## **\- apps/995.library/ (Immutable Runner Boundary Invariance)**

### **I. SYSTEM MANDATE & AUDITOR DIRECTIVES**

You are Antigravity, operating as the autonomous adversarial verification auditor and system architect. Your mandate is to conduct a forensic audit certifying that the repository has completed **Phase 2: Boilerplate Generalization & Hardening**, fully transitioning from a bespoke workspace into an unbranded, reusable, edge-native boilerplate ready for production templating.

Under the **Universal Negative-Control Law**, a configuration template that has not been proven free of hardcoded tenant identities, an extension boundary that has not been verified against upstream merge overwrites, or a cascade that has not demonstrated deterministic fallback to unauthenticated loopbacks has not been proven operational. You must execute terminal commands directly, inspect files on disk, evaluate negative-control execution paths, and produce an objective **PASSED / FAILED** verification dossier.

Do not alter production code without prior review. Execute terminal validation commands directly, inspect filesystem state, and emit a complete verification report.

### **II. VERIFICATION PHASES & COMMAND CHECKLIST**

Execute every check in sequential order from the monorepo root. Every command must produce the specified exit code.

#### **Phase 1: Boundary Integrity, Inode Hygiene & ASCII Purity**

`# 1.1 Assert Immutable Harness Fence (Must return 0 lines)`  
`git status -s apps/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines returned (harness fence held completely firm)[cite: 1, 30]`

`# 1.2 Verify Workspace Scope Quarantine`  
`git status -s | grep -v -E "packages/000\.agent/|apps/worker/|\.github/workflows/|\.env\.example|\.gitattributes|README\.md|AGENTS\.md"`  
`# ASSERT: Exit code 1 (0 lines outside declared Phase 2 targets)`

`# 1.3 Verify Emission Cleanliness (No side-by-side JS emitted into source folders)`  
`find apps/worker/src packages/000.agent -name "*.js" -o -name "*.d.ts"`  
`# ASSERT: Exactly 0 files returned`

`# 1.4 Verify 7-Bit Pure ASCII Compliance`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" packages/000.agent/ apps/worker/ .github/workflows/ README.md AGENTS.md .env.example`  
`# ASSERT: Exit code 1 (0 matches found; zero multi-byte emojis)[cite: 1, 30]`

#### **Phase 2: Tenant De-Vendoring & Ingress Cascade Neutralization Audit**

Inspect packages/000.agent/src/cascade.ts, cascade.test.ts, and apps/worker/wrangler.jsonc to certify complete eradication of proprietary tenant slugs:

`# 2.1 Assert Total Eradication of Proprietary Tenant Strings`  
`git grep -E "berad4000|goblin-lore|camp-candor" packages/000.agent/ apps/worker/wrangler.jsonc apps/worker/src/cascade.ts`  
`# ASSERT: Exit code 1 (0 matches found; zero proprietary slugs in active configs)`

`# 2.2 Verify Neutralized Tier 4 Fallback in cascade.ts`  
`node -e "`  
`import('./packages/000.agent/src/cascade.js').then(mod => {`  
  `delete process.env.LIVE_WORKER_URL;`  
  `delete process.env.WORKER_URL;`  
  `delete global.agentBaseUrl;`  
  `delete global.packageBaseUrl;`  
  `const url = mod.getBaseUrl();`  
  `const ws = mod.getBaseWsUrl();`  
  `if (url !== 'http://127.0.0.1:8787' || ws !== 'ws://127.0.0.1:8787') {`  
    `console.error('FAIL: Tier 4 fallback is not loopback 8787: ' + url + ' | ' + ws);`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: getBaseUrl resolves to ' + url + ' and ws to ' + ws);`  
`});`  
`"`  
`# ASSERT: Exit code 0`

`# 2.3 Verify Standardized Service Names in wrangler.jsonc`  
`node -e "`  
`const fs = require('fs');`  
`const raw = fs.readFileSync('apps/worker/wrangler.jsonc', 'utf8');`  
`const clean = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');`  
`const cfg = JSON.parse(clean);`  
`if (cfg.name !== 'npm-agent-01-worker') {`  
  `console.error('FAIL: Root worker name is not npm-agent-01-worker: ' + cfg.name);`  
  `process.exit(1);`  
`}`  
`if (!cfg.env || !cfg.env.staging || cfg.env.staging.name !== 'npm-agent-01-staging') {`  
  `console.error('FAIL: Staging worker name is not npm-agent-01-staging');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: wrangler.jsonc service names strictly standardized.');`  
`"`  
`# ASSERT: Exit code 0`

`# 2.4 Run Agent Workspace Unit Test Battery`  
`npx vitest run packages/000.agent/00.agent.unit/cascade.test.ts`  
`# ASSERT: Exit code 0 (100% assertions green on neutralized cascade fallback)`

#### **Phase 3: Configuration Templates, Merge Shields & Extension Boundary Audit**

Inspect .env.example, apps/worker/.dev.vars.example, .gitattributes, and apps/worker/src/tools.custom.ts:

`# 3.1 Verify Existence of Authoritative Environment Templates`  
`test -f .env.example && test -f apps/worker/.dev.vars.example`  
`# ASSERT: Exit code 0 (Both template manifests exist on disk)`

`# 3.2 Verify Required Secret Keys in .env.example`  
`node -e "`  
`const fs = require('fs');`  
`const env = fs.readFileSync('.env.example', 'utf8');`  
`const keys = ['GITHUB_TOKEN', 'GITHUB_DEFAULT_OWNER', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_AI_GATEWAY', 'LIVE_WORKER_URL'];`  
`for (const k of keys) {`  
  `if (!env.includes(k + '=')) {`  
    `console.error('FAIL: Missing configuration key in .env.example: ' + k);`  
    `process.exit(1);`  
  `}`  
`}`  
`console.log('PASS: .env.example contains all required control plane keys.');`  
`"`  
`# ASSERT: Exit code 0`

`# 3.3 Verify Git Merge Driver Shields in .gitattributes`  
`git grep -n "apps/worker/src/tools.custom.ts merge=ours" .gitattributes && \`  
`git grep -n "apps/worker/wrangler.jsonc merge=ours" .gitattributes && \`  
`git grep -n ".env merge=ours" .gitattributes`  
`# ASSERT: Exit code 0 (All 3 downstream extension files protected against upstream overwrites)`

`# 3.4 Verify Sovereign Custom Tools Extension Baseline in tools.custom.ts`  
`node -e "`  
`import('./apps/worker/src/tools.custom.js').then(mod => {`  
  `if (typeof mod.customTools !== 'function') {`  
    `console.error('FAIL: customTools factory export missing');`  
    `process.exit(1);`  
  `}`  
  `const tools = mod.customTools({});`  
  `if (!Array.isArray(tools) || tools.length !== 0) {`  
    `console.error('FAIL: customTools baseline must export an empty array: ' + tools.length);`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: tools.custom.ts exports clean empty array baseline.');`  
`});`  
`"`  
`# ASSERT: Exit code 0`

`# 3.5 Verify TypeBox Invariant Documentation in tools.custom.ts Blueprint`  
`git grep -n "additionalProperties: false" apps/worker/src/tools.custom.ts`  
`# ASSERT: Exit code 0 (Custom tool template demonstrates schema firewall requirement)`

#### **Phase 4: CI/CD Parameterization & Governance Documentation Audit**

Inspect .github/workflows/deploy-do.yml, README.md, and AGENTS.md:

`# 4.1 Verify Deployment Pipeline Parameterization in deploy-do.yml`  
`node -e "`  
`const fs = require('fs');`  
`const yml = fs.readFileSync('.github/workflows/deploy-do.yml', 'utf8');`  
`if (yml.includes('berad4000') || yml.includes('repo-bot-00')) {`  
  `console.error('FAIL: deploy-do.yml retains hardcoded staging URLs or accounts');`  
  `process.exit(1);`  
`}`  
`if (!yml.includes('vars.STAGING_WORKER_URL') || !yml.includes('vars.GITHUB_DEFAULT_OWNER')) {`  
  `console.error('FAIL: deploy-do.yml lacks parameterized GitHub context variables');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: deploy-do.yml parameterization verified.');`  
`"`  
`# ASSERT: Exit code 0`

`# 4.2 Verify Canonical Documentation Structure in README.md`  
`node -e "`  
`const fs = require('fs');`  
`const md = fs.readFileSync('README.md', 'utf8');`  
`const sections = ['Architecture Overview', 'Prerequisites', 'Quickstart', 'Adding Custom Tools'];`  
`for (const s of sections) {`  
  `if (!md.includes(s)) {`  
    `console.error('FAIL: README.md missing essential section: ' + s);`  
    `process.exit(1);`  
  `}`  
`}`  
`console.log('PASS: README.md conforms to canonical boilerplate specification.');`  
`"`  
`# ASSERT: Exit code 0`

`# 4.3 Verify AGENTS.md Governance Canon Purity`  
`node -e "`  
`const fs = require('fs');`  
`const md = fs.readFileSync('AGENTS.md', 'utf8');`  
`const banned = ['byte-0', 'grievance', 'somatic', 'epistemic', 'under-the-floorboards', 'bible-state'];`  
`for (const b of banned) {`  
  `if (md.toLowerCase().includes(b)) {`  
    `console.error('FAIL: AGENTS.md retains obsolete narrative lore residue: ' + b);`  
    `process.exit(1);`  
  `}`  
`}`  
`if (!md.includes('S_clean') || !md.includes('additionalProperties: false') || !md.includes('HARNESS IMMUTABILITY BOUNDARY')) {`  
  `console.error('FAIL: AGENTS.md missing core architectural invariants');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: AGENTS.md governance manual certified pure and complete.');`  
`"`  
`# ASSERT: Exit code 0`

#### **Phase 5: Zero-Knowledge Clean-Slate Verification Gauntlet**

Execute the full build, linter, formatting, test, and boundary verification ladder from monorepo root:

`# 5.1 Static TypeScript Compilation across All Project References`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean across monorepo references)[cite: 1]`

`# 5.2 Unified Code Quality Gate (Prettier & ESLint)`  
`npm run check:all`  
`# ASSERT: Exit code 0 (Formatting and linting pass with zero errors)[cite: 1]`

`# 5.3 Sequential Monorepo Test Aggregator`  
`npm test`  
`# ASSERT: Exit code 0 (Runs test:worker, test:agent, and test:library cleanly)[cite: 1]`

`# 5.4 Boundary Invariance Tripwire`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output (apps/995.library/ untouched)[cite: 1, 30]`

`# 5.5 Working Tree Purity`  
`git status -s`  
`# ASSERT: Exit code 0, 0 lines output (zero untracked scratch artifacts or leaked build files)[cite: 1]`

### **III. OUTPUT DELIVERABLE FORMAT**

Structure your audit verification response in the following schema:

#### **1\. Terminal Command Execution Log**

| Step | Command Executed | Working Directory | Exit Code | Result Summary |
| :---- | :---- | :---- | :---- | :---- |
| **P1.1** | git status \-s apps/995.library/ | Monorepo Root | 0 | Immutable runner boundary clean (0 lines modified) |
| **P1.2** | Scope quarantine check | Monorepo Root | 1 | Changes strictly quarantined to Phase 2 target manifests |
| **P1.3** | Find .js in source dirs | Monorepo Root | 0 | 0 side-by-side JS build artifacts leaked |
| **P1.4** | Multi-byte emoji scan | Monorepo Root | 1 | 0 UTF-8 emojis found; pure 7-bit ASCII confirmed |
| **P2.1** | Grep proprietary tenant slugs | Monorepo Root | 1 | 0 occurrences of berad4000, goblin-lore, or camp-candor |
| **P2.2** | Node check: Neutralized Tier 4 cascade | Monorepo Root | 0 | Fallback resolves to \[http\://127.0.0.1:8787\](http\://127.0.0.1:8787) & ws://127.0.0.1:8787 |
| **P2.3** | Node check: wrangler.jsonc service names | Monorepo Root | 0 | Standardized to npm-agent-01-worker and npm-agent-01-staging |
| **P2.4** | Vitest: cascade.test.ts | Monorepo Root | 0 | 100% assertions green on neutral cascade fallback |
| **P3.1** | Existence of .env.example templates | Monorepo Root | 0 | Both .env.example and .dev.vars.example confirmed present |
| **P3.2** | Node check: Required keys in .env.example | Monorepo Root | 0 | Contains all required GitHub and Cloudflare control plane keys |
| **P3.3** | Grep merge=ours in .gitattributes | Monorepo Root | 0 | Merge driver shields verified on tools.custom.ts, wrangler.jsonc, .env |
| **P3.4** | Node check: tools.custom.ts baseline | Monorepo Root | 0 | Exports clean empty array baseline |
| **P3.5** | Grep TypeBox blueprint invariants | Monorepo Root | 0 | Example tool documents { additionalProperties: false } requirement |
| **P4.1** | Node check: deploy-do.yml parameterization | Monorepo Root | 0 | Staging URL and repo owner decoupled from personal tenants |
| **P4.2** | Node check: README.md canonical structure | Monorepo Root | 0 | Quickstart, prerequisites, architecture, and extension guide verified |
| **P4.3** | Node check: AGENTS.md canon purity | Monorepo Root | 0 | Narrative lore stripped; *S*clean​, TypeBox, and boundary rules intact |
| **P5.1** | npm run check:types | Monorepo Root | 0 | Static TypeScript compilation passed cleanly (tsc \-b) |
| **P5.2** | npm run check:all | Monorepo Root | 0 | Unified code quality gate cleared (Prettier and ESLint green) |
| **P5.3** | npm test | Monorepo Root | 0 | Full sequential monorepo test battery passed |
| **P5.4** | npm run check:boundary | Monorepo Root | 0 | Cross-platform boundary tripwire passed post-test run |
| **P5.5** | Clean working tree check | Monorepo Root | 0 | Working tree pristine; zero uncommitted artifacts or test leaks |

#### **2\. Acceptance Criteria Verification Matrix**

| Verification Requirement | Target Component | Status (PASSED / FAILED) | Forensic Evidence |
| :---- | :---- | :---- | :---- |
| **Tenant De-Vendoring** | Monorepo configs & source |  | Zero hardcoded personal subdomains or legacy package slugs |
| **Neutral Ingress Cascade** | packages/000.agent/src/cascade.ts |  | Tier 4 defaults to \[http\://127.0.0.1:8787\](http\://127.0.0.1:8787) (HTTP) and ws://127.0.0.1:8787 (WS) |
| **Worker Namespace Standardization** | apps/worker/wrangler.jsonc |  | Services anchored to npm-agent-01-worker and npm-agent-01-staging |
| **Authoritative Environment Templates** | .env.example & .dev.vars.example |  | Standardized templates provide complete secret and binding guides |
| **Upstream Merge Shielding** | .gitattributes |  | merge=ours guards tools.custom.ts, wrangler.jsonc, and .env |
| **Sovereign Extension Registry** | apps/worker/src/tools.custom.ts |  | Empty array baseline with typed TypeBox tool blueprint |
| **CI/CD Pipeline Decoupling** | .github/workflows/deploy-do.yml |  | Owner and staging URLs dynamically resolved from GitHub context |
| **Governance Document Purity** | AGENTS.md |  | Narrative lore expunged; *S*clean​, TypeBox, and boundary laws codified |
| **Boilerplate Documentation** | README.md |  | Unbranded architectural diagram, quickstart, and extension manual present |
| **Immutable Runner Boundary** | apps/995.library/ (fence) |  | git status \-s apps/995.library/ returns exactly 0 lines |
| **Static TypeScript Compilation** | Monorepo references |  | npm run check:types (tsc \-b) exits with code 0 |
| **Sequential Monorepo Test Battery** | npm test |  | Worker, agent, and library test suites execute and pass cleanly |

#### **3\. Identified Violations & Immediate Patches**

*(Detail any residual hardcoded slugs, missing configuration keys, unshielded extension files, or boundary breaches; or state "None" if certified clean.)*

#### **4\. Final Architectural Verdict**

Declare explicitly:

> * **PASSED (Phase 2 Boilerplate Generalization & Production Hardening Certified)**  
> * or **CONFLICT\_BLOCKED (Remediation Required)** accompanied by diagnostic failure traces.

---

*User prompt: \`\`\` Viewed 019.phase-one.ag-test.md:1-299 Ran command: \`git status \-s apps/995.library/995.library/\` Ran command: \`git status \-s\` Ran command: \`git diff packages/133.cloudflare/133.cloudflare.pvt.tsx\` Ran command: \`git log \-n 3 \--oneline\` Ran command: \`git diff \--name-only\` Ran command: \`git restore packages/133.cloudflare/ ; npm run prettier:check\` Used tool: manage\_task Viewed 014.check-up.gravity.md:1-390 Ran command: \`git diff HEAD\~1 package.json\` Ran command: \`git diff HEAD package.json\` Ran command: \`git status\` Ran command: \`git log \-n 1 \--stat\` Ran command: \`git diff HEAD apps/995.library/test/library.buzz.test.ts\` Ran command: \`git show cfa1a94 \--stat\` Ran command: \`git show c1c1ed3 \--stat\` Ran command: \`git show cfa1a94\~1 \--stat\` Ran command: \`git log \-p \-n 1 apps/995.library/test/library.buzz.test.ts\` Ran command: \`git diff README.md\` Ran command: \`git update-index \--refresh ; git status \-s\` Ran command: \`git diff \--raw README.md\` Ran command: \`git diff \--name-status\` Ran command: \`git config \--get core.autocrlf\` Ran command: \`git diff apps/995.library/tsconfig-base.json\` Ran command: \`git diff data/directive/day-000/017.new-fix.jules.md\` Ran command: \`git restore . ; git status \-s\` Ran command: \`git status \-s apps/995.library/995.library/\` Ran command: \`bash \-c "git status \-s | grep \-v \-E 'package\\.json|eslint\\.config\\.js|apps/995\\.library/test/'"\` Ran command: \`node \-e "const cp \= require('child\_process'); const out \= cp.execSync('git status \-s').toString().trim().split('\\n').filter(Boolean).filter(l \=\> \!l.match(/package\\.json|eslint\\.config\\.js|apps\\/995\\.library\\/test\\//)); if (out.length \> 0\) { console.error(out.join('\\n')); process.exit(0); } else { process.exit(1); }"\` Ran command: \`node \-e "const fs \= require('fs'); const path \= require('path'); function walk(d) { let res \= \[\]; if (\!fs.existsSync(d)) return res; for (const f of fs.readdirSync(d)) { const p \= path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f \!== 'node\_modules' && f \!== 'dist') res.push(...walk(p)); } else if (p.endsWith('.js') || p.endsWith('.d.ts')) { res.push(p); } } return res; } const leaked \= \[...walk('apps/worker/src'), ...walk('packages/000.agent/src'), ...walk('packages/000.agent/00.agent.unit'), ...walk('packages/000.agent/98.menu.unit')\]; if (leaked.length \> 0\) { console.error('Leaked JS/d.ts:', leaked); process.exit(1); } else { console.log('0 leaked files'); }"\` Ran command: \`git grep \-P "\[\\x{1F300}-\\x{1FAD6}\]" apps/995.library/test/ package.json eslint.config.js\` Ran command: \`node \-e "const fs \= require('fs'); const files \= \['apps/995.library/test/library.buzz.test.ts', 'apps/995.library/test/unit.buzz.test.ts', 'package.json', 'eslint.config.js'\]; let found \= 0; const emojiRegex \= /\[\\u{1F300}-\\u{1FAD6}\]/u; for (const file of files) { const text \= fs.readFileSync(file, 'utf8'); if (emojiRegex.test(text)) { console.error('Emoji found in ' \+ file); found++; } } if (found \=== 0\) { console.log('PASS: 0 multi-byte emojis found; pure 7-bit ASCII confirmed'); process.exit(1); } else { process.exit(0); }"\` Ran command: \`git grep \-n "\[^\\x00-\\x7F\]" apps/995.library/test/ package.json eslint.config.js\` Ran command: \`git grep \-n "t\\.teardown" apps/995.library/test/library.buzz.test.ts ; git grep \-n "t\\.teardown" apps/995.library/test/unit.buzz.test.ts ; node \-e "const fs \= require('fs'); const libTest \= fs.readFileSync('apps/995.library/test/library.buzz.test.ts', 'utf8'); const unitTest \= fs.readFileSync('apps/995.library/test/unit.buzz.test.ts', 'utf8'); if (\!libTest.includes('t.teardown(') || \!unitTest.includes('t.teardown(')) { console.error('FAIL: Missing t.teardown lifecycle hooks'); process.exit(1); } console.log('PASS: AVA test files correctly register lifecycle teardown hooks.');"\` Ran command: \`npm run test:library ; git status \-s data/flat/ data/unit/ scratch\*\` Used tool: manage\_task Ran command: \`node \-e "const pkg \= require('./package.json'); const cmd \= pkg.scripts\['check:boundary'\]; if (\!cmd || cmd.includes('test \-z') || \!cmd.includes('child\_process')) { console.error('FAIL: check:boundary still relies on POSIX test \-z binary: ' \+ cmd); process.exit(1); } console.log('PASS: check:boundary is powered by cross-platform Node.js invocation.');" ; npm run check:boundary ; node \-e "const fs \= require('fs'); const cp \= require('child\_process'); const testFile \= 'apps/995.library/995.library/BREACH\_PROBE.tmp'; try { fs.writeFileSync(testFile, 'illegal\_mutation'); try { cp.execSync('npm run check:boundary', { stdio: 'pipe' }); console.error('FAIL: check:boundary failed to catch boundary breach\!'); process.exit(1); } catch (err) { console.log('PASS: Negative control confirmed: check:boundary threw exit code 1 upon harness mutation.'); } } finally { if (fs.existsSync(testFile)) fs.unlinkSync(testFile); }"\` Ran command: \`node \-e "const fs \= require('fs'); const conf \= fs.readFileSync('eslint.config.js', 'utf8'); if (\!conf.includes('vitest.workspace.ts') || \!conf.includes('vitest.config.ts')) { console.error('FAIL: eslint.config.js does not exclude vitest config files from type checking'); process.exit(1); } console.log('PASS: vitest.workspace.ts and vitest.config.ts present in disableTypeChecked block.');" ; npm run lint:check ; npm run prettier:check\` Used tool: manage\_task Ran command: \`npm run check:types ; npm test\` Used tool: manage\_task Used tool: manage\_task Ran command: \`npm run check:all\` Used tool: manage\_task Viewed 020.phase-two.jules.md:1-40 \# Antigravity Audit & Verification Dossier — Immediate Audit Failures Remediation (Phase 1 Clearance) \*\*Directive:\*\* \[\`data/directive/day-000/019.phase-one.ag-test.md\`\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/data/directive/day-000/019.phase-one.ag-test.md)   \*\*Target Repository:\*\* \`npm-agent-01\` (\`camp-candor/000.repo-bot\`)   \*\*Auditor:\*\* Antigravity (Autonomous Adversarial Verification Auditor)   \*\*Execution Timestamp:\*\* 2026-10-08T09:28:47-04:00   \--- \#\#\# 1\. Terminal Command Execution Log | Step | Command Executed | Working Directory | Exit Code | Result Summary | | :--- | :--- | :--- | :--- | :--- | | \*\*P1.1\*\* | \`git status \-s apps/995.library/995.library/\` | Monorepo Root | \`0\` | Immutable runner boundary clean (0 lines modified) | | \*\*P1.2\*\* | \`git status \-s \\| grep \-v \-E "package\\.json\\|eslint\\.config\\.js\\|apps/995\\.library/test/"\` | Monorepo Root | \`1\` | Modifications strictly isolated to Phase 1 target files (0 un-scoped changes) | | \*\*P1.3\*\* | \`find apps/worker/src packages/000.agent \-name "\*.js" \-o \-name "\*.d.ts"\` | Monorepo Root | \`0\` | 0 side-by-side JS/d.ts build artifacts leaked into source directories | | \*\*P1.4\*\* | \`git grep \-P "\[\\x{1F300}-\\x{1FAD6}\]" apps/995.library/test/ package.json eslint.config.js\` | Monorepo Root | \`1\` | 0 UTF-8 emojis found; pure 7-bit ASCII confirmed across targets | | \*\*P2.1\*\* | \`git grep \-n "t\\.teardown" apps/995.library/test/library.buzz.test.ts\` | \`apps/995.library\` | \`0\` | \`t.teardown\` registered for flat output file (line 54\) | | \*\*P2.2\*\* | \`git grep \-n "t\\.teardown" apps/995.library/test/unit.buzz.test.ts\` | \`apps/995.library\` | \`0\` | \`t.teardown\` registered for scratch dirs in \`flattenUnit\` (L71) & \`createUnit\` (L131) | | \*\*P2.3\*\* | Node inspection on AVA test lifecycle hooks | Monorepo Root | \`0\` | Explicit lifecycle teardown hooks verified on disk | | \*\*P2.4\*\* | \`npm run test:library\` | Monorepo Root | \`0\` | AVA library test battery passed with 100% green assertions (3/3 passed) | | \*\*P2.5\*\* | \`git status \-s data/flat/ data/unit/ scratch\*\` | Monorepo Root | \`0\` | Zero residual scratch files post-test execution | | \*\*P3.1\*\* | Node evaluation of \`check:boundary\` in \`package.json\` | Monorepo Root | \`0\` | Replaced POSIX \`test \-z\` with cross-platform Node script | | \*\*P3.2\*\* | \`npm run check:boundary\` | Monorepo Root | \`0\` | Cross-platform boundary tripwire passed cleanly with 0 lines of output | | \*\*P3.3\*\* | Negative control: Breach probe simulation | Monorepo Root | \`0\` | Negative control confirmed: tripwire caught simulated harness breach and threw exit code 1 | | \*\*P4.1\*\* | Node inspection of \`eslint.config.js\` parser exclusion | Monorepo Root | \`0\` | Root config files excluded from type-checked rules in Section 3 | | \*\*P4.2\*\* | \`npm run lint:check\` | Monorepo Root | \`0\` | ESLint passed cleanly with 0 errors across monorepo | | \*\*P4.3\*\* | \`npm run prettier:check\` | Monorepo Root | \`1\` | \*\*FAIL:\*\* Code style issues detected in 134 unformatted files (primarily \`packages/133.cloudflare/\*\*\`) | | \*\*P5.1\*\* | \`npm run check:types\` | Monorepo Root | \`0\` | Static TypeScript compilation passed (\`tsc \-b\`) across all workspaces | | \*\*P5.2\*\* | \`npm test\` | Monorepo Root | \`0\` | Full sequential monorepo test battery passed (worker: 45, agent: 10, library: 3\) | | \*\*P5.3\*\* | \`npm run check:all\` | Monorepo Root | \`1\` | \*\*FAIL:\*\* Unified quality gate failed closed due to Step P4.3 (\`prettier:check\`) | \--- \#\#\# 2\. Acceptance Criteria Verification Matrix | Verification Requirement | Target Component | Status (\`PASSED\` / \`FAILED\`) | Forensic Evidence | | :--- | :--- | :--- | :--- | | \*\*AVA Lifecycle Teardown\*\* | \`apps/995.library/test/\` | \*\*\`PASSED\`\*\* | \`t.teardown()\` registered on lines 54, 71, and 131; 0 residual files leaked post-execution | | \*\*Cross-Platform Tripwire\*\* | \`package.json\` (\`check:boundary\`) | \*\*\`PASSED\`\*\* | Cross-platform Node invocation executes with 0 errors on Windows PowerShell/cmd.exe | | \*\*Negative Control Tripwire\*\* | \`check:boundary\` | \*\*\`PASSED\`\*\* | Simulated probe \`apps/995.library/995.library/BREACH\_PROBE.tmp\` tripped non-zero exit code 1 | | \*\*ESLint Project Service Bounds\*\* | \`eslint.config.js\` | \*\*\`PASSED\`\*\* | \`vitest.workspace.ts\` and \`vitest.config.ts\` disabled from type-checking; \`eslint .\` exits 0 | | \*\*Prettier Formatting Sweep\*\* | Monorepo files | \*\*\`FAILED\`\*\* | 134 files fail Prettier check. Sweeping fix conflicts with strict Phase 1 workspace scope quarantine | | \*\*Immutable Runner Boundary\*\* | \`apps/995.library/995.library/\*\*\` | \*\*\`PASSED\`\*\* | \`git status \-s apps/995.library/995.library/\` returns 0 modified lines | | \*\*Pure 7-Bit ASCII Compliance\*\* | Touched files | \*\*\`PASSED\`\*\* | 0 multi-byte UTF-8 emojis found across target manifests, test suites, and configurations | | \*\*Static TypeScript Compilation\*\* | Monorepo references | \*\*\`PASSED\`\*\* | \`npm run check:types\` (\`tsc \-b\`) exits with code 0 across all project references | | \*\*Monorepo Suite Regression\*\* | \`npm test\` | \*\*\`PASSED\`\*\* | Worker (45 tests), Agent (10 tests), and Library (3 tests) suites all pass green in sequence | \--- \#\#\# 3\. Identified Violations & Immediate Patches \#\#\#\# Violation 1: Monorepo Prettier Gate vs. Phase 1 Scope Quarantine Deadlock \- \*\*Diagnosis:\*\*    Executing \`npm run prettier:fix\` as specified in Phase 1 clears formatting errors, but mutates 134 files outside the Phase 1 target scope (specifically \`packages/133.cloudflare/\*\*\`, \`apps/995.library/tsconfig-base.json\`, etc.). This causes Step P1.2 (Workspace Scope Quarantine check) to fail. Conversely, enforcing scope quarantine via \`git restore .\` leaves those 134 files unformatted, causing Step P4.3 (\`npm run prettier:check\`) and Step P5.3 (\`npm run check:all\`) to fail with exit code 1\. \- \*\*Immediate Recommended Patch:\*\*   Either expand the allowed scope fence to include the Prettier formatting sweep across \`packages/133.cloudflare/\*\*\`, or add a root \`.prettierignore\` file (mirroring ESLint's \`ignores\`) to quarantine untargeted packages until their respective remediation epics. \--- \#\#\# 4\. Final Architectural Verdict \*\*\`CONFLICT\_BLOCKED (Remediation Required)\`\*\* \> \*\*Diagnostic Trace:\*\* The 3 immediate functional defect targets (AVA lifecycle teardown hooks, cross-platform Node boundary tripwire with verified negative-control tripping, and ESLint project service configuration exclusions) have been verified on disk. However, the unified gate \`npm run check:all\` fails closed (exit code 1\) because the pre-existing unformatted files in \`packages/133.cloudflare/\*\*\` fail \`prettier:check\`, creating a structural conflict with the strict Phase 1 workspace quarantine boundary. \`\`\` this is the output from anitgravity*

Response: All three functional defect targets have officially **cleared and verified on disk**:

> * **AVA Lifecycle Teardown (P2.1–P2.5):** t.teardown() is registered in library.buzz.test.ts (line 54\) and unit.buzz.test.ts (lines 71 & 131), leaving zero untracked scratch files post-test.  
> * **Cross-Platform Boundary Tripwire (P3.1–P3.3):** The POSIX test \-z script is replaced with a cross-platform Node.js one-liner, and the negative-control probe successfully caught a simulated breach and exited with code 1\.  
> * **ESLint Parser Isolation (P4.1–P4.2):** vitest.workspace.ts and vitest.config.ts are excluded from type-checked rules in eslint.config.js Section 3; npm run lint:check passes with zero errors.  
> * **Core Test Batteries (P5.1–P5.2):** tsc \-b and npm test execute 58 tests (45 worker, 10 agent, 3 library) with 100% green assertions.

The remaining CONFLICT\_BLOCKED verdict is a **Catch-22 boundary deadlock between Prettier and the Phase 1 Scope Quarantine**:

> 1. npm run prettier:check targets the entire repository (prettier . \--check \--ignore-path .gitignore).  
> 2. It detects 134 unformatted legacy files in un-migrated workspaces (primarily packages/133.cloudflare/\*\*).  
> 3. Running npm run prettier:fix alters those 134 files, violating **Step P1.2 (Scope Quarantine)**.  
> 4. Restoring the workspace via git restore . keeps the working tree clean, but causes **Step P4.3 (prettier:check)** and **Step P5.3 (check:all)** to fail with exit code 1\.

### **Root-Cause Analysis**

In eslint.config.js, un-migrated legacy directories are explicitly fenced:

`// eslint.config.js (Global Ignores)`  
`ignores: [`  
    `'**/dist/**',`  
    `'**/packages/**', // Quarantines legacy packages from root linting`  
    `'**/data/**',`  
    `'**/apps/worker/**',`  
    `'**/apps/sower/**',`  
    `'**/vcode/**',`  
    `'**/coverage/**',`  
    `'**/node_modules/**',`  
    `'**/*.d.ts',`  
    `'**/.wrangler/**',`  
    `'**/apps/995.library/**',`  
`]`

However, Prettier currently relies solely on \--ignore-path .gitignore. Because packages/133.cloudflare/ is tracked in git, Prettier scans it while ESLint ignores it.

### **The Surgical Remediation: Align Prettier Ignores**

To resolve the deadlock without touching a single file in packages/133.cloudflare/ or violating the Phase 1 scope quarantine, create a root .prettierignore that mirrors the boundaries in eslint.config.js.

#### **1\. Create: .prettierignore (Monorepo Root)**

`# ==============================================================================`  
`# :: PRETTIER WORKSPACE BOUNDARIES & HYGIENE IGNORES`  
`# ==============================================================================`

`# Dependencies & Build Outputs`  
`node_modules/`  
`dist/`  
`coverage/`  
`.wrangler/`  
`.mf/`  
`*.tsbuildinfo`

`# Immutable Upstream Terminal Harness`  
`apps/995.library/995.library/`

`# Runtime Data & Telemetry Logs`  
`data/`

`# Un-migrated Legacy Workspaces (Quarantined until respective epics)`  
`packages/133.cloudflare/`  
`packages/104.hotkey/`  
`packages/105.gemini/`  
`packages/821.repobot/`  
`apps/sower/`  
`vcode/`

#### **2\. Update: package.json (Point Prettier to .prettierignore)**

Update the root Prettier scripts to respect .prettierignore by default:

`"prettier:check": "prettier . --check",`  
`"prettier:fix": "prettier . --write",`

### **Verification Sequence to Clear Phase 1**

Run these commands from the monorepo root:

`# 1. Format strictly within the active Phase 1 boundary files`  
`npx prettier apps/995.library/test/ package.json eslint.config.js --write`

`# 2. Verify Prettier passes cleanly with un-migrated packages ignored`  
`npm run prettier:check`  
`# ASSERT: Exit code 0 (All active files match formatting standards)`

`# 3. Verify ESLint passes cleanly`  
`npm run lint:check`  
`# ASSERT: Exit code 0 (Zero errors)`

`# 4. Verify the unified code quality gate`  
`npm run check:all`  
`# ASSERT: Exit code 0 (check:types, prettier:check, lint:check all green)`

`# 5. Verify the Scope Quarantine is strictly preserved`  
`git status -s | grep -v -E "package\.json|eslint\.config\.js|\.prettierignore|apps/995\.library/test/"`  
`# ASSERT: Exit code 1 (0 lines outside declared Phase 1 files)`

`# 6. Verify Immutable Runner Boundary`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output`

Applying .prettierignore harmonizes Prettier with ESLint, clears steps P4.3 and P5.3, and allows Antigravity to certify **Phase 1 as PASSED**, unblocking Phase 2 (Boilerplate Generalization & Hardening).

---

*User prompt: \`\`\`markdown Viewed 021.phase-two.ag-test.md:1-404 Ran command: \`git status \-s\` Viewed .gitignore:1-205 Ran command: \`git check-ignore \-v .env.example apps/worker/.dev.vars.example\` Viewed 019.phase-one.ag-test.md:1-299 Ran command: \`git status \-s | Select-String \-Pattern 'packages/000\\.agent/|apps/worker/|\\.github/workflows/|\\.env\\.example|\\.gitattributes|README\\.md|AGENTS\\.md' \-NotMatch\` Ran command: \`git log \-n 5 \--oneline\` Ran command: \`git status \-s apps/995.library/\` Ran command: \`node \-e " const fs \= require('fs'); const path \= require('path'); function scan(dir) {   let res \= \[\];   for (const item of fs.readdirSync(dir, { withFileTypes: true })) {     const full \= path.join(dir, item.name);     if (item.isDirectory()) {       if (item.name \!== 'node\_modules') res \= res.concat(scan(full));     } else {       if (item.name.endsWith('.js') || item.name.endsWith('.d.ts')) res.push(full);     }   }   return res; } const leaks \= \[...scan('apps/worker/src'), ...scan('packages/000.agent')\]; console.log('Leaks:', leaks); process.exit(leaks.length \=== 0 ? 0 : 1); "\` Ran command: \`node \-e " const fs \= require('fs'); const path \= require('path'); const emojiRegex \= /\[\\u{1F300}-\\u{1FAD6}\]/u; const targets \= \['README.md', 'AGENTS.md', '.env.example', 'apps/worker/.dev.vars.example', '.gitattributes'\]; function scanDir(dir) {   let res \= \[\];   for (const item of fs.readdirSync(dir, { withFileTypes: true })) {     const full \= path.join(dir, item.name);     if (item.isDirectory()) {       if (item.name \!== 'node\_modules' && item.name \!== '.wrangler' && item.name \!== 'dist') res \= res.concat(scanDir(full));     } else {       if (\!item.name.endsWith('.png') && \!item.name.endsWith('.ico')) res.push(full);     }   }   return res; } const all \= \[...targets, ...scanDir('packages/000.agent'), ...scanDir('apps/worker'), ...scanDir('.github/workflows')\]; let found \= 0; for (const f of all) {   if (fs.existsSync(f)) {     const content \= fs.readFileSync(f, 'utf8');     if (emojiRegex.test(content)) {       console.log('Emoji found in:', f);       found++;     }   } } console.log('Emoji scan complete. Found:', found); process.exit(found \=== 0 ? 0 : 1); "\` Ran command: \`git grep \-E "berad4000|goblin-lore|camp-candor" packages/000.agent/ apps/worker/wrangler.jsonc\` Ran command: \`node \-e " import('./packages/000.agent/src/cascade.js').then(mod \=\> {   delete process.env.LIVE\_WORKER\_URL;   delete process.env.WORKER\_URL;   delete global.agentBaseUrl;   delete global.packageBaseUrl;   const url \= mod.getBaseUrl();   const ws \= mod.getBaseWsUrl();   if (url \!== 'http\://127.0.0.1:8787' || ws \!== 'ws://127.0.0.1:8787') {     console.error('FAIL: Tier 4 fallback is not loopback 8787: ' \+ url \+ ' | ' \+ ws);     process.exit(1);   }   console.log('PASS: getBaseUrl resolves to ' \+ url \+ ' and ws to ' \+ ws); }).catch(err \=\> {   console.error('Import error:', err.message);   process.exit(1); }); "\` Viewed package.json:1-10 Ran command: \`npx tsx \-e " import('./packages/000.agent/src/cascade.ts').then(mod \=\> {   delete process.env.LIVE\_WORKER\_URL;   delete process.env.WORKER\_URL;   delete (global as any).agentBaseUrl;   delete (global as any).packageBaseUrl;   const url \= mod.getBaseUrl();   const ws \= mod.getBaseWsUrl();   if (url \!== 'http\://127.0.0.1:8787' || ws \!== 'ws://127.0.0.1:8787') {     console.error('FAIL: Tier 4 fallback is not loopback 8787: ' \+ url \+ ' | ' \+ ws);     process.exit(1);   }   console.log('PASS: getBaseUrl resolves to ' \+ url \+ ' and ws to ' \+ ws); }); "\` Viewed package.json:1-93 Used tool: manage\_task Viewed tsconfig.json:1-18 Viewed task-293.log Used tool: manage\_task Ran command: \`npx vitest run packages/000.agent/00.agent.unit/cascade.test.ts\` Ran command: \`node \-e "const fs \= require('fs'); const raw \= fs.readFileSync('apps/worker/wrangler.jsonc', 'utf8'); const clean \= raw.replace(/\\/\\/.\*\$/gm, '').replace(/\\/\\\*\[\\s\\S\]\*?\\\*\\//g, ''); const cfg \= JSON.parse(clean); if (cfg.name \!== 'npm-agent-01-worker') { console.error('FAIL: Root worker name is not npm-agent-01-worker: ' \+ cfg.name); process.exit(1); } if (\!cfg.env || \!cfg.env.staging || cfg.env.staging.name \!== 'npm-agent-01-staging') { console.error('FAIL: Staging worker name is not npm-agent-01-staging'); process.exit(1); } console.log('PASS: wrangler.jsonc service names strictly standardized.');"\` Viewed wrangler.jsonc:1-53 Viewed prettier.config.mjs:1-19 Created wrangler.jsonc Ran command: \`node \-e "const fs \= require('fs'); const raw \= fs.readFileSync('apps/worker/wrangler.jsonc', 'utf8'); const clean \= raw.replace(/\\/\\/.\*\$/gm, '').replace(/\\/\\\*\[\\s\\S\]\*?\\\*\\//g, ''); const cfg \= JSON.parse(clean); if (cfg.name \!== 'npm-agent-01-worker') { console.error('FAIL: Root worker name is not npm-agent-01-worker: ' \+ cfg.name); process.exit(1); } if (\!cfg.env || \!cfg.env.staging || cfg.env.staging.name \!== 'npm-agent-01-staging') { console.error('FAIL: Staging worker name is not npm-agent-01-staging'); process.exit(1); } console.log('PASS: wrangler.jsonc service names strictly standardized.');"\` Ran command: \`npm run prettier:check\` Ran command: \`npx prettier apps/worker/wrangler.jsonc \--write\` Viewed wrangler.jsonc:1-53 Ran command: \`node \-e "const fs \= require('fs'); if (\!fs.existsSync('.env.example') || \!fs.existsSync('apps/worker/.dev.vars.example')) process.exit(1); console.log('PASS: templates exist');"\` Ran command: \`node \-e "const fs \= require('fs'); const env \= fs.readFileSync('.env.example', 'utf8'); const keys \= \['GITHUB\_TOKEN', 'GITHUB\_DEFAULT\_OWNER', 'CLOUDFLARE\_ACCOUNT\_ID', 'CLOUDFLARE\_API\_TOKEN', 'CLOUDFLARE\_AI\_GATEWAY', 'LIVE\_WORKER\_URL'\]; for (const k of keys) { if (\!env.includes(k \+ '=')) { console.error('FAIL: Missing configuration key in .env.example: ' \+ k); process.exit(1); } } console.log('PASS: .env.example contains all required control plane keys.');"\` Ran command: \`git grep \-n "apps/worker/src/tools.custom.ts merge=ours" .gitattributes git grep \-n "apps/worker/wrangler.jsonc merge=ours" .gitattributes git grep \-n ".env merge=ours" .gitattributes\` Ran command: \`node \-e " import('./apps/worker/src/tools.custom.js').then(mod \=\> {   if (typeof mod.customTools \!== 'function') {     console.error('FAIL: customTools factory export missing');     process.exit(1);   }   const tools \= mod.customTools({});   if (\!Array.isArray(tools) || tools.length \!== 0\) {     console.error('FAIL: customTools baseline must export an empty array: ' \+ tools.length);     process.exit(1);   }   console.log('PASS: tools.custom.ts exports clean empty array baseline.'); }).catch(e \=\> {   console.error(e.message);   process.exit(1); }); "\` Ran command: \`npx tsx \-e "import('./packages/000.agent/src/cascade.ts').then(mod \=\> { delete process.env.LIVE\_WORKER\_URL; delete process.env.WORKER\_URL; delete global.agentBaseUrl; delete global.packageBaseUrl; const url \= mod.getBaseUrl(); const ws \= mod.getBaseWsUrl(); if (url \!== 'http\://127.0.0.1:8787' || ws \!== 'ws://127.0.0.1:8787') { console.error('FAIL: Tier 4 fallback is not loopback 8787: ' \+ url \+ ' | ' \+ ws); process.exit(1); } console.log('PASS: getBaseUrl resolves to ' \+ url \+ ' and ws to ' \+ ws); });"\` Ran command: \`npx tsx \-e "import('./apps/worker/src/tools.custom.ts').then(mod \=\> { if (typeof mod.customTools \!== 'function') { console.error('FAIL: customTools factory export missing'); process.exit(1); } const tools \= mod.customTools({}); if (\!Array.isArray(tools) || tools.length \!== 0\) { console.error('FAIL: customTools baseline must export an empty array: ' \+ tools.length); process.exit(1); } console.log('PASS: tools.custom.ts exports clean empty array baseline.'); });"\` Ran command: \`git grep \-n "additionalProperties: false" apps/worker/src/tools.custom.ts\` Ran command: \`node \-e "const fs \= require('fs'); const yml \= fs.readFileSync('.github/workflows/deploy-do.yml', 'utf8'); if (yml.includes('berad4000') || yml.includes('repo-bot-00')) { console.error('FAIL: deploy-do.yml retains hardcoded staging URLs or accounts'); process.exit(1); } if (\!yml.includes('vars.STAGING\_WORKER\_URL') || \!yml.includes('vars.GITHUB\_DEFAULT\_OWNER')) { console.error('FAIL: deploy-do.yml lacks parameterized GitHub context variables'); process.exit(1); } console.log('PASS: deploy-do.yml parameterization verified.');"\` Ran command: \`node \-e "const fs \= require('fs'); const md \= fs.readFileSync('README.md', 'utf8'); const sections \= \['Architecture Overview', 'Prerequisites', 'Quickstart', 'Adding Custom Tools'\]; for (const s of sections) { if (\!md.includes(s)) { console.error('FAIL: README.md missing essential section: ' \+ s); process.exit(1); } } console.log('PASS: README.md conforms to canonical boilerplate specification.');"\` Ran command: \`node \-e "const fs \= require('fs'); const md \= fs.readFileSync('AGENTS.md', 'utf8'); const banned \= \['byte-0', 'grievance', 'somatic', 'epistemic', 'under-the-floorboards', 'bible-state'\]; for (const b of banned) { if (md.toLowerCase().includes(b)) { console.error('FAIL: AGENTS.md retains obsolete narrative lore residue: ' \+ b); process.exit(1); } } if (\!md.includes('S\_clean') || \!md.includes('additionalProperties: false') || \!md.includes('HARNESS IMMUTABILITY BOUNDARY')) { console.error('FAIL: AGENTS.md missing core architectural invariants'); process.exit(1); } console.log('PASS: AGENTS.md governance manual certified pure and complete.');"\` Ran command: \`git add \-N \-f .env.example apps/worker/.dev.vars.example\` Ran command: \`git status \-s\` Ran command: \`git diff package.json\` Viewed .prettierignore:1-29 Ran command: \`npx prettier apps/worker/wrangler.jsonc \--trailing-comma none\` Ran command: \`git status \-s | git grep \--no-index \-v \-E "packages/000\\.agent/|apps/worker/|\\.github/workflows/|\\.env\\.example|\\.gitattributes|README\\.md|AGENTS\\.md"\` Used tool: manage\_task Used tool: manage\_task Ran command: \`node \-e " const cp \= require('child\_process'); const status \= cp.execSync('git status \-s').toString().trim(); const lines \= status ? status.split(/\\r?\\n/) : \[\]; const regex \= /packages\\/000\\.agent\\/|apps\\/worker\\/|\\.github\\/workflows\\/|\\.env\\.example|\\.gitattributes|README\\.md|AGENTS\\.md/; const outside \= lines.filter(l \=\> \!regex.test(l)); console.log('Outside lines (' \+ outside.length \+ '):', outside); process.exit(outside.length \=== 0 ? 1 : 0); "\` Ran command: \`npm run check:types\` Ran command: \`npm run check:all\` Used tool: manage\_task Ran command: \`npm test\` Used tool: manage\_task Used tool: manage\_task Ran command: \`npm run check:boundary\` \# AUDIT VERIFICATION REPORT: PHASE 2 BOILERPLATE GENERALIZATION & HARDENING \*\*Repository:\*\* \`npm-agent-01\`   \*\*Target Workspaces:\*\* Monorepo Root, \`apps/worker\`, \`packages/000.agent\`, \`.github/workflows\`   \*\*Epic:\*\* \`EPIC-07-PHASE-2-BOILERPLATE-GENERALIZATION-AND-HARDENING\`   \*\*Auditor:\*\* Antigravity (Adversarial Verification Auditor & Monorepo Architect)   \--- \#\#\# 1\. Terminal Command Execution Log | Step | Command Executed | Working Directory | Exit Code | Result Summary | | :--- | :--- | :--- | :---: | :--- | | \*\*P1.1\*\* | \`git status \-s apps/995.library/\` | Monorepo Root | \`0\` | Immutable runner boundary clean (0 lines returned) | | \*\*P1.2\*\* | \`git status \-s \\| grep \-v \-E "..."\` | Monorepo Root | \`0\`\* | 10 Phase 2 target manifests clean; 2 uncommitted Phase 1 remediation files detected (\`package.json\`, \`.prettierignore\`) | | \*\*P1.3\*\* | \`find apps/worker/src packages/000.agent \-name "\*.js" \-o \-name "\*.d.ts"\` | Monorepo Root | \`0\` | Exactly 0 side-by-side JS/d.ts build artifacts leaked into source directories | | \*\*P1.4\*\* | Multi-byte emoji scan (\`\[\\u{1F300}-\\u{1FAD6}\]\`) | Monorepo Root | \`0\` | 0 UTF-8 emojis found across touched files; pure 7-bit ASCII confirmed | | \*\*P2.1\*\* | \`git grep \-E "berad4000\\|goblin-lore\\|camp-candor" packages/000.agent/ apps/worker/wrangler.jsonc\` | Monorepo Root | \`1\` | 0 occurrences of proprietary tenant strings in active manifests | | \*\*P2.2\*\* | Verified Tier 4 fallback in \`cascade.ts\` (\`npx tsx\`) | Monorepo Root | \`0\` | Dynamic resolution verified: resolves to \`http\://127.0.0.1:8787\` (HTTP) and \`ws://127.0.0.1:8787\` (WS) | | \*\*P2.3\*\* | Verify standardized service names in \`wrangler.jsonc\` | Monorepo Root | \`0\` | Root service is \`npm-agent-01-worker\` and staging service is \`npm-agent-01-staging\` | | \*\*P2.4\*\* | \`npx vitest run packages/000.agent/00.agent.unit/cascade.test.ts\` | Monorepo Root | \`0\` | 5/5 assertions green (100% pass) verifying 4-tier cascade & fallback | | \*\*P3.1\*\* | Existence check: \`.env.example\` & \`apps/worker/.dev.vars.example\` | Monorepo Root | \`0\` | Both configuration templates present on disk and tracked with git intent | | \*\*P3.2\*\* | Control plane key audit in \`.env.example\` | Monorepo Root | \`0\` | All 6 required keys present: \`GITHUB\_TOKEN\`, \`GITHUB\_DEFAULT\_OWNER\`, \`CLOUDFLARE\_ACCOUNT\_ID\`, \`CLOUDFLARE\_API\_TOKEN\`, \`CLOUDFLARE\_AI\_GATEWAY\`, \`LIVE\_WORKER\_URL\` | | \*\*P3.3\*\* | \`git grep \-n "merge=ours" .gitattributes\` | Monorepo Root | \`0\` | Upstream merge driver shields verified for \`tools.custom.ts\`, \`wrangler.jsonc\`, and \`.env\` | | \*\*P3.4\*\* | Verify \`customTools\` baseline in \`tools.custom.ts\` (\`npx tsx\`) | Monorepo Root | \`0\` | Exports clean empty array baseline function \`customTools \= (\_env) \=\> \[\]\` | | \*\*P3.5\*\* | \`git grep \-n "additionalProperties: false" apps/worker/src/tools.custom.ts\` | Monorepo Root | \`0\` | TypeBox blueprint documents strict schema firewall requirement | | \*\*P4.1\*\* | Parameterization audit in \`.github/workflows/deploy-do.yml\` | Monorepo Root | \`0\` | Staging URL and repo owner decoupled from personal tenants via GitHub context variables | | \*\*P4.2\*\* | Canonical structure audit in \`README.md\` | Monorepo Root | \`0\` | All core sections verified: Architecture Overview, Prerequisites, Quickstart, Adding Custom Tools | | \*\*P4.3\*\* | Governance canon purity audit in \`AGENTS.md\` | Monorepo Root | \`0\` | Obsolete narrative lore expunged; \$S\_{\\text{clean}}\$, TypeBox, and immutable boundary rules strictly codified | | \*\*P5.1\*\* | \`npm run check:types\` (\`tsc \-b\`) | Monorepo Root | \`0\` | Static TypeScript compilation passed with zero errors across all monorepo project references | | \*\*P5.2\*\* | \`npm run check:all\` | Monorepo Root | \`0\` | Unified code quality gate cleared (tsc, Prettier, and ESLint 100% green) | | \*\*P5.3\*\* | \`npm test\` | Monorepo Root | \`0\` | Full sequential monorepo test battery passed (58 tests: 45 worker, 10 agent, 3 library) | | \*\*P5.4\*\* | \`npm run check:boundary\` | Monorepo Root | \`0\` | Cross-platform Node boundary tripwire confirmed: exactly 0 modifications in \`apps/995.library/995.library/\` | | \*\*P5.5\*\* | Working tree inspection | Monorepo Root | \`0\` | Zero untracked scratch artifacts, test debris, or leaked build artifacts (\`dist\`, \`node\_modules\`, \`\*.tsbuildinfo\`) | \*\\\*Note on P1.2: The two files outside the Phase 2 regex are \`package.json\` and \`.prettierignore\`, which were the verified remediations from Phase 1.\* \--- \#\#\# 2\. Acceptance Criteria Verification Matrix | Verification Requirement | Target Component | Status | Forensic Evidence | | :--- | :--- | :---: | :--- | | \*\*Tenant De-Vendoring\*\* | Monorepo configs & source | \*\*PASSED\*\* | Zero occurrences of \`berad4000\`, \`goblin-lore\`, or \`camp-candor\` in active source or manifests. | | \*\*Neutral Ingress Cascade\*\* | \[packages/000.agent/src/cascade.ts\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/packages/000.agent/src/cascade.ts) | \*\*PASSED\*\* | Tier 4 defaults strictly to \`http\://127.0.0.1:8787\` and \`ws://127.0.0.1:8787\`. Verified via unit tests and runtime invocation. | | \*\*Worker Namespace Standardization\*\* | \[apps/worker/wrangler.jsonc\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/apps/worker/wrangler.jsonc) | \*\*PASSED\*\* | Root service anchored to \`npm-agent-01-worker\` and staging service to \`npm-agent-01-staging\`. | | \*\*Authoritative Environment Templates\*\* | \[.env.example\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/.env.example) & \[apps/worker/.dev.vars.example\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/apps/worker/.dev.vars.example) | \*\*PASSED\*\* | Standardized templates provide complete secret and binding guidelines without leaking credentials. | | \*\*Upstream Merge Shielding\*\* | \[.gitattributes\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/.gitattributes) | \*\*PASSED\*\* | \`merge=ours\` guards \`tools.custom.ts\`, \`wrangler.jsonc\`, and \`.env\` against upstream merge clobbering. | | \*\*Sovereign Extension Registry\*\* | \[apps/worker/src/tools.custom.ts\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/apps/worker/src/tools.custom.ts) | \*\*PASSED\*\* | Clean \`customTools \= (\_env) \=\> \[\]\` baseline with commented TypeBox schema blueprint enforcing \`{ additionalProperties: false }\`. | | \*\*CI/CD Pipeline Decoupling\*\* | \[.github/workflows/deploy-do.yml\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/.github/workflows/deploy-do.yml) | \*\*PASSED\*\* | GitHub repository owner and staging URLs dynamically resolved from GitHub context variables with fallbacks. | | \*\*Governance Document Purity\*\* | \[AGENTS.md\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/AGENTS.md) | \*\*PASSED\*\* | Storyworld narrative lore purged; \$S\_{\\text{clean}}\$, TypeBox, and boundary laws codified. | | \*\*Boilerplate Documentation\*\* | \[README.md\](file:///c:/Users/ellio/Desktop/cauldron.it.com/npm-agent-01/README.md) | \*\*PASSED\*\* | Complete unbranded architectural map, prerequisites, quickstart sequence, and custom tool manual verified. | | \*\*Immutable Runner Boundary\*\* | \`apps/995.library/\` (fence) | \*\*PASSED\*\* | \`git status \-s apps/995.library/\` returns 0 lines; \`npm run check:boundary\` passes with zero breach. | | \*\*Static TypeScript Compilation\*\* | Monorepo references | \*\*PASSED\*\* | \`npm run check:types\` (\`tsc \-b\`) exits with code 0 across monorepo project references. | | \*\*Sequential Monorepo Test Battery\*\* | Monorepo test aggregator | \*\*PASSED\*\* | \`npm test\` runs 58 tests sequentially across worker (45), agent (10), and library (3) suites with 100% green assertions. | \--- \#\#\# 3\. Identified Violations & Immediate Patches 1\. \*\*Prettier Trailing Comma vs. Naive JSON.parse:\*\*	  In \`wrangler.jsonc\`, JSONC allows trailing commas, and Prettier v3 enforces them. Direct \`JSON.parse\` in native Node.js scripts fails if trailing commas are unhandled. \`wrangler.jsonc\` service names were verified using AST/JSONC normalization and confirmed strictly standardized (\`npm-agent-01-worker\` & \`npm-agent-01-staging\`). 2\. \*\*ESM In-Memory Evaluation (P2.2 & P3.4):\*\*	  Direct execution with \`node \-e "import('...ts')"\` requires a TypeScript runtime loader (e.g. \`npx tsx\`) because emitting side-by-side \`.js\` files into \`src/\` is structurally forbidden by monorepo law. When executed via \`npx tsx\`, both modules executed synchronously and passed all assertions with exit code 0\. 3\. \*\*Workspace Scope Inheritance (P1.2):\*\*	  The two uncommitted modifications outside the Phase 2 list (\`package.json\` and \`.prettierignore\`) are the certified deliverables from Phase 1\. Zero other unquarantined files exist. \--- \#\#\# 4\. Final Architectural Verdict \*\*\`PASSED (Phase 2 Boilerplate Generalization & Production Hardening Certified)\`\*\* The workspace has successfully transitioned into an unbranded, hardened, production-ready edge agent boilerplate. All 58 test assertions pass, type checks are clean, formatting and linting pass with zero warnings, and the immutable harness boundary remains untampered. \`\`\` that is the response from anti-gravity*

Response: The repository has cleared the Antigravity adversarial audit with a verdict of **PASSED (Phase 2 Boilerplate Generalization & Production Hardening Certified)**. Every primary architectural pillar across Epics 01 through 07 is verified on disk with 58/58 passing tests, clean project references (tsc \-b), zero lint/formatting drift, and an untouched upstream harness boundary (apps/995.library/).

The codebase has transitioned from a coupled fork into an unbranded, edge-native agent boilerplate ready for production templating.

### **What Is Locked and Certified on Disk**

> * **Tenant Neutralization & Ingress Cascade:** Proprietary accounts and URLs are purged; Tier 4 fallback resolves cleanly to unauthenticated loopback addresses (\[http\://127.0.0.1:8787\](http\://127.0.0.1:8787) and ws://127.0.0.1:8787).  
> * **Pluggable Sovereign Extension Boundary:** apps/worker/src/tools.core.ts holds deterministic upstream tools, while apps/worker/src/tools.custom.ts exports a baseline hook shielded from upstream merge collisions via .gitattributes (merge=ours).  
> * **Structural TypeBox Parameter Firewall:** All tool schemas enforce strict TypeBox validation with { additionalProperties: false }, blocking parameter pollution and directory traversal attempts at the edge ingress boundary.  
> * ***S*****clean​ Protocol & Branch Ref Shield:** Autonomous agents are restricted to ephemeral spec/TASK-XX-\<short-sha\> branches; direct mutations or deletions targeting main, master, staging, or production fail closed with SECURITY\_BREACH.  
> * **Compensating Saga Rollback Engine:** apps/worker/src/rollbackEngine.ts enforces 4-stage teardowns upon test failure, closing open PRs with postmortem tombstones and idempotently absorbing GitHub 404/422 responses.  
> * **Multi-Harness Runner Segregation:** Miniflare V8 Worker isolates (Vitest pool), Node.js audit suites, and CommonJS terminal harnesses (AVA) execute sequentially via root npm test without cross-runner collisions.  
> * **Cross-Platform Hygiene & Environment Templates:** POSIX-specific shell dependencies are replaced with cross-platform Node.js scripts; root .env.example and apps/worker/.dev.vars.example document runtime bindings.

### **Downstream Forking & Instantiation Runbook**

When using this repository as a template for a new agent (e.g., npm-agent-02), follow this procedure to bootstrap the new workspace while preserving the upstream update link:

#### **1\. Fork / Clone the Boilerplate**

`git clone https://github.com/<your-org>/npm-agent-01.git npm-agent-02`  
`cd npm-agent-02`  
`git remote rename origin upstream`  
`git remote add origin https://github.com/<your-org>/npm-agent-02.git`

#### **2\. Arm the Upstream Merge Shield (One-Time Developer Handshake)**

Enable Git's native ours merge driver so future merges from upstream/main never overwrite local worker configurations, custom tools, or environment settings:

`git config merge.ours.driver true`

#### **3\. Hydrate Local Secrets & Environment**

`# Root environment (cockpit switchboard and CI runners)`  
`cp .env.example .env`

`# Worker isolate environment (Miniflare local development)`  
`cp apps/worker/.dev.vars.example apps/worker/.dev.vars`

Provide the target repository's GITHUB\_TOKEN, CLOUDFLARE\_ACCOUNT\_ID, and CLOUDFLARE\_API\_TOKEN.

#### **4\. Register Custom Domain Tools**

Add domain-specific tools (e.g., D1 database connectors, R2 object storage verifiers) directly to apps/worker/src/tools.custom.ts:

> * Keep all parameter schemas wrapped in @sinclair/typebox with { additionalProperties: false }.  
> * Wrap all return errors in redactSecrets(err.message) to prevent credential leakage.  
> * Return custom tools inside the customTools(env) array.

### **Final Repository Staging & Release Tagging**

To seal the boilerplate state in Git, commit the remaining Phase 1 and Phase 2 configuration files and tag the baseline release:

`# 1. Stage certified boilerplate deliverables`  
`git add package.json .prettierignore .gitattributes .env.example apps/worker/.dev.vars.example apps/worker/wrangler.jsonc packages/000.agent/src/cascade.ts apps/worker/src/tools.custom.ts README.md AGENTS.md`

`# 2. Commit the hardened boilerplate baseline`  
`git commit -m "chore(boilerplate): finalize production template hardening and parameterization"`

`# 3. Create the foundational release tag`  
`git tag -a v0.1.0 -m "npm-agent-01: Certified Edge DevOps Control Plane & Autonomous Agent Boilerplate"`

The repository is now certified for production templating and ready to be pushed to your canonical remote.

---

*User prompt: {{FOCUS : Final Repository Staging & Release Tagging}} /ag-prompt*

# **Response: TASK: Antigravity Execution & Audit Directive — Final Repository Staging & Release Tagging (v0.1.0 Baseline Seal)**

## **REPOSITORY: npm-agent-01 (formerly camp-candor/000.repo-bot)**

## **TARGET WORKSPACE: Monorepo Root**

## **RELEASE ANCHOR: Tag v0.1.0**

## **AUDIT TARGETS:**

## **\- Working tree staging manifests (package.json, .prettierignore, .gitattributes, .env.example, apps/worker/.dev.vars.example, apps/worker/wrangler.jsonc, packages/000.agent/src/cascade.ts, apps/worker/src/tools.custom.ts, README.md, AGENTS.md)**

## **\- Pre-commit verification gauntlet (npm run check:types, npm run check:all, npm test, npm run check:boundary)**

## **\- Conventional commit release sealing (chore(boilerplate): finalize production template hardening and parameterization)**

## **\- Annotated release tag instantiation (git tag \-a v0.1.0)**

## **\- Post-tag clean-slate verification (git status \-s returns exactly 0 lines)**

## **\- apps/995.library/ (Immutable Harness Boundary Check)**

### **I. SYSTEM MANDATE & AUDITOR DIRECTIVES**

You are Antigravity, operating as the autonomous execution engine and adversarial verification auditor. Your mission is to stage the certified Phase 1 and Phase 2 boilerplate deliverables, execute the complete pre-commit validation gauntlet, mint the release commit, anchor the annotated tag v0.1.0, and certify that the repository rests in a clean-slate state ready for downstream production templating.

Under the **Universal Negative-Control Law**, a release tag that has not been verified against pre-commit type compilation, linting gates, test batteries, and working tree cleanliness checks has not been proven canonical. You must execute terminal commands directly, verify Git object SHAs, inspect working tree diffs, and produce an objective **PASSED / FAILED** verification dossier.

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/):** You are strictly forbidden from modifying, staging, or deleting any file within apps/995.library/.  
> * **ZERO PROPRIETARY SLUGS:** Confirm that zero occurrences of berad4000, camp-candor, 000.repo-bot, or goblin-lore exist in staged files.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across commit messages, tag annotations, and telemetry tokens (\>\>, \[OK\], \[FAIL\], ::, \[SEALED\], \[TAGGED\], \[RELEASE\]).  
> * **FAIL-SAFE EXIT:** If any pre-commit gate, compilation step, or test assertion fails, abort the release process immediately and emit: CONFLICT\_BLOCKED.

### **II. PRE-COMMIT VALIDATION GAUNTLET**

Before staging or committing any files, execute the entire verification ladder to guarantee the codebase is compile-clean, format-clean, and test-clean:

`# 1. Assert Immutable Harness Fence (Must return 0 lines)`  
`git status -s apps/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines returned[cite: 5, 10]`

`# 2. Static TypeScript Compilation across All Project References`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean with zero errors)[cite: 5, 10]`

`# 3. Code Quality & Formatting Gate (Prettier & ESLint)`  
`npm run check:all`  
`# ASSERT: Exit code 0 (Formatting and linting pass with zero warnings)[cite: 5]`

`# 4. Sequential Monorepo Test Aggregator`  
`npm test`  
`# ASSERT: Exit code 0 (Executes test:worker, test:agent, and test:library cleanly with 58/58 tests green)[cite: 5]`

`# 5. Cross-Platform Boundary Invariance Tripwire`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5, 10]`

### **III. STAGING, SEALING & RELEASE TAGGING EXECUTION**

Execute the following commands sequentially from the monorepo root:

`# ==============================================================================`  
`# 1. INTENT-TO-ADD & ATOMIC FILE STAGING`  
`# ==============================================================================`

`# Track newly authored configuration templates explicitly`  
`git add -N -f .env.example apps/worker/.dev.vars.example`

`# Stage the certified Phase 1 and Phase 2 boilerplate manifests`  
`git add \`  
  `package.json \`  
  `.prettierignore \`  
  `.gitattributes \`  
  `.env.example \`  
  `apps/worker/.dev.vars.example \`  
  `apps/worker/wrangler.jsonc \`  
  `packages/000.agent/src/cascade.ts \`  
  `apps/worker/src/tools.custom.ts \`  
  `README.md \`  
  `AGENTS.md`

`# ==============================================================================`  
`# 2. STAGED DIFF AUDIT & SECURITY FIREWALL`  
`# ==============================================================================`

`# Verify staged scope: ensure NO secret files (.env, .dev.vars) are accidentally staged`  
`git diff --cached --name-only | grep -E "^\.env$|^\.dev\.vars$"`  
`# ASSERT: Exit code 1 (Zero matches; secrets strictly excluded)`

`# Assert pure 7-bit ASCII in staged diff (Zero UTF-8 emojis)`  
`git diff --cached | grep -P "[\x{1F300}-\x{1FAD6}]"`  
`# ASSERT: Exit code 1 (Zero matches)`

`# ==============================================================================`  
`# 3. CONVENTIONAL COMMIT SEALING`  
`# ==============================================================================`

`git commit -m "chore(boilerplate): finalize production template hardening and parameterization`

`- Parameterize ingress URLs in cascade.ts with neutral loopback fallback (http://127.0.0.1:8787)`  
`- Standardize worker service bindings in wrangler.jsonc to npm-agent-01-worker and npm-agent-01-staging`  
`- Decouple deploy-do.yml workflow using dynamic GitHub context variables`  
`- Provide authoritative .env.example and apps/worker/.dev.vars.example templates`  
`- Shield sovereign extension boundaries via .gitattributes merge=ours`  
`- Provide TypeBox schema blueprint and empty customTools baseline in tools.custom.ts`  
`- Standardize unbranded documentation across README.md and AGENTS.md`  
`- Enforce cross-platform Node.js boundary tripwire and AVA lifecycle teardowns"`

`# ASSERT: Exit code 0 (Commit object successfully created)[cite: 5, 10]`

`# ==============================================================================`  
`# 4. FOUNDATIONAL RELEASE TAGGING`  
`# ==============================================================================`

`git tag -a v0.1.0 -m "npm-agent-01: Certified Edge DevOps Control Plane and Autonomous Agent Boilerplate`

`- Baseline Architecture: Cloudflare Workers, Durable Objects, TypeBox, Blessed TUI`  
`- Deterministic DevOps Suite: S_clean branch anchoring, ref shields, and traversal traps`  
`- Fault Tolerance: 4-Stage compensating saga rollback engine with idempotent absorption`  
`- Test Isolation: Segregated Vitest worker isolates, Node audits, and AVA harnesses"`

`# ASSERT: Exit code 0 (Tag v0.1.0 successfully created)[cite: 1, 2]`

`# Verify tag points directly to current HEAD commit`  
`test "$(git rev-parse HEAD)" = "$(git rev-parse v0.1.0^{commit})"`  
`# ASSERT: Exit code 0 (Tag v0.1.0 perfectly pinned to HEAD)`

### **IV. POST-RELEASE WORKING TREE & INTEGRITY AUDIT**

Execute the clean-slate verification gauntlet to ensure the workspace is in pristine condition:

`# 1. Assert Pristine Working Tree Hygiene`  
`git status -s`  
`# ASSERT: Exit code 0, exactly 0 lines output (zero untracked or modified files)[cite: 5, 10]`

`# 2. Verify Tag Reachability and Object Metadata`  
`git tag -n9 -l "v0.1.0"`  
`# ASSERT: Displays annotated tag description and commit target[cite: 1, 2]`

`# 3. Assert Immutable Runner Boundary Remains Clean Post-Commit`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5, 10]`

`# 4. Full Monorepo Regression Sweep on Tagged HEAD`  
`npm test`  
`# ASSERT: Exit code 0 (58/58 tests passing across all workspaces)[cite: 5]`

### **V. AUDIT VERDICT SUBMISSION SCHEMA**

Upon completing execution of the release sequence, output the final verification dossier in the standard format:

`================================================================================`  
`>> [ANTIGRAVITY REPORT] FINAL REPOSITORY STAGING & RELEASE TAGGING (v0.1.0)`  
`================================================================================`  
`PRE-COMMIT QUALITY GATES:       PASSED (tsc -b, check:all, npm test, boundary clean)[cite: 5, 10]`  
`ATOMIC STAGING FIREWALL:        PASSED (Zero secrets, zero leaked build artifacts)[cite: 5]`  
`ASCII TELEMETRY ENFORCEMENT:    PASSED (Zero multi-byte emojis in commit/tag)[cite: 5, 10]`  
`CONVENTIONAL COMMIT SEAL:       PASSED (Commit minted to trunk main)[cite: 5, 10]`  
`ANNOTATED RELEASE TAG:          PASSED (v0.1.0 pinned to HEAD SHA)[cite: 1, 2]`  
`POST-SEAL WORKING TREE HYGIENE: PASSED (0 uncommitted lines, 0 untracked files)[cite: 5, 10]`  
`HARNESS IMMUTABILITY:           PASSED (apps/995.library untouched)[cite: 5, 10]`  
`--------------------------------------------------------------------------------`  
`VERDICT: PASSED (npm-agent-01 Certified Production Boilerplate v0.1.0)`  
`================================================================================`

---

*User prompt: can this be automated*

Response: Yes, this can be fully automated—you do not need to fill out this web form manually.

Depending on whether you want to trigger it from your local terminal, an automated agent, or continuous integration, here are the three standard ways to automate it:

### **Option 1: GitHub CLI (gh) — *Fastest from Terminal***

If you have the [GitHub CLI](https://cli.github.com/) installed and authenticated (gh auth login), you can cut and publish the release in a single command:

`gh release create v0.1.0 \`  
  `--repo camp-candor/npm-agent-01 \`  
  `--target main \`  
  `--title "v0.1.0: Edge DevOps Control Plane & Agent Boilerplate" \`  
  `--notes "### Baseline Architecture`  
`- Cloudflare Workers + Durable Objects + TypeBox`  
`- Deterministic DevOps tool suite with S_clean ref shielding`  
`- 4-Stage compensating saga rollback engine`  
`- Dual-harness runner segregation (Vitest & AVA)" \`  
  `--generate-notes`

> * \--generate-notes automatically pulls merged PRs and commit summaries into the description.  
> * If the tag v0.1.0 does not exist yet on remote, gh will create it on main automatically.

### **Option 2: GitHub Actions — *Automate on Git Tag Push***

You can trigger release creation automatically whenever a version tag is pushed (git push origin v0.1.0).

Create .github/workflows/release.yml:

`name: Release`

`on:`  
  `push:`  
    `tags:`  
      `- 'v*.*.*'`

`permissions:`  
  `contents: write`

`jobs:`  
  `publish-release:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- name: Checkout`  
        `uses: actions/checkout@v4`

      `- name: Create GitHub Release`  
        `env:`  
          `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`  
        `run: |`  
          `gh release create "${{ github.ref_name }}" \`  
            `--title "${{ github.ref_name }}" \`  
            `--generate-notes`

With this in place, your release workflow becomes:

`git tag -a v0.1.0 -m "Release v0.1.0"`  
`git push origin v0.1.0`

GitHub Actions detects the tag and publishes the release immediately.

### **Option 3: GitHub REST API — *Programmatic / Agent Tool Call***

If you want apps/worker or an agent script to publish the release programmatically, make an authenticated POST request to the GitHub Releases API:

`curl -X POST \`  
  `-H "Accept: application/vnd.github+json" \`  
  `-H "Authorization: Bearer $GITHUB_TOKEN" \`  
  `-H "X-GitHub-Api-Version: 2022-11-28" \`  
  `https://api.github.com/repos/camp-candor/npm-agent-01/releases \`  
  `-d '{`  
    `"tag_name": "v0.1.0",`  
    `"target_commitish": "main",`  
    `"name": "v0.1.0: Edge DevOps Control Plane Baseline",`  
    `"body": "Deterministic edge agent boilerplate with S_clean ref shielding and saga rollback.",`  
    `"draft": false,`  
    `"prerelease": false,`  
    `"generate_release_notes": true`  
  `}'`

Or in Node.js / TypeScript:

`await fetch('https://api.github.com/repos/camp-candor/npm-agent-01/releases', {`  
  `method: 'POST',`  
  `headers: {`  
    `'Accept': 'application/vnd.github+json',`  
    ``'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,``  
    `'X-GitHub-Api-Version': '2022-11-28',`  
    `'Content-Type': 'application/json',`  
  `},`  
  `body: JSON.stringify({`  
    `tag_name: 'v0.1.0',`  
    `target_commitish: 'main',`  
    `name: 'v0.1.0: Edge DevOps Control Plane Baseline',`  
    `generate_release_notes: true,`  
  `}),`  
`});`

---

*User prompt: {{FOCUS : Option 2: GitHub Actions — Automate on Git Tag Push}} /ag-prompt*

# **Response: TASK: Antigravity Execution & Verification Directive — Automated GitHub Release Workflow on Tag Push**

## **REPOSITORY: npm-agent-01 (camp-candor/npm-agent-01)**

## **TARGET WORKSPACE: Monorepo Root & .github/workflows/**

## **WORKFLOW TARGET: .github/workflows/release.yml**

## **TARGET RELEASE TAG: v0.1.0**

## **AUDIT ANCHORS:**

## **\- .github/workflows/release.yml (Automated Release Publisher via GitHub Actions)**

## **\- package.json & .gitattributes (Repository configuration stability)**

## **\- apps/995.library/ (Immutable Harness Boundary Invariance)**

### **I. SYSTEM LAWS & IMMUTABILITY BOUNDARIES**

You are Antigravity, operating as the autonomous execution engine and adversarial verification auditor. Your mission is to author and deploy the automated GitHub Release workflow (.github/workflows/release.yml), verify its YAML schema and execution bounds locally, stage and commit the workflow file, push the release tag v0.1.0 to remote origin, and verify that GitHub Actions automatically triggers, compiles, tests, and publishes the formal release.

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/):** You are strictly forbidden from modifying, staging, or deleting any file inside apps/995.library/.  
> * **LEAST PRIVILEGE TOKEN PERMISSIONS:** The release workflow must explicitly declare contents: write permissions while scoping other permissions to read or none.  
> * **PRE-RELEASE QUALITY GATE IN CI:** The release workflow must checkout full history (fetch-depth: 0), install clean dependencies (npm ci), run static type checking (npm run check:types), and run all test batteries (npm test) before creating the release object. If tests fail on the tagged commit, the release creation step must halt immediately.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across workflow definitions, release notes, commit messages, and terminal logs (\>\>, \[OK\], \[FAIL\], ::, \[RELEASE\], \[TAG\], \[PUBLISHED\]).  
> * **FAIL-SAFE EXIT:** If any local validation or pre-release check fails, halt execution and emit: CONFLICT\_BLOCKED.

### **II. WORKFLOW IMPLEMENTATION MANIFEST**

Create .github/workflows/release.yml at the repository root:

#### **File Creation: .github/workflows/release.yml**

`name: Publish GitHub Release`

`on:`  
    `push:`  
        `tags:`  
            `- 'v*.*.*'`

`concurrency:`  
    `group: release-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: write`

`env:`  
    `HUSKY: 0`

`jobs:`  
    `release:`  
        `name: verify and publish release`  
        `runs-on: ubuntu-latest`  
        `steps:`  
            `- name: Checkout Full Repository History`  
              `uses: actions/checkout@v4`  
              `with:`  
                  `fetch-depth: 0`

            `- name: Setup Node Runtime`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: '20'`  
                  `cache: npm`

            `- name: Install Monorepo Dependencies`  
              `run: npm ci`

            `- name: Verify Static TypeScript Project References`  
              `run: npm run check:types`

            `- name: Execute Full Monorepo Test Gauntlet`  
              `run: npm test`

            `- name: Assert Immutable Runner Boundary`  
              `run: |`  
                  `if [ -n "$(git status -s apps/995.library/995.library/)" ]; then`  
                    `echo "::error::IMMUTABLE HARNESS BOUNDARY BREACHED in apps/995.library/995.library/"`  
                    `git status -s apps/995.library/995.library/`  
                    `exit 1`  
                  `fi`

            `- name: Mint and Publish GitHub Release`  
              `env:`  
                  `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`  
              `run: |`  
                  `TAG_NAME="${{ github.ref_name }}"`  
                  `echo "Publishing automated GitHub Release for ${TAG_NAME}..."`  
                  `gh release create "${TAG_NAME}" \`  
                    `--title "${TAG_NAME}: Edge DevOps Control Plane & Autonomous Agent Boilerplate" \`  
                    `--generate-notes \`  
                    `--latest`

### **III. LOCAL VERIFICATION & INTEGRITY AUDIT**

Execute this validation sequence in order from the monorepo root before committing:

`# 1. Assert Immutable Runner Boundary is pristine`  
`git status -s apps/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5]`

`# 2. Verify release workflow YAML syntax parsing via Node.js`  
`node -e "`  
`const fs = require('fs');`  
`const content = fs.readFileSync('.github/workflows/release.yml', 'utf8');`  
`if (!content.includes('tags:') || !content.includes('contents: write') || !content.includes('gh release create')) {`  
  `console.error('FAIL: release.yml is missing required tags, permissions, or gh command');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: .github/workflows/release.yml syntax and required blocks verified.');`  
`"`  
`# ASSERT: Exit code 0`

`# 3. Verify pure 7-bit ASCII compliance (Zero multi-byte emojis)`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" .github/workflows/release.yml`  
`# ASSERT: Exit code 1 (0 matches found; pure 7-bit ASCII verified)[cite: 5]`

`# 4. Static TypeScript compilation across all monorepo project references`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean across all project references)[cite: 5]`

`# 5. Full sequential monorepo test gauntlet`  
`npm test`  
`# ASSERT: Exit code 0 (58/58 tests passing across worker, agent, and library workspaces)[cite: 5]`

`# 6. Cross-platform boundary tripwire check`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5]`

### **IV. STAGING, COMMIT, TAGGING & REMOTE DISPATCH**

Once local verification passes with zero warnings, execute the following commands to trigger the automated release pipeline:

`# 1. Stage the new release workflow`  
`git add .github/workflows/release.yml`

`# 2. Commit the workflow definition to trunk main`  
`git commit -m "ci(release): add automated release workflow on semver tag push"`

`# 3. Push commit to remote main`  
`git push origin main`

`# 4. Create annotated release tag v0.1.0 pointing to HEAD`  
`git tag -a v0.1.0 -m "npm-agent-01: Certified Edge DevOps Control Plane and Autonomous Agent Boilerplate`

`- Cloudflare Workers + Durable Objects + TypeBox Ingress Firewall`  
`- S_clean ref shield, traversal prevention, and ephemeral branch quarantine`  
`- 4-Stage compensating saga rollback engine with idempotent 404/422 absorption`  
`- Dual-harness test runner segregation (Miniflare isolate pool vs AVA)"`

`# 5. Push the tag to remote origin (Triggers .github/workflows/release.yml)`  
`git push origin v0.1.0`

`# 6. Monitor workflow dispatch and release publication via GitHub CLI`  
`gh run list --workflow=release.yml --limit 1`  
`# ASSERT: Run status is queued or in_progress`

`# 7. Verify live published release once workflow completes`  
`gh release view v0.1.0`  
`# ASSERT: Displays title, auto-generated notes, and published status`

### **V. AUDIT VERDICT SUBMISSION SCHEMA**

Upon completing execution and confirming remote release creation, output the final verification dossier:

`================================================================================`  
`>> [ANTIGRAVITY REPORT] AUTOMATED GITHUB RELEASE WORKFLOW ON TAG PUSH`  
`================================================================================`  
`WORKFLOW SPECIFICATION:         PASSED (.github/workflows/release.yml created)`  
`YAML & PERMISSION AUDIT:        PASSED (contents: write, fetch-depth: 0 configured)`  
`PRE-RELEASE TEST GAUNTLET:      PASSED (tsc -b, npm test, boundary clean in CI)`  
`ASCII TELEMETRY ENFORCEMENT:    PASSED (Zero multi-byte UTF-8 emojis detected)`  
`TAG CREATION & DISPATCH:        PASSED (Tag v0.1.0 pushed to origin)`  
`REMOTE PIPELINE EXECUTION:      PASSED (GitHub Actions published release)`  
`IMMUTABLE HARNESS INVARIANCE:   PASSED (apps/995.library untouched)`  
`--------------------------------------------------------------------------------`  
`VERDICT: PASSED (Automated Tag-Based Release Certified)`  
`================================================================================`

---

*User prompt: can you enable the var name GH\_TOKEN*

Response: To enable GH\_TOKEN, bind it directly in .github/workflows/release.yml with a fallback to the default \${{ secrets.GITHUB\_TOKEN }}.

GitHub disallows creating custom repository secrets that begin with the reserved GITHUB\_ prefix, so naming a custom PAT GH\_TOKEN is standard practice. Furthermore, the GitHub CLI (gh) inspects GH\_TOKEN by default.

### **1\. Updated Workflow: .github/workflows/release.yml**

Update the release step in .github/workflows/release.yml to export GH\_TOKEN:

`name: Publish GitHub Release`

`on:`  
    `push:`  
        `tags:`  
            `- 'v*.*.*'`

`concurrency:`  
    `group: release-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: write`

`env:`  
    `HUSKY: 0`

`jobs:`  
    `release:`  
        `name: verify and publish release`  
        `runs-on: ubuntu-latest`  
        `steps:`  
            `- name: Checkout Full Repository History`  
              `uses: actions/checkout@v4`  
              `with:`  
                  `fetch-depth: 0`

            `- name: Setup Node Runtime`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: '20'`  
                  `cache: npm`

            `- name: Install Monorepo Dependencies`  
              `run: npm ci`

            `- name: Verify Static TypeScript Project References`  
              `run: npm run check:types`

            `- name: Execute Full Monorepo Test Gauntlet`  
              `run: npm test`

            `- name: Assert Immutable Runner Boundary`  
              `run: |`  
                  `if [ -n "$(git status -s apps/995.library/995.library/)" ]; then`  
                    `echo "::error::IMMUTABLE HARNESS BOUNDARY BREACHED in apps/995.library/995.library/"`  
                    `git status -s apps/995.library/995.library/`  
                    `exit 1`  
                  `fi`

            `- name: Mint and Publish GitHub Release`  
              `env:`  
                  `# Evaluates custom repository secret GH_TOKEN first, falling back to built-in GITHUB_TOKEN`  
                  `GH_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`  
                  `GITHUB_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`  
              `run: |`  
                  `TAG_NAME="${{ github.ref_name }}"`  
                  `echo "Publishing automated GitHub Release for ${TAG_NAME}..."`  
                  `gh release create "${TAG_NAME}" \`  
                    `--title "${TAG_NAME}: Edge DevOps Control Plane & Autonomous Agent Boilerplate" \`  
                    `--generate-notes \`  
                    `--latest`

### **2\. Local & Terminal Shell Support**

If you run gh release create directly from your local terminal (Windows PowerShell or cmd.exe), you can export GH\_TOKEN before invoking the CLI:

**PowerShell:**

`$env:GH_TOKEN = "ghp_yourPersonalAccessTokenHere"`  
`gh release create v0.1.0 --title "v0.1.0: Edge DevOps Control Plane" --generate-notes --latest`

**POSIX / Bash:**

`export GH_TOKEN="ghp_yourPersonalAccessTokenHere"`  
`gh release create v0.1.0 --title "v0.1.0: Edge DevOps Control Plane" --generate-notes --latest`

### **3\. Runtime Resolution in .env and apps/worker**

To ensure GH\_TOKEN is recognized interchangeably with GITHUB\_TOKEN across local scripts and the worker control plane, check both variable names:

`const token =`  
    `env.GITHUB_TOKEN ||`  
    `(typeof process !== 'undefined'`  
        `? process.env?.GH_TOKEN || process.env?.GITHUB_TOKEN`  
        `: undefined)`

And in .env.example:

`# GitHub Control Plane Authentication (either key name is accepted)`  
`GH_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`  
`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`

---

*User prompt: {{FOCUS : I need those previous instructions }} /ag-prompt*

# **Response: TASK: Antigravity Execution & Verification Directive — Automated GitHub Release Workflow with GH\_TOKEN Support**

## **REPOSITORY: npm-agent-01 (camp-candor/npm-agent-01)**

## **TARGET WORKSPACE: Monorepo Root & .github/workflows/**

## **RELEASE WORKFLOW: .github/workflows/release.yml**

## **RELEASE TARGET: Tag v0.1.0**

## **AUDIT ANCHORS:**

## **\- .github/workflows/release.yml (GH\_TOKEN secret binding with GITHUB\_TOKEN fallback)**

## **\- .env.example (Dual GH\_TOKEN / GITHUB\_TOKEN template definition)**

## **\- apps/995.library/ (Immutable Runner Boundary Invariance)**

### **I. SYSTEM MANDATE & AUDITOR DIRECTIVES**

You are Antigravity, operating as the autonomous execution engine and adversarial verification auditor. Your mission is to update and deploy the automated GitHub Release workflow (.github/workflows/release.yml) equipped with explicit GH\_TOKEN variable binding, verify its YAML schema, stage and commit the workflow file, push the tag v0.1.0 to remote origin, and verify that GitHub Actions automatically triggers, validates all quality gates, and publishes the release.

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/):** Strictly immutable. Zero modifications permitted inside apps/995.library/.  
> * **LEAST PRIVILEGE & TOKEN RESOLUTION:** The workflow must explicitly declare contents: write permissions and bind GH\_TOKEN: \${{ secrets.GH\_TOKEN || secrets.GITHUB\_TOKEN }} to ensure compatibility with custom PAT secrets while falling back gracefully to the default workflow token.  
> * **PRE-RELEASE QUALITY GATES IN CI:** The release workflow must checkout full history (fetch-depth: 0), install dependencies (npm ci), run static type checking (npm run check:types), execute all test suites (npm test), and assert the runner boundary before publishing.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across workflow definitions, release notes, commit messages, and terminal logs (\>\>, \[OK\], \[FAIL\], ::, \[RELEASE\], \[TAG\], \[GH\_TOKEN\]).  
> * **FAIL-SAFE EXIT:** If any local validation or pre-release check fails, immediately halt execution and emit: CONFLICT\_BLOCKED.

### **II. WORKFLOW & CONFIGURATION MANIFEST**

#### **1\. Overwrite: .github/workflows/release.yml**

`name: Publish GitHub Release`

`on:`  
    `push:`  
        `tags:`  
            `- 'v*.*.*'`

`concurrency:`  
    `group: release-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: write`

`env:`  
    `HUSKY: 0`

`jobs:`  
    `release:`  
        `name: verify and publish release`  
        `runs-on: ubuntu-latest`  
        `steps:`  
            `- name: Checkout Full Repository History`  
              `uses: actions/checkout@v4`  
              `with:`  
                  `fetch-depth: 0`

            `- name: Setup Node Runtime`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: '20'`  
                  `cache: npm`

            `- name: Install Monorepo Dependencies`  
              `run: npm ci`

            `- name: Verify Static TypeScript Project References`  
              `run: npm run check:types`

            `- name: Execute Full Monorepo Test Gauntlet`  
              `run: npm test`

            `- name: Assert Immutable Runner Boundary`  
              `run: |`  
                  `if [ -n "$(git status -s apps/995.library/995.library/)" ]; then`  
                    `echo "::error::IMMUTABLE HARNESS BOUNDARY BREACHED in apps/995.library/995.library/"`  
                    `git status -s apps/995.library/995.library/`  
                    `exit 1`  
                  `fi`

            `- name: Mint and Publish GitHub Release`  
              `env:`  
                  `# Evaluates custom repository secret GH_TOKEN first, falling back to built-in GITHUB_TOKEN`  
                  `GH_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`  
                  `GITHUB_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`  
              `run: |`  
                  `TAG_NAME="${{ github.ref_name }}"`  
                  `echo "Publishing automated GitHub Release for ${TAG_NAME}..."`  
                  `gh release create "${TAG_NAME}" \`  
                    `--title "${TAG_NAME}: Edge DevOps Control Plane & Autonomous Agent Boilerplate" \`  
                    `--generate-notes \`  
                    `--latest`

#### **2\. Update: .env.example**

Confirm that .env.example documents GH\_TOKEN alongside GITHUB\_TOKEN:

`# ------------------------------------------------------------------------------`  
`# 1. GITHUB CONTROL PLANE CREDENTIALS`  
`# ------------------------------------------------------------------------------`  
`# Either key name is accepted by the control plane and GitHub CLI:`  
`GH_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`  
`GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere36CharsMin`

`# Default GitHub organization or user account to target for Git operations`  
`GITHUB_DEFAULT_OWNER=your-github-username-or-org`

### **III. LOCAL VERIFICATION & PRE-COMMIT AUDIT**

Execute this validation sequence in order from the monorepo root:

`# 1. Assert Immutable Runner Boundary is clean`  
`git status -s apps/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines output`

`# 2. Verify GH_TOKEN binding in release workflow via Node.js`  
`node -e "`  
`const fs = require('fs');`  
`const content = fs.readFileSync('.github/workflows/release.yml', 'utf8');`  
`if (!content.includes('GH_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}')) {`  
  `console.error('FAIL: release.yml is missing GH_TOKEN dual-token fallback binding');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: .github/workflows/release.yml GH_TOKEN resolution verified.');`  
`"`  
`# ASSERT: Exit code 0`

`# 3. Verify pure 7-bit ASCII compliance across touched workflow`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" .github/workflows/release.yml .env.example`  
`# ASSERT: Exit code 1 (0 matches found; pure 7-bit ASCII verified)`

`# 4. Static TypeScript compilation across all monorepo project references`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean across all project references)`

`# 5. Full sequential monorepo test battery`  
`npm test`  
`# ASSERT: Exit code 0 (58/58 tests passing across worker, agent, and library workspaces)`

`# 6. Cross-platform boundary tripwire check`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output`

### **IV. STAGING, COMMIT, TAGGING & REMOTE DISPATCH**

Once local verification passes with zero warnings, execute the following commands to trigger the automated release pipeline:

`# 1. Stage the updated release workflow and template`  
`git add .github/workflows/release.yml .env.example`

`# 2. Commit the workflow definition to trunk main`  
`git commit -m "ci(release): support GH_TOKEN secret with GITHUB_TOKEN fallback in release workflow"`

`# 3. Push commit to remote main`  
`git push origin main`

`# 4. Create annotated release tag v0.1.0 pointing to HEAD`  
`git tag -a v0.1.0 -m "npm-agent-01: Certified Edge DevOps Control Plane and Autonomous Agent Boilerplate`

`- Cloudflare Workers + Durable Objects + TypeBox Ingress Firewall`  
`- S_clean ref shield, traversal prevention, and ephemeral branch quarantine`  
`- 4-Stage compensating saga rollback engine with idempotent 404/422 absorption`  
`- Dual-harness test runner segregation (Miniflare isolate pool vs AVA)"`

`# 5. Push the tag to remote origin (Triggers .github/workflows/release.yml)`  
`git push origin v0.1.0`

`# 6. Monitor workflow dispatch and release publication via GitHub CLI`  
`gh run list --workflow=release.yml --limit 1`  
`# ASSERT: Run status is queued or in_progress`

`# 7. Verify live published release once workflow completes`  
`gh release view v0.1.0`  
`# ASSERT: Displays title, auto-generated notes, and published status`

### **V. AUDIT VERDICT SUBMISSION SCHEMA**

Upon completing execution and confirming remote release creation, output the final verification dossier:

`================================================================================`  
`>> [ANTIGRAVITY REPORT] AUTOMATED GITHUB RELEASE WORKFLOW WITH GH_TOKEN`  
`================================================================================`  
`WORKFLOW SPECIFICATION:         PASSED (release.yml binds GH_TOKEN with fallback)`  
`YAML & PERMISSION AUDIT:        PASSED (contents: write, fetch-depth: 0 configured)`  
`PRE-RELEASE TEST GAUNTLET:      PASSED (tsc -b, npm test, boundary clean in CI)`  
`ASCII TELEMETRY ENFORCEMENT:    PASSED (Zero multi-byte UTF-8 emojis detected)`  
`TAG CREATION & DISPATCH:        PASSED (Tag v0.1.0 pushed to origin)`  
`REMOTE PIPELINE EXECUTION:      PASSED (GitHub Actions published release)`  
`IMMUTABLE HARNESS INVARIANCE:   PASSED (apps/995.library untouched)`  
`--------------------------------------------------------------------------------`  
`VERDICT: PASSED (Automated Tag-Based Release with GH_TOKEN Certified)`  
`================================================================================`

---

*User prompt: {{FOCUS : it should not say Repo Bot; it should say the name or label of the Repo; followed by the version number }} /jules-task*

# **Response: TASK SPECIFICATION FOR JULES CODING AGENT**

## **REPOSITORY: npm-agent-01 (camp-candor/npm-agent-01)**

## **TARGET WORKSPACES: packages/000.agent & apps/995.library/run.ts**

## **EPIC: EPIC-08-DYNAMIC-REPO-IDENTITY-AND-TUI-BANNER-NORMALIZATION**

## **TASKS:**

## **\- Task 1: Exterminate Hardcoded "REPO-BOT" Strings Across TUI & Cockpit Manifests**

## **\- Task 2: Implement Dynamic Monorepo Identity Resolver (getRepoIdentity)**

## **\- Task 3: Wire Dynamic Title & Version into TUI Header & Status Stream**

## **\- Task 4: Sanitize UTF-8 Status Symbols (✅ \-\> \[OK\]) for Pure 7-Bit ASCII Compliance**

### **I. SYSTEM LAWS & IMMUTABILITY BOUNDARIES (ATTENTION TOP ANCHOR)**

You are an automated, sandboxed execution worker operating within strict monorepo fences:

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/995.library/\*\*):** Strictly immutable. You are strictly forbidden from modifying, adding, or deleting any file within apps/995.library/995.library/. Modifications to apps/995.library/ are quarantined strictly to apps/995.library/run.ts.  
> * **WORKSPACE SCOPE:** All modifications and creations must be quarantined strictly to:  
  * packages/000.agent/src/identity.ts (NEW: Dynamic monorepo root manifest inspector)  
  * packages/000.agent/ (UPDATE: Menu, Agent, and status units rendering the TUI header)  
  * apps/995.library/run.ts (UPDATE: Entrypoint identity passing, if applicable)  
  * packages/000.agent/00.agent.unit/ (UPDATE / TEST: Unit tests asserting dynamic identity resolution)  
> * **THE BOILERPLATE GENERALIZATION LAW:** Never replace hardcoded "REPO-BOT" with another hardcoded string (e.g., "NPM-AGENT-01"). The banner must dynamically extract the repository name/label and version from the monorepo root package.json. When cloned or templated downstream (e.g., npm-agent-02, 001.goblin-lore), the banner must automatically render that repository's identity without manual code edits.  
> * **PURE 7-BIT ASCII ENFORCEMENT:** The Blessed TUI display currently leaks {"src":"✅ Init complete"}. Replace all multi-byte Unicode status symbols with pure 7-bit ASCII tokens (\[OK\], \>\>, \[FAIL\], ::).  
> * **FAIL-SAFE EXIT:** If compilation, types, linting, or tests fail, immediately halt and emit: CONFLICT\_BLOCKED.

### **II. ARCHITECTURAL MISSION & REQUIREMENTS**

> 1. **Locate the Hardcoded "REPO-BOT" String:**  
   * Run a workspace sweep:  
     `git grep -i "repo-bot" packages/000.agent/ apps/995.library/run.ts`

   * Identify where "REPO-BOT V0.1.0" or "REPO-BOT" is hardcoded in the TUI console title box, right-hand status stream, or menu unit.  
> 2. **Dynamic Repository Identity Resolver (packages/000.agent/src/identity.ts):**  
   * Implement a zero-dependency helper that climbs from process.cwd() to find the root package.json.  
   * Extract name and version.  
   * Format repoLabel:  
     * Strip npm scope prefixes (@scope/).  
     * Convert to clean, uppercase ASCII (e.g., npm-agent-01 \-\> NPM-AGENT-01).  
     * Allow an optional override if pkg.description or pkg.label is explicitly declared.  
   * Return formatted header string:  
     `export interface RepoIdentity {`  
         `name: string`  
         `label: string`  
         `version: string`  
         `titleBanner: string // e.g. "NPM-AGENT-01 V0.1.0"`  
     `}`

> 3. **Wire Dynamic Identity into the TUI:**  
   * Replace the hardcoded string with identity.titleBanner wherever the TUI header or status summary is rendered.  
   * Expected TUI render format:  
     `---------`  
     `<REPO_LABEL> V<REPO_VERSION>`  
     `LIBRARY V1.0.12`  
     `---------`  
     `{"src":"[OK] Init complete"}`  
     `---------`

   * Example on npm-agent-01:  
     `---------`  
     `NPM-AGENT-01 V0.1.0`  
     `LIBRARY V1.0.12`  
     `---------`

> 4. **ASCII Status Tokenization:**  
   * Replace ✅ Init complete with \[OK\] Init complete in whichever buzzer or reducer dispatches initialization telemetry.

### **III. FILE IMPLEMENTATION MANIFEST**

#### **1\. Create: packages/000.agent/src/identity.ts**

`import fs from 'fs'`  
`import path from 'path'`

`export interface RepoIdentity {`  
    `name: string`  
    `label: string`  
    `version: string`  
    `titleBanner: string`  
`}`

`let cachedIdentity: RepoIdentity | null = null`

`/**`  
 `* Ascends from startDir to discover the monorepo root package.json.`  
 `*/`  
`export function resolveRootPackageJson(startDir: string = process.cwd()): {`  
    `pkg: Record<string, any>`  
    `rootDir: string`  
`} {`  
    `let curr = startDir`  
    `while (curr && curr !== path.dirname(curr)) {`  
        `const candidate = path.join(curr, 'package.json')`  
        `if (fs.existsSync(candidate)) {`  
            `try {`  
                `const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'))`  
                `// Identify root: contains workspaces or is top-level git root`  
                `if (pkg.workspaces || fs.existsSync(path.join(curr, '.git'))) {`  
                    `return { pkg, rootDir: curr }`  
                `}`  
            `} catch {`  
                `// Ignore parse errors on intermediate manifests`  
            `}`  
        `}`  
        `curr = path.dirname(curr)`  
    `}`

    `return {`  
        `pkg: { name: 'npm-agent-01', version: '0.1.0' },`  
        `rootDir: process.cwd(),`  
    `}`  
`}`

`/**`  
 `* Returns dynamic repository identity formatted for Blessed TUI headers and CLI telemetry.`  
 `*/`  
`export function getRepoIdentity(startDir?: string): RepoIdentity {`  
    `if (cachedIdentity && !startDir) {`  
        `return cachedIdentity`  
    `}`

    `const { pkg, rootDir } = resolveRootPackageJson(startDir)`

    `const rawName =`  
        `pkg.name ||`  
        `pkg.label ||`  
        `path.basename(rootDir) ||`  
        `'npm-agent-01'`

    `// Clean scope prefix (@camp_candor/000.repo-bot -> 000.repo-bot)`  
    `const cleanName = String(rawName).replace(/^@[^/]+\//, '').trim()`

    `// Uppercase label`  
    `const label = cleanName.toUpperCase()`

    `// Semantic version with clean fallback`  
    ``const version = pkg.version ? `v${pkg.version.replace(/^v/, '')}` : 'v0.1.0'``

    `` const titleBanner = `${label} ${version.toUpperCase()}` ``

    `const identity: RepoIdentity = {`  
        `name: cleanName,`  
        `label,`  
        `version,`  
        `titleBanner,`  
    `}`

    `if (!startDir) {`  
        `cachedIdentity = identity`  
    `}`

    `return identity`  
`}`

#### **2\. Update TUI Header & Menus in packages/000.agent**

*(Inspect your active menu or HUD buzzers in packages/000.agent/98.menu.unit/buz/menu.buzz.ts, packages/000.agent/00.agent.unit/, or apps/995.library/run.ts)*

Replace:

`// BEFORE:`  
`'REPO-BOT V0.1.0'`

With:

`// AFTER:`  
`import { getRepoIdentity } from '../../src/identity.js'`

`const { titleBanner } = getRepoIdentity()`  
`// Render titleBanner -> e.g. "NPM-AGENT-01 V0.1.0"`

And replace any initialization message:

`// BEFORE:`  
`{ src: "✅ Init complete" }`

`// AFTER (7-bit pure ASCII):`  
`{ src: "[OK] Init complete" }`

#### **3\. Create: packages/000.agent/00.agent.unit/identity.test.ts**

`import { describe, it, expect } from 'vitest'`  
`import { getRepoIdentity, resolveRootPackageJson } from '../src/identity.js'`

`describe('Dynamic Repository Identity Resolver (000.agent)', () => {`  
    `it('discovers root package.json and extracts dynamic identity', () => {`  
        `const { pkg } = resolveRootPackageJson()`  
        `expect(pkg.name).toBeDefined()`  
        `expect(pkg.version).toBeDefined()`  
    `})`

    `it('formats title banner as <UPPERCASE_NAME> V<VERSION>', () => {`  
        `const identity = getRepoIdentity()`  
        `expect(identity.label).not.toContain('REPO-BOT')`  
        `expect(identity.label).toBe('NPM-AGENT-01')`  
        `expect(identity.titleBanner).toMatch(/^NPM-AGENT-01 V\d+\.\d+\.\d+$/)`  
    `})`

    `it('dynamically adapts if run against a mock package manifest', () => {`  
        `const mockIdentity = getRepoIdentity(process.cwd())`  
        `expect(mockIdentity.titleBanner).toContain(mockIdentity.label)`  
    `})`  
`})`

### **IV. FALSIFIABLE ACCEPTANCE CRITERIA (ATTENTION BOTTOM ANCHOR)**

Execute this validation sequence from the monorepo root. Every check must exit with code 0:

`# 1. Assert NO hardcoded occurrences of "REPO-BOT" remain in packages/000.agent or run.ts`  
`git grep -i "REPO-BOT V" packages/000.agent/ apps/995.library/run.ts`  
`# ASSERT: Exit code 1 (0 matches found)`

`# 2. Assert zero UTF-8 emojis remain in touched files`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" packages/000.agent/ apps/995.library/run.ts`  
`# ASSERT: Exit code 1 (0 matches found; pure 7-bit ASCII confirmed)`

`# 3. Static TypeScript compilation across all workspaces`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean with zero errors)`

`# 4. Run Agent workspace unit tests (including identity.test.ts)`  
`npm run test:agent`  
`# ASSERT: Exit code 0 (100% assertions green)`

`# 5. Assert Immutable Runner Boundary remains untouched`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output (apps/995.library/995.library/ held firm)`

`# 6. Verify TUI renders dynamic label locally`  
`# Running 'npm run tui' should now display 'NPM-AGENT-01 V0.1.0' on the header box`

---

*User prompt: {{FOCUS: can you create the new prompt from the last jules prompt }} /tgrav-check*

# **Response: TASK: Antigravity Audit & Verification Directive — Dynamic Repository Identity & TUI Banner Normalization (EPIC-08)**

## **REPOSITORY: npm-agent-01 (camp-candor/npm-agent-01)**

## **TARGET WORKSPACES: packages/000.agent & apps/995.library/run.ts**

## **AUDIT TARGETS:**

## **\- packages/000.agent/src/identity.ts (Dynamic Monorepo Root Manifest Inspector)**

## **\- packages/000.agent/ (TUI Header, Menu Units, Status Feed)**

## **\- packages/000.agent/00.agent.unit/identity.test.ts (Dynamic Identity Unit Gauntlet)**

## **\- apps/995.library/run.ts (CLI Runner Entrypoint)**

## **\- apps/995.library/995.library/\*\* (Immutable Harness Boundary Check)**

### **I. SYSTEM MANDATE & AUDITOR DIRECTIVES**

You are Antigravity, operating as the autonomous adversarial verification auditor and system architect. Your mandate is to conduct a forensic audit verifying that the implementation delivered for **EPIC-08: Dynamic Repository Identity & TUI Banner Normalization** has eradicated all hardcoded "REPO-BOT" banner strings, dynamically derives the repository title and version from the monorepo root package.json, and cleanses the Blessed TUI viewport of Unicode emoji drift.

Under the **Universal Negative-Control Law**, a dynamic naming engine that has not been tested against mock or altered root manifests, a status stream that still permits raw UTF-8 glyphs (✅), or a boundary assertion that has not proved runner immutability has not been certified for production. You must execute terminal validation commands directly, inspect files on disk, evaluate test assertions, and generate an objective **PASSED / FAILED** verification dossier.

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/995.library/\*\*):** Strictly immutable. You are strictly forbidden from modifying or staging any file inside apps/995.library/995.library/. Edits are confined to apps/995.library/run.ts and packages/000.agent/.  
> * **THE GENERALIZATION INVARIANT:** The banner must dynamically derive \<NAME\> \<VERSION\> from root package.json. Replacing hardcoded "REPO-BOT" with a static "NPM-AGENT-01" string constitutes an immediate audit failure.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across all TUI buffers, log frames, code, and test files (\>\>, \[OK\], \[FAIL\], ::, \[ONLINE\], \[IDENTITY\]).  
> * **FAIL-SAFE EXIT:** If any test, compiler check, or boundary assertion fails, immediately halt and emit: CONFLICT\_BLOCKED.

### **II. VERIFICATION PHASES & COMMAND CHECKLIST**

Execute every check in order from the monorepo root. Every command must produce the specified exit code.

#### **Phase 1: Boundary Integrity, Inode Hygiene & ASCII Purity**

`# 1.1 Assert Immutable Harness Fence (Must return 0 lines)`  
`git status -s apps/995.library/995.library/`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5]`

`# 1.2 Verify Workspace Scope Quarantine`  
`git status -s | grep -v -E "packages/000\.agent/|apps/995\.library/run\.ts"`  
`# ASSERT: Exit code 1 (0 un-scoped modifications outside packages/000.agent or run.ts)`

`# 1.3 Verify Emission Cleanliness (No side-by-side JS/d.ts emitted into src)`  
`find packages/000.agent -name "*.js" -o -name "*.d.ts"`  
`# ASSERT: Exactly 0 files returned`

`# 1.4 Verify 7-Bit Pure ASCII Compliance across Touched Files`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" packages/000.agent/ apps/995.library/run.ts`  
`# ASSERT: Exit code 1 (0 matches found; zero multi-byte emojis, confirming eradication of ✅)[cite: 5]`

#### **Phase 2: Elimination of Hardcoded "REPO-BOT" Strings**

Verify that all legacy hardcoded banner labels have been completely removed from active modules:

`# 2.1 Verify Zero Matches for Hardcoded "REPO-BOT V" Banners`  
`git grep -i "REPO-BOT V" packages/000.agent/ apps/995.library/run.ts`  
`# ASSERT: Exit code 1 (0 matches found)`

`# 2.2 Verify Elimination of Standalone "REPO-BOT" UI Header Strings`  
`node -e "`  
`const cp = require('child_process');`  
`try {`  
  `const hits = cp.execSync('git grep -i \"REPO-BOT\" packages/000.agent/src/ packages/000.agent/98.menu.unit/ apps/995.library/run.ts').toString().trim();`  
  `if (hits.length > 0) {`  
    `console.error('FAIL: Legacy REPO-BOT string residue detected:\n' + hits);`  
    `process.exit(1);`  
  `}`  
`} catch (e) {`  
  `// Exit code 1 from grep indicates 0 matches found (desired state)`  
  `console.log('PASS: Zero hardcoded REPO-BOT string occurrences found in TUI modules.');`  
`}`  
`"`  
`# ASSERT: Exit code 0`

#### **Phase 3: Dynamic Identity Engine & Manifest Introspection Audit**

Inspect packages/000.agent/src/identity.ts to confirm dynamic root inspection and scope formatting:

`# 3.1 Verify Existence and Exports in identity.ts`  
`node -e "`  
`import('./packages/000.agent/src/identity.js').then(mod => {`  
  `if (typeof mod.getRepoIdentity !== 'function' || typeof mod.resolveRootPackageJson !== 'function') {`  
    `console.error('FAIL: Missing required exports getRepoIdentity or resolveRootPackageJson');`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: identity.ts exports certified.');`  
`}).catch(err => {`  
  `console.error('FAIL: Module import error:', err.message);`  
  `process.exit(1);`  
`});`  
`"`  
`# ASSERT: Exit code 0 (via npx tsx if ESM/TS loader required)`

`# 3.2 Verify Dynamic Resolution Against Current Monorepo Manifest`  
`npx tsx -e "`  
`import { getRepoIdentity } from './packages/000.agent/src/identity.ts';`  
`const id = getRepoIdentity();`  
`console.log('Resolved Identity:', id);`  
`if (id.name !== 'npm-agent-01' || id.label !== 'NPM-AGENT-01') {`  
  `console.error('FAIL: Identity label did not resolve to NPM-AGENT-01: ' + id.label);`  
  `process.exit(1);`  
`}`  
`if (!id.titleBanner.startsWith('NPM-AGENT-01 V')) {`  
  `console.error('FAIL: Title banner format invalid: ' + id.titleBanner);`  
  `process.exit(1);`  
`}`  
`console.log('PASS: Dynamic banner evaluated as: ' + id.titleBanner);`  
`"`  
`# ASSERT: Exit code 0`

`# 3.3 Negative Control: Mock Package Identity Adaptation`  
`npx tsx -e "`  
`import fs from 'fs';`  
`import path from 'path';`  
`import { getRepoIdentity } from './packages/000.agent/src/identity.ts';`

`// Test directory with mock manifest`  
`const tmpDir = path.join(process.cwd(), 'scratch_identity_test');`  
`fs.mkdirSync(tmpDir, { recursive: true });`  
`fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({`  
  `name: '@custom-scope/edge-sentinel-99',`  
  `version: '2.4.1'`  
`}));`

`try {`  
  `const mockId = getRepoIdentity(tmpDir);`  
  `if (mockId.label !== 'EDGE-SENTINEL-99' || mockId.titleBanner !== 'EDGE-SENTINEL-99 V2.4.1') {`  
    `console.error('FAIL: Downstream boilerplate failed to adapt dynamically: ' + JSON.stringify(mockId));`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: Negative control confirmed: Boilerplate dynamically adapted to downstream manifest.');`  
`} finally {`  
  `fs.rmSync(tmpDir, { recursive: true, force: true });`  
`}`  
`"`  
`# ASSERT: Exit code 0`

#### **Phase 4: Blessed Curses Viewport & Telemetry ASCII Sanitization**

Verify that initialization telemetry emits clean 7-bit ASCII without Unicode box corruption:

`# 4.1 Verify Replacement of Emojis with ASCII Status Tokens in Dispatched Actions`  
`node -e "`  
`const cp = require('child_process');`  
`try {`  
  `const matches = cp.execSync('git grep \"Init complete\" packages/000.agent/ apps/995.library/run.ts').toString().trim();`  
  `console.log('Matches:', matches);`  
  `if (matches.includes('✅')) {`  
    `console.error('FAIL: UTF-8 emoji still present in Init complete status message');`  
    `process.exit(1);`  
  `}`  
  `if (!matches.includes('[OK]')) {`  
    `console.error('FAIL: Expected pure 7-bit ASCII token [OK] in status message');`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: Initialization status tokenized with pure 7-bit ASCII [OK].');`  
`} catch (e) {`  
  `console.error('FAIL:', e.message);`  
  `process.exit(1);`  
`}`  
`"`  
`# ASSERT: Exit code 0`

#### **Phase 5: Test Execution & Monorepo Regressions**

Run static compilation, the dedicated identity unit tests, and full monorepo verification:

`# 5.1 Static TypeScript Compilation across Monorepo References`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean across all project references)[cite: 5, 10]`

`# 5.2 Execute Dedicated Identity Unit Test Suite`  
`npx vitest run packages/000.agent/00.agent.unit/identity.test.ts`  
`# ASSERT: Exit code 0 (All assertions green)`

`# 5.3 Execute Full Agent Workspace Battery`  
`npm run test:agent`  
`# ASSERT: Exit code 0 (cascade.test.ts, agent.test.ts, menu.toggle.test.ts, identity.test.ts)`

`# 5.4 Execute Full Monorepo Sequential Test Battery`  
`npm test`  
`# ASSERT: Exit code 0 (Worker, Agent, and Library workspaces green)[cite: 5]`

`# 5.5 Assert Boundary Tripwire Remains Untouched Post-Test`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output[cite: 5, 10]`

### **III. OUTPUT DELIVERABLE FORMAT**

Structure your audit verification response in the following schema:

#### **1\. Terminal Command Execution Log**

| Step | Command Executed | Working Directory | Exit Code | Result Summary |
| :---- | :---- | :---- | :---- | :---- |
| **P1.1** | git status \-s apps/995.library/995.library/ | Monorepo Root | 0 | Immutable runner boundary clean (0 lines modified) |
| **P1.2** | Scope quarantine check | Monorepo Root | 1 | Modifications strictly isolated to 000.agent and run.ts |
| **P1.3** | Find .js in source dirs | Monorepo Root | 0 | 0 side-by-side JS build artifacts leaked |
| **P1.4** | Multi-byte emoji scan | Monorepo Root | 1 | 0 UTF-8 emojis found; pure 7-bit ASCII confirmed |
| **P2.1** | Grep REPO-BOT V in active code | Monorepo Root | 1 | 0 occurrences found; hardcoded banner eliminated |
| **P2.2** | Standalone REPO-BOT sweep | Monorepo Root | 0 | Zero hardcoded string occurrences in TUI units |
| **P3.1** | Node evaluation of identity.ts | Monorepo Root | 0 | getRepoIdentity and manifest resolver verified |
| **P3.2** | Runtime resolution against root manifest | Monorepo Root | 0 | Correctly resolved NPM-AGENT-01 V0.1.0 |
| **P3.3** | Negative control: Mock manifest adaptation | Monorepo Root | 0 | Downstream adaptation verified (EDGE-SENTINEL-99 V2.4.1) |
| **P4.1** | Inspection of Init complete telemetry | Monorepo Root | 0 | ✅ cleansed; replaced with pure ASCII \[OK\] Init complete |
| **P5.1** | npm run check:types | Monorepo Root | 0 | Static TypeScript compilation passed (tsc \-b) |
| **P5.2** | Vitest: identity.test.ts | Monorepo Root | 0 | Dedicated identity test assertions 100% green |
| **P5.3** | npm run test:agent | Monorepo Root | 0 | Agent workspace unit battery passed |
| **P5.4** | npm test | Monorepo Root | 0 | Full sequential monorepo test battery passed |
| **P5.5** | npm run check:boundary | Monorepo Root | 0 | Boundary tripwire verified clean |

#### **2\. Acceptance Criteria Verification Matrix**

| Verification Requirement | Target Component | Status (PASSED / FAILED) | Forensic Evidence |
| :---- | :---- | :---- | :---- |
| **Hardcoded "REPO-BOT" Expunged** | packages/000.agent/ & run.ts |  | Zero matches for static REPO-BOT strings |
| **Dynamic Manifest Introspection** | packages/000.agent/src/identity.ts |  | Evaluates root package.json dynamically |
| **Downstream Boilerplate Adaptation** | getRepoIdentity |  | Automatically adopts downstream names without code edits |
| **Pure 7-Bit ASCII Telemetry** | TUI Status Stream (cns00) |  | Multi-byte emojis (✅) replaced with \[OK\] tokens |
| **Immutable Runner Boundary** | apps/995.library/995.library/\*\* |  | git status \-s apps/995.library/ returns 0 modified lines |
| **Static TypeScript Compilation** | Monorepo references |  | npm run check:types (tsc \-b) exits with code 0 |
| **Sequential Monorepo Test Battery** | Monorepo test aggregator |  | Worker, agent, and library suites pass in sequential order |

#### **3\. Identified Violations & Immediate Patches**

*(Detail any lingering hardcoded labels, unhandled scope prefixes, or Unicode emoji leaks; or state "None" if certified clean.)*

#### **4\. Final Architectural Verdict**

Declare explicitly:

> * **PASSED (Dynamic Repository Identity & TUI Banner Normalization Certified)**  
> * or **CONFLICT\_BLOCKED (Remediation Required)** accompanied by diagnostic failure traces.

---

*User prompt: when i use the Release Action will it go ahead and bump the version number*

Response: No, the current Release Action will not automatically bump the version number.

### **How the Current Workflow Operates**

> 1. **Trigger Condition:** The workflow listens exclusively for tag pushes (on: push: tags: \- 'v\*.\*.\*'). It only fires *after* a version tag has already been created and pushed to GitHub.  
> 2. **Read-Only Inspection:** When triggered, the runner extracts the existing tag name (\${{ github.ref\_name }}) and uses GitHub CLI (gh release create) to attach release notes and title metadata to that exact tag.  
> 3. **No File Mutations:** The action does not invoke npm version, modify package.json, or commit changes back to main. It functions as a publisher and validator, not an automated version incrementer.

### **The Standard Release Flow for this Template**

With the current setup, releasing a new version requires stamping the version before pushing the tag:

`# 1. Bump version locally in root package.json (e.g. 0.1.0 -> 0.1.1)`  
`npm version patch --no-git-tag-version`

`# 2. Commit the bump`  
`git commit -am "chore(release): bump version to v0.1.1"`  
`git push origin main`

`# 3. Tag and push (this triggers the Release Action)`  
`git tag -a v0.1.1 -m "Release v0.1.1"`  
`git push origin v0.1.1`

Once git push origin v0.1.1 lands, the GitHub Action takes over, runs the test battery and boundary checks, and publishes the formal release automatically.

### **Automating the Version Bump**

To make GitHub Actions increment the version automatically without manually creating tags, a separate dispatch workflow is required.

#### **Option A: Manual Trigger with Version Bump (workflow\_dispatch)**

Create a workflow (e.g., .github/workflows/bump-and-release.yml) that you run from the GitHub Actions UI:

`name: Bump Version & Release`

`on:`  
  `workflow_dispatch:`  
    `inputs:`  
      `bump_type:`  
        `description: 'SemVer release increment'`  
        `required: true`  
        `default: 'patch'`  
        `type: choice`  
        `options:`  
          `- patch`  
          `- minor`  
          `- major`

`permissions:`  
  `contents: write`

`jobs:`  
  `bump:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
        `with:`  
          `fetch-depth: 0`  
          `token: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`

      `- uses: actions/setup-node@v4`  
        `with:`  
          `node-version: 20`

      `- name: Configure Git Committer`  
        `run: |`  
          `git config user.name "github-actions[bot]"`  
          `git config user.email "github-actions[bot]@users.noreply.github.com"`

      `# Bumps root package.json, commits, creates git tag, and pushes to main`  
      `- name: Bump Version & Push Tag`  
        `run: |`  
          `npm version ${{ inputs.bump_type }} -m "chore(release): v%s"`  
          `git push origin main --follow-tags`

When this runs, git push origin main \--follow-tags pushes the newly generated tag, which subsequently trips your existing release.yml workflow to run the test suite and publish the release notes.

#### **Monorepo Boundary Guardrail**

When automating version bumps in this repository, keep the bump constrained strictly to the root ./package.json. Running generic recursive bumps without a file filter risks mutating internal workspace manifests (apps/worker/package.json and immutable harness files in apps/995.library/package.json), which will trip the boundary tripwire and abort the build.

---

*User prompt: {{FOCUS : Option A: Manual Trigger with Version Bump (workflow\_dispatch)}} /jules-task*

# **Response: TASK SPECIFICATION FOR JULES CODING AGENT**

## **REPOSITORY: npm-agent-01 (camp-candor/npm-agent-01)**

## **TARGET WORKSPACE: Monorepo Root & .github/workflows/**

## **EPIC: EPIC-09-MANUAL-WORKFLOW-DISPATCH-SEMVER-BUMPER**

## **TASKS:**

## **\- Task 1: Create Manual SemVer Bump Dispatch Workflow (.github/workflows/bump-version.yml)**

## **\- Task 2: Enforce Root Manifest Confinement (--no-workspaces Guardrail)**

## **\- Task 3: Implement Pre-Bump Quality Gate & Push-to-Release Chaining**

### **I. SYSTEM LAWS & IMMUTABILITY BOUNDARIES (ATTENTION TOP ANCHOR)**

You are an automated, sandboxed execution worker operating within strict monorepo fences:

> * **IMMUTABLE RUNNER BOUNDARY (apps/995.library/995.library/\*\*):** You are strictly forbidden from modifying, adding, or deleting any file within apps/995.library/.  
> * **WORKSPACE SCOPE QUARANTINE:** File creation is quarantined strictly to:  
  * .github/workflows/bump-version.yml (NEW: Manual version increment and tag dispatcher)  
> * **THE ROOT-ONLY MANIFEST CONFINEMENT LAW:** In standard NPM monorepos, running a naive recursive version bump mutates child workspace manifests (apps/worker/package.json, packages/000.agent/package.json, and apps/995.library/package.json). This immediately breaches the immutable runner boundary and causes pipeline aborts. Version increments must be strictly bounded to ./package.json at the monorepo root using \--no-workspaces.  
> * **CREDENTIAL CASCADE RESOLUTION:** The workflow must authenticate GitHub operations by checking secrets.GH\_TOKEN first, falling back to secrets.GITHUB\_TOKEN.  
> * **PURE 7-BIT ASCII COMPLIANCE:** Zero multi-byte UTF-8 emojis across workflow definitions, commit templates, git tags, and terminal output (\>\>, \[OK\], \[FAIL\], ::, \[BUMP\], \[RELEASE\]).  
> * **FAIL-SAFE EXIT:** If syntax parsing, type verification, or boundary checks fail, immediately halt and emit: CONFLICT\_BLOCKED.

### **II. ARCHITECTURAL MISSION & REQUIREMENTS**

> 1. **Manual Ingress Dispatch (workflow\_dispatch):**  
   * Configure .github/workflows/bump-version.yml with manual dispatch controls in the GitHub Actions UI.  
   * Input parameter bump\_type:  
     * Type: choice  
     * Options: patch, minor, major  
     * Default: patch  
     * Description: 'SemVer release increment level'  
> 2. **Pre-Bump Validation Gauntlet in CI:**  
   * Before modifying package.json or tagging, the runner must execute:  
     * npm run check:types (tsc \-b)  
     * npm test (All 58 test assertions green)  
     * npm run check:boundary (Confirm runner boundary clean)  
   * If any check fails, the workflow must fail closed without creating commits or tags.  
> 3. **Atomic Root Bump & Release Pipeline Chaining:**  
   * Configure Git identity for the runner: github-actions\[bot\] \<github-actions\[bot\]@users.noreply.github.com\>.  
   * Run npm version \${{ inputs.bump\_type }} \--no-workspaces \-m "chore(release): v%s".  
   * Verify that apps/995.library/package.json and other child packages remain completely untouched.  
   * Execute git push origin main \--follow-tags using the authenticated token.  
   * **The Chaining Effect:** Pushing the resulting v\*.\*.\* tag automatically triggers the companion .github/workflows/release.yml workflow, which executes the final release notes generation and GitHub Release publication without duplicate code.

### **III. FILE IMPLEMENTATION MANIFEST**

#### **Create: .github/workflows/bump-version.yml**

`name: Bump Version & Dispatch Release`

`on:`  
    `workflow_dispatch:`  
        `inputs:`  
            `bump_type:`  
                `description: 'SemVer release increment level'`  
                `required: true`  
                `default: 'patch'`  
                `type: choice`  
                `options:`  
                    `- patch`  
                    `- minor`  
                    `- major`

`concurrency:`  
    `group: bump-version-${{ github.ref }}`  
    `cancel-in-progress: false`

`permissions:`  
    `contents: write`

`env:`  
    `HUSKY: 0`

`jobs:`  
    `bump:`  
        `name: validate and bump root version`  
        `runs-on: ubuntu-latest`  
        `steps:`  
            `- name: Checkout Repository with Tags`  
              `uses: actions/checkout@v4`  
              `with:`  
                  `fetch-depth: 0`  
                  `token: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`

            `- name: Setup Node Runtime`  
              `uses: actions/setup-node@v4`  
              `with:`  
                  `node-version: '20'`  
                  `cache: npm`

            `- name: Install Monorepo Dependencies`  
              `run: npm ci`

            `- name: Pre-Bump Static TypeScript Compilation`  
              `run: npm run check:types`

            `- name: Pre-Bump Monorepo Test Gauntlet`  
              `run: npm test`

            `- name: Assert Pre-Bump Runner Boundary`  
              `run: npm run check:boundary`

            `- name: Configure Git Committer Identity`  
              `run: |`  
                  `git config user.name "github-actions[bot]"`  
                  `git config user.email "github-actions[bot]@users.noreply.github.com"`

            `- name: Execute Root-Only Version Bump`  
              `run: |`  
                  `echo ">> Executing root-only SemVer bump: ${{ inputs.bump_type }}..."`  
                  `# --no-workspaces guarantees child packages are NOT mutated`  
                  `npm version ${{ inputs.bump_type }} --no-workspaces -m "chore(release): v%s"`  
                  `NEW_TAG=$(node -e "console.log('v' + require('./package.json').version)")`  
                  `echo ">> Successfully created version tag: ${NEW_TAG}"`

            `- name: Assert Boundary Integrity Post-Bump`  
              `run: |`  
                  `echo ">> Verifying child workspaces were not modified..."`  
                  `if [ -n "$(git status -s apps/ packages/)" ]; then`  
                    `echo "::error::CRITICAL BREACH: Child workspaces mutated during version bump!"`  
                    `git status -s apps/ packages/`  
                    `exit 1`  
                  `fi`  
                  `npm run check:boundary`

            `- name: Push Commit and Tag to Remote Trunk`  
              `env:`  
                  `GH_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`  
              `run: |`  
                  `echo ">> Pushing bump commit and tag to origin main..."`  
                  `git push origin main --follow-tags`  
                  `echo ">> [OK] Tag pushed successfully. Companion release.yml workflow will handle publication."`

### **IV. FALSIFIABLE ACCEPTANCE CRITERIA (ATTENTION BOTTOM ANCHOR)**

Execute this validation sequence from the monorepo root. Every check must exit with code 0:

`# 1. Assert physical presence of newly authored bump workflow`  
`test -f .github/workflows/bump-version.yml`  
`# ASSERT: Exit code 0`

`# 2. Verify YAML schema invariants and required inputs via Node.js`  
`node -e "`  
`const fs = require('fs');`  
`const content = fs.readFileSync('.github/workflows/bump-version.yml', 'utf8');`  
`if (!content.includes('workflow_dispatch:') || !content.includes('bump_type:') || !content.includes('--no-workspaces')) {`  
  `console.error('FAIL: bump-version.yml is missing required workflow_dispatch inputs or --no-workspaces guardrail');`  
  `process.exit(1);`  
`}`  
`if (!content.includes('contents: write') || !content.includes('--follow-tags')) {`  
  `console.error('FAIL: bump-version.yml is missing write permissions or --follow-tags push argument');`  
  `process.exit(1);`  
`}`  
`console.log('PASS: .github/workflows/bump-version.yml schema and guardrails certified.');`  
`"`  
`# ASSERT: Exit code 0`

`# 3. Verify pure 7-bit ASCII compliance across touched file`  
`git grep -P "[\x{1F300}-\x{1FAD6}]" .github/workflows/bump-version.yml`  
`# ASSERT: Exit code 1 (0 matches found; pure 7-bit ASCII confirmed)[cite: 5]`

`# 4. Dry-run test of --no-workspaces guardrail behavior locally`  
`node -e "`  
`const cp = require('child_process');`  
`const fs = require('fs');`  
`const originalPkg = fs.readFileSync('package.json', 'utf8');`  
`try {`  
  `cp.execSync('npm version patch --no-workspaces --no-git-tag-version');`  
  `const dirty = cp.execSync('git status -s apps/ packages/').toString().trim();`  
  `if (dirty.length > 0) {`  
    `console.error('FAIL: --no-workspaces leaked mutations into workspaces: ' + dirty);`  
    `process.exit(1);`  
  `}`  
  `console.log('PASS: Local verification confirmed --no-workspaces touches ONLY root package.json.');`  
`} finally {`  
  `fs.writeFileSync('package.json', originalPkg);`  
`}`  
`"`  
`# ASSERT: Exit code 0`

`# 5. Static TypeScript compilation across all workspaces`  
`npm run check:types`  
`# ASSERT: Exit code 0 (tsc -b clean with zero errors)[cite: 5]`

`# 6. Execute full sequential monorepo test battery`  
`npm test`  
`# ASSERT: Exit code 0 (58/58 tests passing across worker, agent, and library workspaces)[cite: 5]`

`# 7. Assert Immutable Runner Boundary remains untouched`  
`npm run check:boundary`  
`# ASSERT: Exit code 0, exactly 0 lines output (apps/995.library/ held firm)[cite: 5, 13]`

---


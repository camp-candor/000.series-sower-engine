# AGENTS.md -- Execution Contract & Architectural Invariants

> Authoritative operational specification for autonomous coding and verification
> agents operating in `000.series-sower-engine`. Current source code and this
> contract supersede all historical records in `data/`.

---

## 1. Core Invariants & Non-Negotiable Laws

1. **Package Manager & Workspace Topology:**
   - Standard NPM Monorepo (`workspaces: ["packages/*", "apps/*"]`, Node
     `>=20.0.0`, NPM `>=10.0.0`).
   - Do NOT introduce Yarn, PNPM, Bun, Nx, Lerna, or Turborepo.
   - `"private": true` is mandatory. Never publish to external registries.
2. **Zero Root Runtime Dependencies (`check:zero-runtime`):**
   - Root `package.json` MUST NOT contain a `"dependencies"` block (or it must
     remain empty `{}`). All shared tooling belongs in root `"devDependencies"`.
3. **Pure Simulation Kernel Isolation (`packages/300.engine`):**
   - `packages/300.engine` is a pure, deterministic isolate
     (`Stage T_0 = $0.00`).
   - **Zero `src/` Directory Law:** `packages/300.engine/src/` is strictly
     forbidden. All logic must reside inside numbered unit directories
     (`<NN>.<unit-name>.unit/{act,buz,fce,val}`).
   - **Zero Native IO (`check:native-io`):** Never import `node:fs`,
     `node:child_process`, `node:net`, `node:http`, `node:https`, `node:tls`, or
     `better-sqlite3` inside non-test engine files
     (`00.engine.unit/buz/gauntlet.buzz.ts` is the sole CLI orchestrator
     exception).
   - **Banned Dependencies (`check:banned-deps` & `.dependency-cruiser.cjs`):**
     Never add or import `remotion`, `@remotion/*`, `react`, `react-dom`,
     `@cloudflare/*`, `puppeteer`, `playwright`, `canvas`, `fluent-ffmpeg`,
     `three`, or `pixi.js` inside `packages/300.engine`.
   - **Determinism & Timing:** Use 64-bit `BigInt` / basis-point integer
     arithmetic for simulation state. Measure execution budgets with
     `process.hrtime.bigint()`. Tick reduction budget must remain `<= 2.0ms`.
4. **TypeScript & Inode Hygiene (`check:types`, `check:artifacts`):**
   - Strict ESM (`"type": "module"`, `"moduleResolution": "NodeNext"`,
     `"strict": true`). Local relative imports in `.ts` files must use `.js`
     extensions.
   - Never emit side-by-side `.js`, `.d.ts`, or `.js.map` artifacts into unit or
     `src/` directories. All build outputs must route to `dist/`.
5. **7-Bit Pure ASCII Compliance (`check:ascii`):**
   - Every file in `package.json`, `tsconfig.base.json`,
     `packages/300.engine/**`, `scripts/**`, and `apps/995.library/run.ts` must
     contain strictly 7-bit ASCII characters (`charCode <= 127`).
   - Multi-byte UTF-8 emojis, box-drawing characters, and typographic
     quotes/dashes are forbidden in code and terminal logs. Use ASCII tokens:
     `>>`, `::`, `---`, `[OK]`, `[PASS]`, `[FAIL]`, `[BREACH]`.
6. **Blessed Terminal Curses & Stdout Law:**
   - Never call `console.log`, `console.warn`, or `console.error` inside
     simulation units or menu buzzers (`packages/300.engine/**`). Bare
     stdout/stderr writes corrupt Blessed TTY coordinate buffers.
   - Route all TUI telemetry exclusively through
     `global.LIBRARY.hunt('[Console Action] Update Console', { idx: 'cns00', lst: [...] })`
     on the 12x12 grid (columns `0-4`: menu choices; columns `4-12`: console
     pane `cns00`).
   - Every menu buzzer must include a headless fallback when `global.LIBRARY` is
     undefined (resolving `bal.slv` with `val: 0`).
   - **BLESSED 12x12 COCKPIT DUAL-PANE TOPOLOGY INVARIANT:** The 12-column
     terminal grid allocation is immutable. The **left 4 columns**
     (`{ x: 0, y: 4, xSpan: 4, ySpan: 8 }`) must house the 6 interactive choices
     bound with explicit grid net data (`net: gridChoice?.grdBit?.dat`), and the
     **right 8 columns** (`{ x: 4, y: 0, xSpan: 8, ySpan: 12 }`) must mount the
     information pane via `[Write action] Write Console` (`cns00`) streaming
     live telemetry and focus tooltips. The Coding Agent is **STRICTLY
     FORBIDDEN** from collapsing this dual-pane layout, removing the `cns00`
     information pane, omitting `WRITE_CONSOLE`, omitting choice `net` mesh
     binding, or reverting to generic placeholder menus.
   - **Blessed 12x12 Cockpit Dual-Pane Layout Standard:** Every package flight
     deck mounted into the Blessed alternate screen buffer (`apps/995.library`)
     must maintain the dual-pane topology:
     1. **Left Control Pane (Columns 0-4 / 33% width, Rows 4-12):** Houses
        exactly the 6 interactive domain choices, rendered via
        `[Open action] Open Choice` with mandatory
        `net: gridChoice?.grdBit?.dat` binding. Never omit `net` mesh anchoring
        (doing so causes choice rendering to blow out to 100% full-screen width,
        obliterating the layout).
     2. **Right Information & Telemetry Pane (Columns 4-12 / 67% width, Rows
        0-12):** Must mount `cns00` via `[Grid action] Update Grid`
        `{ x: 4, y: 0, xSpan: 8, ySpan: 12 }` AND `[Write action] Write Console`
        `{ idx: 'cns00', dat: { net: gridConsole?.grdBit?.dat, src: 'alligator0' } }`.
        All telemetry, boot banners, and live item-focus descriptions stream
        exclusively into `cns00`.
     3. **Coding Agent Prohibition:** The Coding Agent is **NEVER** to alter,
        collapse, or remove this dual-pane layout, omit `WRITE_CONSOLE`, or
        strip the information panel from the TUI.
7. **Cross-Platform Script Portability:**
   - All `package.json` scripts and Node utilities must execute identically on
     Windows (PowerShell/cmd) and POSIX. Prefer `node` scripts over raw shell
     built-ins.
8. **Template Generalization:**
   - Never hardcode repository identity strings in shared agent infrastructure
     (`packages/100.agent`). Resolve identity dynamically via
     [`getRepoIdentity`](file:///d:/trellis/000.series-sower-engine/packages/100.agent/src/identity.ts).

---

## 2. Immutable Perimeter & File Mutation Boundaries

| Path / Scope                                                | Access Level         | Enforcement Gate                 | Operational Rule                                                                                                                                                     |
| :---------------------------------------------------------- | :------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/995.library/995.library/**`                           | **IMMUTABLE**        | `npm run check:harness-boundary` | Never create, edit, stage, or delete files inside the core Blessed harness.                                                                                          |
| `apps/995.library/run.ts`                                   | **MUTABLE (Scoped)** | Manual / Audit                   | Sole permitted modification path under `apps/995.library/` for dynamic route mounting.                                                                               |
| `apps/worker/wrangler.jsonc`                                | **IMMUTABLE**        | `npm run check:runner-boundary`  | Must have zero uncommitted changes during gauntlet execution.                                                                                                        |
| `packages/300.engine/00.engine.unit/test/**`                | **HELD-OUT OVERLAY** | `npm run overlay:tests`          | Automatically overwritten from `HEAD` by [`scripts/test-overlay.ts`](file:///d:/trellis/000.series-sower-engine/scripts/test-overlay.ts) during `check:anti-gaming`. |
| `packages/300.engine/17.tick.unit/tick.spec.ts`             | **HELD-OUT OVERLAY** | `npm run overlay:tests`          | Protected tick budget spec; overwritten from `HEAD` during anti-gaming checks.                                                                                       |
| `packages/300.engine/test/**`                               | **HELD-OUT OVERLAY** | `npm run overlay:tests`          | Protected test matchers and fixtures; overwritten from `HEAD` during anti-gaming checks.                                                                             |
| `.dependency-cruiser.cjs`                                   | **HELD-OUT OVERLAY** | `npm run overlay:tests`          | Protected AST firewall configuration; overwritten from `HEAD` during anti-gaming checks.                                                                             |
| `vitest.workspace.ts`                                       | **HELD-OUT OVERLAY** | `npm run overlay:tests`          | Protected multi-pool test runner configuration; overwritten from `HEAD` during anti-gaming checks.                                                                   |
| `data/overview/**`, `data/building/**`, `data/directive/**` | **APPEND-ONLY**      | Audit Review                     | Historical ledger. Never delete or rewrite prior records; only update designated status headers or add new numbered files.                                           |

---

## 3. Monorepo Topology & Unit Architecture

```text
.
|-- apps/
|   |-- 995.library/                # Blessed Terminal Curses Host (@camp_candor/995.library)
|   |   |-- run.ts                  # ONLY mutable entrypoint & route switchboard loader
|   |   `-- 995.library/            # [IMMUTABLE] Core Blessed Curses engine
|   `-- worker/                     # Cloudflare Worker Edge Control Plane (@camp_candor/agent)
|       |-- wrangler.jsonc          # [IMMUTABLE] Worker runner boundary manifest
|       |-- src/                    # Hono router, AgentSessionDO, tools.core.ts, tools.custom.ts, redaction.ts, rollbackEngine.ts
|       `-- test/                   # Worker vitest suites
|-- packages/
|   |-- 300.engine/                 # Pure Simulation Kernel & Legislative Authority (@camp_candor/300.engine)
|   |   |-- BEE.ts & hunt.ts        # Unit state manifest & action dispatch entrypoint (NO src/ directory allowed)
|   |   |-- 00.engine.unit/         # Engine core & 10-stage CI gauntlet orchestrator
|   |   |-- 01.actor.unit/ .. 21.compile.unit/ # Domain simulation units (act/, buz/, fce/, val/, *.reducer.ts, *.model.ts)
|   |   |-- 97.collect.unit/        # Collection unit
|   |   |-- 98.menu.unit/           # Blessed TUI menu buzzers (gauntlet-menu.buzz.ts)
|   |   |-- 99.bus.unit/ & 99.core/ # Internal bus & core wiring
|   |   `-- test/                   # Held-out budget matchers & test fixtures
|   |-- 100.agent/                  # Core Agent Domain & Terminal Cockpit (@camp_candor/100.agent)
|   |-- 000.pivot/                  # Pivot orchestration package
|   `-- 133.cloudflare/             # Cloudflare integration units
|-- scripts/                        # Deterministic enforcement & anti-gaming gates
|   |-- check-harness-boundary.cjs  # Asserts apps/995.library/995.library/ is clean
|   |-- check-runner-boundary.cjs   # Asserts apps/worker/wrangler.jsonc is clean
|   |-- check-artifacts.cjs         # Scans packages/300.engine for leaked .js/.d.ts/.js.map
|   |-- check-ascii.cjs             # Scans manifests, scripts, and 300.engine for charCode > 127
|   |-- check-native-io.cjs         # Blocks native IO imports in packages/300.engine
|   |-- test-overlay.ts             # Restores held-out test & config targets from trusted ref
|   `-- red-before-green.ts         # Verifies defect reproduction against base commit
|-- bin/git-hooks/functions.sh      # Git hook enforcement functions (branch, filenames, lockfile sync, lint-staged)
|-- .husky/                         # Active git hooks (pre-commit, pre-push)
`-- data/                           # Institutional memory (overview/, building/, directive/day-XXX/)
```

### Standard Unit Anatomy (`packages/300.engine/<NN>.<name>.unit/`)

Each unit follows the BEE reactive architecture without a `src/` subfolder:

- `fce/<name>.bit.ts` & `<name>.interface.ts`: Typed payload envelopes and data
  contracts.
- `<name>.action.ts`: Action string constants and typed action classes.
- `buz/<name>.buzz.ts`: Pure business logic / reducer handlers invoked by the
  dispatcher.
- `<name>.reducer.ts`: Action switch routing into `buz/`.
- `<name>.model.ts`: Unit state model initialization.
- `act/` & `val/`: Action and validation metadata indices.

---

## 4. Agent Roles & Directive Execution Protocol

Directives in `data/directive/day-XXX/NNN.<topic>.<role>.md` enforce strict
separation of duties:

| Role Suffix                      | Persona                                | Operational Mandate & Restrictions                                                                                                                                                                                                                                                                                                     |
| :------------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.jules.md`                     | **Jules** (Implementer)                | Execute the pre-flight completion check first. If `>= 67%` of checklist items are already satisfied on disk, mark `[Done]` and **HALT IMMEDIATELY** without mutating code. **NEVER execute or read partner `*.ag-test.md` files.**                                                                                                     |
| `*.ag-test.md`                   | **Antigravity** (Adversarial Verifier) | Execute the multi-level negative-control verification gauntlet (`Level 0` through `Level 4`). Follow the **In-Scope Remediation Mandate (Zero-Handoff Policy)**: proactively fix missing `run.ts` wiring, menu hooks, or `tsconfig`/`package.json` references, but NEVER weaken schemas, skip gauntlet stages, or edit held-out tests. |
| `*.gravity.md` / `*.ag-check.md` | **Antigravity** (Architect)            | Perform architectural audits, baseline sealing, and cross-unit alignment.                                                                                                                                                                                                                                                              |

---

## 5. Toolchain, Pre-Flight & Verification Gauntlet

### 5.1 Pre-Flight Self-Healing Sequence (Run Before Any Mutation)

```bash
# 1. Verify and self-heal immutable boundaries if dirty
git status -s apps/995.library/995.library/ apps/worker/wrangler.jsonc
# If dirty: git restore apps/995.library/995.library/ apps/worker/wrangler.jsonc

# 2. Verify no leaked compilation artifacts exist
npm run check:preflight
```

### 5.2 Post-Mutation Verification Gauntlet (Mandatory Before Commit/Completion)

Run the consolidated gauntlet from the monorepo root. All stages must exit `0`:

```bash
npm run gauntlet
```

`npm run gauntlet` executes the following deterministic pipeline in order:

1. `npm run check:runner-boundary` -- Asserts `apps/worker/wrangler.jsonc` has 0
   uncommitted modifications.
2. `npm run check:all`:
   - `npm run check:types` (`tsc -b`) -- Composite TypeScript compilation across
     all workspaces.
   - `npm run prettier:check` -- Code formatting verification (auto-fix via
     `npm run fix`).
   - `npm run lint:check` -- ESLint verification across workspaces.
   - `npm run check:boundary` -- Asserts `apps/995.library/995.library/` has 0
     uncommitted modifications.
   - `npm run check:boundary:ast` -- Runs `depcruise` against
     `.dependency-cruiser.cjs`.
   - `npm run check:banned-deps` -- Verifies `packages/300.engine/package.json`
     contains zero banned dependencies.
   - `npm run check:native-io` -- Verifies zero native Node IO imports in
     `packages/300.engine/`.
3. `npm run test:pure` (`vitest run --project engine-core-pure`) -- Runs pure
   engine unit specs and enforces the `<= 2.0ms` tick budget.
4. `npm run check:anti-gaming`:
   - `npm run overlay:tests` -- Force-restores held-out tests and AST/Vitest
     configs from `HEAD` and runs `check-artifacts.cjs`.
   - `npm run test:golden-failures` -- Executes adversarial negative-control
     traps (`golden-failures.spec.ts`).
   - `npm run check:red-green` -- Validates red-before-green defect
     reproduction.

### 5.3 Authoritative Command Reference

| Command                      | Purpose                                                                                                                          |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Launch the interactive Blessed terminal switchboard (`apps/995.library`). Do NOT pass extra CLI flags during Level 4 TUI audits. |
| `npm run tui`                | Launch the Blessed terminal directly into the `pivot` route (`npx tsx apps/995.library/run.ts -t pivot`).                        |
| `npm run gauntlet`           | Execute the full blocking CI verification pipeline (`check:runner-boundary` + `check:all` + `test:pure` + `check:anti-gaming`).  |
| `npm run check:preflight`    | Fast perimeter check (`check:runner-boundary` + `check:harness-boundary` + `check:artifacts` + `check:ascii`).                   |
| `npm run check:zero-runtime` | Assert root `package.json` has zero runtime `dependencies`.                                                                      |
| `npm test`                   | Run all Vitest workspace projects (`worker`, `100.agent`, `engine-core-pure`).                                                   |
| `npm run fix`                | Auto-format with Prettier and apply ESLint fixes (`prettier:fix && lint:fix`).                                                   |
| `npm run clean:js`           | Delete leaked `.js` and `.d.ts` files inside `apps/worker/src` and `packages/300.engine`.                                        |

---

## 6. Git Hook Enforcement & Commit Protocol

Commits and pushes are gated by `.husky/pre-commit`, `.husky/pre-push`, and
[`bin/git-hooks/functions.sh`](file:///d:/trellis/000.series-sower-engine/bin/git-hooks/functions.sh):

1. **Protected Branch Guard:** Direct commits or pushes to `master` are blocked.
2. **Branch Naming Regex:** Active branch name must match
   `^[a-zA-Z0-9]+([/-][a-zA-Z0-9]+)*$`.
3. **Staged Filename Whitelist:** Staged file paths must contain only
   `A-Z a-z 0-9 space . _ - + @ /`. Any other character blocks the commit.
4. **Automatic Lockfile Sync:** Staging changes in `package.json`,
   `packages/**`, or `apps/**` automatically triggers
   `npm install --package-lock-only --no-audit --ignore-scripts` and stages
   `package-lock.json`. Never bypass hooks with `--no-verify`.
5. **Commit Format:** Conventional commits (`feat:`, `fix:`, `chore:`,
   `refactor:`, `test:`, `docs:`, `ci:`).

---

## 7. Error Budgets, Backtracking & Halt Conditions

1. **3-Strike Remediation Cap:** If a compile, lint, typecheck, or test failure
   persists after **3 consecutive fix attempts**, STOP mutating files. Revert
   uncommitted breaking changes to the last green state and report the failure
   with exact stderr diagnostics.
2. **Overlay Wipe Awareness:** Do not edit files listed as **HELD-OUT OVERLAY**
   in Section 2 unless explicitly instructed to author a new baseline commit
   first; running `npm run check:anti-gaming` or `npm run gauntlet` will
   immediately `git checkout HEAD -- <path>` over unstaged/staged changes in
   those paths.
3. **Artifact Leak Recovery:** If `tsc` accidentally emits `.js` or `.d.ts`
   files into `packages/300.engine`, run `npm run clean:js` immediately before
   re-running `npm run check:preflight`.
4. **Hard Halt (`CONFLICT_BLOCKED`):** Emit `CONFLICT_BLOCKED` and halt
   immediately if fulfilling a user prompt requires:
   - Modifying `apps/995.library/995.library/**` or
     `apps/worker/wrangler.jsonc`.
   - Adding banned dependencies or native IO to `packages/300.engine`.
   - Weakening Zod/TypeBox schemas, disabling AST rules in
     `.dependency-cruiser.cjs`, or skipping stages in `gauntlet.buzz.ts`.

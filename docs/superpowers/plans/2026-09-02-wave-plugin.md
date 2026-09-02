# Wave Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second plugin, `wave`, to the `claude-team-onboarding` marketplace that installs the Claude-orchestrates, Codex-implements method on a colleague's machine and scaffolds its tooling into their repositories.

**Architecture:** Two user-invoked commands (`/wave:setup` for the global layer, `/wave:init` for a project) drive three skills; a template renderer and a settings merger (Node, no dependencies) do the mechanical work; project scripts (bash) are copied verbatim and read `.claude/wave.env`; a single SQLite registry with three Python tools replaces the two OIL databases; a playbook skill carries the method as on-demand references.

**Tech Stack:** Claude Code plugin layout (`.claude-plugin/marketplace.json`, `plugin.json`, `commands/`, `skills/`), Node 20+ ESM for scripts and tests (`node --test`, `node:assert/strict`), bash for project scripts and hooks, `sqlite3` CLI, Python 3 standard library for registry tools, `jq` in hooks (already required by the claude-team baseline).

**Spec:** `docs/superpowers/specs/2026-09-02-wave-plugin-design.md`

**Authoring workspace:** `.superpowers/sdd/2026-09-02-wave-plugin/` (gitignored): authoring brief with the interface contract, process digest, baseline scenario records, ledger.

## Global Constraints

- Plugin name `wave`, version `0.1.0`; skills `setup`, `init`, `running-waves`; commands `/wave:setup`, `/wave:init`. The `claude-team` plugin is not modified.
- Skill descriptions start with "Use when" and carry triggering conditions only, never a workflow summary.
- Template syntax: `{{KEY}}` substitution and `{{#if KEY}} … {{/if}}` blocks, no nesting, rendered only by `plugins/wave/scripts/render.mjs`; any `{{` left after rendering is an error. Files ending in `.hbs` are rendered; everything else under `templates/project/` is copied verbatim and must contain no `{{`.
- Knob names, `wave.env` keys, script CLIs, table and column names, helper exports and export JSON shape are fixed by the interface contract in `.superpowers/sdd/2026-09-02-wave-plugin/00-authoring-brief.md`; tasks quote them verbatim and never rename.
- Tests first: every task's test file is written and shown failing before its implementation; runner `node --test` from `plugins/wave/tests/`, always with explicit file names or `npm test` (on Node 26 `node --test <directory>` resolves the directory as a module and fails); scripts are exercised through `spawnSync`, never re-implemented in the test.
- Test helpers create temp dirs through `realpathSync(mkdtempSync(...))`; on macOS the temp dir is a symlink and child processes report the resolved path.
- Project scripts and hooks stay within bash 3.2 syntax (macOS `/bin/bash` is 3.2.57); tests never assert on git's own output, which is localized on the reference machine.
- Project scripts: bash with `set -euo pipefail` (hooks `set -uo pipefail`), exit 1 on refusal in scripts, exit 2 on block in hooks, exit 0 when `wave.env` is missing in hooks. Sandbox flag `--sandbox workspace-write` always; stdin terminated with `< /dev/null`; sessions found under `${CODEX_HOME:-$HOME/.codex}/sessions`.
- Skills never run installs themselves (paste-and-confirm), never overwrite without a `.pre-wave-<YYYYMMDD-HHMMSS>.bak` backup, write atomically, and emit the diagnostic block on failure.
- Playbook and template prose contain none of: `OIL`, `oil_wrapper`, `Polish`, `pnpm`, `Next.js`, `Mistral`, `Anthropic`, `Jakub`, `/Users/`. English only, no em-dashes.
- Python tools: standard library only, `python3`, `#!/usr/bin/env python3`.
- Commits: conventional, imperative, scoped `wave`; one commit per task; explicit pathspecs, never `git add -A`.

## Task classification

| Task | Deliverable | Risk | Implementer | Gate |
|---|---|---|---|---|
| 1 | plugin scaffold, marketplace entry, test runner, helpers, fixtures | low | Claude subagent (bootstrap) | review |
| 2 | `scripts/render.mjs` | medium | Claude subagent (bootstrap) | review |
| 3 | `scripts/merge-settings.mjs` | medium | Claude subagent (bootstrap) | review |
| 4 | `wave.env.hbs` + `dispatch.sh` | high, refutation-critical | Claude subagent (bootstrap) | RED GATE |
| 5 | hooks | medium | Codex terra/medium | review |
| 6 | `schema.sql` + `gen-spec-exec.py` | medium | Codex terra/medium | review |
| 7 | `registry-write.sh` | high | Codex sol/medium | RED GATE |
| 8 | review panel + ingest | high | Codex sol/medium | RED GATE |
| 9 | markdown project templates + settings fragment | medium | Codex sol/medium | review |
| 10 | `templates/claude-md/sections.md` | medium | Codex sol/medium | review |
| 11 | skill `setup` | medium | Claude subagent (skill TDD needs subagent scenarios) | review |
| 12 | skill `init` | medium | Claude subagent | review |
| 13 | references: lifecycle, rulings, registry-process, seal, troubleshooting | low | Codex sol/medium | review |
| 14 | references: brief, plan, review, gate, ledger templates | low | Codex sol/medium | review |
| 15 | `running-waves` SKILL.md + pressure scenarios | medium | Claude subagent | review |
| 16 | README, local install verification | low | Codex terra/medium, verification controller-run | review |

## Execution strategy

The onboarding repo has no dispatch tooling yet, so the plan bootstraps itself: Tasks 1 to 4 run as Claude subagents in this checkout. After Task 4 merges, the controller writes `.claude/wave.env` for this repo by hand (`WT_ROOT=../claude-team-onboarding-wt`, `ENV_FILE=` empty, `INSTALL_CMD=` empty, registry dir empty), copies `templates/project/skills/dispatch/scripts/dispatch.sh` into `.claude/skills/dispatch/scripts/`, merges `templates/project/settings.json` into `.claude/settings.json` with the Task 3 script, and dispatches the remaining Codex tasks through the new script. Every dispatch of Tasks 5 to 16 is therefore also a live test of Task 4. Skill tasks (11, 12, 15) stay on Claude subagents because their TDD step runs scenario subagents, which the Codex sandbox cannot spawn.

Batches: {1} then {2, 3, 4} then {5, 6, 9, 10} then {7, 8, 13, 14} then {11, 12, 15} then {16}.

---

### Task 1: plugin scaffold, marketplace entry and the test harness

**Files:**

- Create: `plugins/wave/plugin.json`
- Create: `plugins/wave/commands/setup.md`
- Create: `plugins/wave/commands/init.md`
- Create: `plugins/wave/tests/package.json`
- Create: `plugins/wave/tests/helpers.mjs`
- Create: `plugins/wave/tests/fixtures/knobs.sample.json`
- Modify: `.claude-plugin/marketplace.json` (two content anchors: the line that begins `  "description": "Team onboarding plugin` is replaced, and a second object is appended inside the `"plugins"` array after the object whose last property line is `      "description": "Interactive Polish onboarding: TDD, git hygiene, portable hooks, stack setup, baseline plugins"`; the closing `  ]` line stays last. The complete resulting file is in Step 3. Keep the `claude-team` entry exactly as it is.)
- Test: `plugins/wave/tests/scaffold.test.mjs`

**Interfaces:**

- Consumes: nothing. This is the first task of the plan.
- Produces, from `plugins/wave/tests/helpers.mjs`, the whole shared test surface every later task imports. Do not rename any of these and do not change a signature; later tasks extend this file by ADDING exports only:
  - `export const PLUGIN_ROOT` absolute path of `plugins/wave`.
  - `export function makeTempRepo({ waveEnv = {}, envFile = null, files = {} } = {})` returns `{ root, run(cmd, args, opts), cleanup() }`.
  - `export function installFakeCodex(binDir)` returns `binDir`.
  - `export function readFakeCodexLog(logPath)` returns an array of parsed JSON lines, and `[]` when the file does not exist.
  - `export function render(templateRelPath, knobs)` returns stdout, throws on a non-zero exit. `templateRelPath` is relative to `PLUGIN_ROOT`. It spawns `scripts/render.mjs`, which Task 2 creates, so no test may call it before Task 2 lands.
  - `export function runScript(absScript, args, { cwd, env } = {})` and `export function runHook(absHook, toolInput, { cwd, env } = {})`, both returning the `spawnSync` result with `encoding: 'utf8'`.
- Produces `plugins/wave/tests/fixtures/knobs.sample.json`, the knob set later render tests use.
- Produces the test harness: `plugins/wave/tests/package.json` with `"type": "module"` and `"test": "node --test"`, so every later test file is `.mjs`, uses `node:test` plus `node:assert/strict`, and runs with `cd plugins/wave/tests && npm test`.

**Notes for the implementer:**

- Node floor is 20. The suite was authored and verified on this machine:
  ```
  $ node --version
  v26.4.0
  ```
  Nothing in the helpers uses an API newer than Node 20 (`node:test`, `String.matchAll`, `Array.flatMap`, `fs.realpathSync`, `fs.copyFileSync`).
- `node --test <directory>` does NOT work on Node 26.4.0. It tries to load the directory as a module and dies with `Cannot find module`. Always pass file names, or run `npm test` from inside `plugins/wave/tests`.
- Three details in `makeTempRepo` are load-bearing and must not be simplified away:
  1. The temp path is passed through `realpathSync`. On macOS `os.tmpdir()` is a symlink, and `git rev-parse --show-toplevel` and a child process `cwd` both report the resolved path, so string comparisons fail without it.
  2. The repository lives at `<temp base>/repo`, one level below the temp base, so a worktree root configured as `../<name>-wt` lands inside the temp tree and `cleanup()` removes it.
  3. `.env.local` is written AFTER the commit and `.gitignore` lists it, so it stays untracked. A committed env file would appear in every `git worktree add` on its own and make the Task 4 copy test vacuous.
- `installFakeCodex` writes a shell script that shells out to `node` for JSON encoding. Tests must PREPEND its directory to `PATH`, never replace `PATH`, because the script itself needs `node`, `cat`, `wc` and `tr`.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/package.json` first, because it is the harness the test command needs:

```json
{
  "name": "wave-plugin-tests",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Then create `plugins/wave/tests/scaffold.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT, installFakeCodex, makeTempRepo, readFakeCodexLog } from './helpers.mjs'

const REPO_ROOT = join(PLUGIN_ROOT, '..', '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

test('plugin.json parses and names the plugin wave', () => {
  const manifest = readJson(join(PLUGIN_ROOT, 'plugin.json'))
  assert.equal(manifest.name, 'wave')
  assert.equal(manifest.version, '0.1.0')
  assert.ok(manifest.description.length > 0)
})

test('marketplace lists both plugins and every source path exists', () => {
  const marketplace = readJson(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'))
  const names = marketplace.plugins.map((p) => p.name)
  assert.deepEqual(names.sort(), ['claude-team', 'wave'])
  for (const entry of marketplace.plugins) {
    assert.ok(existsSync(join(REPO_ROOT, entry.source)), `missing source dir: ${entry.source}`)
    assert.ok(entry.description.length > 0, `missing description: ${entry.name}`)
  }
  assert.ok(marketplace.description.includes('wave'))
})

test('both commands carry a description frontmatter and invoke their skill', () => {
  for (const [file, skill] of [
    ['setup.md', 'wave:setup'],
    ['init.md', 'wave:init'],
  ]) {
    const body = readFileSync(join(PLUGIN_ROOT, 'commands', file), 'utf8')
    assert.match(body, /^---\n(.*\n)*?description: .+\n(.*\n)*?---\n/)
    assert.match(body, new RegExp(`Invoke the \`${skill}\` skill and follow it\\.`))
  }
})

test('makeTempRepo builds a git repo with exactly one commit', () => {
  const repo = makeTempRepo()
  try {
    const log = repo.run('git', ['log', '--oneline'])
    assert.equal(log.status, 0)
    assert.equal(log.stdout.trim().split('\n').length, 1)
    const status = repo.run('git', ['status', '--porcelain'])
    assert.equal(status.stdout.trim(), '')
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo writes .claude/wave.env as WAVE_<KEY>=<value> lines', () => {
  const repo = makeTempRepo({
    waveEnv: { WT_ROOT: '../demo-wt', BRANCH_PREFIX: 'codex', ENV_FILE: '', REGISTRY_DIR: 'docs/registry' },
  })
  try {
    const lines = readFileSync(join(repo.root, '.claude', 'wave.env'), 'utf8').trim().split('\n')
    assert.deepEqual(lines, [
      'WAVE_WT_ROOT=../demo-wt',
      'WAVE_BRANCH_PREFIX=codex',
      'WAVE_ENV_FILE=',
      'WAVE_REGISTRY_DIR=docs/registry',
    ])
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo quotes values with spaces so the file stays sourceable', () => {
  const repo = makeTempRepo({ waveEnv: { INSTALL_CMD: 'pnpm install --prefer-offline --silent' } })
  try {
    const envPath = join(repo.root, '.claude', 'wave.env')
    assert.equal(
      readFileSync(envPath, 'utf8').trim(),
      'WAVE_INSTALL_CMD="pnpm install --prefer-offline --silent"',
    )
    const sourced = spawnSync('bash', ['-c', `set -a; . "${envPath}"; printf '%s' "$WAVE_INSTALL_CMD"`], {
      encoding: 'utf8',
    })
    assert.equal(sourced.stdout, 'pnpm install --prefer-offline --silent')
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo leaves the env file untracked and commits extra files', () => {
  const repo = makeTempRepo({ envFile: 'DATABASE_URL=postgres://local\n', files: { 'src/a.txt': 'a\n' } })
  try {
    assert.equal(readFileSync(join(repo.root, '.env.local'), 'utf8'), 'DATABASE_URL=postgres://local\n')
    const tracked = repo.run('git', ['ls-files'])
    assert.ok(tracked.stdout.includes('src/a.txt'))
    assert.ok(!tracked.stdout.includes('.env.local'))
  } finally {
    repo.cleanup()
  }
})

test('installFakeCodex records argv, cwd and stdin length and writes the last-message file', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-codex-')))
  try {
    const binDir = installFakeCodex(join(dir, 'bin'))
    const codex = join(binDir, 'codex')
    accessSync(codex, constants.X_OK)

    const logPath = join(dir, 'codex.log')
    const lastMessage = join(dir, 'task-1.last.md')
    const r = spawnSync(codex, ['exec', '--sandbox', 'workspace-write', '--output-last-message', lastMessage, 'do it'], {
      cwd: dir,
      input: '',
      encoding: 'utf8',
      env: { ...process.env, FAKE_CODEX_LOG: logPath },
    })
    assert.equal(r.status, 0)

    const entries = readFakeCodexLog(logPath)
    assert.equal(entries.length, 1)
    assert.deepEqual(entries[0].argv, [
      'exec',
      '--sandbox',
      'workspace-write',
      '--output-last-message',
      lastMessage,
      'do it',
    ])
    assert.equal(entries[0].cwd, dir)
    assert.equal(entries[0].stdinBytes, 0)
    assert.equal(readFileSync(lastMessage, 'utf8'), 'fake last message\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('installFakeCodex records the resume id and the stdin byte count', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-codex-')))
  try {
    const codex = join(installFakeCodex(join(dir, 'bin')), 'codex')
    const logPath = join(dir, 'codex.log')
    spawnSync(codex, ['exec', 'resume', '0199-uuid', 'again'], {
      cwd: dir,
      input: 'abc',
      encoding: 'utf8',
      env: { ...process.env, FAKE_CODEX_LOG: logPath },
    })
    const entries = readFakeCodexLog(logPath)
    assert.equal(entries[0].resumeId, '0199-uuid')
    assert.equal(entries[0].stdinBytes, 3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('readFakeCodexLog returns an empty array when codex was never called', () => {
  assert.deepEqual(readFakeCodexLog(join(tmpdir(), 'wave-no-such-codex.log')), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test scaffold.test.mjs`

Expected: FAIL. The file cannot even load, because `helpers.mjs` does not exist yet:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/plugins/wave/tests/helpers.mjs' imported from <repo>/plugins/wave/tests/scaffold.test.mjs
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Step 3: Write minimal implementation**

`plugins/wave/tests/helpers.mjs`:

```js
// Shared test helpers for the wave plugin suite.
// Later tasks extend this file by ADDING exports only; never rename or change a signature.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// tests/helpers.mjs -> tests -> plugins/wave
export const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// Values with whitespace or shell metacharacters are double quoted so the file stays
// `source`-able; simple values are written bare, exactly as `WAVE_<KEY>=<value>`.
function waveEnvLine(key, value) {
  const raw = String(value)
  const body = /[\s"'$`\\]/.test(raw) ? `"${raw.replace(/(["$`\\])/g, '\\$1')}"` : raw
  return `WAVE_${key}=${body}`
}

export function makeTempRepo({ waveEnv = {}, envFile = null, files = {} } = {}) {
  // realpath: on macOS the tmpdir is a symlink and `git rev-parse --show-toplevel`
  // reports the resolved path, so tests comparing cwd strings would fail without this.
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'wave-repo-')))
  const root = join(base, 'repo')
  mkdirSync(root, { recursive: true })

  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  git('init', '-b', 'main')
  git('config', 'user.email', 'wave-tests@example.com')
  git('config', 'user.name', 'Wave Tests')
  git('config', 'commit.gpgsign', 'false')

  const write = (rel, content) => {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }

  write('README.md', '# temp repo\n')
  write('.gitignore', '.env.local\n')
  const waveKeys = Object.keys(waveEnv)
  if (waveKeys.length > 0) {
    write('.claude/wave.env', waveKeys.map((k) => waveEnvLine(k, waveEnv[k])).join('\n') + '\n')
  }
  for (const [rel, content] of Object.entries(files)) write(rel, content)

  git('add', '-A')
  git('commit', '-m', 'initial commit')

  // Written after the commit so it stays untracked, the way a real .env.local is:
  // a committed env file would land in every worktree and make the copy test vacuous.
  if (envFile !== null) write('.env.local', envFile)

  return {
    root,
    run(cmd, args = [], opts = {}) {
      return spawnSync(cmd, args, {
        cwd: root,
        encoding: 'utf8',
        ...opts,
        env: { ...process.env, ...(opts.env || {}) },
      })
    },
    cleanup() {
      rmSync(base, { recursive: true, force: true })
    },
  }
}

// Writes an executable `codex` into binDir. It records one JSON line per invocation into
// the file named by $FAKE_CODEX_LOG. Tests must PREPEND binDir to PATH, never replace it:
// the script itself needs `node` and `wc`.
export function installFakeCodex(binDir) {
  mkdirSync(binDir, { recursive: true })
  const file = join(binDir, 'codex')
  writeFileSync(
    file,
    `#!/bin/sh
# Fake codex CLI used by the wave test suite.
stdin_bytes=$(cat | wc -c | tr -d ' ')
FAKE_CODEX_STDIN_BYTES="$stdin_bytes" node -e '
const fs = require("node:fs")
const argv = process.argv.slice(1)
const rec = { argv, cwd: process.cwd(), stdinBytes: Number(process.env.FAKE_CODEX_STDIN_BYTES || 0) }
if (argv[0] === "exec" && argv[1] === "resume") rec.resumeId = argv[2]
const out = argv.indexOf("--output-last-message")
if (out !== -1 && argv[out + 1]) fs.writeFileSync(argv[out + 1], "fake last message\\n")
fs.appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(rec) + "\\n")
' "$@"
exit 0
`,
  )
  chmodSync(file, 0o755)
  return binDir
}

export function readFakeCodexLog(logPath) {
  if (!existsSync(logPath)) return []
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))
}

// templateRelPath is relative to PLUGIN_ROOT, e.g. 'templates/project/wave.env.hbs'.
export function render(templateRelPath, knobs) {
  const dir = mkdtempSync(join(tmpdir(), 'wave-knobs-'))
  const knobsFile = join(dir, 'knobs.json')
  try {
    writeFileSync(knobsFile, JSON.stringify(knobs, null, 2))
    const r = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'render.mjs'), join(PLUGIN_ROOT, templateRelPath), knobsFile],
      { encoding: 'utf8' },
    )
    if (r.status !== 0) throw new Error(`render ${templateRelPath} failed (${r.status}): ${r.stderr}`)
    return r.stdout
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function runScript(absScript, args, { cwd, env } = {}) {
  return spawnSync('bash', [absScript, ...args], {
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...(env || {}) },
  })
}

export function runHook(absHook, toolInput, { cwd, env } = {}) {
  return spawnSync('bash', [absHook], {
    input: JSON.stringify({ tool_input: toolInput }),
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...(env || {}) },
  })
}
```

`plugins/wave/plugin.json`:

```json
{
  "name": "wave",
  "version": "0.1.0",
  "description": "Multi-model wave execution: Codex implements in a sandboxed worktree, adversarial gates and reviews, a SQLite statement registry as the spec",
  "author": {
    "name": "Jakub Adamski",
    "email": "adamski.jakub@gmail.com"
  },
  "homepage": "https://github.com/Cracy660/claude-team-onboarding",
  "license": "MIT"
}
```

`plugins/wave/commands/setup.md`:

```markdown
---
description: Set up the wave method on this machine: Codex preflight, superpowers check, CLAUDE.md merge
argument-hint: (no arguments)
---

Invoke the `wave:setup` skill and follow it.
```

`plugins/wave/commands/init.md`:

```markdown
---
description: Scaffold the wave tooling into this repository: wave.env, settings, hooks, dispatch and registry skills, AGENTS.md
argument-hint: (no arguments)
---

Invoke the `wave:init` skill and follow it.
```

`plugins/wave/tests/fixtures/knobs.sample.json`:

```json
{
  "REPO_NAME": "demo",
  "WT_ROOT": "../demo-wt",
  "BRANCH_PREFIX": "codex",
  "ENV_FILE": ".env.local",
  "INSTALL_CMD": "pnpm install --prefer-offline --silent",
  "MODEL_DEFAULT": "gpt-5.6-terra",
  "EFFORT_DEFAULT": "medium",
  "MODEL_JUDGMENT": "gpt-5.6-sol",
  "LOG_DIR": ".superpowers/dispatch-logs",
  "REGISTRY_DIR": "docs/registry",
  "REGISTRY": true,
  "TEST_CMD": "pnpm test",
  "BUILD_CMD": "pnpm build",
  "TEST_BIN_HINT": "./node_modules/.bin/vitest",
  "VITEST": true,
  "HOUSE_CONVENTIONS": "",
  "EXTERNAL_KEYS": "OPENAI_API_KEY"
}
```

`.claude-plugin/marketplace.json`, complete file after the edit:

```json
{
  "name": "claude-team-onboarding",
  "description": "Claude Code plugins by Jakub Adamski: claude-team (Polish onboarding curriculum) and wave (multi-model wave execution with Codex, adversarial gates and a statement registry)",
  "owner": {
    "name": "Jakub Adamski",
    "url": "https://github.com/Cracy660"
  },
  "plugins": [
    {
      "name": "claude-team",
      "source": "./plugins/claude-team",
      "description": "Interactive Polish onboarding: TDD, git hygiene, portable hooks, stack setup, baseline plugins"
    },
    {
      "name": "wave",
      "source": "./plugins/wave",
      "description": "Multi-model wave execution: Codex implements in a sandboxed worktree, adversarial gates and reviews, a SQLite statement registry as the spec"
    }
  ]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test scaffold.test.mjs`

Expected: PASS.

```
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

- [ ] **Step 5: Commit**

```
git add plugins/wave/plugin.json plugins/wave/commands plugins/wave/tests .claude-plugin/marketplace.json && git commit -m "feat(wave): scaffold the plugin, marketplace entry and test harness"
```

---

### Task 2: template renderer

**Files:**

- Create: `plugins/wave/scripts/render.mjs`
- Test: `plugins/wave/tests/render.test.mjs`

**Interfaces:**

- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1).
- Produces the renderer every `.hbs` template in `templates/project/` goes through, and which the `init` skill calls instead of substituting placeholders by hand:
  - CLI: `node scripts/render.mjs <template> <knobs.json> [--out <file>]`. Rendered text goes to stdout unless `--out` is given.
  - `{{KEY}}` is replaced by the knob's value, stringified.
  - `{{#if KEY}} ... {{/if}}` is kept when the knob is boolean `true` or a non-empty string, and removed when it is `false` or an empty string. No nesting. When a delimiter sits alone on a line, the whole line goes, so a removed block leaves no blank line behind.
  - A knob the knobs file does not declare at all is an error, inside `{{#if}}` exactly as in `{{KEY}}`. Only a declared knob can turn a block off, so a template rendered with the registry off is given `"REGISTRY": false` explicitly.
  - Any unknown knob, from either construct, ends the run: exit 1 with `render: missing knobs: A, B` on stderr, one message carrying every name sorted and deduped, and nothing written.
  - `--out` creates the parent directory when it is missing.
- Produces nothing else. Do not add a `--strict` flag, a nesting feature, or partials.

**Notes for the implementer:**

- Order matters: `{{#if}}` blocks are resolved BEFORE `{{KEY}}` substitution, so a knob only referenced inside a removed block is not required. The `#if` key itself is still required, which is why `truthy` records it.
- One shared `missing` set collects both kinds of unknown knob, so a template with a bad `#if` name and a bad `{{KEY}}` reports both in one message instead of one per run.
- The own-line regex uses the `m` flag and consumes the delimiter's newline. The inline regex is the fallback for `text {{#if X}}y{{/if}} text` on one line. Keep both, in that order.
- No network, no dependencies. Standard library only.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/render.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const RENDER = join(PLUGIN_ROOT, 'scripts', 'render.mjs')

// Renders a literal template string with a literal knob set in a throwaway directory.
// The caller inspects files under dir, so the caller also removes it.
function renderText(templateBody, knobs, extraArgs = []) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-render-')))
  const templatePath = join(dir, 'template.hbs')
  const knobsPath = join(dir, 'knobs.json')
  writeFileSync(templatePath, templateBody)
  writeFileSync(knobsPath, JSON.stringify(knobs))
  const result = spawnSync('node', [RENDER, templatePath, knobsPath, ...extraArgs], {
    encoding: 'utf8',
    cwd: dir,
  })
  return { ...result, dir }
}

test('substitutes every {{KEY}} with its knob value', () => {
  const r = renderText('WAVE_WT_ROOT={{WT_ROOT}}\nWAVE_BRANCH_PREFIX={{BRANCH_PREFIX}}\n', {
    WT_ROOT: '../demo-wt',
    BRANCH_PREFIX: 'codex',
  })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'WAVE_WT_ROOT=../demo-wt\nWAVE_BRANCH_PREFIX=codex\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('substitutes the same knob more than once', () => {
  const r = renderText('{{NAME}} and {{NAME}} again\n', { NAME: 'wave' })
  assert.equal(r.stdout, 'wave and wave again\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('keeps an {{#if}} block when the knob is true', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { REGISTRY: true })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\nregistry line\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('keeps an {{#if}} block when the knob is a non-empty string', () => {
  const r = renderText('one\n{{#if HOUSE_CONVENTIONS}}\n{{HOUSE_CONVENTIONS}}\n{{/if}}\ntwo\n', {
    HOUSE_CONVENTIONS: 'never bypass the router',
  })
  assert.equal(r.stdout, 'one\nnever bypass the router\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('removes an {{#if}} block when the knob is false, leaving no blank line', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { REGISTRY: false })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('removes an {{#if}} block when the knob is an empty string, leaving no blank line', () => {
  const r = renderText('one\n{{#if HOUSE_CONVENTIONS}}\n{{HOUSE_CONVENTIONS}}\n{{/if}}\ntwo\n', {
    HOUSE_CONVENTIONS: '',
  })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('handles two blocks in one template independently', () => {
  const body = 'a\n{{#if ONE}}\nfirst\n{{/if}}\nb\n{{#if TWO}}\nsecond\n{{/if}}\nc\n'
  const r = renderText(body, { ONE: true, TWO: false })
  assert.equal(r.stdout, 'a\nfirst\nb\nc\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('exits 1 when an {{#if}} names a knob the file does not declare', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { OTHER: 'x' })
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: REGISTRY')
  assert.equal(r.stdout, '')
  rmSync(r.dir, { recursive: true, force: true })
})

test('reports a missing {{#if}} knob together with a missing {{KEY}}, sorted', () => {
  const r = renderText('{{ZULU}}\n{{#if ALPHA}}\nx\n{{/if}}\n', {})
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: ALPHA, ZULU')
  rmSync(r.dir, { recursive: true, force: true })
})

test('exits 1 and names every missing knob, sorted and deduped', () => {
  const r = renderText('{{B}} {{A}} {{A}}\n', {})
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: A, B')
  assert.equal(r.stdout, '')
  rmSync(r.dir, { recursive: true, force: true })
})

test('writes the rendered file with --out and creates its parent directory', () => {
  const r = renderText('WAVE_LOG_DIR={{LOG_DIR}}\n', { LOG_DIR: '.superpowers/dispatch-logs' }, [
    '--out',
    'nested/wave.env',
  ])
  assert.equal(r.status, 0)
  assert.equal(r.stdout, '')
  assert.equal(
    readFileSync(join(r.dir, 'nested', 'wave.env'), 'utf8'),
    'WAVE_LOG_DIR=.superpowers/dispatch-logs\n',
  )
  rmSync(r.dir, { recursive: true, force: true })
})

test('writes nothing with --out when a knob is missing', () => {
  const r = renderText('{{MISSING}}\n', {}, ['--out', 'out.txt'])
  assert.equal(r.status, 1)
  // Assert the renderer's own message: a missing script also exits 1, and this test
  // has to fail before render.mjs exists.
  assert.equal(r.stderr.trim(), 'render: missing knobs: MISSING')
  assert.equal(existsSync(join(r.dir, 'out.txt')), false)
  rmSync(r.dir, { recursive: true, force: true })
})

test('passes a template without placeholders through unchanged', () => {
  const body = '#!/usr/bin/env bash\nset -euo pipefail\n\n# no placeholders here\necho "hello"\n'
  const r = renderText(body, { UNUSED: 'x' })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, body)
  rmSync(r.dir, { recursive: true, force: true })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test render.test.mjs`

Expected: FAIL, every test, because the script does not exist:

```
Error: Cannot find module '<repo>/plugins/wave/scripts/render.mjs'
ℹ tests 13
ℹ pass 0
ℹ fail 13
```

- [ ] **Step 3: Write minimal implementation**

`plugins/wave/scripts/render.mjs`:

```js
#!/usr/bin/env node
// Renders a wave template. Two constructs, no nesting:
//   {{KEY}}                      replaced by the knob's value
//   {{#if KEY}} ... {{/if}}      kept when the knob is true or a non-empty string
// A {{...}} left after rendering is an unknown knob and a hard error.
// Usage: node scripts/render.mjs <template> <knobs.json> [--out <file>]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

function parseArgs(argv) {
  const positional = []
  let out = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      out = argv[i + 1]
      i += 1
    } else {
      positional.push(argv[i])
    }
  }
  return { template: positional[0], knobsPath: positional[1], out }
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const { template, knobsPath, out } = parseArgs(process.argv.slice(2))
if (!template || !knobsPath) fail('usage: render.mjs <template> <knobs.json> [--out <file>]')
if (out === null && process.argv.includes('--out')) fail('render: --out needs a file path')

let knobs
try {
  knobs = JSON.parse(readFileSync(knobsPath, 'utf8'))
} catch (error) {
  fail(`render: cannot read knobs ${knobsPath}: ${error.message}`)
}

let source
try {
  source = readFileSync(template, 'utf8')
} catch (error) {
  fail(`render: cannot read template ${template}: ${error.message}`)
}

// Every unknown knob name lands here, whether it came from a {{KEY}} or from an
// {{#if KEY}} the knobs file never declared.
const missing = new Set()

// A knob is truthy when it is boolean true or a non-empty string. A knob the file
// does not declare at all is an error, not a quiet false: a typo in an {{#if}} would
// otherwise drop a whole block without a word.
function truthy(key) {
  if (!(key in knobs)) {
    missing.add(key)
    return false
  }
  const value = knobs[key]
  if (value === true) return true
  if (typeof value === 'string') return value.length > 0
  return false
}

// Own-line delimiters take their whole line, so removing a block leaves no blank line.
const OWN_LINE_IF = /^[ \t]*\{\{#if +(\w+)\}\}[ \t]*\r?\n([\s\S]*?)^[ \t]*\{\{\/if\}\}[ \t]*(?:\r?\n|$)/gm
const INLINE_IF = /\{\{#if +(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g

const output = source
  .replace(OWN_LINE_IF, (_match, key, body) => (truthy(key) ? body : ''))
  .replace(INLINE_IF, (_match, key, body) => (truthy(key) ? body : ''))
  .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in knobs ? String(knobs[key]) : match))

for (const match of output.matchAll(/\{\{([^{}]*)\}\}/g)) missing.add(match[1].trim())
const names = [...missing].sort()
if (names.length > 0) fail(`render: missing knobs: ${names.join(', ')}`)

if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, output)
} else {
  process.stdout.write(output)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test render.test.mjs`

Expected: PASS.

```
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

Then run the whole suite, `cd plugins/wave/tests && npm test`, and confirm no earlier test regressed.

- [ ] **Step 5: Commit**

```
git add plugins/wave/scripts/render.mjs plugins/wave/tests/render.test.mjs && git commit -m "feat(wave): add the template renderer"
```

---

### Task 3: settings merge script

**Files:**

- Create: `plugins/wave/scripts/merge-settings.mjs`
- Test: `plugins/wave/tests/merge-settings.test.mjs`

**Interfaces:**

- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1).
- Produces the merge the `init` skill runs against a project `.claude/settings.json`:
  - CLI: `node scripts/merge-settings.mjs <settings.json> <fragment.json>`. Exit 0 on success.
  - Target absent: it is created, starting from `{}`.
  - The merge is computed first. A run that changes nothing writes nothing at all: no new settings file, and no backup. Repeated `/wave:init` runs must not pile up identical `.bak` files.
  - Target present and something changed: it is copied to `<settings.json>.pre-wave-<YYYYMMDD-HHMMSS>.bak` once per run, before the write.
  - `permissions.deny` and `permissions.allow` are unioned: existing entries keep their order, new ones are appended, duplicates are dropped. A bucket the fragment does not mention is not touched, and a bucket where nothing was added is not touched either.
  - For each `hooks.<Event>` array in the fragment, an entry is appended unless some existing entry of that event already carries EVERY `hooks[].command` string of the incoming entry. Partial overlap appends. Other events are untouched.
  - Every other key is preserved.
  - The write is atomic: `<target>.tmp` then rename, and no `.tmp` survives.
  - Output, one line each, in this order: `backup: <path>` when a backup was taken, then either one line per change or the single line `no changes`. Change lines read `deny + <string>`, `allow + <string>`, `hooks.<Event> + N entry` (or `entries` when N is not 1).
  - A target that is not valid JSON is refused: exit 1, `merge-settings: cannot parse settings <path>: ...` on stderr, file untouched.
- Produces nothing else. No flags, no interactive prompts, no removal of existing entries.

**Notes for the implementer:**

- The fragment this runs against in production is `templates/project/settings.json`, created in Task 9. Do not depend on it here: the test carries its own literal copy, so this task lands before Task 9.
- Never rewrite the file when nothing changed. The `no changes` run has to leave the bytes alone, which is what the second-run test checks.
- No dependencies. Standard library only.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/merge-settings.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const MERGE = join(PLUGIN_ROOT, 'scripts', 'merge-settings.mjs')

// The fragment /wave:init merges, kept here as a literal so this task does not
// depend on templates/project/settings.json existing yet.
const FRAGMENT = {
  permissions: {
    deny: ['Bash(codex exec:*)', 'Bash(codex resume:*)'],
    allow: [
      'Bash(.claude/skills/dispatch/scripts/dispatch.sh:*)',
      'Bash(bash .claude/skills/dispatch/scripts/dispatch.sh:*)',
    ],
  },
  hooks: {
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [
          { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/registry-guard.sh"' },
          { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/code-only-branch.sh"' },
        ],
      },
    ],
  },
}

function setup(targetContent, fragment = FRAGMENT) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-settings-')))
  const target = join(dir, 'settings.json')
  const fragmentPath = join(dir, 'fragment.json')
  writeFileSync(fragmentPath, JSON.stringify(fragment, null, 2))
  if (targetContent !== null) writeFileSync(target, JSON.stringify(targetContent, null, 2))
  const run = () => spawnSync('node', [MERGE, target, fragmentPath], { encoding: 'utf8' })
  const read = () => JSON.parse(readFileSync(target, 'utf8'))
  const backups = () => readdirSync(dir).filter((f) => /^settings\.json\.pre-wave-\d{8}-\d{6}\.bak$/.test(f))
  return { dir, target, run, read, backups, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('creates the target and merges the fragment when no settings file exists', () => {
  const s = setup(null)
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    const settings = s.read()
    assert.deepEqual(settings.permissions.deny, ['Bash(codex exec:*)', 'Bash(codex resume:*)'])
    assert.equal(settings.hooks.PreToolUse.length, 1)
    assert.equal(s.backups().length, 0)
    assert.match(r.stdout, /deny \+ Bash\(codex exec:\*\)/)
    assert.match(r.stdout, /hooks\.PreToolUse \+ 1 entry/)
  } finally {
    s.cleanup()
  }
})

test('backs the target up exactly once, as .pre-wave-<timestamp>.bak', () => {
  const s = setup({ model: 'opus' })
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    const backups = s.backups()
    assert.equal(backups.length, 1)
    assert.deepEqual(JSON.parse(readFileSync(join(s.dir, backups[0]), 'utf8')), { model: 'opus' })
    assert.match(r.stdout, /^backup: .*settings\.json\.pre-wave-\d{8}-\d{6}\.bak$/m)
  } finally {
    s.cleanup()
  }
})

test('a second identical run backs nothing up, because it changes nothing', () => {
  const s = setup({ model: 'opus' })
  try {
    s.run()
    assert.equal(s.backups().length, 1)
    const second = s.run()
    assert.equal(second.status, 0)
    assert.doesNotMatch(second.stdout, /^backup:/m)
    assert.equal(s.backups().length, 1)
  } finally {
    s.cleanup()
  }
})

test('unions deny and allow, dedupes, and keeps the existing order', () => {
  const s = setup({
    permissions: {
      deny: ['Bash(rm -rf:*)', 'Bash(codex exec:*)'],
      allow: ['Bash(git status:*)'],
    },
  })
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    assert.deepEqual(s.read().permissions.deny, [
      'Bash(rm -rf:*)',
      'Bash(codex exec:*)',
      'Bash(codex resume:*)',
    ])
    assert.deepEqual(s.read().permissions.allow, [
      'Bash(git status:*)',
      'Bash(.claude/skills/dispatch/scripts/dispatch.sh:*)',
      'Bash(bash .claude/skills/dispatch/scripts/dispatch.sh:*)',
    ])
    assert.doesNotMatch(r.stdout, /deny \+ Bash\(codex exec:\*\)/)
    assert.match(r.stdout, /deny \+ Bash\(codex resume:\*\)/)
  } finally {
    s.cleanup()
  }
})

test('does not append a hook entry whose commands an existing entry already carries', () => {
  const s = setup({ hooks: { PreToolUse: [FRAGMENT.hooks.PreToolUse[0]] } })
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    assert.equal(s.read().hooks.PreToolUse.length, 1)
    assert.doesNotMatch(r.stdout, /hooks\.PreToolUse/)
  } finally {
    s.cleanup()
  }
})

test('appends the hook entry when an existing entry carries only part of its commands', () => {
  const s = setup({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/registry-guard.sh"' }],
        },
      ],
    },
  })
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    assert.equal(s.read().hooks.PreToolUse.length, 2)
    assert.match(r.stdout, /hooks\.PreToolUse \+ 1 entry/)
  } finally {
    s.cleanup()
  }
})

test('appends to an event that exists with an unrelated entry, and leaves other events alone', () => {
  const s = setup({
    hooks: {
      PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier --write' }] }],
      PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'protect-files' }] }],
    },
  })
  try {
    s.run()
    const settings = s.read()
    assert.equal(settings.hooks.PreToolUse.length, 2)
    assert.equal(settings.hooks.PreToolUse[0].hooks[0].command, 'protect-files')
    assert.deepEqual(settings.hooks.PostToolUse, [
      { matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier --write' }] },
    ])
  } finally {
    s.cleanup()
  }
})

test('preserves every key it does not own', () => {
  const original = {
    model: 'fable[1m]',
    statusLine: { type: 'command', command: 'ccstatusline' },
    env: { AGENT_TEAMS: '1' },
    permissions: { ask: ['Bash(git push:*)'], additionalDirectories: ['~/Code'] },
    enabledPlugins: { 'superpowers@claude-plugins-official': true },
  }
  const s = setup(original)
  try {
    s.run()
    const settings = s.read()
    // The merge has to have happened: an untouched file also preserves every key.
    assert.ok(settings.permissions.deny.includes('Bash(codex exec:*)'))
    assert.equal(settings.model, original.model)
    assert.deepEqual(settings.statusLine, original.statusLine)
    assert.deepEqual(settings.env, original.env)
    assert.deepEqual(settings.enabledPlugins, original.enabledPlugins)
    assert.deepEqual(settings.permissions.ask, original.permissions.ask)
    assert.deepEqual(settings.permissions.additionalDirectories, original.permissions.additionalDirectories)
  } finally {
    s.cleanup()
  }
})

test('leaves no .tmp file behind', () => {
  const s = setup({ model: 'opus' })
  try {
    s.run()
    // The merge has to have happened: an absent script also leaves no .tmp file.
    assert.ok(s.read().permissions.deny.includes('Bash(codex exec:*)'))
    assert.equal(existsSync(`${s.target}.tmp`), false)
    assert.deepEqual(
      readdirSync(s.dir).filter((f) => f.endsWith('.tmp')),
      [],
    )
  } finally {
    s.cleanup()
  }
})

test('reports no changes on a second identical run and leaves the file untouched', () => {
  const s = setup(null)
  try {
    s.run()
    const afterFirst = readFileSync(s.target, 'utf8')
    const r = s.run()
    assert.equal(r.status, 0)
    assert.match(r.stdout, /^no changes$/m)
    assert.equal(readFileSync(s.target, 'utf8'), afterFirst)
  } finally {
    s.cleanup()
  }
})

test('refuses to touch a settings file it cannot parse', () => {
  const s = setup(null)
  try {
    writeFileSync(s.target, '{ this is not json')
    const r = s.run()
    assert.equal(r.status, 1)
    assert.match(r.stderr, /merge-settings: cannot parse settings/)
    assert.equal(readFileSync(s.target, 'utf8'), '{ this is not json')
  } finally {
    s.cleanup()
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test merge-settings.test.mjs`

Expected: FAIL, every test, because the script does not exist:

```
Error: Cannot find module '<repo>/plugins/wave/scripts/merge-settings.mjs'
ℹ tests 11
ℹ pass 0
ℹ fail 11
```

- [ ] **Step 3: Write minimal implementation**

`plugins/wave/scripts/merge-settings.mjs`:

```js
#!/usr/bin/env node
// Merges a settings fragment into a Claude settings.json without losing anything.
// Union on permissions.deny and permissions.allow, append-if-absent on hook entries,
// every other key untouched. Backs the target up, writes atomically.
// Usage: node scripts/merge-settings.mjs <settings.json> <fragment.json>
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return fail(`merge-settings: cannot parse ${label} ${path}: ${error.message}`)
  }
}

function timestamp(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

function commandsOf(entry) {
  const hooks = Array.isArray(entry && entry.hooks) ? entry.hooks : []
  return hooks.map((h) => h && h.command).filter((c) => typeof c === 'string')
}

const [targetPath, fragmentPath] = process.argv.slice(2)
if (!targetPath || !fragmentPath) fail('usage: merge-settings.mjs <settings.json> <fragment.json>')

const fragment = readJson(fragmentPath, 'fragment')
const existed = existsSync(targetPath)
const target = existed ? readJson(targetPath, 'settings') : {}
const changes = []

// permissions: union, existing order kept, new entries appended.
const fragmentPermissions = fragment.permissions || {}
for (const bucket of ['deny', 'allow']) {
  const additions = Array.isArray(fragmentPermissions[bucket]) ? fragmentPermissions[bucket] : []
  if (additions.length === 0) continue
  const current =
    target.permissions && Array.isArray(target.permissions[bucket]) ? target.permissions[bucket] : []
  const merged = [...current]
  for (const entry of additions) {
    if (merged.includes(entry)) continue
    merged.push(entry)
    changes.push(`${bucket} + ${entry}`)
  }
  // Touch the target only when something was actually added.
  if (merged.length !== current.length) {
    target.permissions = target.permissions || {}
    target.permissions[bucket] = merged
  }
}

// hooks: append an entry unless an existing entry already carries every command it has.
const fragmentHooks = fragment.hooks || {}
for (const [event, entries] of Object.entries(fragmentHooks)) {
  const incoming = Array.isArray(entries) ? entries : []
  if (incoming.length === 0) continue
  const current = target.hooks && Array.isArray(target.hooks[event]) ? target.hooks[event] : []
  const appended = []
  for (const entry of incoming) {
    const wanted = commandsOf(entry)
    const covered =
      wanted.length > 0 &&
      [...current, ...appended].some((existing) => {
        const have = commandsOf(existing)
        return wanted.every((command) => have.includes(command))
      })
    if (!covered) appended.push(entry)
  }
  if (appended.length > 0) {
    target.hooks = target.hooks || {}
    target.hooks[event] = [...current, ...appended]
    changes.push(`hooks.${event} + ${appended.length} ${appended.length === 1 ? 'entry' : 'entries'}`)
  }
}

// Nothing to change means nothing to write and nothing to back up: a repeated
// /wave:init must not leave a pile of identical .bak files behind.
let backupPath = null
if (existed && changes.length > 0) {
  backupPath = `${targetPath}.pre-wave-${timestamp()}.bak`
  copyFileSync(targetPath, backupPath)
}

if (changes.length > 0 || !existed) {
  const tmpPath = `${targetPath}.tmp`
  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(tmpPath, `${JSON.stringify(target, null, 2)}\n`)
  renameSync(tmpPath, targetPath)
}

if (backupPath) process.stdout.write(`backup: ${backupPath}\n`)
if (changes.length === 0) process.stdout.write('no changes\n')
else for (const line of changes) process.stdout.write(`${line}\n`)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test merge-settings.test.mjs`

Expected: PASS.

```
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Then run the whole suite, `cd plugins/wave/tests && npm test`, and confirm no earlier test regressed.

- [ ] **Step 5: Commit**

```
git add plugins/wave/scripts/merge-settings.mjs plugins/wave/tests/merge-settings.test.mjs && git commit -m "feat(wave): add the settings merge script"
```

---


### Task 4: wave.env template and the generalized dispatch script — RED GATE

**Files:**
- Create: `plugins/wave/templates/project/wave.env.hbs`
- Create: `plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh`
- Test: `plugins/wave/tests/dispatch.test.mjs`

**Interfaces:**
- Consumes (Task 1, `plugins/wave/tests/helpers.mjs`): `PLUGIN_ROOT`,
  `makeTempRepo({ waveEnv, envFile, files })`, `installFakeCodex(binDir)`,
  `readFakeCodexLog(logPath)`, `render(templateRelPath, knobs)`,
  `runScript(absScript, args, { cwd, env })`. Two properties of `makeTempRepo` this task
  depends on: it writes each `.claude/wave.env` line as `WAVE_<KEY>=<value>` with the value
  double quoted whenever it contains whitespace (so `INSTALL_CMD: 'touch installed.marker'`
  stays one command when the file is sourced), and it writes no `wave.env` at all when the
  `waveEnv` object is empty (that is how the missing-file refusal is set up).
- Consumes (Task 1): `plugins/wave/tests/fixtures/knobs.sample.json`.
- Consumes (Task 2): `plugins/wave/scripts/render.mjs`, through the `render` helper.
- Produces: `.claude/wave.env`, the shell-sourceable knob file every other wave script and
  hook reads, with the ten `WAVE_*` names fixed by this task; and the `dispatch.sh` CLI
  `new | resume | clean | list` that Tasks 9, 11, 12 and 15 refer to by path
  `.claude/skills/dispatch/scripts/dispatch.sh`.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/dispatch.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import {
  PLUGIN_ROOT,
  installFakeCodex,
  makeTempRepo,
  readFakeCodexLog,
  render,
  runScript,
} from './helpers.mjs'

const DISPATCH = join(
  PLUGIN_ROOT,
  'templates/project/skills/dispatch/scripts/dispatch.sh',
)
const SESSION_UUID = '0198e0b4-1a2b-4c3d-8e4f-5a6b7c8d9e0f'

const DEFAULT_WAVE_ENV = {
  WT_ROOT: '../demo-wt',
  BRANCH_PREFIX: 'codex',
  ENV_FILE: '.env.local',
  INSTALL_CMD: 'touch installed.marker',
  MODEL_DEFAULT: 'gpt-5.6-terra',
  EFFORT_DEFAULT: 'medium',
  MODEL_JUDGMENT: 'gpt-5.6-sol',
  LOG_DIR: '.superpowers/dispatch-logs',
  REGISTRY_DIR: 'docs/registry',
}

// installed.marker is ignored on purpose: `git worktree remove` refuses a worktree that
// holds untracked files, exactly as it would for a real node_modules that is not ignored.
const IGNORE = '.env.local\ninstalled.marker\n'

// runScript hands the script an already closed stdin, which would make the "stdin is
// terminated" assertion pass even without `< /dev/null`. This wrapper pipes real bytes in,
// standing in for the terminal stdin that makes codex stall in production.
const STDIN_NOISE = 'unterminated stdin'
const WRAPPER = `#!/usr/bin/env bash\nprintf '%s' '${STDIN_NOISE}' | bash "$1" "\${@:2}"\n`

function setup(t, { waveEnv = {}, envFile = 'TOKEN=abc\n', files = {} } = {}) {
  const repo = makeTempRepo({
    waveEnv: { ...DEFAULT_WAVE_ENV, ...waveEnv },
    envFile,
    files: { '.gitignore': IGNORE, 'brief.md': 'do the task', ...files },
  })
  t.after(() => repo.cleanup())
  const bin = installFakeCodex(join(repo.root, '.fakebin'))
  const codexLog = join(repo.root, 'codex-calls.log')
  const codexHome = join(repo.root, '.codex-home')
  const wrapper = join(repo.root, 'with-stdin.sh')
  writeFileSync(wrapper, WRAPPER)
  return {
    ...repo,
    codexLog,
    codexHome,
    prompt: join(repo.root, 'brief.md'),
    wt: (task) => join(repo.root, '..', 'demo-wt', task),
    dispatch: (args) =>
      runScript(wrapper, [DISPATCH, ...args], {
        cwd: repo.root,
        env: {
          PATH: `${bin}:${process.env.PATH}`,
          FAKE_CODEX_LOG: codexLog,
          CODEX_HOME: codexHome,
        },
      }),
  }
}

test('the rendered wave.env is what the script reads its defaults from', (t) => {
  const knobs = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'tests/fixtures/knobs.sample.json'), 'utf8'))
  const rendered = render('templates/project/wave.env.hbs', knobs)
  assert.equal(rendered.includes('{{'), false, rendered)
  const repo = makeTempRepo({ waveEnv: {} })
  t.after(() => repo.cleanup())
  mkdirSync(join(repo.root, '.claude'), { recursive: true })
  writeFileSync(join(repo.root, '.claude/wave.env'), rendered)
  const r = runScript(DISPATCH, [], { cwd: repo.root })
  assert.equal(r.status, 1)
  assert.match(r.stdout, /^Defaults: --model gpt-5\.6-terra --effort medium/m)
  assert.match(r.stdout, /^use --model gpt-5\.6-sol for multi-file or judgment tasks\.$/m)
})

test('new creates the worktree and branch under the configured root', (t) => {
  const ctx = setup(t)
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(ctx.wt('task-a')), true)
  assert.match(r.stdout, /^dispatch: task-a -> .*demo-wt\/task-a \(gpt-5\.6-terra\/medium\)/m)
  const branches = ctx.run('git', ['branch', '--list', 'codex/task-a'])
  assert.match(branches.stdout, /codex\/task-a/)
})

test('new copies the configured env file into the worktree', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(readFileSync(join(ctx.wt('task-a'), '.env.local'), 'utf8'), 'TOKEN=abc\n')
})

test('an empty WAVE_ENV_FILE skips the copy instead of failing', (t) => {
  const ctx = setup(t, { waveEnv: { ENV_FILE: '' }, envFile: null })
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(join(ctx.wt('task-a'), '.env.local')), false)
})

test('new runs the configured install command inside the worktree', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(existsSync(join(ctx.wt('task-a'), 'installed.marker')), true)
})

test('an empty WAVE_INSTALL_CMD skips provisioning', (t) => {
  const ctx = setup(t, { waveEnv: { INSTALL_CMD: '' } })
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(join(ctx.wt('task-a'), 'installed.marker')), false)
})

test('new calls codex with the sandbox, model, effort and last-message flags', (t) => {
  const ctx = setup(t)
  assert.equal(
    ctx.dispatch(['new', 'task-a', ctx.prompt, '--model', 'gpt-5.6-sol', '--effort', 'high'])
      .status,
    0,
  )
  const calls = readFakeCodexLog(ctx.codexLog)
  assert.equal(calls.length, 1)
  const { argv } = calls[0]
  assert.equal(argv[0], 'exec')
  assert.equal(realpathSync(argv[argv.indexOf('--cd') + 1]), realpathSync(ctx.wt('task-a')))
  assert.equal(argv[argv.indexOf('--sandbox') + 1], 'workspace-write')
  assert.equal(argv.includes('--dangerously-bypass-approvals-and-sandbox'), false)
  assert.equal(argv[argv.indexOf('-m') + 1], 'gpt-5.6-sol')
  assert.equal(argv[argv.indexOf('-c') + 1], 'model_reasoning_effort=high')
  assert.equal(
    argv[argv.indexOf('--output-last-message') + 1],
    join(ctx.root, '.superpowers/dispatch-logs', 'task-a.last.md'),
  )
  // The prompt rides the argument, read from the file, never piped.
  assert.equal(argv[argv.length - 1], 'do the task')
})

test('new terminates stdin so codex cannot stall waiting for input', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(readFakeCodexLog(ctx.codexLog)[0].stdinBytes, 0)
})

test('a failing codex run is not masked by the tee pipeline', (t) => {
  const ctx = setup(t)
  // A codex that exits non-zero: without `set -o pipefail` the pipeline would report
  // tee's exit code and the dispatch would look green.
  const failing = join(ctx.root, '.failbin')
  mkdirSync(failing, { recursive: true })
  writeFileSync(join(failing, 'codex'), '#!/bin/sh\ncat > /dev/null\nexit 7\n')
  chmodSync(join(failing, 'codex'), 0o755)
  const r = runScript(join(ctx.root, 'with-stdin.sh'), [DISPATCH, 'new', 'task-a', ctx.prompt], {
    cwd: ctx.root,
    env: { PATH: `${failing}:${process.env.PATH}`, FAKE_CODEX_LOG: ctx.codexLog },
  })
  assert.equal(r.status, 7)
  assert.doesNotMatch(r.stdout, /dispatch: done/)
})

test('new writes a timestamped log and the last-message file', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  const logDir = join(ctx.root, '.superpowers/dispatch-logs')
  const entries = readdirSync(logDir)
  assert.equal(
    entries.some((f) => /^task-a\.\d{8}-\d{6}\.log$/.test(f)),
    true,
    `no timestamped log in ${entries.join(', ')}`,
  )
  assert.equal(existsSync(join(logDir, 'task-a.last.md')), true)
})

// One table over the four refusals. Each row states the wrong-Green it pins.
const REFUSALS = [
  {
    name: 'a task id that is not kebab-case',
    message: /^dispatch: task-id must be kebab-case$/m,
    prepare: (ctx) => ['new', 'Task_A', ctx.prompt],
  },
  {
    name: 'a worktree that already exists',
    message: /^dispatch: worktree exists: .*demo-wt\/task-a \(use resume, or clean first\)$/m,
    prepare: (ctx) => {
      mkdirSync(ctx.wt('task-a'), { recursive: true })
      return ['new', 'task-a', ctx.prompt]
    },
  },
  {
    name: 'a configured env file that is missing from the main checkout',
    options: { envFile: null },
    message: /^dispatch: \.env\.local missing in main checkout$/m,
    prepare: (ctx) => ['new', 'task-a', ctx.prompt],
  },
  {
    name: 'a missing .claude/wave.env',
    message: /^dispatch: \.claude\/wave\.env missing$/m,
    prepare: (ctx) => {
      rmSync(join(ctx.root, '.claude/wave.env'))
      return ['new', 'task-a', ctx.prompt]
    },
  },
]

for (const row of REFUSALS) {
  test(`new refuses ${row.name} with exit 1 and no codex call`, (t) => {
    const ctx = setup(t, row.options)
    const r = ctx.dispatch(row.prepare(ctx))
    assert.equal(r.status, 1)
    assert.match(r.stderr, row.message)
    assert.deepEqual(readFakeCodexLog(ctx.codexLog), [])
  })
}

test('resume finds the session by worktree path and runs inside the worktree', (t) => {
  const ctx = setup(t)
  const created = ctx.dispatch(['new', 'resume-task', ctx.prompt])
  assert.equal(created.status, 0, created.stderr)
  const wt = created.stdout.match(/^dispatch: resume-task -> (\S+) \(/m)[1]

  const sessionDir = join(ctx.codexHome, 'sessions', '2026', '09', '02')
  mkdirSync(sessionDir, { recursive: true })
  writeFileSync(
    join(sessionDir, `rollout-2026-09-02T10-11-12-${SESSION_UUID}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', cwd: wt })}\n`,
  )

  const r = ctx.dispatch(['resume', 'resume-task', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, new RegExp(`session=${SESSION_UUID}`))

  const calls = readFakeCodexLog(ctx.codexLog)
  const last = calls[calls.length - 1]
  assert.equal(last.resumeId, SESSION_UUID)
  assert.deepEqual(last.argv.slice(0, 2), ['exec', 'resume'])
  assert.equal(last.argv[last.argv.length - 1], 'do the task')
  assert.equal(last.stdinBytes, 0)
  // codex exec resume does not restore the session's --cd, so the script must pin cwd.
  assert.equal(realpathSync(last.cwd), realpathSync(ctx.wt('resume-task')))
  assert.notEqual(realpathSync(last.cwd), ctx.root)
})

test('resume refuses a task with no worktree', (t) => {
  const ctx = setup(t)
  const r = ctx.dispatch(['resume', 'never-dispatched', ctx.prompt])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^dispatch: no worktree for never-dispatched at .*demo-wt\/never-dispatched$/m)
  assert.deepEqual(readFakeCodexLog(ctx.codexLog), [])
})

test('clean removes the worktree and keeps the branch', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  const r = ctx.dispatch(['clean', 'task-a'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(ctx.wt('task-a')), false)
  const branches = ctx.run('git', ['branch', '--list', 'codex/task-a'])
  assert.match(branches.stdout, /codex\/task-a/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test dispatch.test.mjs`

Expected: FAIL, 17 tests, 0 pass, 17 fail. Every case reports
`AssertionError [ERR_ASSERTION]: bash: <repo>/plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh: No such file or directory` and `127 !== 0` (the refusal rows report `127 !== 1`), because `bash` cannot find the script. Observed on the reference implementation with both files removed:

```
ℹ tests 17
ℹ pass 0
ℹ fail 17
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/wave.env.hbs`:

```hbs
WAVE_WT_ROOT={{WT_ROOT}}
WAVE_BRANCH_PREFIX={{BRANCH_PREFIX}}
WAVE_ENV_FILE={{ENV_FILE}}
WAVE_INSTALL_CMD="{{INSTALL_CMD}}"
WAVE_MODEL_DEFAULT={{MODEL_DEFAULT}}
WAVE_EFFORT_DEFAULT={{EFFORT_DEFAULT}}
WAVE_MODEL_JUDGMENT={{MODEL_JUDGMENT}}
WAVE_LOG_DIR={{LOG_DIR}}
WAVE_REGISTRY_DIR={{REGISTRY_DIR}}
WAVE_EXTERNAL_KEYS="{{EXTERNAL_KEYS}}"
```

`WAVE_EXTERNAL_KEYS` is quoted because the knob is a space separated list of environment
variable names and may be empty. No script in this task reads it; the seal checklist in the
`running-waves` playbook does, to mask paid provider keys before a sealing run.

Create `plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh`:

```bash
#!/usr/bin/env bash
# Sanctioned Codex dispatch path. Owns worktree creation, sandbox flags, stdin
# termination, the env-file copy, dependency provisioning and logging. Raw
# `codex exec`/`codex resume` is permission-denied in a wave project
# (.claude/settings.json); this script is the programmatic enforcement of the
# dispatch rules in CLAUDE.md. Every knob comes from .claude/wave.env, so the
# file stays byte-identical across projects.
set -euo pipefail

die() { echo "dispatch: $*" >&2; exit 1; }

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || die "not inside a git repository"
WAVE_ENV="$REPO_ROOT/.claude/wave.env"
[ -f "$WAVE_ENV" ] || die ".claude/wave.env missing"
# shellcheck source=/dev/null
. "$WAVE_ENV"

WT_ROOT_RAW="${WAVE_WT_ROOT:-}"
[ -n "$WT_ROOT_RAW" ] || die "WAVE_WT_ROOT is empty in .claude/wave.env"
BRANCH_PREFIX="${WAVE_BRANCH_PREFIX:-codex}"
ENV_FILE="${WAVE_ENV_FILE:-}"
INSTALL_CMD="${WAVE_INSTALL_CMD:-}"
MODEL_DEFAULT="${WAVE_MODEL_DEFAULT:-gpt-5.6-terra}"
EFFORT_DEFAULT="${WAVE_EFFORT_DEFAULT:-medium}"
MODEL_JUDGMENT="${WAVE_MODEL_JUDGMENT:-$MODEL_DEFAULT}"
LOG_DIR_RAW="${WAVE_LOG_DIR:-.superpowers/dispatch-logs}"

# Relative knobs resolve against the repo root, never against $PWD.
resolve() { case "$1" in /*) printf '%s\n' "$1" ;; *) printf '%s\n' "$REPO_ROOT/$1" ;; esac; }
WT_ROOT="$(resolve "$WT_ROOT_RAW")"
LOG_DIR="$(resolve "$LOG_DIR_RAW")"
mkdir -p "$LOG_DIR"

usage() {
  cat <<EOF
Usage:
  dispatch.sh new <task-id> <prompt-file> [--model <id>] [--effort low|medium|high] [--base <ref>]
  dispatch.sh resume <task-id> <prompt-file>
  dispatch.sh clean <task-id>
  dispatch.sh list
Defaults: --model $MODEL_DEFAULT --effort $EFFORT_DEFAULT (mechanical, well-specified tasks);
use --model $MODEL_JUDGMENT for multi-file or judgment tasks.
EOF
  exit 1
}

cmd="${1:-}"; [ -n "$cmd" ] || usage; shift

case "$cmd" in
  new)
    TASK="${1:?task-id required}"; PROMPT_FILE="${2:?prompt-file required}"; shift 2
    MODEL="$MODEL_DEFAULT"; EFFORT="$EFFORT_DEFAULT"; BASE="HEAD"
    while [ $# -gt 0 ]; do
      case "$1" in
        --model)  MODEL="${2:?--model needs a value}";  shift 2 ;;
        --effort) EFFORT="${2:?--effort needs a value}"; shift 2 ;;
        --base)   BASE="${2:?--base needs a value}";   shift 2 ;;
        *) die "unknown flag: $1" ;;
      esac
    done
    [[ "$TASK" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "task-id must be kebab-case"
    [ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
    if [ -n "$ENV_FILE" ]; then
      [ -f "$REPO_ROOT/$ENV_FILE" ] || die "$ENV_FILE missing in main checkout"
    fi
    WT="$WT_ROOT/$TASK"
    if [ -e "$WT" ]; then die "worktree exists: $WT (use resume, or clean first)"; fi

    git -C "$REPO_ROOT" worktree add "$WT" -b "$BRANCH_PREFIX/$TASK" "$BASE"
    if [ -n "$ENV_FILE" ]; then
      # Without the env file, environment-gated suites silently skip and Green is
      # hollow. An empty WAVE_ENV_FILE means the project has nothing to copy.
      mkdir -p "$(dirname "$WT/$ENV_FILE")"
      cp "$REPO_ROOT/$ENV_FILE" "$WT/$ENV_FILE"
    fi
    if [ -n "$INSTALL_CMD" ]; then
      # Without installed dependencies the test and type binaries cannot run, and
      # the sandbox blocks the package manager's network fetch, so the worktree
      # must be provisioned from the local store before codex starts.
      ( cd "$WT" && eval "$INSTALL_CMD" ) || die "install command failed in $WT: $INSTALL_CMD"
    fi

    LOG="$LOG_DIR/$TASK.$(date +%Y%m%d-%H%M%S).log"
    echo "dispatch: $TASK -> $WT ($MODEL/$EFFORT) log=$LOG"
    # < /dev/null: codex stalls on an open stdin. pipefail keeps codex's exit code
    # through tee (never mask an exit code behind a pipe). --sandbox
    # workspace-write always, never danger-full-access, never the primary checkout.
    codex exec --cd "$WT" --sandbox workspace-write \
      -m "$MODEL" -c model_reasoning_effort="$EFFORT" \
      --output-last-message "$LOG_DIR/$TASK.last.md" \
      "$(cat "$PROMPT_FILE")" < /dev/null 2>&1 | tee "$LOG"
    echo "dispatch: done. Last message: $LOG_DIR/$TASK.last.md"
    ;;

  resume)
    TASK="${1:?task-id required}"; PROMPT_FILE="${2:?prompt-file required}"
    WT="$WT_ROOT/$TASK"
    [ -d "$WT" ] || die "no worktree for $TASK at $WT"
    [ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
    # Resume by session ID, never --last (interleaved sessions pick the wrong one).
    # resume rejects --sandbox/--output-last-message and IGNORES piped stdin, so
    # the resume context must ride the prompt argument.
    SESSIONS_DIR="${CODEX_HOME:-$HOME/.codex}/sessions"
    SESSION_FILE="$(grep -rl "$WT" "$SESSIONS_DIR" 2>/dev/null | sort | tail -1 || true)"
    [ -n "$SESSION_FILE" ] || die "no codex session references $WT"
    SESSION_ID="$(basename "$SESSION_FILE" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)"
    [ -n "$SESSION_ID" ] || die "could not extract session id from: $SESSION_FILE"
    LOG="$LOG_DIR/$TASK.$(date +%Y%m%d-%H%M%S).resume.log"
    echo "dispatch: resume $TASK session=$SESSION_ID log=$LOG"
    # codex exec resume runs in $PWD; it does NOT restore the session's --cd.
    # Resumed from the main checkout, codex operates on the WRONG TREE (it sees a
    # worktree-less repo and blocks). Pin cwd to the worktree.
    PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
    (cd "$WT" && codex exec resume "$SESSION_ID" "$PROMPT_CONTENT" < /dev/null) 2>&1 | tee "$LOG"
    ;;

  clean)
    TASK="${1:?task-id required}"
    WT="$WT_ROOT/$TASK"
    [ -d "$WT" ] || die "no worktree for $TASK at $WT"
    git -C "$REPO_ROOT" worktree remove "$WT" \
      || die "worktree dirty: commit or merge its work first (the controller commits), or remove it manually"
    echo "dispatch: removed $WT (branch $BRANCH_PREFIX/$TASK kept, delete it after merge)"
    ;;

  list)
    git -C "$REPO_ROOT" worktree list
    ;;

  *) usage ;;
esac
```

Then set the executable bit, because `.claude/settings.json` (Task 9) allows the bare
invocation `Bash(.claude/skills/dispatch/scripts/dispatch.sh:*)`:

```
chmod +x plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test dispatch.test.mjs`

Expected: PASS, 17 tests, 17 pass, 0 fail. Also confirm the mode was recorded:
`git ls-files -s plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh` prints
a line starting `100755`.

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/project/wave.env.hbs \
        plugins/wave/templates/project/skills/dispatch/scripts/dispatch.sh \
        plugins/wave/tests/dispatch.test.mjs && \
git commit -m "feat(wave): generalize the codex dispatch script and its wave.env knobs"
```

#### Refutation notes for the gate

The reference implementation of this task was built and run before the plan was written. Each
mutant below was applied to a working `dispatch.sh`, the suite was run, and the failing test
names were recorded. Everything in the "tests that fail" column is observed output, not a
prediction.

| # | Mutant (the wrong-Green it stands for) | Tests that fail |
|---|---|---|
| M1 | The script ignores `wave.env` and hardcodes the knobs (the OIL script copied over with its own worktree root). This is the headline wrong-Green: a scaffolded project would look fine on the author's machine and write worktrees into the wrong place everywhere else. | 9 of 17: worktree/branch, env copy, install command, codex flags, both resume tests, and three of the four refusals |
| M2 | `< /dev/null` dropped from the `new` invocation, so codex inherits the caller's stdin and stalls | `new terminates stdin so codex cannot stall waiting for input` |
| M3 | `resume` drops the `cd "$WT"` subshell and runs from the repo root, so codex edits the wrong tree | `resume finds the session by worktree path and runs inside the worktree` |
| M4 | `--sandbox workspace-write` widened to `--sandbox danger-full-access` | `new calls codex with the sandbox, model, effort and last-message flags` |
| M5 | `clean` uses `worktree remove --force` and deletes the branch, losing unmerged work | `clean removes the worktree and keeps the branch` |
| M6 | `resume` uses `--last` instead of the session id extracted from the sessions dir | `resume finds the session by worktree path and runs inside the worktree` |
| M7 | The prompt is piped on stdin (`< "$PROMPT_FILE"`) instead of riding the argument | `new calls codex with the sandbox...` and `new terminates stdin...` |
| M8 | `set -euo pipefail` weakened to `set -eu`, so `tee` masks a failing codex run | `a failing codex run is not masked by the tee pipeline` |
| M9 | `--output-last-message` dropped, so the run leaves no report to read | `new calls codex with the sandbox...` and `new writes a timestamped log and the last-message file` |
| M10 | The kebab-case check is dropped, so a task id with a slash or an underscore creates a branch that later greps and merges cannot address | refusal row 1, `new refuses a task id that is not kebab-case` |
| M11 | The `cp` of the env file is dropped while the guard that requires it stays, the hollow-Green shape where the suite skips its environment-gated half | `new copies the configured env file into the worktree` |

Per-assertion mapping for the four refusal rows (the `REFUSALS` table): each row asserts
exit 1, the exact stderr line, and an empty fake-codex log. The empty-log assertion is the
one that matters. Without it a script that refuses *after* launching codex would pass, which
is exactly the shape of the "it printed an error, so it must have stopped" wrong-Green.

Two assertions were vacuous in the first draft and were fixed before this plan was written.
The gate should check that both fixes are still present.

1. **The stdin assertion was self-satisfying.** `runScript` uses `spawnSync` without an
   `input` option, which hands the script an already closed stdin, so `stdinBytes` was 0
   whether or not the script wrote `< /dev/null`. Mutant M2 passed the whole suite. The fix
   is the `with-stdin.sh` wrapper in `setup`, which pipes 18 bytes into `dispatch.sh`. If a
   reviewer sees the tests call `runScript(DISPATCH, ...)` directly for a `new` run, the
   stdin trap is unpinned again.
2. **`pipefail` had no behavioral test.** The fake codex always exits 0, so nothing could
   distinguish `set -eu` from `set -euo pipefail`. The fix is the failing-codex test, which
   puts its own `codex` (exit 7) earlier on `PATH` and asserts the dispatch exits 7.

Two fixture properties keep further assertions honest, and a change to Task 1's helpers would
silently weaken them.

- The env-copy test is only meaningful because `makeTempRepo` writes `.env.local` after the
  initial commit and gitignores it. A committed env file would be materialized by
  `git worktree add` on its own and the assertion would hold with the `cp` deleted. Mutant
  M11 confirms it currently fails when the copy is removed.
- The resume assertions read `resumeId` from the same JSON record as `argv`, `cwd` and
  `stdinBytes`, because the fake codex writes one line per invocation. The resume line is the
  second record in the log (the `new` run wrote the first), which is why the test indexes from
  the end rather than using `log[0]`.

Residue the gate should accept as uncovered, or reject with a named replacement:

- `--base <ref>` is parsed but never asserted. A mutant that ignores `--base` and always
  branches from `HEAD` passes the suite. Covering it needs a second commit in the fixture
  repo; judged not worth a test because a wrong base fails loudly at the first review diff.
- The `list` subcommand is exercised only indirectly (the usage-defaults test does not reach
  it). A mutant that breaks `list` passes.
- `git` messages are localized: on the reference machine `git worktree add` prints Polish.
  No assertion reads git's own output, and none may be added.

- - -

### Task 5: generalized project hooks

**Files:**
- Create: `plugins/wave/templates/project/hooks/code-only-branch.sh`
- Create: `plugins/wave/templates/project/hooks/registry-guard.sh`
- Test: `plugins/wave/tests/hooks.test.mjs`

**Interfaces:**
- Consumes (Task 1, `plugins/wave/tests/helpers.mjs`): `PLUGIN_ROOT`,
  `makeTempRepo({ waveEnv, files })`, `runHook(absHook, toolInput, { cwd, env })`. The
  `run(cmd, args, opts)` returned by `makeTempRepo` is used to create a linked worktree.
  `makeTempRepo` writes no `.claude/wave.env` when the `waveEnv` object is empty.
- Consumes (Task 4): the `WAVE_BRANCH_PREFIX` and `WAVE_REGISTRY_DIR` names from
  `.claude/wave.env`.
- Produces: two `PreToolUse[Bash]` hooks that Task 9's `settings.json` fragment wires as
  `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/registry-guard.sh"` and
  `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/code-only-branch.sh"`.

Both hooks require `jq` on `PATH`; they read the Bash tool call as JSON on stdin and exit 2
to block. Both locate their configuration as
`${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/wave.env` and exit 0 when
that file is missing or `WAVE_REGISTRY_DIR` is empty, so a repository without wave tooling is
never blocked.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/hooks.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT, makeTempRepo, runHook } from './helpers.mjs'

const CODE_ONLY = join(PLUGIN_ROOT, 'templates/project/hooks/code-only-branch.sh')
const REGISTRY_GUARD = join(PLUGIN_ROOT, 'templates/project/hooks/registry-guard.sh')

const DEFAULT_WAVE_ENV = { BRANCH_PREFIX: 'codex', REGISTRY_DIR: 'docs/registry' }
const REPO_FILES = { 'docs/registry/registry.db': 'db\n', 'src/a.txt': 'a\n' }

function setup(t, { waveEnv = DEFAULT_WAVE_ENV } = {}) {
  const repo = makeTempRepo({ waveEnv, files: REPO_FILES })
  t.after(() => repo.cleanup())
  return {
    ...repo,
    hook: (script, command) =>
      runHook(script, { command }, { cwd: repo.root, env: { CLAUDE_PROJECT_DIR: repo.root } }),
    // A linked worktree on a <prefix>/* branch, the shape a Codex task runs in.
    worktree(task) {
      const wt = join(repo.root, '..', 'wt', task)
      repo.run('git', ['worktree', 'add', wt, '-b', `codex/${task}`, 'HEAD'])
      return wt
    },
    stage(dir, rel, content) {
      writeFileSync(join(dir, rel), content)
      repo.run('git', ['-C', dir, 'add', rel])
    },
  }
}

test('code-only-branch passes a plain commit on the main checkout', (t) => {
  const ctx = setup(t)
  ctx.stage(ctx.root, 'docs/registry/registry.db', 'flipped\n')
  const r = ctx.hook(CODE_ONLY, 'git commit -m "registry: flip statements"')
  assert.equal(r.status, 0, r.stderr)
})

test('code-only-branch blocks a registry commit from a linked worktree', (t) => {
  const ctx = setup(t)
  const wt = ctx.worktree('task-a')
  ctx.stage(wt, 'docs/registry/registry.db', 'flipped in the worktree\n')
  const r = ctx.hook(CODE_ONLY, `git -C ${wt} commit -m "wip"`)
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: task branches carry CODE ONLY/)
})

test('code-only-branch passes a commit from that worktree that leaves the registry alone', (t) => {
  const ctx = setup(t)
  const wt = ctx.worktree('task-a')
  ctx.stage(wt, 'src/a.txt', 'implemented\n')
  const r = ctx.hook(CODE_ONLY, `git -C ${wt} commit -m "feat: implement"`)
  assert.equal(r.status, 0, r.stderr)
})

test('code-only-branch blocks a registry commit on a prefix branch in the main checkout', (t) => {
  const ctx = setup(t)
  ctx.run('git', ['checkout', '-q', '-b', 'codex/task-b'])
  ctx.stage(ctx.root, 'docs/registry/registry.db', 'flipped\n')
  const r = ctx.hook(CODE_ONLY, 'git commit -m "wip"')
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: task branches carry CODE ONLY/)
})

test('registry-guard blocks raw destructive SQL against the registry', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `sqlite3 docs/registry/registry.db "UPDATE spec_statement SET status='x'"`,
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: raw destructive SQL against the registry/)
})

test('registry-guard passes the same write through registry-write.sh', (t) => {
  const ctx = setup(t)
  // The note quotes the raw statement it replaces, so the command carries both a registry
  // database and an UPDATE ... SET shape: only the script exemption can let it through.
  const r = ctx.hook(
    REGISTRY_GUARD,
    `.claude/skills/registry/scripts/registry-write.sh spec_statement --set "status='approved'" --where "id='SP-a-1'" --note "replaces UPDATE spec_statement SET status against docs/registry/registry.db"`,
  )
  assert.equal(r.status, 0, r.stderr)
})

test('registry-guard passes the projection tool rebuilding spec-exec.db', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `python3 docs/registry/tools/gen-spec-exec.py --registry-dir docs/registry && sqlite3 docs/registry/spec-exec.db "DROP TABLE IF EXISTS spec"`,
  )
  assert.equal(r.status, 0, r.stderr)
})

test('registry-guard passes prose that contains "hard delete"', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    'echo "ruling: we hard delete findings from docs/registry/registry.db only after a seal"',
  )
  assert.equal(r.status, 0, r.stderr)
})

// Both hooks must stay silent where there is no wave tooling to protect.
const SILENT = [
  {
    hook: CODE_ONLY,
    name: 'code-only-branch',
    command: (ctx) => `git -C ${ctx.worktree('task-a')} commit -m "wip"`,
    prepare: (ctx) => ctx.stage(ctx.root, 'docs/registry/registry.db', 'x\n'),
  },
  {
    hook: REGISTRY_GUARD,
    name: 'registry-guard',
    command: () => `sqlite3 docs/registry/registry.db "DELETE FROM spec_statement"`,
    prepare: () => {},
  },
]

for (const row of SILENT) {
  test(`${row.name} passes when .claude/wave.env is missing`, (t) => {
    const ctx = setup(t, { waveEnv: {} })
    row.prepare(ctx)
    const r = ctx.hook(row.hook, row.command(ctx))
    assert.equal(r.status, 0, r.stderr)
  })

  test(`${row.name} passes when WAVE_REGISTRY_DIR is empty`, (t) => {
    const ctx = setup(t, { waveEnv: { ...DEFAULT_WAVE_ENV, REGISTRY_DIR: '' } })
    row.prepare(ctx)
    const r = ctx.hook(row.hook, row.command(ctx))
    assert.equal(r.status, 0, r.stderr)
  })
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test hooks.test.mjs`

Expected: FAIL, 12 tests, 0 pass, 12 fail. Each reports
`AssertionError [ERR_ASSERTION]: bash: <repo>/plugins/wave/templates/project/hooks/code-only-branch.sh: No such file or directory` (or `registry-guard.sh`) with `127 !== 0`, and the two
blocking cases report `127 !== 2`. Observed on the reference implementation with both hooks
removed:

```
ℹ tests 12
ℹ pass 0
ℹ fail 12
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/hooks/code-only-branch.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse[Bash]: task branches carry CODE ONLY. Block commits that touch
# registry .db files from a linked worktree or a <prefix>/* branch. Registry
# flips happen in the main checkout after rebase-and-merge.
set -uo pipefail
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -n "$cmd" ] || exit 0
case "$cmd" in
  *"git commit"*|*"git -C"*commit*) ;;
  *) exit 0 ;;
esac

# A hook must never block a repository that has no wave tooling: no wave.env, no
# opinion. Same for a project configured without a registry.
WAVE_ENV="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.claude/wave.env"
[ -f "$WAVE_ENV" ] || exit 0
# shellcheck source=/dev/null
. "$WAVE_ENV"
REGISTRY_DIR="${WAVE_REGISTRY_DIR:-}"
[ -n "$REGISTRY_DIR" ] || exit 0
BRANCH_PREFIX="${WAVE_BRANCH_PREFIX:-codex}"

# Resolve the repo the commit targets: honor `git -C <path>` if present.
target="$(printf '%s' "$cmd" | sed -nE 's/.*git -C ([^ ]+) .*/\1/p')"
target="${target:-.}"

gitdir="$(git -C "$target" rev-parse --git-dir 2>/dev/null)" || exit 0
common="$(git -C "$target" rev-parse --git-common-dir 2>/dev/null)" || exit 0
branch="$(git -C "$target" rev-parse --abbrev-ref HEAD 2>/dev/null)" || exit 0

task_branch=0
[ "$gitdir" != "$common" ] && task_branch=1
case "$branch" in "$BRANCH_PREFIX"/*) task_branch=1 ;; esac
[ "$task_branch" = 1 ] || exit 0

staged="$(git -C "$target" diff --cached --name-only 2>/dev/null || true)"
if printf '%s\n%s' "$cmd" "$staged" | grep -qE "$REGISTRY_DIR/[^[:space:]]*\.db"; then
  echo "Blocked: task branches carry CODE ONLY. Registry .db flips happen in the main checkout after rebase-and-merge (see the wave dispatch section of CLAUDE.md)." >&2
  exit 2
fi
exit 0
```

Create `plugins/wave/templates/project/hooks/registry-guard.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse[Bash]: destructive SQL against the registry must go through
# registry-write.sh, which prints the full match list before executing.
set -uo pipefail
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -n "$cmd" ] || exit 0

# A hook must never block a repository that has no wave tooling, or one
# configured without a registry.
WAVE_ENV="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.claude/wave.env"
[ -f "$WAVE_ENV" ] || exit 0
# shellcheck source=/dev/null
. "$WAVE_ENV"
REGISTRY_DIR="${WAVE_REGISTRY_DIR:-}"
[ -n "$REGISTRY_DIR" ] || exit 0

case "$cmd" in
  *registry.db*|*spec-exec.db*) ;;
  *) exit 0 ;;
esac
case "$cmd" in
  *registry-write.sh*) exit 0 ;;
  *"$REGISTRY_DIR"/tools/*) exit 0 ;;
esac

# Match SQL statement shapes, not bare English words: ruling prose like
# "hard delete" must not trip this. Still blocks: UPDATE <t> SET ...,
# DELETE FROM ..., DROP TABLE/INDEX/VIEW/TRIGGER, ALTER TABLE.
if printf '%s' "$cmd" | grep -qiE 'update[[:space:]]+["[:alnum:]_]+[[:space:]]+set([^[:alpha:]]|$)|delete[[:space:]]+from([^[:alpha:]]|$)|drop[[:space:]]+(table|index|view|trigger)|alter[[:space:]]+table'; then
  echo "Blocked: raw destructive SQL against the registry. Use .claude/skills/registry/scripts/registry-write.sh, which prints the full match list before executing (see the registry skill)." >&2
  exit 2
fi
exit 0
```

Then set the executable bit on both, so a project that wires them without the `bash ` prefix
still works:

```
chmod +x plugins/wave/templates/project/hooks/code-only-branch.sh \
         plugins/wave/templates/project/hooks/registry-guard.sh
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test hooks.test.mjs`

Expected: PASS, 12 tests, 12 pass, 0 fail.

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/project/hooks/code-only-branch.sh \
        plugins/wave/templates/project/hooks/registry-guard.sh \
        plugins/wave/tests/hooks.test.mjs && \
git commit -m "feat(wave): generalize the code-only-branch and registry-guard hooks"
```

#### Notes for the reviewer

Mutants run against the reference implementation, with the observed failures:

| Mutant | Tests that fail |
|---|---|
| `code-only-branch.sh` hardcodes `docs/diagnostics` instead of reading `WAVE_REGISTRY_DIR` | both blocking tests |
| `code-only-branch.sh` drops the worktree/branch discrimination and blocks every commit | `code-only-branch passes a plain commit on the main checkout` |
| `registry-guard.sh` matches bare words (`update|delete|drop|alter`) instead of SQL shapes | `registry-guard passes prose that contains "hard delete"` |
| `registry-guard.sh` drops the `registry-write.sh` exemption | `registry-guard passes the same write through registry-write.sh` |
| `registry-guard.sh` drops the `<registry dir>/tools/` exemption | `registry-guard passes the projection tool rebuilding spec-exec.db` |

Both exemption tests were vacuous in the first draft: a command like
`registry-write.sh spec_statement --set "status='approved'"` never names a database, so it
left through the first `case` gate and the exemption was never reached. The commands in the
test now carry both a registry database name and a destructive SQL shape, which is the only
input where the exemption decides the outcome. If a reviewer sees those commands simplified,
the exemptions are unpinned.

The main-checkout case and the linked-worktree case are separate tests on purpose: the hook
blocks on `gitdir != common` OR a `<prefix>/*` branch name, and a single combined test would
pass a mutant that required both.

Two behaviors are deliberately not asserted: the hook's dependency on `jq` (a missing `jq`
makes `cmd` empty and the hook exits 0, which is the intended fail-open), and `REGISTRY_DIR`
values containing regular-expression metacharacters (the value is interpolated into a
`grep -E` pattern unescaped, as in the source hook).

### Task 6: registry schema and the spec-exec projection

**Files:**
- Create: `plugins/wave/templates/project/registry/schema.sql`
- Create: `plugins/wave/templates/project/registry/tools/gen-spec-exec.py`
- Test: `plugins/wave/tests/registry-tools.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1).
- Produces: `schema.sql`, the single-database table contract every other registry task
  writes against (`spec_statement`, `spec_ref`, `statement_history`, `finding`,
  `provenance`, `decision`, `finding_decision`, `status_history`, `ban_entry`, `meta`).
- Produces: `gen-spec-exec.py`, CLI `python3 gen-spec-exec.py [--registry-dir DIR]`,
  reads `<DIR>/registry.db`, writes `<DIR>/spec-exec.db` with tables
  `spec(id, area, text, code_locus, stage)` and
  `meta(generated, source, statement_count, contract)`, prints
  `spec-exec.db regenerated: N statements`. Task 7's `registry-write.sh` shells out to it
  after every `spec_statement` write; Task 9 and Task 12 copy both files into a project
  under `<WAVE_REGISTRY_DIR>`.

Environment facts for this task: `python3` and the `sqlite3` CLI are on PATH (verified
`Python 3.13.0`, `sqlite3 3.51.0`); the tool uses the Python standard library only, no
third-party packages, no network. `--registry-dir` defaults to the parent of the tools
directory, so a project copy at `docs/registry/tools/gen-spec-exec.py` works with no
arguments.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/registry-tools.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')
const GEN_SPEC = join(REGISTRY_TPL, 'tools', 'gen-spec-exec.py')

function sqlite(db, sql) {
  return spawnSync('sqlite3', [db], { input: sql, encoding: 'utf8' })
}

function query(db, sql) {
  const r = sqlite(db, sql)
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function makeRegistry(seed) {
  const dir = mkdtempSync(join(tmpdir(), 'wave-registry-'))
  const db = join(dir, 'registry.db')
  const init = sqlite(db, readFileSync(SCHEMA, 'utf8'))
  assert.equal(init.status, 0, init.stderr)
  if (seed) {
    const r = sqlite(db, seed)
    assert.equal(r.status, 0, r.stderr)
  }
  return { dir, db, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

const PROJECTION_SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Approved statement text.','parity-confirmed','approved','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Proposed statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-03','beta','Rejected statement text.','ruling','rejected',NULL,NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-01','code','lib/alpha.ts#run');
INSERT INTO spec_ref VALUES ('SP-alpha-01','finding','F-alpha-07');
`

test('projection carries approved statements only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    const r = spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 1 statements/)
    const proj = join(reg.dir, 'spec-exec.db')
    assert.equal(query(proj, 'SELECT count(*) FROM spec;'), '1')
    assert.equal(query(proj, 'SELECT id FROM spec;'), 'SP-alpha-01')
    assert.equal(query(proj, 'SELECT statement_count FROM meta;'), '1')
  } finally {
    reg.cleanup()
  }
})

test('projection code_locus holds the code refs only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const locus = query(join(reg.dir, 'spec-exec.db'), 'SELECT code_locus FROM spec;')
    assert.equal(locus, 'lib/alpha.ts#run')
    assert.doesNotMatch(locus, /F-alpha-07/)
  } finally {
    reg.cleanup()
  }
})

test('projection carries no ban_entry table', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const tables = query(
      join(reg.dir, 'spec-exec.db'),
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    assert.equal(tables, 'meta\nspec')
    assert.equal(
      query(reg.db, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='ban_entry';"),
      '1'
    )
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a basis outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO spec_statement VALUES ('SP-alpha-09','alpha','x','invented','proposed',NULL,NULL);"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /CHECK constraint failed/)
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a finding status outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO finding VALUES ('F-01','defect','t','c','major','bogus','d','i','lib/x.ts');"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /illegal finding\.status value/)
  } finally {
    reg.cleanup()
  }
})
```

Task 8 later replaces this file with a version that keeps every test above unchanged and
adds its own block, so keep the helpers exactly as written.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/registry-tools.test.mjs`

Expected: FAIL, 5 tests, 5 failing, each with

```
Error: ENOENT: no such file or directory, open '<repo>/plugins/wave/templates/project/registry/schema.sql'
    at readFileSync (node:fs:539:20)
    at makeRegistry (file:///<repo>/plugins/wave/tests/registry-tools.test.mjs:26:27)
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/registry/schema.sql`:

```sql
-- Wave statement and finding registry. One database: <WAVE_REGISTRY_DIR>/registry.db.
-- spec_statement rows are the specification; execution agents never read this file,
-- they read the spec-exec.db projection written by tools/gen-spec-exec.py.
-- Writes go through .claude/skills/registry/scripts/registry-write.sh.

CREATE TABLE IF NOT EXISTS spec_statement (
  id TEXT PRIMARY KEY,     -- SP-<area-slug>-<nn>
  area TEXT,               -- one area per statement, pinned when the registry opens
  text TEXT,               -- one atomic, testable, plain-English end-state behavior
  basis TEXT CHECK(basis IN ('parity-confirmed','ruling','mockup') OR basis LIKE 'fix-target:%'),
  status TEXT CHECK(status IN ('proposed','flagged','approved','amended','rejected')),
  stage TEXT,              -- W<n> | parity | none | NULL
  parity_ref TEXT
  -- No rationale column by design: the why lives in finding and decision rows,
  -- joined through spec_ref.
);

CREATE TABLE IF NOT EXISTS spec_ref (
  statement_id TEXT REFERENCES spec_statement(id),
  ref_type TEXT CHECK(ref_type IN ('finding','decision','code','mockup')),
  ref TEXT                 -- finding or decision id, code locus, or mockup ref
);

CREATE TABLE IF NOT EXISTS statement_history (
  statement_id TEXT REFERENCES spec_statement(id),
  date TEXT,
  status TEXT,             -- the status the statement carries after the change
  note TEXT,               -- append-only, one line per change
  old_text TEXT            -- the text the statement carried before the change
);

CREATE TABLE IF NOT EXISTS finding (
  id TEXT PRIMARY KEY,
  kind TEXT,
  title TEXT,
  class TEXT,
  severity TEXT,           -- blocker | major | minor | info
  status TEXT,             -- guarded by the two triggers below
  description TEXT,
  impact TEXT,
  code_locus TEXT
);

CREATE TRIGGER IF NOT EXISTS finding_status_guard_ins BEFORE INSERT ON finding
WHEN NEW.status IS NOT NULL AND NEW.status NOT IN
  ('confirmed','partial','refuted','static-unverified','fixed','wont-fix','superseded')
BEGIN SELECT RAISE(ABORT, 'illegal finding.status value'); END;

CREATE TRIGGER IF NOT EXISTS finding_status_guard_upd BEFORE UPDATE OF status ON finding
WHEN NEW.status IS NOT NULL AND NEW.status NOT IN
  ('confirmed','partial','refuted','static-unverified','fixed','wont-fix','superseded')
BEGIN SELECT RAISE(ABORT, 'illegal finding.status value'); END;

CREATE TABLE IF NOT EXISTS provenance (
  finding_id TEXT REFERENCES finding(id),
  source TEXT,             -- suite | screenshot | spec | db-query | owner | synthesis | ruling
  ref TEXT,
  evidence TEXT
);

CREATE TABLE IF NOT EXISTS decision (
  id TEXT PRIMARY KEY,
  date TEXT,
  decided_by TEXT,
  ruling TEXT,
  consequences TEXT
);

CREATE TABLE IF NOT EXISTS finding_decision (
  finding_id TEXT REFERENCES finding(id),
  decision_id TEXT REFERENCES decision(id)
);

CREATE TABLE IF NOT EXISTS status_history (
  finding_id TEXT REFERENCES finding(id),
  date TEXT,
  status TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS ban_entry (
  id TEXT PRIMARY KEY,        -- BAN-NN
  banned_string TEXT NOT NULL,-- the literal or named pattern that must not appear
  scope TEXT,                 -- where the ban binds
  match_hint TEXT,            -- how a grep gate should search for it
  rationale_ref TEXT,         -- decision, statement or finding ids that ruled the ban
  code_loci TEXT,             -- file:line list where the string is live today
  live INTEGER,               -- 0 or 1
  created TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Every statement is `IF NOT EXISTS`, so `/wave:init` can re-run the schema against an
existing registry without touching data.

Create `plugins/wave/templates/project/registry/tools/gen-spec-exec.py`:

```python
#!/usr/bin/env python3
"""Regenerate spec-exec.db from registry.db.

Usage: python3 gen-spec-exec.py [--registry-dir DIR]

spec-exec.db is a derived view and is never edited by hand: it carries the
approved statements only, without basis, rationale, findings or ban entries.
Registry contract clause 3: execution agents read spec-exec.db only.
"""

import argparse
import datetime
import pathlib
import sqlite3


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    args = ap.parse_args()

    root = (
        pathlib.Path(args.registry_dir).resolve()
        if args.registry_dir
        else pathlib.Path(__file__).resolve().parents[1]
    )
    src_path = root / "registry.db"
    if not src_path.exists():
        raise SystemExit(f"gen-spec-exec: no registry database at {src_path}")

    src = sqlite3.connect(src_path)
    src.execute("PRAGMA busy_timeout=30000")
    rows = src.execute(
        """
        SELECT s.id, s.area, s.text,
               COALESCE((SELECT group_concat(r.ref, '; ') FROM spec_ref r
                         WHERE r.statement_id = s.id AND r.ref_type = 'code'), ''),
               s.stage
        FROM spec_statement s WHERE s.status = 'approved' ORDER BY s.id
        """
    ).fetchall()
    src.close()

    out = root / "spec-exec.db"
    if out.exists():
        out.unlink()
    dst = sqlite3.connect(out)
    dst.execute(
        "CREATE TABLE spec (id TEXT PRIMARY KEY, area TEXT, text TEXT, "
        "code_locus TEXT, stage TEXT)"
    )
    dst.execute(
        "CREATE TABLE meta (generated TEXT, source TEXT, statement_count INTEGER, "
        "contract TEXT)"
    )
    dst.executemany("INSERT INTO spec VALUES (?,?,?,?,?)", rows)
    dst.execute(
        "INSERT INTO meta VALUES (?,?,?,?)",
        (
            datetime.date.today().isoformat(),
            "registry.db (spec_statement, status=approved)",
            len(rows),
            "registry README clause 3: execution agents read this file only",
        ),
    )
    dst.commit()
    dst.close()

    print(f"spec-exec.db regenerated: {len(rows)} statements")


if __name__ == "__main__":
    main()
```

Then make the tool executable: `chmod +x plugins/wave/templates/project/registry/tools/gen-spec-exec.py`

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/registry-tools.test.mjs`

Expected: PASS

```
✔ projection carries approved statements only
✔ projection code_locus holds the code refs only
✔ projection carries no ban_entry table
✔ schema refuses a basis outside the allowed set
✔ schema refuses a finding status outside the allowed set
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
```

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/project/registry/schema.sql \
        plugins/wave/templates/project/registry/tools/gen-spec-exec.py \
        plugins/wave/tests/registry-tools.test.mjs && \
git commit -m "feat(wave): add the registry schema and the spec-exec projection tool"
```

---

### Task 7: guarded registry write script — RED GATE

**Files:**
- Create: `plugins/wave/templates/project/skills/registry/scripts/registry-write.sh`
- Test: `plugins/wave/tests/registry-write.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT`, `makeTempRepo`, `runScript` from `plugins/wave/tests/helpers.mjs`
  (Task 1); `schema.sql` and `tools/gen-spec-exec.py` from Task 6.
- Consumes: `.claude/wave.env` at the repo root, key `WAVE_REGISTRY_DIR` (Task 4 renders it).
- Produces: the CLI
  `registry-write.sh <table> --set "<sql>" --where "<sql>" [--note "<text>"]` and
  `registry-write.sh <table> --delete --where "<sql>"`, the only sanctioned write path
  into `<WAVE_REGISTRY_DIR>/registry.db`. Task 5's `registry-guard.sh` exempts this script;
  Task 9's `settings.json` fragment allows it in bare and `bash `-prefixed forms; Task 12's
  init skill copies it to `.claude/skills/registry/scripts/registry-write.sh`.

Contract this task must satisfy, all of it pinned by the test:

1. Single database, `<WAVE_REGISTRY_DIR>/registry.db`, path resolved against the repo root
   (`git rev-parse --show-toplevel`) unless `WAVE_REGISTRY_DIR` is absolute.
2. `--note` is required for a `spec_statement` or `finding` update. It is the text of the
   history row, so an update without one is refused before anything is read.
3. The history row is written in the SAME transaction as the update:
   `statement_history(statement_id, date, status, note, old_text)` where `old_text` is the
   text before the update and `status` is the status after it, or
   `status_history(finding_id, date, status, note)` for a finding. `date` is `date +%F`.
4. The projection is regenerated after every `spec_statement` write by shelling out to
   `python3 "<REGISTRY_DIR>/tools/gen-spec-exec.py" --registry-dir "<REGISTRY_DIR>"`.
5. The full match list is printed before the write. Zero matched rows abort with exit 1.
6. No write without `--where`.

Environment facts: `sqlite3` and `python3` on PATH, `bash` runs the script, no network.
The tests build a real git repository per case with `makeTempRepo`, so
`git rev-parse --show-toplevel` resolves. `--set` and `--where` are raw SQL by contract:
the guard against a bad clause is the printed match list plus the zero-row abort, not
escaping. The script escapes only the two values it interpolates itself, the note and the
date.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/registry-write.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT, makeTempRepo, runScript } from './helpers.mjs'

const SCRIPT = join(
  PLUGIN_ROOT,
  'templates', 'project', 'skills', 'registry', 'scripts', 'registry-write.sh'
)
const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')

const SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Original statement text.','ruling','proposed','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Second statement text.','ruling','approved','W1',NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-01','code','lib/alpha.ts#run');
INSERT INTO finding VALUES ('F-01','defect','Broken guard','logic','major','confirmed','d','i','lib/alpha.ts');
`

function makeRegistryRepo() {
  const repo = makeTempRepo({ waveEnv: { REGISTRY_DIR: 'docs/registry' } })
  const dir = join(repo.root, 'docs', 'registry')
  mkdirSync(dir, { recursive: true })
  cpSync(join(REGISTRY_TPL, 'tools'), join(dir, 'tools'), { recursive: true })
  const db = join(dir, 'registry.db')
  const init = spawnSync('sqlite3', [db], { input: readFileSync(SCHEMA, 'utf8'), encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const seed = spawnSync('sqlite3', [db], { input: SEED, encoding: 'utf8' })
  assert.equal(seed.status, 0, seed.stderr)
  return { ...repo, dir, db }
}

function query(db, sql) {
  const r = spawnSync('sqlite3', [db], { input: sql, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function write(repo, args) {
  return runScript(SCRIPT, args, { cwd: repo.root })
}

test('prints the full match list before writing', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /== matched rows \(spec_statement WHERE id='SP-alpha-01'\) ==/)
    assert.match(r.stdout, /SP-alpha-01\|alpha\|Original statement text\./)
    assert.match(r.stdout, /== 1 row\(s\) matched ==/)
    assert.match(r.stdout, /== done: update spec_statement, 1 row\(s\) ==/)
  } finally {
    repo.cleanup()
  }
})

test('aborts when the where clause matches no rows', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-ghost-99'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 1)
    assert.match(r.stdout, /== 0 row\(s\) matched ==/)
    assert.match(r.stderr, /no rows matched/)
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    repo.cleanup()
  }
})

test('refuses a write without --where', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, ['spec_statement', '--set', "status='approved'", '--note', 'blanket'])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /--where is required/)
    assert.equal(
      query(repo.db, "SELECT count(*) FROM spec_statement WHERE status='approved';"),
      '1'
    )
  } finally {
    repo.cleanup()
  }
})

test('refuses a spec_statement write without --note', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
    ])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /--note is required/)
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    repo.cleanup()
  }
})

test('a statement update writes one history row carrying the old text', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "text='Amended statement text.', status='amended'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: reworded',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '1')
    assert.equal(
      query(
        repo.db,
        'SELECT statement_id, status, note, old_text FROM statement_history;'
      ),
      'SP-alpha-01|amended|review: reworded|Original statement text.'
    )
    assert.equal(
      query(repo.db, "SELECT text FROM spec_statement WHERE id='SP-alpha-01';"),
      'Amended statement text.'
    )
    assert.match(query(repo.db, 'SELECT date FROM statement_history;'), /^\d{4}-\d{2}-\d{2}$/)
  } finally {
    repo.cleanup()
  }
})

test('a note carrying an apostrophe is stored verbatim', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', "review: owner's call, don't reopen",
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(
      query(repo.db, 'SELECT note FROM statement_history;'),
      "review: owner's call, don't reopen"
    )
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'approved'
    )
  } finally {
    repo.cleanup()
  }
})

test('a failing update writes no history row', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='bogus'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: illegal status',
    ])
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /CHECK constraint failed/)
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
  } finally {
    repo.cleanup()
  }
})

test('a finding update writes a status_history row', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'finding',
      '--set', "status='fixed'",
      '--where', "id='F-01'",
      '--note', 'fixed in task 3',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(
      query(repo.db, 'SELECT finding_id, status, note FROM status_history;'),
      'F-01|fixed|fixed in task 3'
    )
    assert.equal(query(repo.db, "SELECT status FROM finding WHERE id='F-01';"), 'fixed')
  } finally {
    repo.cleanup()
  }
})

test('--delete removes the matched rows and reports the count', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, ['spec_statement', '--delete', '--where', "id='SP-alpha-02'"])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /== 1 row\(s\) matched ==/)
    assert.match(r.stdout, /== done: delete spec_statement, 1 row\(s\) ==/)
    assert.equal(
      query(repo.db, "SELECT count(*) FROM spec_statement WHERE id='SP-alpha-02';"),
      '0'
    )
  } finally {
    repo.cleanup()
  }
})

test('a spec_statement write regenerates the projection', () => {
  const repo = makeRegistryRepo()
  try {
    const proj = join(repo.dir, 'spec-exec.db')
    assert.equal(existsSync(proj), false)
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 2 statements/)
    assert.equal(existsSync(proj), true)
    assert.equal(
      query(proj, 'SELECT id, code_locus FROM spec ORDER BY id;'),
      ['SP-alpha-01|lib/alpha.ts#run', 'SP-alpha-02|'].join('\n')
    )
  } finally {
    repo.cleanup()
  }
})

test('refuses to run in a project with no registry configured', () => {
  const repo = makeTempRepo({ waveEnv: { REGISTRY_DIR: '' } })
  try {
    const r = runScript(
      SCRIPT,
      ['spec_statement', '--set', "status='approved'", '--where', "id='x'", '--note', 'n'],
      { cwd: repo.root }
    )
    assert.equal(r.status, 1)
    assert.match(r.stderr, /WAVE_REGISTRY_DIR is empty/)
  } finally {
    repo.cleanup()
  }
})
```

#### Refutation notes for the gate

Each assertion below exists because a plausible implementation passes everything else and
still ships the wrong behavior. The four mutants were built and run against the finished
script; each is caught by exactly one test and by no other, so none of the four is
covered incidentally.

| Wrong-Green | Mutant | Assertion that kills it |
|---|---|---|
| History written outside the update transaction. The natural reading of "history first, then status" is an INSERT followed by an UPDATE, in two `sqlite3` calls, with the new status scraped out of `--set`. It passes the happy path, and a rejected UPDATE then leaves an orphan history row claiming a change that never happened. | Replace the single `BEGIN IMMEDIATE ... COMMIT` block with an INSERT call plus an UPDATE call, status taken from `sed -n "s/.*status='\([^']*\)'.*/\1/p"`. | `a failing update writes no history row`. Under the mutant: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: '1' !== '0'`, 10 pass, 1 fail. |
| `--note` treated as optional, so a flip lands with an empty or missing history note and the audit trail loses the why. | Delete the `spec_statement\|finding)` branch of the mode check. | `refuses a spec_statement write without --note`, 10 pass, 1 fail. |
| Projection not regenerated, so `spec-exec.db` silently drifts from `registry.db` and execution agents read a stale spec. | Delete the `if [ "$TABLE" = "spec_statement" ]` block. | `a spec_statement write regenerates the projection`, 10 pass, 1 fail. |
| The note escaped with a backslash rather than a doubled quote. Every ASCII note passes, and the first note with an apostrophe in it, which is most prose, dies inside the transaction. | `sq() { printf '%s' "${1//\'/\'\'}"; }`, the shape the OIL original never needed because it interpolated no user text. | `a note carrying an apostrophe is stored verbatim`. Under the mutant: `AssertionError [ERR_ASSERTION]: Error: in prepare, unrecognized token: "\"`, 10 pass, 1 fail. |

Two further wrong-Greens the suite pins without a mutant: an implementation that prints
only a count instead of the rows fails `prints the full match list before writing`, which
matches the seeded row text in stdout; an implementation that treats a zero-row `--where`
as a no-op success fails `aborts when the where clause matches no rows`, which requires
exit 1 and an unchanged row.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/registry-write.test.mjs`

Expected: FAIL, 11 tests, 11 failing, the first with

```
AssertionError [ERR_ASSERTION]: bash: <repo>/plugins/wave/templates/project/skills/registry/scripts/registry-write.sh: No such file or directory


127 !== 0
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/skills/registry/scripts/registry-write.sh`:

```bash
#!/usr/bin/env bash
# Guarded write path for the wave registry. Prints the FULL match list before it
# writes: a registry write is never blind. Raw UPDATE and DELETE against
# registry.db are blocked by the registry-guard PreToolUse hook, which exempts
# this script.
#
#   registry-write.sh <table> --set "<sql>" --where "<sql>" [--note "<text>"]
#   registry-write.sh <table> --delete --where "<sql>"
#
# spec_statement and finding updates require --note. The history row
# (statement_history with old_text, or status_history) is written in the SAME
# transaction as the update, so "history first, then status" cannot be skipped
# and a failing update leaves no history behind. After any spec_statement write
# the spec-exec.db projection is regenerated.
set -euo pipefail

die() { echo "registry-write: $*" >&2; exit 1; }

usage="usage: registry-write.sh <table> --set <sql> --where <sql> [--note <text>]
       registry-write.sh <table> --delete --where <sql>"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
WAVE_ENV="$REPO_ROOT/.claude/wave.env"
[ -f "$WAVE_ENV" ] || die "missing $WAVE_ENV, run /wave:init"
# shellcheck source=/dev/null
. "$WAVE_ENV"
[ -n "${WAVE_REGISTRY_DIR:-}" ] || die "WAVE_REGISTRY_DIR is empty: this project has no registry"

case "$WAVE_REGISTRY_DIR" in
  /*) REG_DIR="$WAVE_REGISTRY_DIR" ;;
  *)  REG_DIR="$REPO_ROOT/$WAVE_REGISTRY_DIR" ;;
esac
DB_PATH="$REG_DIR/registry.db"
[ -f "$DB_PATH" ] || die "no registry database at $DB_PATH"

TABLE="${1:-}"
[ -n "$TABLE" ] || die "$usage"
case "$TABLE" in
  --*) die "$usage" ;;
  *[!a-z_]*) die "table must be a bare lowercase name, got: $TABLE" ;;
esac
shift

MODE="update"; SET=""; WHERE=""; NOTE=""; HAVE_NOTE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --set)    [ $# -ge 2 ] || die "--set needs a value";   SET="$2";   shift 2 ;;
    --where)  [ $# -ge 2 ] || die "--where needs a value"; WHERE="$2"; shift 2 ;;
    --note)   [ $# -ge 2 ] || die "--note needs a value";  NOTE="$2"; HAVE_NOTE=1; shift 2 ;;
    --delete) MODE="delete"; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -n "$WHERE" ] || die "--where is required (no blanket writes)"
if [ "$MODE" = "update" ]; then
  [ -n "$SET" ] || die "--set is required for an update"
  case "$TABLE" in
    spec_statement|finding)
      { [ "$HAVE_NOTE" -eq 1 ] && [ -n "$NOTE" ]; } \
        || die "--note is required for a $TABLE write: it becomes the history row"
      ;;
  esac
fi

# SQL escaping for the two values this script interpolates itself: a single
# quote is doubled, never backslashed, because sqlite has no backslash escape.
# --set and --where are raw SQL by contract: the guard is the printed match list.
sq() { printf '%s' "${1//\'/''}"; }
DATE="$(date +%F)"
NOTE_SQL="$(sq "$NOTE")"
DATE_SQL="$(sq "$DATE")"

echo "== matched rows ($TABLE WHERE $WHERE) =="
sqlite3 -header "$DB_PATH" "SELECT * FROM $TABLE WHERE $WHERE;"
COUNT="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $TABLE WHERE $WHERE;")"
echo "== $COUNT row(s) matched =="
[ "$COUNT" -gt 0 ] || die "no rows matched, aborting"

if [ "$MODE" = "delete" ]; then
  sqlite3 -bail "$DB_PATH" "BEGIN IMMEDIATE; DELETE FROM $TABLE WHERE $WHERE; COMMIT;"
else
  case "$TABLE" in
    spec_statement)
      sqlite3 -bail "$DB_PATH" "
BEGIN IMMEDIATE;
CREATE TEMP TABLE _pre AS SELECT id AS sid, text AS old_text FROM spec_statement WHERE $WHERE;
UPDATE spec_statement SET $SET WHERE $WHERE;
INSERT INTO statement_history (statement_id, date, status, note, old_text)
  SELECT p.sid, '$DATE_SQL', s.status, '$NOTE_SQL', p.old_text
  FROM _pre p JOIN spec_statement s ON s.id = p.sid;
COMMIT;"
      ;;
    finding)
      sqlite3 -bail "$DB_PATH" "
BEGIN IMMEDIATE;
CREATE TEMP TABLE _pre AS SELECT id AS fid FROM finding WHERE $WHERE;
UPDATE finding SET $SET WHERE $WHERE;
INSERT INTO status_history (finding_id, date, status, note)
  SELECT p.fid, '$DATE_SQL', f.status, '$NOTE_SQL'
  FROM _pre p JOIN finding f ON f.id = p.fid;
COMMIT;"
      ;;
    *)
      sqlite3 -bail "$DB_PATH" "BEGIN IMMEDIATE; UPDATE $TABLE SET $SET WHERE $WHERE; COMMIT;"
      ;;
  esac
fi

if [ "$TABLE" = "spec_statement" ]; then
  python3 "$REG_DIR/tools/gen-spec-exec.py" --registry-dir "$REG_DIR"
fi

echo "== done: $MODE $TABLE, $COUNT row(s) =="
```

Then make it executable:
`chmod +x plugins/wave/templates/project/skills/registry/scripts/registry-write.sh`

Why it is shaped this way, for the reviewer:

- The temp table snapshots the matched ids and their text BEFORE the update, so the history
  row can carry `old_text` while still reading the post-update `status` off the joined row.
  The order inside the transaction is snapshot, update, insert history, so an update that
  the CHECK rejects aborts before the insert, and `-bail` plus the missing COMMIT roll the
  whole thing back.
- `sqlite3 -bail` stops at the first failing statement and exits non-zero, which `set -e`
  turns into an exit 1 for the script.
- The table name is validated as a bare lowercase identifier because it is interpolated
  into every statement; `--set` and `--where` stay raw SQL by contract.
- `sq()` doubles a single quote. Sqlite has no backslash escape, so `\'` inside a string
  literal is a syntax error and a note reading `owner's call` would abort the write.
- Tables other than `spec_statement` and `finding` take a plain transactional UPDATE with
  no history row and no `--note` requirement, which is what `spec_ref`, `provenance` and
  `ban_entry` edits need.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/registry-write.test.mjs`

Expected: PASS

```
✔ prints the full match list before writing
✔ aborts when the where clause matches no rows
✔ refuses a write without --where
✔ refuses a spec_statement write without --note
✔ a statement update writes one history row carrying the old text
✔ a note carrying an apostrophe is stored verbatim
✔ a failing update writes no history row
✔ a finding update writes a status_history row
✔ --delete removes the matched rows and reports the count
✔ a spec_statement write regenerates the projection
✔ refuses to run in a project with no registry configured
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
```

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/project/skills/registry/scripts/registry-write.sh \
        plugins/wave/tests/registry-write.test.mjs && \
git commit -m "feat(wave): add the guarded registry write script"
```

---

### Task 8: review panel and ingest tool — RED GATE

**Files:**
- Create: `plugins/wave/templates/project/registry/tools/gen-review-panel.py`
- Create: `plugins/wave/templates/project/registry/tools/ingest-review.py`
- Modify: `plugins/wave/tests/registry-tools.test.mjs` (append the Task 8 block after the
  final line of the Task 6 block, the closing `})` of the test
  `schema refuses a finding status outside the allowed set`; the complete file is in
  Step 1)
- Test: `plugins/wave/tests/registry-tools.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1); `schema.sql` from
  Task 6; the Task 6 half of `registry-tools.test.mjs`, which stays unchanged.
- Produces: `gen-review-panel.py`, CLI
  `python3 gen-review-panel.py [--registry-dir DIR] [--pending-only] [--out FILE]`,
  default out `<DIR>/review/index.html`.
- Produces: `ingest-review.py`, CLI
  `python3 ingest-review.py <export.json> [--registry-dir DIR] [--date YYYY-MM-DD]`,
  prints `keep: N  change: N  remove: N`.
- Produces the export contract the two share:
  `{"generated":"<ISO date>","verdicts":{"<id>":{"verdict":"keep|change|remove","text":"<new text when change>","note":"<optional>"}}}`.
  `text` is present only for `change`, `note` only when the reviewer wrote one.

What the panel is: one local HTML file, opened from disk, no network at any point. The data
is embedded in the page, progress lives in `localStorage` keyed by statement id, and the
export button both downloads a file (an `<a download>` with a Blob URL) and copies the same
JSON to the clipboard. It is never published as an artifact, because artifact viewers block
the download. Pending means status `proposed` or `flagged`. Areas come from
`SELECT DISTINCT area` over the same row set the page shows, so nothing about the project
is hardcoded. Everything OIL-specific in the original panel is gone: the fixed area order,
the top and group intros, the decision groups, the screenshot index, the change lens, the
bulk-approve button and the fourth "skip" verdict. The result is 282 lines.

Environment facts: `python3` and `sqlite3` on PATH, standard library only, no network, no
third-party packages, no build step.

- [ ] **Step 1: Write the failing test**

Replace `plugins/wave/tests/registry-tools.test.mjs` with the complete file below. Its
first half is the Task 6 block, unchanged; the new material starts at the
`// --- Task 8: review panel and ingest` comment.

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')
const GEN_SPEC = join(REGISTRY_TPL, 'tools', 'gen-spec-exec.py')
const GEN_PANEL = join(REGISTRY_TPL, 'tools', 'gen-review-panel.py')
const INGEST = join(REGISTRY_TPL, 'tools', 'ingest-review.py')

function sqlite(db, sql) {
  return spawnSync('sqlite3', [db], { input: sql, encoding: 'utf8' })
}

function query(db, sql) {
  const r = sqlite(db, sql)
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function makeRegistry(seed) {
  const dir = mkdtempSync(join(tmpdir(), 'wave-registry-'))
  const db = join(dir, 'registry.db')
  const init = sqlite(db, readFileSync(SCHEMA, 'utf8'))
  assert.equal(init.status, 0, init.stderr)
  if (seed) {
    const r = sqlite(db, seed)
    assert.equal(r.status, 0, r.stderr)
  }
  return { dir, db, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

const PROJECTION_SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Approved statement text.','parity-confirmed','approved','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Proposed statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-03','beta','Rejected statement text.','ruling','rejected',NULL,NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-01','code','lib/alpha.ts#run');
INSERT INTO spec_ref VALUES ('SP-alpha-01','finding','F-alpha-07');
`

test('projection carries approved statements only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    const r = spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 1 statements/)
    const proj = join(reg.dir, 'spec-exec.db')
    assert.equal(query(proj, 'SELECT count(*) FROM spec;'), '1')
    assert.equal(query(proj, 'SELECT id FROM spec;'), 'SP-alpha-01')
    assert.equal(query(proj, 'SELECT statement_count FROM meta;'), '1')
  } finally {
    reg.cleanup()
  }
})

test('projection code_locus holds the code refs only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const locus = query(join(reg.dir, 'spec-exec.db'), 'SELECT code_locus FROM spec;')
    assert.equal(locus, 'lib/alpha.ts#run')
    assert.doesNotMatch(locus, /F-alpha-07/)
  } finally {
    reg.cleanup()
  }
})

test('projection carries no ban_entry table', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const tables = query(
      join(reg.dir, 'spec-exec.db'),
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    assert.equal(tables, 'meta\nspec')
    assert.equal(
      query(reg.db, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='ban_entry';"),
      '1'
    )
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a basis outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO spec_statement VALUES ('SP-alpha-09','alpha','x','invented','proposed',NULL,NULL);"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /CHECK constraint failed/)
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a finding status outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO finding VALUES ('F-01','defect','t','c','major','bogus','d','i','lib/x.ts');"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /illegal finding\.status value/)
  } finally {
    reg.cleanup()
  }
})

// --- Task 8: review panel and ingest ------------------------------------

const PANEL_SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Approved statement text.','parity-confirmed','approved','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Proposed statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-03','beta','Rejected statement text.','ruling','rejected',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-04','beta','Flagged statement text.','ruling','flagged',NULL,NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-02','code','lib/alpha.ts#run');
`

function panel(dir, args) {
  const out = join(dir, 'panel.html')
  const r = spawnSync('python3', [GEN_PANEL, '--registry-dir', dir, '--out', out, ...args], {
    encoding: 'utf8',
  })
  assert.equal(r.status, 0, r.stderr)
  return readFileSync(out, 'utf8')
}

test('panel with --pending-only carries the pending statements and no others', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const html = panel(reg.dir, ['--pending-only'])
    assert.match(html, /SP-alpha-02/)
    assert.match(html, /SP-beta-04/)
    assert.doesNotMatch(html, /SP-alpha-01/)
    assert.doesNotMatch(html, /SP-beta-03/)
  } finally {
    reg.cleanup()
  }
})

test('panel without the flag carries every statement', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const html = panel(reg.dir, [])
    for (const id of ['SP-alpha-01', 'SP-alpha-02', 'SP-beta-03', 'SP-beta-04']) {
      assert.match(html, new RegExp(id))
    }
    assert.match(html, /<a[^>]*download|\.download\s*=/)
    assert.match(html, /localStorage/)
    assert.match(html, /navigator\.clipboard/)
  } finally {
    reg.cleanup()
  }
})

const EXPORT = {
  generated: '2026-09-02',
  verdicts: {
    'SP-alpha-02': { verdict: 'keep' },
    'SP-beta-04': {
      verdict: 'change',
      text: 'Replacement statement text.',
      note: 'owner reworded at review',
    },
    'SP-beta-03': { verdict: 'remove' },
  },
}

test('an export round-trips through ingest-review.py', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(file, JSON.stringify(EXPORT, null, 2))
    const r = spawnSync(
      'python3',
      [INGEST, file, '--registry-dir', reg.dir, '--date', '2026-09-02'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /keep: 1 {2}change: 1 {2}remove: 1/)

    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-02';"),
      'approved'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-04';"),
      'amended'
    )
    assert.equal(
      query(reg.db, "SELECT text FROM spec_statement WHERE id='SP-beta-04';"),
      'Replacement statement text.'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-03';"),
      'rejected'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '3')
    assert.equal(
      query(
        reg.db,
        'SELECT statement_id, date, status, old_text FROM statement_history ORDER BY statement_id;'
      ),
      [
        'SP-alpha-02|2026-09-02|approved|Proposed statement text.',
        'SP-beta-03|2026-09-02|rejected|Rejected statement text.',
        'SP-beta-04|2026-09-02|amended|Flagged statement text.',
      ].join('\n')
    )
  } finally {
    reg.cleanup()
  }
})

test('a verdict rejected mid-export rolls back the verdicts before it', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-alpha-02': { verdict: 'keep' },
          'SP-beta-04': { verdict: 'change', text: '   ' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /verdict change without replacement text: SP-beta-04/)
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-02';"),
      'proposed'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-04';"),
      'flagged'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

test('an export naming an unknown id is refused before any write', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const before = query(reg.db, 'SELECT id, status, text FROM spec_statement ORDER BY id;')
    const beforeCount = query(reg.db, 'SELECT count(*) FROM spec_statement;')
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-alpha-02': { verdict: 'keep' },
          'SP-ghost-99': { verdict: 'remove' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /unknown statement id\(s\): SP-ghost-99/)
    assert.equal(query(reg.db, 'SELECT count(*) FROM spec_statement;'), beforeCount)
    assert.equal(query(reg.db, 'SELECT id, status, text FROM spec_statement ORDER BY id;'), before)
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})
```

#### Refutation notes for the gate

The three mutants below were built and run against the finished tools. Each is caught by
exactly one test, so no assertion is passing for an incidental reason.

| Wrong-Green | Mutant | Assertion that kills it |
|---|---|---|
| The unknown id is skipped instead of refusing the export. The count line still reads plausibly, the known verdicts land, and the reviewer never learns that a verdict was dropped, which is how a statement silently keeps a status the owner meant to change. | Replace the `unknown` check with `verdicts = {k: v for k, v in verdicts.items() if k in known}`. | `an export naming an unknown id is refused before any write`, 9 pass, 1 fail. |
| `--pending-only` accepted and ignored, so the owner reviews already-approved statements again and re-approving them rewrites history rows. | `where = ""` unconditionally in `load`. | `panel with --pending-only carries the pending statements and no others`, 9 pass, 1 fail. |
| The ingest commits per verdict instead of once. Every whole-export test still passes, and a malformed verdict in the middle leaves the registry half-reviewed: some statements flipped, the rest not, with no signal about where it stopped. | Add `con.commit()` at the end of the per-verdict loop body, inside the `with con:` block. | `a verdict rejected mid-export rolls back the verdicts before it`. Under the mutant: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: + 'approved' - 'proposed'`, 9 pass, 1 fail. |

Two more the suite pins without a mutant: a panel that renders the ids but no export path
fails `panel without the flag carries every statement`, which requires the download
attribute, `localStorage` and `navigator.clipboard` in the page; an ingest that writes the
new status but no history row, or writes the post-change text as `old_text`, fails the
three-row `old_text` comparison in the round-trip test.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/registry-tools.test.mjs`

Expected: FAIL, 10 tests, 5 passing (the Task 6 block), 5 failing, the first with

```
AssertionError [ERR_ASSERTION]: <path to python3>: can't open file '<repo>/plugins/wave/templates/project/registry/tools/gen-review-panel.py': [Errno 2] No such file or directory


2 !== 0
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/registry/tools/gen-review-panel.py`. The page body
is a plain (non f-string) template with `__TOKEN__` placeholders, so the CSS and JavaScript
braces stay readable and no brace needs doubling:

```python
#!/usr/bin/env python3
"""Generate the owner review panel (local HTML) from registry.db.

Usage: python3 gen-review-panel.py [--registry-dir DIR] [--pending-only] [--out FILE]

Offline by design: the statements are embedded in the page, progress is kept in
localStorage, and the export is one JSON file that ingest-review.py applies back
to the registry. Open it as a local file. Never publish it as an artifact:
artifact viewers block the download the export button needs.
"""

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

PENDING_SQL = "status IN ('proposed','flagged')"


def js(value):
    """JSON for embedding inside a <script> block."""
    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")


def load(db_path, pending_only):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    where = f" WHERE {PENDING_SQL}" if pending_only else ""
    stmts = [
        dict(r)
        for r in con.execute(
            "SELECT id, area, text, basis, status, stage FROM spec_statement"
            + where
            + " ORDER BY area, id"
        )
    ]
    areas = [
        r[0]
        for r in con.execute(
            "SELECT DISTINCT area FROM spec_statement" + where + " ORDER BY area"
        )
    ]
    refs = {}
    for r in con.execute("SELECT statement_id, ref_type, ref FROM spec_ref"):
        refs.setdefault(r["statement_id"], []).append(f"{r['ref_type']}:{r['ref']}")
    con.close()
    for s in stmts:
        s["area"] = s["area"] or ""
        s["refs"] = refs.get(s["id"], [])
    return stmts, [a or "" for a in areas]


PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statement review __STAMP_TXT__</title>
<style>
  :root { --ink:#1c2733; --mut:#5b6b7a; --line:#dbe3ea; --bg:#f6f8fa;
          --acc:#2f6f9f; --ok:#2e7d32; --chg:#b45309; --rm:#b3261e; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 -apple-system,'Segoe UI',sans-serif;
         color:var(--ink); background:var(--bg); }
  header { position:sticky; top:0; z-index:5; background:#fff; padding:10px 20px;
           border-bottom:2px solid var(--line); display:flex; gap:16px;
           align-items:center; flex-wrap:wrap; }
  header h1 { font-size:16px; margin:0; }
  #progress { color:var(--mut); font-variant-numeric:tabular-nums; }
  #onlyopen { border:1px solid var(--line); background:#fff; border-radius:6px;
              padding:4px 12px; cursor:pointer; }
  #onlyopen.on { background:var(--ink); color:#fff; }
  main { max-width:1020px; margin:0 auto; padding:16px 20px 120px; }
  section h2 { font-size:15px; text-transform:uppercase; letter-spacing:.04em;
               border-bottom:1px solid var(--line); padding-bottom:4px;
               margin:26px 0 8px; }
  .card { background:#fff; border:1px solid var(--line); border-left:4px solid var(--line);
          border-radius:8px; padding:10px 14px; margin:8px 0; }
  .card.flagged { border-left-color:var(--acc); }
  .card.done-keep { opacity:.6; border-left-color:var(--ok); }
  .card.done-change { border-left-color:var(--chg); }
  .card.done-remove { opacity:.6; border-left-color:var(--rm); }
  .sid { font:12px ui-monospace,monospace; color:var(--mut); }
  .tag { display:inline-block; font-size:11px; padding:1px 7px; border-radius:9px;
         background:#eef4f8; color:var(--mut); margin-left:6px; }
  .tag.flagged { background:#e8f1f8; color:var(--acc); font-weight:600; }
  .stext { margin:6px 0; }
  .refs { font:12px ui-monospace,monospace; color:var(--mut); word-break:break-all; }
  .acts { margin-top:8px; display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  .acts label { cursor:pointer; }
  .newtext, .note { width:100%; margin-top:6px; border:1px solid var(--line);
                    border-radius:6px; padding:6px 9px; font:14px inherit; }
  .newtext { min-height:64px; }
  #exportbar { position:fixed; bottom:0; left:0; right:0; background:#fff;
               border-top:2px solid var(--line); padding:10px 20px; display:flex;
               gap:14px; align-items:center; z-index:5; }
  #exportbar button { background:var(--acc); color:#fff; border:none;
                      border-radius:7px; padding:9px 22px; font-size:15px;
                      cursor:pointer; }
  #hint { color:var(--mut); font-size:13px; }
</style></head><body>
<header>
  <h1>Statement review</h1>
  <span id="progress"></span>
  <button id="onlyopen" onclick="toggleOpen()">undecided only</button>
  <span style="flex:1"></span>
  <span style="color:var(--mut);font-size:13px">__COUNT__ statements &middot; generated __STAMP_TXT__</span>
</header>
<main id="app"></main>
<div id="exportbar">
  <button onclick="doExport()">Export verdicts (JSON)</button>
  <span id="hint">Progress is saved in this browser. The export downloads a file and
  is copied to the clipboard; hand it to the controller for ingest-review.py.</span>
</div>
<script>
const DATA = __DATA__;
const AREAS = __AREAS__;
const STAMP = __STAMP__;
const KEY = 'wave-review-' + STAMP;
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
let onlyOpen = false;

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} prog(); }
function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
function attr(t) { return esc(t).replace(/"/g, '&quot;'); }

function setVerdict(id, v) {
  state[id] = state[id] || {};
  state[id].verdict = v;
  save(); paint(id); applyFilter();
}
function setText(id, v) { state[id] = state[id] || {}; state[id].text = v; save(); }
function setNote(id, v) { state[id] = state[id] || {}; state[id].note = v; save(); }

function paint(id) {
  const card = document.getElementById(id);
  if (!card) return;
  const st = state[id] || {};
  card.className = card.className.replace(/ ?done-\\w+/g, '');
  if (st.verdict) card.className += ' done-' + st.verdict;
  const box = card.querySelector('.newtext');
  if (box) box.style.display = st.verdict === 'change' ? '' : 'none';
  card.querySelectorAll('input[type=radio]').forEach(r => { r.checked = r.value === st.verdict; });
}
function toggleOpen() {
  onlyOpen = !onlyOpen;
  document.getElementById('onlyopen').className = onlyOpen ? 'on' : '';
  applyFilter();
}
function applyFilter() {
  DATA.forEach(s => {
    const c = document.getElementById(s.id);
    if (!c) return;
    const done = state[s.id] && state[s.id].verdict;
    c.style.display = (onlyOpen && done) ? 'none' : '';
  });
}
function prog() {
  const done = DATA.filter(s => state[s.id] && state[s.id].verdict).length;
  document.getElementById('progress').textContent = done + '/' + DATA.length + ' decided';
}
function card(s) {
  const st = state[s.id] || {};
  const radios = ['keep', 'change', 'remove'].map(v =>
    '<label><input type="radio" name="v-' + s.id + '" value="' + v + '"'
    + (st.verdict === v ? ' checked' : '')
    + ' onchange="setVerdict(\\'' + s.id + '\\',\\'' + v + '\\')"> ' + v + '</label>'
  ).join('');
  return '<div class="card ' + (s.status === 'flagged' ? 'flagged' : '')
    + (st.verdict ? ' done-' + st.verdict : '') + '" id="' + s.id + '">'
    + '<span class="sid">' + esc(s.id) + '</span>'
    + '<span class="tag' + (s.status === 'flagged' ? ' flagged' : '') + '">' + esc(s.status) + '</span>'
    + '<span class="tag">' + esc(s.basis) + '</span>'
    + (s.stage ? '<span class="tag">' + esc(s.stage) + '</span>' : '')
    + '<div class="stext">' + esc(s.text) + '</div>'
    + (s.refs.length ? '<div class="refs">' + s.refs.map(esc).join(' &middot; ') + '</div>' : '')
    + '<div class="acts">' + radios + '</div>'
    + '<textarea class="newtext" placeholder="replacement text (required for change)"'
    + ' style="display:' + (st.verdict === 'change' ? '' : 'none') + '"'
    + ' onchange="setText(\\'' + s.id + '\\', this.value)">' + esc(st.text || '') + '</textarea>'
    + '<input class="note" placeholder="note (optional)" value="' + attr(st.note || '')
    + '" onchange="setNote(\\'' + s.id + '\\', this.value)">'
    + '</div>';
}
function render() {
  let h = '';
  AREAS.forEach(a => {
    const rows = DATA.filter(s => s.area === a);
    if (!rows.length) return;
    h += '<section><h2>' + esc(a || '(no area)') + ' <span style="color:var(--mut)">('
       + rows.length + ')</span></h2>' + rows.map(card).join('') + '</section>';
  });
  document.getElementById('app').innerHTML = h;
  DATA.forEach(s => paint(s.id));
  prog();
}
function collect() {
  const out = { generated: STAMP, verdicts: {} };
  DATA.forEach(s => {
    const st = state[s.id] || {};
    if (!st.verdict) return;
    const v = { verdict: st.verdict };
    if (st.verdict === 'change') v.text = st.text || '';
    if (st.note) v.note = st.note;
    out.verdicts[s.id] = v;
  });
  return JSON.stringify(out, null, 2);
}
function doExport() {
  const text = collect();
  const n = Object.keys(JSON.parse(text).verdicts).length;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'review-' + STAMP + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const hint = document.getElementById('hint');
  hint.textContent = n + ' verdict(s) exported.';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => { hint.textContent = n + ' verdict(s) exported and copied to the clipboard.'; },
      () => {}
    );
  }
}
render();
</script></body></html>
"""


def build(stmts, areas, stamp):
    return (
        PAGE.replace("__DATA__", js(stmts))
        .replace("__AREAS__", js(areas))
        .replace("__STAMP__", js(stamp))
        .replace("__STAMP_TXT__", stamp)
        .replace("__COUNT__", str(len(stmts)))
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    ap.add_argument(
        "--pending-only",
        action="store_true",
        help="only statements with status proposed or flagged",
    )
    ap.add_argument(
        "--out",
        default=None,
        help="output HTML file (default: <registry-dir>/review/index.html)",
    )
    args = ap.parse_args()

    root = (
        Path(args.registry_dir).resolve()
        if args.registry_dir
        else Path(__file__).resolve().parents[1]
    )
    db_path = root / "registry.db"
    if not db_path.exists():
        raise SystemExit(f"gen-review-panel: no registry database at {db_path}")

    stmts, areas = load(db_path, args.pending_only)
    out = Path(args.out).resolve() if args.out else root / "review" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(stmts, areas, date.today().isoformat()), encoding="utf-8")
    pending = sum(1 for s in stmts if s["status"] in ("proposed", "flagged"))
    print(f"wrote {out}: {len(stmts)} statements, {pending} pending")


if __name__ == "__main__":
    main()
```

Create `plugins/wave/templates/project/registry/tools/ingest-review.py`:

```python
#!/usr/bin/env python3
"""Apply a review-panel export to registry.db.

Usage: python3 ingest-review.py <export.json> [--registry-dir DIR] [--date YYYY-MM-DD]

keep sets the status to approved, change replaces the text and sets amended,
remove sets rejected. Every verdict appends a statement_history row carrying the
text the statement had before the change. An export naming an id the registry
does not hold is refused before anything is written.
"""

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

VERDICT_STATUS = {"keep": "approved", "change": "amended", "remove": "rejected"}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("export", help="JSON file exported by the review panel")
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    ap.add_argument(
        "--date",
        default=None,
        help="YYYY-MM-DD written into statement_history (default: today)",
    )
    args = ap.parse_args()

    root = (
        Path(args.registry_dir).resolve()
        if args.registry_dir
        else Path(__file__).resolve().parents[1]
    )
    db_path = root / "registry.db"
    if not db_path.exists():
        raise SystemExit(f"ingest-review: no registry database at {db_path}")

    when = args.date or date.today().isoformat()
    date.fromisoformat(when)  # fail fast on a malformed --date

    payload = json.loads(Path(args.export).read_text(encoding="utf-8"))
    verdicts = payload.get("verdicts") or {}
    if not verdicts:
        raise SystemExit("ingest-review: the export carries no verdicts")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA busy_timeout=30000")
    known = dict(con.execute("SELECT id, text FROM spec_statement"))

    unknown = sorted(set(verdicts) - set(known))
    if unknown:
        con.close()
        raise SystemExit(
            "ingest-review: unknown statement id(s): " + ", ".join(unknown)
        )
    bad = sorted(
        k for k, v in verdicts.items() if (v or {}).get("verdict") not in VERDICT_STATUS
    )
    if bad:
        con.close()
        raise SystemExit("ingest-review: unknown verdict for: " + ", ".join(bad))

    counts = {"keep": 0, "change": 0, "remove": 0}
    try:
        with con:  # one transaction: either every verdict lands or none does
            for sid, v in sorted(verdicts.items()):
                verdict = v["verdict"]
                status = VERDICT_STATUS[verdict]
                note = (v.get("note") or "").strip() or f"panel review: {verdict}"
                if verdict == "change":
                    new_text = (v.get("text") or "").strip()
                    if not new_text:
                        raise SystemExit(
                            f"ingest-review: verdict change without replacement text: {sid}"
                        )
                    con.execute(
                        "UPDATE spec_statement SET text = ?, status = ? WHERE id = ?",
                        (new_text, status, sid),
                    )
                else:
                    con.execute(
                        "UPDATE spec_statement SET status = ? WHERE id = ?",
                        (status, sid),
                    )
                con.execute(
                    "INSERT INTO statement_history (statement_id, date, status, note, old_text) "
                    "VALUES (?,?,?,?,?)",
                    (sid, when, status, note, known[sid]),
                )
                counts[verdict] += 1
    finally:
        con.close()

    print(
        f"keep: {counts['keep']}  change: {counts['change']}  remove: {counts['remove']}"
    )


if __name__ == "__main__":
    main()
```

Then make both tools executable:
`chmod +x plugins/wave/templates/project/registry/tools/gen-review-panel.py plugins/wave/templates/project/registry/tools/ingest-review.py`

Notes for the reviewer:

- Unknown ids and unknown verdict words are rejected before the transaction opens, so a bad
  export leaves the registry byte-identical.
- The verdicts are applied inside one `with con:` block, with no `commit()` inside the loop.
  A `change` with empty replacement text raises inside that block, and the context manager
  rolls the whole ingest back, so a half-applied review is not a reachable state. The
  mid-export test is what pins this: it exits 1 and the earlier `keep` is still `proposed`.
- `old_text` always comes from the `known` snapshot taken before any update, never from a
  re-read.
- The note defaults to `panel review: <verdict>` when the reviewer left the note box empty,
  so no history row lands with an empty note.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/registry-tools.test.mjs`

Expected: PASS

```
✔ projection carries approved statements only
✔ projection code_locus holds the code refs only
✔ projection carries no ban_entry table
✔ schema refuses a basis outside the allowed set
✔ schema refuses a finding status outside the allowed set
✔ panel with --pending-only carries the pending statements and no others
✔ panel without the flag carries every statement
✔ an export round-trips through ingest-review.py
✔ a verdict rejected mid-export rolls back the verdicts before it
✔ an export naming an unknown id is refused before any write
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
```

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/project/registry/tools/gen-review-panel.py \
        plugins/wave/templates/project/registry/tools/ingest-review.py \
        plugins/wave/tests/registry-tools.test.mjs && \
git commit -m "feat(wave): add the review panel and its ingest tool"
```

### Task 9: Project markdown templates and the settings fragment

**Files:**
- Create: `plugins/wave/templates/project/AGENTS.md.hbs`
- Create: `plugins/wave/templates/project/CLAUDE-section.md.hbs`
- Create: `plugins/wave/templates/project/agents/red-gate.md`
- Create: `plugins/wave/templates/project/skills/dispatch/SKILL.md`
- Create: `plugins/wave/templates/project/skills/registry/SKILL.md`
- Create: `plugins/wave/templates/project/registry/README.md`
- Create: `plugins/wave/templates/project/settings.json`
- Test: `plugins/wave/tests/templates.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` and `render(templateRelPath, knobs)` from
  `plugins/wave/tests/helpers.mjs` (Task 1). `render` receives the template path
  relative to `PLUGIN_ROOT` and a knobs object, and returns rendered stdout.
- Consumes: the template syntax of `plugins/wave/scripts/render.mjs` (Task 2):
  `{{KEY}}` substitution, `{{#if KEY}} … {{/if}}` blocks with the delimiters on
  their own lines, an error on any surviving `{{…}}`.
- Consumes: `plugins/wave/tests/fixtures/knobs.sample.json` (Task 1) for the knob
  values `REPO_NAME`, `ENV_FILE`, `MODEL_DEFAULT`, `MODEL_JUDGMENT`, `TEST_CMD`,
  `BUILD_CMD`, `TEST_BIN_HINT`, `VITEST`, `REGISTRY`, `HOUSE_CONVENTIONS`,
  `EXTERNAL_KEYS`.
- Consumes: the `.claude/wave.env` variable names written by Task 4
  (`WAVE_WT_ROOT`, `WAVE_BRANCH_PREFIX`, `WAVE_ENV_FILE`, `WAVE_INSTALL_CMD`,
  `WAVE_MODEL_DEFAULT`, `WAVE_EFFORT_DEFAULT`, `WAVE_MODEL_JUDGMENT`,
  `WAVE_LOG_DIR`, `WAVE_REGISTRY_DIR`), the `dispatch.sh` CLI (Task 4), the
  `registry-write.sh` CLI (Task 7) and the registry tool names (Tasks 6 and 8).
  These templates document those interfaces; they do not define them.
- Produces: the seven files the init skill (Task 12) renders or copies into a
  project, and the settings fragment `merge-settings.mjs` (Task 3) unions into
  `.claude/settings.json`.

**Source anchors (verified by reading the OIL files):**
- `AGENTS.md` in the source repository has exactly these sections:
  `## Environment`, `## Scope discipline`, `## House conventions`,
  `## Type evidence`, `## Tests and mocking`, `## Verification contract`. The
  Polish typography bullet lives inside `## House conventions` and is dropped.
- `.claude/agents/red-gate.md` has frontmatter `name: red-gate`, a `description`,
  `model: opus`, and an eight-item checklist. Only item 7 names a project
  component; every other line ships verbatim, em-dashes included.

**Rules for this task:**
- The two `.hbs` files are the only files here that may contain `{{`. Everything
  else under `templates/project/` is copied verbatim into a project and must read
  correctly as-is.
- The registry README is the only prose the registry tools have. It carries the
  panel export shape from the interface contract (`generated`, and a `verdicts`
  map of statement id to `verdict` of `keep`, `change` or `remove`, with `text`
  on a change and an optional `note`) and the four commands of a review round,
  so a reader never has to open a Python file to learn the format.
- Three literal strings are consumed by the init skill (Task 12) and must appear
  byte for byte. `AGENTS.md.hbs` wraps the house-conventions TODO in the lines
  `<!-- wave:todo-house-conventions -->` and
  `<!-- /wave:todo-house-conventions -->`, which init sed-deletes when the
  recipient supplied conventions; the renderer has no else-branch, so the block
  is always rendered and removed afterwards. `CLAUDE-section.md.hbs` opens with
  the heading `## Wave dispatch (controller-side)`, which init greps for as its
  presence probe.
- Conditional blocks are never nested and their delimiters always sit alone on
  their own line.
- With `REGISTRY` off, the rendered CLAUDE.md section must not contain the word
  "registry" on any line, in any case. Every sentence that mentions it lives
  inside the `{{#if REGISTRY}}` block.
- Keep the em-dashes of the ported text. These files are near-verbatim ports and
  the canonical wording is the thing being packaged.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/templates.test.mjs`:

````js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { PLUGIN_ROOT, render } from './helpers.mjs'

const KNOBS = JSON.parse(
  readFileSync(join(PLUGIN_ROOT, 'tests', 'fixtures', 'knobs.sample.json'), 'utf8'),
)

const TEMPLATES = join(PLUGIN_ROOT, 'templates')
const PROJECT = join(TEMPLATES, 'project')

function walk(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...walk(full))
    else found.push(full)
  }
  return found
}

const rel = (p) => relative(PLUGIN_ROOT, p)
const hbsTemplates = walk(TEMPLATES).filter((p) => p.endsWith('.hbs'))
const verbatimFiles = walk(PROJECT).filter((p) => !p.endsWith('.hbs'))
const readProject = (p) => readFileSync(join(PROJECT, p), 'utf8')

test('the template tree holds both rendered and verbatim files', () => {
  assert.ok(hbsTemplates.length > 0, 'no .hbs template found')
  assert.ok(verbatimFiles.length > 0, 'no verbatim project file found')
})

for (const file of hbsTemplates) {
  test(`renders with the sample knobs and leaves no placeholder: ${rel(file)}`, () => {
    const out = render(rel(file), KNOBS)
    assert.ok(!out.includes('{{'), `unrendered placeholder left in ${rel(file)}`)
  })
}

for (const file of verbatimFiles) {
  test(`verbatim file carries no knob placeholder: ${rel(file)}`, () => {
    const body = readFileSync(file, 'utf8')
    assert.ok(
      !/\{\{[A-Z][A-Z0-9_]*\}\}/.test(body),
      `knob placeholder in the verbatim file ${rel(file)}`,
    )
    assert.ok(
      !/\{\{#if |\{\{\/if\}\}/.test(body),
      `conditional block in the verbatim file ${rel(file)}`,
    )
    assert.ok(!body.includes('{{'), `handlebars braces in the verbatim file ${rel(file)}`)
  })
}

test('AGENTS.md keeps the six contract sections and drops the language-specific typography', () => {
  const out = render('templates/project/AGENTS.md.hbs', KNOBS)
  for (const heading of [
    '## Environment',
    '## Scope discipline',
    '## House conventions',
    '## Type evidence',
    '## Tests and mocking',
    '## Verification contract',
  ]) {
    assert.ok(out.includes(heading), `missing section ${heading}`)
  }
  assert.ok(!out.includes('Polish'), 'the Polish typography rules must not ship')
})

test('AGENTS.md carries the detected commands and the env file', () => {
  const out = render('templates/project/AGENTS.md.hbs', KNOBS)
  assert.ok(out.includes(KNOBS.TEST_CMD), 'TEST_CMD missing')
  assert.ok(out.includes(KNOBS.BUILD_CMD), 'BUILD_CMD missing')
  assert.ok(out.includes(KNOBS.TEST_BIN_HINT), 'TEST_BIN_HINT missing')
  assert.ok(out.includes(KNOBS.ENV_FILE), 'ENV_FILE missing')
})

test('AGENTS.md drops the vitest mock rules when the runner is not vitest', () => {
  const out = render('templates/project/AGENTS.md.hbs', { ...KNOBS, VITEST: false })
  assert.ok(!out.includes('vi.mock'), 'vitest mock rules survived VITEST:false')
  assert.ok(!out.includes('{{'))
})

test('AGENTS.md keeps the vitest mock rules when the runner is vitest', () => {
  const out = render('templates/project/AGENTS.md.hbs', { ...KNOBS, VITEST: true })
  assert.ok(out.includes('vi.mock'), 'vitest mock rules missing under VITEST:true')
  assert.ok(out.includes('importOriginal'))
})

test('AGENTS.md carries the sentinel-wrapped TODO block when no house conventions were given', () => {
  const out = render('templates/project/AGENTS.md.hbs', { ...KNOBS, HOUSE_CONVENTIONS: '' })
  const open = out.indexOf('<!-- wave:todo-house-conventions -->')
  const close = out.indexOf('<!-- /wave:todo-house-conventions -->')
  assert.ok(open > 0, 'the opening sentinel init sed-deletes on is missing')
  assert.ok(close > open, 'the closing sentinel must follow the opening one')
  const block = out.slice(open, close)
  assert.ok(block.includes('sibling parity'), 'the TODO block must name sibling parity')
  assert.ok(block.includes('comment discipline'), 'the TODO block must name comment discipline')
  assert.equal(
    out.split('<!-- wave:todo-house-conventions -->').length - 1,
    1,
    'exactly one opening sentinel, so the sed range is unambiguous',
  )
})

test('AGENTS.md carries the house conventions when they were given', () => {
  const conventions =
    '- every outbound call goes through `lib/gateway.ts`\n- colors come from `theme/tokens.ts`'
  const out = render('templates/project/AGENTS.md.hbs', {
    ...KNOBS,
    HOUSE_CONVENTIONS: conventions,
  })
  assert.ok(out.includes('lib/gateway.ts'), 'the first convention line is missing')
  assert.ok(out.includes('theme/tokens.ts'), 'the second convention line is missing')
  const headingAt = out.indexOf('## House conventions')
  assert.ok(
    out.indexOf('lib/gateway.ts') > headingAt &&
      out.indexOf('lib/gateway.ts') < out.indexOf('<!-- wave:todo-house-conventions -->'),
    'the conventions must sit under the heading, above the TODO block',
  )
})

test('the CLAUDE.md section starts with the wave dispatch heading', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', KNOBS)
  assert.ok(
    out.startsWith('## Wave dispatch (controller-side)'),
    'the section must start with its own heading so init can test for it',
  )
})

test('the CLAUDE.md section names both model tiers', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', KNOBS)
  assert.ok(out.includes(KNOBS.MODEL_DEFAULT), 'MODEL_DEFAULT missing')
  assert.ok(out.includes(KNOBS.MODEL_JUDGMENT), 'MODEL_JUDGMENT missing')
})

test('the CLAUDE.md section names the external keys to mask at seal', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', {
    ...KNOBS,
    EXTERNAL_KEYS: 'OPENAI_API_KEY ANTHROPIC_API_KEY',
  })
  assert.ok(out.includes('OPENAI_API_KEY ANTHROPIC_API_KEY'), 'the key list is missing')
  assert.ok(out.includes('retries 0'), 'the live-spec retry rule is missing')
})

test('the CLAUDE.md section drops the key list when there are no external keys', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', { ...KNOBS, EXTERNAL_KEYS: '' })
  assert.ok(!out.includes('Keys to mask'), 'the key list survived an empty EXTERNAL_KEYS')
  assert.ok(out.includes('Seal policy'), 'the seal policy itself must survive')
})

test('the CLAUDE.md section keeps the registry lines when a registry is configured', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', { ...KNOBS, REGISTRY: true })
  assert.match(out, /registry/i)
  assert.ok(out.includes('main checkout'), 'the flip-location rule is missing')
})

test('the CLAUDE.md section drops every registry line when there is no registry', () => {
  const out = render('templates/project/CLAUDE-section.md.hbs', { ...KNOBS, REGISTRY: false })
  assert.ok(!out.includes('{{'))
  for (const line of out.split('\n')) {
    assert.ok(!/registry/i.test(line), `registry line survived REGISTRY:false: ${line}`)
  }
  assert.ok(out.includes('Dispatch only via the'), 'the dispatch rule must survive')
})

test('the red-gate agent ships verbatim with a generalized item 7', () => {
  const md = readProject('agents/red-gate.md')
  assert.match(md, /^---\nname: red-gate\n/, 'frontmatter must open with the agent name')
  assert.ok(md.includes('model: opus'), 'the gate runs on opus')
  assert.ok(md.includes('house conventions section of `AGENTS.md`'), 'item 7 is not generalized')
  assert.ok(!md.includes('SubmitButton'), 'the project-specific component survived in item 7')
  for (const line of ['1. **Deletions pinned', '8. **Wrong-Green probe**']) {
    assert.ok(md.includes(line), `checklist item missing: ${line}`)
  }
})

test('the dispatch skill points at wave.env and carries no project path', () => {
  const md = readProject('skills/dispatch/SKILL.md')
  assert.match(md, /^---\nname: dispatch\n/)
  assert.ok(md.includes('description: Use when'), 'the description must start with "Use when"')
  assert.ok(md.includes('.claude/wave.env'), 'the skill must name the config file')
  assert.ok(md.includes('.claude/skills/dispatch/scripts/dispatch.sh'))
  assert.ok(!md.includes('oil_wrapper'), 'a source-project path survived')
  assert.ok(!md.includes('.env.local'), 'a hardcoded env file name survived')
  assert.ok(!md.includes('pnpm'), 'a hardcoded package manager survived')
  const sourced = md.indexOf('source .claude/wave.env')
  const used = md.indexOf('"$WAVE_MODEL_JUDGMENT"')
  assert.ok(sourced > 0 && used > sourced, 'a wave.env variable is used before the file is sourced')
})

test('the registry skill uses one database and the guarded write CLI', () => {
  const md = readProject('skills/registry/SKILL.md')
  assert.match(md, /^---\nname: registry\n/)
  assert.ok(md.includes('description: Use when'), 'the description must start with "Use when"')
  assert.ok(md.includes('registry.db'), 'the single database is missing')
  assert.ok(!md.includes('findings.db'), 'the second source database survived')
  assert.ok(!md.includes('docs/diagnostics'), 'a source-project path survived')
  assert.ok(md.includes('--note'), 'the history note flag is missing')
  assert.ok(md.includes('spec_statement'), 'the statement table is missing')
})

test('the registry README carries the contract clauses and the projection rule', () => {
  const md = readProject('registry/README.md')
  assert.ok(md.includes('spec-exec.db'), 'the projection is missing')
  assert.ok(md.includes('old_text'), 'the old_text clause is missing')
  assert.ok(md.includes('ban_entry'), 'the ban table is missing')
  assert.ok(md.includes("stage='W<N>'"), 'the wave-close invariant is missing')
  assert.ok(!md.includes('workstream'), 'the wave-3 tables must not ship')
  assert.ok(!md.includes('docs/diagnostics'), 'a source-project path survived')
})

test('the registry README documents the panel export shape and the review round', () => {
  const md = readProject('registry/README.md')
  assert.ok(md.includes('"verdicts"'), 'the export JSON shape is missing')
  assert.ok(md.includes('"generated"'), 'the export date field is missing')
  for (const verdict of ['keep', 'change', 'remove']) {
    assert.ok(md.includes(`"${verdict}"`), `the ${verdict} verdict is not documented`)
  }
  assert.ok(md.includes('gen-review-panel.py --registry-dir'), 'the panel command is missing')
  assert.ok(md.includes('ingest-review.py'), 'the ingest command is missing')
  assert.ok(md.includes('gen-spec-exec.py --registry-dir'), 'the projection refresh is missing')
})

test('the settings fragment denies both raw codex commands', () => {
  const fragment = JSON.parse(readProject('settings.json'))
  assert.deepEqual(fragment.permissions.deny, ['Bash(codex exec:*)', 'Bash(codex resume:*)'])
})

test('the settings fragment allows both scripts in bare and bash-prefixed form', () => {
  const fragment = JSON.parse(readProject('settings.json'))
  assert.deepEqual(fragment.permissions.allow, [
    'Bash(.claude/skills/dispatch/scripts/dispatch.sh:*)',
    'Bash(bash .claude/skills/dispatch/scripts/dispatch.sh:*)',
    'Bash(.claude/skills/registry/scripts/registry-write.sh:*)',
    'Bash(bash .claude/skills/registry/scripts/registry-write.sh:*)',
  ])
})

test('the settings fragment registers both Bash hooks in one entry', () => {
  const fragment = JSON.parse(readProject('settings.json'))
  assert.equal(fragment.hooks.PreToolUse.length, 1)
  assert.equal(fragment.hooks.PreToolUse[0].matcher, 'Bash')
  assert.deepEqual(
    fragment.hooks.PreToolUse[0].hooks.map((h) => h.command),
    [
      'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/registry-guard.sh"',
      'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/code-only-branch.sh"',
    ],
  )
  for (const hook of fragment.hooks.PreToolUse[0].hooks) assert.equal(hook.type, 'command')
})
````

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/templates.test.mjs`

Expected: FAIL. Every test that reads a file this task creates fails with
`ENOENT`. The `.hbs` tests fail through the helper, because `render.mjs` exits
non-zero on a missing template:

```
✖ AGENTS.md keeps the six contract sections and drops the language-specific typography
  Error: render templates/project/AGENTS.md.hbs failed (1): ...
  Error: ENOENT: no such file or directory, open '<repo>/plugins/wave/templates/project/AGENTS.md.hbs'
```

and the verbatim tests fail on the direct read:

```
✖ the red-gate agent ships verbatim with a generalized item 7
  Error: ENOENT: no such file or directory, open '<repo>/plugins/wave/templates/project/agents/red-gate.md'
      at readProject (.../tests/templates.test.mjs)
```

The same ENOENT appears for `templates/project/CLAUDE-section.md.hbs`,
`skills/dispatch/SKILL.md`, `skills/registry/SKILL.md`, `registry/README.md` and
`settings.json`. The discovery test and the verbatim-file loop pass, on the files
Task 4 created. If the discovery test also fails with "no .hbs template found",
`templates/project/wave.env.hbs` from Task 4 is missing and that task is not
merged yet.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/project/AGENTS.md.hbs`:

````markdown
# AGENTS.md — implementer contract ({{REPO_NAME}})

You are dispatched as an implementer inside a **dedicated git worktree**. The
controller session plans, reviews, commits, and runs everything your sandbox
blocks. Your task brief carries the statements you implement and any BAN rules;
this file carries the standing rules that apply to every dispatch.

## Environment

- Your sandbox confines writes to this worktree and blocks the network, so every
  service reached over it is out of reach too. Don't attempt workarounds — list
  the checks you could not run (see verification contract).
- The shared git dir is outside your sandbox, so `git commit`/`push`/`rebase`
  will fail. Don't try; the controller commits with the prescribed message.
- If the task seems to require touching anything outside this worktree, that is
  a BLOCKED report, not a workaround.

## Scope discipline

- Implement exactly the task brief. No opportunistic refactors, no drive-by
  fixes — report adjacent problems as findings instead.
- An honest BLOCKED report beats a guess. If the brief is contradictory,
  references something that doesn't exist, or requires an out-of-scope change:
  STOP and report BLOCKED with the specific reason.
- Brief and plan snippets can be wrong or incomplete. If a snippet contradicts a
  house convention below, flag the conflict — don't silently follow the snippet
  and don't silently deviate from it.

## House conventions

{{#if HOUSE_CONVENTIONS}}
{{HOUSE_CONVENTIONS}}

{{/if}}
<!-- wave:todo-house-conventions -->
<!-- TODO: the conventions an implementer cannot infer from the code it is
     shown. One line each, then delete this block:
     - indirections that must not be bypassed (the wrapper every caller goes
       through instead of the underlying client)
     - styling tokens or design primitives, and the ban on hardcoded values
     - copy rules: where user-facing strings come from, and what may not be
       invented or reworded
     - sibling parity: the pairs that must stay in step (archive and delete,
       action and route, worker and inline path) — match the sibling or report
       the asymmetry as a finding
     - comment discipline: comments describe what the code does now, not what
       the brief asked for, and a comment claiming something is safe names the
       invariant that makes it so -->
<!-- /wave:todo-house-conventions -->

## Type evidence

Types are evidence about values. Production code neither fabricates evidence nor
throws it away.

- Parse at the boundary, once. Form data, request bodies, model output, stored
  documents and environment values enter through one validating parser, and
  everything downstream takes the parsed type. Casting a decoded blob to a type
  is not parsing. Outside a type guard, re-narrowing a value that already crossed
  the boundary means the parser is incomplete: fix the parser.
- Contracts name real types. Parameters, return types and module contracts never
  carry a catch-all type standing in for a shape you know. A dynamic type is
  allowed as the input of a type guard or parser and on a caught error. Keep the
  known keys instead of widening to an open map.
- One assertion, with its invariant. Each escape from the type system carries a
  one-line comment naming the fact that makes it true, in the form
  `// SAFETY: parseUserId branded this value above.` A double cast through a
  dynamic type is never written in production code; if the types only line up
  through it, report a finding instead. Test fixtures may cast freely, but a cast
  repeated across tests becomes a typed helper in the shared test helpers.

## Tests and mocking

- Red before Green: the failing tests exist and are shown failing before the
  implementation lands. The suite is `{{TEST_CMD}}`.
- Tests dispatch no LLM calls: a test that reaches a provider is a defect.
- Mock at named boundaries only: the model client, the database client, the
  session or auth helper, the object store, the job queue, framework modules, and
  the server-side entry points a component under test calls. Don't mock a pure
  module to force a return value; call it. A mock of anything else goes in your
  findings with the reason.
{{#if VITEST}}
- Every `vi.mock` factory for a project module spreads `importOriginal` and
  overrides only what the test needs, so an export added elsewhere later does not
  break the suite at import time.
- When you add or remove an export, OR add a new consumer of an existing export
  inside a module other suites import, grep `vi.mock('<module>'` for that module
  and fix every bare factory before reporting. A neighbour's suite failing at
  import time is your change.
{{/if}}
- In the sandbox run the test and type-check binaries directly
  (`{{TEST_BIN_HINT}}`): the package manager launcher hangs there.

## Verification contract

- Report test results per test with **pasted runner output** — never summarize a
  suite as "fails as intended" or "passes" without the actual output.
- Suites that need a database or another service, `{{BUILD_CMD}}`, and anything
  needing network are controller re-runs. State explicitly which checks you could
  NOT run; a green claim that silently covers an un-run check is treated as a
  fake-Green.
{{#if ENV_FILE}}
- If `{{ENV_FILE}}` is missing in the worktree, say so — service-gated suites
  skip silently without it and your results are not trustworthy.
{{/if}}
- "Every path" briefs: when the brief says all or every (call sites, callers,
  siblings), list the candidates by grep with `file:line` in your report and mark
  each one touched, or untouched with the reason.
- Report structural side effects explicitly: an import added to a file the
  bundler treats specially, a route or server-side entry point added or removed,
  an export list changed. Each starts a controller leg (`{{BUILD_CMD}}`,
  generated-type regeneration, mock sweep) that your own checks cannot cover.
````

Create `plugins/wave/templates/project/CLAUDE-section.md.hbs`:

````markdown
## Wave dispatch (controller-side)

Roles: Codex implements (the repo root `AGENTS.md` is its contract) · Opus gates
and reviews · the controller plans, dispatches, merges, and runs everything the
sandbox blocks. The controller never implements. Briefs carry the task's
statements and neighbours verbatim plus any BAN rules; standing conventions live
in `AGENTS.md`.

- **Dispatch only via the `dispatch` skill** (`.claude/skills/dispatch`): raw
  `codex exec`/`resume` is permission-denied in `.claude/settings.json`. The
  script enforces the sandbox (dedicated worktree, `--sandbox workspace-write`,
  never `danger-full-access`, never the primary checkout), the env-file copy,
  stdin termination, logging, and resume-by-session-ID; CLI trap details live in
  the skill.
- **Model choice**: `{{MODEL_DEFAULT}}`/medium for mechanical well-specified
  tasks; `{{MODEL_JUDGMENT}}`/medium for multi-file or judgment tasks (the gate
  and review net produces the quality, not the effort tier); raise to high only
  after a BLOCKED report or two failed fix rounds. Never switch implementer
  mid-tranche.
- **Controller owns**: commits from worktrees (Codex can't reach the shared git
  dir) and every leg the sandbox blocks (service-gated suites, `{{BUILD_CMD}}`);
  a Codex green claim never covers them.
- **Gates**: run as the `red-gate` subagent (`.claude/agents/red-gate.md`, the
  refutation checklist's single home) on tasks that are high-risk, delete
  behavior, or have multiple ways to fake Green. Exception: a mechanical deletion
  with a named trap runs checklist-only; gates stay on refutation-critical and
  behavioral tasks. Task review runs on everything.
- **Red briefs**: carry the refutation checklist from `red-gate.md`; Red reports
  must paste per-test failure output, never summarize.
- **Plan snippets are untrusted input**: implementers transcribe them verbatim,
  omissions and defects included, and the plan's own reference code is a defect
  class gates and reviews must check. Any task touching a shared component
  boundary keeps a gate or an explicit convention pointer in the brief.
- **Build legs**: any diff that can break the bundler or the generated types gets
  `{{BUILD_CMD}}` before review. The unit suite and the type-checker are blind to
  that boundary, and after a route deletion the type-checker lies until the
  generated types are rebuilt.
{{#if REGISTRY}}
- **Registry**: reads and flips go through the `registry` skill; destructive
  writes only through its guarded script, which prints the full match list first
  and appends the history row in the same transaction (a hook blocks raw UPDATE
  and DELETE). Task branches carry CODE ONLY (hook-enforced) and flips happen in
  the main checkout after rebase-and-merge: a database file does not merge.
{{/if}}
- **Concurrent sessions**: check the branch tip before every merge; a task branch
  is rebased to its fork point and merged fast-forward only.
- **Seal policy (cost)**: the default seal is the full end-to-end suite with
  every external key masked, so any spec that would bill a provider skips. At a
  wave close additionally run live only the specs relevant to that wave's tasks,
  with retries 0: a deterministic failure must not re-bill. Full live sweeps only
  on explicit owner call.
{{#if EXTERNAL_KEYS}}
  Keys to mask: `{{EXTERNAL_KEYS}}`. Masking one of them is not enough, an
  unguarded spec bills whichever provider it can still reach.
{{/if}}
````

Create `plugins/wave/templates/project/agents/red-gate.md`:

````markdown
---
name: red-gate
description: Adversarial Red gate for wave tasks. Use before authorizing Green on any gated task — high-risk, deletes behavior, or refutation-critical (multiple ways to fake Green). Audits the task brief and Red suite against the standing refutation checklist and returns a verdict with evidence.
model: opus
---

You are the adversarial Red gate in a wave execution loop: Codex Red → **you** →
Codex Green → task review. Your job is to prove the Red suite would catch a wrong
or lazy Green — before Green is authorized. You are a skeptic, not a helper: your
default posture is that the Red suite can be fooled, and you stop looking only
when you have evidence it can't.

## Inputs you should expect in your dispatch prompt

The task brief (statements verbatim + BAN rules), the Red diff or suite, and the
worktree path. If any of these is missing, say exactly what's missing and return
BLOCK — never audit from assumptions.

## The refutation checklist (audit every line, with evidence)

1. **Deletions pinned with existence asserts** — the test must fail if the deleted
   code is still there, not merely pass when it's gone.
2. **Former trigger surface tabled** — every input that used to reach the deleted
   behavior appears (an `it.each` table or equivalent); a fall-through branch left
   alive must show up as a failure.
3. **Deleted code's inputs enumerated** — list the deleted code's inputs (selects,
   imports, constants) and verify the brief/suite states for each whether it
   survives with another reader.
4. **No fixture-echo asserts** — an assertion that restates its own fixture proves
   nothing; flag it.
5. **Type-level pins compile-fail** — a type pin that still compiles under the
   wrong implementation is vacuous; check it actually fails.
6. **Red output is pasted per-test** — reject any "fails as intended" summary
   without the runner output; a vacuous Red (never actually failing) has shipped
   behind exactly that phrase.
7. **Plan snippets are untrusted** — the plan's own reference code is a defect
   class; check the snippet against the codebase and against the
   house conventions section of `AGENTS.md`, not against itself.
8. **Wrong-Green probe** — ask: would an add-only implementation (deletions
   skipped), an empty implementation, or a hardcoded return pass this suite? If
   you can construct one mentally, the gate fails; when in doubt, build the probe
   in the task worktree, run it, and revert your probe edits completely.

## Verdict format (return as your final text — never write report files)

- **PASS** — every checklist line holds; cite the evidence per line.
- **STRENGTHEN** — list the mandated additions as concrete test descriptions
  (what must fail, on what input) that Green must land first.
- **BLOCK** — the brief or plan itself is defective; state the defect and what
  the controller must fix before re-dispatch.

Paste actual test output for any claim about what fails or passes. Your report is
read by the controller, who decides — give verdicts and evidence, not narrative.
````

Create `plugins/wave/templates/project/skills/dispatch/SKILL.md`:

````markdown
---
name: dispatch
description: Use when dispatching or resuming a Codex implementer for a wave task, or cleaning up after one. Every codex run goes through this skill; raw codex exec and codex resume are permission-denied in this repo.
---

# Codex dispatch

All Codex implementer runs go through
`.claude/skills/dispatch/scripts/dispatch.sh`. The script owns the mechanics so
no dispatch can forget them; the controller owns everything the sandbox blocks.
Every knob (worktree root, branch prefix, env file, install command, models, log
dir) comes from `.claude/wave.env`, and the script exits 1 when that file is
missing.

## Commands

```bash
# New task, mechanical and well-specified (WAVE_MODEL_DEFAULT at WAVE_EFFORT_DEFAULT):
.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file>

# Multi-file or judgment task, on the judgment model. Your shell does not carry
# the wave variables, so source the config first, or write the model id out:
source .claude/wave.env
.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file> \
  --model "$WAVE_MODEL_JUDGMENT" --effort high

# Red to Green, or a fix round, on an existing task:
.claude/skills/dispatch/scripts/dispatch.sh resume <task-id> <prompt-file>

# What is still checked out:
.claude/skills/dispatch/scripts/dispatch.sh list

# After the merge:
.claude/skills/dispatch/scripts/dispatch.sh clean <task-id>
```

Runs take many minutes — invoke via Bash with `run_in_background: true` and read
the log under `WAVE_LOG_DIR` (`<task-id>.<timestamp>.log`); the final message
lands in `<task-id>.last.md`.

## What the script enforces (do not work around)

- A dedicated worktree at `<WAVE_WT_ROOT>/<task-id>` on branch
  `<WAVE_BRANCH_PREFIX>/<task-id>`: never the primary checkout, never
  `danger-full-access`, always `--sandbox workspace-write`.
- `WAVE_ENV_FILE` copied in. Without it, service-gated suites skip silently and
  the run reads green while proving nothing. An empty value means there is
  nothing to copy.
- Stdin terminated (`< /dev/null`) and the prompt read from a file into the
  argument: a piped prompt stalls the CLI, and inline quoting breaks in the shell.
- Resume by session ID found through the worktree path. `--last` is a footgun
  once sessions interleave, and `codex exec resume` ignores piped stdin, rejects
  `--sandbox` and `--output-last-message`, and does not restore the working
  directory, so the resume runs from inside the worktree.
- Exit codes survive the log pipe (`pipefail`): a failed run never reads as green.
- Kebab-case task ids only, and an existing worktree is refused rather than
  silently reused.

## What stays on the controller

- Write the prompt file: the task's statements and neighbours verbatim, BAN
  rules, and the refutation checklist for deletion-shaped tasks. Standing
  conventions live in `AGENTS.md` — do not re-type them into the brief.
- Commit the worktree's work. Codex cannot reach the shared git dir.
- Re-run the legs the sandbox blocks: service-gated suites and the build. A Codex
  green claim never covers them.
````

Create `plugins/wave/templates/project/skills/registry/SKILL.md`:

````markdown
---
name: registry
description: Use when reading or changing spec statements and findings — pulling a statement and its neighbours for a brief, checking what a wave still owns, listing open findings, or flipping rows after a merge. Writes go through the guarded script; raw UPDATE and DELETE are blocked by a hook.
---

# Registry access

One database holds the spec and the findings: `<WAVE_REGISTRY_DIR>/registry.db`,
where the directory is set in `.claude/wave.env` and the contract lives in
`<WAVE_REGISTRY_DIR>/README.md`. Execution agents never read it. They read the
projection `<WAVE_REGISTRY_DIR>/spec-exec.db`: approved statements only, no
rationale, no history.

Tables you touch most: `spec_statement(id, area, text, basis, status, stage,
parity_ref)` with `spec_ref` and `statement_history`; `finding(id, kind, title,
class, severity, status, description, impact, code_locus)` with `provenance`,
`decision` and `status_history`.

## Canonical reads

```bash
REG="$(git rev-parse --show-toplevel)/docs/registry"   # your WAVE_REGISTRY_DIR

# One statement:
sqlite3 -header "$REG/registry.db" \
  "SELECT id, area, stage, status, text FROM spec_statement WHERE id='<ID>';"

# Neighbours, same area — briefs carry these verbatim:
sqlite3 -header "$REG/registry.db" \
  "SELECT id, stage, text FROM spec_statement \
   WHERE area=(SELECT area FROM spec_statement WHERE id='<ID>') ORDER BY id;"

# Stage state across the whole spec:
sqlite3 "$REG/registry.db" \
  "SELECT stage, COUNT(*) FROM spec_statement GROUP BY stage;"

# What a wave still owns — the close invariant is 0:
sqlite3 "$REG/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE stage='W<N>';"

# Open findings, worst first:
sqlite3 -header "$REG/registry.db" \
  "SELECT id, severity, status, title FROM finding \
   WHERE status NOT IN ('fixed','refuted','wont-fix','superseded') \
   ORDER BY CASE severity WHEN 'blocker' THEN 0 WHEN 'major' THEN 1 \
                          WHEN 'minor' THEN 2 ELSE 3 END, id;"

# What an execution agent actually sees:
sqlite3 -header "$REG/spec-exec.db" \
  "SELECT id, area, stage, text, code_locus FROM spec WHERE id='<ID>';"
```

## Writes — guarded script only

Raw `UPDATE` and `DELETE` against the database files is blocked by a PreToolUse
hook. The script prints the full match list before touching anything, aborts on
zero matches, refuses a write without `--where`, appends the history row in the
same transaction as the update, and regenerates `spec-exec.db` after any
`spec_statement` write. `--note` is required for an update to `spec_statement`
or `finding`: it becomes the history row's note.

```bash
# Flip statements to parity after the merge is verified:
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --set "basis='parity-confirmed', stage='parity', parity_ref='src/app/page.ts:42'" \
  --where "id IN ('SP-picker-03','SP-picker-04')" \
  --note "W3 merged and verified on the branch"

# Update a finding's status:
.claude/skills/registry/scripts/registry-write.sh finding \
  --set "status='fixed'" --where "id='F-W3-01'" \
  --note "fixed in task 7, controller re-ran the suite"

# Delete — rare, needs an explicit ruling:
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --delete --where "id='SP-picker-99'"
```

`INSERT` of a new statement or finding is not destructive and may run as plain
`sqlite3`. Flips happen ONLY in the main checkout, never on a task branch: a
database file does not merge.
````

Create `plugins/wave/templates/project/registry/README.md`:

````markdown
# Registry (`registry.db`)

One SQLite database holds the normative spec and the findings record for this
repository. Sessions query structured data instead of re-reading markdown chains.
Markdown reports stay the prose source of record; the database is the index and
the live status.

`spec-exec.db` beside it is a generated projection: approved statements only, no
rationale, no history, no bans. Execution agents read the projection; the
registry itself is for the controller, the reviewers and the review panel. Never
edit the projection by hand, `tools/gen-spec-exec.py` regenerates it.

## The rule for every state change

> When a statement or a finding changes state, the history row is appended and
> the row updated in the same transaction. `registry-write.sh` does both and
> refuses the write without `--note`.

History is append-only: never edit a past row, add a new one. Refuted findings
stay in the database, refutations are knowledge.

Finding statuses: `confirmed | partial | refuted | static-unverified | fixed |
wont-fix | superseded`. Severities: `blocker | major | minor | info`.
Statement `basis`: `parity-confirmed | ruling | mockup | fix-target:<finding-id>`.
Statement `status` lifecycle: `proposed` → `approved | amended | rejected`, with
`flagged` for a statement the drafter cannot ground in a finding, a ruling or a
mockup. Flag, never invent.

## Schema

| table | purpose |
|---|---|
| `spec_statement` | one row per atomic, testable, plain-English END-STATE behavior. `id` = `SP-<area-slug>-<nn>`. Cols: `area, text, basis, status, stage, parity_ref`. No rationale column, by design: the "why" lives in `finding` and `decision` rows joined through `spec_ref`. Defective current behavior is ALWAYS written as its fixed end state (`basis: fix-target:<finding-id>`), never as-is. |
| `spec_ref` | many-to-many statement to grounding: `ref_type` (finding \| decision \| code \| mockup), `ref`. |
| `statement_history` | append-only trajectory per statement: `date, status, note, old_text`. |
| `finding` | one row per finding: `kind, title, class, severity, status, description, impact, code_locus`. |
| `provenance` | evidence traces, one row per trace: `source, ref, evidence`. |
| `decision` | owner rulings: `date, decided_by, ruling, consequences`. |
| `finding_decision` | many-to-many finding to decision. |
| `status_history` | append-only finding trajectory: `date, status, note`. |
| `ban_entry` | one row per banned string or named pattern: `banned_string, scope, match_hint, rationale_ref, code_loci, live, created`. |
| `meta` | key and value: schema version, created, source. |

## Contract (binding for all downstream agents)

1. **Plan and code agents receive spec statements verbatim.** The statement
   `text` is the acceptance criterion, cited by `id`.
2. **Reviewers verify against statements, not against code comments or old
   markdown specs.** Once the statements are approved, superseded markdown is
   stamped as such and the registry is the sole normative source.
3. **Execution agents are pointed at `spec-exec.db` only.** The projection
   carries `id, area, text, code_locus, stage` for approved statements and
   nothing else, so an agent cannot look up the rationale and rationalize its way
   around a statement.
4. **State changes append history, then update.** The same rule holds for
   statements and findings, and history is append-only.
5. **Every `statement_history` row carries `old_text`**: the full statement text
   as it stood before that row's change, captured in the same transaction as the
   new text. Write it even when the text does not change, because the row still
   answers "what did the owner approve?". The only legal NULL is a
   statement-creation row, where no prior text exists.
6. **Execution reconciles the registry to the built app.** Pre-build validation
   cannot prove a spec; holes surface while building. Every verified fix flips
   its statements' basis to `parity-confirmed` with fresh code refs in the same
   commit, and where the build shows a statement is wrong or unbuildable as
   worded, the statement is AMENDED then and there, not worked around.
7. **Global exclusivity is a liability; local exhaustiveness is fine.** A
   statement may exhaustively enumerate its OWN surface. Cross-surface
   quantifiers ("exactly one screen in the app…", "every form…") are reserved
   for deliberately ratified uniformity rules; anywhere else they collide with
   future feature work and force a formal undo. Default to plain descriptions of
   each surface and path, and when future work collides with an incidental
   global, amend the statement to scope it down. Statements describe the app,
   they do not freeze it.
8. **Stage and parity columns.** `stage` holds the wave that owns the statement
   (`W<n>`), `parity` (verified true on the branch), or `none` (a process
   statement with no app locus); NULL means not yet triaged. `parity_ref` holds
   the `file:line` evidence for the current parity verdict. Discharging a
   statement flips `basis` to `parity-confirmed`, `stage` to `parity`, sets
   `parity_ref`, and appends a history row noting the prior basis and stage.
   Wave-close invariant: `SELECT COUNT(*) FROM spec_statement WHERE stage='W<N>'`
   returns 0.
9. **Bans are enforcement data for the post-code gate, never input to a code
   agent.** `ban_entry` is verified by grep AFTER a wave is written and is
   EXCLUDED from the projection: an agent that has seen the ban list writes
   around the string instead of writing the right copy. Adding a ban requires a
   `rationale_ref`, `match_hint` says how the gate must search including the
   carve-outs where the string is required copy, and `code_loci` is evidence
   rather than a worklist, so re-grep before acting.

## Canonical queries (copy-paste)

```sh
cd docs/registry     # your WAVE_REGISTRY_DIR

# Statements for one area, delta statements first
sqlite3 -column -header registry.db "SELECT id,basis,status,text FROM spec_statement WHERE area='<area>' ORDER BY basis='parity-confirmed', id;"

# Grounding of one statement
sqlite3 -column -header registry.db "SELECT ref_type,ref FROM spec_ref WHERE statement_id='<ID>';"

# History of one statement, oldest first
sqlite3 -column -header registry.db "SELECT date,status,note,substr(old_text,1,60) FROM statement_history WHERE statement_id='<ID>' ORDER BY rowid;"

# Everything a wave still owns (the close invariant returns no rows)
sqlite3 -column -header registry.db "SELECT id,area,status,text FROM spec_statement WHERE stage='W<N>' ORDER BY id;"

# What the review panel will show
sqlite3 -column -header registry.db "SELECT id,area,status FROM spec_statement WHERE status IN ('proposed','flagged') ORDER BY area,id;"

# Open findings by severity, blocker first
sqlite3 -column -header registry.db "SELECT id,severity,title FROM finding WHERE status IN ('confirmed','partial') ORDER BY CASE severity WHEN 'blocker' THEN 0 WHEN 'major' THEN 1 WHEN 'minor' THEN 2 ELSE 3 END, id;"

# Full provenance of one finding
sqlite3 -column -header registry.db "SELECT source,ref,evidence FROM provenance WHERE finding_id='<ID>';"

# Open (unruled) decisions
sqlite3 -column -header registry.db "SELECT id,consequences FROM decision WHERE ruling IS NULL ORDER BY id;"

# Completeness: confirmed or partial findings no statement covers
sqlite3 -column -header registry.db "SELECT f.id,f.severity,f.title FROM finding f WHERE f.status IN ('confirmed','partial') AND f.id NOT IN (SELECT ref FROM spec_ref WHERE ref_type='finding') ORDER BY f.id;"

# Completeness: ruled decisions no statement discharges
sqlite3 -column -header registry.db "SELECT d.id,substr(d.ruling,1,70) ruling FROM decision d WHERE d.ruling IS NOT NULL AND TRIM(d.ruling)<>'' AND NOT EXISTS (SELECT 1 FROM spec_ref sr WHERE sr.ref_type='decision' AND (sr.ref=d.id OR sr.ref LIKE d.id||':%' OR sr.ref LIKE '%:'||d.id OR sr.ref LIKE '%:'||d.id||':%')) ORDER BY d.id;"

# Every ban still live in the tree, with where to look
sqlite3 -column -header registry.db "SELECT id,banned_string,scope,code_loci FROM ban_entry WHERE live=1 ORDER BY id;"

# What execution agents actually see
sqlite3 -column -header spec-exec.db "SELECT id,area,stage,text,code_locus FROM spec ORDER BY area,id;"
```

## Tools

| script | what it does |
|---|---|
| `tools/gen-spec-exec.py` | regenerates `spec-exec.db`: approved statements only, `code_locus` joined from the `spec_ref` rows of `ref_type='code'`, no bans. Run it after every statement write; `registry-write.sh` calls it for you. |
| `tools/gen-review-panel.py` | builds the local HTML review panel (`review/index.html`) with keep, change or remove per statement and a JSON export. Open the file in a browser. Never publish it as an artifact, artifacts block downloads. |
| `tools/ingest-review.py` | applies an export: keep sets `approved`, change replaces the text and sets `amended`, remove sets `rejected`, and each writes its history row with `old_text`. An export naming an unknown id is refused before any write lands. |

## The review round

The panel is how an owner approves statements. It writes one JSON file, and that
file is the only thing the ingest tool reads:

```json
{
  "generated": "2026-09-02",
  "verdicts": {
    "SP-picker-03": { "verdict": "keep" },
    "SP-picker-04": { "verdict": "change", "text": "the replacement statement", "note": "why" },
    "SP-picker-05": { "verdict": "remove", "note": "why" }
  }
}
```

`generated` is the ISO date the panel was exported. Each key of `verdicts` is a
statement id. `verdict` is `keep`, `change` or `remove`. `text` carries the
replacement and is required for `change`. `note` is optional everywhere and lands
in that statement's history row.

The round, end to end:

```sh
cd docs/registry     # your WAVE_REGISTRY_DIR

# 1. build the panel for everything still pending (proposed or flagged)
python3 tools/gen-review-panel.py --registry-dir . --pending-only

# 2. open review/index.html in a browser, decide every statement, export the JSON.
#    It is a local file on purpose: an artifact cannot hand you a download.

# 3. apply it: keep to approved, change to amended with the new text, remove to rejected
python3 tools/ingest-review.py ~/Downloads/review-export.json --registry-dir .

# 4. refresh what execution agents read
python3 tools/gen-spec-exec.py --registry-dir .

# 5. confirm the round is closed
sqlite3 registry.db "SELECT COUNT(*) FROM spec_statement WHERE status IN ('proposed','flagged');"
```

An export naming an id the registry does not have is refused before any write, so
a stale panel cannot half-apply. Step 5 returning anything but 0 means the panel
was exported before every statement had a verdict.
````

Create `plugins/wave/templates/project/settings.json`:

````json
{
  "permissions": {
    "deny": ["Bash(codex exec:*)", "Bash(codex resume:*)"],
    "allow": [
      "Bash(.claude/skills/dispatch/scripts/dispatch.sh:*)",
      "Bash(bash .claude/skills/dispatch/scripts/dispatch.sh:*)",
      "Bash(.claude/skills/registry/scripts/registry-write.sh:*)",
      "Bash(bash .claude/skills/registry/scripts/registry-write.sh:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/registry-guard.sh\""
          },
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/code-only-branch.sh\""
          }
        ]
      }
    ]
  }
}
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/templates.test.mjs`

Expected: PASS, no failing subtests.

The total is not a fixed number, because two loops generate one subtest per file
they find. The suite is 20 named tests, plus the discovery test, plus one subtest
per `.hbs` template under `templates/` and one per verbatim file under
`templates/project/`. In this task's own worktree the count is lower than in the
merged tree, because Tasks 7 and 8 land in a later batch and their files are not
there yet. The plan author ran the suite against a tree carrying 2 templates and
11 verbatim files: `ℹ tests 34 / ℹ pass 34 / ℹ fail 0`, which is 20 + 1 + 13.
Check the failure count, not the total.

- [ ] **Step 5: Commit**

```
git add plugins/wave/tests/templates.test.mjs plugins/wave/templates/project/AGENTS.md.hbs plugins/wave/templates/project/CLAUDE-section.md.hbs plugins/wave/templates/project/agents/red-gate.md plugins/wave/templates/project/skills/dispatch/SKILL.md plugins/wave/templates/project/skills/registry/SKILL.md plugins/wave/templates/project/registry/README.md plugins/wave/templates/project/settings.json && git commit -m "feat(wave): generalize the project templates and the settings fragment"
```

---

### Task 10: CLAUDE.md merge sections with machine-readable rules

**Files:**
- Create: `plugins/wave/templates/claude-md/sections.md`
- Test: `plugins/wave/tests/sections.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1).
- Consumes: the rule grammar fixed by ruling R1, which the setup skill (Task 11)
  parses: `<!-- rule: FORM; KEY: "VALUE" -->` on its own line above each block,
  forms `add-if-absent` (`heading`, `after`), `amend-bullet` (`section`,
  `bullet`, `match`), `append-bullets` (`section`, with every item line ending in
  `<!-- match: "…" -->`) and `never-touch` (`sections`, empty body), blocks
  applied in file order.
- Produces: `templates/claude-md/sections.md`, the only input to the setup
  skill's merge step. Every heading of the spec's merge-rule table appears in
  exactly one of the `heading`, `section` or `sections` values.

**The rule form, fixed by ruling R1 (Task 11 parses exactly this):**

The file is a `# ` title, a short preamble, then a sequence of blocks. Each block
is preceded by one comment alone on its line:

```
<!-- rule: FORM; KEY: "VALUE"; KEY: "VALUE" -->
```

The body runs from the line after that comment to the line before the next
`<!-- rule:` comment, or to end of file. Values are always double quoted, so no
value may contain a double quote. Blocks apply in file order, each seeing the
previous blocks' result. No line of the preamble starts with `<!-- rule:`.

| Form | Keys | Body |
|---|---|---|
| `add-if-absent` | `heading`, `after` | the whole section, starting with its own `## ` heading line, inserted after the section named by `after` when no heading matches `heading` |
| `amend-bullet` | `section`, `bullet`, `match` | one line, appended to the end of the bullet whose text after `- ` starts with `bullet`, unless `match` is already in the section |
| `append-bullets` | `section` | one or more item lines, each ending with `<!-- match: "…" -->`, appended at the end of the section unless that item's match literal is already there |
| `never-touch` | `sections` | empty; `sections` is the comma-separated list of headings that are never modified or reordered |

A heading may own several consecutive blocks, each with its own rule comment:
`## Test-Driven Development` takes an `amend-bullet` then an `append-bullets`,
and `## Planning Workflow` an `add-if-absent` then an `append-bullets`. A body
line that is only a `<!-- note: … -->` comment is an annotation for a human
reader: it is never an item and never reaches the target file. The `## Git`
block uses one to record that the identity lines and the push rule are the
recipient's.

Heading values carry their `## ` prefix and match by prefix, so
`## Test-Driven Development` matches a recipient heading
`## Test-Driven Development (mandatory)`.

Per ruling R22, headings and bullets are both compared after the list marker and
any emphasis markers are stripped. So every `bullet` value is written as plain
text: `Tests are a design conversation`, not
`**Tests are a design conversation**`, and `Commit cadence`, not
`**Commit cadence (atomic):**`. That one rule makes both anchors match both real
inputs, which write those bullets differently. The test pins the plain form and
rejects any value carrying `- `, `*` or `_`.

A body's trailing blank line separates it from the next rule comment and is not
part of the body. An `amend-bullet` body is therefore exactly one line.

**Why the block order is what it is:** the two `## Test-Driven Development`
blocks run before the `## Multi-Model Execution` block, so that section is
complete before another one is inserted after it. `## Planning Workflow` is
anchored `after` `## Multi-Model Execution`, which the block above it has already
guaranteed to exist. `## Archival` is anchored after `## Documentation`, which
puts it where the owner's own file keeps it, between Documentation and Git.

**Anchors relied on (pasted from the two real inputs):**

`grep -n '^## ' ~/.claude/CLAUDE.md` (the owner's current file):

```
3:## User
9:## System Paths
12:## Python Development
17:## JavaScript/React Development
23:## Code Quality
30:## Workflow
38:## Test-Driven Development (mandatory for all languages)
52:## Multi-Model Execution (plan-driven waves)
60:## Planning Workflow
70:## Security
75:## Documentation
81:## Archival
85:## Git
101:## File Access
105:## Hooks & Automation (configured in ~/.claude/settings.json)
108:## Preferences
```

`grep -n '^## ' plugins/claude-team/templates/CLAUDE.md.pl.hbs` (the old
template, which is the shape of a recipient's generated file):

```
3:## User
6:## Communication
9:## Python Development
14:## JavaScript/React Development
20:## Code Quality
27:## Workflow
33:## Test-Driven Development (mandatory)
46:## Planning Workflow
54:## Security
59:## Documentation
64:## Git
77:## File Access
81:## Hooks & Automation (configured in ~/.claude/settings.json)
88:## Preferences
```

What that output settles: `## Multi-Model Execution` and `## Archival` are absent
from a generated recipient file, so both are `add-if-absent` and both will fire.
`## Communication` exists in the generated file but not in the owner's, and
`## System Paths` the other way round; both are `never-touch`, so a missing
never-touch heading is normal and must not be reported as a defect.

The bullets the amend rules anchor on, pasted from the same two files:

```
owner   40:- **Tests are a design conversation** (solo work): Jakub can reason about edge cases and business logic much better in test descriptions than in raw code — use that. In plan-driven wave execution the approved plan plus risk-scaled adversarial gates are the checkpoint; test files are not individually presented
owner   87:- **Commit cadence (atomic):** one commit per phase, per plan task, or per passing test cycle. During plan-driven execution (following a root `plan.md` or `docs/superpowers/plans/*` file), commit at each completed step WITHOUT waiting for explicit approval — the plan itself is the authorization. This overrides the Claude Code default "never commit without asking" within plan execution. Frequent small commits are fine and rarely an issue in practice.
template 35:- **Tests are a design conversation**: present test files for approval before writing implementation code
template 66:- Commit cadence: one commit per phase, per plan task, or per passing test cycle
```

Both files carry a bullet that normalizes to `Tests are a design conversation`
and one that normalizes to `Commit cadence`, which is why R22 strips the list
marker and the emphasis markers before comparing, and why both `bullet` values
are written as plain text. The plan author checked both anchors against both
files under that normalization:

```
TDD   owner     anchor matches
TDD   fixture   anchor matches
Git   owner     anchor matches
Git   fixture   anchor matches
```

On the owner's own file the `match` probe fires first, so the bullet prefix is
never consulted there in practice; the anchor still resolving is what makes the
rule safe on a file that has been hand-edited into either style.

**Both inputs, checked block by block.** The plan author ran every block's
probe against the owner's real `~/.claude/CLAUDE.md` and against a render of
`CLAUDE.md.pl.hbs`, scoped to the block's own section:

```
block             owner file    rendered old template
amend TDD         no-op         FIRES
append TDD        no-op         FIRES
add MME           no-op         FIRES (add)
append Workflow 1 no-op         FIRES
append Workflow 2 no-op         FIRES
append Workflow 3 no-op         FIRES
add Planning      no-op         no-op
append Planning   no-op         FIRES
add Archival      no-op         FIRES (add)
amend Git         no-op         FIRES
append Git        no-op         FIRES
```

The owner's file is already compliant, so a run against it changes nothing, which
is the property the spec's hand-check asks for. A generated file gains nine of
the eleven; `## Planning Workflow` is already there, so only its sentence is
appended. Two probes were rewritten to reach that state: `Review checkpoints`
also occurs in the generated file's Planning Workflow section and `progress.md`
in its hooks section, so the probes are `ARE the review checkpoints` and
`only when the project is big enough`, which occur nowhere else in either file.

**Rules for this task:**
- De-personalize every canonical line: no owner name, no organisation, no machine
  path. Write "the owner" or "you".
- Keep the wording otherwise byte-identical to the owner's file where a line
  exists there, em-dashes included. A reworded line produces a spurious diff on a
  file that already carries the rule.
- Every `match` literal must already appear, inside its own section, in a file
  that carries the rule. That is what makes a second `/wave:setup` run a no-op.
  Pick a literal that is unambiguous file-wide as well as within the section, so
  the block behaves the same whether the skill probes the section or the file.
- No line of the preamble may start with `<!-- rule:`, or the setup skill parses
  it as a block. Write the grammar inline in a sentence, never as a standalone
  example line.
- No quoted value may contain a double quote, because the grammar defines no
  escaping.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/sections.test.mjs`:

````js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const SECTIONS = join(PLUGIN_ROOT, 'templates', 'claude-md', 'sections.md')
const text = readFileSync(SECTIONS, 'utf8')
const lines = text.split('\n')

// Every heading of the spec's merge-rule table.
const TABLE_HEADINGS = [
  '## Multi-Model Execution',
  '## Test-Driven Development',
  '## Workflow',
  '## Planning Workflow',
  '## Git',
  '## Archival',
  '## User',
  '## Communication',
  '## System Paths',
  '## Preferences',
]

const NEVER_TOUCH = ['## User', '## Communication', '## System Paths', '## Preferences']

// The keys each form carries, per ruling R1.
const FORM_KEYS = {
  'add-if-absent': ['after', 'heading'],
  'amend-bullet': ['bullet', 'match', 'section'],
  'append-bullets': ['section'],
  'never-touch': ['sections'],
}

const RULE_LINE = /^<!-- rule: ([a-z-]+)((?:; [a-z]+: "[^"]*")*) -->$/

function parse(source) {
  const all = source.split('\n')
  const blocks = []
  all.forEach((line, index) => {
    if (!line.startsWith('<!-- rule:')) return
    const m = RULE_LINE.exec(line)
    blocks.push({ line, index, form: m ? m[1] : null, rawKeys: m ? m[2] : '', body: [] })
  })
  blocks.forEach((block, n) => {
    const end = n + 1 < blocks.length ? blocks[n + 1].index : all.length
    block.body = all.slice(block.index + 1, end)
    while (block.body.length && block.body[block.body.length - 1].trim() === '') block.body.pop()
  })
  return blocks
}

const keysOf = (block) => {
  const out = {}
  for (const m of block.rawKeys.matchAll(/; ([a-z]+): "([^"]*)"/g)) out[m[1]] = m[2]
  return out
}

// A body line that is only a note comment is an annotation, never an item.
const isNote = (line) => line.trim().startsWith('<!-- note:')
const itemsOf = (block) => block.body.filter((l) => l.trim() !== '' && !isNote(l))

const blocks = parse(text)
const withForm = (form) => blocks.filter((b) => b.form === form)
const forSection = (form, section) =>
  blocks.find((b) => b.form === form && keysOf(b).section === section)
const added = (heading) => blocks.find((b) => keysOf(b).heading === heading)
const bodyText = (block) => block.body.join('\n')

function targetsOf(block) {
  const k = keysOf(block)
  if (block.form === 'never-touch') return k.sections.split(', ')
  return [k.heading ?? k.section]
}

test('the preamble opens no block of its own', () => {
  const first = lines.findIndex((l) => l.startsWith('<!-- rule:'))
  assert.ok(first > 0, 'no rule comment found in the file')
  assert.ok(
    !lines.slice(0, first).some((l) => l.startsWith('<!-- rule:')),
    'a preamble line starts a block',
  )
})

test('every rule comment matches the grammar', () => {
  assert.ok(blocks.length >= 10, `expected at least ten blocks, found ${blocks.length}`)
  for (const block of blocks) {
    assert.match(block.line, RULE_LINE, `malformed rule comment: ${block.line}`)
  }
})

test('every form is known and carries exactly its own keys', () => {
  for (const block of blocks) {
    const expected = FORM_KEYS[block.form]
    assert.ok(expected, `unknown form: ${block.form}`)
    assert.deepEqual(
      Object.keys(keysOf(block)).sort(),
      expected,
      `${block.line}: wrong key set for ${block.form}`,
    )
  }
})

test('no quoted value carries a double quote, which the grammar cannot escape', () => {
  for (const block of blocks) {
    for (const [key, value] of Object.entries(keysOf(block))) {
      assert.ok(!value.includes('"'), `${block.form}.${key} carries a double quote`)
    }
  }
})

test('every heading of the merge-rule table is covered by a block', () => {
  const covered = [...new Set(blocks.flatMap(targetsOf))].sort()
  assert.deepEqual(covered, TABLE_HEADINGS.slice().sort())
})

test('the never-touch block names the four recipient sections and has an empty body', () => {
  const nt = withForm('never-touch')
  assert.equal(nt.length, 1, 'one never-touch block covers all four sections')
  assert.deepEqual(keysOf(nt[0]).sections.split(', '), NEVER_TOUCH)
  assert.deepEqual(
    nt[0].body.filter((l) => l.trim() !== ''),
    [],
  )
})

test('an add-if-absent body opens with its own heading line and anchors to a heading', () => {
  const adds = withForm('add-if-absent')
  assert.equal(adds.length, 3, 'Multi-Model Execution, Planning Workflow and Archival are added')
  for (const block of adds) {
    const k = keysOf(block)
    assert.equal(block.body[0], k.heading, `${k.heading}: the body must open with its heading line`)
    assert.ok(k.after.startsWith('## '), `${k.heading}: the after anchor must be a heading`)
  }
})

test('an amend-bullet body is one line carrying its own match probe', () => {
  const amends = withForm('amend-bullet')
  assert.equal(amends.length, 2, 'only the TDD and Git bullets are amended')
  for (const block of amends) {
    const k = keysOf(block)
    const body = itemsOf(block)
    assert.equal(body.length, 1, `${k.section}: an amend-bullet body is exactly one line`)
    assert.ok(
      body[0].includes(k.match),
      `${k.section}: the match probe is not in the text the rule appends`,
    )
    assert.ok(!body[0].startsWith('.'), `${k.section}: the skill supplies the sentence separator`)
  }
})

test('every append-bullets item line carries a match comment naming text in that item', () => {
  const appends = withForm('append-bullets')
  assert.equal(appends.length, 4, 'TDD, Workflow, Planning Workflow and Git each append')
  for (const block of appends) {
    const items = itemsOf(block)
    assert.ok(items.length > 0, `${keysOf(block).section}: no item lines`)
    for (const item of items) {
      const m = /<!-- match: "([^"]+)" -->$/.exec(item)
      assert.ok(m, `item line without a trailing match comment: ${item}`)
      const withoutComment = item.replace(/\s*<!-- match: "[^"]+" -->$/, '')
      assert.ok(
        withoutComment.includes(m[1]),
        `the match literal must appear in the appended text: ${item}`,
      )
    }
  }
})

test('the Test-Driven Development blocks run before anything is inserted after that section', () => {
  const tdd = blocks.filter((b) => keysOf(b).section === '## Test-Driven Development')
  assert.deepEqual(
    tdd.map((b) => b.form),
    ['amend-bullet', 'append-bullets'],
  )
  const mme = added('## Multi-Model Execution')
  assert.equal(keysOf(mme).after, '## Test-Driven Development')
  for (const block of tdd) {
    assert.ok(
      block.index < mme.index,
      'the section must be finished before another section is inserted after it',
    )
  }
})

test('Planning Workflow is added before its sentence is appended, anchored to a section added earlier', () => {
  const pw = blocks.filter((b) => (keysOf(b).heading ?? keysOf(b).section) === '## Planning Workflow')
  assert.deepEqual(
    pw.map((b) => b.form),
    ['add-if-absent', 'append-bullets'],
  )
  const anchor = added(keysOf(pw[0]).after)
  assert.ok(anchor, `the anchor ${keysOf(pw[0]).after} is not added by any block`)
  assert.ok(anchor.index < pw[0].index, 'the anchor section must exist by the time this block runs')
})

test('Git amends the cadence bullet and appends the squash rule, touching neither identity nor push', () => {
  const git = blocks.filter((b) => keysOf(b).section === '## Git')
  assert.deepEqual(
    git.map((b) => b.form),
    ['amend-bullet', 'append-bullets'],
  )
  const all = git.map(bodyText).join('\n')
  assert.ok(all.includes('the plan itself is the authorization'))
  assert.ok(all.includes('Squash is optional'))
  assert.ok(!all.includes('user.email'), 'the identity lines are not canonical text')
  assert.ok(!all.includes('git config'), 'the identity lines are not canonical text')
  assert.ok(!all.includes('Push:'), "the push rule stays the recipient's")
  const note = git.flatMap((b) => b.body).find(isNote)
  assert.ok(note, 'the Git block must record the identity and push constraint as a note')
  assert.ok(note.includes('identity') && note.includes('push'), `note too vague: ${note}`)
})

test('a note line is an annotation, never an item and never an amend body', () => {
  const notes = blocks.flatMap((b) => b.body.filter(isNote))
  assert.ok(notes.length > 0, 'at least one note line is expected')
  for (const note of notes) {
    assert.match(note.trim(), /^<!-- note: .+ -->$/, `malformed note line: ${note}`)
    assert.ok(!/<!-- match: /.test(note), 'a note line carries no match comment')
  }
  for (const block of blocks) {
    assert.ok(
      !itemsOf(block).some(isNote),
      `${block.line}: a note line leaked into the item list`,
    )
  }
})

test('bullet prefixes are plain text, matched after the list and emphasis markers are stripped', () => {
  assert.equal(
    keysOf(forSection('amend-bullet', '## Test-Driven Development')).bullet,
    'Tests are a design conversation',
  )
  assert.equal(keysOf(forSection('amend-bullet', '## Git')).bullet, 'Commit cadence')
  for (const block of withForm('amend-bullet')) {
    const { bullet } = keysOf(block)
    assert.ok(!bullet.startsWith('- '), `${bullet}: the list marker is stripped before matching`)
    assert.ok(!/[*_]/.test(bullet), `${bullet}: emphasis markers are stripped before matching`)
  }
})

test('the wave exception and the Multi-Model section carry their canonical text', () => {
  const amend = bodyText(forSection('amend-bullet', '## Test-Driven Development'))
  assert.ok(
    amend.includes(
      'In plan-driven wave execution the approved plan plus risk-scaled adversarial gates are the checkpoint; test files are not individually presented',
    ),
    'the wave exception sentence is missing or reworded',
  )
  assert.ok(
    bodyText(forSection('append-bullets', '## Test-Driven Development')).includes(
      '**Review checkpoints**',
    ),
  )
  const mme = bodyText(added('## Multi-Model Execution'))
  assert.ok(mme.includes('Codex implements'), 'the role split is missing')
  assert.ok(mme.includes('read the repo root `AGENTS.md`'), 'the AGENTS.md rule is missing')
  assert.ok(mme.includes('Process weight scales to risk'), 'the gate-scaling rule is missing')
  assert.ok(mme.includes('never debugs in-thread'), 'the delegation rule is missing')
})

test('Workflow appends the running-log, subagent and compaction items', () => {
  const wf = bodyText(forSection('append-bullets', '## Workflow'))
  assert.ok(wf.includes('`progress.md`'))
  assert.ok(wf.includes('save everything to the workspace file'))
  assert.ok(wf.includes('Compact context between phases'))
})

test('Planning Workflow carries the supersede sentence and Archival its archive path', () => {
  assert.ok(bodyText(forSection('append-bullets', '## Planning Workflow')).includes('supersede'))
  assert.ok(bodyText(added('## Archival')).includes('docs/archive/'))
})

test('the canonical text is de-personalized', () => {
  assert.ok(!text.includes('Jakub'), 'the owner name survived')
  assert.ok(!text.includes('OIL'), 'the organisation survived')
  assert.ok(!text.includes('/Users/'), 'a machine path survived')
})
````

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/sections.test.mjs`

Expected: FAIL. The file fails to load: the top-level `readFileSync` throws
before any subtest runs, so node reports no subtests at all.

```
Error: ENOENT: no such file or directory, open '<repo>/plugins/wave/templates/claude-md/sections.md'
    at readFileSync (node:fs:539:20)
    at file:///<repo>/plugins/wave/tests/sections.test.mjs:8:14
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/templates/claude-md/sections.md`:

````markdown
# Canonical CLAUDE.md sections

The wave method needs a handful of sections in the global `~/.claude/CLAUDE.md`.
This file carries each one together with the rule that says how to merge it into
a file that already exists and may have been hand-edited. The setup skill reads
this file, applies the blocks in file order, shows a unified diff and writes only
after the recipient confirms.

Each block is preceded by one comment line of the form
`<!-- rule: FORM; KEY: "VALUE"; KEY: "VALUE" -->`, and the block body runs from
the line after that comment to the line before the next rule comment. Values are
always double quoted and never contain a double quote. Four forms:

- `add-if-absent`, keys `heading` and `after`: when no heading matches `heading`,
  insert the body, which opens with its own heading line, after the section named
  by `after`. When the heading is already there, change nothing and report the
  section as left alone.
- `amend-bullet`, keys `section`, `bullet` and `match`: when `match` is already
  in that section, change nothing. Otherwise append the one-line body to the end
  of the bullet whose text after the list marker starts with `bullet`, and change
  no other line.
- `append-bullets`, key `section`: append each item line of the body, without its
  trailing match comment, at the end of that section, skipping any item whose
  match literal is already there.
- `never-touch`, key `sections`: those sections are never modified and never
  reordered. The body is empty.

A body line that is only a `<!-- note: … -->` comment is an annotation for
whoever reads this file. It is never an item, and it is never written into the
target.

Headings and bullets both match by prefix, and both are compared after stripping
the list marker and any emphasis markers. So `## Test-Driven Development` matches
a recipient heading `## Test-Driven Development (mandatory)`, and the bullet
prefix `Commit cadence` matches both `- Commit cadence: …` and
`- **Commit cadence (atomic):** …`. Write every `bullet` value as plain text,
without a leading `- ` and without `*` or `_`. A never-touch heading that is
absent is normal and is not a finding. When a
rule's anchor is missing because the file was hand-edited, propose the closest
placement in the diff and name the rule. Never skip an anchor silently.

<!-- rule: amend-bullet; section: "## Test-Driven Development"; bullet: "Tests are a design conversation"; match: "risk-scaled adversarial gates are the checkpoint" -->
In plan-driven wave execution the approved plan plus risk-scaled adversarial gates are the checkpoint; test files are not individually presented

<!-- rule: append-bullets; section: "## Test-Driven Development" -->
- **Review checkpoints**: TDD gates (test files presented before implementation) ARE the review checkpoints. For business-logic questions that surface mid-execution, stop — don't guess. Those belong in brainstorming or at a checkpoint, never inside implementation. <!-- match: "ARE the review checkpoints" -->

<!-- rule: add-if-absent; heading: "## Multi-Model Execution"; after: "## Test-Driven Development" -->
## Multi-Model Execution
- Role split: Codex implements; Opus red-teams and reviews; the controller session plans, orchestrates, verifies, and never implements. Implementation tokens stay off the Claude weekly quota; Claude sits on the adversarial side.
- Implementer agents read the repo root `AGENTS.md`, not CLAUDE.md. Implementer conventions live there; CLAUDE.md stays controller/reviewer-side; dispatch briefs carry task specifics only.
- Sandboxing implementers is the controller's job, enforced programmatically in the dispatch command (dedicated git worktree, restrictive sandbox flags).
- Process weight scales to risk: adversarial gates on tasks that are high-risk, deletion-shaped, or refutation-critical (multiple ways to fake Green); a standing refutation checklist may stand in for the gate on mechanical, named-trap deletions; task review on everything; batch adjacent small tasks into shared dispatches.
- Commit-gate hooks don't cover subagent/worktree work — the controller re-runs full suites before any green claim.
- The controller delegates, never debugs in-thread: a failing suite, database or build leg goes to a subagent that owns "make it green" and returns only root cause + outcome. Keep subagent reports, review verdicts, and diffs in workspace files, not the context window — carry forward only verdicts, findings, and file:line rulings. Context bloat is self-inflicted, not wave-inherent.

<!-- rule: append-bullets; section: "## Workflow" -->
- Maintain `progress.md` (root) only when the project is big enough to warrant a running log — skip it for small features where per-feature plans carry their own history <!-- match: "only when the project is big enough" -->
- When using subagents they have to save everything to the workspace file; final message ≤5 lines: status + key findings + counts + path <!-- match: "save everything to the workspace file" -->
- Compact context between phases when executing long superpowers plans <!-- match: "Compact context between phases" -->

<!-- rule: add-if-absent; heading: "## Planning Workflow"; after: "## Multi-Model Execution" -->
## Planning Workflow
Tool choice, from lightest to heaviest:
1. **Desktop app** → root `spec.md` only (initial ideation).
2. **`/ultraplan`** → small projects. Takes the root spec, produces the plan. Fast, compact output.
3. **Superpowers** → larger projects and non-trivial features. `brainstorming` → `writing-plans` → **`subagent-driven-development`** Per-feature files under `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>*.md`.

Brainstorming always comes first for superpowers work.

<!-- rule: append-bullets; section: "## Planning Workflow" -->
When superpowers files are created, they **supersede** the root `spec.md`: brainstorming refines the earlier ideation further, so the per-feature file becomes authoritative. The root stays as historical ideation context. <!-- match: "becomes authoritative" -->

<!-- rule: add-if-absent; heading: "## Archival"; after: "## Documentation" -->
## Archival
- When project-level `CLAUDE.md`, `SPAWN_PROMPT*.md`, `spec.md`, or similar long-lived docs change substantially (not typo fixes), archive the old version to `docs/archive/<filename>_<function>.md` BEFORE editing.
- Small projects can skip the archive folder. Small edits don't need archival.

<!-- rule: amend-bullet; section: "## Git"; bullet: "Commit cadence"; match: "the plan itself is the authorization" -->
During plan-driven execution (following a root `plan.md` or a `docs/superpowers/plans/*` file), commit at each completed step WITHOUT waiting for explicit approval — the plan itself is the authorization. This overrides the Claude Code default "never commit without asking" within plan execution. Frequent small commits are fine and rarely an issue in practice.

<!-- rule: append-bullets; section: "## Git" -->
<!-- note: the identity lines and the push rule belong to the recipient. Never rewrite, reorder or remove them. -->
- **Squash is optional, not mandatory:** many small WIP commits during plan execution are fine to keep as-is. Squash working steps into logical units at feature completion only if the history feels noisy in retrospect — don't squash defensively. <!-- match: "Squash is optional" -->

<!-- rule: never-touch; sections: "## User, ## Communication, ## System Paths, ## Preferences" -->
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/sections.test.mjs`

Expected: PASS, no failing subtests. The plan author ran this suite against the
file above: `ℹ tests 18 / ℹ pass 18 / ℹ fail 0`.

- [ ] **Step 5: Commit**

```
git add plugins/wave/templates/claude-md/sections.md plugins/wave/tests/sections.test.mjs && git commit -m "feat(wave): add the CLAUDE.md merge sections with machine-readable rules"
```

### Task 11: skill `setup`

**Executor: the controller, not a Codex implementer.** Steps 2 and 4 dispatch a general-purpose
subagent and compare its output against a fixture. A sandboxed implementer has no subagent tool,
so a Codex run of this task can only produce a fabricated baseline. If you are Codex, stop and
report `NEEDS_CONTEXT`.

**Files:**
- Create: `plugins/wave/tests/fixtures/claude-md.old-template.md`
- Create: `plugins/wave/tests/scenarios/setup-baseline.md`
- Create: `plugins/wave/skills/setup/SKILL.md`
- Test: `plugins/wave/tests/scenarios/setup-baseline.md` (the scenario IS the test; its two runs
  are recorded in `.superpowers/sdd/2026-09-02-wave-plugin/baseline-setup.md`, which lives under
  the gitignored workspace directory and is never committed)

**Interfaces:**
- Consumes: `plugins/wave/templates/claude-md/sections.md` (Task 10). Task 10 must emit exactly
  this rule-comment syntax, one HTML comment on its own line immediately above each block:
  `<!-- rule: <form>; <key>: "<value>"; <key>: "<value>" -->`. Forms and their keys:
  `add-if-absent` (`heading`, `after`), `amend-bullet` (`section`, `bullet`, `match`),
  `append-bullets` (`section`; every item line in the body ends with `<!-- match: "..." -->`),
  `never-touch` (`sections`, empty body). A block body runs from the line after its rule comment
  to the line before the next `<!-- rule:` comment or end of file. Blocks are applied in file
  order and a later block reads the file as the earlier ones left it, so `## Planning Workflow`
  carries an `add-if-absent` block before its `append-bullets` block.
- Consumes: `plugins/claude-team/templates/CLAUDE.md.pl.hbs` (already in the repo, read only).
  It is the source of the fixture and it is not modified.
- Produces: `plugins/wave/skills/setup/SKILL.md`, skill name `setup`, invoked by
  `plugins/wave/commands/setup.md` (Task 1).
- Produces: `plugins/wave/tests/fixtures/claude-md.old-template.md`, the canonical "recipient's
  file before wave" input for any later CLAUDE.md work.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/fixtures/claude-md.old-template.md`. It is
`plugins/claude-team/templates/CLAUDE.md.pl.hbs` rendered with `ABOUT_YOU` = `Backend developer
at a medical chamber`, `GIT_EMAIL` = `anna.kowalska@example.org`, `GIT_NAME` = `AnnaKowalska`,
`SHELL` = `zsh`. The em-dashes and arrows below are the template's own bytes and stay as they are.
File ends with a single newline after `sycophancy`.

```markdown
# Global Preferences

## User
Backend developer at a medical chamber

## Communication
- Output language: Polish when for external use, English otherwise

## Python Development
- Use `uv` for environment and package management
- Prefer Python where suitable
- Project structure: src layout with tests/ directory

## JavaScript/React Development
- Use `npm` for package management
- Vite for project scaffolding and build
- TypeScript always (type safety from day one)
- Tailwind CSS for styling

## Code Quality
- Type safety: where beneficial (Python type hints, TypeScript)
- Python: `ruff check`, `ruff format`, `pytest`
- JavaScript/React: `eslint` (typescript-eslint + react-hooks plugin), `prettier` (no semis, single quotes), `vitest`
- Testing (React): Vitest + React Testing Library + jsdom; test files co-located as `Component.test.tsx`; `vitest/globals` enabled
- All formatting and linting runs automatically via PostToolUse hooks — do not run manually

## Workflow
- Start with planning on any new project or significant feature
- Adhere strictly to the current spec and plan
- Stop for approval at review checkpoints — TDD gates are the usual anchor
- Mark phases/tasks DONE in the active plan file as you go

## Test-Driven Development (mandatory)
- **Always write tests BEFORE implementation** — Red → Green → Refactor
- **Tests are a design conversation**: present test files for approval before writing implementation code
- **Test descriptions in plain language**: `it('shows warning when confidence is low')` not `it('renders ConfidenceBadge with variant=warning when answer.confidence === low')`
- **Cycle**:
  1. Write test file describing expected behavior + edge cases
  2. Run tests — confirm they fail (Red)
  3. Review tests — discuss edge cases, missing scenarios, business logic
  4. Implement minimum code to pass (Green)
  5. Refactor if needed — tests catch regressions
- **What to test**: behavior and outcomes, not implementation details
- **Edge cases first**: null values, empty arrays, boundary conditions, error states

## Planning Workflow
Tool choice, from lightest to heaviest:
1. **Desktop app** → root `spec.md` only (initial ideation)
2. **`/ultraplan`** → small projects
3. **Superpowers** → larger projects. `brainstorming` → `writing-plans` → `subagent-driven-development`. Per-feature files under `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>*.md`.

Brainstorming always comes first for superpowers work. Review checkpoints (TDD gates) pause for explicit approval.

## Security
- Validate input at system boundaries
- Environment variables for secrets
- Follow OWASP guidelines

## Documentation
- README.md for each project
- Docstrings for public functions
- API examples where applicable

## Git
- Initialize git at project creation, BEFORE any code is written
- Commit cadence: one commit per phase, per plan task, or per passing test cycle
- Commit messages: conventional commits (`feat/fix/chore/docs/refactor/test`), imperative present
- Push: only when explicitly asked
- .gitignore:
  - Python: .venv, __pycache__, .pytest_cache, *.pyc, .ruff_cache
  - JavaScript: node_modules, dist, .env.local
  - Common: .env
- Identity:
  - git config user.email "anna.kowalska@example.org"
  - git config user.name "AnnaKowalska"

## File Access
- Never read office documents (.docx, .doc, .xlsx, .xls, .pptx, .ppt, .odt, .ods, .odp, .rtf, .pages, .numbers, .key) or PDFs without explicit user permission
- Read permissions for common dev/text file types are auto-approved in settings.json

## Hooks & Automation (configured in ~/.claude/settings.json)
- **PostToolUse**: auto-format + auto-lint on every file edit (ruff for Python, Prettier + ESLint for JS/TS)
- **PreToolUse**: protected files (.env*, lock files) blocked from editing; git commit/push gates run tsc + vitest (JS/TS) and ruff + pytest (Python) — blocks on failure
- **PostToolUse**: test files (*.test.*, *.spec.*) reviewed for tautological assertions, missing negative cases
- **PostCompact**: extracts current phase from plan.md + last 20 lines of progress.md, injects as context
- Do not duplicate hook work manually — hooks handle formatting, linting, and commit gating

## Preferences
- Shell: zsh
- Keep solutions simple
- Keep me honest — say if I am wrong. No points for sycophancy
```

The fixture carries four traps on purpose. Its TDD heading is `## Test-Driven Development
(mandatory)`, so a rule anchored on `## Test-Driven Development` only matches under prefix
matching. It has no `## Multi-Model Execution` and no `## Archival`, so both `add-if-absent`
rules must fire. Its `## User`, `## Communication`, `## Preferences` sections and its git
identity lines are the personal content that must survive byte for byte. Its "Tests are a design
conversation" bullet is the single line an `amend-bullet` rule may touch.

Create `plugins/wave/tests/scenarios/setup-baseline.md`:

````markdown
# Baseline scenario: merging the wave rules into a global CLAUDE.md

Run this twice: once before `plugins/wave/skills/setup/SKILL.md` exists (RED) and once after it
exists (GREEN). Record both runs in
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-setup.md`.

## Setup

The executor runs this, not the agent. It rebuilds the scenario directory from scratch each time.

```bash
set -eu
REPO="$(git rev-parse --show-toplevel)"
SCEN="${TMPDIR:-/tmp}/wave-setup-baseline"
rm -rf "$SCEN"; mkdir -p "$SCEN"
cp "$REPO/plugins/wave/tests/fixtures/claude-md.old-template.md" "$SCEN/CLAUDE.md"
cp "$REPO/plugins/wave/tests/fixtures/claude-md.old-template.md" "$SCEN/CLAUDE.md.orig"
cp "$REPO/plugins/wave/templates/claude-md/sections.md" "$SCEN/sections.md"
echo "SCEN=$SCEN"
ls -1 "$SCEN"
```

## RED prompt

Dispatch a general-purpose subagent with the block below as its entire task, with `<SCEN>`
replaced by the path the setup printed. Do not mention the wave plugin. Do not give the agent the
skill.

```
This is real work on a real file. Do it now, in one pass. I am waiting on it.

<SCEN>/CLAUDE.md is my global Claude Code instructions file. <SCEN>/sections.md holds the
multi-model orchestration rules I want in it, with a merge rule above each block.

Add the multi-model orchestration rules to this CLAUDE.md.

Work only inside <SCEN>. Do not read or write anything under ~/.claude. Do not read anything
under plugins/wave/skills/. When you are done, say what you changed.
```

## GREEN prompt

Re-run the setup, then dispatch the same agent type with the identical prompt plus this first
line:

```
Use the skill at <REPO>/plugins/wave/skills/setup/SKILL.md. Follow it.
```

## What to record, verbatim

1. The agent's own account of what it changed, quoted.
2. `diff -u <SCEN>/CLAUDE.md.orig <SCEN>/CLAUDE.md`, pasted whole.
3. `ls -1 <SCEN>`, so a missing backup is visible.
4. Whether a unified diff was shown before the write, with the quote that proves it.
5. One row per failure class observed, each with the quote that evidences it.

Expected RED failure classes, from the spec's baseline risk note: the agent substitutes personal
sections instead of merging, writes without a backup, and writes without showing a diff first.
Record what actually happens, including classes not on this list.

## Acceptance, GREEN run

| Check | Command | Pass |
|---|---|---|
| Only amend-bullet lines are removed | `diff -u <SCEN>/CLAUDE.md.orig <SCEN>/CLAUDE.md > <SCEN>/merge.diff; grep -c '^-[^-]' <SCEN>/merge.diff` | `2` |
| and they are the right two | `grep '^-[^-]' <SCEN>/merge.diff` | the old "Tests are a design conversation" bullet and the old "Commit cadence" bullet, nothing else |
| About-you line untouched | `grep -c 'Backend developer at a medical chamber' <SCEN>/CLAUDE.md` | `1` |
| Git identity untouched | `grep -c 'anna.kowalska@example.org' <SCEN>/CLAUDE.md` | `1` |
| Preferences untouched | `grep -c 'No points for sycophancy' <SCEN>/CLAUDE.md` | `1` |
| No duplicated TDD section | `grep -c '^## Test-Driven Development' <SCEN>/CLAUDE.md` | `1` |
| Wave section added once | `grep -c '^## Multi-Model Execution' <SCEN>/CLAUDE.md` | `1` |
| Archival section added once | `grep -c '^## Archival' <SCEN>/CLAUDE.md` | `1` |
| Backup present | `ls -1 <SCEN>/CLAUDE.md.pre-wave-*.bak` | exactly one path |
| Diff shown before the write | transcript | yes, with the quote |

A GREEN run that fails any row is a REFACTOR, not a pass: add the counter to the skill's
rationalization table and red flags, then re-run from a fresh setup.
````

- [ ] **Step 2: Run the baseline to verify it fails**

Run: the Setup block of `plugins/wave/tests/scenarios/setup-baseline.md`, then dispatch one
general-purpose subagent with the RED prompt, then the ten acceptance commands.

Expected: FAIL. At least one acceptance row fails, and in practice the removed-lines row fails
first because the agent rewrites whole sections. Create
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-setup.md` with this shape and fill it from the
run. Nothing is invented: every quote is copied from the transcript, every command output is
pasted.

```markdown
# Baseline: wave setup, global CLAUDE.md merge

Scenario: plugins/wave/tests/scenarios/setup-baseline.md

## Run 1, RED, no skill

Date:
Agent type:

### What the agent said it did

> (verbatim)

### diff -u CLAUDE.md.orig CLAUDE.md

```
(pasted whole)
```

### ls -1 <SCEN>

```
(pasted)
```

### Failure classes

| # | Class | Evidence, verbatim |
|---|---|---|

### Acceptance table result

| Check | Result |
|---|---|

## Run 2, GREEN, with the skill

(same five sections, plus the acceptance table with every row passing)
```

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/skills/setup/SKILL.md` with exactly this content. It addresses the three
expected failure classes with the form each one needs: substitution gets a positive recipe naming
the only four edits that may reach the file, the missing backup gets a required receipt field,
and the missing diff gets a step that cannot be reordered.

````markdown
---
name: setup
description: Use when the user runs /wave:setup, asks to set the wave method up on this machine, asks whether Codex is ready for dispatch, or asks to add the multi-model orchestration rules to the global CLAUDE.md.
---

# wave setup

## Overview

One run per machine. It makes the global layer ready for waves: Codex reachable, superpowers
enabled, and the multi-model rules merged into the global `CLAUDE.md`.

**The merge is a merge, never a substitution.** The file is the recipient's record of their own
decisions. What you write is their file with the blocks from `sections.md` inserted, one bullet
extended, and nothing else different: same order, same wording, same personal sections, byte for
byte.

## Hard rules

- **Never run an install yourself.** Print the command, ask the user to paste it, wait for
  "done". This covers `npm install -g`, `codex login`, and every `/plugin install`.
- **Back up before the first byte changes.** No backup path in the receipt means you did not earn
  the write.
- **Show the unified diff and wait for a yes** before writing `CLAUDE.md`.
- **Idempotent.** Every step checks first. A second run reports `left` everywhere and writes
  nothing.
- **Never block.** A failed step emits the diagnostic block and asks how to proceed.

## Paths

- Plugin root: `${CLAUDE_PLUGIN_ROOT}` when it is set, else the directory three levels above this
  file.
- Sections file: `<plugin root>/templates/claude-md/sections.md`.
- Target: `~/.claude/CLAUDE.md`. If the user names a different file, use that path and say which
  file you touched in the receipt.

## Step 1: Codex preflight

Run `codex --version`.

- Prints a version, for example `codex-cli 0.146.0`: record it and continue.
- Not found: present this, do not run it.

  ```
  npm install -g @openai/codex
  ```

  Wait for "done", then run `codex --version` again. Still missing: diagnostic block.

Run `codex login status`.

- `Logged in using ChatGPT`: continue.
- Anything else: present this, do not run it.

  ```
  codex login
  ```

  Say that it opens a browser and that it needs a ChatGPT plan that includes Codex. Wait for
  "done", then re-run `codex login status`.

Do not write `~/.codex/config.toml`. Sandbox and model policy live in the dispatch script that
`/wave:init` installs, so each project carries its own copy and nothing is global.

## Step 2: superpowers check

Run:

```bash
node -e 'const fs=require("fs"),os=require("os");const p=os.homedir()+"/.claude/settings.json";const j=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):{};console.log((j.enabledPlugins||{})["superpowers@claude-plugins-official"]===true?"enabled":"absent")'
```

- `enabled`: continue.
- `absent`: present this, do not run it.

  ```
  /plugin install superpowers@claude-plugins-official
  ```

  Wait for "done", then re-run the probe.

Read that file, change nothing in it. Hooks, permissions and every other key belong to the
claude-team baseline the recipient already runs.

## Step 3: merge the sections into CLAUDE.md

### 3a. Read the target

Missing: say so, and offer to create it holding only the blocks from `sections.md` in file order.
Only on an explicit yes; then go to 3e with an empty original.

### 3b. Back up, once per run

```bash
BAK="$HOME/.claude/CLAUDE.md.pre-wave-$(date +%Y%m%d-%H%M%S).bak"; cp "$HOME/.claude/CLAUDE.md" "$BAK"; echo "$BAK"
```

Keep the printed path for the receipt. If a `CLAUDE.md.pre-wave-*.bak` already exists from this
run, reuse it rather than making a second one.

### 3c. Read the rules

Read `<plugin root>/templates/claude-md/sections.md`. Each block is preceded by one HTML comment
on its own line:

```
<!-- rule: <form>; <key>: "<value>"; <key>: "<value>" -->
```

The block body runs from the line after that comment to the line before the next `<!-- rule:`
comment, or to the end of the file. Values are always double quoted. Apply the blocks in file
order, and let each one read the file as the earlier ones left it.

A body line starting with `<!-- note:` is an annotation addressed to you, not content. Every form
skips those lines and none of them ever reaches the target file. The `## Git` block carries one,
the reminder that the recipient's identity lines and push rule stay untouched.

| Form | Keys | What you do |
|---|---|---|
| `add-if-absent` | `heading`, `after` | A heading matching `heading` is already in the file: change nothing, report `left`. Otherwise insert one blank line and then the body verbatim, after the last non-blank line of the section whose heading matches `after`. Report `added`. |
| `amend-bullet` | `section`, `bullet`, `match` | The section whose heading matches `section` already contains the literal `match`: change nothing, report `left`. Otherwise find the first line in that section that starts with `- ` and whose text after `- ` starts with `bullet`, and append the body to the end of that one line: `. ` before it when the line does not already end in `.`, `;` or `:`, one space when it does. Change no other line. Report `amended`. |
| `append-bullets` | `section` | For each item line of the body, in order, a line starting with `<!-- note:` being an annotation rather than an item: the section whose heading matches `section` already contains that item's `match` literal, report `left`; otherwise append the item, without its trailing match comment, after the last non-blank line of that section. An item that starts with `- ` is a bullet and is appended directly. An item that does not is a paragraph, so put one blank line before it and it renders as its own paragraph rather than joining the list above. Report `added`. |
| `never-touch` | `sections` | Do not modify the named sections, their content or their position. The body is empty. |

Every heading that no rule names is never touched either.

### 3d. Anchor matching

A heading value matches a line in the file when both, lowercased and stripped of leading `#`
characters and surrounding spaces, agree over the full length of the value. The line may carry
more text after it.

So `## Test-Driven Development` matches `## Test-Driven Development (mandatory)`. A file rendered
from the older claude-team template carries exactly that parenthetical. Demanding an exact string
here is how this skill silently adds a second TDD section. Never do that.

A `bullet` value matches the same way, after one more removal on both sides: the list marker
(`- `, `* `, `1. `) and the emphasis characters `*` and `_`. So
`bullet: "**Tests are a design conversation**"` matches its line whether or not the file still
carries the bold markers, and `bullet: "Commit cadence"` matches
`- Commit cadence: one commit per phase, per plan task, or per passing test cycle`.

A section runs from its heading to the line before the next `## ` heading, or to the end of the
file.

Anchor not found: never skip silently. Report it as

```
anchor missing: <form> for "<heading>"; "<after>" not found, proposed after "<closest heading>"
```

and put the insertion at the proposed place inside the diff, so the user judges it. When no
placement is defensible, leave the block out and report `anchor missing: not placed`, so the user
can paste it by hand.

### 3e. Build the result

Apply the rules to a copy and write it to `~/.claude/CLAUDE.md.wave.tmp`. Exactly four kinds of
edit may reach that file:

1. whole blocks inserted after an anchor section, from `add-if-absent`
2. one bullet line extended by one sentence, from `amend-bullet`
3. item lines appended at the end of a section, from `append-bullets`
4. nothing else

Not reordering. Not rewrapping. Not replacing the file with a tidier version. Not restating the
recipient's `## User` line in your own words. Not dropping a section the wave blocks seem to
supersede. If the removed lines in the step 3f diff are anything other than the bullets an
`amend-bullet` rule named, you did the wrong thing: delete the temp file and build it again. One
removed line per `amend-bullet` rule that fired, and no others. Today's `sections.md` carries two
such rules, the "Tests are a design conversation" bullet under `## Test-Driven Development` and
the "Commit cadence" bullet under `## Git`, so on a file rendered from the older claude-team
template the diff removes exactly those two lines.

### 3f. Diff, then write

```bash
diff -u "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.wave.tmp"
```

`diff` exits 1 when the files differ. That is the expected case here, not an error. Show the
whole diff, list any anchor-missing lines above it, and ask in one message: write this, yes or
no.

- yes: `mv "$HOME/.claude/CLAUDE.md.wave.tmp" "$HOME/.claude/CLAUDE.md"`
- no: `rm "$HOME/.claude/CLAUDE.md.wave.tmp"`, keep the backup, report that nothing was written.

## Step 4: receipt

Print every field, including the empty ones.

```
wave setup
- codex: <version | not installed>
- codex login: <ok | pending>
- superpowers: <enabled | install command given>
- target: <path of the merged file>
- backup: <absolute path | none, the file did not exist>
- added: <headings | none>
- amended: <section, bullet prefix | none>
- left: <headings that already carried the content | none>
- anchor missing: <rule and proposed placement | none>
- next: run /wave:init inside a repository
```

## Red flags, stop and redo the step

- You are about to write the file and no diff has been shown.
- The diff removes any line other than an amended bullet.
- You are copying `sections.md` over the target instead of merging into it.
- No `.pre-wave-*.bak` path exists yet.
- A rule's anchor was not found and you moved on.
- You are about to run an install command yourself.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The old sections say roughly the same thing, cleaner to replace them" | Their file records their decisions. The merge adds; it never rewords. |
| "The heading is `## Test-Driven Development (mandatory)`, so the section the rule names is absent" | Anchor matching is prefix matching. A second TDD section is a defect, not a merge. |
| "The user reads the file afterwards, the diff is a formality" | The diff is where a wrong anchor gets caught. Before the write, not after. |
| "I will back up at the end if something goes wrong" | The write is the thing that goes wrong. Backup first, path in the receipt. |
| "`npm install -g` is one command, faster if I run it" | Global installs land in a shell you cannot see. Paste and confirm. |
| "The anchor is missing, so this block does not apply to their setup" | It applies. Propose a placement in the diff and let them judge. |

## When something fails

```
┌─ Something went wrong ───────────────────────────
│ Tried: <plain language>
│ Error: <last 10 lines of stderr>
└──────────────────────────────────────────────────
[WAVE DIAGNOSTIC]
plugin: wave 0.1.0
skill: setup
step: <N>
os: <uname -s>
command: <the command that failed>
exit_code: <N>
stderr: |
  <stderr>
[/DIAGNOSTIC]
```

Then ask whether to retry, skip this step, or stop. Never continue silently past a failed step.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: the Setup block again, then the GREEN prompt, then the ten acceptance commands.

Expected: PASS on every row, in particular exactly two removed lines and both of them amended
bullets. Append Run 2 to
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-setup.md` in the same shape as Run 1, with the
acceptance table showing each row's result.

If the RED run produced a failure class the skill does not answer, or the GREEN run fails a row,
that is the REFACTOR half of the cycle: add one rationalization row and one red flag naming that
specific behaviour, then re-run from a fresh setup. Repeat until every row passes. Record each
iteration under its own heading, so the file shows the cycle rather than only the last run.

- [ ] **Step 5: Commit**

```
git add plugins/wave/skills/setup/SKILL.md plugins/wave/tests/fixtures/claude-md.old-template.md plugins/wave/tests/scenarios/setup-baseline.md && git commit -m "feat(wave): setup skill with the global CLAUDE.md merge"
```

`.superpowers/` is gitignored in this repository, so the baseline record stays a workspace file
and is deliberately not in this commit.

---

### Task 12: skill `init`

**Executor: the controller, not a Codex implementer.** Steps 2 and 4 dispatch a general-purpose
subagent against a throwaway repository. A sandboxed implementer has no subagent tool. If you are
Codex, stop and report `NEEDS_CONTEXT`.

**Files:**
- Create: `plugins/wave/tests/scenarios/init-baseline.md`
- Create: `plugins/wave/skills/init/SKILL.md`
- Test: `plugins/wave/tests/scenarios/init-baseline.md` (the scenario IS the test; its two runs
  are recorded in `.superpowers/sdd/2026-09-02-wave-plugin/baseline-init.md`, under the gitignored
  workspace directory, not committed)

**Interfaces:**
- Consumes: `plugins/wave/scripts/render.mjs` (Task 2), CLI
  `node scripts/render.mjs <template> <knobs.json> [--out <file>]`, exit 1 with
  `render: missing knobs: A, B` when a `{{KEY}}` survives.
- Consumes: `plugins/wave/scripts/merge-settings.mjs` (Task 3), CLI
  `node scripts/merge-settings.mjs <settings.json> <fragment.json>`; it makes its own
  `.pre-wave-<TS>.bak`, creates a missing target as `{}`, prints one line per change and
  `no changes` otherwise.
- Consumes: the knobs key list, exactly `REPO_NAME, WT_ROOT, BRANCH_PREFIX, ENV_FILE,
  INSTALL_CMD, MODEL_DEFAULT, EFFORT_DEFAULT, MODEL_JUDGMENT, LOG_DIR, REGISTRY_DIR, REGISTRY,
  TEST_CMD, BUILD_CMD, TEST_BIN_HINT, VITEST, HOUSE_CONVENTIONS, EXTERNAL_KEYS`.
- Consumes: every file under `plugins/wave/templates/project/` (Tasks 4, 5, 6, 7, 8, 9).
- Consumes from Task 9: `AGENTS.md.hbs` marks its house-conventions TODO block with the two
  literal lines `<!-- wave:todo-house-conventions -->` and `<!-- /wave:todo-house-conventions -->`,
  and `CLAUDE-section.md.hbs` opens with the heading `## Wave dispatch (controller-side)`.
- Produces: `plugins/wave/skills/init/SKILL.md`, skill name `init`, invoked by
  `plugins/wave/commands/init.md` (Task 1).
- Produces: the scaffolded repository layout that the `running-waves` skill (Task 15) points at,
  and the `.claude/wave.env` that `dispatch.sh`, `registry-write.sh` and both hooks read.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/scenarios/init-baseline.md`:

````markdown
# Baseline scenario: scaffolding wave tooling into a repository

Run this twice: once before `plugins/wave/skills/init/SKILL.md` exists (RED) and once after
(GREEN). Record both runs in `.superpowers/sdd/2026-09-02-wave-plugin/baseline-init.md`.

## Setup

The executor runs this, not the agent. It builds a throwaway pnpm repository from scratch. The
pre-existing `.claude/settings.json` is what makes the missing-backup failure visible, and the
`.gitignore` deliberately omits `node_modules/` so the dependency-directory check has something
to find.

```bash
set -eu
REPO="$(git rev-parse --show-toplevel)"
SCEN="${TMPDIR:-/tmp}/wave-init-baseline"
rm -rf "$SCEN"; mkdir -p "$SCEN"
cd "$SCEN"
git init -q -b main
cat > package.json <<'JSON'
{
  "name": "demo",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "test": "vitest run",
    "build": "vite build",
    "lint": "eslint ."
  }
}
JSON
: > pnpm-lock.yaml
printf 'DATABASE_URL=postgres://localhost:5432/demo\n' > .env.local
printf '.env.local\n' > .gitignore
mkdir -p .claude
cat > .claude/settings.json <<'JSON'
{
  "permissions": { "allow": ["Bash(pnpm test:*)"] },
  "statusLine": { "type": "command", "command": "ccstatusline" }
}
JSON
git add -A
git -c user.email=demo@example.org -c user.name=demo commit -q -m "chore: demo repo"
echo "SCEN=$SCEN"
echo "PLUGIN_ROOT=$REPO/plugins/wave"
git -C "$SCEN" log --oneline
```

## RED prompt

Dispatch a general-purpose subagent with the block below as its entire task, with `<SCEN>` and
`<PLUGIN_ROOT>` replaced by the paths the setup printed. Do not give the agent the skill.

```
This is real work on a real repository. Do it now.

<SCEN> is a git repository. The wave plugin's project templates are in
<PLUGIN_ROOT>/templates/project/ and its scripts in <PLUGIN_ROOT>/scripts/.

Set up Codex dispatch tooling in this repo from the templates in <PLUGIN_ROOT>.

Work only inside <SCEN>. Do not read anything under <PLUGIN_ROOT>/skills/. When you are done,
list the files you wrote.
```

## GREEN prompt

Re-run the setup, then dispatch the same agent type with the identical prompt plus this first
line:

```
Use the skill at <REPO>/plugins/wave/skills/init/SKILL.md. Follow it.
```

Answer its knobs question with `defaults`, and give it three lines of house conventions so the
TODO-block deletion is exercised. Accept its offer to ignore `node_modules/`.

## What to record, verbatim

1. The agent's own list of files it wrote, quoted.
2. `grep -rn '{{' <SCEN>/.claude <SCEN>/AGENTS.md <SCEN>/CLAUDE.md`, pasted whole.
3. `cat <SCEN>/.claude/settings.json`, pasted whole.
4. `ls -1 <SCEN>/.claude`, so a missing backup is visible.
5. `cat <SCEN>/.gitignore`.
6. One row per failure class observed, each with its evidence.

Expected RED failure classes, from the spec's baseline risk note: placeholders left in the
written files, the permission deny rules missing, and no backup of the existing
`.claude/settings.json`. Record what actually happens, including classes not on this list.

## Acceptance, GREEN run

| Check | Command | Pass |
|---|---|---|
| No placeholder survives | `grep -rn '{{' <SCEN>/.claude <SCEN>/AGENTS.md <SCEN>/CLAUDE.md` | no output |
| Deny rules present | `node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log((j.permissions&&j.permissions.deny||[]).join("\n"))' <SCEN>/.claude/settings.json` | both `Bash(codex exec:*)` and `Bash(codex resume:*)` |
| Existing settings preserved | `node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(j.statusLine),(j.permissions.allow||[]).includes("Bash(pnpm test:*)"))' <SCEN>/.claude/settings.json` | the ccstatusline object and `true` |
| Backup present | `ls -1 <SCEN>/.claude/settings.json.pre-wave-*.bak` | exactly one path |
| Scripts executable | `test -x <SCEN>/.claude/skills/dispatch/scripts/dispatch.sh && test -x <SCEN>/.claude/hooks/code-only-branch.sh && echo ok` | `ok` |
| wave.env complete | `grep -c '^WAVE_' <SCEN>/.claude/wave.env` | `10` |
| Detection landed, env file | `grep '^WAVE_ENV_FILE=' <SCEN>/.claude/wave.env` | `WAVE_ENV_FILE=.env.local` |
| Detection landed, install | `grep '^WAVE_INSTALL_CMD=' <SCEN>/.claude/wave.env` | the pnpm install command |
| House conventions replaced the TODO | `grep -c 'wave:todo-house-conventions' <SCEN>/AGENTS.md` | `0` |
| Log dir ignored | `grep -c '^\.superpowers/dispatch-logs/$' <SCEN>/.gitignore` | `1` |
| Dependency dir ignored | `grep -c '^node_modules/$' <SCEN>/.gitignore` | `1`, and the setup did not put it there |

A GREEN run that fails any row is a REFACTOR, not a pass.
````

- [ ] **Step 2: Run the baseline to verify it fails**

Run: the Setup block of `plugins/wave/tests/scenarios/init-baseline.md`, then one
general-purpose subagent with the RED prompt, then the eleven acceptance commands.

Expected: FAIL. The placeholder row fails first in practice, because an agent without the skill
copies `AGENTS.md.hbs` and `wave.env.hbs` rather than running the renderer. Create
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-init.md` with the same shape as
`baseline-setup.md`: Run 1 heading, the agent's quoted account, the pasted command outputs, a
failure-class table, and the acceptance table result.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/skills/init/SKILL.md` with exactly this content.

````markdown
---
name: init
description: Use when the user runs /wave:init, asks to scaffold the wave dispatch tooling into a repository, asks to add the Codex dispatch skill, the wave hooks, the red-gate agent or the statement registry to a project, or asks to refresh that tooling after a plugin update.
---

# wave init

## Overview

Scaffolds one repository from the plugin's templates: `.claude/wave.env`, the dispatch and
registry skills, the two hooks, the red-gate agent, `AGENTS.md`, a `CLAUDE.md` section, the
registry, and the settings entries that make the whole thing enforceable.

**Templates are rendered, never hand-filled.** Every `.hbs` file goes through
`scripts/render.mjs` with the knobs file. A value you type into a template by hand produces a
file the next `/wave:init` cannot refresh, and a `{{KEY}}` you miss ships as literal text into
the contract an implementer reads.

## Hard rules

- **Render with the script.** Never substitute a `{{KEY}}` yourself and never edit a rendered
  file to correct a value. Fix the knobs file and render again.
- **Back up before every overwrite**, as `<name>.pre-wave-<TS>.bak`, with one timestamp for the
  whole run.
- **Ask the knobs in one message.** Do not interview the user knob by knob.
- **Merge `settings.json` with `scripts/merge-settings.mjs`.** Never rewrite that file by hand.
- **Show a diff and wait for a yes** before appending to `AGENTS.md` or the project `CLAUDE.md`.
- **Never block.** A failed step emits the diagnostic block and asks how to proceed. A dirty tree
  is reported, not refused.

## Paths

- Plugin root: `${CLAUDE_PLUGIN_ROOT}` when it is set, else the directory three levels above this
  file. Call it `PLUGIN_ROOT` below.
- Repo root: `git rev-parse --show-toplevel`. Every relative path below is from there.
- Knobs file: `${TMPDIR:-/tmp}/wave-knobs.json`. Delete it in step 9.
- Run timestamp: run `date +%Y%m%d-%H%M%S` once, at the start of step 5, and use that one literal
  string in every backup name for the whole run.

## Step 1: preconditions

```bash
git rev-parse --show-toplevel
[ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ] && echo main-checkout || echo linked-worktree
git status --porcelain | head -20
```

- The first command fails: this is not a git repository. Stop and say so.
- `linked-worktree`: stop. Say that `/wave:init` runs in the main checkout, because the tooling it
  writes is what creates worktrees.
- `git status --porcelain` prints lines: report the dirty tree in one line and continue. Refusing
  on a dirty tree is not this skill's job.

## Step 2: detect

Run these five from the repo root. They are numbered so the table below can point at them; none
of them writes anything.

```bash
basename "$(git rev-parse --show-toplevel)"
ls -1 .env.local .env 2>/dev/null | head -1
ls -1 pnpm-lock.yaml package-lock.json yarn.lock uv.lock 2>/dev/null
node -e 'const s=require(process.cwd()+"/package.json").scripts||{};for(const k of Object.keys(s))console.log(k+"\t"+s[k])'
test -f pyproject.toml && grep -nE '^\[tool\.(pytest|ruff|uv)' pyproject.toml
```

| Knob | From | Rule |
|---|---|---|
| `REPO_NAME` | command 1 | as printed |
| `WT_ROOT` | nothing | `../<REPO_NAME>-wt` |
| `ENV_FILE` | command 2 | the first hit; no output means the empty string, and an empty `ENV_FILE` makes dispatch skip the copy |
| package manager | command 3 | the first hit drives `INSTALL_CMD` and `TEST_BIN_HINT`; no output means you ask in step 3 |
| `TEST_CMD`, `BUILD_CMD`, `VITEST` | command 4 | `<pm> test` and `<pm> build` when those scripts exist; `BUILD_CMD` is empty when there is no build script; `VITEST` is `true` when the test script names vitest |
| python fallback | command 5 | no `package.json`: `TEST_CMD` is `uv run pytest`, `BUILD_CMD` is empty, `VITEST` is `false` |

Command 4 fails loudly when there is no `package.json`; that is the signal to use command 5.

| Lockfile | `INSTALL_CMD` | `TEST_BIN_HINT` |
|---|---|---|
| `pnpm-lock.yaml` | `pnpm install --prefer-offline --silent` | `./node_modules/.bin/<runner>` |
| `package-lock.json` | `npm ci --silent` | `./node_modules/.bin/<runner>` |
| `yarn.lock` | `yarn install --frozen-lockfile --silent` | `./node_modules/.bin/<runner>` |
| `uv.lock` | `uv sync --frozen` | `.venv/bin/pytest` |
| none found | ask; an empty value skips provisioning | ask |

`<runner>` is the first word of the `test` script, for example `vitest` or `jest`. When that word
is `node`, `TEST_BIN_HINT` is empty. The hint exists because the package manager launcher hangs in
the Codex sandbox and the implementer needs the binary path instead.

## Step 3: ask the knobs, once

Send one message. Defaults in brackets. Say that `defaults` accepts all of them.

```
Wave scaffold for <REPO_NAME>. Reply "defaults" to take every bracketed value.

1. Worktree root [../<REPO_NAME>-wt]
2. Task branch prefix [codex]
3. Implementer models: mechanical [gpt-5.6-terra], judgment [gpt-5.6-sol], effort [medium]
4. Statement registry, a SQLite spec and findings database with guarded writes? [yes]
   directory [docs/registry]
5. Dispatch log directory [.superpowers/dispatch-logs]
6. House conventions: three to five lines for AGENTS.md, the indirections an implementer in this
   repo must not bypass. Skipping leaves a marked TODO block in AGENTS.md.
7. Env var names masked when you seal a wave, space separated, for example OPENAI_API_KEY [none]

Detected: package manager <pm>, env file <ENV_FILE or none>, test "<TEST_CMD>",
build "<BUILD_CMD or none>", test binary "<TEST_BIN_HINT or none>".
```

## Step 4: write the knobs file

Write `${TMPDIR:-/tmp}/wave-knobs.json` with all seventeen keys and no others. `REGISTRY` and
`VITEST` are JSON booleans; every other value is a string, and `BUILD_CMD`,
`HOUSE_CONVENTIONS`, `EXTERNAL_KEYS` and `ENV_FILE` may be empty strings.

```json
{
  "REPO_NAME": "demo",
  "WT_ROOT": "../demo-wt",
  "BRANCH_PREFIX": "codex",
  "ENV_FILE": ".env.local",
  "INSTALL_CMD": "pnpm install --prefer-offline --silent",
  "MODEL_DEFAULT": "gpt-5.6-terra",
  "EFFORT_DEFAULT": "medium",
  "MODEL_JUDGMENT": "gpt-5.6-sol",
  "LOG_DIR": ".superpowers/dispatch-logs",
  "REGISTRY_DIR": "docs/registry",
  "REGISTRY": true,
  "TEST_CMD": "pnpm test",
  "BUILD_CMD": "pnpm build",
  "TEST_BIN_HINT": "./node_modules/.bin/vitest",
  "VITEST": true,
  "HOUSE_CONVENTIONS": "",
  "EXTERNAL_KEYS": "OPENAI_API_KEY"
}
```

When the registry is off, `REGISTRY` is `false` and `REGISTRY_DIR` is the empty string. An empty
`WAVE_REGISTRY_DIR` is what makes both hooks pass silently on a repository without a registry.

## Step 5: render

Take the run timestamp now. Back up `.claude/wave.env` first if it exists.

```bash
PLUGIN_ROOT="<absolute plugin root>"
KNOBS="${TMPDIR:-/tmp}/wave-knobs.json"
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/wave.env.hbs" "$KNOBS" --out .claude/wave.env
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/AGENTS.md.hbs" "$KNOBS" --out "${TMPDIR:-/tmp}/wave-AGENTS.md"
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/CLAUDE-section.md.hbs" "$KNOBS" --out "${TMPDIR:-/tmp}/wave-CLAUDE-section.md"
```

`render.mjs` exits 1 with `render: missing knobs: A, B` when a placeholder survives. That is the
renderer telling you the knobs file is incomplete: add the key and run it again. Never patch the
output.

`AGENTS.md` and the project `CLAUDE.md` render to temp files because step 7 appends them section
by section.

House conventions, on the rendered `${TMPDIR:-/tmp}/wave-AGENTS.md`:

```bash
# HOUSE_CONVENTIONS is non-empty: drop the TODO block entirely
sed -i.bak '/<!-- wave:todo-house-conventions -->/,/<!-- \/wave:todo-house-conventions -->/d' "${TMPDIR:-/tmp}/wave-AGENTS.md" && rm "${TMPDIR:-/tmp}/wave-AGENTS.md.bak"

# HOUSE_CONVENTIONS is empty: keep the TODO text, drop only the two marker lines
sed -i.bak '/wave:todo-house-conventions/d' "${TMPDIR:-/tmp}/wave-AGENTS.md" && rm "${TMPDIR:-/tmp}/wave-AGENTS.md.bak"
```

Run exactly one of those two. `-i.bak` is the form that works on both BSD and GNU sed.

## Step 6: copy the rest verbatim

Everything under `templates/project/` that does not end in `.hbs` is copied byte for byte, so the
next plugin update refreshes it by re-running this skill. Run this as one block, with
`PLUGIN_ROOT` and `TS` filled in as literals.

```bash
set -eu
cd "$(git rev-parse --show-toplevel)"
PLUGIN_ROOT="<absolute plugin root>"
TS="<the run timestamp>"
REGISTRY_DIR="<the REGISTRY_DIR knob, empty without a registry>"
copy() {
  mkdir -p "$(dirname "$2")"
  if [ -f "$2" ]; then cp "$2" "$2.pre-wave-$TS.bak"; echo "backup $2.pre-wave-$TS.bak"; fi
  cp "$PLUGIN_ROOT/templates/project/$1" "$2"; echo "wrote $2"
}
copy hooks/code-only-branch.sh                .claude/hooks/code-only-branch.sh
copy hooks/registry-guard.sh                  .claude/hooks/registry-guard.sh
copy skills/dispatch/SKILL.md                 .claude/skills/dispatch/SKILL.md
copy skills/dispatch/scripts/dispatch.sh      .claude/skills/dispatch/scripts/dispatch.sh
copy agents/red-gate.md                       .claude/agents/red-gate.md
```

With a registry, add these seven, in the same shell call so `copy`, `PLUGIN_ROOT`, `TS` and
`REGISTRY_DIR` are still defined:

```bash
copy skills/registry/SKILL.md                 .claude/skills/registry/SKILL.md
copy skills/registry/scripts/registry-write.sh .claude/skills/registry/scripts/registry-write.sh
copy registry/README.md                       "$REGISTRY_DIR/README.md"
copy registry/schema.sql                      "$REGISTRY_DIR/schema.sql"
copy registry/tools/gen-spec-exec.py          "$REGISTRY_DIR/tools/gen-spec-exec.py"
copy registry/tools/gen-review-panel.py       "$REGISTRY_DIR/tools/gen-review-panel.py"
copy registry/tools/ingest-review.py          "$REGISTRY_DIR/tools/ingest-review.py"
```

`registry-guard.sh` is copied in both cases. The settings fragment installs it as a hook
unconditionally, and a hook command pointing at a file that does not exist fails on every Bash
call. Without a registry it reads an empty `WAVE_REGISTRY_DIR` and exits 0.

Then the settings merge:

```bash
node "$PLUGIN_ROOT/scripts/merge-settings.mjs" .claude/settings.json "$PLUGIN_ROOT/templates/project/settings.json"
```

It makes its own backup, creates the file as `{}` when absent, unions the allow and deny lists,
appends hook entries whose command is not already there, preserves every other key, and prints
one line per change. Read its output into the receipt. Do not open that file in an editor
afterwards.

Then make the shell files executable:

```bash
chmod +x .claude/hooks/*.sh .claude/skills/dispatch/scripts/dispatch.sh
chmod +x .claude/skills/registry/scripts/registry-write.sh   # with a registry only
```

The Python tools stay non-executable: `registry-write.sh` and the playbook call them through
`python3 <path>`.

## Step 7: AGENTS.md and the project CLAUDE.md

`AGENTS.md` is the implementer's contract, so a repository that already has one keeps every
section it wrote itself.

- No `AGENTS.md`: copy the rendered temp file to `AGENTS.md`, report `created`.
- It exists:
  1. `grep -n '^## ' "${TMPDIR:-/tmp}/wave-AGENTS.md"` and `grep -n '^## ' AGENTS.md`.
  2. For each rendered heading absent from the repository's file, by the same prefix, lowercased
     comparison, append that whole section to a copy at `AGENTS.md.wave.tmp`, in rendered order,
     one blank line between sections. Never edit a section the repository already has.
  3. Back up, `diff -u AGENTS.md AGENTS.md.wave.tmp`, wait for a yes, then `mv`.

Project `CLAUDE.md`:

```bash
grep -q '^## Wave dispatch (controller-side)' CLAUDE.md
```

- Found: leave the file alone, report `left`.
- Not found, or no `CLAUDE.md`: append the rendered section, or create the file holding just it,
  with the same backup, diff and confirm.

## Step 8: registry database and .gitignore

With a registry:

```bash
command -v sqlite3 >/dev/null && echo sqlite3-ok || echo sqlite3-missing
test -f "$REGISTRY_DIR/registry.db" || sqlite3 "$REGISTRY_DIR/registry.db" < "$REGISTRY_DIR/schema.sql"
```

Never run the schema against a database that already exists. `sqlite3-missing`: say so in the
receipt, print the one command the user runs once they install it, and carry on. Everything else
in the scaffold works without it.

The log directory never belongs in git:

```bash
[ -f .gitignore ] && [ -n "$(tail -c1 .gitignore)" ] && printf '\n' >> .gitignore
grep -qxF '<LOG_DIR>/' .gitignore 2>/dev/null || printf '%s\n' '<LOG_DIR>/' >> .gitignore
```

The first line exists because a `.gitignore` without a trailing newline would otherwise get the
entry glued onto its last line.

Then check the dependency directory: `node_modules` under npm, pnpm or yarn, `.venv` under uv.
Skip this whole check when step 2 detected no package manager.

```bash
git check-ignore -q <dep-dir> && echo ignored || echo not-ignored
```

`not-ignored` is worth one question. Say why before you ask: `dispatch.sh clean` refuses to remove
a worktree that holds untracked files, and `WAVE_INSTALL_CMD` fills `<dep-dir>` inside every
worktree with thousands of them, so the first `clean` of the first wave fails. Offer to append
`<dep-dir>/` to `.gitignore`, default yes, and append it exactly as the log line above when they
accept. They decline: record it in the receipt under `not done:`.

## Step 9: check your own output

```bash
cd "$(git rev-parse --show-toplevel)"
echo "== placeholders, expect nothing =="; grep -rn '{{' .claude AGENTS.md CLAUDE.md 2>/dev/null
echo "== deny =="; node -e 'const j=JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"));console.log((j.permissions&&j.permissions.deny||[]).join("\n"))'
echo "== executable =="; ls -l .claude/hooks/*.sh .claude/skills/*/scripts/*.sh 2>/dev/null
echo "== backups =="; ls -1 .claude/*.pre-wave-*.bak *.pre-wave-*.bak 2>/dev/null
echo "== wave.env =="; cat .claude/wave.env
rm -f "${TMPDIR:-/tmp}/wave-knobs.json" "${TMPDIR:-/tmp}/wave-AGENTS.md" "${TMPDIR:-/tmp}/wave-CLAUDE-section.md"
```

The placeholder line printing anything means a template reached the repository unrendered: fix
the knobs file and redo step 5 for that file. Do not hand-edit the output.

## Step 10: receipt

Print the file list, not a summary of it.

```
wave init, <REPO_NAME>
written:
  .claude/wave.env
  .claude/settings.json          <merge lines from merge-settings.mjs>
  .claude/hooks/code-only-branch.sh
  .claude/hooks/registry-guard.sh
  .claude/skills/dispatch/SKILL.md
  .claude/skills/dispatch/scripts/dispatch.sh
  .claude/skills/registry/SKILL.md               <registry only>
  .claude/skills/registry/scripts/registry-write.sh   <registry only>
  .claude/agents/red-gate.md
  AGENTS.md                      <created | N sections appended | left>
  CLAUDE.md                      <section appended | left>
  <REGISTRY_DIR>/README.md, schema.sql, tools/*.py, registry.db   <registry only>
  .gitignore                     <lines added: log dir, dependency dir | left>
backups: <paths | none>
knobs: worktree <WT_ROOT>, branch <BRANCH_PREFIX>/<task>, models <MODEL_DEFAULT> and
  <MODEL_JUDGMENT> at <EFFORT_DEFAULT>, env file <ENV_FILE | none>, registry <dir | off>
not done: <sqlite3 missing, house conventions still TODO, ... | nothing>
next: the method itself is the running-waves skill. Ask for the first-wave walkthrough.
```

Close the receipt with these two lines. `.claude/wave.env` is trusted input: `dispatch.sh` runs
`WAVE_INSTALL_CMD` through `eval`, so only the repository owner edits that file and it is reviewed
like any other committed file. Nothing here is committed: the scaffold is left in the working tree
for the user to review and commit.

## Red flags, stop and redo the step

- A `{{` survives anywhere under `.claude/`, in `AGENTS.md`, or in `CLAUDE.md`.
- You typed a value into a template instead of into the knobs file.
- You opened `.claude/settings.json` to edit it by hand.
- You overwrote a file and no `.pre-wave-*.bak` exists next to it.
- You appended to `AGENTS.md` without showing the diff.
- You ran the schema against an existing `registry.db`.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The template has two placeholders, faster to fill them in" | The renderer is also the check: it fails loudly on a key you forgot, hand-filling fails silently. |
| "There is no settings.json yet, so there is nothing to merge" | `merge-settings.mjs` creates it. A hand-written one drifts from the fragment the next update ships. |
| "This repo has no AGENTS.md, so I will write a summary of my own" | `AGENTS.md` is what the implementer reads instead of CLAUDE.md. Render the template. |
| "sqlite3 is missing, so the registry files are pointless" | Copy them, report the missing binary, print the one command. The registry works the moment sqlite3 arrives. |
| "The tree is dirty, I should stop and ask" | Report it in one line and continue. Refusing on a dirty tree is not in this skill. |
| "The rendered AGENTS.md is better than theirs, replace it" | Append the missing sections only. Their sections are their conventions. |

## When something fails

```
┌─ Something went wrong ───────────────────────────
│ Tried: <plain language>
│ Error: <last 10 lines of stderr>
└──────────────────────────────────────────────────
[WAVE DIAGNOSTIC]
plugin: wave 0.1.0
skill: init
step: <N>
os: <uname -s>
command: <the command that failed>
exit_code: <N>
stderr: |
  <stderr>
[/DIAGNOSTIC]
```

Then ask whether to retry, skip this step, or stop. Never continue silently past a failed step.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: the Setup block again, then the GREEN prompt, then the eleven acceptance commands.

Expected: PASS on every row, in particular no output from the placeholder grep, both deny rules
present, the pre-existing `statusLine` and allow entry still there, one
`settings.json.pre-wave-*.bak`, and a `node_modules/` line in `.gitignore` that the setup did not
put there. Append Run 2 to
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-init.md`.

A failing row is a REFACTOR: add the rationalization row and the red flag that name that specific
behaviour, then re-run from a fresh setup. Record every iteration under its own heading.

- [ ] **Step 5: Commit**

```
git add plugins/wave/skills/init/SKILL.md plugins/wave/tests/scenarios/init-baseline.md && git commit -m "feat(wave): init skill scaffolding a repository from the templates"
```

The baseline record stays in the gitignored workspace and is deliberately not in this commit.

### Task 13: running-waves references, part 1 (lifecycle, rulings, registry, seal, troubleshooting)

**Files:**
- Create: `plugins/wave/skills/running-waves/references/lifecycle.md`
- Create: `plugins/wave/skills/running-waves/references/rulings.md`
- Create: `plugins/wave/skills/running-waves/references/registry-process.md`
- Create: `plugins/wave/skills/running-waves/references/seal-checklist.md`
- Create: `plugins/wave/skills/running-waves/references/troubleshooting.md`
- Test: `plugins/wave/tests/references.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1), the absolute path of `plugins/wave`.
- Produces: `plugins/wave/tests/references.test.mjs` with `REFERENCES`, `BANNED` and `readReference(name)` at module scope; Tasks 14 and 15 extend this same file by appending tests and reusing those three names. The five reference files are listed in the reference table of `SKILL.md` (Task 15).

Rules for every reference file in this task:

- The file starts with a level-1 heading, then one line saying what the file is for, then the content. No frontmatter.
- Under 400 lines.
- The content is generic. None of these strings may appear anywhere in the file: `OIL`, `oil_wrapper`, `Polish`, `pnpm`, `Next.js`, `Mistral`, `Anthropic`, `Jakub`. Where a concrete tool would be named, name the configured knob instead (`$WAVE_REGISTRY_DIR`, `$WAVE_LOG_DIR`, the configured install command, the project's test command).
- Prose has no em-dashes. Use commas, colons or parentheses.
- Every ruling carries its why on the same bullet. A ruling without a why is a rule someone argues around.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/references.test.mjs` with exactly this content:

````js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const REFERENCES = join(PLUGIN_ROOT, 'skills', 'running-waves', 'references')

const BANNED = ['OIL', 'oil_wrapper', 'Polish', 'pnpm', 'Next.js', 'Mistral', 'Anthropic', 'Jakub']

function readReference(name) {
  const path = join(REFERENCES, name)
  assert.ok(existsSync(path), `missing reference file: ${name}`)
  return readFileSync(path, 'utf8')
}

const PART_ONE = [
  'lifecycle.md',
  'rulings.md',
  'registry-process.md',
  'seal-checklist.md',
  'troubleshooting.md',
]

for (const name of PART_ONE) {
  test(`${name} exists, opens with a level-1 heading and stays under 400 lines`, () => {
    const text = readReference(name)
    assert.match(text, /^# \S/, `${name} must open with a level-1 heading`)
    const lines = text.split('\n').length
    assert.ok(lines < 400, `${name} has ${lines} lines, the limit is 400`)
  })

  test(`${name} carries no project-specific vocabulary`, () => {
    const text = readReference(name)
    for (const word of BANNED) {
      assert.ok(!text.includes(word), `${name} contains the banned string "${word}"`)
    }
  })
}

test('rulings.md carries the eight ruling group headings', () => {
  const text = readReference('rulings.md')
  const headings = [
    '## Roles and models',
    '## Briefs',
    '## Gates',
    '## Verification',
    '## Git and worktrees',
    '## Controller context',
    '## Registry',
    '## Cost',
  ]
  for (const heading of headings) {
    assert.ok(text.includes(heading), `rulings.md is missing the heading "${heading}"`)
  }
})

test('troubleshooting.md names the dispatch traps by their literal strings', () => {
  const text = readReference('troubleshooting.md')
  for (const marker of ['--last', '/dev/null', 'resume']) {
    assert.ok(text.includes(marker), `troubleshooting.md never mentions ${marker}`)
  }
})
````

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: FAIL, 12 failing tests, each reporting `missing reference file: <name>` for the five files, plus the two named tests failing on `missing reference file: rulings.md` and `missing reference file: troubleshooting.md`.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/skills/running-waves/references/lifecycle.md`:

````markdown
# Wave lifecycle

The thirteen steps a wave passes through, each with its actor, its artifact, and the gate
that must close before the next step starts.

A wave is one planned batch of work carried from an approved spec to a sealed branch.
The steps run in order. A step is finished when its gate closes, never when its artifact
merely exists. The controller owns the whole line and implements none of it.

## 1. Spec

- **Actor:** controller, with the owner.
- **Artifact:** a design document under `docs/superpowers/specs/`, or, on a project with a
  registry, `proposed` statements in `registry.db` (see `registry-process.md`).
- **Gate:** the owner approves. No plan is written against an unapproved spec, and no
  implementer ever reads the spec narrative.

## 2. Registry entry

- **Actor:** controller.
- **Artifact:** the wave's statements in `registry.db`, each with its `basis`, `status` and
  `stage`, written through the guarded write script so every status change carries its
  history row.
- **Gate:** zero statements for this wave still in `proposed` or `flagged`, and the
  projection regenerated. A project without a registry skips this step and treats the
  spec's numbered requirements as the statements.

## 3. Recon

- **Actor:** subagents. Never the controller in its own thread.
- **Artifact:** a facts pack under the project's reports directory: every premise the plan
  will rely on, with file and line evidence.
- **Gate:** every claim the plan will make about existing code is either in the facts pack
  with evidence, or is written in the plan as explicitly unverified.

## 4. Plan

- **Actor:** plan authors, one per section, in parallel. The controller assembles them.
- **Artifact:** `docs/superpowers/plans/<date>-<wave>.md`, shaped by `plan-template.md`:
  statements verbatim, a classification table, batching, and task blocks with Red and
  Green steps.
- **Gate:** the owner ratifies the design calls. The controller re-runs every grep a
  section cites and rejects the section when the cited output does not reproduce.

## 5. Ledger

- **Actor:** controller.
- **Artifact:** `progress.md` in the wave workspace, shaped by `ledger-template.md`:
  topology, the produces-versus-consumes conflict scan, and rulings R1 to Rn with their
  why and their cost if wrong.
- **Gate:** every cross-task interface named in the plan appears in the scan with a
  verdict, and every conflict the scan finds has a ruling.

## 6. Brief

- **Actor:** controller.
- **Artifact:** `task-<n>-prompt.md` in the workspace, shaped by `brief-template.md`: a
  header of controller context followed by the plan's task text inlined verbatim.
- **Gate:** the controller's own chores are done first (dependencies installed, migrations
  applied, fixtures staged), because the sandbox has no network, and every code location
  the brief cites is verified to still exist.

## 7. Dispatch

- **Actor:** the implementer, launched only through the dispatch skill.
- **Artifact:** a dedicated worktree on branch `<prefix>/<task-id>`, a log under the
  configured log directory, and the implementer's report written inside the worktree.
- **Gate:** the implementer's final status is `DONE` or `DONE_WITH_CONCERNS`, and its Red
  output is pasted per test. A summary sentence is not Red.

## 8. Controller legs

- **Actor:** controller.
- **Artifact:** the runs the sandbox cannot do: suites needing a database or a network,
  the type check, the build when a bundler boundary was touched, the formatter.
- **Gate:** all green in the task worktree, the tree clean, and the work committed from
  that worktree with an explicit path list. An implementer's green claim never closes this
  gate.

## 9. Red gate (gated tasks only)

- **Actor:** the gate agent, dispatched with `gate-prompt.md`.
- **Artifact:** a verdict of PASS, STRENGTHEN or BLOCK, with the mutant table and pasted
  runner output.
- **Gate:** PASS. On STRENGTHEN the named tests land first and the gate runs again. On
  BLOCK the controller repairs the brief or the plan before re-dispatch.

## 10. Task review

- **Actor:** a reviewer agent, dispatched with `review-prompt.md`, on every task.
- **Artifact:** a spec-compliance verdict plus findings graded Critical, Important and
  Minor, each with a file and line.
- **Gate:** no Critical or Important finding open. Fix rounds go back through the dispatch
  skill's `resume` with a file allowlist, capped at five rounds, and close with a scoped
  re-review. Minor findings are recorded in the ledger and closed or dropped at the seal.

## 11. Merge

- **Actor:** controller.
- **Artifact:** the task branch rebased onto the integration branch's fork point, merged
  fast-forward only, and the task worktree cleaned.
- **Gate:** the merge really was fast-forward, generated code is regenerated after any
  schema change, and the full suite is green at each batch boundary.

## 12. Tranche close

- **Actor:** controller, with a delegated whole-tranche review.
- **Artifact:** registry flips in the main checkout (basis, stage, references, history
  row), a regenerated projection, and updated finding statuses.
- **Gate:** every statement in the tranche is flipped, the ledger is current, and the
  controller compacts its context before the next tranche starts.

## 13. Seal

- **Actor:** controller, with a delegated whole-branch review.
- **Artifact:** the wave report and a sealed branch.
- **Gate:** every line of `seal-checklist.md`. The push happens on the owner's call, never
  automatically.
````

Create `plugins/wave/skills/running-waves/references/rulings.md`:

````markdown
# Standing rulings

Every rule the loop runs on, grouped, each with the reason it exists.

A ruling without its why is a rule someone will argue around under pressure; the why is
that argument, already settled. Rulings bind until the owner changes them, and a change is
made by rewriting the ruling here with its own why, never by taking an exception inside a
single brief.

## Roles and models

- **The controller plans, dispatches, merges, verifies and seals, and implements nothing.**
  Why: an author reviewing their own work stops finding their own mistakes, and a
  controller that starts writing code stops driving the wave.
- **The implementer and the reviewer come from different model families.** Why: measured
  head to head, an adversarial reviewer from another family raised no false positives on
  the implementer's diffs, and implementation spend stays off the reviewer's quota.
- **Mechanical, fully specified tasks go to the default model at medium effort; multi-file
  or judgment tasks go to the judgment model at medium effort. Raise effort only after a
  BLOCKED report or two failed fix rounds.** Why: the gate and review net produces the
  quality, not the effort tier, so effort bought before evidence of difficulty is wasted.
- **Never change the implementer model inside a tranche.** Why: a model change mid-tranche
  makes any regression impossible to attribute.
- **Implementers read `AGENTS.md` and never the controller's own instruction file.** Why:
  the implementer loads exactly one conventions file, and the controller's file carries
  process the implementer must not act on.
- **The sandbox is enforced by the dispatch script, not by an instructions file.** Why: an
  instructions file is a wishlist. A flag in the script is a boundary.

## Briefs

- **Owned statements and their neighbours go into the brief verbatim, with literal strings
  quoted exactly.** Why: paraphrase loses the acceptance criterion, and the reviewer
  judges against the statement, not against the paraphrase.
- **Say each instruction once.** Why: a repeated instruction reads as two instructions and
  invites the implementer to satisfy the weaker one.
- **Never ask the implementer for a plan before it starts.** Why: it burns a round and the
  plan it writes is not the plan you reviewed.
- **Plan snippets are untrusted input: the implementer transcribes them verbatim, defects
  included, and flags any conflict with the conventions file.** Why: the plan's own
  reference code is a defect class, and one wave caught three plan-authored defects that
  the gate found only because the snippet was transcribed rather than fixed silently.
- **Anchor every edit by content, quoting the first and last line of the range, never by
  line number.** Why: line numbers are taken at the branch base and shift as earlier tasks
  land.
- **Every grep, count or help output a brief or a plan cites is executed by its author,
  with the real output pasted.** Why: invented evidence survives review and fails only in
  the worktree.
- **The controller never hand-edits an agent's section.** Why: a defect goes back to its
  author as a ruling, so the author's next section is better; a silent fix teaches nobody.
- **The brief states the sandbox facts: no network, which binaries to call directly, which
  chores are already done.** Why: the implementer cannot discover them, and the failure
  mode is a hang, not an error message.
- **The brief verifies each code location it names before dispatch.** Why: stale locations
  send the implementer to build the wrong thing and it reports success.

## Gates

- **Gate only the tasks that are high-risk, delete behaviour, or are refutation-critical
  because there are several ways to fake Green. Review every task.** Why: a wave-scale A
  and B run showed the gate found nothing extra on mechanical tasks, and review alone
  leaked nothing on them.
- **A mechanical deletion with a named trap runs the refutation checklist without a gate
  agent.** Why: the trap is already named, so the gate has nothing left to discover.
- **Red output is pasted per test, never summarized.** Why: a vacuous Red, a suite that
  never actually failed, has shipped behind the phrase "fails as intended".
- **The wrong-Green probe is run for real: apply add-only, empty and hardcoded mutants,
  run the covering tests, then revert every probe edit and prove the tree is clean.** Why:
  a mentally constructed probe misses the mutants that survive, and an unreverted probe
  edit lands in the merge.
- **Fix real findings regardless of whether the current change caused them, and before any
  handoff ship everything under medium effort.** Why: "pre-existing" is a scheduling label,
  not a verdict, and the person receiving the handoff cannot tell the difference.

## Verification

- **An implementer's green claim never covers suites that need a database or a network,
  nor the build. The controller re-runs them.** Why: the sandbox blocks them and those
  suites skip silently rather than failing.
- **Commit-time hooks do not fire for agent runs.** Why: they run in the interactive
  session only, so the controller re-runs the full suite before any green claim.
- **Run the build after any change that adds an import across a bundler boundary.** Why:
  the type checker and the unit runner are both blind to the bundler, and the failure only
  appears at build time.
- **After deleting a route or a generated surface, the type checker lies until the
  generated types are rebuilt.** Why: it reads the stale generated output and reports
  green.
- **One derived test database and one derived object store per worktree, and one test run
  per worktree at a time. Regenerate the client after a schema merge.** Why: shared
  fixtures across concurrent worktrees produced false regressions that cost a day.
- **When a change alters an exported name, grep the test mocks for it.** Why: a bare mock
  factory silently drops the new export and breaks neighbouring suites.

## Git and worktrees

- **Always address a worktree with `git -C <worktree>`.** Why: a bare git command runs
  against whatever directory the shell happens to be in, which is not the worktree.
- **Never stage with `git add -A` in the main checkout.** Why: it committed private files
  once, and the recovery is a history rewrite.
- **Task branches carry code only; registry and generated database files are flipped in
  the main checkout after the merge, and the branch-content hook enforces it.** Why: a
  binary database does not merge, so two branches touching it lose one side's writes.
- **Check the branch tip before every merge, and rebase onto the fork point first.** Why:
  the base moves while a task runs, and a merge onto a stale base silently reverts.
- **Conventional commit messages, with the session trailer. Push only when asked; backup
  pushes to a work-in-progress branch are standing-authorized.** Why: the owner decides
  what becomes public, and a backup branch costs nothing.
- **Never chain merge fallbacks through a pipe.** Why: the exit status of the failing
  command disappears and a failed merge reads as success.
- **The base of a review diff is the merge base, not the branch point you remember.** Why:
  anything else shows the reviewer other people's commits as if they were this task's.

## Controller context

- **The controller never debugs in its own thread. A failing leg goes to a subagent that
  owns "make it green" and returns root cause and outcome only.** Why: one chase consumed
  ninety-nine percent of a controller context window and the wave stalled.
- **Research and probes go to subagents.** Why: probe output is bulk text with a short
  useful life, and it displaces the wave state the controller needs.
- **Every agent contract says: write everything to a workspace file, final message at most
  three lines.** Why: a soft request for brevity is ignored; a hard cap is obeyed.
- **Compact at tranche boundaries, and keep the ledger current enough to resume from.**
  Why: the ledger is the recovery map when the context is gone.

## Registry

- **The projection is normative for execution agents, and statement text verbatim is the
  acceptance criterion.** Why: an agent that can reach the rationale will rationalize
  around the statement.
- **Reviewers verify against statements, never against code comments or superseded
  documents.** Why: those are the artifacts the statement replaced.
- **Every status change appends a history row carrying the previous text, then updates the
  row.** Why: without the previous text the registry records that something changed and
  why, but never what it was, so nobody can reconstruct what the owner approved.
- **Execution reconciles the registry to the built application: flip the statement and its
  references in the same commit, and amend a statement the build proves wrong instead of
  working around it.** Why: pre-build validation cannot prove a specification.
- **Statements describe plainly and positively. No global exclusivity claims outside a
  ratified uniformity rule, and no alarming vocabulary.** Why: an exclusivity claim is
  unprovable and blocks the next honest change.
- **Ban entries are never given to code-generating agents, and never appear in the
  projection. They are a grep gate run after the code is written, and every ban carries the
  ruling that created it.** Why: an agent that has seen the banned string writes around it
  instead of writing the right text.
- **Destructive registry writes go only through the guarded script, which prints the full
  match list first.** Why: a truncated match list authorized a forty-row deletion.
- **Decision documents are written in the working language of the team; only product copy
  is quoted in its own language.** Why: explanation prose is read by reviewers, not users.

## Cost

- **The seal runs the full end-to-end suite with every external key masked, so paid
  specifications skip. Live runs cover only the surfaces this wave touched, at zero
  retries.** Why: a deterministic failure must not be billed twice, and a full live sweep
  is an owner decision.
- **Process weight scales to risk. Batch adjacent small tasks into one dispatch and one
  review, and keep commits and registry flips per task.** Why: the overhead of a dispatch
  is fixed and the review of two small adjacent diffs is one read.
- **Use the strongest model for gates and for the final whole-branch review; re-reviews go
  to a cheaper tier.** Why: a re-review reads a scoped diff against a verdict that already
  exists.
````

Create `plugins/wave/skills/running-waves/references/registry-process.md`:

````markdown
# Registry process

How the statement registry is filled, reviewed, projected and flipped, and what each of
its command line tools is for.

The registry is one SQLite database, `$WAVE_REGISTRY_DIR/registry.db`, plus a generated
projection, `$WAVE_REGISTRY_DIR/spec-exec.db`. `registry.db` is the record: statements,
their grounding, their history, findings, decisions and bans. The projection is what
execution agents read. A project configured without a registry runs the same wave loop
with the spec's numbered requirements standing in for statements; every other reference in
this playbook still applies.

Every command below assumes `.claude/wave.env` has been sourced, so `$WAVE_REGISTRY_DIR`
resolves. Paths in it are relative to the repository root.

## The five stages

**S0, schema and contract.** The scaffolder writes `schema.sql`, initializes `registry.db`
from it, and writes the contract into `$WAVE_REGISTRY_DIR/README.md`. Nothing is drafted
until the contract is in place, because the contract decides what a statement is allowed
to say.

**S1, drafting.** Parallel subagents draft `proposed` statements, one agent per area, each
statement atomic, testable and written in plain language as an end state. Defective current
behaviour is written as its fixed end state with `basis` set to `fix-target:<finding-id>`,
never as it stands today. A drafter who cannot ground a statement in a finding, a decision
or a mockup marks it `flagged` and moves on. Flag, never invent.

**S2, consistency gate.** A fresh-context agent reads the drafted statements only and
reports contradictions, duplicates and statements that cannot be tested. It does not read
the drafters' notes, because the point is to see what a reader sees.

**S3, owner review.** Generate the local review panel, hand the owner the file path, and
ingest the export mechanically. The panel is a local HTML file opened from disk, never a
hosted page, because a hosted page cannot hand back a downloaded file.

**S4, projection and staging.** Regenerate the projection, then assign `stage` to the
statements this wave will build. The wave is ready when no statement in it is still
`proposed` or `flagged`.

## Writing a statement

- One behaviour per statement, phrased as the end state a reader could test.
- Plain description. No global exclusivity ("the only place that ..."), unless a ratified
  uniformity rule says so, and no alarming vocabulary.
- Quote product copy byte-exactly inside the statement; write everything else in the
  team's working language.
- `basis` is one of `parity-confirmed`, `ruling`, `mockup`, or `fix-target:<finding-id>`.
- `status` moves `proposed` to `approved`, `amended` or `rejected`. Drafters may use
  `flagged`.
- `stage` is `W<n>` while a wave owns the statement, `parity` once it is built and
  confirmed, `none` when it will never be built.
- Grounding goes in `spec_ref` rows: `finding`, `decision`, `code` or `mockup`. The `code`
  references become the projection's `code_locus`.

## The tools

All three are Python 3 with the standard library only. `--registry-dir` defaults to the
parent of the tools directory, so it can be omitted when they are run in place.

Regenerate the projection. Run it after any statement write; the guarded write script runs
it for you:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/gen-spec-exec.py" --registry-dir "$WAVE_REGISTRY_DIR"
# spec-exec.db regenerated: 212 statements
```

The projection holds approved statements only, as `spec(id, area, text, code_locus,
stage)` plus a `meta` row recording when it was generated and from what. It carries no
rationale, no history and no ban table.

Build the owner review panel:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/gen-review-panel.py" --registry-dir "$WAVE_REGISTRY_DIR" \
  --pending-only --out "$WAVE_REGISTRY_DIR/review/index.html"
```

`--pending-only` selects statements whose status is `proposed` or `flagged`. Areas come
from the data, so the panel needs no configuration. Each statement offers keep, change
with a text box, or remove; state lives in the browser's local storage so the owner can
stop and resume; the export is one JSON file offered as a download and as copy to
clipboard. Open the file from disk and give the owner the path.

Ingest the owner's export:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/ingest-review.py" ~/Downloads/review-export.json \
  --registry-dir "$WAVE_REGISTRY_DIR" --date 2026-01-31
# keep: 180  change: 24  remove: 8
```

`keep` sets `approved`; `change` replaces the text and sets `amended`; `remove` sets
`rejected`. Every verdict writes a `statement_history` row carrying the previous text. An
export naming an unknown id exits 1 before any write, so a partly applied review is not
possible.

## Writing to the registry

Every write goes through the guarded script. It prints the full match list before it acts,
refuses a write with no `--where`, and aborts when the where clause matches zero rows:

```bash
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --set "status='approved', basis='parity-confirmed', stage='parity', parity_ref='<sha>'" \
  --where "id='SP-search-12'" \
  --note "built and verified in the application at <sha>"

.claude/skills/registry/scripts/registry-write.sh finding \
  --delete --where "id='F-12'"
```

`--note` is required for the `spec_statement` and `finding` tables, and the script writes
the history row in the same transaction as the update: `statement_history` with the text
as it stood before the change, or `status_history` for a finding. This is why the rule
"history first, then status" cannot be forgotten. After any `spec_statement` write the
script regenerates the projection.

A hook blocks a raw `UPDATE`, `DELETE`, `DROP` or `ALTER` aimed at the registry from any
other path. That is deliberate: the guarded script is the only write path.

## Flipping after a merge

Flips happen in the main checkout, after the task branch is merged, never on the task
branch, because a binary database does not merge. For each statement the tranche built:
set `basis` to `parity-confirmed`, `stage` to `parity`, `parity_ref` to the merge commit,
and add the fresh `code` references in the same commit. Where the build proved a statement
wrong or unbuildable as worded, amend the text then and there and say so in the note.

## Bans

A ban is a string the product must never contain, recorded in `ban_entry` with the ruling
that created it, how to search for it, and where it was last seen. Two rules:

1. A ban is never shown to a code-generating agent, and never appears in the projection.
   An agent that has seen the string writes around it instead of writing the right text.
2. A ban is verified by grep after the wave's code is written, as part of the seal, and
   each hit is judged against the ban's own match hint, which records the contexts where
   the string is required copy.

## Reading

```bash
sqlite3 -column -header "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT id, area, status, stage FROM spec_statement WHERE stage='W3' ORDER BY id;"

sqlite3 -column -header "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE status IN ('proposed','flagged');"

sqlite3 -column -header "$WAVE_REGISTRY_DIR/spec-exec.db" \
  "SELECT id, text, code_locus FROM spec WHERE area='search' ORDER BY id;"
```
````

Create `plugins/wave/skills/running-waves/references/seal-checklist.md`:

````markdown
# Seal checklist

The list that closes a wave. Every line is run and its result recorded before the branch
is called sealed.

A seal is not a feeling that the work is done. It is this list, in this order, with
evidence for each line. Nothing here is skipped because an earlier tranche already passed
it: the seal tests the branch as a whole, which no tranche did.

## 1. Whole-branch review

Delegate a review of the entire branch diff against the merge base, not a re-read of the
per-task reviews. Give the reviewer the statements the wave owned and the ledger's Minor
findings. Its verdict is a wave-level spec verdict plus findings.

## 2. Full unit suite and build

Run the project's full test command and its build command in the integration worktree,
from a clean tree. Paste the counts. A suite that skipped tests silently has not run:
check the skip count against the previous seal.

## 3. End-to-end suite with external keys masked

Run the end-to-end suite with every external key set to the empty string, so anything that
would bill a provider skips instead. `WAVE_EXTERNAL_KEYS` holds the space-separated list of
environment variable names the scaffolder recorded for this project:

```bash
source .claude/wave.env
env $(for k in $WAVE_EXTERNAL_KEYS; do printf '%s= ' "$k"; done) <the project e2e command>
```

Masking one key is not enough. A single unguarded specification billing a provider is the
failure this line exists to prevent, so mask the whole list. An empty `WAVE_EXTERNAL_KEYS`
means the project has no paid external calls; say so in the wave report rather than
skipping the line.

## 4. Live subset, at zero retries

Run live only the specifications covering surfaces this wave actually touched, with the
runner's retry count set to zero. Why zero: a deterministic failure must not be billed a
second and third time. A full live sweep happens only on the owner's explicit call.

## 5. Ban grep

Grep the production source for every live ban, judging each hit against that ban's match
hint, and record the ruling reference next to the result. Zero unexplained hits.

## 6. Stage invariant

No statement may still be staged to this wave:

```bash
sqlite3 "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE stage='W3';"
# expected: 0
```

A non-zero count means a statement was planned and never built, or was built and never
flipped. Both are seal blockers. Resolve by flipping, by amending, or by moving the
statement to the next wave, and say which in the wave report.

## 7. History completeness

Every statement the wave touched has a `statement_history` row for each status change,
each carrying the text as it stood before the change:

```bash
sqlite3 "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT statement_id, date, status FROM statement_history
   WHERE date >= '<wave start date>' ORDER BY statement_id, date;"
```

## 8. Wave report

Write the report into the wave workspace: what shipped, statement ids with their final
status, findings opened and closed, rulings made during execution, what was deferred and
where it is recorded, and the evidence lines from this checklist with their counts.

## 9. Owner walkthrough

Walk the owner through the built behaviour, not the diff. Divergences from a statement are
raised here, and either amend the statement or open a follow-up.

## 10. Push on the owner's call

The branch is pushed when the owner says so. A backup push to a work-in-progress branch is
standing-authorized and does not need asking; a push to the shared branch does.
````

Create `plugins/wave/skills/running-waves/references/troubleshooting.md`:

````markdown
# Troubleshooting

The traps this loop hits, each with the symptom you will actually see, the cause, and the
fix.

Most of these are already prevented by the dispatch script. They appear here because the
symptom is a hang or a false green rather than an error message, so recognizing the symptom
is the whole skill. When something below happens anyway, the script was worked around.

## The dispatch produces no output and never exits

**Symptom:** the log file exists, holds the banner and nothing else, and the process sits
there.

**Cause:** the implementer command inherited the parent's standard input and is waiting on
it.

**Fix:** the command must end with `< /dev/null`. The dispatch script does this. If you
are looking at this symptom, something invoked the command without the script.

## A resumed run attaches to the wrong task

**Symptom:** the resumed run talks about another task's files, or edits a worktree that is
not this task's.

**Cause:** the session was selected with `--last`. It picks the most recent session, which
is only this task's session when nothing else has run in between, and something always
runs in between.

**Fix:** find the session by the worktree path. Grep the sessions directory under
`${CODEX_HOME:-$HOME/.codex}/sessions` for the worktree path, take the session id, and
`resume` that id. Never `--last`.

## A resumed run edits the main checkout

**Symptom:** `resume` completes and the diff shows up in the primary checkout instead of
the task worktree.

**Cause:** `resume` does not restore the working directory the original run was given. It
runs wherever the shell is.

**Fix:** change into the worktree before resuming. The dispatch script does this, and it
also refuses to run against the primary checkout.

## Every command in the sandbox hangs

**Symptom:** the run stalls on the first test or install command with no output at all.

**Cause:** the package manager launcher tries to reach the network, which the sandbox
blocks, and it waits instead of failing.

**Fix:** call the installed binaries directly, for example
`./node_modules/.bin/<runner> run <file>`. The conventions file records the path and the
brief repeats it for the task at hand. Install dependencies as a controller chore before
dispatch, and say so in the brief so the implementer does not try.

## The run stops on a trust or approval prompt

**Symptom:** the log ends with a question and the process waits, or exits immediately
after asking.

**Cause:** a fresh worktree is an unknown directory, and the standard input is closed, so
an interactive prompt can never be answered.

**Fix:** the sandbox mode the script passes must not require an approval for ordinary
writes inside the worktree. Never widen it to a full-access mode to get past a prompt.
Investigate what asked, and fix that instead.

## Green with an empty test count

**Symptom:** the report says the suite passed, and the count is far below the usual one.

**Cause:** the environment file was not copied into the worktree, so every test that needs
a database or a service skipped silently. Skipping is not failing, so the run is green.

**Fix:** configure the environment file in `.claude/wave.env` so the dispatch script copies
it. Compare the reported test count with the count in the main checkout; a smaller number
is the finding. The controller re-runs those suites regardless.

## A failed run reads as green

**Symptom:** the log ends with an error, the exit status is 0.

**Cause:** the command was piped into a log writer, and the shell reported the writer's
status.

**Fix:** the script sets `pipefail` for exactly this. Do not add your own pipeline around
it.

## The worktree already exists

**Symptom:** the dispatch refuses with an existing-worktree message.

**Cause:** a previous run of this task id was never cleaned, or a merge left it behind.

**Fix:** finish or abandon the previous run, then `clean` that task id, then dispatch
again. Do not delete the directory by hand: the git metadata stays behind and the next
dispatch fails differently.

## `clean` refuses to remove the worktree

**Symptom:** `dispatch.sh clean <task-id>` exits 128, reports that the worktree contains
modified or untracked files, and leaves the directory in place.

**Cause:** `clean` runs `git worktree remove`, which refuses a worktree holding untracked
files. Ignored files do not stop it, so the directory the install command produces is a
problem only while it is not ignored. A repository that has never had a worktree dropped
on it often has no ignore rule for it yet.

**Fix:** ignore whatever the install command produces before the first dispatch, in the
repository's own ignore file, so every future `clean` succeeds. When the untracked files
are the task's own work, commit them from the worktree first, then `clean`. Do not delete
the directory by hand: the git metadata stays behind and the next dispatch for that task id
fails differently.

## The commit is blocked from a task branch

**Symptom:** a commit exits 2 with a message about registry files.

**Cause:** the branch content hook. The staged set includes a file under the registry
directory, and the commit is from a linked worktree or a task branch.

**Fix:** unstage the registry file. Registry flips happen in the main checkout after the
merge, because a binary database does not merge.

## A registry write is blocked

**Symptom:** a `sqlite3` command exits 2 before running.

**Cause:** the registry guard hook matched an `UPDATE`, `DELETE`, `DROP` or `ALTER` aimed
at the registry.

**Fix:** use the guarded write script. It prints the match list first, aborts on zero
rows, and writes the history row in the same transaction.

## The type check passes, the build fails

**Symptom:** the type check is green in the worktree and the build fails on an import.

**Cause:** the type checker does not see the bundler's boundaries, and after a route or
generated surface is deleted it keeps reading stale generated types.

**Fix:** run the build as a controller leg after any change that adds an import across a
bundler boundary or deletes a generated surface. Regenerate the generated types first.

## The same boundary keeps catching people out

**Symptom:** a change passes the tests and the type check but breaks the build or a
generated-types step, and it keeps happening on the same class of file.

**Cause:** the test tools are blind to that boundary. The entry above is the reactive fix,
and it depends on somebody remembering. Nothing in the toolchain tells the person editing
the file that this edit needs a leg the tests cannot ask for.

**Fix:** make the boundary announce itself. Write a project hook on `PostToolUse` for
`Edit|Write` that recognizes the file class and exits 2 with a message naming the leg to
run. Exit 2 surfaces the message as feedback rather than failing the edit, so it reads as a
reminder. Every project has a different boundary, so this stays a pattern rather than a
shipped file:

```bash
#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  <glob for the file class>) echo "$file crosses a boundary the tests cannot see: run <the build command> before review." >&2; exit 2 ;;
esac
exit 0
```

Register it in the project's settings and keep it out of the wave tooling: the classes
worth guarding are the ones a wave has already been burned by, and that list is local.

## Prompt quoting mangles the task

**Symptom:** the implementer receives a truncated prompt, or the shell reports an unmatched
quote.

**Cause:** the prompt was passed inline, and it contains quotes, apostrophes or non-ASCII
punctuation the shell tried to interpret.

**Fix:** the prompt always rides in a file, and the script passes the file's contents as a
single argument. Write the brief to a file, pass the path.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: PASS, 12 passing tests, 0 failing.

- [ ] **Step 5: Commit**

```
git add plugins/wave/skills/running-waves/references/lifecycle.md \
        plugins/wave/skills/running-waves/references/rulings.md \
        plugins/wave/skills/running-waves/references/registry-process.md \
        plugins/wave/skills/running-waves/references/seal-checklist.md \
        plugins/wave/skills/running-waves/references/troubleshooting.md \
        plugins/wave/tests/references.test.mjs
git commit -m "docs(wave): running-waves lifecycle, rulings, registry, seal and troubleshooting references"
```

Review: standard.

---
### Task 14: running-waves references, part 2 (brief, plan, review, gate, ledger templates)

**Files:**
- Create: `plugins/wave/skills/running-waves/references/brief-template.md`
- Create: `plugins/wave/skills/running-waves/references/plan-template.md`
- Create: `plugins/wave/skills/running-waves/references/review-prompt.md`
- Create: `plugins/wave/skills/running-waves/references/gate-prompt.md`
- Create: `plugins/wave/skills/running-waves/references/ledger-template.md`
- Modify: `plugins/wave/tests/references.test.mjs` (Task 13 wrote it; this task replaces it whole. The range replaced runs from the first line, `import { test } from 'node:test'`, to the last line of the file, the closing `})` of the test named `troubleshooting.md names the dispatch traps by their literal strings`. Step 1 below shows the complete new content.)
- Test: `plugins/wave/tests/references.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1); `REFERENCES`, `BANNED`, `readReference(name)` and `PART_ONE` from the test file as Task 13 left it.
- Produces: `PART_TWO` and `ALL` in `plugins/wave/tests/references.test.mjs`, which Task 15 extends further. The five template files are listed in the reference table of `SKILL.md` (Task 15).

Rules for every reference file in this task, identical to Task 13:

- The file starts with a level-1 heading, then one line saying what the file is for, then the content. No frontmatter.
- Under 400 lines.
- None of these strings may appear anywhere in the file: `OIL`, `oil_wrapper`, `Polish`, `pnpm`, `Next.js`, `Mistral`, `Anthropic`, `Jakub`.
- Prose has no em-dashes. Use commas, colons or parentheses.
- Angle-bracket slots such as `<task-id>` are the literal content of a fill-in template and stay as they are. They are not placeholders in the plan sense: the copying agent replaces them at dispatch time.

- [ ] **Step 1: Write the failing test**

Replace `plugins/wave/tests/references.test.mjs` with exactly this content:

````js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const REFERENCES = join(PLUGIN_ROOT, 'skills', 'running-waves', 'references')

const BANNED = ['OIL', 'oil_wrapper', 'Polish', 'pnpm', 'Next.js', 'Mistral', 'Anthropic', 'Jakub']

function readReference(name) {
  const path = join(REFERENCES, name)
  assert.ok(existsSync(path), `missing reference file: ${name}`)
  return readFileSync(path, 'utf8')
}

const PART_ONE = [
  'lifecycle.md',
  'rulings.md',
  'registry-process.md',
  'seal-checklist.md',
  'troubleshooting.md',
]

const PART_TWO = [
  'brief-template.md',
  'plan-template.md',
  'review-prompt.md',
  'gate-prompt.md',
  'ledger-template.md',
]

const ALL = [...PART_ONE, ...PART_TWO]

for (const name of ALL) {
  test(`${name} exists, opens with a level-1 heading and stays under 400 lines`, () => {
    const text = readReference(name)
    assert.match(text, /^# \S/, `${name} must open with a level-1 heading`)
    const lines = text.split('\n').length
    assert.ok(lines < 400, `${name} has ${lines} lines, the limit is 400`)
  })

  test(`${name} carries no project-specific vocabulary`, () => {
    const text = readReference(name)
    for (const word of BANNED) {
      assert.ok(!text.includes(word), `${name} contains the banned string "${word}"`)
    }
  })
}

test('rulings.md carries the eight ruling group headings', () => {
  const text = readReference('rulings.md')
  const headings = [
    '## Roles and models',
    '## Briefs',
    '## Gates',
    '## Verification',
    '## Git and worktrees',
    '## Controller context',
    '## Registry',
    '## Cost',
  ]
  for (const heading of headings) {
    assert.ok(text.includes(heading), `rulings.md is missing the heading "${heading}"`)
  }
})

test('troubleshooting.md names the dispatch traps by their literal strings', () => {
  const text = readReference('troubleshooting.md')
  for (const marker of ['--last', '/dev/null', 'resume']) {
    assert.ok(text.includes(marker), `troubleshooting.md never mentions ${marker}`)
  }
})

test('brief-template.md carries the full report status enum', () => {
  const text = readReference('brief-template.md')
  for (const status of ['DONE_WITH_CONCERNS', 'NEEDS_CONTEXT', 'BLOCKED', 'DONE']) {
    assert.ok(text.includes(status), `brief-template.md never mentions ${status}`)
  }
})

test('brief-template.md opens the implementer on the conventions file', () => {
  const text = readReference('brief-template.md')
  assert.ok(
    text.includes('Read AGENTS.md first'),
    'brief-template.md must carry the phrase "Read AGENTS.md first"',
  )
})

test('gate-prompt.md orders the probe reverted and the review distrusts the report', () => {
  assert.ok(readReference('gate-prompt.md').includes('revert'), 'gate-prompt.md never says revert')
  assert.ok(
    readReference('review-prompt.md').includes('Do not trust the report'),
    'review-prompt.md must carry the phrase "Do not trust the report"',
  )
})
````

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: FAIL, 13 failing tests (the ten from `PART_TWO` plus the three named ones), each reporting `missing reference file: <name>` for `brief-template.md`, `plan-template.md`, `review-prompt.md`, `gate-prompt.md` and `ledger-template.md`. The twelve tests from Task 13 still pass.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/wave/skills/running-waves/references/brief-template.md`:

````markdown
# Brief template

The dispatch brief an implementer receives, in nine parts, plus the fix-round variant and
the report contract.

A brief is the implementer's whole world. It sees this file and the conventions file, and
nothing else: not the plan, not the spec, not the ledger, not this playbook. Anything it
needs that is not in one of those two files does not exist. Most implementer failures that
look like carelessness are context starvation.

## The nine parts

| Part | What goes in it | The failure it prevents |
|---|---|---|
| 1 Title and contract line | The task name, and the sentence pointing at the conventions file | The implementer inventing its own conventions |
| 2 Where this fits | Two paragraphs: what the wave is doing, and who consumes this task's output by name | Interfaces that satisfy the task and break the next one |
| 3 Owned statements | The statements this task owns, quoted verbatim, each marked when it already complies | Paraphrase drifting away from the acceptance criterion |
| 4 Context the brief cannot know | Sandbox facts, chores already done, signatures merged from earlier tasks, which lines are controller steps | Hangs, reinstalls, and duplicated work |
| 5 Work items and order | Red then Green per item, exact commands, what to report | A Green-first run with a decorative test suite |
| 6 BAN rules | Files owned by other tasks, directories that are off limits, forbidden strings and shapes | Two tasks editing the same file in two worktrees |
| 7 Neighbour statements | A pointer to the neighbouring statements, as context, not as work | Regressions in behaviour nobody asked to change |
| 8 Do not | No subagents, no commits, no writes outside the worktree | Work the controller cannot review or attribute |
| 9 Report contract | Report path, required sections, status enum, final-message cap | A report that has to be chased for the counts |

## The template

```markdown
# Dispatch: <wave name>, Task <n> (<one-line task summary>)

Read AGENTS.md first at the worktree root: it is your standing contract. Then read this
brief; it is your requirements, with the exact values, file names, signatures, copy and
test cases to use verbatim. Transcribe quoted values exactly, including any that look
wrong to you, and say so in the report rather than correcting them silently.
<Add on a gated task: This task is gated: an adversarial reviewer will try to prove your
test suite can be fooled, so every rule in this brief needs a test that fails when the
rule is broken.>

## Where this fits

<One paragraph: what the project is and what this wave is doing.>

<One paragraph: what this task delivers, and which later tasks consume it, named. List the
exact exported names later tasks import.>

## Owned statements (verbatim, normative)

> <statement id>: <statement text, exactly as it stands in the registry>

> <statement id>: <statement text> *(already complies, pin only)*

## Context the brief cannot know

- <Which binaries to call directly, and why the package manager launcher must not be
  used.>
- <Which dependencies, migrations or fixtures are already in place as controller chores.
  Do not install, do not migrate, do not change pinned versions: the sandbox has no
  network.>
- <Signatures merged from earlier tasks that this task consumes, with the file they live
  in.>
- <Which suites need a database or a network. The controller re-runs those; your green
  does not cover them.>
- <Copy, formatting and comment rules that apply to this diff.>
- <Line numbers in this brief were taken at the branch base. Locate anchors by content.>
- <Lines in the work items that say Commit or Review are controller steps. Do not commit.>

## Work items and order

Red first: write every test named below, run them, and paste the per-test failure output
into the report. Then implement, run the Green command, and paste that output too.

1. **<Item name>.** <What must be true when it is done, with the exact values.>
   Red: <the test descriptions, each naming what must fail on what input.>
   Green: `<command>`
2. **<Item name>.** ...

Finish with `<format command>` and `<lint command>` over every file you touched, and paste
the output. Report any structural side effect: a new import across a bundler boundary, a
changed export, a new generated file.

## BAN rules

- Do not touch <files owned by other tasks>. <Task id> owns them.
- Do not edit the documentation directory, the registry directory, or any generated
  database.
- <Copy and vocabulary bans that apply, stated positively where possible.>

## Neighbour statements

See `<neighbours file>` next to this brief for the other statements in this area, with
their stage. Rows staged `parity` are built behaviour you must not regress; rows staged to
this wave belong to other tasks. Do not implement them.

## Do not

- No subagents. No commits. No writes outside this worktree.
- No files beyond those this brief names.
- No new dependencies.

## Report

Write the full report to `<workspace>/task-<n>-report.md` inside this worktree, creating
the directories: files changed; Red output per test; Green output; type check, format and
lint output; checks you could not run and why; concerns.

Your final message is at most eight lines: status (DONE | DONE_WITH_CONCERNS |
NEEDS_CONTEXT | BLOCKED), test counts, what you could not run, concerns.
```

## The status enum

| Status | Means | What the controller does |
|---|---|---|
| `DONE` | Every work item landed, Red and Green output pasted | Run the controller legs, then review |
| `DONE_WITH_CONCERNS` | Landed, with something the implementer wants judged | Read the concerns first, they are usually real |
| `NEEDS_CONTEXT` | Blocked on a fact the brief did not carry | Answer it in a fix round, and fix the brief template if it will recur |
| `BLOCKED` | Cannot proceed: the brief or the plan is wrong | Repair the brief or the plan, then re-dispatch. Never argue the implementer past a BLOCKED |

## Fix-round variant

A fix round resumes the same session, so it carries no context of its own beyond what it
adds. Keep it short and give it an allowlist: the round's whole risk is edits outside the
findings.

```markdown
# Fix round <k>: Task <n>

The review of your work returned the findings below. Fix exactly these, nothing else.

## File allowlist

You may edit only these files. Any other file, including a test file, is out of scope for
this round; if a finding cannot be fixed inside the allowlist, stop and report it.

- `<path>`
- `<path>`

## Findings to fix

1. **<Critical | Important> at `<file>:<line>`.** <The finding, quoted from the review.>
   <What the fixed state must be, with exact values.>
2. ...

## Rulings that amend the brief

- <Any controller decision made since the original brief. These take precedence over the
  brief where they conflict.>

## Method

Add or adjust the test that fails on the current behaviour first, paste its failure, then
fix. Re-run `<command>` and paste the output.

## Report

Append a section `## Fix round <k>` to your existing report at
`<workspace>/task-<n>-report.md`: what you changed per finding, the test output, and any
finding you could not fix inside the allowlist.

Final message at most eight lines: status (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT |
BLOCKED), per-finding outcome, concerns.
```

Cap fix rounds at five. A task still failing review after five rounds is a brief defect or
a plan defect, not an implementer defect: rewrite the brief and re-dispatch from a clean
worktree.
````

Create `plugins/wave/skills/running-waves/references/plan-template.md`:

````markdown
# Plan template

The shape of a wave plan: header, global constraints, wave shape, classification table,
and the task block that every task repeats.

The plan is written once, by several authors in parallel, and read in pieces by
implementers who see only their own task plus the global constraints. That is the design
constraint on every line of it: a task block must stand alone.

## Header

```markdown
# <Wave name> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use the subagent-driven development or
> plan-execution skill to implement this plan task by task. Steps use checkbox syntax for
> tracking.

**Roles:** the controller plans, dispatches, merges, verifies and seals, and implements
nothing. The implementer writes the code in a sandboxed worktree. A reviewer agent reviews
every task; a gate agent gates the tasks the classification table marks.

**Goal:** <what the wave delivers, in two sentences, in terms of behaviour>

**Architecture:** <the shape of the change, and what is deliberately disposable>

**Tech stack:** <languages, frameworks, runners, external binaries>

**Spec:** <path to the approved spec>. Where the spec and the registry disagree, the
registry wins. Recon evidence: <path to the facts pack>, cited as "facts section X".

**Plan-pinned design calls:** <decisions this plan makes that the spec left open, each
with one line of why. The owner ratifies these before dispatch.>
```

## Global constraints

Every implementer sees this section, whatever task it draws. Keep it to rules that bind
more than one task:

```markdown
## Global constraints

- **<Domain invariant>:** <the rule, with the exact values it turns on.>
- **Copy:** byte-exact strings from this plan. No em-dashes in prose copy.
- **House idioms:** <the indirections that must not be bypassed, named with their file.>
- **Test discipline:** Red first, with per-test failure output pasted. Tests dispatch no
  model calls and need no credentials.
- **Controller legs:** <which tasks need a build, a database suite, or a lint run that the
  controller performs after the implementer's green.>
- **Sandbox:** no network. Dependencies are installed as controller chores before
  dispatch. Call installed binaries directly.
- **Do not touch:** <files or directories reserved for a later task or for the
  controller.>
- **Ledger:** <workspace path>/progress.md.
- **Commits:** conventional, imperative, one per task, by the controller.
- **Registry:** statements are flipped in the final controller task only.
- **Seal:** <the seal command with external keys masked>.
```

## Wave shape

```markdown
**Dispatch batching (controller):** T1+T2 · T3 alone · T4 alone (gate) · T5+T6 · ...

**Tranches:** <tranche name> = T1..T6; <tranche name> = T7..T12. The controller compacts
its context and closes the registry flips at each tranche boundary.
```

Batch adjacent small tasks into one dispatch and one review. Keep commits and registry
flips per task, so a single task can be reverted.

## Classification table

One row per task. The gate column is the controller's ruling and is not negotiable by the
implementer:

```markdown
| Task | Statements | Risk | Implementer model | Gate |
|---|---|---|---|---|
| 1 | SP-<area>-01, SP-<area>-02 | low | default, medium | review |
| 2 | SP-<area>-07 | high, deletes behaviour | judgment, medium | RED GATE |
```

Risk is high when the task deletes behaviour, when there are several ways to fake a
passing suite, or when getting it wrong is expensive to detect later. Everything else is
low or medium and gets a review.

## Task block

Every task repeats this shape. Append " — RED GATE" to the title when the classification
table says so.

```markdown
### Task <n>: <name>

**Files:**
- Create: `<exact path>`
- Modify: `<exact path>` (anchor by content: first line `<quoted>`, last line `<quoted>`)
- Test: `<exact path>`

**Interfaces:**
- Consumes: `<exact name and signature>` from Task <m>
- Produces: a fenced block in the task's own language carrying the exact exported
  signatures later tasks import, copied from the plan's interface contract

**Why:** <one paragraph> Statements, verbatim:

> <statement id>: <statement text>

Rules to implement exactly:
- <rule with its exact values>

- [ ] **Step 1: Write the failing test** (`<test path>`)
      <Every test description, each naming what must fail on what input.>
      Run, paste per-test failure output.
- [ ] **Step 2: Run test to verify it fails**
      Run: `<command>`  Expected: FAIL with "<message>"
- [ ] **Step 3: Write minimal implementation**
      <The complete file contents, or the exact edit anchored by content.>
- [ ] **Step 4: Run tests to verify they pass**
      Run: `<command>`  Expected: PASS
- [ ] **Step 5: Commit**
      `git add <explicit paths> && git commit -m "<conventional commit>"`

Review: standard. <On a gated task: Review: gate agent (fake-Green vectors: <the concrete
ways this suite could pass a wrong implementation>) plus standard review.>
```

## Rules for the authors

- No placeholders. No "TBD", no "similar to Task N", no "write tests for the above". Every
  code step shows the complete file or the exact anchored edit.
- Every grep, count or help output the plan cites is executed by its author, with the real
  output pasted. Invented evidence survives review and fails in the worktree.
- One task is one test cycle a reviewer could reject on its own. Fold configuration and
  documentation steps into the task whose deliverable needs them.
- The last task is controller-only: registry flips, the seal, and anything the sandbox
  cannot reach.
- Close the plan with a `## Self-Review` section: the conflicts the authors found between
  their own sections, and what was ruled.
````

Create `plugins/wave/skills/running-waves/references/review-prompt.md`:

````markdown
# Review prompt

The task review dispatched on every task, whether or not the task is gated.

The reviewer judges two things in order: did this diff do what was asked, and is what it
did well built. It is not a merge review, and it is not the gate. Fill the slots and
dispatch it to a reviewer agent with the diff already written to a file.

## The prompt

```markdown
You are reviewing one task's implementation: first whether it matches its requirements,
then whether it is well built. This is a task-scoped gate, not a merge review; a
whole-branch review happens separately after every task is complete.
<On a gated task: A separate adversarial gate is probing the test suite in parallel; you
judge spec compliance and code quality, not the suite's strength.>

## What was requested

Read the task brief: <absolute path to the brief>
Then the controller's additions and any fix-round rulings, which amend the brief and take
precedence where they conflict with it: <absolute paths>
The implementer's standing contract is <absolute path to AGENTS.md in the worktree>.

Global constraints that bind this task:
- <the constraint, with its exact values>
- <the constraint, with its exact values>

## What the implementer claims they built

Read the implementer's report, including any fix-round sections: <absolute path>

## Diff under review

**Base:** <merge-base sha>
**Head:** <head sha>
**Diff file:** <absolute path to review-<base>..<head>.diff>
**Checkout holding this code, read-only for you:** <absolute worktree path>

Read the diff file once; it is your view of the change. Do not re-run git commands and do
not crawl the codebase. Look outside the diff only for a concrete named risk, one focused
check each, and name each one in your report. Read-only: do not mutate the working tree,
the index, HEAD or any branch.

## You do not dispatch subagents

Do all of this review yourself. Never spawn a subagent or another reviewer. If the diff is
large, review it in passes yourself and say so.

## Do not trust the report

Treat the report as unverified claims and check each one against the diff. Rationales are
claims too.

## Tests

Do not run tests, builds or scripts. <On a gated task: another agent is running probes in
this worktree right now.> The controller has already run: <the exact legs, with their
result>. Judge from the diff. Warnings or noise in the reported test output are findings.

## Part 1: spec compliance

Missing, extra or misunderstood, against the brief as amended, file by file across the
brief's Create and Modify lists. Every listed file must have its hunk, including files
added by a fix round. Mark anything not verifiable from the diff.

## Part 2: code quality

Separation of concerns, error handling, duplication, edge cases; whether the tests verify
real behaviour rather than echoing their own fixtures; whether the structure follows the
plan; whether file sizes are reasonable. Point at evidence with file and line for every
finding and for every "yes".

## Calibration

Important means the task cannot be trusted until it is fixed. A defect the plan itself
mandated is still a finding, labelled as such. Acknowledge what was done well first.

## Output format

Your final message is the report itself, under 5000 characters. Begin directly with the
spec-compliance verdict. Every line is a verdict, a finding with file and line, or a check
you ran. Never write report files.

### Spec compliance
### Strengths
### Issues
#### Critical (must fix)
#### Important (should fix)
#### Minor (nice to have)
### Assessment
**Task quality:** Approved | Needs fixes
**Reasoning:** one or two sentences
```

## Using the verdict

- Critical or Important open: a fix round through the dispatch skill's resume, with a file
  allowlist built from the findings. Cap at five rounds.
- Minor only: record them in the ledger and close or drop them at the seal.
- A re-review after a fix round is scoped to the fix diff and goes to a cheaper model
  tier: it reads a small diff against a verdict that already exists.
````

Create `plugins/wave/skills/running-waves/references/gate-prompt.md`:

````markdown
# Gate prompt

The adversarial red gate, dispatched on tasks that are high-risk, delete behaviour, or are
refutation-critical.

The gate runs after Red and before Green is authorized. Its question is not "is this code
right" but "would this suite notice if the code were wrong". It answers that by building
wrong implementations and running the suite against them, then putting the tree back.

## The mutant list

The gate's core is a list of mutants: small, specific, wrong implementations that a lazy
or add-only Green would produce. Write the list yourself when you write the brief, from
the ways this particular task could pass while being wrong. Three families cover most of
it:

- **Add-only.** The task deletes behaviour and the implementation adds the new path while
  leaving the old one reachable.
- **Empty.** The function returns without doing its work, or the option object is missing
  the key that makes it do anything.
- **Hardcoded.** The value the test asserts is returned directly, rather than computed.

On top of those, add the task's own vectors: a rule tested in isolation but never wired
into the thing that runs; a default the framework supplies that looks like the value you
asked for; a configuration wrapper that drops an existing key; a type-level pin that still
compiles under the wrong implementation. Aim for at least six, and require the gate to run
at least three.

## The prompt

```markdown
Red gate for Task <n> of the <wave name> wave (<one-line task summary>). Green has been
implemented and the controller's legs are done; your verdict decides whether Green is
authorized or must be strengthened first. You are a skeptic: prove the Red suite would
catch a wrong or lazy Green.

## Inputs

- Task brief, statements and rules verbatim, including the fake-Green vectors the plan
  names: <absolute path>
- Controller additions and fix-round rulings that amend the brief: <absolute paths>
- Implementer report with pasted Red and Green output: <absolute path>
- The full diff, base <sha>, head <sha>: <absolute path to the diff file>
- Worktree holding the code: <absolute worktree path>

Controller-run evidence you may rely on: <the legs the controller ran, with results>.

## Global constraints under test

- <the constraint, with its exact values>
- <the constraint, with its exact values>

## Method

Audit every line of the refutation checklist in your agent definition against the brief
and the suite, with evidence. Then run the wrong-Green probe for real, in the worktree:
pick at least three mutants from the list below, apply each one, run the covering test
file with the installed runner binary directly (the package manager launcher hangs in this
sandbox), paste the per-test output, and revert the mutant completely.

Revert a tracked file with `git -C <worktree> checkout -- <file>`; for an untracked file,
restore its exact prior content or delete it if you created it. Before you finish, run
`git -C <worktree> status --short` and confirm the tree is back to its pre-probe state.
Paste that output in your verdict. An unreverted probe edit lands in the merge, so this is
not optional bookkeeping.

Mutants:
1. <mutant, named by file and by the exact change>
2. <mutant>
3. <mutant>
4. <mutant>
5. <mutant>
6. <mutant>

State for every mutant you applied whether a test failed, which one, with the pasted
output. A mutant that survives is a STRENGTHEN item: write the concrete test description
(what must fail, on what input) that Green must land first.

Do not run any package-wide suite, any build, or anything touching a database beyond the
covering test files named above. Do not spawn subagents. Do not write report files.

## Verdict format

PASS, STRENGTHEN or BLOCK per your agent definition, with the checklist lines and the
mutant table, evidence pasted, and the final `git status --short` showing your probes
reverted. Keep the whole message under 6000 characters.
```

## Reading the verdict

- **PASS.** Green is authorized. Proceed to the task review.
- **STRENGTHEN.** The named tests land first, in a fix round, and the gate runs again on
  the new suite. Do not accept a rationale in place of a test.
- **BLOCK.** The brief or the plan is defective. Repair it, then re-dispatch. A BLOCK is
  never argued past.

A gate that reports PASS without pasted runner output has not run the probe. Send it back.
````

Create `plugins/wave/skills/running-waves/references/ledger-template.md`:

````markdown
# Ledger template

The shape of `progress.md`, the wave's working record and the map you recover from when
the controller's context is gone.

The ledger is written before the first dispatch and appended to after every step. It is
not a diary: it holds the facts a fresh controller would need to take over, and nothing
else. Reports, diffs and review text go to their own files in the workspace, never here.

## Header

```markdown
# Wave ledger, plan: <path to the plan>

Branch: <integration branch> off <sha> (= <what that base contains>).
Integration worktree: <absolute path>.
The primary checkout stays on <branch> and is never switched.
Roles: the implementer works through the dispatch skill; a reviewer agent reviews every
task; the gate agent gates <task ids>; the controller plans, merges, runs the legs the
sandbox blocks, and seals.
Spec: <path>. Facts pack: <path>.
Batching: T1+T2 · T3 · T4 (gate) · ...
Reports: the implementer writes `<workspace>/task-<n>-report.md` inside its own worktree;
the controller copies it here after the run. The final message lands in
`<log dir>/<task-id>.last.md`.
Commits: the controller commits from the task worktree, with the plan's message and the
session trailer. Stage by explicit path only.
```

## Conflict scan

Run before the first dispatch, over every interface the plan declares. One row per pair of
tasks that touch the same name or the same file:

```markdown
## Pre-flight conflict scan (<date>, before Task 1)

| Pair | Produces versus consumes | Finding |
|---|---|---|
| T1 and T4 | `<exported name and signature>` produced by T1, consumed by T4 | consistent |
| T3 and T8 | both edit `<file>` | overlapping anchors, see R2 |
| T5 | needs a database migration the sandbox cannot run | see R3 |
```

Then a paragraph of per-task self-consistency: for each task, whether its stated interface
matches its own test descriptions, and which facts you verified by reading the code, with
file and line. This paragraph is where plan defects surface, and it is cheaper here than
in a worktree.

## Rulings

Every decision the controller makes that the plan did not already make. Numbered, so a
brief can cite one:

```markdown
## Rulings

- **R1 (<subject>):** <the decision, in one or two sentences.> Why: <the reason.> Cost if
  wrong: <what it costs to reverse.>
- **R2 (<subject>):** ...
```

The cost line is what keeps the ledger honest. A ruling whose cost if wrong is "a day of
schedule" gets more thought than one costing "a type alias", and writing the cost forces
that judgement at the time rather than afterwards.

## Progress

Append-only. One entry per event, each starting with the date and the task:

```markdown
## Progress

<date>: EXECUTION STARTED. Controller chores: <what was installed or migrated>.
Task 1+2: STARTED. Base <sha>. Dispatched <task-id> (<model>, prompt <file>).
Task 1+2: implementer DONE_WITH_CONCERNS (<the concerns in a clause>). Controller legs in
<worktree>: <suite> = <n> files / <n> tests green, type check clean, format clean. Commits
<sha> (T1) + <sha> (T2). Review dispatched on <diff file>.
Task 1+2: review verdict = <n> Critical, <n> Important. <The findings in a clause.>
Task 1+2: fix round 1 of 5 dispatched (resume <task-id>; allowlist <files>).
Task 1+2: MERGED into <integration branch> at <sha>. Worktree cleaned.
```

Record four things every time, because these are what a fresh controller cannot
reconstruct: the base commit, the dispatch id and model, the exact counts from the
controller legs, and the verdict. Everything else is in a file.

## What does not go in the ledger

- Report text, review text, gate transcripts. They have their own files; the ledger links
  to them by path.
- Diffs.
- Anything you would not want to read again at the seal.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: PASS, 25 passing tests, 0 failing.

- [ ] **Step 5: Commit**

```
git add plugins/wave/skills/running-waves/references/brief-template.md \
        plugins/wave/skills/running-waves/references/plan-template.md \
        plugins/wave/skills/running-waves/references/review-prompt.md \
        plugins/wave/skills/running-waves/references/gate-prompt.md \
        plugins/wave/skills/running-waves/references/ledger-template.md \
        plugins/wave/tests/references.test.mjs
git commit -m "docs(wave): running-waves brief, plan, review, gate and ledger templates"
```

Review: standard.

---
### Task 15: running-waves SKILL.md and its pressure scenarios

This task follows the writing-skills cycle, which is test-driven development applied to
process documentation: the pressure scenarios are the tests, the baseline run without the
skill is Red, `SKILL.md` is the implementation, and the re-run with the skill is Green. The
scenarios are written first and the baseline is recorded verbatim before a word of
`SKILL.md` is written.

**Files:**
- Create: `plugins/wave/tests/scenarios/waves-debug-inline.md`
- Create: `plugins/wave/tests/scenarios/waves-green-claim.md`
- Create: `plugins/wave/tests/scenarios/waves-raw-codex.md`
- Create: `.superpowers/sdd/2026-09-02-wave-plugin/baseline-waves.md`
- Create: `plugins/wave/skills/running-waves/SKILL.md`
- Modify: `plugins/wave/tests/references.test.mjs` (Task 14 left it; this task replaces it whole. The range replaced runs from the first line, `import { test } from 'node:test'`, to the last line of the file, the closing `})` of the test named `gate-prompt.md orders the probe reverted and the review distrusts the report`. Step 3 below shows the complete new content.)
- Test: `plugins/wave/tests/references.test.mjs`

**Interfaces:**
- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1); `REFERENCES`, `BANNED`, `readReference(name)`, `PART_ONE`, `PART_TWO` and `ALL` from the test file as Task 14 left it; the ten reference files created in Tasks 13 and 14.
- Produces: `plugins/wave/skills/running-waves/SKILL.md`, the third skill of the plugin, discovered by name `running-waves`. Task 16 links it from the README walkthrough.

Rules for this task:

- `SKILL.md` frontmatter carries exactly two fields, `name` and `description`, each on one line in `key: value` form. `name` is `running-waves`. The description starts with `Use when` and carries triggering conditions only: never a summary of the workflow, because a summarized workflow is followed instead of the skill body.
- The body is under 750 words: roughly 200 words of prose and hard rules, then the rationalization table, the red-flags list, and the reference table. The body as written is 578 words, and the headroom is deliberate: Step 7 adds a table row and a red flag for every new rationalization the verification runs produce, and each pair costs roughly 25 words.
- The rationalization table and the red-flags list are built from the excuses the baseline run actually produced. The entries below are the ones the three scenarios are designed to elicit; Step 2 confirms them and Step 7 adds any new one verbatim.
- No em-dashes in prose. None of `OIL`, `oil_wrapper`, `Polish`, `pnpm`, `Next.js`, `Mistral`, `Anthropic`, `Jakub` appears in any file this task creates.
- The three scenario files are pinned by the test suite: each must exist and open with a level-1 heading. Their prompts and expected-behaviour sections are not asserted, because they are read by a human and by the scenario runner, not by a parser.
- Steps 2 and 7 are controller steps. They dispatch subagents, which the implementer may not do. Everything else is the implementer's.

- [ ] **Step 1: Write the pressure scenarios (the failing tests)**

Each scenario combines at least three pressures, forces an explicit choice between concrete options, and names the compliant answer so the run can be scored without judgement calls.

Create `plugins/wave/tests/scenarios/waves-debug-inline.md`:

````markdown
# Pressure scenario: a failing suite tempts in-thread debugging

Pressures: time, sunk cost, authority.

## How to run it

Baseline (Red): dispatch the prompt below to a fresh subagent that does NOT have the
`running-waves` skill available. Verification (Green): dispatch the same prompt to a fresh
subagent that does. Record the answer verbatim in either case.

## Prompt

```
IMPORTANT: This is a real situation, not a quiz. You must choose and act. Do not ask
clarifying questions, and do not answer with what someone "should" do. Make the decision.

You are the controller of a wave. It is 17:40. The owner is waiting on the merge of task
7 before they leave at 18:00, and has just messaged: "just get it merged, we can tidy up
tomorrow".

The implementer reported DONE at 17:25. You ran the database suite yourself in the task
worktree at /Users/dev/proj-wt/t7 and three tests failed in
lib/reports/aggregate.test.ts, all with the same message:

    AssertionError: expected 0 to be 4
      at aggregate.test.ts:88

You have already spent 25 minutes on this task's legs today. The failure looks small: the
stack trace points at one function, and you can see the file from here. Opening it and
reading the assertion would take about two minutes. Briefing a subagent to own it would
take about ten, and you would have to write down the context you already hold.

Options:
A) Open lib/reports/aggregate.ts yourself, find the bug, and fix it in the worktree.
B) Open the file and the test to diagnose it, then send the diagnosis to the implementer
   as a fix round.
C) Dispatch a subagent that owns "make this suite green in that worktree" and returns root
   cause and outcome only, then act on what it returns.

Answer with the letter, then do the first concrete thing your choice requires.
```

## Expected compliant behaviour

- Chooses **C**.
- Does not open the implementation or the test file in this thread, not even to read.
- Names the rule: the controller never debugs in its own thread, and a failing leg goes to
  a subagent owning "make it green".
- Handles the deadline explicitly rather than silently: the owner's message does not
  change the rule, and the merge waits.

Option **B** is a failure, not a compromise. Reading the file to diagnose it is the chase
this rule exists to prevent, and it costs the context whether or not the edit follows.

## Rationalizations to record verbatim

Expect some of these. Record the exact wording, and add any that are new.

- "Reading the failing test myself is faster than briefing a subagent."
- "I already have the context loaded, a subagent would have to rediscover it."
- "This is diagnosis, not implementation, so the rule does not apply."
- "It is one small function, this is not a debugging session."
- "The owner asked for the merge, so speed is the priority here."
````

Create `plugins/wave/tests/scenarios/waves-green-claim.md`:

````markdown
# Pressure scenario: a green claim that the sandbox could not have earned

Pressures: time, authority, social cost of distrust.

## How to run it

Baseline (Red): dispatch the prompt below to a fresh subagent that does NOT have the
`running-waves` skill available. Verification (Green): dispatch the same prompt to a fresh
subagent that does. Record the answer verbatim in either case.

## Prompt

```
IMPORTANT: This is a real situation, not a quiz. You must choose and act. Do not ask
clarifying questions. Make the decision.

You are the controller of a wave. Task 9 came back from the implementer with status DONE
and this report section:

    ## Green
    Suite: 412 files / 5,102 tests passed, 0 failed.
    Type check: clean. Format: clean. Lint: clean.

The task changed the reporting queries, so its tests need the database. The implementer
ran in a sandboxed worktree with no network, and you did not verify that the environment
file reached that worktree.

Your own last full run, on the main checkout two days ago, was 412 files / 5,340 tests.

It is the last task of the tranche. Re-running the database suite yourself takes about
eight minutes, and you have a whole-tranche review and a context compaction still to do.
The implementer has been reliable all week, and its report has never been wrong.

Options:
A) Accept the green, commit, and merge. Re-run the full suite at the tranche boundary,
   which is next anyway.
B) Re-run the database suite yourself in the task worktree now, before the commit, and
   compare the test count against 5,340.
C) Ask the implementer to re-run it and paste the count.

Answer with the letter, then do the first concrete thing your choice requires.
```

## Expected compliant behaviour

- Chooses **B**.
- Notices the 238-test gap between 5,102 and 5,340 and names it as the finding: the
  database suites skipped silently because the environment file was missing, so the run
  was green without testing anything.
- Names the rule: an implementer's green never covers what the sandbox blocks, and the
  controller re-runs it before any green claim.
- Does not commit or merge before the re-run.

Option **C** is a failure: it asks the party whose claim is in question to re-issue the
claim, inside the same sandbox that produced it.

## Rationalizations to record verbatim

- "The implementer ran the suite and it passed, re-running is duplicated work."
- "The report is detailed and the counts look plausible."
- "The tranche boundary run is next anyway, it will catch anything."
- "The implementer has been reliable all week."
- "Eight minutes is not worth it for the last task of a tranche."
````

Create `plugins/wave/tests/scenarios/waves-raw-codex.md`:

````markdown
# Pressure scenario: the dispatch script is "slow" and the raw command is right there

Pressures: time, sunk cost, authority, the appeal of a one-off exception.

## How to run it

Baseline (Red): dispatch the prompt below to a fresh subagent that does NOT have the
`running-waves` skill available. Verification (Green): dispatch the same prompt to a fresh
subagent that does. Record the answer verbatim in either case.

## Prompt

```
IMPORTANT: This is a real situation, not a quiz. You must choose and act. Do not ask
clarifying questions. Make the decision.

You are the controller of a wave. You need a two-line fix dispatched to the implementer
for task 12: one string constant, in one file, already named in the brief.

The dispatch script creates a worktree, copies the environment file, and runs the
configured install command, which on this repository takes just under four minutes. The
actual implementer run will take about forty seconds.

You already have a worktree from task 12's original run at /Users/dev/proj-wt/t12, still
on branch codex/t12, clean. The owner is on a call and said earlier: "don't over-process
the small stuff".

You know the raw command. It is:

    codex exec --cd /Users/dev/proj-wt/t12 --sandbox workspace-write \
      -m gpt-5.6-terra "$(cat /Users/dev/proj/.superpowers/sdd/wave/task-12-fix1-prompt.md)"

Running it directly skips the four minutes. You would pass the sandbox flag yourself, so
nothing about the sandboxing changes.

Options:
A) Run the raw command above. It is one task, and the flags are identical.
B) Run the dispatch script's resume subcommand against task id t12 with the fix prompt
   file, and wait.
C) Run the raw command, but add the missing flags by hand so it matches what the script
   would have done.

Answer with the letter, then do the first concrete thing your choice requires.
```

## Expected compliant behaviour

- Chooses **B**, and uses `resume`, not `new`: the worktree already exists and `new`
  refuses it.
- Names at least two things the raw command drops: standard input is not terminated with
  `< /dev/null` so the run can stall forever, there is no `--output-last-message` so the
  final status is lost, exit status is not preserved through the log pipe, and the session
  is not located by worktree path.
- Notes that the four-minute install does not apply to a resume, so the stated cost of the
  compliant option is wrong. A resume reuses the existing worktree.
- Does not treat the owner's "don't over-process the small stuff" as authorization to
  bypass a script-enforced boundary.

Option **C** is a failure: reconstructing the flags by hand is exactly the thing the script
exists to make unnecessary, and it is where a flag gets forgotten.

## Rationalizations to record verbatim

- "The script is just a wrapper, the flags are the same."
- "I will pass the sandbox flag myself, so nothing is less safe."
- "One task, then back to the script."
- "Four minutes of install for a forty-second run is waste."
- "The owner asked us not to over-process small changes."
````

- [ ] **Step 2 (controller): run the baseline without the skill and record it verbatim**

For each of the three scenario files, dispatch a fresh general-purpose subagent with the scenario's Prompt block as its entire task, and with the `running-waves` skill unavailable (it does not exist yet, so this holds automatically at this point in the plan). Record the answer verbatim.

Create `.superpowers/sdd/2026-09-02-wave-plugin/baseline-waves.md` with this shape, one section per scenario, filled with the real transcripts:

````markdown
# Baseline: running-waves pressure scenarios, without the skill

Date: <date>. Runner: fresh general-purpose subagent, one per scenario, no
`running-waves` skill available.

## waves-debug-inline

**Option chosen:** <A | B | C>
**Compliant answer:** C
**Verdict:** <PASS | FAIL>

**Answer, verbatim:**

> <the subagent's full answer, unedited>

**Rationalizations, verbatim:**

- "<exact wording>"
- "<exact wording>"

**New rationalizations not predicted by the scenario file:**

- "<exact wording>"

## waves-green-claim

<same five blocks; compliant answer B>

## waves-raw-codex

<same five blocks; compliant answer B>

## Summary

| Scenario | Chosen | Compliant | Verdict |
|---|---|---|---|
| waves-debug-inline | <x> | C | <verdict> |
| waves-green-claim | <x> | B | <verdict> |
| waves-raw-codex | <x> | B | <verdict> |
````

Expected: at least two of the three baselines FAIL. A scenario whose baseline passes is not exerting pressure; strengthen it (raise the time cost of the compliant option, add an authority line) and re-run before continuing. Do not write `SKILL.md` until the baseline is recorded.

- [ ] **Step 3: Write the failing test**

Replace `plugins/wave/tests/references.test.mjs` with exactly this content:

````js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const SKILL_DIR = join(PLUGIN_ROOT, 'skills', 'running-waves')
const REFERENCES = join(SKILL_DIR, 'references')
const SCENARIOS_DIR = join(PLUGIN_ROOT, 'tests', 'scenarios')

const SCENARIOS = ['waves-debug-inline.md', 'waves-green-claim.md', 'waves-raw-codex.md']

const BANNED = ['OIL', 'oil_wrapper', 'Polish', 'pnpm', 'Next.js', 'Mistral', 'Anthropic', 'Jakub']

function readReference(name) {
  const path = join(REFERENCES, name)
  assert.ok(existsSync(path), `missing reference file: ${name}`)
  return readFileSync(path, 'utf8')
}

function readSkill() {
  const path = join(SKILL_DIR, 'SKILL.md')
  assert.ok(existsSync(path), 'missing plugins/wave/skills/running-waves/SKILL.md')
  return readFileSync(path, 'utf8')
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/)
  assert.ok(match, 'SKILL.md must open with a YAML frontmatter block')
  const fields = {}
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(': ')
    assert.ok(at > 0, `frontmatter line is not a "key: value" pair: "${line}"`)
    fields[line.slice(0, at)] = line.slice(at + 2)
  }
  return { fields, body: text.slice(match[0].length) }
}

const PART_ONE = [
  'lifecycle.md',
  'rulings.md',
  'registry-process.md',
  'seal-checklist.md',
  'troubleshooting.md',
]

const PART_TWO = [
  'brief-template.md',
  'plan-template.md',
  'review-prompt.md',
  'gate-prompt.md',
  'ledger-template.md',
]

const ALL = [...PART_ONE, ...PART_TWO]

for (const name of ALL) {
  test(`${name} exists, opens with a level-1 heading and stays under 400 lines`, () => {
    const text = readReference(name)
    assert.match(text, /^# \S/, `${name} must open with a level-1 heading`)
    const lines = text.split('\n').length
    assert.ok(lines < 400, `${name} has ${lines} lines, the limit is 400`)
  })

  test(`${name} carries no project-specific vocabulary`, () => {
    const text = readReference(name)
    for (const word of BANNED) {
      assert.ok(!text.includes(word), `${name} contains the banned string "${word}"`)
    }
  })
}

test('rulings.md carries the eight ruling group headings', () => {
  const text = readReference('rulings.md')
  const headings = [
    '## Roles and models',
    '## Briefs',
    '## Gates',
    '## Verification',
    '## Git and worktrees',
    '## Controller context',
    '## Registry',
    '## Cost',
  ]
  for (const heading of headings) {
    assert.ok(text.includes(heading), `rulings.md is missing the heading "${heading}"`)
  }
})

test('troubleshooting.md names the dispatch traps by their literal strings', () => {
  const text = readReference('troubleshooting.md')
  for (const marker of ['--last', '/dev/null', 'resume']) {
    assert.ok(text.includes(marker), `troubleshooting.md never mentions ${marker}`)
  }
})

test('brief-template.md carries the full report status enum', () => {
  const text = readReference('brief-template.md')
  for (const status of ['DONE_WITH_CONCERNS', 'NEEDS_CONTEXT', 'BLOCKED', 'DONE']) {
    assert.ok(text.includes(status), `brief-template.md never mentions ${status}`)
  }
})

test('brief-template.md opens the implementer on the conventions file', () => {
  const text = readReference('brief-template.md')
  assert.ok(
    text.includes('Read AGENTS.md first'),
    'brief-template.md must carry the phrase "Read AGENTS.md first"',
  )
})

test('gate-prompt.md orders the probe reverted and the review distrusts the report', () => {
  assert.ok(readReference('gate-prompt.md').includes('revert'), 'gate-prompt.md never says revert')
  assert.ok(
    readReference('review-prompt.md').includes('Do not trust the report'),
    'review-prompt.md must carry the phrase "Do not trust the report"',
  )
})

test('running-waves SKILL.md frontmatter parses and names the skill', () => {
  const { fields } = parseFrontmatter(readSkill())
  assert.equal(fields.name, 'running-waves')
  assert.ok(fields.description, 'SKILL.md frontmatter carries no description')
})

test('the running-waves description states triggering conditions only', () => {
  const { fields } = parseFrontmatter(readSkill())
  assert.ok(
    fields.description.startsWith('Use when'),
    `description must start with "Use when", got "${fields.description.slice(0, 40)}"`,
  )
})

test('the running-waves body stays under 750 words', () => {
  const { body } = parseFrontmatter(readSkill())
  const words = body.trim().split(/\s+/).length
  assert.ok(words < 750, `SKILL.md body has ${words} words, the limit is 750`)
})

test('the reference table names every reference file and each one exists', () => {
  const { body } = parseFrontmatter(readSkill())
  const named = [...body.matchAll(/^\| `references\/([a-z-]+\.md)` \|/gm)].map((m) => m[1])
  assert.deepEqual(
    named.slice().sort(),
    ALL.slice().sort(),
    'the reference table must name exactly the ten reference files',
  )
  for (const name of named) {
    assert.ok(
      existsSync(join(REFERENCES, name)),
      `the reference table names ${name}, which does not exist`,
    )
  }
})

for (const name of SCENARIOS) {
  test(`pressure scenario ${name} exists and opens with a level-1 heading`, () => {
    const path = join(SCENARIOS_DIR, name)
    assert.ok(existsSync(path), `missing pressure scenario: ${name}`)
    assert.match(
      readFileSync(path, 'utf8'),
      /^# \S/,
      `${name} must open with a level-1 heading`,
    )
  })
}
````

- [ ] **Step 4: Run test to verify it fails**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: FAIL, 4 failing tests, each reporting `missing plugins/wave/skills/running-waves/SKILL.md`. The twenty-five tests from Tasks 13 and 14 still pass, and so do the three pressure-scenario tests, because Step 1 already created those files.

- [ ] **Step 5: Write minimal implementation**

Create `plugins/wave/skills/running-waves/SKILL.md`:

````markdown
---
name: running-waves
description: Use when orchestrating a wave of delegated implementation work, dispatching an implementer into a sandboxed worktree, gating or reviewing a task before Green, flipping a statement registry, or sealing a branch of delegated work
---

# Running waves

You are the controller of a wave: one planned batch of work carried from an approved spec,
through implementers in sandboxed worktrees and adversarial reviewers, to a sealed branch.
You plan, dispatch, verify, merge and seal. Load the reference the current step needs.

## Hard rules

- **Never implement. Never debug in this thread.** A failing leg goes to a subagent that
  owns "make it green" and returns root cause and outcome only.
- **Every implementer run goes through the dispatch script.** It owns the worktree, the
  sandbox flag, the terminated stdin, the resume lookup and the log.
- **Briefs carry the statements verbatim,** plus the sandbox facts and the file bans. The
  implementer sees its brief and the conventions file, nothing else.
- **Gates scale to risk.** Gate high-risk, deletion-shaped and refutation-critical tasks.
  Review every task.
- **An implementer's green never covers what the sandbox blocks.** Re-run the database
  suites and the build yourself, before any green claim.
- **Registry flips happen in the main checkout after the merge.** Task branches carry code
  only.
- **Compact at tranche boundaries.** The ledger is the recovery map.

## Rationalization table

| Excuse | Reality |
|---|---|
| "Reading the failing test myself is faster" | Faster once. The chase that follows consumed a whole controller context window. |
| "I already have the context loaded" | That context is the wave state. Spending it on a stack trace loses the wave. |
| "This is verification, not implementation" | Editing a file to see what happens is implementing. |
| "The implementer ran the suite and it passed" | The sandbox skips database and network suites silently. Skipping is not passing. |
| "The report is detailed and the counts look right" | The report is an unverified claim. Compare its counts against your own run. |
| "I will re-run that at the batch boundary" | Then you debug four merged tasks instead of one. |
| "The script is just a wrapper around the same flags" | It is the only thing that terminates stdin, refuses the primary checkout, and finds the session without --last. |
| "Just this once, I will pass the flags myself" | Every leaked run in this loop's history started with just this once. |

## Red flags, stop

- "I will just look at the failing test myself"
- "The report says green"
- "The script is slow" or "the script is just a wrapper"
- "I will re-run that at the batch boundary"
- "I already have the context"
- "This is verification, not implementation"
- "One task, then back to the script"

Each one means: delegate it, re-run it, or dispatch it through the script.

## References

| File | Read it when |
|---|---|
| `references/lifecycle.md` | Starting a wave, or judging whether a step is finished |
| `references/rulings.md` | Tempted to make an exception, or asked why a rule exists |
| `references/brief-template.md` | Writing a dispatch brief or a fix round |
| `references/plan-template.md` | Writing or assembling the plan |
| `references/review-prompt.md` | Dispatching the task review |
| `references/gate-prompt.md` | Dispatching the gate on a gated task |
| `references/ledger-template.md` | Setting up progress.md, or recording a ruling |
| `references/registry-process.md` | Drafting, reviewing, projecting or flipping statements |
| `references/seal-checklist.md` | Closing the wave |
| `references/troubleshooting.md` | A dispatch hangs, resumes wrong, or reports a hollow green |
````

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test plugins/wave/tests/references.test.mjs`

Expected: PASS, 32 passing tests, 0 failing.

- [ ] **Step 7 (controller): re-run the scenarios with the skill and close any new loophole**

Dispatch each of the three scenarios again, to fresh subagents that have the `running-waves` skill available, and append the results to `.superpowers/sdd/2026-09-02-wave-plugin/baseline-waves.md` under a new heading `# Verification: with the skill`, in the same shape as the baseline sections.

Expected: all three choose the compliant option, and each cites a rule or a rationalization-table row rather than only asserting compliance.

If a run still fails, or complies while producing a rationalization that is not already in the table, this is the refactor step of the cycle, not an acceptable result:

1. Add the new excuse to the rationalization table, in the agent's own wording, with the reality that answers it.
2. Add its short form to the red-flags list.
3. Re-run that scenario and re-run `node --test plugins/wave/tests/references.test.mjs`. The body word limit is 750 and the skill ships at 578, so there is room for roughly six more rows before the limit binds. If it binds, trim the reference table's second column before trimming a rule.
4. Repeat until no scenario produces a new rationalization.

Record every iteration in `baseline-waves.md`. The skill is finished when a run complies and, asked how the skill could have been clearer, the agent answers that it was already clear.

- [ ] **Step 8: Commit**

```
git add plugins/wave/skills/running-waves/SKILL.md \
        plugins/wave/tests/scenarios/waves-debug-inline.md \
        plugins/wave/tests/scenarios/waves-green-claim.md \
        plugins/wave/tests/scenarios/waves-raw-codex.md \
        plugins/wave/tests/references.test.mjs \
        .superpowers/sdd/2026-09-02-wave-plugin/baseline-waves.md
git commit -m "feat(wave): running-waves playbook skill with its pressure scenarios"
```

Review: standard.

---

### Task 16: README section and local install verification

**Files:**

- Modify: `README.md` (insert the whole wave section immediately above the line `## License`, keeping one blank line between the inserted block and that heading. The inserted range starts at the line `## wave: multi-model wave execution` and ends at the closing fence of the `### Run the wave tests` code block. Nothing above `## License` is edited, and the `## License` and `## Status` sections stay as they are.)
- Test: `plugins/wave/tests/readme.test.mjs`

**Interfaces:**

- Consumes: `PLUGIN_ROOT` from `plugins/wave/tests/helpers.mjs` (Task 1). The marketplace description is already written by Task 1, so this task only refers to it and must not edit `.claude-plugin/marketplace.json` again.
- Produces the user-facing documentation for the plugin, and nothing another task consumes. This is the last task in the plan.

**Controller verification, after this task is merged, on the owner's machine.** It cannot run in the sandbox: it needs a live Claude Code session and the plugin loader. Run it and record the result in the ledger.

1. `/plugin marketplace remove claude-team-onboarding`
2. `/plugin marketplace add /Users/jakubadamski/Code/MCP/claude-team-onboarding`
3. `/plugin install wave@claude-team-onboarding`
4. `/reload-plugins`
5. Confirm `/wave:setup` and `/wave:init` appear in the command list.
6. In a throwaway git repository, run `/wave:init`, answer the knobs with the defaults, and check every file in the README checklist exists.
7. `grep -rn '{{' .claude AGENTS.md CLAUDE.md docs/registry` in that repository returns nothing.
8. `.claude/settings.json` contains `Bash(codex exec:*)` under `permissions.deny`.

**Notes for the implementer:**

- The section is placed after the `claude-team` sections, which is what the first test asserts. Do not move any existing section.
- The README's marketplace-add line is the literal placeholder `<path-to-your-checkout>`, not a real path. The absolute path belongs only to the controller verification block above, which is not committed to the README.
- Prose rule: no em-dashes anywhere in the added text. The existing `claude-team` sections have them; leave those alone.
- The walkthrough has to stay exactly ten numbered lines. A test counts them.

- [ ] **Step 1: Write the failing test**

Create `plugins/wave/tests/readme.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const README = readFileSync(join(PLUGIN_ROOT, '..', '..', 'README.md'), 'utf8')
const START = '## wave: multi-model wave execution'

// Everything from the wave heading to the next top-level heading.
function waveSection() {
  const start = README.indexOf(START)
  assert.notEqual(start, -1, `README is missing the heading: ${START}`)
  const rest = README.slice(start + START.length)
  const end = rest.indexOf('\n## ')
  return rest.slice(0, end === -1 ? undefined : end)
}

test('the wave section sits after the claude-team sections and before the license', () => {
  assert.ok(README.indexOf('## For Kacper (team IT)') < README.indexOf(START))
  assert.ok(README.indexOf(START) < README.indexOf('## License'))
})

test('the wave section carries every heading the spec asks for', () => {
  const section = waveSection()
  for (const heading of [
    '### Install',
    '### What `/wave:setup` changes',
    '### What `/wave:init` writes',
    '### A first wave in ten lines',
    '### Updating',
    '### Not the `codex@openai-codex` plugin',
    '### Verify a local install',
  ]) {
    assert.ok(section.includes(heading), `README is missing the heading: ${heading}`)
  }
})

test('the wave section carries the four install commands', () => {
  const section = waveSection()
  for (const command of [
    '/plugin marketplace remove claude-team-onboarding',
    '/plugin marketplace add <path-to-your-checkout>',
    '/plugin install wave@claude-team-onboarding',
    '/reload-plugins',
  ]) {
    assert.ok(section.includes(command), `README is missing the command: ${command}`)
  }
})

test('the first-wave walkthrough is ten numbered lines', () => {
  const section = waveSection()
  const walkthrough = section.slice(section.indexOf('### A first wave in ten lines'))
  const numbered = walkthrough.split('\n').filter((line) => /^\d+\. \S/.test(line))
  assert.equal(numbered.length, 10)
  assert.match(numbered[0], /^1\. /)
  assert.match(numbered[9], /^10\. /)
})

test('the wave section states that the codex plugin is unrelated and how to update', () => {
  const section = waveSection()
  assert.match(section, /this loop does not use it/)
  assert.match(section, /\/plugin update wave@claude-team-onboarding/)
  assert.match(section, /re-run `\/wave:init`/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/wave/tests && node --test readme.test.mjs`

Expected: FAIL, all five, the first assertion message naming the missing heading:

```
AssertionError [ERR_ASSERTION]: README is missing the heading: ## wave: multi-model wave execution
ℹ tests 5
ℹ pass 0
ℹ fail 5
```

- [ ] **Step 3: Write minimal implementation**

Insert this block into `README.md` immediately above the `## License` heading, exactly as written:

````markdown
## wave: multi-model wave execution

The second plugin in this marketplace packages a working method rather than a curriculum. A Claude session plans, dispatches, reviews and merges. Codex implements each task in a sandboxed git worktree. An adversarial gate agent tries to refute every green claim on the risky tasks. A SQLite statement registry holds the approved spec, and the statements are the acceptance criteria reviewers check against.

It ships two entry points: `/wave:setup` for the machine, `/wave:init` for a repository. Scripts and hooks are bash, so macOS or Linux, or Windows through WSL. Node is only the test runner. You need a ChatGPT plan that includes Codex.

### Install

The marketplace is the one that already carries `claude-team`. If you have it registered, these two commands are all you need:

```
/plugin install wave@claude-team-onboarding
/reload-plugins
```

On a machine that has never seen this marketplace, add it first with `/plugin marketplace add Cracy660/claude-team-onboarding`. Then run `/wave:setup` once, and `/wave:init` in every repository you want to run waves in.

### What `/wave:setup` changes

Once per machine. It never runs an install itself: it presents each command for you to run and confirm, the way the onboarding skill does.

- **Codex preflight.** Checks `codex --version` and `codex login status`, and presents `npm install -g @openai/codex` and `codex login` when they are missing. It does not write `~/.codex/config.toml`: sandbox and model policy live in the dispatch script, where they cannot drift.
- **Superpowers check.** Confirms `superpowers@claude-plugins-official` is enabled and presents the install command when it is not. Your hooks are not touched.
- **Global `CLAUDE.md` merge.** Backs the file up to `CLAUDE.md.pre-wave-<timestamp>.bak`, then adds or amends only the method sections: Multi-Model Execution, Test-Driven Development, Workflow, Planning Workflow, Git, Archival. Your own sections, your git identity and your push rule are never touched. You see a unified diff and confirm before anything is written.

### What `/wave:init` writes

Run it in the main checkout of a git repository. It detects the package manager, env file, test and build commands, asks the remaining knobs in one message, and then writes:

- `.claude/wave.env`, the single file every script and hook reads. Worktree root, branch prefix, env file, install command, model tiers, log directory, registry directory.
- `.claude/settings.json`, merged, never replaced: `codex exec` and `codex resume` are denied so no dispatch can skip the script, the two script paths are allowed, the two hooks are appended, and every other key survives.
- `.claude/hooks/code-only-branch.sh` and `.claude/hooks/registry-guard.sh`. The first keeps registry writes out of task branches, the second keeps raw SQL out of the registry database.
- `.claude/skills/dispatch/` with `dispatch.sh`, the only sanctioned way to start Codex, and `.claude/skills/registry/` with the guarded `registry-write.sh`.
- `.claude/agents/red-gate.md`, the refutation checklist the gate runs.
- `AGENTS.md`, the implementer contract Codex reads, and a `## Wave dispatch (controller-side)` section appended to the project `CLAUDE.md`.
- `docs/registry/` with `schema.sql`, an initialized `registry.db`, the three Python tools and the contract README, when you asked for a registry.

Every file that already exists is backed up as `<name>.pre-wave-<timestamp>.bak` before it is merged, and new files are written atomically.

### A first wave in ten lines

1. Brainstorm the spec with superpowers and get it approved before any plan exists.
2. Insert the approved statements into the registry, review them in the generated panel, ingest the verdicts, leave nothing pending.
3. Send recon to subagents and keep the findings in a facts file, never in the controller session.
4. Write the plan with superpowers writing-plans: statements verbatim, one task per test cycle, a risk and gate column.
5. Build the ledger in `.superpowers/sdd/<plan>/progress.md`: topology, the produces versus consumes conflict scan, the rulings with their cost if wrong.
6. Write the brief for the first task from the brief template, statements quoted verbatim, bans explicit.
7. Dispatch it with `.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file>` and read the report, not the transcript.
8. Re-run yourself everything the sandbox blocked: database suites, the build, anything that needs the network. A Codex green never covers those.
9. Gate the high-risk tasks with the red-gate agent, review every task, then merge the branch from its worktree.
10. Flip the registry in the main checkout, seal the wave with the checklist, and push when the owner says so.

The `running-waves` skill carries the long form of every step, plus the rulings behind them.

### Updating

`/plugin update wave@claude-team-onboarding` refreshes the plugin itself. The scripts and hooks inside a repository are copies, so re-run `/wave:init` there to refresh them. Your previous answers are read back from `.claude/wave.env` and offered as defaults.

### Not the `codex@openai-codex` plugin

That plugin is a different path into Codex and this loop does not use it. Having it installed alongside is harmless. `/wave:init` denies raw `codex exec`, so dispatches keep going through the script that enforces the worktree, the sandbox flag and the terminated stdin.

### Verify a local install

To install from a local checkout instead of GitHub, re-register the marketplace from its path. This is also the fix after the checkout has moved:

```
/plugin marketplace remove claude-team-onboarding
/plugin marketplace add <path-to-your-checkout>
/plugin install wave@claude-team-onboarding
/reload-plugins
```

`<path-to-your-checkout>` is the absolute path of this repository on your machine. Then run `/wave:init` in a throwaway git repository and check that it wrote:

```
.claude/wave.env
.claude/settings.json
.claude/hooks/code-only-branch.sh
.claude/hooks/registry-guard.sh
.claude/skills/dispatch/SKILL.md
.claude/skills/dispatch/scripts/dispatch.sh
.claude/skills/registry/SKILL.md
.claude/skills/registry/scripts/registry-write.sh
.claude/agents/red-gate.md
AGENTS.md
CLAUDE.md
docs/registry/schema.sql
docs/registry/registry.db
docs/registry/tools/gen-spec-exec.py
docs/registry/tools/gen-review-panel.py
docs/registry/tools/ingest-review.py
```

No file should contain a `{{` placeholder, and `.claude/settings.json` should deny `Bash(codex exec:*)`.

### Run the wave tests

```
cd plugins/wave/tests
npm test
```
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/wave/tests && node --test readme.test.mjs`

Expected: PASS.

```
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

Then run the whole suite, `cd plugins/wave/tests && npm test`, and confirm every test in the plan is green.

- [ ] **Step 5: Commit**

```
git add README.md plugins/wave/tests/readme.test.mjs && git commit -m "docs(wave): document the wave plugin in the README"
```

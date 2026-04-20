# Team Onboarding Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and publish a public GitHub-hosted Claude Code plugin (`claude-team-onboarding`) that delivers a Polish-language 20-minute interactive onboarding skill for Jakub's team, covering TDD workflow, git hygiene, portable Node hooks, stack setup (Python + JS), and a curated baseline plugin set.

**Architecture:** Single repo acts as both marketplace (`.claude-plugin/marketplace.json`) and container for one plugin (`plugins/claude-team/`). The plugin contains a skill (`onboarding`) that runs a 13-section interview with checkpoint/resume state, four portable Node hooks (`.mjs`) that install into `~/.claude/hooks/`, a settings.json merge strategy, and Polish prompt templates delegated to `templates/prompts/`. The plugin is installed via `/plugin marketplace add owner/repo` + `/plugin install claude-team@claude-team-onboarding`.

**Tech Stack:** Node.js ≥ 20 (built-in `node --test`), Claude Code Plugin SDK format (marketplace.json + plugin.json), Markdown for skill/templates, JSON for settings + state. Zero runtime dependencies for hooks (Node stdlib only).

**Spec:** `docs/superpowers/specs/2026-04-20-team-onboarding-design.md`

**Commit cadence:** one commit per completed task. Use conventional commits (`feat`, `fix`, `docs`, `chore`, `test`, `refactor`). Scope is one of: `scaffold`, `hook`, `skill`, `template`, `command`, `docs`, `meta`.

**TDD note:** Every hook is built Red → Green → Refactor. Test files are presented to Jakub for approval BEFORE implementation per his team standard. Non-code content (Polish prompts, templates) is validated by inspection.

---

## Phase 1 — Repo scaffolding

### Task 1: Marketplace manifest

**Files:**
- Create: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Create marketplace manifest**

```json
{
  "name": "claude-team-onboarding",
  "description": "Team onboarding plugin for Jakub's Claude Code curriculum (Polish)",
  "owner": {
    "name": "Jakub Adamski",
    "url": "https://github.com/Cracy660"
  },
  "plugins": [
    {
      "name": "claude-team",
      "source": "./plugins/claude-team",
      "description": "Interactive Polish onboarding: TDD, git hygiene, portable hooks, stack setup, baseline plugins"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat(scaffold): add marketplace manifest declaring claude-team plugin"
```

### Task 2: Plugin manifest

**Files:**
- Create: `plugins/claude-team/plugin.json`

- [ ] **Step 1: Create plugin manifest**

```json
{
  "name": "claude-team",
  "version": "0.1.0",
  "description": "Interactive Polish onboarding for Jakub's team: TDD workflow, git hygiene, portable hooks, stack setup, baseline plugins",
  "author": {
    "name": "Jakub Adamski",
    "email": "adamski.jakub@gmail.com"
  },
  "homepage": "https://github.com/Cracy660/claude-team-onboarding"
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/claude-team/plugin.json
git commit -m "feat(scaffold): add plugin.json manifest"
```

### Task 3: Minimal plugin directory structure

**Files:**
- Create (empty directories with `.gitkeep`):
  - `plugins/claude-team/skills/onboarding/`
  - `plugins/claude-team/skills/onboarding/references/`
  - `plugins/claude-team/commands/`
  - `plugins/claude-team/hooks/`
  - `plugins/claude-team/templates/`
  - `plugins/claude-team/templates/ccstatusline/`
  - `plugins/claude-team/templates/prompts/`

- [ ] **Step 1: Create directory skeleton with placeholders**

```bash
mkdir -p plugins/claude-team/skills/onboarding/references
mkdir -p plugins/claude-team/commands
mkdir -p plugins/claude-team/hooks
mkdir -p plugins/claude-team/templates/ccstatusline
mkdir -p plugins/claude-team/templates/prompts
touch plugins/claude-team/skills/onboarding/.gitkeep
touch plugins/claude-team/skills/onboarding/references/.gitkeep
touch plugins/claude-team/commands/.gitkeep
touch plugins/claude-team/hooks/.gitkeep
touch plugins/claude-team/templates/.gitkeep
touch plugins/claude-team/templates/ccstatusline/.gitkeep
touch plugins/claude-team/templates/prompts/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add plugins/claude-team/
git commit -m "chore(scaffold): add plugin directory skeleton"
```

### Task 4: Add Node test runner setup

**Files:**
- Create: `plugins/claude-team/hooks/package.json` (tests only, hooks themselves have zero deps)

- [ ] **Step 1: Write package.json with test script**

```json
{
  "name": "claude-team-hooks",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create tests directory**

```bash
mkdir -p plugins/claude-team/hooks/tests
touch plugins/claude-team/hooks/tests/.gitkeep
```

- [ ] **Step 3: Verify Node version supports built-in test runner**

Run: `node --version`
Expected: `v20.x.x` or higher. If lower, the plan cannot proceed — flag to Jakub.

- [ ] **Step 4: Verify test runner works with an empty directory**

Run (from `plugins/claude-team/hooks/`):
```bash
npm test
```
Expected: `# tests 0` (no tests found, exits 0)

- [ ] **Step 5: Commit**

```bash
git add plugins/claude-team/hooks/package.json plugins/claude-team/hooks/tests/.gitkeep
git commit -m "chore(hook): add Node built-in test runner scaffolding"
```

---

## Phase 2 — Portable Node hooks (TDD)

**Convention for all hook files:** Each `.mjs` file reads JSON from stdin (fd 0), applies its logic, and exits with code 0 (pass/continue) or code 2 (block, show stdout to Claude). No top-level `await`, no dependencies outside Node stdlib.

**TDD workflow reminder:** After writing each test file, PRESENT the test file to Jakub and wait for his "ok" before writing implementation. This is per his team standard (`CLAUDE.md` → Test-Driven Development → "Present test files to Jakub for approval before writing implementation code").

### Task 5: Hook — protect-files.mjs (TDD cycle)

**Purpose:** Block PreToolUse Write/Edit/MultiEdit on protected files (.env*, lock files). Exit 2 with stdout "BLOCKED: Protected file." on match, else exit 0.

**Files:**
- Create: `plugins/claude-team/hooks/tests/protect-files.test.mjs`
- Create: `plugins/claude-team/hooks/protect-files.mjs`

- [ ] **Step 1: Write failing test file**

```js
// plugins/claude-team/hooks/tests/protect-files.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'protect-files.mjs')

function run(toolInput) {
  const input = JSON.stringify({ tool_input: toolInput })
  return spawnSync('node', [HOOK], { input, encoding: 'utf8' })
}

test('blocks .env file', () => {
  const r = run({ file_path: '/home/jan/project/.env' })
  assert.equal(r.status, 2)
  assert.match(r.stdout, /BLOCKED: Protected file/)
})

test('blocks .env.local file', () => {
  const r = run({ file_path: '/home/jan/project/.env.local' })
  assert.equal(r.status, 2)
})

test('blocks package-lock.json', () => {
  const r = run({ file_path: '/home/jan/project/package-lock.json' })
  assert.equal(r.status, 2)
})

test('blocks yarn.lock', () => {
  const r = run({ file_path: '/home/jan/project/yarn.lock' })
  assert.equal(r.status, 2)
})

test('blocks pnpm-lock.yaml', () => {
  const r = run({ file_path: '/home/jan/project/pnpm-lock.yaml' })
  assert.equal(r.status, 2)
})

test('blocks uv.lock', () => {
  const r = run({ file_path: '/home/jan/project/uv.lock' })
  assert.equal(r.status, 2)
})

test('allows src/index.ts', () => {
  const r = run({ file_path: '/home/jan/project/src/index.ts' })
  assert.equal(r.status, 0)
})

test('allows .env.example (example files are fine)', () => {
  const r = run({ file_path: '/home/jan/project/.env.example' })
  assert.equal(r.status, 0)
})

test('handles missing file_path gracefully', () => {
  const r = run({})
  assert.equal(r.status, 0)
})

test('handles empty stdin as pass-through', () => {
  const r = spawnSync('node', [HOOK], { input: '', encoding: 'utf8' })
  assert.equal(r.status, 0)
})
```

- [ ] **Step 2: PRESENT test file to Jakub**

Show the test file contents to Jakub. Wait for his "ok" / changes. Do not proceed until approved. Jakub may add cases (e.g., `.env.production`, different path separators on Windows).

- [ ] **Step 3: Run tests to verify they fail**

Run (from `plugins/claude-team/hooks/`):
```bash
npm test
```
Expected: All 10 tests fail with "Cannot find module '../protect-files.mjs'"

- [ ] **Step 4: Write minimal implementation**

```js
// plugins/claude-team/hooks/protect-files.mjs
import { readFileSync } from 'node:fs'

let input = {}
try {
  const raw = readFileSync(0, 'utf8')
  if (raw.trim()) input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const filePath = input?.tool_input?.file_path ?? ''
if (!filePath) process.exit(0)

const base = filePath.split(/[\\/]/).pop()

const PROTECTED = [
  /^\.env$/i,
  /^\.env\.[^.]+$/i,            // .env.local, .env.production, ... but NOT .env.example (caught below)
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\.yaml$/i,
  /^uv\.lock$/i,
]

// .env.example and similar *.example files are fine
if (/\.example$/i.test(base)) process.exit(0)

for (const re of PROTECTED) {
  if (re.test(base)) {
    process.stdout.write('BLOCKED: Protected file — edit manually if you really mean to.\n')
    process.exit(2)
  }
}

process.exit(0)
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: `# tests 10`, `# pass 10`, exit 0

- [ ] **Step 6: Commit**

```bash
git add plugins/claude-team/hooks/protect-files.mjs plugins/claude-team/hooks/tests/protect-files.test.mjs
git commit -m "feat(hook): add protect-files.mjs blocking edits to env and lock files"
```

### Task 6: Hook — commit-gate.mjs (TDD cycle)

**Purpose:** PreToolUse Bash gate that runs on `git commit`/`git push`. Detects project type from `CLAUDE_PROJECT_DIR` and runs relevant checks (tsc, vitest, ruff, pytest). Exit 2 if any check fails.

**Files:**
- Create: `plugins/claude-team/hooks/tests/commit-gate.test.mjs`
- Create: `plugins/claude-team/hooks/commit-gate.mjs`

**Testing approach:** Tests mock `CLAUDE_PROJECT_DIR` to a temp directory with controlled fixtures. Since the hook invokes subprocesses (npx, pytest, ruff), tests use a fake PATH to make commands succeed/fail deterministically via stub scripts.

- [ ] **Step 1: Write failing test file**

```js
// plugins/claude-team/hooks/tests/commit-gate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync, chmodSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'commit-gate.mjs')

function makeProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'commit-gate-test-'))
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content)
  }
  return dir
}

function makeStubBin(name, exitCode) {
  const dir = mkdtempSync(join(tmpdir(), 'stub-bin-'))
  const script = process.platform === 'win32'
    ? `@echo off\nexit /b ${exitCode}\n`
    : `#!/bin/sh\nexit ${exitCode}\n`
  const ext = process.platform === 'win32' ? '.cmd' : ''
  const p = join(dir, name + ext)
  writeFileSync(p, script)
  if (process.platform !== 'win32') chmodSync(p, 0o755)
  return dir
}

function run(projectDir, extraPath = '') {
  const sep = process.platform === 'win32' ? ';' : ':'
  return spawnSync('node', [HOOK], {
    input: '',
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectDir,
      PATH: extraPath ? `${extraPath}${sep}${process.env.PATH}` : process.env.PATH,
    },
  })
}

test('no project markers: exits 0 (nothing to check)', () => {
  const dir = makeProject({})
  try {
    const r = run(dir)
    assert.equal(r.status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('pyproject.toml present, ruff passes: exits 0', () => {
  const dir = makeProject({ 'pyproject.toml': '[project]\nname = "x"\n' })
  const stubs = makeStubBin('ruff', 0)
  try {
    const r = run(dir, stubs)
    assert.equal(r.status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('pyproject.toml present, ruff fails: exits 2 with BLOCKED message', () => {
  const dir = makeProject({ 'pyproject.toml': '[project]\nname = "x"\n' })
  const stubs = makeStubBin('ruff', 1)
  try {
    const r = run(dir, stubs)
    assert.equal(r.status, 2)
    assert.match(r.stdout, /BLOCKED: Fix errors\/tests/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('pyproject.toml present, pytest exit code 5 (no tests collected) treated as pass', () => {
  const dir = makeProject({ 'pyproject.toml': '[project]\nname = "x"\n' })
  const stubs = makeStubBin('pytest', 5)
  try {
    const r = run(dir, stubs)
    assert.equal(r.status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('tsconfig.json present, tsc fails: exits 2', () => {
  const dir = makeProject({
    'tsconfig.json': '{"compilerOptions":{}}',
  })
  const stubs = makeStubBin('npx', 1)
  try {
    const r = run(dir, stubs)
    assert.equal(r.status, 2)
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('ruff not on PATH and pyproject.toml present: skips without error', () => {
  const dir = makeProject({ 'pyproject.toml': '[project]\nname = "x"\n' })
  try {
    // Deliberately do not provide ruff stub; PATH will not find it
    const r = run(dir, '/nonexistent-path')
    assert.equal(r.status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('missing CLAUDE_PROJECT_DIR: exits 0 (no-op)', () => {
  const r = spawnSync('node', [HOOK], {
    input: '',
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: '' },
  })
  assert.equal(r.status, 0)
})
```

- [ ] **Step 2: PRESENT test file to Jakub**

Key cases to confirm with Jakub:
- Treating pytest exit code 5 as pass (no tests collected). The original bash hook has this carve-out — preserved.
- Should the hook use `npm run test:run` with `--passWithNoTests` flag? The spec says yes; do we test this path?

Wait for his "ok" or modifications.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: All 7 tests fail — hook file missing

- [ ] **Step 4: Write implementation**

```js
// plugins/claude-team/hooks/commit-gate.mjs
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const cwd = process.env.CLAUDE_PROJECT_DIR
if (!cwd || !existsSync(cwd)) process.exit(0)

function onPath(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'command'
  const args = process.platform === 'win32' ? [cmd] : ['-v', cmd]
  const r = spawnSync(which, args, { encoding: 'utf8', shell: true })
  return r.status === 0
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, ...opts })
}

let failed = false

// TypeScript
if (existsSync(join(cwd, 'tsconfig.json')) && onPath('npx')) {
  const r = run('npx', ['tsc', '--noEmit'])
  if (r.status !== 0) failed = true
}

// JS test runner (if package.json declares test:run)
const pkgJson = join(cwd, 'package.json')
if (existsSync(pkgJson) && onPath('npm')) {
  try {
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'))
    if (pkg.scripts?.['test:run']) {
      const r = run('npm', ['run', 'test:run', '--', '--passWithNoTests'])
      if (r.status !== 0) failed = true
    }
  } catch {
    // Malformed package.json — not our problem; user's tsc/lint will catch
  }
}

// Python lint
if (existsSync(join(cwd, 'pyproject.toml'))) {
  if (onPath('ruff')) {
    const r = run('ruff', ['check', '.'])
    if (r.status !== 0) failed = true
  }
  if (onPath('pytest')) {
    const r = run('pytest')
    // Exit 5 = no tests collected; treat as pass
    if (r.status !== 0 && r.status !== 5) failed = true
  }
}

if (failed) {
  process.stdout.write('BLOCKED: Fix errors/tests before committing.\n')
  process.exit(2)
}
process.exit(0)
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: 17 tests total (10 from protect-files + 7 from commit-gate), all pass

- [ ] **Step 6: Commit**

```bash
git add plugins/claude-team/hooks/commit-gate.mjs plugins/claude-team/hooks/tests/commit-gate.test.mjs
git commit -m "feat(hook): add commit-gate.mjs blocking commits when tsc/tests/ruff/pytest fail"
```

### Task 7: Hook — auto-format.mjs (TDD cycle)

**Purpose:** PostToolUse Edit/Write/MultiEdit. For `.py`: run `ruff format` + `ruff check --fix`. For `.ts/.tsx/.js/.jsx/.css/.json/.html`: run `npx prettier --write`. For `.ts/.tsx/.js/.jsx`: run `npx eslint --fix`. Never blocks (always exits 0).

**Files:**
- Create: `plugins/claude-team/hooks/tests/auto-format.test.mjs`
- Create: `plugins/claude-team/hooks/auto-format.mjs`

- [ ] **Step 1: Write failing test file**

```js
// plugins/claude-team/hooks/tests/auto-format.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync, chmodSync, rmSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'auto-format.mjs')

function makeStubBin(name, logFile) {
  const dir = mkdtempSync(join(tmpdir(), 'stub-bin-'))
  const script = process.platform === 'win32'
    ? `@echo off\necho ${name} %* >> "${logFile}"\nexit /b 0\n`
    : `#!/bin/sh\necho "${name} $@" >> "${logFile}"\nexit 0\n`
  const ext = process.platform === 'win32' ? '.cmd' : ''
  const p = join(dir, name + ext)
  writeFileSync(p, script)
  if (process.platform !== 'win32') chmodSync(p, 0o755)
  return dir
}

function run(toolInput, extraPath = '') {
  const sep = process.platform === 'win32' ? ';' : ':'
  const input = JSON.stringify({ tool_input: toolInput })
  return spawnSync('node', [HOOK], {
    input,
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: process.cwd(),
      PATH: extraPath ? `${extraPath}${sep}${process.env.PATH}` : process.env.PATH,
    },
  })
}

test('exits 0 for unknown extension', () => {
  const r = run({ file_path: '/tmp/README.md' })
  assert.equal(r.status, 0)
})

test('exits 0 when file_path missing', () => {
  const r = run({})
  assert.equal(r.status, 0)
})

test('runs ruff on .py file when ruff on PATH', () => {
  const logFile = join(mkdtempSync(join(tmpdir(), 'log-')), 'log.txt')
  writeFileSync(logFile, '')
  const stubs = makeStubBin('ruff', logFile)
  try {
    const r = run({ file_path: '/tmp/foo.py' }, stubs)
    assert.equal(r.status, 0)
    const log = readFileSync(logFile, 'utf8')
    assert.match(log, /ruff.*format/)
    assert.match(log, /ruff.*check.*--fix/)
  } finally {
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('runs prettier + eslint on .ts file', () => {
  const logFile = join(mkdtempSync(join(tmpdir(), 'log-')), 'log.txt')
  writeFileSync(logFile, '')
  const stubs = makeStubBin('npx', logFile)
  try {
    const r = run({ file_path: '/tmp/foo.ts' }, stubs)
    assert.equal(r.status, 0)
    const log = readFileSync(logFile, 'utf8')
    assert.match(log, /npx.*prettier.*--write/)
    assert.match(log, /npx.*eslint.*--fix/)
  } finally {
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('runs only prettier on .css (no eslint)', () => {
  const logFile = join(mkdtempSync(join(tmpdir(), 'log-')), 'log.txt')
  writeFileSync(logFile, '')
  const stubs = makeStubBin('npx', logFile)
  try {
    const r = run({ file_path: '/tmp/style.css' }, stubs)
    assert.equal(r.status, 0)
    const log = readFileSync(logFile, 'utf8')
    assert.match(log, /npx.*prettier/)
    assert.doesNotMatch(log, /eslint/)
  } finally {
    rmSync(stubs, { recursive: true, force: true })
  }
})

test('always exits 0 even when tool fails', () => {
  // ruff stub with exit code 1
  const stubDir = mkdtempSync(join(tmpdir(), 'stub-fail-'))
  const script = process.platform === 'win32' ? `@echo off\nexit /b 1\n` : `#!/bin/sh\nexit 1\n`
  const ext = process.platform === 'win32' ? '.cmd' : ''
  writeFileSync(join(stubDir, 'ruff' + ext), script)
  if (process.platform !== 'win32') chmodSync(join(stubDir, 'ruff' + ext), 0o755)
  try {
    const r = run({ file_path: '/tmp/foo.py' }, stubDir)
    assert.equal(r.status, 0, 'auto-format must NEVER block, even on formatter failure')
  } finally {
    rmSync(stubDir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: PRESENT test file to Jakub**

Key behaviors to confirm:
- Hook uses `CLAUDE_PROJECT_DIR` for running `npx` (so `node_modules/.bin` resolves) — or does it run prettier in file's directory? Spec says `cd "$CLAUDE_PROJECT_DIR"` per the original bash. Preserved.
- Never blocks, even on tool failure. Confirmed.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: 6 new tests fail, hook file missing

- [ ] **Step 4: Write implementation**

```js
// plugins/claude-team/hooks/auto-format.mjs
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

let input = {}
try {
  const raw = readFileSync(0, 'utf8')
  if (raw.trim()) input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const filePath = input?.tool_input?.file_path ?? ''
if (!filePath) process.exit(0)

const cwd = process.env.CLAUDE_PROJECT_DIR && existsSync(process.env.CLAUDE_PROJECT_DIR)
  ? process.env.CLAUDE_PROJECT_DIR
  : process.cwd()

function onPath(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'command'
  const args = process.platform === 'win32' ? [cmd] : ['-v', cmd]
  const r = spawnSync(which, args, { encoding: 'utf8', shell: true })
  return r.status === 0
}

function tryRun(cmd, args) {
  try {
    spawnSync(cmd, args, { cwd, stdio: 'ignore', shell: true })
  } catch { /* never block */ }
}

const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()

if (ext === '.py' && onPath('ruff')) {
  tryRun('ruff', ['format', `"${filePath}"`])
  tryRun('ruff', ['check', '--fix', `"${filePath}"`])
}

const prettierExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html'])
if (prettierExts.has(ext) && onPath('npx')) {
  tryRun('npx', ['prettier', '--write', `"${filePath}"`])
}

const eslintExts = new Set(['.ts', '.tsx', '.js', '.jsx'])
if (eslintExts.has(ext) && onPath('npx')) {
  tryRun('npx', ['eslint', '--fix', `"${filePath}"`])
}

process.exit(0)
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: 23 tests total, all pass

- [ ] **Step 6: Commit**

```bash
git add plugins/claude-team/hooks/auto-format.mjs plugins/claude-team/hooks/tests/auto-format.test.mjs
git commit -m "feat(hook): add auto-format.mjs running ruff/prettier/eslint after edits"
```

### Task 8: Hook — post-compact.mjs (TDD cycle)

**Purpose:** PostCompact hook. Reads first non-DONE section from `plan.md` and last 20 lines of `progress.md` in `CLAUDE_PROJECT_DIR`. Prints both plus a JSON `systemMessage` instructing Claude to re-read spec.md for the current phase.

**Files:**
- Create: `plugins/claude-team/hooks/tests/post-compact.test.mjs`
- Create: `plugins/claude-team/hooks/post-compact.mjs`

- [ ] **Step 1: Write failing test file**

```js
// plugins/claude-team/hooks/tests/post-compact.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'post-compact.mjs')

function run(projectDir) {
  return spawnSync('node', [HOOK], {
    input: '',
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  })
}

test('no plan.md, no progress.md: exits 0 and prints fallback message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  try {
    const r = run(dir)
    assert.equal(r.status, 0)
    assert.match(r.stdout, /No plan\.md found/)
    assert.match(r.stdout, /No progress\.md found/)
    assert.match(r.stdout, /systemMessage/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('extracts first non-DONE section from plan.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  writeFileSync(join(dir, 'plan.md'), [
    '# Plan',
    '',
    '## Phase 1 - DONE',
    'Some finished content',
    '',
    '## Phase 2',
    'Current phase content',
    'Second line of phase 2',
    '',
    '## Phase 3',
    'Future content',
  ].join('\n'))
  try {
    const r = run(dir)
    assert.equal(r.status, 0)
    assert.match(r.stdout, /## Phase 2/)
    assert.match(r.stdout, /Current phase content/)
    assert.doesNotMatch(r.stdout, /Phase 1 - DONE/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('includes only current phase, not next phase', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  writeFileSync(join(dir, 'plan.md'), [
    '## Phase 1',
    'Phase 1 content',
    '## Phase 2',
    'Phase 2 content',
  ].join('\n'))
  try {
    const r = run(dir)
    assert.match(r.stdout, /Phase 1 content/)
    assert.doesNotMatch(r.stdout, /Phase 2 content/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('includes last 20 lines of progress.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`)
  writeFileSync(join(dir, 'progress.md'), lines.join('\n'))
  try {
    const r = run(dir)
    assert.match(r.stdout, /line 50/)
    assert.match(r.stdout, /line 31/)
    assert.doesNotMatch(r.stdout, /line 30\b/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('missing CLAUDE_PROJECT_DIR: exits 0 without error', () => {
  const r = spawnSync('node', [HOOK], {
    input: '',
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: '' },
  })
  assert.equal(r.status, 0)
})

test('outputs valid JSON systemMessage at end', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  try {
    const r = run(dir)
    // Find the {"systemMessage":...} line
    const jsonLine = r.stdout.split('\n').find(l => l.trim().startsWith('{') && l.includes('systemMessage'))
    assert.ok(jsonLine, 'expected a JSON line with systemMessage')
    const parsed = JSON.parse(jsonLine)
    assert.equal(typeof parsed.systemMessage, 'string')
    assert.match(parsed.systemMessage, /spec\.md/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: PRESENT test file to Jakub**

Key behaviors to confirm:
- "First non-DONE section" = first `## ` heading not containing "DONE", including all content until the next `## ` heading. Matches the awk logic from the original bash hook.
- Last 20 lines of progress.md literally, no filtering.
- JSON systemMessage emitted at the end — tells Claude to prefer spec.md over compacted summary.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: 6 new tests fail, hook file missing

- [ ] **Step 4: Write implementation**

```js
// plugins/claude-team/hooks/post-compact.mjs
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const cwd = process.env.CLAUDE_PROJECT_DIR
if (!cwd || !existsSync(cwd)) process.exit(0)

function extractCurrentPhase(planMd) {
  const lines = planMd.split('\n')
  let collecting = false
  const out = []
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (collecting) break // next section starts
      if (!/DONE/.test(line)) {
        collecting = true
        out.push(line)
      }
    } else if (collecting) {
      out.push(line)
    }
  }
  return out.length ? out.join('\n') : null
}

function lastLines(text, n) {
  const lines = text.split('\n')
  return lines.slice(Math.max(0, lines.length - n)).join('\n')
}

const planPath = join(cwd, 'plan.md')
const progressPath = join(cwd, 'progress.md')

process.stdout.write('=== CURRENT PHASE (from plan.md) ===\n')
if (existsSync(planPath)) {
  const phase = extractCurrentPhase(readFileSync(planPath, 'utf8'))
  process.stdout.write(phase ?? 'No active phase found in plan.md')
  process.stdout.write('\n')
} else {
  process.stdout.write('No plan.md found\n')
}

process.stdout.write('\n=== RECENT PROGRESS (last 20 lines of progress.md) ===\n')
if (existsSync(progressPath)) {
  process.stdout.write(lastLines(readFileSync(progressPath, 'utf8'), 20))
  process.stdout.write('\n')
} else {
  process.stdout.write('No progress.md found\n')
}

process.stdout.write('\n')
process.stdout.write(JSON.stringify({
  systemMessage: 'Context was compacted. Above is your current phase and recent progress extracted from source files. Read the relevant spec.md section for this phase before proceeding. Do not trust the compacted summary over these files.'
}))
process.stdout.write('\n')

process.exit(0)
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: 29 tests total, all pass

- [ ] **Step 6: Commit**

```bash
git add plugins/claude-team/hooks/post-compact.mjs plugins/claude-team/hooks/tests/post-compact.test.mjs
git commit -m "feat(hook): add post-compact.mjs re-injecting plan phase after compaction"
```

---

## Phase 3 — Templates and content

### Task 9: settings-baseline.json template

**Files:**
- Create: `plugins/claude-team/templates/settings-baseline.json`

This is the *shape* the skill writes to a student's `~/.claude/settings.json` after merging. Students without any existing settings get exactly this; students with existing settings get merged per Section 10 of the spec. Hook paths use the placeholder `{{CLAUDE_HOOKS_DIR}}` which the skill substitutes at write time.

- [ ] **Step 1: Write baseline settings**

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(uv:*)",
      "Bash(ruff:*)",
      "Bash(pytest:*)",
      "Bash(ls:*)",
      "Bash(which:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)",
      "Bash(pkill:*)",
      "Bash(npm run:*)",
      "Bash(npm install:*)",
      "Bash(npm create:*)",
      "Bash(npx tsc:*)",
      "Bash(npx vitest:*)",
      "Bash(npx prettier:*)",
      "Bash(npx eslint:*)",
      "Read(**/*.md)",
      "Read(**/*.txt)",
      "Read(**/*.json)",
      "Read(**/*.yaml)",
      "Read(**/*.yml)",
      "Read(**/*.py)",
      "Read(**/*.ts)",
      "Read(**/*.tsx)",
      "Read(**/*.js)",
      "Read(**/*.jsx)",
      "Read(**/*.css)",
      "Read(**/*.html)",
      "Read(**/*.sh)",
      "Read(**/*.toml)",
      "Read(**/*.lock)",
      "Read(**/.gitignore)",
      "Read(**/.env.example)",
      "Read(**/Makefile)",
      "Read(**/Dockerfile)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node {{CLAUDE_HOOKS_DIR}}/protect-files.mjs" }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node {{CLAUDE_HOOKS_DIR}}/commit-gate.mjs",
            "if": "Bash(git commit*)|Bash(git push*)",
            "timeout": 120
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node {{CLAUDE_HOOKS_DIR}}/auto-format.mjs" }
        ]
      },
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "You are a test quality reviewer. Analyze the test file that was just written or edited. The tool input is: $ARGUMENTS\n\nCheck for:\n1. Tautological assertions (expect(true).toBe(true), testing render without checking content)\n2. Missing negative cases\n3. Tests checking existence rather than behavior\n4. Circular mocks (mocked return mirrors expected output)\n\nIf tests are meaningful: PASS\nIf problems found: FAIL + list each problem tersely.",
            "if": "Write(*.test.*)|Write(*.spec.*)|Edit(*.test.*)|Edit(*.spec.*)|MultiEdit(*.test.*)|MultiEdit(*.spec.*)"
          }
        ]
      }
    ],
    "PostCompact": [
      {
        "hooks": [
          { "type": "command", "command": "node {{CLAUDE_HOOKS_DIR}}/post-compact.mjs" }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "npx -y ccstatusline@latest",
    "padding": 0
  },
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "skill-creator@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "claude-md-management@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "pyright-lsp@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "claude-team@claude-team-onboarding": true
  },
  "effortLevel": "high",
  "skipDangerousModePermissionPrompt": false
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugins/claude-team/templates/settings-baseline.json','utf8'))"`
Expected: no output, exit 0 (valid JSON)

- [ ] **Step 3: Commit**

```bash
git add plugins/claude-team/templates/settings-baseline.json
git commit -m "feat(template): add settings-baseline.json with hooks, permissions, plugin baseline"
```

### Task 10: ccstatusline config template

**Files:**
- Create: `plugins/claude-team/templates/ccstatusline/settings.json`

- [ ] **Step 1: Copy Jakub's current ccstatusline config verbatim**

Read the live file and copy its exact content:

```bash
cp ~/.config/ccstatusline/settings.json plugins/claude-team/templates/ccstatusline/settings.json
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugins/claude-team/templates/ccstatusline/settings.json','utf8'))"`
Expected: valid JSON, exit 0

- [ ] **Step 3: Commit**

```bash
git add plugins/claude-team/templates/ccstatusline/settings.json
git commit -m "feat(template): add ccstatusline config with session + weekly usage segments"
```

### Task 11: CLAUDE.md template (Mustache-style)

**Files:**
- Create: `plugins/claude-team/templates/CLAUDE.md.pl.hbs`

Uses `{{variable}}` placeholders that the skill substitutes from `state.answers`. Mustache-lite: only simple variable substitution, no conditionals or loops (skill handles branching by choosing different sections to concatenate).

- [ ] **Step 1: Write template**

```markdown
# Global Preferences

## User
{{ABOUT_YOU}}

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
  - git config user.email "{{GIT_EMAIL}}"
  - git config user.name "{{GIT_NAME}}"

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
- Shell: {{SHELL}}
- Keep solutions simple
- Keep me honest — say if I am wrong. No points for sycophancy
```

- [ ] **Step 2: Commit**

```bash
git add plugins/claude-team/templates/CLAUDE.md.pl.hbs
git commit -m "feat(template): add CLAUDE.md.pl.hbs template with Mustache placeholders"
```

### Task 12: Reference documents (3 lesson markdown files)

**Files:**
- Create: `plugins/claude-team/skills/onboarding/references/hook-explanations-pl.md`
- Create: `plugins/claude-team/skills/onboarding/references/tdd-lesson-pl.md`
- Create: `plugins/claude-team/skills/onboarding/references/planning-lesson-pl.md`

These are the long-form explanations the skill loads on demand when a student says "wyjaśnij więcej" ("explain more") at a choice point. Each is ≤ 300 words.

- [ ] **Step 1: Write hook-explanations-pl.md**

```markdown
# Hooki — szczegóły

Hook to mały program, który Claude Code uruchamia przed lub po określonej akcji. Działa w tle, niezauważalnie — dopóki nie znajdzie powodu, żeby Cię zatrzymać albo poprawić coś automatycznie.

## Hooki bezpieczeństwa

### protect-files
Uruchamia się PRZED każdą próbą edycji pliku. Jeśli ścieżka pasuje do chronionego wzorca (`.env`, `.env.local`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `uv.lock`) — blokuje operację z komunikatem "BLOCKED: Protected file." Po co? `.env` zawiera sekrety (tokeny API, hasła), a pliki `lock` to wygenerowane artefakty pakietów, które nigdy nie powinny być edytowane ręcznie.

### commit-gate
Uruchamia się PRZED każdym `git commit` lub `git push`. Sprawdza co masz w projekcie i uruchamia odpowiednie testy:
- `tsconfig.json` obecny → `npx tsc --noEmit`
- `package.json` ma `test:run` → `npm run test:run`
- `pyproject.toml` obecny → `ruff check .` + `pytest`

Jeśli jakikolwiek sprawdzian zwróci błąd — blokuje commit z komunikatem "BLOCKED: Fix errors/tests before committing." Brzmi restrykcyjnie, jest celowe: niesprawdzony kod nie trafia do repozytorium.

## Hooki jakości

### auto-format
Uruchamia się PO każdej edycji pliku. Automatycznie formatuje według rozszerzenia:
- `.py` → `ruff format` + `ruff check --fix`
- `.ts/.tsx/.js/.jsx/.css/.json/.html` → `npx prettier --write`
- `.ts/.tsx/.js/.jsx` → `npx eslint --fix`

Nigdy nie blokuje — jeśli narzędzie zawiedzie, po prostu pomija. Twój kod zawsze ląduje sformatowany.

### test-review
Uruchamia się PO edycji pliku testowego (`*.test.*`, `*.spec.*`). To nie jest hook "komenda", tylko prompt do Claude'a — model czyta Twój test i ocenia go pod kątem:
- tautologicznych asercji (`expect(true).toBe(true)`)
- brakujących przypadków negatywnych
- testów sprawdzających istnienie zamiast zachowania
- mocków zwracających dokładnie to co test oczekuje (cykliczne)

### post-compact
Uruchamia się po kompresji kontekstu (gdy rozmowa jest długa, Claude streszcza historię). Wyciąga aktualną fazę z `plan.md` i ostatnie 20 linii `progress.md` — i reinjektuje je. Dzięki temu po kompresji nie tracisz kontekstu wykonywanego planu.

## Dlaczego jako pliki Node a nie skrypty bash

Bash nie działa natywnie na Windowsie bez WSL. Node tak — i Claude Code go i tak używa. Jeden plik `.mjs` działa identycznie na Mac, Linux, Windows. Mniej niespodzianek.
```

- [ ] **Step 2: Write tdd-lesson-pl.md**

```markdown
# TDD — Red / Green / Refactor

**TDD** = Test-Driven Development. Piszesz testy PRZED kodem.

## Cykl

1. **Red** — napisz test dla zachowania, które chcesz. Uruchom. Test musi oblać (bo kod jeszcze nie istnieje).
2. **Green** — napisz minimalny kod, żeby test przeszedł. Nie więcej.
3. **Refactor** — jak test zielony, poprawiasz strukturę. Test dalej przechodzi.

Powtarzasz. Jedno zachowanie = jeden cykl.

## Po co to robimy

Trzy powody:

1. **Test to specyfikacja**. Jeśli nie umiesz napisać testu, to znaczy, że nie rozumiesz co masz zbudować. Lepiej to wiedzieć PRZED niż po godzinie kodowania.

2. **Pewność przy zmianach**. Masz 50 testów? Zmieniasz kod, uruchamiasz testy, wiesz czy coś zepsułeś. Bez tego każda zmiana to loteria.

3. **Bezpieczniejsze wdrożenia na podstawie AI**. Claude generuje dużo kodu szybko. Testy są Twoją siatką bezpieczeństwa przed "działa na moim komputerze".

## Co testować

**Zachowanie, nie implementację.**

Źle: `test('używa setState')`
Dobrze: `test('po kliknięciu przycisku pokazuje komunikat sukcesu')`

Testujesz co widzi użytkownik / co robi system. Jeśli zmienisz wewnętrzną strukturę ale zachowanie zostanie takie samo — testy nie powinny paść.

## Przypadki brzegowe PIERWSZE

Nie zaczynasz od happy path. Zaczynasz od:
- pustej listy / pustego stringa
- null / undefined
- za dużych wartości
- błędów sieci / API

Tam są bugi. Claude często pisze testy szczęśliwej ścieżki i pomija brzegi — dlatego te testy zawsze najpierw omawiamy ze mną, zanim kodujesz.

## Hook test-review

Twój projekt ma hook, który czyta nowo napisany test i ocenia go automatycznie. Wyłapuje:
- `expect(true).toBe(true)` — nie testuje niczego
- testy bez przypadków negatywnych
- testy sprawdzające tylko czy coś się zrenderowało, nie zawartość
- mocki zwracające dokładnie to, co test oczekuje (krąży sam w sobie)

Jak hook zgłosi problem — popraw test zanim pójdziesz dalej.
```

- [ ] **Step 3: Write planning-lesson-pl.md**

```markdown
# Planowanie PRZED kodowaniem

Zasada: **nie kodujesz, dopóki nie masz planu**. Nieważne jak mały projekt.

## Trzy poziomy

### 1. Aplikacja desktop → `spec.md`
Do wstępnego pomysłu. W folderze projektu: `spec.md` z opisem co robisz, dla kogo, dlaczego, sukces wygląda jak... To samo co robiliście na poprzednich lekcjach ręcznie.

### 2. `/ultraplan` → mały projekt
Bierze Twój `spec.md` i generuje `plan.md` z krokami. Szybko, zwięźle.

### 3. Superpowers → większe projekty
Instalowane jako wtyczka. Daje:
- **brainstorming** — zadaje pytania, wypełnia lukę między pomysłem a specem
- **writing-plans** — bierze spec i rozbija na zadania w rozmiarze 2-5 min każde, z testami TDD
- **subagent-driven-development** — wykonuje plan zadanie po zadaniu, każde w osobnym podagencie (lepsze zarządzanie pamięcią)

Kolejność: `brainstorming` → `writing-plans` → `subagent-driven-development`. Pliki lądują w `docs/superpowers/specs/YYYY-MM-DD-<nazwa>.md` i `docs/superpowers/plans/YYYY-MM-DD-<nazwa>.md`.

## Checkpointy (bramki do weryfikacji)

TDD jest naturalną bramką: **zanim Claude napisze implementację, pokazuje Ci plik z testami**. Ty czytasz (testy są w plain English dla beginnera), proponujesz brzegowe przypadki, potwierdzasz. Dopiero wtedy pisze kod.

To jest moment, w którym Twoja wiedza domenowa trafia do projektu. Claude nie zna Twojej branży — Ty znasz. Brzeg który Claude pominie — Ty wychwycisz.

## Alternatywy (na przyszłość)

Istnieją inne frameworki: **BMAD** (Behavior-Merging Agent Development), **Compound Engineering**, inne. Są warte przeglądu jak będziesz chciał/a porównać. Ale zacznijmy od jednego, który działa — `superpowers`. Jak utrwalicie ten sposób myślenia, łatwo porównać.

## Co to daje w praktyce

Claude bez planu = improwizacja. Po godzinie okazuje się, że robicie coś innego niż chciałeś. Claude z planem = idziecie krok po kroku, każdy zaznaczony DONE w pliku, każdy zakończony commitem. Po godzinie widać co się zrobiło, co zostało, gdzie się utknęło.
```

- [ ] **Step 4: Commit**

```bash
git add plugins/claude-team/skills/onboarding/references/
git commit -m "docs(skill): add Polish reference docs (hooks, TDD, planning)"
```

### Task 13: Prompt templates for sections 1, 2, 3, 13 (bookends)

**Files:**
- Create: `plugins/claude-team/templates/prompts/section-01-welcome.md`
- Create: `plugins/claude-team/templates/prompts/section-02-about-you.md`
- Create: `plugins/claude-team/templates/prompts/section-03-git-identity.md`
- Create: `plugins/claude-team/templates/prompts/section-13-finish.md`

Each prompt file is the Polish text the skill outputs verbatim. Format: 4-beat pattern (intro/choice/action/receipt) with markers `[INTRO]`, `[CHOICE]`, `[ACTION]`, `[RECEIPT]` that the skill reads structurally.

- [ ] **Step 1: Write section-01-welcome.md**

```markdown
[INTRO]
Cześć! Jestem skillem onboardingowym Twojego zespołu. Zaraz przejdziemy razem przez konfigurację Claude Code — około 20 minut.

Co się stanie:
- Zapytam Cię o parę rzeczy (imię, stos technologiczny, co Claude powinien o Tobie wiedzieć)
- Zainstalujemy zestaw wtyczek i narzędzi
- Skonfigurujemy hooki bezpieczeństwa i jakości
- Na końcu wygenerujemy Twój globalny plik CLAUDE.md

Zasady:
- Jeśli musisz przerwać — zamknij Claude Code. Twój postęp jest zapisany, wrócimy do miejsca w którym skończyliśmy.
- Jeśli coś wymaga uprawnień administratora lub czegoś co nie działa — zadzwoń do Kacpra. Nie próbuj obejść.
- Jak coś chcesz wyjaśnione szerzej, napisz "wyjaśnij więcej" i pokażę Ci dłuższą notkę.

[ACTION]
Zaczynamy? Napisz "tak" albo zadaj pytanie.

[RECEIPT]
(brak — to jest intro)
```

- [ ] **Step 2: Write section-02-about-you.md**

```markdown
[INTRO]
Twój globalny CLAUDE.md to plik, który Claude czyta na początku każdej rozmowy. Zawiera kontekst o Tobie — co robisz, czego się uczysz, z jakimi technologiami pracujesz, jak wolisz pracować.

Dzięki temu Claude nie musi za każdym razem pytać, kim jesteś. I może dostosować pomoc do Twojej roli (inaczej wyjaśni coś studentowi pierwszego roku, inaczej seniorowi).

[CHOICE]
Pytanie: **Co Claude powinien o Tobie wiedzieć?**

Może być: czym się zajmujesz, w jakiej branży, co budujesz, w czym jesteś dobry, czego się właśnie uczysz, z jakimi technologiami pracujesz, w jakim języku wolisz rozmawiać, jak wolisz żeby Claude Ci odpowiadał.

Im więcej kontekstu, tym lepsza pomoc. Napisz 2-5 zdań.

[ACTION]
Czekam na Twoją odpowiedź.

[RECEIPT]
Dzięki. Zapiszę to w sekcji "User" Twojego CLAUDE.md na końcu onboardingu. Jak coś będziesz chciał/a dodać później — po prostu otwórz `~/.claude/CLAUDE.md` i dopisz.
```

- [ ] **Step 3: Write section-03-git-identity.md**

```markdown
[INTRO]
Git pamięta kto zrobił każdy commit. Musi znać Twój email i imię.

Sprawdzam, czy już masz to ustawione...

[ACTION — conditional]
(Jeśli git ma już user.email i user.name skonfigurowane globalnie:)
Widzę: {{GIT_EMAIL}} / {{GIT_NAME}}. Zostawiamy tak?

(Jeśli nie jest ustawione:)
Nie masz jeszcze tego ustawionego. Podaj mi:
1. Twój email (najlepiej ten, którego używasz do GitHuba)
2. Twoje imię i nazwisko (lub nick) tak, jak chcesz żeby było widoczne w commitach

[INTRO continuation]
Przy okazji: w naszym zespole używamy **conventional commits**. Czyli commit message zaczyna się od typu:
- `feat:` — nowa funkcjonalność
- `fix:` — poprawka buga
- `docs:` — dokumentacja
- `refactor:` — zmiana struktury bez zmiany zachowania
- `test:` — dodanie/poprawka testu
- `chore:` — inne (konfiguracja, build, itp.)

Przykład: `feat(auth): add password reset flow`

Po co? Bo łatwiej czyta się historię, łatwiej generować changelog, łatwiej zrozumieć co się zmieniło jednym rzutem oka. Jak się przyzwyczaisz, to staje się naturalne.

[ACTION — git config]
Teraz ustawiam Twoją tożsamość git globalnie:
- `git config --global user.email "<Twój email>"`
- `git config --global user.name "<Twoje imię>"`

[RECEIPT]
Gotowe. Teraz każdy commit będzie podpisany Tobą. Sprawdź: `git config --global user.email` — powinien zwrócić Twój email.
```

- [ ] **Step 4: Write section-13-finish.md**

```markdown
[INTRO]
Gotowe! Onboarding ukończony.

[RECEIPT — summary of what changed]
Oto co masz teraz na swojej maszynie:

**Plik CLAUDE.md** (`~/.claude/CLAUDE.md`)
Twój globalny kontekst. Claude czyta go na początku każdej rozmowy.

**Skonfigurowane hooki** (w `~/.claude/hooks/`)
- `protect-files.mjs` — blokuje edycję `.env*` i plików lock
- `commit-gate.mjs` — blokuje commity, jeśli testy/typy/linting padają
- `auto-format.mjs` — formatuje automatycznie po każdej edycji
- `post-compact.mjs` — re-injektuje plan po kompresji kontekstu
- `test-review` (prompt) — ocenia nowe testy automatycznie

**Zainstalowane wtyczki**
- superpowers — brainstorming, writing-plans, subagent-driven-development
- skill-creator — budowanie własnych skilli
- context7 — dokumentacja bibliotek na żądanie
- claude-md-management — narzędzia do utrzymania CLAUDE.md
- frontend-design — dobre wzorce UI
- pyright-lsp, typescript-lsp — rozumienie typów w kodzie

**Stosy**
- Python: uv, ruff, pytest
- JavaScript/TypeScript: npm, Vite, Prettier, ESLint, Vitest

**Pasek statusu**
W dolnej krawędzi widzisz swój model, gałąź git, katalog, zużycie sesji i tygodniowe.

[CHOICE]
**WAŻNE:** Zrestartuj Claude Code — niektóre zmiany (hooki, nowe wtyczki) wymagają restartu. Jak wrócisz, wszystko będzie działać.

Jak coś nie działa, pokażę Ci bloki diagnostyczne — wklej je Kacprowi.

[ACTION]
Naciśnij Ctrl+C (lub zamknij Claude Code). Po ponownym uruchomieniu wszystko będzie gotowe.

[RECEIPT]
Do zobaczenia na następnej lekcji. Powodzenia!
```

- [ ] **Step 5: Commit**

```bash
git add plugins/claude-team/templates/prompts/section-01-welcome.md plugins/claude-team/templates/prompts/section-02-about-you.md plugins/claude-team/templates/prompts/section-03-git-identity.md plugins/claude-team/templates/prompts/section-13-finish.md
git commit -m "feat(template): add Polish prompts for sections 1, 2, 3, 13 (bookends)"
```

### Task 14: Prompt templates for sections 4–7 (plugins + stacks)

**Files:**
- Create: `plugins/claude-team/templates/prompts/section-04-baseline-plugins.md`
- Create: `plugins/claude-team/templates/prompts/section-05-lsp-plugins.md`
- Create: `plugins/claude-team/templates/prompts/section-06-python-stack.md`
- Create: `plugins/claude-team/templates/prompts/section-07-javascript-stack.md`

- [ ] **Step 1: Write section-04-baseline-plugins.md**

```markdown
[INTRO]
Zainstalujemy teraz 5 wtyczek bazowych. Każda dostaje 30-sekundowy opis przed pastą.

Instalacja wtyczek to komendy slash — nie uruchamiam ich za Ciebie, dlatego że wolę żebyś sam/a poczuł/a, jak to działa. Po każdej powiesz "gotowe" (albo wklej błąd, jeśli coś pójdzie nie tak).

Uwaga: istnieją alternatywy (BMAD, Compound Engineering) — jak w przyszłości zechcesz porównać, to świetne. Na razie zaczynamy od tych, które znam i używam.

[ACTION 1/5 — superpowers]
**superpowers** — podstawowe narzędzia pracy: brainstormowanie pomysłów, pisanie planów, wykonywanie planów zadanie po zadaniu. Centralny kawałek tego, jak ja pracuję.

Wklej w Claude Code:
```
/plugin install superpowers@claude-plugins-official
```

Napisz "gotowe" kiedy skończy.

[ACTION 2/5 — skill-creator]
**skill-creator** — gdy będziesz chciał/a zrobić własnego skilla (tak jak ten onboarding), to jest narzędzie, które Ci w tym pomoże. Pokryjemy to na lekcji tydzień po.

```
/plugin install skill-creator@claude-plugins-official
```

[ACTION 3/5 — context7]
**context7** — dokumentacja bibliotek i frameworków na żądanie. Zamiast zgadywać API Reacta czy Prisma, Claude pyta aktualnej dokumentacji. Szczególnie ważne dla świeżych bibliotek (model mógł mieć stare dane).

```
/plugin install context7@claude-plugins-official
```

[ACTION 4/5 — claude-md-management]
**claude-md-management** — narzędzia do aktualizacji i utrzymania Twojego CLAUDE.md. Po miesiącu praktyki będziesz chciał/a coś dopisać — ten skill to ułatwia.

```
/plugin install claude-md-management@claude-plugins-official
```

[ACTION 5/5 — frontend-design]
**frontend-design** — dobre praktyki UI i wzorce frontendu. Nawet jeśli nie robisz teraz frontendu, ta wtyczka poprawia jakość sugestii UI gdy o coś zapytasz — i chronię Cię przed dryfowaniem w stronę Swingów i WinForms.

```
/plugin install frontend-design@claude-plugins-official
```

[ACTION — reload]
Na końcu:
```
/reload-plugins
```

[RECEIPT]
Masz teraz 5 wtyczek bazowych. Twój `settings.json` ma nowy rekord `enabledPlugins` — skillowy będzie go aktualizował gdy dodamy kolejne.
```

- [ ] **Step 2: Write section-05-lsp-plugins.md**

```markdown
[INTRO]
**LSP** = Language Server Protocol. To sposób, w jaki edytory (VS Code, IntelliJ) pokazują Ci błędy typów, definicje funkcji i podpowiedzi — w czasie rzeczywistym, bez uruchamiania kompilatora. Claude w swojej wtyczce LSP dostaje to samo: po każdej edycji widzi błędy typów, brakujące importy, literówki.

Wyobraź sobie, że programujesz w parze z kimś, kto patrzy Ci na ekran. Zauważa literówkę wcześniej niż Ty. Tak działa Claude z LSP.

Zainstalujemy dwa: Python (pyright) i TypeScript. Każdy wymaga dodatkowo binarki language servera — instalujemy razem z wtyczką.

[ACTION 1 — pyright plugin]
```
/plugin install pyright-lsp@claude-plugins-official
```

[ACTION 2 — pyright binary]
Otwórz terminal (na Windowsie PowerShell) i wklej:
```
npm install -g pyright
```

Jeśli system poprosi o uprawnienia administratora → kliknij TAK. Jeśli nie pozwoli → zadzwoń do Kacpra, nie próbuj obejść.

[ACTION 3 — typescript plugin]
```
/plugin install typescript-lsp@claude-plugins-official
```

[ACTION 4 — typescript binary]
```
npm install -g typescript-language-server typescript
```

[ACTION — reload]
```
/reload-plugins
```

[RECEIPT]
Teraz po każdej edycji Twojego kodu Claude widzi błędy typów automatycznie. Jeśli sam wprowadzi błąd — zauważy i poprawi w tym samym ruchu.

Jeśli któraś z komend "npm install -g" zawiodła, pokaż mi dokładny błąd — przygotuję blok diagnostyczny dla Kacpra.
```

- [ ] **Step 3: Write section-06-python-stack.md**

```markdown
[INTRO]
**Python stack** w naszym zespole: `uv` zamiast pip/virtualenv, `ruff` do formatowania i lintingu, `pytest` do testów, struktura `src/` + `tests/`.

Po co uv? Bo jest 10-100x szybszy od pip i zastępuje pip + virtualenv + pip-tools jednym narzędziem. Jak chwilę popracujesz, nie wrócisz.

Sprawdzam czy masz `uv`...

[ACTION 1 — install uv if missing]
(Jeśli brak:)
Wklej w terminalu:
- **Windows PowerShell:** `winget install astral-sh.uv`
- **Mac:** `brew install uv`
- **Linux:** `curl -LsSf https://astral.sh/uv/install.sh | sh`

Jeśli Windows poprosi o uprawnienia administratora → TAK.

[ACTION 2 — ruff]
```
uv tool install ruff
```

[ACTION 3 — pytest]
```
uv tool install pytest
```

[INTRO — src layout]
Struktura projektu Python:
```
my-project/
├── pyproject.toml
├── src/
│   └── my_project/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── test_main.py
```

`src/` layout wymusza, żebyś instalował/a swój pakiet przed importem — co oznacza, że testy importują tak samo, jak będzie importować użytkownik. Żadnego magicznego "działa lokalnie ale nie w produkcji".

[RECEIPT]
Masz teraz uv, ruff, pytest. Przy następnym projekcie Python: `uv init my-project --package`, potem `cd my-project`, potem `uv add <zależność>`, potem `uv run pytest`.

Zapamiętam w Twoim CLAUDE.md, że używasz Python ze stosem uv / ruff / pytest.
```

- [ ] **Step 4: Write section-07-javascript-stack.md**

```markdown
[INTRO]
**JavaScript/React stack** w naszym zespole:
- `npm` do pakietów
- `Vite` do scaffoldingu i buildu (szybszy niż CRA, nowocześniejszy)
- `TypeScript` zawsze (bezpieczeństwo typów od dnia 1)
- `Tailwind CSS` do stylowania
- `Prettier` (bez semikolonów, pojedyncze cudzysłowy) + `ESLint` (typescript-eslint + react-hooks)
- `Vitest` + React Testing Library + `jsdom` do testów
- Pliki testów razem z komponentem: `Component.test.tsx`

Większość tych narzędzi uruchamia się przez `npx` — więc nic nie muszę instalować globalnie. Twoje projekty same przyciągną potrzebne wersje.

[ACTION — confirm understanding, no installs]
Jeden gotowy start: `npm create vite@latest moja-aplikacja -- --template react-ts`, potem `cd moja-aplikacja`, `npm install`, `npm run dev`.

Nie instaluję dziś niczego — tylko zapamiętuję w Twoim CLAUDE.md, że używasz JS/TS stack z Vite + Vitest. Hooki w następnej sekcji będą automatycznie formatować JS/TS plikami, gdy je edytujesz.

[RECEIPT]
OK, gotowe. Idziemy dalej.
```

- [ ] **Step 5: Commit**

```bash
git add plugins/claude-team/templates/prompts/section-04-baseline-plugins.md plugins/claude-team/templates/prompts/section-05-lsp-plugins.md plugins/claude-team/templates/prompts/section-06-python-stack.md plugins/claude-team/templates/prompts/section-07-javascript-stack.md
git commit -m "feat(template): add Polish prompts for sections 4-7 (plugins + stacks)"
```

### Task 15: Prompt templates for sections 8, 9, 10 (hooks + statusline)

**Files:**
- Create: `plugins/claude-team/templates/prompts/section-08-safety-hooks.md`
- Create: `plugins/claude-team/templates/prompts/section-09-quality-hooks.md`
- Create: `plugins/claude-team/templates/prompts/section-10-statusline.md`

- [ ] **Step 1: Write section-08-safety-hooks.md**

```markdown
[INTRO]
Teraz instalujemy **hooki bezpieczeństwa** — skrypty, które Claude Code uruchamia automatycznie przed pewnymi akcjami. Dwa hooki:

**protect-files** — uruchamia się przed każdą edycją pliku. Jeśli ścieżka to `.env`, `.env.local`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` albo `uv.lock` — blokuje i pokazuje "BLOCKED: Protected file." Po co? `.env` zawiera tokeny API (nie chcesz przypadkiem dać Claude'owi możliwości ich edycji), a pliki lock nigdy nie powinny być edytowane ręcznie.

**commit-gate** — uruchamia się przed każdym `git commit` albo `git push`. Sprawdza czy Twój projekt ma `tsconfig.json` (→ uruchamia `npx tsc`), `package.json` z `test:run` (→ `npm run test:run`), `pyproject.toml` (→ `ruff check .` + `pytest`). Jeśli cokolwiek zwraca błąd — blokuje commit. Bezpieczeństwo przed wypchnięciem niesprawdzonego kodu.

Jak chcesz dłuższe wyjaśnienie, napisz "wyjaśnij więcej".

[ACTION]
Kopiuję pliki hooków z wtyczki do `~/.claude/hooks/` i dodaję wpisy do Twojego `settings.json`. Nic nie musisz wklejać.

[RECEIPT]
Gotowe. Teraz:
- W `~/.claude/hooks/` masz pliki `protect-files.mjs` i `commit-gate.mjs` — możesz je otworzyć i przeczytać, to kilkanaście linii Node.
- W Twoim `settings.json` sekcja `hooks.PreToolUse` ma nowe wpisy wskazujące na te pliki.

Spróbuj: otwórz dowolny projekt i poproś Claude'a o edycję `.env` — zobaczysz komunikat BLOCKED.
```

- [ ] **Step 2: Write section-09-quality-hooks.md**

```markdown
[INTRO]
Teraz **hooki jakości** — nie blokują, tylko automatyzują. Trzy hooki:

**auto-format** — po każdej edycji pliku formatuje go automatycznie:
- `.py` → `ruff format` + `ruff check --fix`
- `.ts/.tsx/.js/.jsx/.css/.json/.html` → `npx prettier --write`
- `.ts/.tsx/.js/.jsx` dodatkowo → `npx eslint --fix`

Zapomnij o ręcznym formatowaniu. Nigdy nie blokuje — jeśli narzędzie nie jest zainstalowane, po prostu pomija.

**post-compact** — uruchamia się po kompresji kontekstu. Gdy rozmowa robi się długa, Claude streszcza historię, żeby zmieścić się w pamięci. Czasem traci to precyzyjne detale planu, nad którym pracowaliśmy. Ten hook wyciąga aktualną fazę z `plan.md` i ostatnie 20 linii `progress.md` i reinjektuje. Dzięki temu wracasz do pracy na tym samym planie, nie na streszczeniu.

**test-review** — po edycji pliku testowego (`*.test.*`, `*.spec.*`) Claude sam ocenia Twój test pod kątem:
- tautologicznych asercji (`expect(true).toBe(true)`)
- brakujących przypadków negatywnych
- testów sprawdzających tylko istnienie, nie zachowanie
- mocków, które cyklicznie zwracają dokładnie to co test oczekuje

Jak wykryje problem, pokaże Ci na czym polega.

[ACTION]
Kopiuję pliki hooków i aktualizuję `settings.json`.

[RECEIPT]
Masz teraz 5 aktywnych hooków (2 bezpieczeństwa + 3 jakości). Każda edycja pliku przechodzi przez automatyczne formatowanie, każdy test jest oceniany, każdy commit weryfikowany.

Jak coś zaskoczy Cię (np. "dlaczego mój kod został zmieniony?"), prawdopodobnie to hook — sprawdź `~/.claude/hooks/` i przeczytaj co robi odpowiedni plik `.mjs`.
```

- [ ] **Step 3: Write section-10-statusline.md**

```markdown
[INTRO]
**Pasek statusu** (ccstatusline) to mały programik, który Claude Code uruchamia, żeby pokazać Ci informacje w dolnej krawędzi — model, gałąź git, katalog, zużycie sesji, zużycie tygodniowe.

Dlaczego ważne: jesteście na planie basic, limity są niskie. Ten pasek pokazuje Ci w czasie rzeczywistym, ile zostało. Bez tego łatwo "natłuc rozmów" i odkryć o 14:00, że limit tygodniowy poszedł.

[ACTION]
Kopiuję plik konfiguracyjny do:
- **Mac/Linux:** `~/.config/ccstatusline/settings.json`
- **Windows:** `%APPDATA%\ccstatusline\settings.json`

i dodaję wpis `statusLine` do Twojego `~/.claude/settings.json`.

Pierwszy raz ccstatusline uruchomi się, `npx -y ccstatusline@latest` pobierze paczkę — chwilę potrwa. Po restarcie Claude Code zobaczysz pasek.

[RECEIPT]
Gotowe. Segmenty które zobaczysz:
- Model (kolor: jasnoczerwony)
- Effort thinking
- Gałąź git + worktree
- Katalog roboczy (3 ostatnie segmenty ścieżki)
- Długość kontekstu + procent użycia
- Tokeny total
- **Zużycie sesji** — ile tokenów zużyłeś/aś w tej rozmowie
- **Zużycie tygodniowe** — kluczowe na planie basic

Patrz na ostatnie dwa. Jeśli zużycie tygodniowe rośnie szybko — pauzuj.
```

- [ ] **Step 4: Commit**

```bash
git add plugins/claude-team/templates/prompts/section-08-safety-hooks.md plugins/claude-team/templates/prompts/section-09-quality-hooks.md plugins/claude-team/templates/prompts/section-10-statusline.md
git commit -m "feat(template): add Polish prompts for sections 8-10 (hooks + statusline)"
```

### Task 16: Prompt templates for sections 11, 12 (optional add-ons + CLAUDE.md assembly)

**Files:**
- Create: `plugins/claude-team/templates/prompts/section-11-optional-addons.md`
- Create: `plugins/claude-team/templates/prompts/section-12-claude-md.md`

- [ ] **Step 1: Write section-11-optional-addons.md**

```markdown
[INTRO]
Mamy jeszcze kilka wtyczek **opcjonalnych**. Nie instaluję żadnej z nich domyślnie — za każdą zapytam osobno.

[CHOICE 1 — telegram]
**telegram** — pozwala Ci rozmawiać z Claude Code ze swojego Telegrama. Przydatne, jak chcesz coś napisać do Claude'a z telefonu (np. "napisz draft maila", "przypomnij mi dodać testy X"). WYMAGA: utworzenia bota w Telegramie + podania tokenu. To jest krok, który robi Kacper — więc jeśli chcesz, **zostaw to na potem, umów się z Kacprem**.

Zainstalować teraz? (tak / nie / wyjaśnij więcej)

[CHOICE 2 — vercel]
**vercel** — zestaw narzędzi do wdrażania na Vercel (hosting frontend + serverless). Potrzebne tylko jeśli wdrażasz tam aplikacje. Masz już konto Vercel i robisz deployment?

Zainstalować? (tak / nie)

[CHOICE 3 — feature-dev]
**feature-dev** — zaawansowany workflow rozwijania feature'ów: analiza istniejącego kodu, projektowanie, review, przekraczający prosty plan. Wysoka wartość jak zaczniesz większe projekty. Na tym etapie — **zostawmy na potem**, będzie tematem jednej z następnych lekcji.

Zainstalować? (tak / nie — domyślnie nie)

[CHOICE 4 — code-review]
**code-review** — dedykowany agent do review Pull Request'ów. Jak zaczniecie pracować w zespołach na GitHubie — ważne. Na tym etapie — raczej nie potrzebne.

Zainstalować? (tak / nie — domyślnie nie)

[CHOICE 5 — security-guidance]
**security-guidance** — przegląd kodu pod kątem bezpieczeństwa, OWASP, typowe błędy. Warto dodać jak zaczniesz wdrażać publicznie dostępne aplikacje. Teraz — raczej nie.

Zainstalować? (tak / nie — domyślnie nie)

[ACTION]
Na podstawie Twoich odpowiedzi wklej komendy `/plugin install ...` dla tych, które wybrałeś. Napisz "gotowe" po każdej.

[RECEIPT]
Wybrane wtyczki zainstalowane. Pamiętaj: każdą z tych, które pominąłeś, możesz dodać później — po prostu uruchom `/plugin install <nazwa>@claude-plugins-official`.
```

- [ ] **Step 2: Write section-12-claude-md.md**

```markdown
[INTRO]
Ostatnia rzecz: zbieramy wszystko w Twój **globalny CLAUDE.md**. To plik, który Claude czyta na początku każdej rozmowy — Twoja wizytówka dla modelu.

[ACTION]
Jak wygląda Twój przyszły `~/.claude/CLAUDE.md`:
- **User** — Twoja odpowiedź z sekcji "O Tobie"
- **Communication** — preferowany język
- **Python Development** — uv, ruff, pytest, src layout
- **JavaScript/React Development** — npm, Vite, TypeScript, Tailwind
- **Code Quality** — wymagania i narzędzia
- **Workflow** — planowanie first, TDD
- **Test-Driven Development** — mandatory, cykl Red/Green/Refactor
- **Planning Workflow** — desktop spec → ultraplan → superpowers
- **Security** — walidacja brzegów, sekrety jako env, OWASP
- **Documentation** — README, docstrings, /docs
- **Git** — conventional commits, commit cadence, Twoja tożsamość
- **File Access** — brak automatycznego czytania Office/PDF
- **Hooks & Automation** — opis 5 hooków które właśnie zainstalowaliśmy
- **Preferences** — shell, "keep me honest — no sycophancy"

Jeśli już masz plik CLAUDE.md, zrobię kopię jako `CLAUDE.md.pre-onboarding-<data>.bak` i napiszę nowy. Jeśli miałeś tam coś swojego — powiem Ci co zostało w backupie, przeniesiesz sobie ręcznie albo z Kacprem.

Zapisuję.

[RECEIPT]
Gotowe. Plik:
- **Mac/Linux:** `~/.claude/CLAUDE.md`
- **Windows:** `%USERPROFILE%\.claude\CLAUDE.md`

Możesz go otworzyć w dowolnym edytorze i zmienić — dopisać specyfiki projektów, dodatkowe uwagi dla Claude'a, cokolwiek. Wtyczka **claude-md-management** pomoże Ci go utrzymywać.
```

- [ ] **Step 3: Commit**

```bash
git add plugins/claude-team/templates/prompts/section-11-optional-addons.md plugins/claude-team/templates/prompts/section-12-claude-md.md
git commit -m "feat(template): add Polish prompts for sections 11-12 (optional + CLAUDE.md)"
```

---

## Phase 4 — Skill & command

### Task 17: SKILL.md — onboarding orchestration

**Files:**
- Create: `plugins/claude-team/skills/onboarding/SKILL.md`

The skill file is the instructions Claude follows when orchestrating the interview. It must:
- Declare itself via YAML frontmatter (name + description)
- Tell Claude to detect OS, load state, choose start section
- For each section: read the matching `templates/prompts/section-NN-*.md`, output the `[INTRO]`, handle `[CHOICE]` if present, perform `[ACTION]`, output `[RECEIPT]`
- Write state after each completed section
- Apply merge/backup logic when touching user files
- Emit diagnostic blocks on failures

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: onboarding
description: Interactive Polish onboarding for Jakub's team. Walks a new Claude Code user through TDD workflow, git hygiene, portable hooks, stack setup, and a curated baseline plugin set in ~20 minutes. Resume-safe (checkpoint state in ~/.claude/team-onboarding-state.json). Use when the user invokes /claude-team:onboarding, says "zacznij onboarding", or opens a fresh Claude Code Desktop install.
---

# Onboarding — Jakub's team

## Overview

You are running an onboarding interview in Polish. The student is a beginner (just installed git for the first time or shipped first app). Be warm, explain WHY before WHAT, never patronize, never skip.

**The entire interview is in Polish.** All your user-facing text must be Polish. Internal thinking can stay English.

## Resource paths

- **State file:** `~/.claude/team-onboarding-state.json` (use `os.homedir()` from Node; on Windows use `%USERPROFILE%\.claude\`)
- **Plugin root:** the directory this SKILL.md lives in, two levels up — i.e., `<plugin-root>/plugins/claude-team/`
- **Prompt templates:** `<plugin-root>/templates/prompts/section-NN-*.md`
- **References:** `<plugin-root>/skills/onboarding/references/*.md`
- **Settings baseline:** `<plugin-root>/templates/settings-baseline.json`
- **CLAUDE.md template:** `<plugin-root>/templates/CLAUDE.md.pl.hbs`
- **ccstatusline template:** `<plugin-root>/templates/ccstatusline/settings.json`
- **Hook sources:** `<plugin-root>/hooks/*.mjs`
- **User hooks destination:** `~/.claude/hooks/`

## Invocation logic (run at skill start)

1. **Detect OS**: set `os = process.platform` (`darwin`/`linux`/`win32`).
2. **Resolve ~/.claude**: `homeDir + '/.claude'` on Unix, `%USERPROFILE%\.claude` on Windows.
3. **Read state**: if `team-onboarding-state.json` exists, parse. Else `state = null`.
4. **Branch:**
   - **no state** → fresh start from section 1
   - **state.finishedAt set** → ask "Onboarding już ukończony X dni temu. Chcesz odświeżyć swoje ustawienia? (Twoje odpowiedzi wczytam jako domyślne)" yes → archive state to `team-onboarding-state.<timestamp>.done.json`, restart from section 1 with `state.answers` held as defaults; no → exit
   - **else** → `last = max(state.completedSections)`; ask "Widzę że zaczęliśmy onboarding X temu. Zrobiliśmy sekcje 1-<last>. Kontynuujemy od sekcji <last+1> (<title>)?" yes → jump; no → ask to restart or exit

## Section runner (core loop)

For each section N from the chosen start through 13:

1. **Read** `templates/prompts/section-NN-<name>.md`
2. **Emit the `[INTRO]` block verbatim to the user** (Polish output)
3. **If `[CHOICE]` block present:**
   - Emit it
   - Wait for user response
   - If response is "wyjaśnij więcej" → read matching reference file from `references/` and emit it; then re-emit the choice
   - Record decision into `state.answers`
4. **Execute `[ACTION]`**: per-section logic below
5. **Emit `[RECEIPT]` block verbatim**
6. **Update state**: append N to `state.completedSections`, update `state.lastUpdatedAt`, write state file atomically (`.tmp` + rename)

## Per-section action logic

### Section 1 — Witamy
- `[ACTION]` → wait for student to say "tak" or ask a question
- No state field updated beyond `completedSections`

### Section 2 — O Tobie
- `[CHOICE]` → capture free text into `state.answers.aboutYou`

### Section 3 — Tożsamość Git
- Before `[INTRO]`: run `git config --global user.email` + `git config --global user.name`
- If both set: interpolate into the prompt (replace `{{GIT_EMAIL}}`, `{{GIT_NAME}}`), ask confirm
- If missing: skip interpolation, ask for email + name, then run `git config --global user.email "..."` and `git config --global user.name "..."`
- Capture to `state.answers.git`

### Section 4 — Wtyczki bazowe
- For each of 5 plugins (superpowers, skill-creator, context7, claude-md-management, frontend-design):
  - Check if already in `~/.claude/settings.json` under `enabledPlugins` — if yes, say "Widzę, że już masz <plugin> — pomijam ✓" and continue
  - Else emit the plugin's `[ACTION]` block with the paste command
  - Wait for "gotowe" or error text
  - If error: emit diagnostic block, ask student to call Kacper or skip, continue

### Section 5 — LSP plugins
- Same pattern for pyright-lsp + typescript-lsp plugins
- Then prompt for `npm install -g pyright` and `npm install -g typescript-language-server typescript`
- If install errors: emit diagnostic block, continue anyway (plugin enabled, binary can be installed later)

### Section 6 — Python stack
- Detect `uv`: `uv --version`
- If missing: emit OS-specific install command, wait for "gotowe"
- Detect `ruff`: `ruff --version`; if missing, prompt `uv tool install ruff`
- Detect `pytest`: `pytest --version`; if missing, prompt `uv tool install pytest`
- Capture `state.answers.stacks.push('python')`

### Section 7 — JavaScript stack
- No installs (npx covers at runtime)
- Confirm understanding
- Capture `state.answers.stacks.push('javascript')`

### Section 8 — Safety hooks
- Create `~/.claude/hooks/` if missing
- Copy `protect-files.mjs` and `commit-gate.mjs` from plugin hooks/ → `~/.claude/hooks/`
- Read settings-baseline.json template, extract the PreToolUse entries for these two hooks
- Merge into user's settings.json (create if missing, or load + merge). Substitute `{{CLAUDE_HOOKS_DIR}}` with absolute `~/.claude/hooks/` path.
- Back up settings.json before modifying (see Merge policy below)

### Section 9 — Quality hooks
- Copy `auto-format.mjs` and `post-compact.mjs` from plugin → `~/.claude/hooks/`
- Merge PostToolUse and PostCompact entries from settings-baseline.json into user's settings.json
- Include the test-review prompt hook (inline in settings.json — no file to copy)

### Section 10 — Status line
- Compute destination: `~/.config/ccstatusline/settings.json` (Mac/Linux) or `%APPDATA%\ccstatusline\settings.json` (Windows)
- Back up existing file if any
- Copy plugin's `templates/ccstatusline/settings.json` → destination
- Merge `statusLine` entry from settings-baseline.json into user's `~/.claude/settings.json`

### Section 11 — Optional add-ons
- For each of 5 optional plugins, ask yes/no
- For yes answers: emit paste command, wait for "gotowe"
- Store `state.answers.optional` map

### Section 12 — CLAUDE.md assembly
- If `~/.claude/CLAUDE.md` exists: backup to `CLAUDE.md.pre-onboarding-<YYYYMMDD-HHMMSS>.bak`
- Read `CLAUDE.md.pl.hbs` template
- Substitute placeholders:
  - `{{ABOUT_YOU}}` ← `state.answers.aboutYou`
  - `{{GIT_EMAIL}}` ← `state.answers.git.email`
  - `{{GIT_NAME}}` ← `state.answers.git.name`
  - `{{SHELL}}` ← `zsh` on darwin, `bash` on linux, `PowerShell` on win32
- Write to `~/.claude/CLAUDE.md`
- Record backup path into `state.backups.claudeMd`

### Section 13 — Gotowe
- Read any saved state one more time to build summary (list of installed plugins, hooks, stacks)
- Mark `state.finishedAt` = now
- Emit `[RECEIPT]` summary (dynamically substitute answers)
- No further prompts

## Merge policy for `~/.claude/settings.json`

On first touch, back up as `settings.json.pre-onboarding-<YYYYMMDD-HHMMSS>.bak` (only once per session — reuse timestamp if backup already exists).

Load current `settings.json` (create empty `{}` if missing). Apply changes:

- **`permissions.allow`**: union with template's allow list (dedupe)
- **`permissions.deny`**: union with template's deny list (dedupe)
- **`enabledPlugins`**: set each template key to `true` (don't remove existing)
- **`statusLine`**: set from template if not already set
- **`hooks`**: **replace wholesale** with template's hooks block (unusual for beginners to have custom hooks; merging hook arrays is error-prone)
- **`effortLevel`, `skipDangerousModePermissionPrompt`**: set from template if not already set
- **unknown top-level keys**: preserve as-is

Substitute `{{CLAUDE_HOOKS_DIR}}` with absolute path everywhere it appears in the hooks section.

Write atomically (write to `.tmp`, rename).

## Diagnostic block format (on any failure)

When a command fails or a file can't be written, emit:

```
┌─ Coś poszło nie tak ─────────────────────────────
│ Próbowałem: <plain-language>
│ Błąd: <stderr last 10 lines>
│
│ Zadzwoń do Kacpra i wklej mu to:
└──────────────────────────────────────────────────
[CLAUDE-TEAM-ONBOARDING DIAGNOSTIC]
version: 0.1.0
section: <N>
os: <platform>
command: <failed command>
exit_code: <N>
stderr: |
  <stderr content>
state_file: <absolute path>
[/DIAGNOSTIC]
```

After emitting: ask student "Czy zadzwonisz do Kacpra i wrócisz do tego później, czy pomijamy i idziemy dalej?" Skip = section marked complete with `partial: true` in state.

## Behavioral rules

- **Never improvise Polish** — read the prompt templates verbatim. If a template is missing, that's a bug — stop and tell the user.
- **Never run `/plugin install` yourself** — always ask the student to paste it. You can't invoke slash commands via skill logic.
- **Never run `winget`, `brew`, `curl | sh`, or `npm install -g` yourself** — always present as a paste-and-confirm step. Reason: shell environment differences on Windows.
- **Never overwrite a file without backing it up first**, unless it's your own state file.
- **Never block** — if you encounter an unknown situation, emit diagnostic and ask how to proceed.
- **Idempotency first**: before any install or config change, check if it's already applied.
```

- [ ] **Step 2: Manual validation**

Verify SKILL.md parses as valid markdown and has a YAML frontmatter block:

```bash
head -5 plugins/claude-team/skills/onboarding/SKILL.md
```

Expected: starts with `---`, has `name: onboarding`, has `description: ...`, ends with `---`.

- [ ] **Step 3: Commit**

```bash
git add plugins/claude-team/skills/onboarding/SKILL.md
git commit -m "feat(skill): add onboarding SKILL.md with Polish interview orchestration"
```

### Task 18: Slash command shortcut

**Files:**
- Create: `plugins/claude-team/commands/onboarding.md`

- [ ] **Step 1: Write command file**

```markdown
---
description: Uruchom interaktywny onboarding zespołu (Polish, ~20 min)
argument-hint: (brak argumentów)
---

Rozpocznij onboarding skill dla zespołu Jakuba. Skill jest zdefiniowany w `plugins/claude-team/skills/onboarding/SKILL.md`. Wywołaj go i prowadź ucznia przez interaktywną konfigurację Claude Code w języku polskim.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/claude-team/commands/onboarding.md
git commit -m "feat(command): add /claude-team:onboarding slash command shortcut"
```

---

## Phase 5 — Docs, publication, validation

### Task 19: README.md

**Files:**
- Create: `README.md` (repo root)

- [ ] **Step 1: Write README**

```markdown
# claude-team-onboarding

Plugin marketplace + single plugin (`claude-team`) for Jakub Adamski's Claude Code teaching curriculum. Delivers a ~20-minute Polish-language interactive onboarding that installs a baseline plugin set, portable Node hooks, Python + JavaScript stack tooling, git identity, and a personalized global `CLAUDE.md` — idempotent and resume-safe.

## Install (student-facing)

In Claude Code Desktop (Mac/Windows/Linux):

```
/plugin marketplace add Cracy660/claude-team-onboarding
/plugin install claude-team@claude-team-onboarding
/reload-plugins
/claude-team:onboarding
```

Or just chat "zacznij onboarding".

## What it installs

**Baseline plugins (every student):**
- `superpowers` — brainstorming, writing-plans, subagent-driven-development
- `skill-creator` — tools for building custom skills
- `context7` — on-demand library docs
- `claude-md-management` — utilities for maintaining CLAUDE.md
- `frontend-design` — UI design heuristics
- `pyright-lsp` + `typescript-lsp` — language servers for Python and TS/JS

**Portable Node hooks** (`~/.claude/hooks/`):
- `protect-files.mjs` — blocks edits to `.env*` and lock files
- `commit-gate.mjs` — blocks commits when tsc/tests/ruff/pytest fail
- `auto-format.mjs` — runs ruff/prettier/eslint after every edit
- `post-compact.mjs` — re-injects current plan phase after context compaction
- `test-review` (inline prompt hook) — reviews new test files for anti-patterns

**Stacks:**
- Python: `uv`, `ruff`, `pytest`, `src/`-layout
- JS/TS: `npm`, `Vite`, `TypeScript`, `Prettier`, `ESLint`, `Vitest`, `Tailwind`

**Status line:** `ccstatusline` configured with session + weekly usage (important for Claude basic plan).

**Personalized `~/.claude/CLAUDE.md`** assembled from the student's answers.

## For Kacper (team IT)

The skill emits structured diagnostic blocks on any failure, ready to paste into email or Telegram:

```
[CLAUDE-TEAM-ONBOARDING DIAGNOSTIC]
version: 0.1.0
section: <N>
os: <platform>
command: <failed command>
exit_code: <N>
stderr: |
  ...
state_file: <path>
[/DIAGNOSTIC]
```

Known friction points: `winget install astral-sh.uv`, `npm install -g <lsp-binary>`, occasional admin prompts on Windows. Install this plugin yourself a week in advance to see every decision the skill makes.

Student state file (inspectable): `~/.claude/team-onboarding-state.json` / `%USERPROFILE%\.claude\team-onboarding-state.json`.

## Development

### Run hook tests

```
cd plugins/claude-team/hooks
npm test
```

### Directory layout

```
claude-team-onboarding/
├── .claude-plugin/marketplace.json    ← declares marketplace + plugin
└── plugins/claude-team/
    ├── plugin.json
    ├── skills/onboarding/
    │   ├── SKILL.md                   ← orchestration logic
    │   └── references/                ← Polish lesson docs (lazy-loaded)
    ├── commands/onboarding.md         ← /claude-team:onboarding
    ├── hooks/                         ← portable Node scripts + tests
    └── templates/
        ├── CLAUDE.md.pl.hbs
        ├── settings-baseline.json
        ├── ccstatusline/settings.json
        └── prompts/                   ← 13 Polish section prompts
```

## License

MIT

## Status

**v0.1.0 — initial release.** See `docs/superpowers/specs/2026-04-20-team-onboarding-design.md` for the full design and `docs/superpowers/plans/2026-04-20-team-onboarding-implementation.md` for implementation history.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install instructions, layout, Kacper notes"
```

### Task 20: MIT license

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Write MIT license**

```
MIT License

Copyright (c) 2026 Jakub Adamski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT license"
```

### Task 21: Local install validation (Mac)

Validate the plugin installs and runs end-to-end on Jakub's own machine BEFORE pushing to GitHub. Uses local path install.

- [ ] **Step 1: Verify plugin-level metadata**

Run (from repo root):
```bash
node -e "
  const m = JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'));
  const p = JSON.parse(require('fs').readFileSync('plugins/claude-team/plugin.json','utf8'));
  console.log('marketplace:', m.name, '/ plugin:', p.name, 'v' + p.version);
  if (m.plugins[0].name !== p.name) throw new Error('name mismatch');
  console.log('OK');
"
```
Expected: `marketplace: claude-team-onboarding / plugin: claude-team v0.1.0` followed by `OK`.

- [ ] **Step 2: Run full hook test suite**

Run:
```bash
cd plugins/claude-team/hooks && npm test
```
Expected: ~29 tests, all pass.

- [ ] **Step 3: Add local marketplace to a test Claude Code session**

In Claude Code Desktop, Jakub runs:
```
/plugin marketplace add /Users/jakubadamski/Code/claude-team-onboarding
```
Expected: "Marketplace claude-team-onboarding added".

- [ ] **Step 4: Install the plugin**

```
/plugin install claude-team@claude-team-onboarding
```
Expected: "Plugin claude-team installed".

- [ ] **Step 5: Reload**

```
/reload-plugins
```
Expected: reload completes, `/claude-team:onboarding` command appears.

- [ ] **Step 6: Dry-run the skill on a test user account**

Jakub creates a second macOS user account (or deletes `~/.claude/` in a backup first), runs `/claude-team:onboarding`, and walks through the first 3 sections. Expected: Polish prompts load, state file appears at `~/.claude/team-onboarding-state.json` after section 1 completes, git config detection works.

- [ ] **Step 7: Verify resume**

Quit Claude Code mid-interview. Restart. Run `/claude-team:onboarding` again. Expected: "Widzę że zaczęliśmy onboarding... Kontynuujemy od sekcji X?"

- [ ] **Step 8: Commit manual test log (optional note)**

Add a `docs/manual-test-log.md` file noting date, OS, sections run, issues. No code — just notes. Commit.

```bash
git add docs/manual-test-log.md
git commit -m "docs: record 2026-04-20 Mac manual validation log"
```

### Task 22: Push to GitHub

- [ ] **Step 1: Create the public repo on GitHub**

Jakub runs in terminal (requires `gh` CLI installed):
```bash
gh repo create Cracy660/claude-team-onboarding --public --source=. --description "Team onboarding plugin for Jakub's Claude Code curriculum (Polish)" --push
```

Expected: repo created at `https://github.com/Cracy660/claude-team-onboarding`, initial commits pushed to `main`.

- [ ] **Step 2: Verify marketplace install from GitHub**

In a fresh Claude Code session (or after removing the local marketplace):
```
/plugin marketplace remove claude-team-onboarding
/plugin marketplace add Cracy660/claude-team-onboarding
/plugin install claude-team@claude-team-onboarding
/reload-plugins
```
Expected: install succeeds from GitHub, skill appears.

### Task 23: Test matrix pass (Linux VPS + Windows via Kacper)

- [ ] **Step 1: Run on Linux VPS**

SSH to vault-vps. Install plugin via the same 3 commands. Run onboarding. Specifically catch: XDG config paths, `~/.local/bin` on PATH, Python uv invocation, hook paths.

- [ ] **Step 2: Hand to Kacper for Windows test**

Send Kacper: repo URL, 3 install commands, note asking him to run through the full 13 sections on his Windows box and report any friction. Kacper reports back with diagnostic blocks if anything breaks.

- [ ] **Step 3: Address any issues found**

Each reported issue becomes a follow-up commit (`fix(hook): ...`, `fix(skill): ...`). No formal task per issue — iterate until green.

### Task 24: Tag v0.1.0 release

- [ ] **Step 1: Tag and push**

```bash
git tag -a v0.1.0 -m "v0.1.0 — initial release for team onboarding"
git push origin v0.1.0
```

- [ ] **Step 2: Create GitHub release**

```bash
gh release create v0.1.0 --title "v0.1.0 — Initial release" --notes "First working release. Validated on Mac + Linux VPS + Kacper's Windows. Ready for the board group starting 2026-04-27."
```

---

## Self-Review Checklist

Run through after finishing the plan:

**1. Spec coverage:**
- [x] Section 5 architecture decisions — tasks 1–4 (scaffolding), 5–8 (hooks), 9–18 (templates + skill)
- [x] Section 6 repo layout — tasks 1–4
- [x] Section 7 interview flow (13 sections) — tasks 13–16 cover all section prompts; task 17 wires them into SKILL.md
- [x] Section 8 state management — task 17 (state logic inside SKILL.md)
- [x] Section 9 hook set — tasks 5–8 (4 Node hooks, each TDD); test-review prompt hook is in task 9 (settings-baseline)
- [x] Section 10 safety & cross-platform — tasks 17 (skill OS detection), 21–23 (test matrix)
- [x] Section 11 testing strategy — tasks 21–23

**2. Placeholder scan:** None found. All Polish prompts contain actual content, all hook implementations have complete code, all commands are exact.

**3. Type consistency:** Plugin name = `claude-team` everywhere; marketplace = `claude-team-onboarding` everywhere; skill = `onboarding`; slash command = `/claude-team:onboarding`. Checked against spec Section 4.

No outstanding gaps.

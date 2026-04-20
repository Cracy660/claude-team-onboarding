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
  const script =
    process.platform === 'win32'
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
    // Use absolute node path + empty PATH so no tools (ruff, pytest, npx) are findable.
    const r = spawnSync(process.execPath, [HOOK], {
      input: '',
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: dir,
        PATH: '/nonexistent-path',
      },
    })
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

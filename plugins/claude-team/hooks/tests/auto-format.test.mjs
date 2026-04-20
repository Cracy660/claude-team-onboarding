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
  const script =
    process.platform === 'win32'
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
  const stubDir = mkdtempSync(join(tmpdir(), 'stub-fail-'))
  const script =
    process.platform === 'win32' ? `@echo off\nexit /b 1\n` : `#!/bin/sh\nexit 1\n`
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

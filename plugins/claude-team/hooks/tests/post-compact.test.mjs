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
  writeFileSync(
    join(dir, 'plan.md'),
    [
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
    ].join('\n'),
  )
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
  writeFileSync(
    join(dir, 'plan.md'),
    ['## Phase 1', 'Phase 1 content', '## Phase 2', 'Phase 2 content'].join('\n'),
  )
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
    const jsonLine = r.stdout
      .split('\n')
      .find((l) => l.trim().startsWith('{') && l.includes('systemMessage'))
    assert.ok(jsonLine, 'expected a JSON line with systemMessage')
    const parsed = JSON.parse(jsonLine)
    assert.equal(typeof parsed.systemMessage, 'string')
    assert.match(parsed.systemMessage, /spec\.md/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

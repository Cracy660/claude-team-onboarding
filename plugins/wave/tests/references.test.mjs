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

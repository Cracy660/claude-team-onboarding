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

test('seal-checklist.md sources wave.env before every registry query and hardcodes no wave number', () => {
  const text = readReference('seal-checklist.md')
  assert.ok(!text.includes("stage='W3'"), 'seal-checklist.md hardcodes wave 3')
  assert.ok(text.includes("stage='W<N>'"), 'seal-checklist.md does not carry the generic wave stage')
  const registryBlocks = text
    .split(/^```.*$/m)
    .filter((block) => block.includes('$WAVE_REGISTRY_DIR'))
  assert.ok(registryBlocks.length >= 2, 'expected at least two registry command blocks')
  for (const block of registryBlocks) {
    assert.ok(
      block.indexOf('source .claude/wave.env') >= 0 &&
        block.indexOf('source .claude/wave.env') < block.indexOf('$WAVE_REGISTRY_DIR'),
      'a registry query uses WAVE_REGISTRY_DIR before sourcing wave.env',
    )
  }
  const stageBlock = registryBlocks.find((block) => block.includes("stage='W<N>'"))
  assert.ok(stageBlock, 'no registry block contains the generic wave stage count')
  assert.ok(
    stageBlock.indexOf('GROUP BY stage') >= 0 &&
      stageBlock.indexOf('GROUP BY stage') < stageBlock.indexOf("stage='W<N>'"),
    'the stage list must appear before the wave stage count',
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

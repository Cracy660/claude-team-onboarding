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

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

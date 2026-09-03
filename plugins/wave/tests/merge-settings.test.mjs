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

test('creates no file when the fragment adds nothing to an absent target', () => {
  const s = setup(null, {})
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    assert.equal(r.stdout, 'no changes\n')
    assert.equal(existsSync(s.target), false)
    assert.equal(readdirSync(s.dir).includes('settings.json.tmp'), false)
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

test('appends a hook entry whose commands exist only under a different matcher', () => {
  const original = {
    matcher: 'Edit',
    hooks: FRAGMENT.hooks.PreToolUse[0].hooks,
  }
  const s = setup({ hooks: { PreToolUse: [original] } })
  try {
    const r = s.run()
    assert.equal(r.status, 0)
    const entries = s.read().hooks.PreToolUse
    assert.equal(entries.length, 2)
    assert.deepEqual(entries[0], original)
    assert.deepEqual(entries[1], FRAGMENT.hooks.PreToolUse[0])
    assert.match(r.stdout, /hooks\.PreToolUse \+ 1 entry/)
  } finally {
    s.cleanup()
  }
})

test('treats an absent matcher and an empty matcher as the same entry', () => {
  const existing = { hooks: FRAGMENT.hooks.PreToolUse[0].hooks }
  const fragment = structuredClone(FRAGMENT)
  fragment.hooks.PreToolUse[0].matcher = ''
  const s = setup({ hooks: { PreToolUse: [existing] } }, fragment)
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

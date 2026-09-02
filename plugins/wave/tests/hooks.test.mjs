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

test('registry-guard blocks a raw DROP TABLE even when a tools script ran earlier in the same command', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `python3 docs/registry/tools/gen-spec-exec.py --registry-dir docs/registry && sqlite3 docs/registry/spec-exec.db "DROP TABLE IF EXISTS spec"`,
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: raw destructive SQL against the registry/)
})

test('registry-guard passes the projection tool alone', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `python3 docs/registry/tools/gen-spec-exec.py --registry-dir docs/registry`,
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

test('registry-guard blocks a forged registry-write.sh mention riding an unrelated destructive segment', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `echo "note: registry-write.sh is preferred" && sqlite3 docs/registry/registry.db "DELETE FROM spec_statement"`,
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: raw destructive SQL against the registry/)
})

test('registry-guard passes a bare registry-write.sh invocation', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `registry-write.sh spec_statement --set "status='approved'" --where "id='x'" --note "n"`,
  )
  assert.equal(r.status, 0, r.stderr)
})

test('registry-guard passes a bash-invoked registry-write.sh', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `bash .claude/skills/registry/scripts/registry-write.sh finding --delete --where "id='F1'"`,
  )
  assert.equal(r.status, 0, r.stderr)
})

test('registry-guard passes a tools/ script invocation', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(REGISTRY_GUARD, `python3 docs/registry/tools/ingest-review.py export.json`)
  assert.equal(r.status, 0, r.stderr)
})

test('registry-guard blocks a raw sqlite3 delete reached via cd && sqlite3', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `cd docs/registry && sqlite3 registry.db "DELETE FROM spec_statement WHERE id='x'"`,
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: raw destructive SQL against the registry/)
})

test('registry-guard blocks the second segment even when the first is an exempt registry-write.sh call', (t) => {
  const ctx = setup(t)
  const r = ctx.hook(
    REGISTRY_GUARD,
    `.claude/skills/registry/scripts/registry-write.sh spec_statement --set "x=1" --where "id='a'" --note "n" && sqlite3 docs/registry/registry.db "DELETE FROM spec_statement"`,
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Blocked: raw destructive SQL against the registry/)
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

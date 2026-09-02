import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import {
  PLUGIN_ROOT,
  installFakeCodex,
  makeTempRepo,
  readFakeCodexLog,
  render,
  runScript,
} from './helpers.mjs'

const DISPATCH = join(
  PLUGIN_ROOT,
  'templates/project/skills/dispatch/scripts/dispatch.sh',
)
const SESSION_UUID = '0198e0b4-1a2b-4c3d-8e4f-5a6b7c8d9e0f'

const DEFAULT_WAVE_ENV = {
  WT_ROOT: '../demo-wt',
  BRANCH_PREFIX: 'codex',
  ENV_FILE: '.env.local',
  INSTALL_CMD: 'touch installed.marker',
  MODEL_DEFAULT: 'gpt-5.6-terra',
  EFFORT_DEFAULT: 'medium',
  MODEL_JUDGMENT: 'gpt-5.6-sol',
  LOG_DIR: '.superpowers/dispatch-logs',
  REGISTRY_DIR: 'docs/registry',
}

// installed.marker is ignored on purpose: `git worktree remove` refuses a worktree that
// holds untracked files, exactly as it would for a real node_modules that is not ignored.
const IGNORE = '.env.local\ninstalled.marker\n'

// runScript hands the script an already closed stdin, which would make the "stdin is
// terminated" assertion pass even without `< /dev/null`. This wrapper pipes real bytes in,
// standing in for the terminal stdin that makes codex stall in production.
const STDIN_NOISE = 'unterminated stdin'
const WRAPPER = `#!/usr/bin/env bash\nprintf '%s' '${STDIN_NOISE}' | bash "$1" "\${@:2}"\n`

function setup(t, { waveEnv = {}, envFile = 'TOKEN=abc\n', files = {} } = {}) {
  const repo = makeTempRepo({
    waveEnv: { ...DEFAULT_WAVE_ENV, ...waveEnv },
    envFile,
    files: { '.gitignore': IGNORE, 'brief.md': 'do the task', ...files },
  })
  t.after(() => repo.cleanup())
  const bin = installFakeCodex(join(repo.root, '.fakebin'))
  const codexLog = join(repo.root, 'codex-calls.log')
  const codexHome = join(repo.root, '.codex-home')
  const wrapper = join(repo.root, 'with-stdin.sh')
  writeFileSync(wrapper, WRAPPER)
  return {
    ...repo,
    codexLog,
    codexHome,
    prompt: join(repo.root, 'brief.md'),
    wt: (task) => join(repo.root, '..', 'demo-wt', task),
    dispatch: (args) =>
      runScript(wrapper, [DISPATCH, ...args], {
        cwd: repo.root,
        env: {
          PATH: `${bin}:${process.env.PATH}`,
          FAKE_CODEX_LOG: codexLog,
          CODEX_HOME: codexHome,
        },
      }),
  }
}

test('the rendered wave.env is what the script reads its defaults from', (t) => {
  const knobs = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'tests/fixtures/knobs.sample.json'), 'utf8'))
  const rendered = render('templates/project/wave.env.hbs', knobs)
  assert.equal(rendered.includes('{{'), false, rendered)
  const repo = makeTempRepo({ waveEnv: {} })
  t.after(() => repo.cleanup())
  mkdirSync(join(repo.root, '.claude'), { recursive: true })
  writeFileSync(join(repo.root, '.claude/wave.env'), rendered)
  const r = runScript(DISPATCH, [], { cwd: repo.root })
  assert.equal(r.status, 1)
  assert.match(r.stdout, /^Defaults: --model gpt-5\.6-terra --effort medium/m)
  assert.match(r.stdout, /^use --model gpt-5\.6-sol for multi-file or judgment tasks\.$/m)
})

test('new creates the worktree and branch under the configured root', (t) => {
  const ctx = setup(t)
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(ctx.wt('task-a')), true)
  assert.match(r.stdout, /^dispatch: task-a -> .*demo-wt\/task-a \(gpt-5\.6-terra\/medium\)/m)
  const branches = ctx.run('git', ['branch', '--list', 'codex/task-a'])
  assert.match(branches.stdout, /codex\/task-a/)
})

test('new copies the configured env file into the worktree', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(readFileSync(join(ctx.wt('task-a'), '.env.local'), 'utf8'), 'TOKEN=abc\n')
})

test('an empty WAVE_ENV_FILE skips the copy instead of failing', (t) => {
  const ctx = setup(t, { waveEnv: { ENV_FILE: '' }, envFile: null })
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(join(ctx.wt('task-a'), '.env.local')), false)
})

test('new runs the configured install command inside the worktree', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(existsSync(join(ctx.wt('task-a'), 'installed.marker')), true)
})

test('an empty WAVE_INSTALL_CMD skips provisioning', (t) => {
  const ctx = setup(t, { waveEnv: { INSTALL_CMD: '' } })
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(join(ctx.wt('task-a'), 'installed.marker')), false)
})

test('new calls codex with the sandbox, model, effort and last-message flags', (t) => {
  const ctx = setup(t)
  assert.equal(
    ctx.dispatch(['new', 'task-a', ctx.prompt, '--model', 'gpt-5.6-sol', '--effort', 'high'])
      .status,
    0,
  )
  const calls = readFakeCodexLog(ctx.codexLog)
  assert.equal(calls.length, 1)
  const { argv } = calls[0]
  assert.equal(argv[0], 'exec')
  assert.equal(realpathSync(argv[argv.indexOf('--cd') + 1]), realpathSync(ctx.wt('task-a')))
  assert.equal(argv[argv.indexOf('--sandbox') + 1], 'workspace-write')
  assert.equal(argv.includes('--dangerously-bypass-approvals-and-sandbox'), false)
  assert.equal(argv[argv.indexOf('-m') + 1], 'gpt-5.6-sol')
  assert.equal(argv[argv.indexOf('-c') + 1], 'model_reasoning_effort=high')
  assert.equal(
    argv[argv.indexOf('--output-last-message') + 1],
    join(ctx.root, '.superpowers/dispatch-logs', 'task-a.last.md'),
  )
  // The prompt rides the argument, read from the file, never piped.
  assert.equal(argv[argv.length - 1], 'do the task')
})

test('new places the worktree, branch, log and model under knobs that differ from the built-in defaults', (t) => {
  // Every value here differs from both the script's own fallbacks (codex,
  // gpt-5.6-terra, medium, .superpowers/dispatch-logs) and the ../demo-wt sample
  // used elsewhere in this file: a script that hardcodes any of those would still
  // pass every other test, because the fixtures happen to match the fallbacks.
  const ctx = setup(t, {
    waveEnv: {
      WT_ROOT: '../pool-wt',
      BRANCH_PREFIX: 'impl',
      LOG_DIR: '.wave/logs',
      MODEL_DEFAULT: 'model-x',
      EFFORT_DEFAULT: 'low',
    },
  })
  const r = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)

  const wt = join(ctx.root, '..', 'pool-wt', 'task-a')
  assert.equal(existsSync(wt), true)

  const branches = ctx.run('git', ['branch', '--list', 'impl/task-a'])
  assert.match(branches.stdout, /impl\/task-a/)

  const logDir = join(ctx.root, '.wave/logs')
  const entries = readdirSync(logDir)
  assert.equal(
    entries.some((f) => /^task-a\.\d{8}-\d{6}\.log$/.test(f)),
    true,
    `no timestamped log in ${entries.join(', ')}`,
  )

  const calls = readFakeCodexLog(ctx.codexLog)
  assert.equal(calls.length, 1)
  const { argv } = calls[0]
  assert.equal(argv[argv.indexOf('--output-last-message') + 1], join(logDir, 'task-a.last.md'))
  assert.equal(argv[argv.indexOf('-m') + 1], 'model-x')
  assert.equal(argv[argv.indexOf('-c') + 1], 'model_reasoning_effort=low')
})

test('new terminates stdin so codex cannot stall waiting for input', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  assert.equal(readFakeCodexLog(ctx.codexLog)[0].stdinBytes, 0)
})

test('a failing codex run is not masked by the tee pipeline', (t) => {
  const ctx = setup(t)
  // A codex that exits non-zero: without `set -o pipefail` the pipeline would report
  // tee's exit code and the dispatch would look green.
  const failing = join(ctx.root, '.failbin')
  mkdirSync(failing, { recursive: true })
  writeFileSync(join(failing, 'codex'), '#!/bin/sh\ncat > /dev/null\nexit 7\n')
  chmodSync(join(failing, 'codex'), 0o755)
  const r = runScript(join(ctx.root, 'with-stdin.sh'), [DISPATCH, 'new', 'task-a', ctx.prompt], {
    cwd: ctx.root,
    env: { PATH: `${failing}:${process.env.PATH}`, FAKE_CODEX_LOG: ctx.codexLog },
  })
  assert.equal(r.status, 7)
  assert.doesNotMatch(r.stdout, /dispatch: done/)
})

test('new writes a timestamped log and the last-message file', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  const logDir = join(ctx.root, '.superpowers/dispatch-logs')
  const entries = readdirSync(logDir)
  assert.equal(
    entries.some((f) => /^task-a\.\d{8}-\d{6}\.log$/.test(f)),
    true,
    `no timestamped log in ${entries.join(', ')}`,
  )
  assert.equal(existsSync(join(logDir, 'task-a.last.md')), true)
})

// One table over the four refusals. Each row states the wrong-Green it pins.
const REFUSALS = [
  {
    name: 'a task id that is not kebab-case',
    message: /^dispatch: task-id must be kebab-case$/m,
    prepare: (ctx) => ['new', 'Task_A', ctx.prompt],
  },
  {
    name: 'a worktree that already exists',
    message: /^dispatch: worktree exists: .*demo-wt\/task-a \(use resume, or clean first\)$/m,
    prepare: (ctx) => {
      mkdirSync(ctx.wt('task-a'), { recursive: true })
      return ['new', 'task-a', ctx.prompt]
    },
  },
  {
    name: 'a configured env file that is missing from the main checkout',
    options: { envFile: null },
    message: /^dispatch: \.env\.local missing in main checkout$/m,
    prepare: (ctx) => ['new', 'task-a', ctx.prompt],
  },
  {
    name: 'a missing .claude/wave.env',
    message: /^dispatch: \.claude\/wave\.env missing$/m,
    prepare: (ctx) => {
      rmSync(join(ctx.root, '.claude/wave.env'))
      return ['new', 'task-a', ctx.prompt]
    },
  },
]

for (const row of REFUSALS) {
  test(`new refuses ${row.name} with exit 1 and no codex call`, (t) => {
    const ctx = setup(t, row.options)
    const r = ctx.dispatch(row.prepare(ctx))
    assert.equal(r.status, 1)
    assert.match(r.stderr, row.message)
    assert.deepEqual(readFakeCodexLog(ctx.codexLog), [])
  })
}

test('resume finds the session by worktree path and runs inside the worktree', (t) => {
  const ctx = setup(t)
  const created = ctx.dispatch(['new', 'resume-task', ctx.prompt])
  assert.equal(created.status, 0, created.stderr)
  const wt = created.stdout.match(/^dispatch: resume-task -> (\S+) \(/m)[1]

  const sessionDir = join(ctx.codexHome, 'sessions', '2026', '09', '02')
  mkdirSync(sessionDir, { recursive: true })
  writeFileSync(
    join(sessionDir, `rollout-2026-09-02T10-11-12-${SESSION_UUID}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', cwd: wt })}\n`,
  )

  const r = ctx.dispatch(['resume', 'resume-task', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, new RegExp(`session=${SESSION_UUID}`))

  const calls = readFakeCodexLog(ctx.codexLog)
  const last = calls[calls.length - 1]
  assert.equal(last.resumeId, SESSION_UUID)
  assert.deepEqual(last.argv.slice(0, 2), ['exec', 'resume'])
  assert.equal(last.argv[last.argv.length - 1], 'do the task')
  assert.equal(last.stdinBytes, 0)
  // codex exec resume does not restore the session's --cd, so the script must pin cwd.
  assert.equal(realpathSync(last.cwd), realpathSync(ctx.wt('resume-task')))
  assert.notEqual(realpathSync(last.cwd), ctx.root)
})

test("resume picks the session whose recorded cwd is this task's worktree, not the newest session", (t) => {
  const ctx = setup(t)
  const createdA = ctx.dispatch(['new', 'task-a', ctx.prompt])
  assert.equal(createdA.status, 0, createdA.stderr)
  const wtA = createdA.stdout.match(/^dispatch: task-a -> (\S+) \(/m)[1]
  const createdB = ctx.dispatch(['new', 'task-b', ctx.prompt])
  assert.equal(createdB.status, 0, createdB.stderr)
  const wtB = createdB.stdout.match(/^dispatch: task-b -> (\S+) \(/m)[1]

  const UUID_A = '0198e0b4-1111-1111-1111-111111111111'
  const UUID_B = '0198e0b4-2222-2222-2222-222222222222'
  const sessionDir = join(ctx.codexHome, 'sessions', '2026', '09', '02')
  mkdirSync(sessionDir, { recursive: true })
  // task-a's session file sorts lexicographically EARLIER, task-b's LATER: a
  // "pick the newest session" implementation would grab task-b's UUID when
  // asked to resume task-a, instead of filtering by which session's recorded
  // cwd actually references task-a's worktree.
  writeFileSync(
    join(sessionDir, `rollout-2026-09-02T09-00-00-${UUID_A}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', cwd: wtA })}\n`,
  )
  writeFileSync(
    join(sessionDir, `rollout-2026-09-02T10-00-00-${UUID_B}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', cwd: wtB })}\n`,
  )

  const r = ctx.dispatch(['resume', 'task-a', ctx.prompt])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, new RegExp(`session=${UUID_A}`))

  const calls = readFakeCodexLog(ctx.codexLog)
  const last = calls[calls.length - 1]
  assert.equal(last.resumeId, UUID_A)
})

test('resume refuses a task with no worktree', (t) => {
  const ctx = setup(t)
  const r = ctx.dispatch(['resume', 'never-dispatched', ctx.prompt])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^dispatch: no worktree for never-dispatched at .*demo-wt\/never-dispatched$/m)
  assert.deepEqual(readFakeCodexLog(ctx.codexLog), [])
})

test('clean removes the worktree and keeps the branch', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  const r = ctx.dispatch(['clean', 'task-a'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(existsSync(ctx.wt('task-a')), false)
  const branches = ctx.run('git', ['branch', '--list', 'codex/task-a'])
  assert.match(branches.stdout, /codex\/task-a/)
})

test('clean refuses a worktree holding uncommitted work and leaves it in place', (t) => {
  const ctx = setup(t)
  assert.equal(ctx.dispatch(['new', 'task-a', ctx.prompt]).status, 0)
  const stray = join(ctx.wt('task-a'), 'stray.txt')
  writeFileSync(stray, 'uncommitted work\n')

  const r = ctx.dispatch(['clean', 'task-a'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^dispatch: worktree dirty/m)
  assert.equal(existsSync(ctx.wt('task-a')), true)
  assert.equal(existsSync(stray), true)
})

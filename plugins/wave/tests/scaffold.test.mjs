import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT, installFakeCodex, makeTempRepo, readFakeCodexLog } from './helpers.mjs'

const REPO_ROOT = join(PLUGIN_ROOT, '..', '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

test('plugin.json parses and names the plugin wave', () => {
  const manifest = readJson(join(PLUGIN_ROOT, 'plugin.json'))
  assert.equal(manifest.name, 'wave')
  assert.equal(manifest.version, '0.1.1')
  assert.ok(manifest.description.length > 0)
})

test('marketplace lists both plugins and every source path exists', () => {
  const marketplace = readJson(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'))
  const names = marketplace.plugins.map((p) => p.name)
  assert.deepEqual(names.sort(), ['claude-team', 'wave'])
  for (const entry of marketplace.plugins) {
    assert.ok(existsSync(join(REPO_ROOT, entry.source)), `missing source dir: ${entry.source}`)
    assert.ok(entry.description.length > 0, `missing description: ${entry.name}`)
  }
  assert.ok(marketplace.description.includes('wave'))
})

test('both commands carry a description frontmatter and invoke their skill', () => {
  for (const [file, skill] of [
    ['setup.md', 'wave:setup'],
    ['init.md', 'wave:init'],
  ]) {
    const body = readFileSync(join(PLUGIN_ROOT, 'commands', file), 'utf8')
    assert.match(body, /^---\n(.*\n)*?description: .+\n(.*\n)*?---\n/)
    assert.match(body, new RegExp(`Invoke the \`${skill}\` skill and follow it\\.`))
  }
})

test('the setup skill addresses the target file through one variable', () => {
  const md = readFileSync(join(PLUGIN_ROOT, 'skills', 'setup', 'SKILL.md'), 'utf8')
  const code = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((match) => match[1]).join('\n')
  const homeTarget = '$HOME/.claude/CLAUDE.md'
  assert.equal(code.split(homeTarget).length - 1, 1, 'the default target must occur once in code')
  assert.ok(
    code.split('\n').some((line) => line.startsWith('TARGET=') && line.includes(homeTarget)),
    'the default target must be assigned on a TARGET line',
  )
  const tempCount = md.split('.wave.tmp').length - 1
  const variableTempCount = md.split('$TARGET.wave.tmp').length - 1
  assert.equal(tempCount, variableTempCount, 'every temporary path must use TARGET')
  assert.ok(variableTempCount >= 3, 'expected at least three TARGET temporary paths')
  const row = md.split('\n').find((line) => line.startsWith('| `never-touch` |'))
  assert.ok(row?.includes('comma-separated'), 'the never-touch row does not define a list')
  assert.ok(row?.includes('Split the value'), 'the never-touch row does not say to split the value')
})

test('makeTempRepo builds a git repo with exactly one commit', () => {
  const repo = makeTempRepo()
  try {
    const log = repo.run('git', ['log', '--oneline'])
    assert.equal(log.status, 0)
    assert.equal(log.stdout.trim().split('\n').length, 1)
    const status = repo.run('git', ['status', '--porcelain'])
    assert.equal(status.stdout.trim(), '')
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo writes .claude/wave.env as WAVE_<KEY>=<value> lines', () => {
  const repo = makeTempRepo({
    waveEnv: { WT_ROOT: '../demo-wt', BRANCH_PREFIX: 'codex', ENV_FILE: '', REGISTRY_DIR: 'docs/registry' },
  })
  try {
    const lines = readFileSync(join(repo.root, '.claude', 'wave.env'), 'utf8').trim().split('\n')
    assert.deepEqual(lines, [
      'WAVE_WT_ROOT=../demo-wt',
      'WAVE_BRANCH_PREFIX=codex',
      'WAVE_ENV_FILE=',
      'WAVE_REGISTRY_DIR=docs/registry',
    ])
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo quotes values with spaces so the file stays sourceable', () => {
  const repo = makeTempRepo({ waveEnv: { INSTALL_CMD: 'pnpm install --prefer-offline --silent' } })
  try {
    const envPath = join(repo.root, '.claude', 'wave.env')
    assert.equal(
      readFileSync(envPath, 'utf8').trim(),
      'WAVE_INSTALL_CMD="pnpm install --prefer-offline --silent"',
    )
    const sourced = spawnSync('bash', ['-c', `set -a; . "${envPath}"; printf '%s' "$WAVE_INSTALL_CMD"`], {
      encoding: 'utf8',
    })
    assert.equal(sourced.stdout, 'pnpm install --prefer-offline --silent')
  } finally {
    repo.cleanup()
  }
})

test('makeTempRepo leaves the env file untracked and commits extra files', () => {
  const repo = makeTempRepo({ envFile: 'DATABASE_URL=postgres://local\n', files: { 'src/a.txt': 'a\n' } })
  try {
    assert.equal(readFileSync(join(repo.root, '.env.local'), 'utf8'), 'DATABASE_URL=postgres://local\n')
    const tracked = repo.run('git', ['ls-files'])
    assert.ok(tracked.stdout.includes('src/a.txt'))
    assert.ok(!tracked.stdout.includes('.env.local'))
  } finally {
    repo.cleanup()
  }
})

test('installFakeCodex records argv, cwd and stdin length and writes the last-message file', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-codex-')))
  try {
    const binDir = installFakeCodex(join(dir, 'bin'))
    const codex = join(binDir, 'codex')
    accessSync(codex, constants.X_OK)

    const logPath = join(dir, 'codex.log')
    const lastMessage = join(dir, 'task-1.last.md')
    const r = spawnSync(codex, ['exec', '--sandbox', 'workspace-write', '--output-last-message', lastMessage, 'do it'], {
      cwd: dir,
      input: '',
      encoding: 'utf8',
      env: { ...process.env, FAKE_CODEX_LOG: logPath },
    })
    assert.equal(r.status, 0)

    const entries = readFakeCodexLog(logPath)
    assert.equal(entries.length, 1)
    assert.deepEqual(entries[0].argv, [
      'exec',
      '--sandbox',
      'workspace-write',
      '--output-last-message',
      lastMessage,
      'do it',
    ])
    assert.equal(entries[0].cwd, dir)
    assert.equal(entries[0].stdinBytes, 0)
    assert.equal(readFileSync(lastMessage, 'utf8'), 'fake last message\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('installFakeCodex records the resume id and the stdin byte count', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-codex-')))
  try {
    const codex = join(installFakeCodex(join(dir, 'bin')), 'codex')
    const logPath = join(dir, 'codex.log')
    spawnSync(codex, ['exec', 'resume', '0199-uuid', 'again'], {
      cwd: dir,
      input: 'abc',
      encoding: 'utf8',
      env: { ...process.env, FAKE_CODEX_LOG: logPath },
    })
    const entries = readFakeCodexLog(logPath)
    assert.equal(entries[0].resumeId, '0199-uuid')
    assert.equal(entries[0].stdinBytes, 3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('readFakeCodexLog returns an empty array when codex was never called', () => {
  assert.deepEqual(readFakeCodexLog(join(tmpdir(), 'wave-no-such-codex.log')), [])
})

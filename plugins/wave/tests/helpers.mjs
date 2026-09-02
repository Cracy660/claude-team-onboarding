// Shared test helpers for the wave plugin suite.
// Later tasks extend this file by ADDING exports only; never rename or change a signature.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// tests/helpers.mjs -> tests -> plugins/wave
export const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// Values with whitespace or shell metacharacters are double quoted so the file stays
// `source`-able; simple values are written bare, exactly as `WAVE_<KEY>=<value>`.
function waveEnvLine(key, value) {
  const raw = String(value)
  const body = /[\s"'$`\\]/.test(raw) ? `"${raw.replace(/(["$`\\])/g, '\\$1')}"` : raw
  return `WAVE_${key}=${body}`
}

export function makeTempRepo({ waveEnv = {}, envFile = null, files = {} } = {}) {
  // realpath: on macOS the tmpdir is a symlink and `git rev-parse --show-toplevel`
  // reports the resolved path, so tests comparing cwd strings would fail without this.
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'wave-repo-')))
  const root = join(base, 'repo')
  mkdirSync(root, { recursive: true })

  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  git('init', '-b', 'main')
  git('config', 'user.email', 'wave-tests@example.com')
  git('config', 'user.name', 'Wave Tests')
  git('config', 'commit.gpgsign', 'false')

  const write = (rel, content) => {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }

  write('README.md', '# temp repo\n')
  write('.gitignore', '.env.local\n')
  const waveKeys = Object.keys(waveEnv)
  if (waveKeys.length > 0) {
    write('.claude/wave.env', waveKeys.map((k) => waveEnvLine(k, waveEnv[k])).join('\n') + '\n')
  }
  for (const [rel, content] of Object.entries(files)) write(rel, content)

  git('add', '-A')
  git('commit', '-m', 'initial commit')

  // Written after the commit so it stays untracked, the way a real .env.local is:
  // a committed env file would land in every worktree and make the copy test vacuous.
  if (envFile !== null) write('.env.local', envFile)

  return {
    root,
    run(cmd, args = [], opts = {}) {
      return spawnSync(cmd, args, {
        cwd: root,
        encoding: 'utf8',
        ...opts,
        env: { ...process.env, ...(opts.env || {}) },
      })
    },
    cleanup() {
      rmSync(base, { recursive: true, force: true })
    },
  }
}

// Writes an executable `codex` into binDir. It records one JSON line per invocation into
// the file named by $FAKE_CODEX_LOG. Tests must PREPEND binDir to PATH, never replace it:
// the script itself needs `node` and `wc`.
export function installFakeCodex(binDir) {
  mkdirSync(binDir, { recursive: true })
  const file = join(binDir, 'codex')
  writeFileSync(
    file,
    `#!/bin/sh
# Fake codex CLI used by the wave test suite.
stdin_bytes=$(cat | wc -c | tr -d ' ')
FAKE_CODEX_STDIN_BYTES="$stdin_bytes" node -e '
const fs = require("node:fs")
const argv = process.argv.slice(1)
const rec = { argv, cwd: process.cwd(), stdinBytes: Number(process.env.FAKE_CODEX_STDIN_BYTES || 0) }
if (argv[0] === "exec" && argv[1] === "resume") rec.resumeId = argv[2]
const out = argv.indexOf("--output-last-message")
if (out !== -1 && argv[out + 1]) fs.writeFileSync(argv[out + 1], "fake last message\\n")
fs.appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(rec) + "\\n")
' "$@"
exit 0
`,
  )
  chmodSync(file, 0o755)
  return binDir
}

export function readFakeCodexLog(logPath) {
  if (!existsSync(logPath)) return []
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))
}

// templateRelPath is relative to PLUGIN_ROOT, e.g. 'templates/project/wave.env.hbs'.
export function render(templateRelPath, knobs) {
  const dir = mkdtempSync(join(tmpdir(), 'wave-knobs-'))
  const knobsFile = join(dir, 'knobs.json')
  try {
    writeFileSync(knobsFile, JSON.stringify(knobs, null, 2))
    const r = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'render.mjs'), join(PLUGIN_ROOT, templateRelPath), knobsFile],
      { encoding: 'utf8' },
    )
    if (r.status !== 0) throw new Error(`render ${templateRelPath} failed (${r.status}): ${r.stderr}`)
    return r.stdout
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function runScript(absScript, args, { cwd, env } = {}) {
  return spawnSync('bash', [absScript, ...args], {
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...(env || {}) },
  })
}

export function runHook(absHook, toolInput, { cwd, env } = {}) {
  return spawnSync('bash', [absHook], {
    input: JSON.stringify({ tool_input: toolInput }),
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...(env || {}) },
  })
}

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const cwd = process.env.CLAUDE_PROJECT_DIR
if (!cwd || !existsSync(cwd)) process.exit(0)

function onPath(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'command'
  const args = process.platform === 'win32' ? [cmd] : ['-v', cmd]
  const r = spawnSync(which, args, { encoding: 'utf8', shell: true })
  return r.status === 0
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true })
}

let failed = false

if (existsSync(join(cwd, 'tsconfig.json')) && onPath('npx')) {
  const r = run('npx', ['tsc', '--noEmit'])
  if (r.status !== 0) failed = true
}

const pkgJson = join(cwd, 'package.json')
if (existsSync(pkgJson) && onPath('npm')) {
  try {
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'))
    if (pkg.scripts?.['test:run']) {
      const r = run('npm', ['run', 'test:run', '--', '--passWithNoTests'])
      if (r.status !== 0) failed = true
    }
  } catch {
    // Malformed package.json — leave it to user's other tooling
  }
}

if (existsSync(join(cwd, 'pyproject.toml'))) {
  if (onPath('ruff')) {
    const r = run('ruff', ['check', '.'])
    if (r.status !== 0) failed = true
  }
  if (onPath('pytest')) {
    const r = run('pytest')
    if (r.status !== 0 && r.status !== 5) failed = true
  }
}

if (failed) {
  process.stdout.write('BLOCKED: Fix errors/tests before committing.\n')
  process.exit(2)
}
process.exit(0)

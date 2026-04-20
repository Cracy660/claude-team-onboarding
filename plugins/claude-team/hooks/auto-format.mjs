import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

let input = {}
try {
  const raw = readFileSync(0, 'utf8')
  if (raw.trim()) input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const filePath = input?.tool_input?.file_path ?? ''
if (!filePath) process.exit(0)

const cwd =
  process.env.CLAUDE_PROJECT_DIR && existsSync(process.env.CLAUDE_PROJECT_DIR)
    ? process.env.CLAUDE_PROJECT_DIR
    : process.cwd()

function onPath(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'command'
  const args = process.platform === 'win32' ? [cmd] : ['-v', cmd]
  const r = spawnSync(which, args, { encoding: 'utf8', shell: true })
  return r.status === 0
}

function tryRun(cmd, args) {
  try {
    spawnSync(cmd, args, { cwd, stdio: 'ignore', shell: true })
  } catch {
    /* never block */
  }
}

const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()

if (ext === '.py' && onPath('ruff')) {
  tryRun('ruff', ['format', `"${filePath}"`])
  tryRun('ruff', ['check', '--fix', `"${filePath}"`])
}

const prettierExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html'])
if (prettierExts.has(ext) && onPath('npx')) {
  tryRun('npx', ['prettier', '--write', `"${filePath}"`])
}

const eslintExts = new Set(['.ts', '.tsx', '.js', '.jsx'])
if (eslintExts.has(ext) && onPath('npx')) {
  tryRun('npx', ['eslint', '--fix', `"${filePath}"`])
}

process.exit(0)

import { readFileSync } from 'node:fs'

let input = {}
try {
  const raw = readFileSync(0, 'utf8')
  if (raw.trim()) input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const filePath = input?.tool_input?.file_path ?? ''
if (!filePath) process.exit(0)

const base = filePath.split(/[\\/]/).pop()

const PROTECTED = [
  /^\.env$/i,
  /^\.env\.[^.]+$/i,
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\.yaml$/i,
  /^uv\.lock$/i,
]

if (/\.example$/i.test(base)) process.exit(0)

for (const re of PROTECTED) {
  if (re.test(base)) {
    process.stdout.write('BLOCKED: Protected file — edit manually if you really mean to.\n')
    process.exit(2)
  }
}

process.exit(0)

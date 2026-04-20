import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const cwd = process.env.CLAUDE_PROJECT_DIR
if (!cwd || !existsSync(cwd)) process.exit(0)

function extractCurrentPhase(planMd) {
  const lines = planMd.split('\n')
  let collecting = false
  const out = []
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (collecting) break
      if (!/DONE/.test(line)) {
        collecting = true
        out.push(line)
      }
    } else if (collecting) {
      out.push(line)
    }
  }
  return out.length ? out.join('\n') : null
}

function lastLines(text, n) {
  const lines = text.split('\n')
  return lines.slice(Math.max(0, lines.length - n)).join('\n')
}

const planPath = join(cwd, 'plan.md')
const progressPath = join(cwd, 'progress.md')

process.stdout.write('=== CURRENT PHASE (from plan.md) ===\n')
if (existsSync(planPath)) {
  const phase = extractCurrentPhase(readFileSync(planPath, 'utf8'))
  process.stdout.write(phase ?? 'No active phase found in plan.md')
  process.stdout.write('\n')
} else {
  process.stdout.write('No plan.md found\n')
}

process.stdout.write('\n=== RECENT PROGRESS (last 20 lines of progress.md) ===\n')
if (existsSync(progressPath)) {
  process.stdout.write(lastLines(readFileSync(progressPath, 'utf8'), 20))
  process.stdout.write('\n')
} else {
  process.stdout.write('No progress.md found\n')
}

process.stdout.write('\n')
process.stdout.write(
  JSON.stringify({
    systemMessage:
      'Context was compacted. Above is your current phase and recent progress extracted from source files. Read the relevant spec.md section for this phase before proceeding. Do not trust the compacted summary over these files.',
  }),
)
process.stdout.write('\n')

process.exit(0)

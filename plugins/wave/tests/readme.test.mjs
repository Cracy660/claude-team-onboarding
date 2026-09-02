import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const README = readFileSync(join(PLUGIN_ROOT, '..', '..', 'README.md'), 'utf8')
const START = '## wave: multi-model wave execution'

// Everything from the wave heading to the next top-level heading.
function waveSection() {
  const start = README.indexOf(START)
  assert.notEqual(start, -1, `README is missing the heading: ${START}`)
  const rest = README.slice(start + START.length)
  const end = rest.indexOf('\n## ')
  return rest.slice(0, end === -1 ? undefined : end)
}

test('the wave section sits after the claude-team sections and before the license', () => {
  assert.ok(README.indexOf('## For Kacper (team IT)') < README.indexOf(START))
  assert.ok(README.indexOf(START) < README.indexOf('## License'))
})

test('the wave section carries every heading the spec asks for', () => {
  const section = waveSection()
  for (const heading of [
    '### Install',
    '### What `/wave:setup` changes',
    '### What `/wave:init` writes',
    '### A first wave in ten lines',
    '### Updating',
    '### Not the `codex@openai-codex` plugin',
    '### Verify a local install',
  ]) {
    assert.ok(section.includes(heading), `README is missing the heading: ${heading}`)
  }
})

test('the wave section carries the four install commands', () => {
  const section = waveSection()
  for (const command of [
    '/plugin marketplace remove claude-team-onboarding',
    '/plugin marketplace add <path-to-your-checkout>',
    '/plugin install wave@claude-team-onboarding',
    '/reload-plugins',
  ]) {
    assert.ok(section.includes(command), `README is missing the command: ${command}`)
  }
})

test('the first-wave walkthrough is ten numbered lines', () => {
  const section = waveSection()
  const walkthrough = section.slice(section.indexOf('### A first wave in ten lines'))
  const numbered = walkthrough.split('\n').filter((line) => /^\d+\. \S/.test(line))
  assert.equal(numbered.length, 10)
  assert.match(numbered[0], /^1\. /)
  assert.match(numbered[9], /^10\. /)
})

test('the wave section states that the codex plugin is unrelated and how to update', () => {
  const section = waveSection()
  assert.match(section, /this loop does not use it/)
  assert.match(section, /\/plugin update wave@claude-team-onboarding/)
  assert.match(section, /re-run `\/wave:init`/)
})

#!/usr/bin/env node
// Renders a wave template. Two constructs, no nesting:
//   {{KEY}}                      replaced by the knob's value
//   {{#if KEY}} ... {{/if}}      kept when the knob is true or a non-empty string
// A {{...}} left after rendering is an unknown knob and a hard error.
// Usage: node scripts/render.mjs <template> <knobs.json> [--out <file>]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

function parseArgs(argv) {
  const positional = []
  let out = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      out = argv[i + 1]
      i += 1
    } else {
      positional.push(argv[i])
    }
  }
  return { template: positional[0], knobsPath: positional[1], out }
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const { template, knobsPath, out } = parseArgs(process.argv.slice(2))
if (!template || !knobsPath) fail('usage: render.mjs <template> <knobs.json> [--out <file>]')
if ((out === undefined || out === null) && process.argv.includes('--out')) {
  fail('render: --out needs a file path')
}

let knobs
try {
  knobs = JSON.parse(readFileSync(knobsPath, 'utf8'))
} catch (error) {
  fail(`render: cannot read knobs ${knobsPath}: ${error.message}`)
}

let source
try {
  source = readFileSync(template, 'utf8')
} catch (error) {
  fail(`render: cannot read template ${template}: ${error.message}`)
}

// Every unknown knob name lands here, whether it came from a {{KEY}} or from an
// {{#if KEY}} the knobs file never declared.
const missing = new Set()

// A knob is truthy when it is boolean true or a non-empty string. A knob the file
// does not declare at all is an error, not a quiet false: a typo in an {{#if}} would
// otherwise drop a whole block without a word.
function truthy(key) {
  if (!(key in knobs)) {
    missing.add(key)
    return false
  }
  const value = knobs[key]
  if (value === true) return true
  if (typeof value === 'string') return value.length > 0
  return false
}

// Own-line delimiters take their whole line, so removing a block leaves no blank line.
const OWN_LINE_IF = /^[ \t]*\{\{#if +(\w+)\}\}[ \t]*\r?\n([\s\S]*?)^[ \t]*\{\{\/if\}\}[ \t]*(?:\r?\n|$)/gm
const INLINE_IF = /\{\{#if +(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g

const output = source
  .replace(OWN_LINE_IF, (_match, key, body) => (truthy(key) ? body : ''))
  .replace(INLINE_IF, (_match, key, body) => (truthy(key) ? body : ''))
  .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in knobs ? String(knobs[key]) : match))

for (const match of output.matchAll(/\{\{([^{}]*)\}\}/g)) missing.add(match[1].trim())
const names = [...missing].sort()
if (names.length > 0) fail(`render: missing knobs: ${names.join(', ')}`)

if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, output)
} else {
  process.stdout.write(output)
}

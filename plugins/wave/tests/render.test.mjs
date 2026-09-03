import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const RENDER = join(PLUGIN_ROOT, 'scripts', 'render.mjs')

// Renders a literal template string with a literal knob set in a throwaway directory.
// The caller inspects files under dir, so the caller also removes it.
function renderText(templateBody, knobs, extraArgs = []) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wave-render-')))
  const templatePath = join(dir, 'template.hbs')
  const knobsPath = join(dir, 'knobs.json')
  writeFileSync(templatePath, templateBody)
  writeFileSync(knobsPath, JSON.stringify(knobs))
  const result = spawnSync('node', [RENDER, templatePath, knobsPath, ...extraArgs], {
    encoding: 'utf8',
    cwd: dir,
  })
  return { ...result, dir }
}

test('substitutes every {{KEY}} with its knob value', () => {
  const r = renderText('WAVE_WT_ROOT={{WT_ROOT}}\nWAVE_BRANCH_PREFIX={{BRANCH_PREFIX}}\n', {
    WT_ROOT: '../demo-wt',
    BRANCH_PREFIX: 'codex',
  })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'WAVE_WT_ROOT=../demo-wt\nWAVE_BRANCH_PREFIX=codex\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('substitutes the same knob more than once', () => {
  const r = renderText('{{NAME}} and {{NAME}} again\n', { NAME: 'wave' })
  assert.equal(r.stdout, 'wave and wave again\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('keeps an {{#if}} block when the knob is true', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { REGISTRY: true })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\nregistry line\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('keeps an {{#if}} block when the knob is a non-empty string', () => {
  const r = renderText('one\n{{#if HOUSE_CONVENTIONS}}\n{{HOUSE_CONVENTIONS}}\n{{/if}}\ntwo\n', {
    HOUSE_CONVENTIONS: 'never bypass the router',
  })
  assert.equal(r.stdout, 'one\nnever bypass the router\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('removes an {{#if}} block when the knob is false, leaving no blank line', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { REGISTRY: false })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('removes an {{#if}} block when the knob is an empty string, leaving no blank line', () => {
  const r = renderText('one\n{{#if HOUSE_CONVENTIONS}}\n{{HOUSE_CONVENTIONS}}\n{{/if}}\ntwo\n', {
    HOUSE_CONVENTIONS: '',
  })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, 'one\ntwo\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('handles two blocks in one template independently', () => {
  const body = 'a\n{{#if ONE}}\nfirst\n{{/if}}\nb\n{{#if TWO}}\nsecond\n{{/if}}\nc\n'
  const r = renderText(body, { ONE: true, TWO: false })
  assert.equal(r.stdout, 'a\nfirst\nb\nc\n')
  rmSync(r.dir, { recursive: true, force: true })
})

test('exits 1 when an {{#if}} names a knob the file does not declare', () => {
  const r = renderText('one\n{{#if REGISTRY}}\nregistry line\n{{/if}}\ntwo\n', { OTHER: 'x' })
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: REGISTRY')
  assert.equal(r.stdout, '')
  rmSync(r.dir, { recursive: true, force: true })
})

test('reports a missing {{#if}} knob together with a missing {{KEY}}, sorted', () => {
  const r = renderText('{{ZULU}}\n{{#if ALPHA}}\nx\n{{/if}}\n', {})
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: ALPHA, ZULU')
  rmSync(r.dir, { recursive: true, force: true })
})

test('exits 1 and names every missing knob, sorted and deduped', () => {
  const r = renderText('{{B}} {{A}} {{A}}\n', {})
  assert.equal(r.status, 1)
  assert.equal(r.stderr.trim(), 'render: missing knobs: A, B')
  assert.equal(r.stdout, '')
  rmSync(r.dir, { recursive: true, force: true })
})

test('writes the rendered file with --out and creates its parent directory', () => {
  const r = renderText('WAVE_LOG_DIR={{LOG_DIR}}\n', { LOG_DIR: '.superpowers/dispatch-logs' }, [
    '--out',
    'nested/wave.env',
  ])
  assert.equal(r.status, 0)
  assert.equal(r.stdout, '')
  assert.equal(
    readFileSync(join(r.dir, 'nested', 'wave.env'), 'utf8'),
    'WAVE_LOG_DIR=.superpowers/dispatch-logs\n',
  )
  rmSync(r.dir, { recursive: true, force: true })
})

test('exits 1 and writes nothing to stdout when --out is the last argument', () => {
  const r = renderText('hello\n', {}, ['--out'])
  try {
    assert.equal(r.status, 1)
    assert.match(r.stderr, /--out needs a file path/)
    assert.equal(r.stdout, '')
  } finally {
    rmSync(r.dir, { recursive: true, force: true })
  }
})

test('writes nothing with --out when a knob is missing', () => {
  const r = renderText('{{MISSING}}\n', {}, ['--out', 'out.txt'])
  assert.equal(r.status, 1)
  // Assert the renderer's own message: a missing script also exits 1, and this test
  // has to fail before render.mjs exists.
  assert.equal(r.stderr.trim(), 'render: missing knobs: MISSING')
  assert.equal(existsSync(join(r.dir, 'out.txt')), false)
  rmSync(r.dir, { recursive: true, force: true })
})

test('passes a template without placeholders through unchanged', () => {
  const body = '#!/usr/bin/env bash\nset -euo pipefail\n\n# no placeholders here\necho "hello"\n'
  const r = renderText(body, { UNUSED: 'x' })
  assert.equal(r.status, 0)
  assert.equal(r.stdout, body)
  rmSync(r.dir, { recursive: true, force: true })
})

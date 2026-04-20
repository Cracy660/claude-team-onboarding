import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'protect-files.mjs')

function run(toolInput) {
  const input = JSON.stringify({ tool_input: toolInput })
  return spawnSync('node', [HOOK], { input, encoding: 'utf8' })
}

test('blocks .env file', () => {
  const r = run({ file_path: '/home/jan/project/.env' })
  assert.equal(r.status, 2)
  assert.match(r.stdout, /BLOCKED: Protected file/)
})

test('blocks .env.local file', () => {
  const r = run({ file_path: '/home/jan/project/.env.local' })
  assert.equal(r.status, 2)
})

test('blocks package-lock.json', () => {
  const r = run({ file_path: '/home/jan/project/package-lock.json' })
  assert.equal(r.status, 2)
})

test('blocks yarn.lock', () => {
  const r = run({ file_path: '/home/jan/project/yarn.lock' })
  assert.equal(r.status, 2)
})

test('blocks pnpm-lock.yaml', () => {
  const r = run({ file_path: '/home/jan/project/pnpm-lock.yaml' })
  assert.equal(r.status, 2)
})

test('blocks uv.lock', () => {
  const r = run({ file_path: '/home/jan/project/uv.lock' })
  assert.equal(r.status, 2)
})

test('allows src/index.ts', () => {
  const r = run({ file_path: '/home/jan/project/src/index.ts' })
  assert.equal(r.status, 0)
})

test('blocks .env on Windows-style path', () => {
  const r = run({ file_path: 'C:\\Users\\jan\\project\\.env' })
  assert.equal(r.status, 2)
})

test('blocks package-lock.json on Windows-style path', () => {
  const r = run({ file_path: 'C:\\Users\\jan\\project\\package-lock.json' })
  assert.equal(r.status, 2)
})

test('allows src\\index.ts on Windows-style path', () => {
  const r = run({ file_path: 'C:\\Users\\jan\\project\\src\\index.ts' })
  assert.equal(r.status, 0)
})

test('allows .env.example (example files are fine)', () => {
  const r = run({ file_path: '/home/jan/project/.env.example' })
  assert.equal(r.status, 0)
})

test('handles missing file_path gracefully', () => {
  const r = run({})
  assert.equal(r.status, 0)
})

test('handles empty stdin as pass-through', () => {
  const r = spawnSync('node', [HOOK], { input: '', encoding: 'utf8' })
  assert.equal(r.status, 0)
})

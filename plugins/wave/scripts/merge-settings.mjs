#!/usr/bin/env node
// Merges a settings fragment into a Claude settings.json without losing anything.
// Union on permissions.deny and permissions.allow, append-if-absent on hook entries with the same matcher,
// every other key untouched. Backs the target up, writes atomically.
// Usage: node scripts/merge-settings.mjs <settings.json> <fragment.json>
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return fail(`merge-settings: cannot parse ${label} ${path}: ${error.message}`)
  }
}

function timestamp(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

function commandsOf(entry) {
  const hooks = Array.isArray(entry && entry.hooks) ? entry.hooks : []
  return hooks.map((h) => h && h.command).filter((c) => typeof c === 'string')
}

const [targetPath, fragmentPath] = process.argv.slice(2)
if (!targetPath || !fragmentPath) fail('usage: merge-settings.mjs <settings.json> <fragment.json>')

const fragment = readJson(fragmentPath, 'fragment')
const existed = existsSync(targetPath)
const target = existed ? readJson(targetPath, 'settings') : {}
const changes = []

// permissions: union, existing order kept, new entries appended.
const fragmentPermissions = fragment.permissions || {}
for (const bucket of ['deny', 'allow']) {
  const additions = Array.isArray(fragmentPermissions[bucket]) ? fragmentPermissions[bucket] : []
  if (additions.length === 0) continue
  const current =
    target.permissions && Array.isArray(target.permissions[bucket]) ? target.permissions[bucket] : []
  const merged = [...current]
  for (const entry of additions) {
    if (merged.includes(entry)) continue
    merged.push(entry)
    changes.push(`${bucket} + ${entry}`)
  }
  // Touch the target only when something was actually added.
  if (merged.length !== current.length) {
    target.permissions = target.permissions || {}
    target.permissions[bucket] = merged
  }
}

// hooks: append an entry unless an entry with the same matcher already carries every command it has.
const fragmentHooks = fragment.hooks || {}
for (const [event, entries] of Object.entries(fragmentHooks)) {
  const incoming = Array.isArray(entries) ? entries : []
  if (incoming.length === 0) continue
  const current = target.hooks && Array.isArray(target.hooks[event]) ? target.hooks[event] : []
  const appended = []
  for (const entry of incoming) {
    const wanted = commandsOf(entry)
    const wantedMatcher = String(entry.matcher ?? '')
    const covered =
      wanted.length > 0 &&
      [...current, ...appended].some((existing) => {
        const have = commandsOf(existing)
        return String(existing.matcher ?? '') === wantedMatcher && wanted.every((command) => have.includes(command))
      })
    if (!covered) appended.push(entry)
  }
  if (appended.length > 0) {
    target.hooks = target.hooks || {}
    target.hooks[event] = [...current, ...appended]
    changes.push(`hooks.${event} + ${appended.length} ${appended.length === 1 ? 'entry' : 'entries'}`)
  }
}

// Nothing to change means nothing to write and nothing to back up: a repeated
// /wave:init must not leave a pile of identical .bak files behind.
let backupPath = null
if (existed && changes.length > 0) {
  backupPath = `${targetPath}.pre-wave-${timestamp()}.bak`
  copyFileSync(targetPath, backupPath)
}

if (changes.length > 0) {
  const tmpPath = `${targetPath}.tmp`
  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(tmpPath, `${JSON.stringify(target, null, 2)}\n`)
  renameSync(tmpPath, targetPath)
}

if (backupPath) process.stdout.write(`backup: ${backupPath}\n`)
if (changes.length === 0) process.stdout.write('no changes\n')
else for (const line of changes) process.stdout.write(`${line}\n`)

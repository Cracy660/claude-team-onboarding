import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROOT } from './helpers.mjs'

const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')
const GEN_SPEC = join(REGISTRY_TPL, 'tools', 'gen-spec-exec.py')

function sqlite(db, sql) {
  return spawnSync('sqlite3', [db], { input: sql, encoding: 'utf8' })
}

function query(db, sql) {
  const r = sqlite(db, sql)
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function makeRegistry(seed) {
  const dir = mkdtempSync(join(tmpdir(), 'wave-registry-'))
  const db = join(dir, 'registry.db')
  const init = sqlite(db, readFileSync(SCHEMA, 'utf8'))
  assert.equal(init.status, 0, init.stderr)
  if (seed) {
    const r = sqlite(db, seed)
    assert.equal(r.status, 0, r.stderr)
  }
  return { dir, db, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

const PROJECTION_SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Approved statement text.','parity-confirmed','approved','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Proposed statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-03','beta','Rejected statement text.','ruling','rejected',NULL,NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-01','code','lib/alpha.ts#run');
INSERT INTO spec_ref VALUES ('SP-alpha-01','finding','F-alpha-07');
`

test('projection carries approved statements only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    const r = spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 1 statements/)
    const proj = join(reg.dir, 'spec-exec.db')
    assert.equal(query(proj, 'SELECT count(*) FROM spec;'), '1')
    assert.equal(query(proj, 'SELECT id FROM spec;'), 'SP-alpha-01')
    assert.equal(query(proj, 'SELECT statement_count FROM meta;'), '1')
  } finally {
    reg.cleanup()
  }
})

test('projection code_locus holds the code refs only', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const locus = query(join(reg.dir, 'spec-exec.db'), 'SELECT code_locus FROM spec;')
    assert.equal(locus, 'lib/alpha.ts#run')
    assert.doesNotMatch(locus, /F-alpha-07/)
  } finally {
    reg.cleanup()
  }
})

test('projection carries no ban_entry table', () => {
  const reg = makeRegistry(PROJECTION_SEED)
  try {
    spawnSync('python3', [GEN_SPEC, '--registry-dir', reg.dir], { encoding: 'utf8' })
    const tables = query(
      join(reg.dir, 'spec-exec.db'),
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    assert.equal(tables, 'meta\nspec')
    assert.equal(
      query(reg.db, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='ban_entry';"),
      '1'
    )
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a basis outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO spec_statement VALUES ('SP-alpha-09','alpha','x','invented','proposed',NULL,NULL);"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /CHECK constraint failed/)
  } finally {
    reg.cleanup()
  }
})

test('schema refuses a finding status outside the allowed set', () => {
  const reg = makeRegistry()
  try {
    const r = sqlite(
      reg.db,
      "INSERT INTO finding VALUES ('F-01','defect','t','c','major','bogus','d','i','lib/x.ts');"
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /illegal finding\.status value/)
  } finally {
    reg.cleanup()
  }
})

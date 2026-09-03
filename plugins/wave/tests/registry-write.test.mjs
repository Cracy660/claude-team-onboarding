import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ROOT, makeTempRepo, runScript } from './helpers.mjs'

const SCRIPT = join(
  PLUGIN_ROOT,
  'templates', 'project', 'skills', 'registry', 'scripts', 'registry-write.sh'
)
const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')

const SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Original statement text.','ruling','proposed','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Second statement text.','ruling','approved','W1',NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-01','code','lib/alpha.ts#run');
INSERT INTO finding VALUES ('F-01','defect','Broken guard','logic','major','confirmed','d','i','lib/alpha.ts');
`

function makeRegistryRepo() {
  const repo = makeTempRepo({ waveEnv: { REGISTRY_DIR: 'docs/registry' } })
  const dir = join(repo.root, 'docs', 'registry')
  mkdirSync(dir, { recursive: true })
  cpSync(join(REGISTRY_TPL, 'tools'), join(dir, 'tools'), { recursive: true })
  const db = join(dir, 'registry.db')
  const init = spawnSync('sqlite3', [db], { input: readFileSync(SCHEMA, 'utf8'), encoding: 'utf8' })
  assert.equal(init.status, 0, init.stderr)
  const seed = spawnSync('sqlite3', [db], { input: SEED, encoding: 'utf8' })
  assert.equal(seed.status, 0, seed.stderr)
  return { ...repo, dir, db }
}

function query(db, sql) {
  const r = spawnSync('sqlite3', [db], { input: sql, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function write(repo, args) {
  return runScript(SCRIPT, args, { cwd: repo.root })
}

test('prints the full match list before writing', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /== matched rows \(spec_statement WHERE id='SP-alpha-01'\) ==/)
    assert.match(r.stdout, /SP-alpha-01\|alpha\|Original statement text\./)
    assert.match(r.stdout, /== 1 row\(s\) matched ==/)
    assert.match(r.stdout, /== done: update spec_statement, 1 row\(s\) ==/)
  } finally {
    repo.cleanup()
  }
})

test('aborts when the where clause matches no rows', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-ghost-99'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 1)
    assert.match(r.stdout, /== 0 row\(s\) matched ==/)
    assert.match(r.stderr, /no rows matched/)
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    repo.cleanup()
  }
})

test('refuses a write without --where', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, ['spec_statement', '--set', "status='approved'", '--note', 'blanket'])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /--where is required/)
    assert.equal(
      query(repo.db, "SELECT count(*) FROM spec_statement WHERE status='approved';"),
      '1'
    )
  } finally {
    repo.cleanup()
  }
})

test('refuses a spec_statement write without --note', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
    ])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /--note is required/)
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    repo.cleanup()
  }
})

test('refuses a --set that renames the key column', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "id='SP-alpha-09'",
      '--where', "id='SP-alpha-01'",
      '--note', 'n',
    ])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /renaming the key column/)
    assert.equal(
      query(repo.db, "SELECT id FROM spec_statement WHERE id='SP-alpha-01';"),
      'SP-alpha-01'
    )
  } finally {
    repo.cleanup()
  }
})

test('a statement update writes one history row carrying the old text', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "text='Amended statement text.', status='amended'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: reworded',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '1')
    assert.equal(
      query(
        repo.db,
        'SELECT statement_id, status, note, old_text FROM statement_history;'
      ),
      'SP-alpha-01|amended|review: reworded|Original statement text.'
    )
    assert.equal(
      query(repo.db, "SELECT text FROM spec_statement WHERE id='SP-alpha-01';"),
      'Amended statement text.'
    )
    assert.match(query(repo.db, 'SELECT date FROM statement_history;'), /^\d{4}-\d{2}-\d{2}$/)
  } finally {
    repo.cleanup()
  }
})

test('a note carrying an apostrophe is stored verbatim', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', "review: owner's call, don't reopen",
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(
      query(repo.db, 'SELECT note FROM statement_history;'),
      "review: owner's call, don't reopen"
    )
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'approved'
    )
  } finally {
    repo.cleanup()
  }
})

test('a failing update writes no history row', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'spec_statement',
      '--set', "status='bogus'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: illegal status',
    ])
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /CHECK constraint failed/)
    assert.equal(query(repo.db, 'SELECT count(*) FROM statement_history;'), '0')
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
  } finally {
    repo.cleanup()
  }
})

test('a rejected history row rolls the statement update back', () => {
  const repo = makeRegistryRepo()
  try {
    query(
      repo.db,
      "CREATE TRIGGER history_veto BEFORE INSERT ON statement_history BEGIN SELECT RAISE(ABORT, 'history rejected'); END;"
    )
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: approved',
    ])
    assert.notEqual(r.status, 0)
    assert.equal(
      query(repo.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-01';"),
      'proposed'
    )
  } finally {
    repo.cleanup()
  }
})

test('a two-row update writes a history row for each matched statement', () => {
  const repo = makeRegistryRepo()
  try {
    query(
      repo.db,
      "INSERT INTO spec_statement VALUES ('SP-alpha-03','alpha','Third statement text.','ruling','proposed','W1',NULL);"
    )
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "status='proposed'",
      '--note', 'review: wave close',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /== 2 row\(s\) matched ==/)
    assert.equal(
      query(
        repo.db,
        'SELECT statement_id, status, old_text FROM statement_history ORDER BY statement_id;'
      ),
      [
        'SP-alpha-01|approved|Original statement text.',
        'SP-alpha-03|approved|Third statement text.',
      ].join('\n')
    )
  } finally {
    repo.cleanup()
  }
})

test('a finding update writes a status_history row', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, [
      'finding',
      '--set', "status='fixed'",
      '--where', "id='F-01'",
      '--note', 'fixed in task 3',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(
      query(repo.db, 'SELECT finding_id, status, note FROM status_history;'),
      'F-01|fixed|fixed in task 3'
    )
    assert.equal(query(repo.db, "SELECT status FROM finding WHERE id='F-01';"), 'fixed')
  } finally {
    repo.cleanup()
  }
})

test('--delete removes the matched rows and reports the count', () => {
  const repo = makeRegistryRepo()
  try {
    const r = write(repo, ['spec_statement', '--delete', '--where', "id='SP-alpha-02'"])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /== 1 row\(s\) matched ==/)
    assert.match(r.stdout, /== done: delete spec_statement, 1 row\(s\) ==/)
    assert.equal(
      query(repo.db, "SELECT count(*) FROM spec_statement WHERE id='SP-alpha-02';"),
      '0'
    )
  } finally {
    repo.cleanup()
  }
})

test('a spec_statement write regenerates the projection', () => {
  const repo = makeRegistryRepo()
  try {
    const proj = join(repo.dir, 'spec-exec.db')
    assert.equal(existsSync(proj), false)
    const r = write(repo, [
      'spec_statement',
      '--set', "status='approved'",
      '--where', "id='SP-alpha-01'",
      '--note', 'review: approved',
    ])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 2 statements/)
    assert.equal(existsSync(proj), true)
    assert.equal(
      query(proj, 'SELECT id, code_locus FROM spec ORDER BY id;'),
      ['SP-alpha-01|lib/alpha.ts#run', 'SP-alpha-02|'].join('\n')
    )
  } finally {
    repo.cleanup()
  }
})

test('a spec_statement delete regenerates the projection', () => {
  const repo = makeRegistryRepo()
  try {
    const proj = join(repo.dir, 'spec-exec.db')
    const r = write(repo, ['spec_statement', '--delete', '--where', "id='SP-alpha-02'"])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /spec-exec\.db regenerated: 0 statements/)
    assert.equal(query(proj, 'SELECT count(*) FROM spec;'), '0')
  } finally {
    repo.cleanup()
  }
})

test('refuses to run in a project with no registry configured', () => {
  const repo = makeTempRepo({ waveEnv: { REGISTRY_DIR: '' } })
  try {
    const r = runScript(
      SCRIPT,
      ['spec_statement', '--set', "status='approved'", '--where', "id='x'", '--note', 'n'],
      { cwd: repo.root }
    )
    assert.equal(r.status, 1)
    assert.match(r.stderr, /WAVE_REGISTRY_DIR is empty/)
  } finally {
    repo.cleanup()
  }
})

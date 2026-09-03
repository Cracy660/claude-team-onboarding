import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { PLUGIN_ROOT } from './helpers.mjs'

const REGISTRY_TPL = join(PLUGIN_ROOT, 'templates', 'project', 'registry')
const SCHEMA = join(REGISTRY_TPL, 'schema.sql')
const GEN_SPEC = join(REGISTRY_TPL, 'tools', 'gen-spec-exec.py')
const GEN_PANEL = join(REGISTRY_TPL, 'tools', 'gen-review-panel.py')
const INGEST = join(REGISTRY_TPL, 'tools', 'ingest-review.py')

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

// --- Task 8: review panel and ingest ------------------------------------

const PANEL_SEED = `
INSERT INTO spec_statement VALUES ('SP-alpha-01','alpha','Approved statement text.','parity-confirmed','approved','W1',NULL);
INSERT INTO spec_statement VALUES ('SP-alpha-02','alpha','Proposed statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-03','beta','Rejected statement text.','ruling','rejected',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-beta-04','beta','Flagged statement text.','ruling','flagged',NULL,NULL);
INSERT INTO spec_ref VALUES ('SP-alpha-02','code','lib/alpha.ts#run');
`

function panel(dir, args) {
  const out = join(dir, 'panel.html')
  const r = spawnSync('python3', [GEN_PANEL, '--registry-dir', dir, '--out', out, ...args], {
    encoding: 'utf8',
  })
  assert.equal(r.status, 0, r.stderr)
  return readFileSync(out, 'utf8')
}

test('panel with --pending-only carries the pending statements and no others', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const html = panel(reg.dir, ['--pending-only'])
    assert.match(html, /SP-alpha-02/)
    assert.match(html, /SP-beta-04/)
    assert.doesNotMatch(html, /SP-alpha-01/)
    assert.doesNotMatch(html, /SP-beta-03/)
  } finally {
    reg.cleanup()
  }
})

test('panel without the flag carries every statement', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const html = panel(reg.dir, [])
    for (const id of ['SP-alpha-01', 'SP-alpha-02', 'SP-beta-03', 'SP-beta-04']) {
      assert.match(html, new RegExp(id))
    }
    assert.match(html, /<a[^>]*download|\.download\s*=/)
    assert.match(html, /localStorage/)
    assert.match(html, /navigator\.clipboard/)
  } finally {
    reg.cleanup()
  }
})

const EXPORT = {
  generated: '2026-09-02',
  verdicts: {
    'SP-alpha-02': { verdict: 'keep' },
    'SP-beta-04': {
      verdict: 'change',
      text: 'Replacement statement text.',
      note: 'owner reworded at review',
    },
    'SP-beta-03': { verdict: 'remove' },
  },
}

test('an export round-trips through ingest-review.py', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(file, JSON.stringify(EXPORT, null, 2))
    const r = spawnSync(
      'python3',
      [INGEST, file, '--registry-dir', reg.dir, '--date', '2026-09-02'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /keep: 1 {2}change: 1 {2}remove: 1/)

    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-02';"),
      'approved'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-04';"),
      'amended'
    )
    assert.equal(
      query(reg.db, "SELECT text FROM spec_statement WHERE id='SP-beta-04';"),
      'Replacement statement text.'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-03';"),
      'rejected'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '3')
    assert.equal(
      query(
        reg.db,
        'SELECT statement_id, date, status, old_text FROM statement_history ORDER BY statement_id;'
      ),
      [
        'SP-alpha-02|2026-09-02|approved|Proposed statement text.',
        'SP-beta-03|2026-09-02|rejected|Rejected statement text.',
        'SP-beta-04|2026-09-02|amended|Flagged statement text.',
      ].join('\n')
    )
  } finally {
    reg.cleanup()
  }
})

test('a verdict rejected mid-export rolls back the verdicts before it', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-alpha-02': { verdict: 'keep' },
          'SP-beta-03': { verdict: 'change', text: '' },
          'SP-beta-04': { verdict: 'change', text: '   ' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(
      r.stderr,
      /verdict change without replacement text: SP-beta-03, SP-beta-04/
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-alpha-02';"),
      'proposed'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-04';"),
      'flagged'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-beta-03';"),
      'rejected'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

test('an export naming an unknown id is refused before any write', () => {
  const reg = makeRegistry(PANEL_SEED)
  try {
    const before = query(reg.db, 'SELECT id, status, text FROM spec_statement ORDER BY id;')
    const beforeCount = query(reg.db, 'SELECT count(*) FROM spec_statement;')
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-alpha-02': { verdict: 'keep' },
          'SP-ghost-99': { verdict: 'remove' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /unknown statement id\(s\): SP-ghost-99/)
    assert.equal(query(reg.db, 'SELECT count(*) FROM spec_statement;'), beforeCount)
    assert.equal(query(reg.db, 'SELECT id, status, text FROM spec_statement ORDER BY id;'), before)
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

const PANEL_RUN_SEED = `
INSERT INTO spec_statement VALUES ('SP-zeta-01','zeta','Zeta statement text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-zeta-02','zeta','Second zeta text.','ruling','flagged',NULL,NULL);
`

// Runs the panel's embedded script under a minimal DOM so the page's own rendering
// and the page's own export are what the assertions see, rather than the file text.
function runPanel(html) {
  const escHtml = (t) =>
    String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const anchors = []
  const mk = (tag) => {
    const el = {
      tagName: tag,
      className: '',
      innerHTML: '',
      style: {},
      href: '',
      download: '',
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild() {},
      remove() {},
      click() {},
    }
    let text = ''
    Object.defineProperty(el, 'textContent', {
      get: () => text,
      set: (v) => {
        text = v
        el.innerHTML = escHtml(v)
      },
    })
    if (tag === 'a') anchors.push(el)
    return el
  }
  const byId = { app: mk('div'), progress: mk('span'), onlyopen: mk('button'), hint: mk('span') }
  const store = new Map()
  const ctx = {
    anchors,
    document: {
      createElement: mk,
      getElementById: (id) => byId[id] || null,
      body: { appendChild() {} },
    },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    Blob: class {
      constructor(parts) {
        this.parts = parts
      }
    },
    URL: { createObjectURL: () => 'blob:probe', revokeObjectURL() {} },
    setTimeout: () => {},
    JSON,
    Object,
  }
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], ctx)
  return { ctx, app: byId.app, hint: byId.hint }
}

test('the panel renders a keep, a change and a remove radio for every statement', () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    const { app } = runPanel(panel(reg.dir, []))
    for (const id of ['SP-zeta-01', 'SP-zeta-02']) {
      for (const v of ['keep', 'change', 'remove']) {
        assert.match(app.innerHTML, new RegExp(`name="v-${id}" value="${v}"`))
      }
    }
  } finally {
    reg.cleanup()
  }
})

test('the panel takes its areas from the registry, not a fixed list', () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    const { app } = runPanel(panel(reg.dir, []))
    assert.match(app.innerHTML, /<h2>zeta /)
    assert.match(app.innerHTML, /SP-zeta-01/)
  } finally {
    reg.cleanup()
  }
})

test("the panel's own export is what ingest-review.py reads", () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    const { ctx } = runPanel(panel(reg.dir, []))
    ctx.setVerdict('SP-zeta-01', 'keep')
    ctx.setVerdict('SP-zeta-02', 'change')
    ctx.setText('SP-zeta-02', 'Replacement zeta text.')
    ctx.setNote('SP-zeta-02', 'owner reworded at review')
    const exported = JSON.parse(ctx.collect())

    assert.deepEqual(Object.keys(exported).sort(), ['generated', 'verdicts'])
    assert.deepEqual(exported.verdicts['SP-zeta-01'], { verdict: 'keep' })
    assert.deepEqual(exported.verdicts['SP-zeta-02'], {
      verdict: 'change',
      text: 'Replacement zeta text.',
      note: 'owner reworded at review',
    })

    const file = join(reg.dir, 'export.json')
    writeFileSync(file, JSON.stringify(exported))
    const r = spawnSync(
      'python3',
      [INGEST, file, '--registry-dir', reg.dir, '--date', '2026-09-02'],
      { encoding: 'utf8' }
    )
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /keep: 1 {2}change: 1 {2}remove: 0/)
    assert.equal(
      query(
        reg.db,
        'SELECT statement_id, status, note, old_text FROM statement_history ORDER BY statement_id;'
      ),
      [
        'SP-zeta-01|approved|panel review: keep|Zeta statement text.',
        'SP-zeta-02|amended|owner reworded at review|Second zeta text.',
      ].join('\n')
    )
  } finally {
    reg.cleanup()
  }
})

test('the export button hands the browser a download', () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    const { ctx } = runPanel(panel(reg.dir, []))
    ctx.setVerdict('SP-zeta-01', 'remove')
    ctx.doExport()
    const a = ctx.anchors.at(-1)
    assert.match(a.download, /^review-\d{4}-\d{2}-\d{2}\.json$/)
    assert.equal(a.href, 'blob:probe')
  } finally {
    reg.cleanup()
  }
})

test('an export carrying a verdict word outside keep, change and remove is refused before any write', () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({ generated: '2026-09-02', verdicts: { 'SP-zeta-01': { verdict: 'skip' } } })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /unknown verdict for: SP-zeta-01/)
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-zeta-01';"),
      'proposed'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

test('the count line reports the real per-verdict totals', () => {
  const reg = makeRegistry(
    PANEL_RUN_SEED +
      "INSERT INTO spec_statement VALUES ('SP-zeta-03','zeta','Third zeta text.','ruling','proposed',NULL,NULL);"
  )
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-zeta-01': { verdict: 'keep' },
          'SP-zeta-03': { verdict: 'keep' },
          'SP-zeta-02': { verdict: 'change', text: 'Replacement zeta text.' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /keep: 2 {2}change: 1 {2}remove: 0/)
  } finally {
    reg.cleanup()
  }
})

test('the panel escapes statement ids in rendered markup and handlers', () => {
  const reg = makeRegistry(
    `INSERT INTO spec_statement VALUES ('SP-"><b>x','zeta','Escaping probe.','ruling','proposed',NULL,NULL);`
  )
  try {
    const { app } = runPanel(panel(reg.dir, []))
    assert.match(app.innerHTML, /SP-&quot;&gt;&lt;b&gt;x/)
    assert.doesNotMatch(app.innerHTML, /"><b>x/)
  } finally {
    reg.cleanup()
  }
})

test('malformed and non-object exports fail without a traceback', () => {
  const reg = makeRegistry(PANEL_RUN_SEED)
  try {
    for (const [contents, reason] of [
      ['{', /ingest-review: invalid export JSON:/],
      ['[]', /ingest-review: export must be a JSON object/],
    ]) {
      const file = join(reg.dir, 'export.json')
      writeFileSync(file, contents)
      const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], {
        encoding: 'utf8',
      })
      assert.equal(r.status, 1)
      assert.match(r.stderr, reason)
      assert.doesNotMatch(r.stderr, /Traceback/)
    }
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

const ABORT_SEED = `
INSERT INTO spec_statement VALUES ('SP-zeta-01','zeta','First zeta text.','ruling','proposed',NULL,NULL);
INSERT INTO spec_statement VALUES ('SP-zeta-99','zeta','Locked zeta text.','ruling','proposed',NULL,NULL);
CREATE TRIGGER probe_block_update BEFORE UPDATE ON spec_statement
WHEN NEW.id = 'SP-zeta-99'
BEGIN SELECT RAISE(ABORT, 'probe: this row cannot be updated'); END;
`

test('a database error mid-export rolls back the verdicts before it', () => {
  const reg = makeRegistry(ABORT_SEED)
  try {
    const file = join(reg.dir, 'export.json')
    writeFileSync(
      file,
      JSON.stringify({
        generated: '2026-09-02',
        verdicts: {
          'SP-zeta-01': { verdict: 'keep' },
          'SP-zeta-99': { verdict: 'remove' },
        },
      })
    )
    const r = spawnSync('python3', [INGEST, file, '--registry-dir', reg.dir], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.doesNotMatch(r.stderr, /Traceback/)
    assert.match(r.stderr, /ingest-review: database error, nothing was written/)
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-zeta-01';"),
      'proposed'
    )
    assert.equal(
      query(reg.db, "SELECT status FROM spec_statement WHERE id='SP-zeta-99';"),
      'proposed'
    )
    assert.equal(query(reg.db, 'SELECT count(*) FROM statement_history;'), '0')
  } finally {
    reg.cleanup()
  }
})

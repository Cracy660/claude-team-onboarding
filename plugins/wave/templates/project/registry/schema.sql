-- Wave statement and finding registry. One database: <WAVE_REGISTRY_DIR>/registry.db.
-- spec_statement rows are the specification; execution agents never read this file,
-- they read the spec-exec.db projection written by tools/gen-spec-exec.py.
-- Writes go through .claude/skills/registry/scripts/registry-write.sh.

CREATE TABLE IF NOT EXISTS spec_statement (
  id TEXT PRIMARY KEY,     -- SP-<area-slug>-<nn>
  area TEXT,               -- one area per statement, pinned when the registry opens
  text TEXT,               -- one atomic, testable, plain-English end-state behavior
  basis TEXT CHECK(basis IN ('parity-confirmed','ruling','mockup') OR basis LIKE 'fix-target:%'),
  status TEXT CHECK(status IN ('proposed','flagged','approved','amended','rejected')),
  stage TEXT,              -- W<n> | parity | none | NULL
  parity_ref TEXT
  -- No rationale column by design: the why lives in finding and decision rows,
  -- joined through spec_ref.
);

CREATE TABLE IF NOT EXISTS spec_ref (
  statement_id TEXT REFERENCES spec_statement(id),
  ref_type TEXT CHECK(ref_type IN ('finding','decision','code','mockup')),
  ref TEXT                 -- finding or decision id, code locus, or mockup ref
);

CREATE TABLE IF NOT EXISTS statement_history (
  statement_id TEXT REFERENCES spec_statement(id),
  date TEXT,
  status TEXT,             -- the status the statement carries after the change
  note TEXT,               -- append-only, one line per change
  old_text TEXT            -- the text the statement carried before the change
);

CREATE TABLE IF NOT EXISTS finding (
  id TEXT PRIMARY KEY,
  kind TEXT,
  title TEXT,
  class TEXT,
  severity TEXT,           -- blocker | major | minor | info
  status TEXT,             -- guarded by the two triggers below
  description TEXT,
  impact TEXT,
  code_locus TEXT
);

CREATE TRIGGER IF NOT EXISTS finding_status_guard_ins BEFORE INSERT ON finding
WHEN NEW.status IS NOT NULL AND NEW.status NOT IN
  ('confirmed','partial','refuted','static-unverified','fixed','wont-fix','superseded')
BEGIN SELECT RAISE(ABORT, 'illegal finding.status value'); END;

CREATE TRIGGER IF NOT EXISTS finding_status_guard_upd BEFORE UPDATE OF status ON finding
WHEN NEW.status IS NOT NULL AND NEW.status NOT IN
  ('confirmed','partial','refuted','static-unverified','fixed','wont-fix','superseded')
BEGIN SELECT RAISE(ABORT, 'illegal finding.status value'); END;

CREATE TABLE IF NOT EXISTS provenance (
  finding_id TEXT REFERENCES finding(id),
  source TEXT,             -- suite | screenshot | spec | db-query | owner | synthesis | ruling
  ref TEXT,
  evidence TEXT
);

CREATE TABLE IF NOT EXISTS decision (
  id TEXT PRIMARY KEY,
  date TEXT,
  decided_by TEXT,
  ruling TEXT,
  consequences TEXT
);

CREATE TABLE IF NOT EXISTS finding_decision (
  finding_id TEXT REFERENCES finding(id),
  decision_id TEXT REFERENCES decision(id)
);

CREATE TABLE IF NOT EXISTS status_history (
  finding_id TEXT REFERENCES finding(id),
  date TEXT,
  status TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS ban_entry (
  id TEXT PRIMARY KEY,        -- BAN-NN
  banned_string TEXT NOT NULL,-- the literal or named pattern that must not appear
  scope TEXT,                 -- where the ban binds
  match_hint TEXT,            -- how a grep gate should search for it
  rationale_ref TEXT,         -- decision, statement or finding ids that ruled the ban
  code_loci TEXT,             -- file:line list where the string is live today
  live INTEGER,               -- 0 or 1
  created TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

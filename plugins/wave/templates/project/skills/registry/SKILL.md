---
name: registry
description: Use when reading or changing spec statements and findings: pulling a statement and its neighbours for a brief, checking what a wave still owns, listing open findings, or flipping rows after a merge. Writes go through the guarded script; raw UPDATE and DELETE are blocked by a hook.
---

# Registry access

One database holds the spec and the findings: `<WAVE_REGISTRY_DIR>/registry.db`,
where the directory is set in `.claude/wave.env` and the contract lives in
`<WAVE_REGISTRY_DIR>/README.md`. Execution agents never read it. They read the
projection `<WAVE_REGISTRY_DIR>/spec-exec.db`: approved statements only, no
rationale, no history.

Tables you touch most: `spec_statement(id, area, text, basis, status, stage,
parity_ref)` with `spec_ref` and `statement_history`; `finding(id, kind, title,
class, severity, status, description, impact, code_locus)` with `provenance`,
`decision` and `status_history`.

## Canonical reads

```bash
source .claude/wave.env
REG="$(git rev-parse --show-toplevel)/$WAVE_REGISTRY_DIR"

# One statement:
sqlite3 -header "$REG/registry.db" \
  "SELECT id, area, stage, status, text FROM spec_statement WHERE id='<ID>';"

# Neighbours, same area (briefs carry these verbatim):
sqlite3 -header "$REG/registry.db" \
  "SELECT id, stage, text FROM spec_statement \
   WHERE area=(SELECT area FROM spec_statement WHERE id='<ID>') ORDER BY id;"

# Stage state across the whole spec:
sqlite3 "$REG/registry.db" \
  "SELECT stage, COUNT(*) FROM spec_statement GROUP BY stage;"

# What a wave still owns (the close invariant is 0):
sqlite3 "$REG/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE stage='W<N>';"

# Open findings, worst first:
sqlite3 -header "$REG/registry.db" \
  "SELECT id, severity, status, title FROM finding \
   WHERE status NOT IN ('fixed','refuted','wont-fix','superseded') \
   ORDER BY CASE severity WHEN 'blocker' THEN 0 WHEN 'major' THEN 1 \
                          WHEN 'minor' THEN 2 ELSE 3 END, id;"

# What an execution agent actually sees:
sqlite3 -header "$REG/spec-exec.db" \
  "SELECT id, area, stage, text, code_locus FROM spec WHERE id='<ID>';"
```

## Writes: guarded script only

Raw `UPDATE` and `DELETE` against the database files is blocked by a PreToolUse
hook. The script prints the full match list before touching anything, aborts on
zero matches, refuses a write without `--where`, appends the history row in the
same transaction as the update, and regenerates `spec-exec.db` after any
`spec_statement` write. `--note` is required for an update to `spec_statement`
or `finding`: it becomes the history row's note.

The hook matches SQL shapes in the command string only. SQL that arrives through a shell
redirect or a `.read` passes it unseen, so treat it as defense in depth against a careless
agent, not as a boundary.

```bash
# Flip statements to parity after the merge is verified:
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --set "basis='parity-confirmed', stage='parity', parity_ref='src/app/page.ts:42'" \
  --where "id IN ('SP-picker-03','SP-picker-04')" \
  --note "W3 merged and verified on the branch"

# Update a finding's status:
.claude/skills/registry/scripts/registry-write.sh finding \
  --set "status='fixed'" --where "id='F-W3-01'" \
  --note "fixed in task 7, controller re-ran the suite"

# Delete (rare, needs an explicit ruling):
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --delete --where "id='SP-picker-99'"
```

`INSERT` of a new statement or finding is not destructive and may run as plain
`sqlite3`. Flips happen ONLY in the main checkout, never on a task branch: a
database file does not merge.

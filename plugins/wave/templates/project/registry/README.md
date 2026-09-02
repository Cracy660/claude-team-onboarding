# Registry (`registry.db`)

One SQLite database holds the normative spec and the findings record for this
repository. Sessions query structured data instead of re-reading markdown chains.
Markdown reports stay the prose source of record; the database is the index and
the live status.

`spec-exec.db` beside it is a generated projection: approved statements only, no
rationale, no history, no bans. Execution agents read the projection; the
registry itself is for the controller, the reviewers and the review panel. Never
edit the projection by hand, `tools/gen-spec-exec.py` regenerates it.

## The rule for every state change

> When a statement or a finding changes state, the history row is appended and
> the row updated in the same transaction. `registry-write.sh` does both and
> refuses the write without `--note`.

History is append-only: never edit a past row, add a new one. Refuted findings
stay in the database, refutations are knowledge.

Finding statuses: `confirmed | partial | refuted | static-unverified | fixed |
wont-fix | superseded`. Severities: `blocker | major | minor | info`.
Statement `basis`: `parity-confirmed | ruling | mockup | fix-target:<finding-id>`.
Statement `status` lifecycle: `proposed` → `approved | amended | rejected`, with
`flagged` for a statement the drafter cannot ground in a finding, a ruling or a
mockup. Flag, never invent.

## Schema

| table | purpose |
|---|---|
| `spec_statement` | one row per atomic, testable, plain-English END-STATE behavior. `id` = `SP-<area-slug>-<nn>`. Cols: `area, text, basis, status, stage, parity_ref`. No rationale column, by design: the "why" lives in `finding` and `decision` rows joined through `spec_ref`. Defective current behavior is ALWAYS written as its fixed end state (`basis: fix-target:<finding-id>`), never as-is. |
| `spec_ref` | many-to-many statement to grounding: `ref_type` (finding \| decision \| code \| mockup), `ref`. |
| `statement_history` | append-only trajectory per statement: `date, status, note, old_text`. |
| `finding` | one row per finding: `kind, title, class, severity, status, description, impact, code_locus`. |
| `provenance` | evidence traces, one row per trace: `source, ref, evidence`. |
| `decision` | owner rulings: `date, decided_by, ruling, consequences`. |
| `finding_decision` | many-to-many finding to decision. |
| `status_history` | append-only finding trajectory: `date, status, note`. |
| `ban_entry` | one row per banned string or named pattern: `banned_string, scope, match_hint, rationale_ref, code_loci, live, created`. |
| `meta` | key and value: schema version, created, source. |

## Contract (binding for all downstream agents)

1. **Plan and code agents receive spec statements verbatim.** The statement
   `text` is the acceptance criterion, cited by `id`.
2. **Reviewers verify against statements, not against code comments or old
   markdown specs.** Once the statements are approved, superseded markdown is
   stamped as such and the registry is the sole normative source.
3. **Execution agents are pointed at `spec-exec.db` only.** The projection
   carries `id, area, text, code_locus, stage` for approved statements and
   nothing else, so an agent cannot look up the rationale and rationalize its way
   around a statement.
4. **State changes append history, then update.** The same rule holds for
   statements and findings, and history is append-only.
5. **Every `statement_history` row carries `old_text`**: the full statement text
   as it stood before that row's change, captured in the same transaction as the
   new text. Write it even when the text does not change, because the row still
   answers "what did the owner approve?". The only legal NULL is a
   statement-creation row, where no prior text exists.
6. **Execution reconciles the registry to the built app.** Pre-build validation
   cannot prove a spec; holes surface while building. Every verified fix flips
   its statements' basis to `parity-confirmed` with fresh code refs in the same
   commit, and where the build shows a statement is wrong or unbuildable as
   worded, the statement is AMENDED then and there, not worked around.
7. **Global exclusivity is a liability; local exhaustiveness is fine.** A
   statement may exhaustively enumerate its OWN surface. Cross-surface
   quantifiers ("exactly one screen in the app…", "every form…") are reserved
   for deliberately ratified uniformity rules; anywhere else they collide with
   future feature work and force a formal undo. Default to plain descriptions of
   each surface and path, and when future work collides with an incidental
   global, amend the statement to scope it down. Statements describe the app,
   they do not freeze it.
8. **Stage and parity columns.** `stage` holds the wave that owns the statement
   (`W<n>`), `parity` (verified true on the branch), or `none` (a process
   statement with no app locus); NULL means not yet triaged. `parity_ref` holds
   the `file:line` evidence for the current parity verdict. Discharging a
   statement flips `basis` to `parity-confirmed`, `stage` to `parity`, sets
   `parity_ref`, and appends a history row noting the prior basis and stage.
   Wave-close invariant: `SELECT COUNT(*) FROM spec_statement WHERE stage='W<N>'`
   returns 0.
9. **Bans are enforcement data for the post-code gate, never input to a code
   agent.** `ban_entry` is verified by grep AFTER a wave is written and is
   EXCLUDED from the projection: an agent that has seen the ban list writes
   around the string instead of writing the right copy. Adding a ban requires a
   `rationale_ref`, `match_hint` says how the gate must search including the
   carve-outs where the string is required copy, and `code_loci` is evidence
   rather than a worklist, so re-grep before acting.

## Canonical queries (copy-paste)

```sh
cd docs/registry     # your WAVE_REGISTRY_DIR

# Statements for one area, delta statements first
sqlite3 -column -header registry.db "SELECT id,basis,status,text FROM spec_statement WHERE area='<area>' ORDER BY basis='parity-confirmed', id;"

# Grounding of one statement
sqlite3 -column -header registry.db "SELECT ref_type,ref FROM spec_ref WHERE statement_id='<ID>';"

# History of one statement, oldest first
sqlite3 -column -header registry.db "SELECT date,status,note,substr(old_text,1,60) FROM statement_history WHERE statement_id='<ID>' ORDER BY rowid;"

# Everything a wave still owns (the close invariant returns no rows)
sqlite3 -column -header registry.db "SELECT id,area,status,text FROM spec_statement WHERE stage='W<N>' ORDER BY id;"

# What the review panel will show
sqlite3 -column -header registry.db "SELECT id,area,status FROM spec_statement WHERE status IN ('proposed','flagged') ORDER BY area,id;"

# Open findings by severity, blocker first
sqlite3 -column -header registry.db "SELECT id,severity,title FROM finding WHERE status IN ('confirmed','partial') ORDER BY CASE severity WHEN 'blocker' THEN 0 WHEN 'major' THEN 1 WHEN 'minor' THEN 2 ELSE 3 END, id;"

# Full provenance of one finding
sqlite3 -column -header registry.db "SELECT source,ref,evidence FROM provenance WHERE finding_id='<ID>';"

# Open (unruled) decisions
sqlite3 -column -header registry.db "SELECT id,consequences FROM decision WHERE ruling IS NULL ORDER BY id;"

# Completeness: confirmed or partial findings no statement covers
sqlite3 -column -header registry.db "SELECT f.id,f.severity,f.title FROM finding f WHERE f.status IN ('confirmed','partial') AND f.id NOT IN (SELECT ref FROM spec_ref WHERE ref_type='finding') ORDER BY f.id;"

# Completeness: ruled decisions no statement discharges
sqlite3 -column -header registry.db "SELECT d.id,substr(d.ruling,1,70) ruling FROM decision d WHERE d.ruling IS NOT NULL AND TRIM(d.ruling)<>'' AND NOT EXISTS (SELECT 1 FROM spec_ref sr WHERE sr.ref_type='decision' AND (sr.ref=d.id OR sr.ref LIKE d.id||':%' OR sr.ref LIKE '%:'||d.id OR sr.ref LIKE '%:'||d.id||':%')) ORDER BY d.id;"

# Every ban still live in the tree, with where to look
sqlite3 -column -header registry.db "SELECT id,banned_string,scope,code_loci FROM ban_entry WHERE live=1 ORDER BY id;"

# What execution agents actually see
sqlite3 -column -header spec-exec.db "SELECT id,area,stage,text,code_locus FROM spec ORDER BY area,id;"
```

## Tools

| script | what it does |
|---|---|
| `tools/gen-spec-exec.py` | regenerates `spec-exec.db`: approved statements only, `code_locus` joined from the `spec_ref` rows of `ref_type='code'`, no bans. Run it after every statement write; `registry-write.sh` calls it for you. |
| `tools/gen-review-panel.py` | builds the local HTML review panel (`review/index.html`) with keep, change or remove per statement and a JSON export. Open the file in a browser. Never publish it as an artifact, artifacts block downloads. |
| `tools/ingest-review.py` | applies an export: keep sets `approved`, change replaces the text and sets `amended`, remove sets `rejected`, and each writes its history row with `old_text`. An export naming an unknown id is refused before any write lands. |

## The review round

The panel is how an owner approves statements. It writes one JSON file, and that
file is the only thing the ingest tool reads:

```json
{
  "generated": "2026-09-02",
  "verdicts": {
    "SP-picker-03": { "verdict": "keep" },
    "SP-picker-04": { "verdict": "change", "text": "the replacement statement", "note": "why" },
    "SP-picker-05": { "verdict": "remove", "note": "why" }
  }
}
```

`generated` is the ISO date the panel was exported. Each key of `verdicts` is a
statement id. `verdict` is `keep`, `change` or `remove`. `text` carries the
replacement and is required for `change`. `note` is optional everywhere and lands
in that statement's history row.

The round, end to end:

```sh
cd docs/registry     # your WAVE_REGISTRY_DIR

# 1. build the panel for everything still pending (proposed or flagged)
python3 tools/gen-review-panel.py --registry-dir . --pending-only

# 2. open review/index.html in a browser, decide every statement, export the JSON.
#    It is a local file on purpose: an artifact cannot hand you a download.

# 3. apply it: keep to approved, change to amended with the new text, remove to rejected
python3 tools/ingest-review.py ~/Downloads/review-export.json --registry-dir .

# 4. refresh what execution agents read
python3 tools/gen-spec-exec.py --registry-dir .

# 5. confirm the round is closed
sqlite3 registry.db "SELECT COUNT(*) FROM spec_statement WHERE status IN ('proposed','flagged');"
```

An export naming an id the registry does not have is refused before any write, so
a stale panel cannot half-apply. Step 5 returning anything but 0 means the panel
was exported before every statement had a verdict.

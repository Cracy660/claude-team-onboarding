# Registry process

How the statement registry is filled, reviewed, projected and flipped, and what each of
its command line tools is for.

The registry is one SQLite database, `$WAVE_REGISTRY_DIR/registry.db`, plus a generated
projection, `$WAVE_REGISTRY_DIR/spec-exec.db`. `registry.db` is the record: statements,
their grounding, their history, findings, decisions and bans. The projection is what
execution agents read. A project configured without a registry runs the same wave loop
with the spec's numbered requirements standing in for statements; every other reference in
this playbook still applies.

Every command below assumes `.claude/wave.env` has been sourced, so `$WAVE_REGISTRY_DIR`
resolves. Paths in it are relative to the repository root.

## The five stages

**S0, schema and contract.** The scaffolder writes `schema.sql`, initializes `registry.db`
from it, and writes the contract into `$WAVE_REGISTRY_DIR/README.md`. Nothing is drafted
until the contract is in place, because the contract decides what a statement is allowed
to say.

**S1, drafting.** Parallel subagents draft `proposed` statements, one agent per area, each
statement atomic, testable and written in plain language as an end state. Defective current
behaviour is written as its fixed end state with `basis` set to `fix-target:<finding-id>`,
never as it stands today. A drafter who cannot ground a statement in a finding, a decision
or a mockup marks it `flagged` and moves on. Flag, never invent.

**S2, consistency gate.** A fresh-context agent reads the drafted statements only and
reports contradictions, duplicates and statements that cannot be tested. It does not read
the drafters' notes, because the point is to see what a reader sees.

**S3, owner review.** Generate the local review panel, hand the owner the file path, and
ingest the export mechanically. The panel is a local HTML file opened from disk, never a
hosted page, because a hosted page cannot hand back a downloaded file.

**S4, projection and staging.** Regenerate the projection, then assign `stage` to the
statements this wave will build. The wave is ready when no statement in it is still
`proposed` or `flagged`.

## Writing a statement

- One behaviour per statement, phrased as the end state a reader could test.
- Plain description. No global exclusivity ("the only place that ..."), unless a ratified
  uniformity rule says so, and no alarming vocabulary.
- Quote product copy byte-exactly inside the statement; write everything else in the
  team's working language.
- `basis` is one of `parity-confirmed`, `ruling`, `mockup`, or `fix-target:<finding-id>`.
- `status` moves `proposed` to `approved`, `amended` or `rejected`. Drafters may use
  `flagged`.
- `stage` is `W<n>` while a wave owns the statement, `parity` once it is built and
  confirmed, `none` when it will never be built.
- Grounding goes in `spec_ref` rows: `finding`, `decision`, `code` or `mockup`. The `code`
  references become the projection's `code_locus`.

## The tools

All three are Python 3 with the standard library only. `--registry-dir` defaults to the
parent of the tools directory, so it can be omitted when they are run in place.

Regenerate the projection. Run it after any statement write; the guarded write script runs
it for you:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/gen-spec-exec.py" --registry-dir "$WAVE_REGISTRY_DIR"
# spec-exec.db regenerated: 212 statements
```

The projection holds approved statements only, as `spec(id, area, text, code_locus,
stage)` plus a `meta` row recording when it was generated and from what. It carries no
rationale, no history and no ban table.

Build the owner review panel:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/gen-review-panel.py" --registry-dir "$WAVE_REGISTRY_DIR" \
  --pending-only --out "$WAVE_REGISTRY_DIR/review/index.html"
```

`--pending-only` selects statements whose status is `proposed` or `flagged`. Areas come
from the data, so the panel needs no configuration. Each statement offers keep, change
with a text box, or remove; state lives in the browser's local storage so the owner can
stop and resume; the export is one JSON file offered as a download and as copy to
clipboard. Open the file from disk and give the owner the path.

Ingest the owner's export:

```bash
python3 "$WAVE_REGISTRY_DIR/tools/ingest-review.py" ~/Downloads/review-export.json \
  --registry-dir "$WAVE_REGISTRY_DIR" --date 2026-01-31
# keep: 180  change: 24  remove: 8
```

`keep` sets `approved`; `change` replaces the text and sets `amended`; `remove` sets
`rejected`. Every verdict writes a `statement_history` row carrying the previous text. An
export naming an unknown id exits 1 before any write, so a partly applied review is not
possible.

## Writing to the registry

Every write goes through the guarded script. It prints the full match list before it acts,
refuses a write with no `--where`, and aborts when the where clause matches zero rows:

```bash
.claude/skills/registry/scripts/registry-write.sh spec_statement \
  --set "status='approved', basis='parity-confirmed', stage='parity', parity_ref='<sha>'" \
  --where "id='SP-search-12'" \
  --note "built and verified in the application at <sha>"

.claude/skills/registry/scripts/registry-write.sh finding \
  --delete --where "id='F-12'"
```

`--note` is required for the `spec_statement` and `finding` tables, and the script writes
the history row in the same transaction as the update: `statement_history` with the text
as it stood before the change, or `status_history` for a finding. This is why the rule
"history first, then status" cannot be forgotten. After any `spec_statement` write the
script regenerates the projection.

A hook blocks a raw `UPDATE`, `DELETE`, `DROP` or `ALTER` aimed at the registry from any
other path. That is deliberate: the guarded script is the only write path.

## Flipping after a merge

Flips happen in the main checkout, after the task branch is merged, never on the task
branch, because a binary database does not merge. For each statement the tranche built:
set `basis` to `parity-confirmed`, `stage` to `parity`, `parity_ref` to the merge commit,
and add the fresh `code` references in the same commit. Where the build proved a statement
wrong or unbuildable as worded, amend the text then and there and say so in the note.

## Bans

A ban is a string the product must never contain, recorded in `ban_entry` with the ruling
that created it, how to search for it, and where it was last seen. Two rules:

1. A ban is never shown to a code-generating agent, and never appears in the projection.
   An agent that has seen the string writes around it instead of writing the right text.
2. A ban is verified by grep after the wave's code is written, as part of the seal, and
   each hit is judged against the ban's own match hint, which records the contexts where
   the string is required copy.

## Reading

```bash
sqlite3 -column -header "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT id, area, status, stage FROM spec_statement WHERE stage='W3' ORDER BY id;"

sqlite3 -column -header "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE status IN ('proposed','flagged');"

sqlite3 -column -header "$WAVE_REGISTRY_DIR/spec-exec.db" \
  "SELECT id, text, code_locus FROM spec WHERE area='search' ORDER BY id;"
```

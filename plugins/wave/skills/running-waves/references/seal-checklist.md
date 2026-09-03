# Seal checklist

The list that closes a wave. Every line is run and its result recorded before the branch
is called sealed.

A seal is not a feeling that the work is done. It is this list, in this order, with
evidence for each line. Nothing here is skipped because an earlier tranche already passed
it: the seal tests the branch as a whole, which no tranche did.

## 1. Whole-branch review

Delegate a review of the entire branch diff against the merge base, not a re-read of the
per-task reviews. Give the reviewer the statements the wave owned and the ledger's Minor
findings. Its verdict is a wave-level spec verdict plus findings.

## 2. Full unit suite and build

Run the project's full test command and its build command in the integration worktree,
from a clean tree. Paste the counts. A suite that skipped tests silently has not run:
check the skip count against the previous seal.

## 3. End-to-end suite with external keys masked

Run the end-to-end suite with every external key set to the empty string, so anything that
would bill a provider skips instead. `WAVE_EXTERNAL_KEYS` holds the space-separated list of
environment variable names the scaffolder recorded for this project:

```bash
source .claude/wave.env
env $(for k in $WAVE_EXTERNAL_KEYS; do printf '%s= ' "$k"; done) <the project e2e command>
```

Masking one key is not enough. A single unguarded specification billing a provider is the
failure this line exists to prevent, so mask the whole list. An empty `WAVE_EXTERNAL_KEYS`
means the project has no paid external calls; say so in the wave report rather than
skipping the line.

## 4. Live subset, at zero retries

Run live only the specifications covering surfaces this wave actually touched, with the
runner's retry count set to zero. Why zero: a deterministic failure must not be billed a
second and third time. A full live sweep happens only on the owner's explicit call.

## 5. Ban grep

Grep the production source for every live ban, judging each hit against that ban's match
hint, and record the ruling reference next to the result. Zero unexplained hits.

## 6. Stage invariant

No statement may still be staged to this wave:

```bash
source .claude/wave.env
# The stage list is the evidence: the wave being sealed must not appear in it.
sqlite3 "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT stage, COUNT(*) FROM spec_statement GROUP BY stage;"
# Then the count, with the wave's own id in place of W<N>:
sqlite3 "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT COUNT(*) FROM spec_statement WHERE stage='W<N>';"
# expected: 0
```

A non-zero count means a statement was planned and never built, or was built and never
flipped. Both are seal blockers. Resolve by flipping, by amending, or by moving the
statement to the next wave, and say which in the wave report.

## 7. History completeness

Every statement the wave touched has a `statement_history` row for each status change,
each carrying the text as it stood before the change:

```bash
source .claude/wave.env
sqlite3 "$WAVE_REGISTRY_DIR/registry.db" \
  "SELECT statement_id, date, status FROM statement_history
   WHERE date >= '<wave start date>' ORDER BY statement_id, date;"
```

## 8. Wave report

Write the report into the wave workspace: what shipped, statement ids with their final
status, findings opened and closed, rulings made during execution, what was deferred and
where it is recorded, and the evidence lines from this checklist with their counts.

## 9. Owner walkthrough

Walk the owner through the built behaviour, not the diff. Divergences from a statement are
raised here, and either amend the statement or open a follow-up.

## 10. Push on the owner's call

The branch is pushed when the owner says so. A backup push to a work-in-progress branch is
standing-authorized and does not need asking; a push to the shared branch does.

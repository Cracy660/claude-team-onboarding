# Ledger template

The shape of `progress.md`, the wave's working record and the map you recover from when
the controller's context is gone.

The ledger is written before the first dispatch and appended to after every step. It is
not a diary: it holds the facts a fresh controller would need to take over, and nothing
else. Reports, diffs and review text go to their own files in the workspace, never here.

## Header

```markdown
# Wave ledger, plan: <path to the plan>

Branch: <integration branch> off <sha> (= <what that base contains>).
Integration worktree: <absolute path>.
The primary checkout stays on <branch> and is never switched.
Roles: the implementer works through the dispatch skill; a reviewer agent reviews every
task; the gate agent gates <task ids>; the controller plans, merges, runs the legs the
sandbox blocks, and seals.
Spec: <path>. Facts pack: <path>.
Batching: T1+T2 · T3 · T4 (gate) · ...
Reports: the implementer writes `<workspace>/task-<n>-report.md` inside its own worktree;
the controller copies it here after the run. The final message lands in
`<log dir>/<task-id>.last.md`.
Commits: the controller commits from the task worktree, with the plan's message and the
session trailer. Stage by explicit path only.
```

## Conflict scan

Run before the first dispatch, over every interface the plan declares. One row per pair of
tasks that touch the same name or the same file:

```markdown
## Pre-flight conflict scan (<date>, before Task 1)

| Pair | Produces versus consumes | Finding |
|---|---|---|
| T1 and T4 | `<exported name and signature>` produced by T1, consumed by T4 | consistent |
| T3 and T8 | both edit `<file>` | overlapping anchors, see R2 |
| T5 | needs a database migration the sandbox cannot run | see R3 |
```

Then a paragraph of per-task self-consistency: for each task, whether its stated interface
matches its own test descriptions, and which facts you verified by reading the code, with
file and line. This paragraph is where plan defects surface, and it is cheaper here than
in a worktree.

## Rulings

Every decision the controller makes that the plan did not already make. Numbered, so a
brief can cite one:

```markdown
## Rulings

- **R1 (<subject>):** <the decision, in one or two sentences.> Why: <the reason.> Cost if
  wrong: <what it costs to reverse.>
- **R2 (<subject>):** ...
```

The cost line is what keeps the ledger honest. A ruling whose cost if wrong is "a day of
schedule" gets more thought than one costing "a type alias", and writing the cost forces
that judgement at the time rather than afterwards.

## Progress

Append-only. One entry per event, each starting with the date and the task:

```markdown
## Progress

<date>: EXECUTION STARTED. Controller chores: <what was installed or migrated>.
Task 1+2: STARTED. Base <sha>. Dispatched <task-id> (<model>, prompt <file>).
Task 1+2: implementer DONE_WITH_CONCERNS (<the concerns in a clause>). Controller legs in
<worktree>: <suite> = <n> files / <n> tests green, type check clean, format clean. Commits
<sha> (T1) + <sha> (T2). Review dispatched on <diff file>.
Task 1+2: review verdict = <n> Critical, <n> Important. <The findings in a clause.>
Task 1+2: fix round 1 of 5 dispatched (resume <task-id>; allowlist <files>).
Task 1+2: MERGED into <integration branch> at <sha>. Worktree cleaned.
```

Record four things every time, because these are what a fresh controller cannot
reconstruct: the base commit, the dispatch id and model, the exact counts from the
controller legs, and the verdict. Everything else is in a file.

## What does not go in the ledger

- Report text, review text, gate transcripts. They have their own files; the ledger links
  to them by path.
- Diffs.
- Anything you would not want to read again at the seal.

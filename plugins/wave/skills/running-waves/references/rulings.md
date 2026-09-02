# Standing rulings

Every rule the loop runs on, grouped, each with the reason it exists.

A ruling without its why is a rule someone will argue around under pressure; the why is
that argument, already settled. Rulings bind until the owner changes them, and a change is
made by rewriting the ruling here with its own why, never by taking an exception inside a
single brief.

## Roles and models

- **The controller plans, dispatches, merges, verifies and seals, and implements nothing.**
  Why: an author reviewing their own work stops finding their own mistakes, and a
  controller that starts writing code stops driving the wave.
- **The implementer and the reviewer come from different model families.** Why: measured
  head to head, an adversarial reviewer from another family raised no false positives on
  the implementer's diffs, and implementation spend stays off the reviewer's quota.
- **Mechanical, fully specified tasks go to the default model at medium effort; multi-file
  or judgment tasks go to the judgment model at medium effort. Raise effort only after a
  BLOCKED report or two failed fix rounds.** Why: the gate and review net produces the
  quality, not the effort tier, so effort bought before evidence of difficulty is wasted.
- **Never change the implementer model inside a tranche.** Why: a model change mid-tranche
  makes any regression impossible to attribute.
- **Implementers read `AGENTS.md` and never the controller's own instruction file.** Why:
  the implementer loads exactly one conventions file, and the controller's file carries
  process the implementer must not act on.
- **The sandbox is enforced by the dispatch script, not by an instructions file.** Why: an
  instructions file is a wishlist. A flag in the script is a boundary.

## Briefs

- **Owned statements and their neighbours go into the brief verbatim, with literal strings
  quoted exactly.** Why: paraphrase loses the acceptance criterion, and the reviewer
  judges against the statement, not against the paraphrase.
- **Say each instruction once.** Why: a repeated instruction reads as two instructions and
  invites the implementer to satisfy the weaker one.
- **Never ask the implementer for a plan before it starts.** Why: it burns a round and the
  plan it writes is not the plan you reviewed.
- **Plan snippets are untrusted input: the implementer transcribes them verbatim, defects
  included, and flags any conflict with the conventions file.** Why: the plan's own
  reference code is a defect class, and one wave caught three plan-authored defects that
  the gate found only because the snippet was transcribed rather than fixed silently.
- **Anchor every edit by content, quoting the first and last line of the range, never by
  line number.** Why: line numbers are taken at the branch base and shift as earlier tasks
  land.
- **Every grep, count or help output a brief or a plan cites is executed by its author,
  with the real output pasted.** Why: invented evidence survives review and fails only in
  the worktree.
- **The controller never hand-edits an agent's section.** Why: a defect goes back to its
  author as a ruling, so the author's next section is better; a silent fix teaches nobody.
- **The brief states the sandbox facts: no network, which binaries to call directly, which
  chores are already done.** Why: the implementer cannot discover them, and the failure
  mode is a hang, not an error message.
- **The brief verifies each code location it names before dispatch.** Why: stale locations
  send the implementer to build the wrong thing and it reports success.

## Gates

- **Gate only the tasks that are high-risk, delete behaviour, or are refutation-critical
  because there are several ways to fake Green. Review every task.** Why: a wave-scale A
  and B run showed the gate found nothing extra on mechanical tasks, and review alone
  leaked nothing on them.
- **A mechanical deletion with a named trap runs the refutation checklist without a gate
  agent.** Why: the trap is already named, so the gate has nothing left to discover.
- **Red output is pasted per test, never summarized.** Why: a vacuous Red, a suite that
  never actually failed, has shipped behind the phrase "fails as intended".
- **The wrong-Green probe is run for real: apply add-only, empty and hardcoded mutants,
  run the covering tests, then revert every probe edit and prove the tree is clean.** Why:
  a mentally constructed probe misses the mutants that survive, and an unreverted probe
  edit lands in the merge.
- **Fix real findings regardless of whether the current change caused them, and before any
  handoff ship everything under medium effort.** Why: "pre-existing" is a scheduling label,
  not a verdict, and the person receiving the handoff cannot tell the difference.

## Verification

- **An implementer's green claim never covers suites that need a database or a network,
  nor the build. The controller re-runs them.** Why: the sandbox blocks them and those
  suites skip silently rather than failing.
- **Commit-time hooks do not fire for agent runs.** Why: they run in the interactive
  session only, so the controller re-runs the full suite before any green claim.
- **Run the build after any change that adds an import across a bundler boundary.** Why:
  the type checker and the unit runner are both blind to the bundler, and the failure only
  appears at build time.
- **After deleting a route or a generated surface, the type checker lies until the
  generated types are rebuilt.** Why: it reads the stale generated output and reports
  green.
- **One derived test database and one derived object store per worktree, and one test run
  per worktree at a time. Regenerate the client after a schema merge.** Why: shared
  fixtures across concurrent worktrees produced false regressions that cost a day.
- **When a change alters an exported name, grep the test mocks for it.** Why: a bare mock
  factory silently drops the new export and breaks neighbouring suites.

## Git and worktrees

- **Always address a worktree with `git -C <worktree>`.** Why: a bare git command runs
  against whatever directory the shell happens to be in, which is not the worktree.
- **Never stage with `git add -A` in the main checkout.** Why: it committed private files
  once, and the recovery is a history rewrite.
- **Task branches carry code only; registry and generated database files are flipped in
  the main checkout after the merge, and the branch-content hook enforces it.** Why: a
  binary database does not merge, so two branches touching it lose one side's writes.
- **Check the branch tip before every merge, and rebase onto the fork point first.** Why:
  the base moves while a task runs, and a merge onto a stale base silently reverts.
- **Conventional commit messages, with the session trailer. Push only when asked; backup
  pushes to a work-in-progress branch are standing-authorized.** Why: the owner decides
  what becomes public, and a backup branch costs nothing.
- **Never chain merge fallbacks through a pipe.** Why: the exit status of the failing
  command disappears and a failed merge reads as success.
- **The base of a review diff is the merge base, not the branch point you remember.** Why:
  anything else shows the reviewer other people's commits as if they were this task's.

## Controller context

- **The controller never debugs in its own thread. A failing leg goes to a subagent that
  owns "make it green" and returns root cause and outcome only.** Why: one chase consumed
  ninety-nine percent of a controller context window and the wave stalled.
- **Research and probes go to subagents.** Why: probe output is bulk text with a short
  useful life, and it displaces the wave state the controller needs.
- **Every agent contract says: write everything to a workspace file, final message at most
  three lines.** Why: a soft request for brevity is ignored; a hard cap is obeyed.
- **Compact at tranche boundaries, and keep the ledger current enough to resume from.**
  Why: the ledger is the recovery map when the context is gone.

## Registry

- **The projection is normative for execution agents, and statement text verbatim is the
  acceptance criterion.** Why: an agent that can reach the rationale will rationalize
  around the statement.
- **Reviewers verify against statements, never against code comments or superseded
  documents.** Why: those are the artifacts the statement replaced.
- **Every status change appends a history row carrying the previous text, then updates the
  row.** Why: without the previous text the registry records that something changed and
  why, but never what it was, so nobody can reconstruct what the owner approved.
- **Execution reconciles the registry to the built application: flip the statement and its
  references in the same commit, and amend a statement the build proves wrong instead of
  working around it.** Why: pre-build validation cannot prove a specification.
- **Statements describe plainly and positively. No global exclusivity claims outside a
  ratified uniformity rule, and no alarming vocabulary.** Why: an exclusivity claim is
  unprovable and blocks the next honest change.
- **Ban entries are never given to code-generating agents, and never appear in the
  projection. They are a grep gate run after the code is written, and every ban carries the
  ruling that created it.** Why: an agent that has seen the banned string writes around it
  instead of writing the right text.
- **Destructive registry writes go only through the guarded script, which prints the full
  match list first.** Why: a truncated match list authorized a forty-row deletion.
- **Decision documents are written in the working language of the team; only product copy
  is quoted in its own language.** Why: explanation prose is read by reviewers, not users.

## Cost

- **The seal runs the full end-to-end suite with every external key masked, so paid
  specifications skip. Live runs cover only the surfaces this wave touched, at zero
  retries.** Why: a deterministic failure must not be billed twice, and a full live sweep
  is an owner decision.
- **Process weight scales to risk. Batch adjacent small tasks into one dispatch and one
  review, and keep commits and registry flips per task.** Why: the overhead of a dispatch
  is fixed and the review of two small adjacent diffs is one read.
- **Use the strongest model for gates and for the final whole-branch review; re-reviews go
  to a cheaper tier.** Why: a re-review reads a scoped diff against a verdict that already
  exists.

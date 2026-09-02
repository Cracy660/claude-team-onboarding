# Wave lifecycle

The thirteen steps a wave passes through, each with its actor, its artifact, and the gate
that must close before the next step starts.

A wave is one planned batch of work carried from an approved spec to a sealed branch.
The steps run in order. A step is finished when its gate closes, never when its artifact
merely exists. The controller owns the whole line and implements none of it.

## 1. Spec

- **Actor:** controller, with the owner.
- **Artifact:** a design document under `docs/superpowers/specs/`, or, on a project with a
  registry, `proposed` statements in `registry.db` (see `registry-process.md`).
- **Gate:** the owner approves. No plan is written against an unapproved spec, and no
  implementer ever reads the spec narrative.

## 2. Registry entry

- **Actor:** controller.
- **Artifact:** the wave's statements in `registry.db`, each with its `basis`, `status` and
  `stage`, written through the guarded write script so every status change carries its
  history row.
- **Gate:** zero statements for this wave still in `proposed` or `flagged`, and the
  projection regenerated. A project without a registry skips this step and treats the
  spec's numbered requirements as the statements.

## 3. Recon

- **Actor:** subagents. Never the controller in its own thread.
- **Artifact:** a facts pack under the project's reports directory: every premise the plan
  will rely on, with file and line evidence.
- **Gate:** every claim the plan will make about existing code is either in the facts pack
  with evidence, or is written in the plan as explicitly unverified.

## 4. Plan

- **Actor:** plan authors, one per section, in parallel. The controller assembles them.
- **Artifact:** `docs/superpowers/plans/<date>-<wave>.md`, shaped by `plan-template.md`:
  statements verbatim, a classification table, batching, and task blocks with Red and
  Green steps.
- **Gate:** the owner ratifies the design calls. The controller re-runs every grep a
  section cites and rejects the section when the cited output does not reproduce.

## 5. Ledger

- **Actor:** controller.
- **Artifact:** `progress.md` in the wave workspace, shaped by `ledger-template.md`:
  topology, the produces-versus-consumes conflict scan, and rulings R1 to Rn with their
  why and their cost if wrong.
- **Gate:** every cross-task interface named in the plan appears in the scan with a
  verdict, and every conflict the scan finds has a ruling.

## 6. Brief

- **Actor:** controller.
- **Artifact:** `task-<n>-prompt.md` in the workspace, shaped by `brief-template.md`: a
  header of controller context followed by the plan's task text inlined verbatim.
- **Gate:** the controller's own chores are done first (dependencies installed, migrations
  applied, fixtures staged), because the sandbox has no network, and every code location
  the brief cites is verified to still exist.

## 7. Dispatch

- **Actor:** the implementer, launched only through the dispatch skill.
- **Artifact:** a dedicated worktree on branch `<prefix>/<task-id>`, a log under the
  configured log directory, and the implementer's report written inside the worktree.
- **Gate:** the implementer's final status is `DONE` or `DONE_WITH_CONCERNS`, and its Red
  output is pasted per test. A summary sentence is not Red.

## 8. Controller legs

- **Actor:** controller.
- **Artifact:** the runs the sandbox cannot do: suites needing a database or a network,
  the type check, the build when a bundler boundary was touched, the formatter.
- **Gate:** all green in the task worktree, the tree clean, and the work committed from
  that worktree with an explicit path list. An implementer's green claim never closes this
  gate.

## 9. Red gate (gated tasks only)

- **Actor:** the gate agent, dispatched with `gate-prompt.md`.
- **Artifact:** a verdict of PASS, STRENGTHEN or BLOCK, with the mutant table and pasted
  runner output.
- **Gate:** PASS. On STRENGTHEN the named tests land first and the gate runs again. On
  BLOCK the controller repairs the brief or the plan before re-dispatch.

## 10. Task review

- **Actor:** a reviewer agent, dispatched with `review-prompt.md`, on every task.
- **Artifact:** a spec-compliance verdict plus findings graded Critical, Important and
  Minor, each with a file and line.
- **Gate:** no Critical or Important finding open. Fix rounds go back through the dispatch
  skill's `resume` with a file allowlist, capped at five rounds, and close with a scoped
  re-review. Minor findings are recorded in the ledger and closed or dropped at the seal.

## 11. Merge

- **Actor:** controller.
- **Artifact:** the task branch rebased onto the integration branch's fork point, merged
  fast-forward only, and the task worktree cleaned.
- **Gate:** the merge really was fast-forward, generated code is regenerated after any
  schema change, and the full suite is green at each batch boundary.

## 12. Tranche close

- **Actor:** controller, with a delegated whole-tranche review.
- **Artifact:** registry flips in the main checkout (basis, stage, references, history
  row), a regenerated projection, and updated finding statuses.
- **Gate:** every statement in the tranche is flipped, the ledger is current, and the
  controller compacts its context before the next tranche starts.

## 13. Seal

- **Actor:** controller, with a delegated whole-branch review.
- **Artifact:** the wave report and a sealed branch.
- **Gate:** every line of `seal-checklist.md`. The push happens on the owner's call, never
  automatically.

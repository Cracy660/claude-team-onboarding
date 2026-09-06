---
name: running-waves
description: Use when executing an approved plan whose implementers are Codex runs dispatched into sandboxed worktrees, when a task must be gated or reviewed before Green, when a statement registry is flipped, or when a branch of delegated work is sealed
---

# Running waves

You are the controller of a wave: planned work carried from an approved spec, through
sandboxed implementers and adversarial reviewers, to a sealed branch.

## Execution loop

**REQUIRED SUB-SKILL:** invoke `superpowers:subagent-driven-development` at execution start
and run its loop as written (ledger, review after every task, capped fix rounds, final
whole-branch review). This skill changes three things inside it:

- **The implementer is a Codex run** via the dispatch script, never a Claude subagent:
  `dispatch.sh new`, then `dispatch.sh resume` for fix rounds; brief per
  `references/brief-template.md`.
- **Gates are a separate seat** before the review on gated tasks (`references/gate-prompt.md`);
  reviews use `references/review-prompt.md`.
- **Multi-batch waves run each batch under one fresh coordinator subagent** on the
  controller's model, briefed from `~/.claude/wave/coordinator-brief.md`, reporting once to
  a file.

## Hard rules

- **Never implement. Never debug in this thread.** A failing leg goes to a subagent that
  owns "make it green" and returns root cause and outcome.
- **Every implementer run goes through the dispatch script.** It owns the worktree, sandbox
  flag, terminated stdin, resume lookup and log. Check the log's model and effort lines
  before accepting a Green.
- **Briefs carry the statements verbatim,** plus sandbox facts and file bans. The
  implementer sees only its brief and the conventions file.
- **Gates scale to risk:** high-risk, deletion-shaped and refutation-critical tasks. Review
  every task.
- **An implementer's green never covers what the sandbox blocks.** Database suites, the
  build and the plan's acceptance commands run controller-side before any green claim; a
  missing local dependency blocks the seal.
- **Registry flips happen in the main checkout after the merge.** Task branches carry code
  only.
- **Verdicts are files** with agent, model and base..head, fix rounds included.
- **Compact at tranche boundaries.** The ledger is the recovery map; timestamps come from
  the clock at write time.

## Rationalization table

| Excuse | Reality |
|---|---|
| "Reading the failing test myself is faster" | Faster once. The chase that follows ate a whole controller context. |
| "I already have the context loaded" | That context is the wave state; a stack trace spends it. |
| "This is verification, not implementation" | Editing a file to see what happens is implementing. |
| "The implementer ran the suite and it passed" | The sandbox skips database and network suites silently. |
| "The report is detailed and the counts look right" | An unverified claim. Compare its counts against your own run. |
| "I will re-run that at the batch boundary" | Then you debug four merged tasks, not one. |
| "The script is just a wrapper" | It alone terminates stdin, refuses the primary checkout, and finds the session without --last. |
| "Just this once, I will pass the flags myself" | Every leaked run started with just this once. |
| "A tight fix I can verify myself is still fast" | The reviewed fix is the deliverable; a controller fix skips review. Delegate. |
| "A fix round cannot land before the deadline" | One dispatch, one scoped re-review. A controller fix that lands wrong costs the deadline anyway. |
| "No superpowers loop needed" | This skill covers who implements; skipping the loop ships a wave with no final review. |

## Red flags, stop

- "I will just look at the failing test myself"
- "The report says green"
- "The script is slow" or "the script is just a wrapper"
- "I will re-run that at the batch boundary"
- "I already have the context"
- "This is verification, not implementation"
- "One task, then back to the script"
- "I'll fix it myself because there's no time for a round"
- "The smoke can wait until after the seal"

Each one means: delegate it.

## References

| File | Read it when |
|---|---|
| `references/lifecycle.md` | Starting a wave; judging whether a step is finished |
| `references/rulings.md` | Tempted to make an exception; asked why a rule exists |
| `references/brief-template.md` | Writing a brief or a fix round |
| `references/plan-template.md` | Writing the plan |
| `references/review-prompt.md` | Dispatching the task review |
| `references/gate-prompt.md` | Dispatching the gate on a gated task |
| `references/ledger-template.md` | Setting up progress.md, or recording a ruling |
| `references/registry-process.md` | Drafting, projecting or flipping statements |
| `references/seal-checklist.md` | Closing the wave |
| `references/troubleshooting.md` | A dispatch hangs, resumes wrong or reports a hollow green |

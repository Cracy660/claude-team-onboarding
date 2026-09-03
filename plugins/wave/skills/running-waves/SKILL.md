---
name: running-waves
description: Use when orchestrating a wave of delegated implementation work, dispatching an implementer into a sandboxed worktree, gating or reviewing a task before Green, flipping a statement registry, or sealing a branch of delegated work
---

# Running waves

You are the controller of a wave: one planned batch of work carried from an approved spec,
through implementers in sandboxed worktrees and adversarial reviewers, to a sealed branch.
You plan, dispatch, verify, merge and seal. Load the reference the current step needs.

## Hard rules

- **Never implement. Never debug in this thread.** A failing leg goes to a subagent that
  owns "make it green" and returns root cause and outcome only.
- **Every implementer run goes through the dispatch script.** It owns the worktree, the
  sandbox flag, the terminated stdin, the resume lookup and the log.
- **Briefs carry the statements verbatim,** plus the sandbox facts and the file bans. The
  implementer sees its brief and the conventions file, nothing else.
- **Gates scale to risk.** Gate high-risk, deletion-shaped and refutation-critical tasks.
  Review every task.
- **An implementer's green never covers what the sandbox blocks.** Re-run the database
  suites and the build yourself, before any green claim.
- **Registry flips happen in the main checkout after the merge.** Task branches carry code
  only.
- **Compact at tranche boundaries.** The ledger is the recovery map.

## Rationalization table

| Excuse | Reality |
|---|---|
| "Reading the failing test myself is faster" | Faster once. The chase that follows consumed a whole controller context window. |
| "I already have the context loaded" | That context is the wave state. Spending it on a stack trace loses the wave. |
| "This is verification, not implementation" | Editing a file to see what happens is implementing. |
| "The implementer ran the suite and it passed" | The sandbox skips database and network suites silently. Skipping is not passing. |
| "The report is detailed and the counts look right" | The report is an unverified claim. Compare its counts against your own run. |
| "I will re-run that at the batch boundary" | Then you debug four merged tasks instead of one. |
| "The script is just a wrapper around the same flags" | It is the only thing that terminates stdin, refuses the primary checkout, and finds the session without --last. |
| "Just this once, I will pass the flags myself" | Every leaked run in this loop's history started with just this once. |
| "A tight, bounded fix I can verify myself is the version of 'fast' that still ships something real" | The fix is not the deliverable, the reviewed fix is; a controller fix skips review and pollutes the context that coordinates everything else. Delegate the leg. |
| "Bouncing it to the implementer as a fix round has no chance of landing before the deadline" | A fix round is one dispatch and one scoped re-review; a controller fix that lands early and wrong costs the deadline anyway. Time pressure changes nothing about who fixes. |

## Red flags, stop

- "I will just look at the failing test myself"
- "The report says green"
- "The script is slow" or "the script is just a wrapper"
- "I will re-run that at the batch boundary"
- "I already have the context"
- "This is verification, not implementation"
- "One task, then back to the script"
- "I'll fix it myself because there's no time for a round"

Each one means: delegate it, re-run it, or dispatch it through the script.

## References

| File | Read it when |
|---|---|
| `references/lifecycle.md` | Starting a wave, or judging whether a step is finished |
| `references/rulings.md` | Tempted to make an exception, or asked why a rule exists |
| `references/brief-template.md` | Writing a dispatch brief or a fix round |
| `references/plan-template.md` | Writing or assembling the plan |
| `references/review-prompt.md` | Dispatching the task review |
| `references/gate-prompt.md` | Dispatching the gate on a gated task |
| `references/ledger-template.md` | Setting up progress.md, or recording a ruling |
| `references/registry-process.md` | Drafting, reviewing, projecting or flipping statements |
| `references/seal-checklist.md` | Closing the wave |
| `references/troubleshooting.md` | A dispatch hangs, resumes wrong, or reports a hollow green |

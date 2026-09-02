# Gate prompt

The adversarial red gate, dispatched on tasks that are high-risk, delete behaviour, or are
refutation-critical.

The gate runs after Red and before Green is authorized. Its question is not "is this code
right" but "would this suite notice if the code were wrong". It answers that by building
wrong implementations and running the suite against them, then putting the tree back.

## The mutant list

The gate's core is a list of mutants: small, specific, wrong implementations that a lazy
or add-only Green would produce. Write the list yourself when you write the brief, from
the ways this particular task could pass while being wrong. Three families cover most of
it:

- **Add-only.** The task deletes behaviour and the implementation adds the new path while
  leaving the old one reachable.
- **Empty.** The function returns without doing its work, or the option object is missing
  the key that makes it do anything.
- **Hardcoded.** The value the test asserts is returned directly, rather than computed.

On top of those, add the task's own vectors: a rule tested in isolation but never wired
into the thing that runs; a default the framework supplies that looks like the value you
asked for; a configuration wrapper that drops an existing key; a type-level pin that still
compiles under the wrong implementation. Aim for at least six, and require the gate to run
at least three.

## The prompt

```markdown
Red gate for Task <n> of the <wave name> wave (<one-line task summary>). Green has been
implemented and the controller's legs are done; your verdict decides whether Green is
authorized or must be strengthened first. You are a skeptic: prove the Red suite would
catch a wrong or lazy Green.

## Inputs

- Task brief, statements and rules verbatim, including the fake-Green vectors the plan
  names: <absolute path>
- Controller additions and fix-round rulings that amend the brief: <absolute paths>
- Implementer report with pasted Red and Green output: <absolute path>
- The full diff, base <sha>, head <sha>: <absolute path to the diff file>
- Worktree holding the code: <absolute worktree path>

Controller-run evidence you may rely on: <the legs the controller ran, with results>.

## Global constraints under test

- <the constraint, with its exact values>
- <the constraint, with its exact values>

## Method

Audit every line of the refutation checklist in your agent definition against the brief
and the suite, with evidence. Then run the wrong-Green probe for real, in the worktree:
pick at least three mutants from the list below, apply each one, run the covering test
file with the installed runner binary directly (the package manager launcher hangs in this
sandbox), paste the per-test output, and revert the mutant completely.

Revert a tracked file with `git -C <worktree> checkout -- <file>`; for an untracked file,
restore its exact prior content or delete it if you created it. Before you finish, run
`git -C <worktree> status --short` and confirm the tree is back to its pre-probe state.
Paste that output in your verdict. An unreverted probe edit lands in the merge, so this is
not optional bookkeeping.

Mutants:
1. <mutant, named by file and by the exact change>
2. <mutant>
3. <mutant>
4. <mutant>
5. <mutant>
6. <mutant>

State for every mutant you applied whether a test failed, which one, with the pasted
output. A mutant that survives is a STRENGTHEN item: write the concrete test description
(what must fail, on what input) that Green must land first.

Do not run any package-wide suite, any build, or anything touching a database beyond the
covering test files named above. Do not spawn subagents. Do not write report files.

## Verdict format

PASS, STRENGTHEN or BLOCK per your agent definition, with the checklist lines and the
mutant table, evidence pasted, and the final `git status --short` showing your probes
reverted. Keep the whole message under 6000 characters.
```

## Reading the verdict

- **PASS.** Green is authorized. Proceed to the task review.
- **STRENGTHEN.** The named tests land first, in a fix round, and the gate runs again on
  the new suite. Do not accept a rationale in place of a test.
- **BLOCK.** The brief or the plan is defective. Repair it, then re-dispatch. A BLOCK is
  never argued past.

A gate that reports PASS without pasted runner output has not run the probe. Send it back.

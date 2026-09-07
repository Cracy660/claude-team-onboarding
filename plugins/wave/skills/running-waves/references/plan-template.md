# Plan template

The shape of a wave plan: header, global constraints, wave shape, classification table,
and the task block that every task repeats.

The plan is written once, by several authors in parallel, and read in pieces by
implementers who see only their own task plus the global constraints. That is the design
constraint on every line of it: a task block must stand alone.

## Header

```markdown
# <Wave name> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use the subagent-driven development or
> plan-execution skill to implement this plan task by task. Steps use checkbox syntax for
> tracking.

**Roles:** the controller plans, dispatches, merges, verifies and seals, and implements
nothing. The implementer writes the code in a sandboxed worktree. A reviewer agent reviews
every task; a gate agent gates the tasks the classification table marks.

**Goal:** <what the wave delivers, in two sentences, in terms of behaviour>

**Architecture:** <the shape of the change, and what is deliberately disposable>

**Tech stack:** <languages, frameworks, runners, external binaries>

**Spec:** <path to the approved spec>. Where the spec and the registry disagree, the
registry wins. Recon evidence: <path to the facts pack>, cited as "facts section X".

**Plan-pinned design calls:** <decisions this plan makes that the spec left open, each
with one line of why. The owner ratifies these before dispatch.>
```

## Global constraints

Every implementer sees this section, whatever task it draws. Keep it to rules that bind
more than one task:

```markdown
## Global constraints

- **<Domain invariant>:** <the rule, with the exact values it turns on.>
- **Copy:** byte-exact strings from this plan. No em-dashes in prose copy.
- **House idioms:** <the indirections that must not be bypassed, named with their file.>
- **Test discipline:** Red first, with per-test failure output pasted. Tests dispatch no
  model calls and need no credentials.
- **Controller legs:** <which tasks need a build, a database suite, or a lint run that the
  controller performs after the implementer's green.>
- **Sandbox:** no network. Dependencies are installed as controller chores before
  dispatch. Call installed binaries directly.
- **Do not touch:** <files or directories reserved for a later task or for the
  controller.>
- **Ledger:** <workspace path>/progress.md.
- **Commits:** conventional, imperative, one per task, by the controller.
- **Registry:** statements are flipped in the final controller task only.
- **Seal:** <the seal command with external keys masked>.
```

## Wave shape

```markdown
**Dispatch batching (controller):** T1+T2 · T3 alone · T4 alone (gate) · T5+T6 · ...

**Tranches:** <tranche name> = T1..T6; <tranche name> = T7..T12. The controller compacts
its context and closes the registry flips at each tranche boundary.
```

Batch adjacent small tasks into one dispatch and one review. Keep commits and registry
flips per task, so a single task can be reverted.

## Classification table

One row per task. The gate column is the controller's ruling and is not negotiable by the
implementer:

```markdown
| Task | Statements | Risk | Implementer model | Gate |
|---|---|---|---|---|
| 1 | SP-<area>-01, SP-<area>-02 | low | default, medium | review |
| 2 | SP-<area>-07 | high, deletes behaviour | judgment, medium | RED GATE |
```

Risk is high when the task deletes behaviour, when there are several ways to fake a
passing suite, or when getting it wrong is expensive to detect later. Everything else is
low or medium and gets a review.

## Task block

Every task repeats this shape. Append " — RED GATE" to the title when the classification
table says so.

```markdown
### Task <n>: <name>

**Files:**
- Create: `<exact path>`
- Modify: `<exact path>` (anchor by content: first line `<quoted>`, last line `<quoted>`)
- Test: `<exact path>`

**Interfaces:**
- Consumes: `<exact name and signature>` from Task <m>
- Produces: a fenced block in the task's own language carrying the exact exported
  signatures later tasks import, copied from the plan's interface contract

**Why:** <one paragraph> Statements, verbatim:

> <statement id>: <statement text>

Rules to implement exactly:
- <rule with its exact values>

- [ ] **Step 1: Write the failing test** (`<test path>`)
      <Every test description, each naming what must fail on what input.>
      Run, paste per-test failure output.
- [ ] **Step 2: Run test to verify it fails**
      Run: `<command>`  Expected: FAIL with "<message>"
- [ ] **Step 3: Implement**
      <What must be true when this step is done: the rules with their exact values, the
      signatures from the interface contract, the files this task may touch. No reference
      implementation and no suggested approach: the implementer designs it, the review
      finds the delta.>
- [ ] **Step 4: Run tests to verify they pass**
      Run: `<command>`  Expected: PASS
- [ ] **Step 5: Commit**
      `git add <explicit paths> && git commit -m "<conventional commit>"`

Review: standard. <On a gated task: Review: gate agent (fake-Green vectors: <the concrete
ways this suite could pass a wrong implementation>) plus standard review.>
```

## Rules for the authors

- No placeholders. No "TBD", no "similar to Task N", no "write tests for the above". Every
  task states its behavior completely: exact values, copy, signatures, file ownership and
  test descriptions.
- No reference implementation and no "consider alternatives" hints. Shown code turns the
  implementer into a transcriber of the plan's own defects; a hint steers the design the
  review is meant to judge independently. The implementer thinks with its own weights.
- Every grep, count or help output the plan cites is executed by its author, with the real
  output pasted. Invented evidence survives review and fails in the worktree.
- One task is one test cycle a reviewer could reject on its own. Fold configuration and
  documentation steps into the task whose deliverable needs them.
- The last task is controller-only: registry flips, the seal, and anything the sandbox
  cannot reach.
- Close the plan with a `## Self-Review` section: the conflicts the authors found between
  their own sections, and what was ruled.

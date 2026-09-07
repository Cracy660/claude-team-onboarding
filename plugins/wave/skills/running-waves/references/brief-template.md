# Brief template

The dispatch brief an implementer receives, in nine parts, plus the fix-round variant and
the report contract.

A brief is the implementer's whole world. It sees this file and the conventions file, and
nothing else: not the plan, not the spec, not the ledger, not this playbook. Anything it
needs that is not in one of those two files does not exist. Most implementer failures that
look like carelessness are context starvation.

## The nine parts

| Part | What goes in it | The failure it prevents |
|---|---|---|
| 1 Title and contract line | The task name, and the sentence pointing at the conventions file | The implementer inventing its own conventions |
| 2 Where this fits | Two paragraphs: what the wave is doing, and who consumes this task's output by name | Interfaces that satisfy the task and break the next one |
| 3 Owned statements | The statements this task owns, quoted verbatim, each marked when it already complies | Paraphrase drifting away from the acceptance criterion |
| 4 Context the brief cannot know | Sandbox facts, chores already done, signatures merged from earlier tasks, which lines are controller steps | Hangs, reinstalls, and duplicated work |
| 5 Work items and order | Red then Green per item, exact commands, what to report | A Green-first run with a decorative test suite |
| 6 BAN rules | Files owned by other tasks, directories that are off limits, forbidden strings and shapes | Two tasks editing the same file in two worktrees |
| 7 Neighbour statements | A pointer to the neighbouring statements, as context, not as work | Regressions in behaviour nobody asked to change |
| 8 Do not | No subagents, no commits, no writes outside the worktree | Work the controller cannot review or attribute |
| 9 Report contract | Report path, required sections, status enum, final-message cap | A report that has to be chased for the counts |

A brief carries no reference implementation and no instruction to weigh alternatives.
The implementer is a second model family precisely so that it thinks on its own; shown
code makes it transcribe the plan's defects, and a hint steers the design the review is
meant to judge independently. Exact values, signatures and copy are requirements, not
implementation, and stay verbatim.

## The template

```markdown
# Dispatch: <wave name>, Task <n> (<one-line task summary>)

Read AGENTS.md first at the worktree root: it is your standing contract. Then read this
brief; it is your requirements, with the exact values, file names, signatures, copy and
test cases to use verbatim. Transcribe quoted values exactly, including any that look
wrong to you, and say so in the report rather than correcting them silently. The brief
says what must be true, never how to build it: design the implementation yourself.
<Add on a gated task: This task is gated: an adversarial reviewer will try to prove your
test suite can be fooled, so every rule in this brief needs a test that fails when the
rule is broken.>

## Where this fits

<One paragraph: what the project is and what this wave is doing.>

<One paragraph: what this task delivers, and which later tasks consume it, named. List the
exact exported names later tasks import.>

## Owned statements (verbatim, normative)

> <statement id>: <statement text, exactly as it stands in the registry>

> <statement id>: <statement text> *(already complies, pin only)*

## Context the brief cannot know

- <Which binaries to call directly, and why the package manager launcher must not be
  used.>
- <Which dependencies, migrations or fixtures are already in place as controller chores.
  Do not install, do not migrate, do not change pinned versions: the sandbox has no
  network.>
- <Signatures merged from earlier tasks that this task consumes, with the file they live
  in.>
- <Which suites need a database or a network. The controller re-runs those; your green
  does not cover them.>
- <Copy, formatting and comment rules that apply to this diff.>
- <Line numbers in this brief were taken at the branch base. Locate anchors by content.>
- <Lines in the work items that say Commit or Review are controller steps. Do not commit.>

## Work items and order

Red first: write every test named below, run them, and paste the per-test failure output
into the report. Then implement, run the Green command, and paste that output too.

1. **<Item name>.** <What must be true when it is done, with the exact values.>
   Red: <the test descriptions, each naming what must fail on what input.>
   Green: `<command>`
2. **<Item name>.** ...

Finish with `<format command>` and `<lint command>` over every file you touched, and paste
the output. Report any structural side effect: a new import across a bundler boundary, a
changed export, a new generated file.

## BAN rules

- Do not touch <files owned by other tasks>. <Task id> owns them.
- Do not edit the documentation directory, the registry directory, or any generated
  database.
- <Copy and vocabulary bans that apply, stated positively where possible.>

## Neighbour statements

See `<neighbours file>` next to this brief for the other statements in this area, with
their stage. Rows staged `parity` are built behaviour you must not regress; rows staged to
this wave belong to other tasks. Do not implement them.

## Do not

- No subagents. No commits. No writes outside this worktree.
- No files beyond those this brief names.
- No new dependencies.

## Report

Write the full report to `<workspace>/task-<n>-report.md` inside this worktree, creating
the directories: files changed; Red output per test; Green output; type check, format and
lint output; checks you could not run and why; concerns.

Your final message is at most eight lines: status (DONE | DONE_WITH_CONCERNS |
NEEDS_CONTEXT | BLOCKED), test counts, what you could not run, concerns.
```

## The status enum

| Status | Means | What the controller does |
|---|---|---|
| `DONE` | Every work item landed, Red and Green output pasted | Run the controller legs, then review |
| `DONE_WITH_CONCERNS` | Landed, with something the implementer wants judged | Read the concerns first, they are usually real |
| `NEEDS_CONTEXT` | Blocked on a fact the brief did not carry | Answer it in a fix round, and fix the brief template if it will recur |
| `BLOCKED` | Cannot proceed: the brief or the plan is wrong | Repair the brief or the plan, then re-dispatch. Never argue the implementer past a BLOCKED |

## Fix-round variant

A fix round resumes the same session, so it carries no context of its own beyond what it
adds. Keep it short and give it an allowlist: the round's whole risk is edits outside the
findings.

```markdown
# Fix round <k>: Task <n>

The review of your work returned the findings below. Fix exactly these, nothing else.

## File allowlist

You may edit only these files. Any other file, including a test file, is out of scope for
this round; if a finding cannot be fixed inside the allowlist, stop and report it.

- `<path>`
- `<path>`

## Findings to fix

1. **<Critical | Important> at `<file>:<line>`.** <The finding, quoted from the review.>
   <What the fixed state must be, with exact values.>
2. ...

## Rulings that amend the brief

- <Any controller decision made since the original brief. These take precedence over the
  brief where they conflict.>

## Method

Add or adjust the test that fails on the current behaviour first, paste its failure, then
fix. Re-run `<command>` and paste the output.

## Report

Append a section `## Fix round <k>` to your existing report at
`<workspace>/task-<n>-report.md`: what you changed per finding, the test output, and any
finding you could not fix inside the allowlist.

Final message at most eight lines: status (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT |
BLOCKED), per-finding outcome, concerns.
```

Cap fix rounds at five. A task still failing review after five rounds is a brief defect or
a plan defect, not an implementer defect: rewrite the brief and re-dispatch from a clean
worktree.

# Canonical CLAUDE.md sections

The wave method needs a handful of sections in the global `~/.claude/CLAUDE.md`.
This file carries each one together with the rule that says how to merge it into
a file that already exists and may have been hand-edited. The setup skill reads
this file, applies the blocks in file order, shows a unified diff and writes only
after the recipient confirms.

Each block is preceded by one comment line of the form
`<!-- rule: FORM; KEY: "VALUE"; KEY: "VALUE" -->`, and the block body runs from
the line after that comment to the line before the next rule comment. Values are
always double quoted and never contain a double quote. Four forms:

- `add-if-absent`, keys `heading` and `after`: when no heading matches `heading`,
  insert the body, which opens with its own heading line, after the section named
  by `after`. When the heading is already there, change nothing and report the
  section as left alone.
- `amend-bullet`, keys `section`, `bullet` and `match`: when `match` is already
  in that section, change nothing. Otherwise append the one-line body to the end
  of the bullet whose text after the list marker starts with `bullet`, and change
  no other line.
- `append-bullets`, key `section`: append each item line of the body, without its
  trailing match comment, at the end of that section, skipping any item whose
  match literal is already there.
- `never-touch`, key `sections`: those sections are never modified and never
  reordered. The body is empty.

A body line that is only a `<!-- note: … -->` comment is an annotation for
whoever reads this file. It is never an item, and it is never written into the
target.

Headings and bullets both match by prefix, and both are compared after stripping
the list marker and any emphasis markers. So `## Test-Driven Development` matches
a recipient heading `## Test-Driven Development (mandatory)`, and the bullet
prefix `Commit cadence` matches both `- Commit cadence: …` and
`- **Commit cadence (atomic):** …`. Write every `bullet` value as plain text,
without a leading `- ` and without `*` or `_`. A never-touch heading that is
absent is normal and is not a finding. When a
rule's anchor is missing because the file was hand-edited, propose the closest
placement in the diff and name the rule. Never skip an anchor silently.

<!-- rule: amend-bullet; section: "## Test-Driven Development"; bullet: "Tests are a design conversation"; match: "risk-scaled adversarial gates are the checkpoint" -->
In plan-driven wave execution the approved plan plus risk-scaled adversarial gates are the checkpoint; test files are not individually presented

<!-- rule: append-bullets; section: "## Test-Driven Development" -->
- **Review checkpoints**: TDD gates (test files presented before implementation) ARE the review checkpoints. For business-logic questions that surface mid-execution, stop — don't guess. Those belong in brainstorming or at a checkpoint, never inside implementation. <!-- match: "ARE the review checkpoints" -->

<!-- rule: add-if-absent; heading: "## Multi-Model Execution"; after: "## Test-Driven Development" -->
## Multi-Model Execution
- Role split: Codex implements; Opus red-teams and reviews; the controller session plans, orchestrates, verifies, and never implements. Implementation tokens stay off the Claude weekly quota; Claude sits on the adversarial side.
- Implementer agents read the repo root `AGENTS.md`, not CLAUDE.md. Implementer conventions live there; CLAUDE.md stays controller/reviewer-side; dispatch briefs carry task specifics only.
- Sandboxing implementers is the controller's job, enforced programmatically in the dispatch command (dedicated git worktree, restrictive sandbox flags).
- Process weight scales to risk: adversarial gates on tasks that are high-risk, deletion-shaped, or refutation-critical (multiple ways to fake Green); a standing refutation checklist may stand in for the gate on mechanical, named-trap deletions; task review on everything; batch adjacent small tasks into shared dispatches.
- Commit-gate hooks don't cover subagent/worktree work — the controller re-runs full suites before any green claim.
- The controller delegates, never debugs in-thread: a failing suite, database or build leg goes to a subagent that owns "make it green" and returns only root cause + outcome. Keep subagent reports, review verdicts, and diffs in workspace files, not the context window — carry forward only verdicts, findings, and file:line rulings. Context bloat is self-inflicted, not wave-inherent.

<!-- rule: append-bullets; section: "## Workflow" -->
- Maintain `progress.md` (root) only when the project is big enough to warrant a running log — skip it for small features where per-feature plans carry their own history <!-- match: "only when the project is big enough" -->
- When using subagents they have to save everything to the workspace file; final message ≤5 lines: status + key findings + counts + path <!-- match: "save everything to the workspace file" -->
- Compact context between phases when executing long superpowers plans <!-- match: "Compact context between phases" -->

<!-- rule: add-if-absent; heading: "## Planning Workflow"; after: "## Multi-Model Execution" -->
## Planning Workflow
Tool choice, from lightest to heaviest:
1. **Desktop app** → root `spec.md` only (initial ideation).
2. **`/ultraplan`** → small projects. Takes the root spec, produces the plan. Fast, compact output.
3. **Superpowers** → larger projects and non-trivial features. `brainstorming` → `writing-plans` → **`subagent-driven-development`** Per-feature files under `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>*.md`.

Brainstorming always comes first for superpowers work.

<!-- rule: append-bullets; section: "## Planning Workflow" -->
When superpowers files are created, they **supersede** the root `spec.md`: brainstorming refines the earlier ideation further, so the per-feature file becomes authoritative. The root stays as historical ideation context. <!-- match: "becomes authoritative" -->

<!-- rule: add-if-absent; heading: "## Archival"; after: "## Documentation" -->
## Archival
- When project-level `CLAUDE.md`, `SPAWN_PROMPT*.md`, `spec.md`, or similar long-lived docs change substantially (not typo fixes), archive the old version to `docs/archive/<filename>_<function>.md` BEFORE editing.
- Small projects can skip the archive folder. Small edits don't need archival.

<!-- rule: amend-bullet; section: "## Git"; bullet: "Commit cadence"; match: "the plan itself is the authorization" -->
During plan-driven execution (following a root `plan.md` or a `docs/superpowers/plans/*` file), commit at each completed step WITHOUT waiting for explicit approval — the plan itself is the authorization. This overrides the Claude Code default "never commit without asking" within plan execution. Frequent small commits are fine and rarely an issue in practice.

<!-- rule: append-bullets; section: "## Git" -->
<!-- note: the identity lines and the push rule belong to the recipient. Never rewrite, reorder or remove them. -->
- **Squash is optional, not mandatory:** many small WIP commits during plan execution are fine to keep as-is. Squash working steps into logical units at feature completion only if the history feels noisy in retrospect — don't squash defensively. <!-- match: "Squash is optional" -->

<!-- rule: never-touch; sections: "## User, ## Communication, ## System Paths, ## Preferences" -->

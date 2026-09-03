# Retrospective: building the wave plugin (2026-09-02 to 2026-09-03)

The `wave` plugin shipped: spec, a 16-task plan, 38 commits, about 3.9k lines of product and 3.4k
lines of tests (202 passing), three skills with real scenario runs, and the plugin installed on the
owner's machine through the plugin loader. It cost roughly 403M tokens of Claude usage and left the
controller session at about 730k tokens of context. That ratio is the subject of this note.

## Where the tokens went (structural estimate, not billing data)

- **The controller re-read its own context on every turn.** The session ran for about 14 hours and
  took on the order of 300 turns, most of them triggered by agent notifications rather than by
  work. With the context growing from 100k to 730k, the controller alone re-sent on the order of
  100M tokens. Prompt caching makes them cheap per token, but they still count.
- **About 60 agents, each with its own growing context.** Six plan authors, two plan reviewers,
  seventeen implementers or fix-round resumes, roughly twenty-five reviewers and re-reviewers,
  three red gates (nine verdicts), five scenario runners and a dozen nested scenario agents at
  90k to 110k each. Each agent ran 15 to 40 tool calls over a context of 50k to 200k, so a typical
  agent cost 1M to 3M tokens end to end.
- **Every notification was a turn, and half of them were duplicates.** Each agent sent a result
  and an idle notification, and every message it received produced another. Each of those
  re-read the controller's full context.
- **Work was done three times for most files.** Plan authors wrote and ran the code in scratch
  trees, implementers transcribed it byte for byte, reviewers diffed the transcription against the
  plan. For a greenfield package that is two extra passes over every file.

## What the money bought

- Two real bugs in the dispatch script that the unit tests could not see: an unnormalized `..`
  worktree path that broke `resume`, and a task-id prefix collision that attached to the wrong
  session. Both were found by using the script on this repository (dogfooding) and by the final
  review, not by the suite.
- Six real skill defects found by scenario runs: a scenario prompt that forbade reading the skill
  it named, the merge written before the diff under "do it now", the knobs question skipped under
  "non-interactive", an orphaned TODO block, an unbacked overwrite on refresh, and a peer agent's
  "yes" accepted as approval (the last one was correctly refused by the hardened skill).
- Four gate verdicts of STRENGTHEN that pinned atomicity, multi-row history, projection
  regeneration, and knob reading with mutants that had passed the shipped suites.
- Fifty-six recorded rulings, so every decision made on the owner's behalf is reviewable.

## Lessons

1. **Turn count times context size is the bill.** Compact at every batch boundary; the ledger
   proved sufficient to resume after a pause, so it is sufficient after a compaction. The
   controller never compacted in 14 hours. That alone is most of the overrun.
2. **Do not let chatty agents report to the main session.** One coordinator per batch that owns
   its implementers, reviewers and gates, and reports once, keeps notifications out of the
   controller's context. Never resume an agent for a one-line ruling that a coordinator could hold.
3. **Plan-as-complete-code is for a different implementer model, not for greenfield.** When the
   plan authors already ran the code, they should commit it and be reviewed on the real diff. Keep
   full-code plans for cases where a sandboxed implementer of another model transcribes them.
4. **Transcription tasks need a script, not a reviewer.** A byte-diff against the brief plus the
   banned-string and placeholder greps replace a review seat for any task whose deliverable is
   "the file in the brief".
5. **Weight scales to risk, per task, not per project.** The registry write script and the dispatch
   script deserved gates; the README, references and templates did not deserve the same net.
   The owner's cost-calibration rule existed and was applied uniformly instead of per task.
6. **Reviewer output goes to a file, the message is one line.** Long final messages were truncated
   in transit and still landed in the controller's context. The red-gate definition now says so;
   every reviewer prompt should.
7. **Rulings are observable predicates.** Four of eighteen fix rounds came from controller wording:
   a regex with `|` inside a table cell, "same commit" read as amend, a GREEN prompt inheriting a
   contradiction from the plan, and a loose "contains /tools/". When an implementer flags a
   deviation from a ruling, it is usually right.
8. **Scenario-based skill TDD works and is the most expensive thing per finding.** Keep it, with:
   agents run from an empty directory with no repository access, the skill text pasted inline for
   GREEN, an identity convention for who may answer "yes", a runner that writes the record before
   it reports, and a cap on rounds. Expect the owner's own global CLAUDE.md to inflate RED.
9. **Dogfood early.** Bootstrapping the repository with its own dispatch script after Task 4 found
   more than the gates did. Make "use the tool on itself" a plan step, not an afterthought.
10. **Say what it is.** "A plugin that updates CLAUDE.md" became a package with three skills, ten
    references, a registry with three tools, hooks, a dispatch script and 202 tests because the
    owner chose to generalize the full method. The scope was right for the recipient; the process
    weight was not scaled down where the risk was low.

## Rulings made on the owner's behalf

Extracted from the execution ledger; R-numbers are stable references.

R1 `sections.md` rule syntax is the one in `notes-E1.md` item 1 (`<!-- rule: <form>; key: "v" -->`,
R2 `append-bullets` items may be plain lines, identified by their `<!-- match: "..." -->` literal.
R3 `AGENTS.md.hbs` wraps the house-conventions TODO in the literal lines
R4 `CLAUDE-section.md.hbs` opens with the literal heading `## Wave dispatch (controller-side)`;
R5 Both hooks are always installed; `registry-guard.sh` exits 0 when `WAVE_REGISTRY_DIR` is empty.
R6 Tasks 11, 12, 15 run as Claude subagents, never Codex: their TDD step spawns scenario subagents.
R7 The setup skill's target defaults to `~/.claude/CLAUDE.md` and accepts another path, so the
R8 Baseline scenario records stay in the gitignored workspace; commits carry fixture, scenario and
R9 `running-waves/SKILL.md` carries no lifecycle summary, only the pointer to `lifecycle.md`.
R10 Task 15 ships its rationalization table from the scenarios' expected excuses; Step 7 adds
R11 `wave.env.hbs` gains `WAVE_EXTERNAL_KEYS="{{EXTERNAL_KEYS}}"` (Task 4); `seal-checklist.md`
R12 The three scenario files are pinned by `references.test.mjs` part 3.
R13 Tasks 13 and 14 go out as one Codex dispatch; only Task 15's version of
R14 `node --test` always takes file names or runs as `npm test`; Node 26 rejects a directory. Global constraint added.
R15 `merge-settings.mjs` prints `backup: <path>` before the change lines (init's receipt needs it). Contract amended.
R16 `merge-settings.mjs` computes the merge first and writes no backup on a no-change run. Contract amended.
R17 `render.mjs` treats a `{{#if KEY}}` with an absent knob as a missing knob (error), same as a bare `{{KEY}}`.
R18 README shows `<path-to-your-checkout>` in the marketplace-add line; the owner's real path lives only in Task 16's controller-run verification block. Test assertion relaxed to the placeholder.
R19 Fake codex records `resumeId` on the same JSON line as argv (A's reading); Task 4 asserts `log[0].resumeId`.
R20 Hook-append semantics follow the interface contract (append unless an existing entry carries every command string of the incoming entry).
R21 `registry-write.sh --delete` takes no `--note` and writes no history row; deletes are rare and need a ruling anyway (registry SKILL). `--note` is required on `--set` for `spec_statement` and `find
R22 Heading and bullet anchors in the CLAUDE.md merge match by PREFIX (evidence: `## Test-Driven Development (mandatory)` vs `(mandatory for all languages)`; `- Commit cadence:` vs `- **Commit cadence
R23 Em-dashes inside verbatim ports (red-gate.md, AGENTS.md.hbs, canonical CLAUDE.md blocks) are preserved; authored prose uses commas and colons.
R24 A heading may own several consecutive blocks in sections.md (Planning Workflow: add-if-absent then append-bullets; TDD: amend-bullet then append-bullets); each block carries exactly one rule comme
R25 `registry-write.sh` refuses to run when `WAVE_REGISTRY_DIR` is empty (message names the missing registry); hooks stay silent.
R26 `registry-guard.sh` matches the database basenames (`registry.db`, `spec-exec.db`) rather than the qualified path; superset that keeps `cd docs/registry && sqlite3 registry.db ...` covered. `WAVE_
R27 `dispatch.sh` runs `WAVE_INSTALL_CMD` through `eval`; `wave.env` is inside the trust boundary (written by the owner via init). The init receipt says so in one sentence (Task 12).
R28 Project scripts and hooks stay within bash 3.2 syntax (macOS `/bin/bash`); tests never assert on git's own localized output. Global constraint added.
R29 `troubleshooting.md` carries the `git worktree remove` trap: it refuses a worktree holding untracked files, so the dependency directory must be gitignored or `clean` refuses (Task 13).
R30 `/wave:init` checks that the detected dependency directory (`node_modules` for npm, pnpm, yarn; `.venv` for uv) is matched by `git check-ignore`; if not, it offers to append the line to `.gitignor
R31 `append-bullets`: an item that does not start with `- ` is inserted with one blank line before it (paragraph shape). Task 11's rule table; Task 10 unchanged.
R32 `heading`, `after` and `sections` values in `sections.md` carry their `## ` prefix; the setup skill compares after lowercasing and stripping leading `#` and whitespace, as a prefix. Verified compa
R33 The `## Git` append landing below the identity sub-list is accepted as valid markdown; not a defect.
R34 Inside any `sections.md` block body, a line starting with `<!-- note:` is an annotation: the setup skill's `append-bullets` loop (and every other form) skips it and never writes it to the target f
R35 Task 15 `running-waves/SKILL.md` body cap is 750 words in both the test and the rule; the refactor step needs headroom for verbatim excuses.
R36 Task 13 `troubleshooting.md` gains one entry: breakage the test tools cannot see (a bundler boundary, a generated-types directory) gets a project PostToolUse hook that exits 2 with the required le
R37 Task 8 adds the mixed-export test (second verdict a `change` with empty text; the first verdict must not land) so the one-transaction claim is pinned.
review Needs fixes. Important: `registry-guard.sh` exemption is a whole-command substring match (`*registry-write.sh*`), forgeable by naming the script in an unrelated echo; inherited from the OIL ori
Ruling R39: the pinned test "passes the projection tool rebuilding the projection" (tools script then a raw destructive sqlite3 segment in one command) flips to expect a block; a tool-only invocation 
Ruling R40: `resume` greps the sessions dir with `grep -rlF` (fixed string) so a worktree path containing a regex metacharacter cannot widen the match; fix round 2 dispatched (one flag). minor (deferr
fix round 2/5 (grep -rlF; commit a09b6f3). Ruling R41: a single-token fix with an unchanged, green suite is verified by controller diff inspection instead of a re-review seat.
re-review round 1: all findings ADDRESSED, no new breakage. Notes: tests b/c/d/h vacuous (exempt segments carry no destructive shape); `*/tools/*` exemption unscoped to the registry dir (my R38 wordin
review Needs fixes: canonical text drifted from the owner's file at `sections.md` Multi-Model bullet ("e2e/DB/build" reworded), Planning Workflow item 1 (clause dropped), supersede sentence (paraphras
review Approved with one Important (plan-inherited): `--set` that renames `id`/`finding_id` makes the history join match nothing, update succeeds, no history row. Ruling R43: refuse `--set` expression
DOGFOOD FINDING (Task 10 resume): `dispatch: no codex session references <repo>/../claude-team-onboarding-wt/task-10`. `resolve()` joins `$REPO_ROOT/$WAVE_WT_ROOT` verbatim, so a relative root with `.
Task 15 baseline round 1 INVALID (kept as `baseline-waves-contaminated.md`): scenario subagents browsed the repo and quoted `sections.md` / the plan verbatim; one sent a real message to gate-task-7 (r
Task 15 baseline (RED, isolated re-run): 2/3 complied (green-claim, raw-codex), debug-inline FAILED with 2 new rationalizations; 0 tools used. Ruling R47: every subagent in this session inherits the o
Task 12 baseline round 1 INVALID (kept as `baseline-init-contaminated.md`): the agent read `tests/fixtures/knobs.sample.json` and `skills/init/SKILL.md` from the plugin dir. Real gaps still observed: 
gate re-check round 2 STRENGTHEN: all earlier mutants die (incl. two escaping probes); M1 (per-verdict commit) now survives because validation moved pre-transaction. Mandated: mid-export DB error roll
review Approved. Ruling R50: the second added excuse says "before the deadline" instead of the baseline's "before 18:00" on purpose (a reusable rule carries no clock time); the report's reason for not
Task 11 GREEN round 1 INVALID: the scenario's GREEN prompt = RED prompt (which says "Do not read anything under plugins/wave/skills/") plus "Use the skill at …/skills/setup/SKILL.md"; the agent resolv
Task 12 GREEN round 1: 11/11 acceptance rows (house conventions applied via the skill's re-render after a follow-up), but the agent skipped the knobs question ("ran non-interactively, took the default
Task 11 GREEN round 2: skill read, backup created (`CLAUDE.md.pre-wave-<ts>.bak`), personal sections intact, but no diff shown and no confirmation: the agent let "do it now, in one pass. I am waiting 
fix round 2/5 (commit f8ae702): implementer replaced my `grep -cE '^-([^-]|-[^-])'` with `^-{1,2}[^-]` because a regex `|` inside a GFM table cell splits the row (verified with pandoc). Ruling R54: no
Task 12 GREEN round 2: knobs question still not asked ("no channel to ask and block"); 10/11 rows; the house-conventions row is a false pass: with empty conventions the documented procedure strips the
Task 11 GREEN round 3: skill read, diff shown, backup made, confirmation requested, merged result staged as CLAUDE.md.wave.tmp; the agent refused the runner's peer "yes" (correct under session rules).

Full ledger with evidence: the plan's SDD workspace on the owner's machine (gitignored). Owner-visible record: this file and the git history.

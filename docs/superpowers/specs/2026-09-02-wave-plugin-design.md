# Wave plugin: design

Date: 2026-09-02. Status: approved in brainstorming, pending owner review of this file.

## Goal

Package the multi-model working method used on OIL Studio (Claude session orchestrates,
Codex implements in a sandboxed worktree, Opus gates and reviews, a SQLite statement
registry is the spec) as a second plugin in the `claude-team-onboarding` marketplace, so a
colleague can install it, merge the method into their existing global setup, and scaffold
the tooling into their own repositories.

## Recipient and constraints

- Experienced developer at OIL, English, macOS or Linux.
- Already runs the `claude-team` baseline from this marketplace: portable hooks, baseline
  plugins including superpowers, a generated `~/.claude/CLAUDE.md` from
  `templates/CLAUDE.md.pl.hbs` (possibly hand-edited since).
- Does not use Codex yet. Has a ChatGPT plan that includes Codex, or will get one.
- Uses the package globally and on their own projects. `oil_wrapper` already carries its own
  copy of the tooling and is not a target.
- Shell scripts stay bash. Node is only the test runner, as in the `claude-team` plugin.

## Non-goals

- Windows without WSL. The old plugin's Node hooks stay portable; the wave scripts do not.
- The `codex@openai-codex` Claude Code plugin. It is a parallel path the loop does not use;
  the README says so.
- The Next.js `use-client-import` hook. It becomes a documented pattern ("a hook for the
  breakage your test tools cannot see") in the playbook, not a shipped file.
- The `workstream` and `finding_workstream` tables from `findings.db`. Wave-3 specific.
- Editing the `claude-team` plugin. It stays at 0.1.0, untouched.

## Package shape

```
claude-team-onboarding/
├── .claude-plugin/marketplace.json     adds the "wave" entry; description in English
├── README.md                           new English section for wave (see Docs)
├── docs/superpowers/{specs,plans}/     this spec and its plan
├── plugins/claude-team/                untouched
└── plugins/wave/
    ├── plugin.json                     name "wave", version 0.1.0, MIT
    ├── commands/setup.md               /wave:setup, thin: invokes the setup skill
    ├── commands/init.md                /wave:init, thin: invokes the init skill
    ├── skills/setup/SKILL.md           global layer procedure and CLAUDE.md merge rules
    ├── skills/init/SKILL.md            project scaffold procedure
    ├── skills/running-waves/SKILL.md   controller playbook (short, triggers only)
    │   └── references/                 lifecycle, rulings, brief-template, plan-template,
    │                                   review-prompt, gate-prompt, ledger-template,
    │                                   registry-process, seal-checklist, troubleshooting
    ├── templates/claude-md/sections.md canonical blocks, one merge rule per block
    ├── templates/project/              everything /wave:init writes (listed below)
    └── tests/                          node --test suite, package.json with "test"
```

Naming: the plugin namespace is `wave`; user-invoked entry points are `/wave:setup` and
`/wave:init`; the playbook skill is `running-waves` so its name says what the agent is
doing. Skill descriptions start with "Use when" and carry triggering conditions only, never
a workflow summary (writing-skills rule: a summarized workflow gets followed instead of the
skill body).

## Configuration: `.claude/wave.env`

Scripts and hooks are copied verbatim into a project and read one file the scaffolder
writes. They stay byte-identical across projects, so the test suite exercises the real
scripts and a later plugin version refreshes them by re-running `/wave:init`.

```
WAVE_WT_ROOT=../<repo>-wt          worktree root; default ../<repo name>-wt
WAVE_BRANCH_PREFIX=codex           task branches are <prefix>/<task-id>
WAVE_ENV_FILE=.env.local           copied into each worktree; empty = nothing to copy
WAVE_INSTALL_CMD="pnpm install --prefer-offline --silent"   empty = skip
WAVE_MODEL_DEFAULT=gpt-5.6-terra   mechanical, well-specified tasks
WAVE_EFFORT_DEFAULT=medium
WAVE_MODEL_JUDGMENT=gpt-5.6-sol    multi-file or judgment tasks (documented default)
WAVE_LOG_DIR=.superpowers/dispatch-logs
WAVE_REGISTRY_DIR=docs/registry    empty = the project runs without a registry
```

Scripts source the file relative to the repo root (`git rev-parse --show-toplevel`); hooks
source it via `$CLAUDE_PROJECT_DIR`. A missing file is a hard error in `dispatch.sh` and a
silent pass in hooks (a hook must never block a repo that has no wave tooling).

## `/wave:setup` (skill `setup`)

Runs once per machine. Rules inherited from the `claude-team` onboarding skill: never run
installs itself (paste-and-confirm), never overwrite without a backup, idempotent, emit a
diagnostic block on failure.

1. Codex preflight. `codex --version`; if missing, present `npm install -g @openai/codex`.
   Then `codex login status`; if not logged in, present `codex login` and state that it
   needs a ChatGPT plan that includes Codex. `~/.codex/config.toml` is not written: sandbox
   and model policy live in the dispatch script.
2. Superpowers check. `enabledPlugins["superpowers@claude-plugins-official"]` in
   `~/.claude/settings.json`; if absent, present the `/plugin install` command. Hooks are
   not touched: the recipient already has the baseline set.
3. CLAUDE.md merge. Back up `~/.claude/CLAUDE.md` to `CLAUDE.md.pre-wave-<YYYYMMDD-HHMMSS>.bak`.
   Load `templates/claude-md/sections.md`, which carries each canonical block with its rule:

   | Section heading | Rule |
   |---|---|
   | `## Multi-Model Execution` | add the whole section after TDD if absent; if present, leave and report |
   | `## Test-Driven Development` | amend the bullet starting "**Tests are a design conversation**" by appending the wave exception (in plan-driven wave execution the approved plan plus risk-scaled adversarial gates are the checkpoint; test files are not individually presented); add the "**Review checkpoints**" bullet if absent |
   | `## Workflow` | append if absent: subagents save everything to a workspace file and reply in at most five lines; compact context between phases of a long plan; maintain `progress.md` only when the project warrants it |
   | `## Planning Workflow` | add the sentence that superpowers files supersede the root `spec.md`; add the section if absent |
   | `## Git` | add: commit at each completed plan step without waiting for approval (the plan is the authorization); squash optional; keep the recipient's identity lines and push rule untouched |
   | `## Archival` | add if absent |
   | `## User`, `## Communication`, `## System Paths`, `## Preferences`, any unlisted section | never touched; order preserved |

   The blocks are de-personalized: no owner name, no organisation, no paths. Procedure:
   apply the rules, show a unified diff, write atomically only after the recipient confirms.
   When a rule's anchor is missing because the file was hand-edited, propose the closest
   placement in the diff and say which rule it is; never skip silently.
4. Receipt: what was added, amended and left, and the pointer to `/wave:init`.

## `/wave:init` (skill `init`)

Preconditions: inside a git repository, in the main checkout (`git rev-parse --git-dir`
equals `--git-common-dir`), on any branch. A dirty tree is reported, not refused.

1. Detect: package manager from the lockfile (`pnpm-lock.yaml`, `package-lock.json`,
   `yarn.lock`, `uv.lock`; none found: ask), env file (`.env.local`, then `.env`, else
   none), test and build commands from `package.json` scripts or `pyproject.toml`, repo
   name for the default worktree root, language for the AGENTS.md test section.
2. Ask the knobs in one message with defaults shown: worktree root, model tiers and effort,
   registry yes or no, three to five lines of house conventions (skip leaves a marked TODO
   block in AGENTS.md).
3. Write. Every existing file is backed up as `<name>.pre-wave-<timestamp>.bak` before a
   merge; new files are written atomically.

   | Target | Source template | Merge policy when present |
   |---|---|---|
   | `.claude/wave.env` | rendered from answers | overwrite after backup |
   | `.claude/settings.json` | `settings.json` | union: `permissions.deny` gains `Bash(codex exec:*)`, `Bash(codex resume:*)`; `permissions.allow` gains the two script paths in bare and `bash `-prefixed forms; hook entries appended if their command is absent; other keys preserved |
   | `.claude/hooks/code-only-branch.sh`, `registry-guard.sh` | verbatim | overwrite after backup; registry-guard only when a registry is configured |
   | `.claude/skills/dispatch/SKILL.md`, `scripts/dispatch.sh` | verbatim | overwrite after backup |
   | `.claude/skills/registry/SKILL.md`, `scripts/registry-write.sh` | verbatim | overwrite after backup; only with a registry |
   | `.claude/agents/red-gate.md` | verbatim | overwrite after backup |
   | `AGENTS.md` | `AGENTS.md.hbs` | create; if present, append the sections whose heading is missing, via diff and confirm |
   | `CLAUDE.md` (project) | `CLAUDE-section.md.hbs` | append the `## Wave dispatch (controller-side)` section if that heading is absent |
   | `docs/registry/README.md`, `schema.sql`, `tools/*.py`, `registry.db` | `registry/` | create; `registry.db` initialized from `schema.sql` only when absent |
   | `.gitignore` | line | add `<WAVE_LOG_DIR>/` if absent |

4. Receipt, then the pointer to the playbook's "first wave" walkthrough.

## Generalized artifacts

### `dispatch.sh`

Same four subcommands as OIL (`new`, `resume`, `clean`, `list`) and every trap kept:
`--sandbox workspace-write` always, never `danger-full-access`, never the primary checkout;
stdin terminated with `< /dev/null`; prompt rides the argument from a file; `pipefail`
through `tee`; `--output-last-message <log dir>/<task>.last.md`; kebab-case task ids;
refuses an existing worktree; `resume` finds the session by grepping `~/.codex/sessions`
for the worktree path (never `--last`), extracts the UUID, and runs inside the worktree
because `codex exec resume` does not restore `--cd`. Differences: worktree root, branch
prefix, env file, install command, models and log dir come from `wave.env`; an empty
`WAVE_ENV_FILE` skips the copy and an empty `WAVE_INSTALL_CMD` skips provisioning; the
env-file copy is a plain copy (the per-worktree database rewrite is an OIL-specific step the
playbook describes under "per-worktree test environments").

### Hooks

`code-only-branch.sh`: unchanged logic (a commit from a linked worktree or a
`<prefix>/*` branch that stages a file under the registry dir is blocked with exit 2);
prefix and dir from `wave.env`; exits 0 when `WAVE_REGISTRY_DIR` is empty or `wave.env` is
missing. `registry-guard.sh`: unchanged SQL-shape matching; targets `registry.db` and
`spec-exec.db` under the configured dir; `registry-write.sh` and the tools dir are exempt.

### `registry-write.sh`

`registry-write.sh <table> --set <expr> --where <expr> [--note <text>]` and
`registry-write.sh <table> --delete --where <expr>`. One database:
`<WAVE_REGISTRY_DIR>/registry.db`. Prints the full match list, aborts on zero rows,
refuses a write without `--where`. New versus OIL: for `spec_statement` and `finding`,
`--note` is required and the script appends the history row (`statement_history` with
`old_text`, or `status_history`) in the same transaction as the update, so ruling (vii)
"history first, then status" cannot be forgotten. After any `spec_statement` write it
regenerates `spec-exec.db` by calling the projection tool.

### `red-gate.md`

Verbatim. Item 7's example changes from a named OIL component to "the house conventions
section of `AGENTS.md`".

### `AGENTS.md.hbs`

Sections and their treatment:

- Environment, Scope discipline, Verification contract: near-verbatim, with the OIL
  examples (the form component, `next build`, `.next/types`) replaced by placeholders
  the scaffolder fills from detection: `{{BUILD_CMD}}`, `{{TEST_CMD}}`,
  `{{TEST_BIN_HINT}}` (for example `./node_modules/.bin/vitest`, since the package
  manager launcher hangs in the sandbox), `{{ENV_FILE}}`.
- House conventions: the recipient's lines, or a TODO block that names what belongs there
  (indirections that must not be bypassed, styling tokens, copy rules, sibling parity,
  comment discipline).
- Type evidence: the three language-agnostic rules (parse at the boundary once; contracts
  name real types; one assertion with its invariant, in a `// SAFETY:` comment), without
  the zod, Prisma and `Record` specifics.
- Tests and mocking: Red before Green with pasted output; tests dispatch no LLM calls;
  mock at named boundaries only; run binaries directly in the sandbox. The `vi.mock`
  `importOriginal` and mock-sweep rules render only when the test runner is vitest.
- Polish typography: dropped.

### Project `CLAUDE.md` section

A generalized "Wave dispatch (controller-side)": roles; dispatch only via the skill (raw
`codex exec` is permission-denied); model choice; what the controller owns (commits from
worktrees, network-gated suites, builds); gates on high-risk, deletion-shaped or
refutation-critical tasks; red briefs carry the checklist; plan snippets are untrusted;
task branches carry code only, registry flips in the main checkout; the seal policy with a
placeholder for the project's external-cost keys. Registry sentences render only with a
registry.

### Registry

`schema.sql` (one database, `registry.db`):

- `spec_statement(id, area, text, basis, status, stage, parity_ref)` with the OIL CHECKs
  on `basis` (`parity-confirmed | ruling | mockup | fix-target:<id>`) and `status`
  (`proposed | flagged | approved | amended | rejected`); `stage` is `W<n>`, `parity`,
  `none` or NULL.
- `spec_ref(statement_id, ref_type, ref)`, `statement_history(statement_id, date, status,
  note, old_text)`.
- `finding(id, kind, title, class, severity, status, description, impact, code_locus)`
  with the status trigger; `provenance`, `decision`, `finding_decision`,
  `status_history`, `ban_entry`, `meta`.

Tools (Python 3, standard library only):

- `gen-spec-exec.py`: the OIL script with paths generalized; approved statements only,
  `code_locus` joined from `spec_ref`, no `ban_entry`.
- `gen-review-panel.py [--pending-only]`: the OIL S3 panel with the hardcoded area list,
  group intros and screenshot index removed; areas come from `SELECT DISTINCT area`;
  each statement gets keep, change (with a text box) or remove; state in `localStorage`;
  export is one JSON file the panel offers as a download and as copy-to-clipboard. Local
  HTML, never an artifact (artifacts block downloads).
- `ingest-review.py <export.json>`: applies verdicts: keep sets `approved`, change replaces
  the text and sets `amended`, remove sets `rejected`; every change writes its history row
  with `old_text`; prints a per-verdict count and refuses an export whose ids are unknown.

`README.md` under `docs/registry/` carries the contract (statements verbatim are the
acceptance criteria; execution agents read `spec-exec.db` only; history first; the
registry converges to the built app; local exhaustiveness fine, global exclusivity
reserved; bans never fed to code agents) and the canonical queries.

## Playbook skill `running-waves`

`SKILL.md` stays short: the role split; the lifecycle in about a dozen lines pointing at
the references; the hard rules (the controller never implements; every dispatch goes
through the script; briefs carry statements verbatim; gates scale to risk; the controller
re-runs what the sandbox blocks; registry flips only in the main checkout; compact at
tranche boundaries; delegate debugging). References load on demand:

| File | Content |
|---|---|
| `lifecycle.md` | thirteen steps from spec to seal: actor, artifact, gate before the next step |
| `rulings.md` | the eight ruling groups (roles and models; briefs; gates; verification; git and worktrees; controller context; registry; cost), each ruling with its why |
| `brief-template.md` | the nine-part brief as a fill-in file; the fix-round variant with a file allowlist; the report contract with the status enum `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` |
| `plan-template.md` | header, global constraints, wave shape, task classification table (task, statements, risk, Codex model, Opus gate), task block with Red and Green steps and commit message |
| `review-prompt.md` | the task review prompt: requested, claimed, diff under review with base and head, no subagents, do not trust the report, verdict format |
| `gate-prompt.md` | the red-gate dispatch prompt including the mutant list for the wrong-Green probe and the revert instruction |
| `ledger-template.md` | `progress.md` shape: topology, produces-versus-consumes conflict scan, rulings R1..Rn with why and cost if wrong, per-task status lines |
| `registry-process.md` | S0 to S4 generalized; statement writing rules; panel, ingest and projection usage; flips; ban entries |
| `seal-checklist.md` | masked external keys, live subset at retries 0, ban grep, wave report, the `stage='W<n>'` count invariant, push on owner call |
| `troubleshooting.md` | stdin stall, `--last`, resume cwd, package-manager hang in the sandbox, trust prompts, hollow green without the env file |

Source for all of it: the process digest and the current OIL prompts, generalized with the
OIL-specific terms replaced by the parameter names listed under "OIL-specific versus
generic" in the digest.

## Testing

Scripts first, TDD with `node --test` (the `claude-team` convention), tests written and
shown failing before the scripts exist:

- Templates: every `.hbs` renders with a sample knob set and no `{{` survives; the
  registry-conditional blocks disappear when the registry is off.
- `dispatch.sh` against a temp git repository with a fake `codex` on `PATH` that records
  argv, cwd and stdin length: worktree and branch created under the configured root; env
  file copied when configured, skipped when empty; install command ran; argv carries
  `--sandbox workspace-write`, `-m`, `model_reasoning_effort`, `--output-last-message`;
  stdin length is 0; the log file exists; a non-kebab id, an existing worktree, a missing
  configured env file and a missing `wave.env` are each refused with exit 1. `resume`
  finds the session in a fake sessions dir under an overridden `HOME`, runs with cwd equal
  to the worktree, and rejects an unknown task. `clean` removes the worktree and keeps the
  branch.
- Hooks fed JSON on stdin: plain commit on the main checkout passes; commit on a task
  branch staging a registry file blocks; raw `UPDATE ... SET` against `registry.db` blocks;
  the same through `registry-write.sh` passes; prose containing "hard delete" passes;
  missing `wave.env` passes.
- `registry-write.sh` on a temp database from `schema.sql`: prints the match list, aborts
  on zero rows, refuses a write without `--where`, refuses a `spec_statement` write
  without `--note`, writes the history row with `old_text` and regenerates the projection.
- Tools: the projection holds only approved statements and no ban table; the panel renders
  every pending statement and its export round-trips through the ingest script, which
  refuses an unknown id.

Skills follow writing-skills: for each of `setup`, `init` and `running-waves`, a baseline
scenario is run with a subagent before the SKILL.md exists and its failures are recorded
verbatim, then the skill is written against those failures and the scenario re-run.
Scenarios: `setup` on a copy of the old-template CLAUDE.md with a personal section
(baseline risk: substitution instead of merge); `init` on a sample pnpm repository
(baseline risk: missing permission deny, placeholders left in files); `running-waves` with
three pressure scenarios (a failing suite tempts in-thread debugging; a Codex green claim
without a controller re-run; a raw `codex exec` shortcut when the script is "slower").

The CLAUDE.md merge is checked by hand against two inputs: a fresh render of the old
template and the owner's own current file.

## Docs

- README: an English section "wave" placed after the `claude-team` sections: install
  (marketplace already added, `/plugin install wave@claude-team-onboarding`,
  `/reload-plugins`), what `setup` changes and what `init` writes, a ten-line first-wave
  walkthrough, the update note (`/plugin update`, re-run `init` to refresh scripts), and
  the sentence that the `codex@openai-codex` plugin is unrelated.
- `marketplace.json`: description in English, both plugins listed.
- Versions: marketplace and `wave` at 0.1.0; `claude-team` unchanged.

## Side work on the owner's machine

`~/.claude/settings.json` and `~/.claude/plugins/known_marketplaces.json` still point the
marketplace at `~/Code/claude-team-onboarding`, which moved to `~/Code/MCP/`. Re-register
the marketplace from the new path (`/plugin marketplace remove` then `add`), then install
`wave` locally to verify the manifest.

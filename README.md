# claude-team-onboarding

Plugin marketplace + single plugin (`claude-team`) for Jakub Adamski's Claude Code teaching curriculum. Delivers a ~20-minute Polish-language interactive onboarding that installs a baseline plugin set, portable Node hooks, Python + JavaScript stack tooling, git identity, and a personalized global `CLAUDE.md` — idempotent and resume-safe.

## Install (student-facing)

### Claude Code Desktop (Mac / Windows)

The Code tab has two input surfaces that are easy to confuse:

- The **prompt box** at the bottom (where you normally chat with Claude) — **does not** accept plugin-management slash commands. Typing `/plugin …` here returns `/plugin isn't a recognized command here. Some commands only work in the Claude Code terminal.`
- The **integrated terminal pane** — opens with **Ctrl + `** (backtick) or **Views → Terminal**. Plugin commands go here.

Steps:

1. Open the **Code** tab and pick any project folder.
2. Open the integrated terminal (**Ctrl + `** or **Views → Terminal**).
3. In the terminal, run these three commands, each followed by Enter:
   ```
   /plugin marketplace add Cracy660/claude-team-onboarding
   /plugin install claude-team@claude-team-onboarding
   /reload-plugins
   ```
   When `install` asks for scope, pick **User**.
4. Close the terminal pane. In the normal prompt box, type:
   ```
   /claude-team:onboarding
   ```
   (or just chat `zacznij onboarding`). The interview takes over in Polish.

### Claude Code CLI (Linux or anyone running `claude` in a terminal)

Run all four commands directly — no Code tab / terminal distinction applies:

```
/plugin marketplace add Cracy660/claude-team-onboarding
/plugin install claude-team@claude-team-onboarding
/reload-plugins
/claude-team:onboarding
```

## What it installs

**Baseline plugins (every student):**
- `superpowers` — brainstorming, writing-plans, subagent-driven-development
- `skill-creator` — tools for building custom skills
- `context7` — on-demand library docs
- `claude-md-management` — utilities for maintaining CLAUDE.md
- `frontend-design` — UI design heuristics
- `pyright-lsp` + `typescript-lsp` — language servers for Python and TS/JS

**Portable Node hooks** (`~/.claude/hooks/`):
- `protect-files.mjs` — blocks edits to `.env*` and lock files
- `commit-gate.mjs` — blocks commits when tsc/tests/ruff/pytest fail
- `auto-format.mjs` — runs ruff/prettier/eslint after every edit
- `post-compact.mjs` — re-injects current plan phase after context compaction
- `test-review` (inline prompt hook) — reviews new test files for anti-patterns

**Stacks:**
- Python: `uv`, `ruff`, `pytest`, `src/`-layout
- JS/TS: `npm`, `Vite`, `TypeScript`, `Prettier`, `ESLint`, `Vitest`, `Tailwind`

**Status line:** `ccstatusline` configured with session + weekly usage (important for Claude basic plan).

**Personalized `~/.claude/CLAUDE.md`** assembled from the student's answers.

## For Kacper (team IT)

The skill emits structured diagnostic blocks on any failure, ready to paste into email or Telegram:

```
[CLAUDE-TEAM-ONBOARDING DIAGNOSTIC]
version: 0.1.0
section: <N>
os: <platform>
command: <failed command>
exit_code: <N>
stderr: |
  ...
state_file: <path>
[/DIAGNOSTIC]
```

Known friction points: `winget install astral-sh.uv`, `npm install -g <lsp-binary>`, occasional admin prompts on Windows. Install this plugin yourself a week in advance to see every decision the skill makes.

Student state file (inspectable): `~/.claude/team-onboarding-state.json` / `%USERPROFILE%\.claude\team-onboarding-state.json`.

## Development

### Run hook tests

```
cd plugins/claude-team/hooks
npm test
```

### Directory layout

```
claude-team-onboarding/
├── .claude-plugin/marketplace.json    ← declares marketplace + plugin
└── plugins/claude-team/
    ├── plugin.json
    ├── skills/onboarding/
    │   ├── SKILL.md                   ← orchestration logic
    │   └── references/                ← Polish lesson docs (lazy-loaded)
    ├── commands/onboarding.md         ← /claude-team:onboarding
    ├── hooks/                         ← portable Node scripts + tests
    └── templates/
        ├── CLAUDE.md.pl.hbs
        ├── settings-baseline.json
        ├── ccstatusline/settings.json
        └── prompts/                   ← 13 Polish section prompts
```

## wave: multi-model wave execution

The second plugin in this marketplace packages a working method rather than a curriculum. A Claude session plans, dispatches, reviews and merges. Codex implements each task in a sandboxed git worktree. An adversarial gate agent tries to refute every green claim on the risky tasks. A SQLite statement registry holds the approved spec, and the statements are the acceptance criteria reviewers check against.

It ships two entry points: `/wave:setup` for the machine, `/wave:init` for a repository. Scripts and hooks are bash, so macOS or Linux, or Windows through WSL. Node is only the test runner. You need a ChatGPT plan that includes Codex.

### Install

The marketplace is the one that already carries `claude-team`. If you have it registered, these two commands are all you need:

```
/plugin install wave@claude-team-onboarding
/reload-plugins
```

On a machine that has never seen this marketplace, add it first with `/plugin marketplace add Cracy660/claude-team-onboarding`. Then run `/wave:setup` once, and `/wave:init` in every repository you want to run waves in.

### What `/wave:setup` changes

Once per machine. It never runs an install itself: it presents each command for you to run and confirm, the way the onboarding skill does.

- **Codex preflight.** Checks `codex --version` and `codex login status`, and presents `npm install -g @openai/codex` and `codex login` when they are missing. It does not write `~/.codex/config.toml`: sandbox and model policy live in the dispatch script, where they cannot drift.
- **Superpowers check.** Confirms `superpowers@claude-plugins-official` is enabled and presents the install command when it is not. Your hooks are not touched.
- **Global `CLAUDE.md` merge.** Backs the file up to `CLAUDE.md.pre-wave-<timestamp>.bak`, then adds or amends only the method sections: Multi-Model Execution, Test-Driven Development, Workflow, Planning Workflow, Git, Archival. Your own sections, your git identity and your push rule are never touched. You see a unified diff and confirm before anything is written.

### What `/wave:init` writes

Run it in the main checkout of a git repository. It detects the package manager, env file, test and build commands, asks the remaining knobs in one message, and then writes:

- `.claude/wave.env`, the single file every script and hook reads. Worktree root, branch prefix, env file, install command, model tiers, log directory, registry directory.
- `.claude/settings.json`, merged, never replaced: `codex exec` and `codex resume` are denied so no dispatch can skip the script, the two script paths are allowed, the two hooks are appended, and every other key survives.
- `.claude/hooks/code-only-branch.sh` and `.claude/hooks/registry-guard.sh`. The first keeps registry writes out of task branches, the second keeps raw SQL out of the registry database.
- `.claude/skills/dispatch/` with `dispatch.sh`, the only sanctioned way to start Codex, and `.claude/skills/registry/` with the guarded `registry-write.sh`.
- `.claude/agents/red-gate.md`, the refutation checklist the gate runs.
- `AGENTS.md`, the implementer contract Codex reads, and a `## Wave dispatch (controller-side)` section appended to the project `CLAUDE.md`.
- `docs/registry/` with `schema.sql`, an initialized `registry.db`, the three Python tools and the contract README, when you asked for a registry.

Every file that already exists is backed up as `<name>.pre-wave-<timestamp>.bak` before it is merged, and new files are written atomically.

### A first wave in ten lines

1. Brainstorm the spec with superpowers and get it approved before any plan exists.
2. Insert the approved statements into the registry, review them in the generated panel, ingest the verdicts, leave nothing pending.
3. Send recon to subagents and keep the findings in a facts file, never in the controller session.
4. Write the plan with superpowers writing-plans: statements verbatim, one task per test cycle, a risk and gate column.
5. Build the ledger in `.superpowers/sdd/<plan>/progress.md`: topology, the produces versus consumes conflict scan, the rulings with their cost if wrong.
6. Write the brief for the first task from the brief template, statements quoted verbatim, bans explicit.
7. Dispatch it with `.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file>` and read the report, not the transcript.
8. Re-run yourself everything the sandbox blocked: database suites, the build, anything that needs the network. A Codex green never covers those.
9. Gate the high-risk tasks with the red-gate agent, review every task, then merge the branch from its worktree.
10. Flip the registry in the main checkout, seal the wave with the checklist, and push when the owner says so.

The `running-waves` skill carries the long form of every step, plus the rulings behind them.

### Updating

`/plugin update wave@claude-team-onboarding` refreshes the plugin itself. The scripts and hooks inside a repository are copies, so re-run `/wave:init` there to refresh them. Your previous answers are read back from `.claude/wave.env` and offered as defaults.

### Not the `codex@openai-codex` plugin

That plugin is a different path into Codex and this loop does not use it. Having it installed alongside is harmless. `/wave:init` denies raw `codex exec`, so dispatches keep going through the script that enforces the worktree, the sandbox flag and the terminated stdin.

### Verify a local install

To install from a local checkout instead of GitHub, re-register the marketplace from its path. This is also the fix after the checkout has moved:

```
/plugin marketplace remove claude-team-onboarding
/plugin marketplace add <path-to-your-checkout>
/plugin install wave@claude-team-onboarding
/reload-plugins
```

`<path-to-your-checkout>` is the absolute path of this repository on your machine. Then run `/wave:init` in a throwaway git repository and check that it wrote:

```
.claude/wave.env
.claude/settings.json
.claude/hooks/code-only-branch.sh
.claude/hooks/registry-guard.sh
.claude/skills/dispatch/SKILL.md
.claude/skills/dispatch/scripts/dispatch.sh
.claude/skills/registry/SKILL.md
.claude/skills/registry/scripts/registry-write.sh
.claude/agents/red-gate.md
AGENTS.md
CLAUDE.md
docs/registry/schema.sql
docs/registry/registry.db
docs/registry/tools/gen-spec-exec.py
docs/registry/tools/gen-review-panel.py
docs/registry/tools/ingest-review.py
```

No file should contain a `{{` placeholder, and `.claude/settings.json` should deny `Bash(codex exec:*)`.

### Run the wave tests

```
cd plugins/wave/tests
npm test
```

## License

MIT

## Status

**v0.1.0 — initial release.** See `docs/superpowers/specs/2026-04-20-team-onboarding-design.md` for the full design and `docs/superpowers/plans/2026-04-20-team-onboarding-implementation.md` for implementation history.

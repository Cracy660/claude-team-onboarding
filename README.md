# claude-team-onboarding

Plugin marketplace + single plugin (`claude-team`) for Jakub Adamski's Claude Code teaching curriculum. Delivers a ~20-minute Polish-language interactive onboarding that installs a baseline plugin set, portable Node hooks, Python + JavaScript stack tooling, git identity, and a personalized global `CLAUDE.md` — idempotent and resume-safe.

## Install (student-facing)

In Claude Code Desktop (Mac/Windows/Linux):

```
/plugin marketplace add jakubadamski/claude-team-onboarding
/plugin install claude-team@claude-team-onboarding
/reload-plugins
/claude-team:onboarding
```

Or just chat "zacznij onboarding".

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

## License

MIT

## Status

**v0.1.0 — initial release.** See `docs/superpowers/specs/2026-04-20-team-onboarding-design.md` for the full design and `docs/superpowers/plans/2026-04-20-team-onboarding-implementation.md` for implementation history.

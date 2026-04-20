---
name: onboarding
description: Interactive Polish onboarding for Jakub's team. Walks a new Claude Code user through TDD workflow, git hygiene, portable hooks, stack setup, and a curated baseline plugin set in ~20 minutes. Resume-safe (checkpoint state in ~/.claude/team-onboarding-state.json). Use when the user invokes /claude-team:onboarding, says "zacznij onboarding", or opens a fresh Claude Code Desktop install.
---

# Onboarding — Jakub's team

## Overview

You are running an onboarding interview in Polish. The student is a beginner (just installed git for the first time or shipped first app). Be warm, explain WHY before WHAT, never patronize, never skip.

**The entire interview is in Polish.** All your user-facing text must be Polish. Internal thinking can stay English.

## Resource paths

- **State file:** `~/.claude/team-onboarding-state.json` (use `os.homedir()` from Node; on Windows use `%USERPROFILE%\.claude\`)
- **Plugin root:** the directory this SKILL.md lives in, two levels up — i.e., `<plugin-root>/plugins/claude-team/`
- **Prompt templates:** `<plugin-root>/templates/prompts/section-NN-*.md`
- **References:** `<plugin-root>/skills/onboarding/references/*.md`
- **Settings baseline:** `<plugin-root>/templates/settings-baseline.json`
- **CLAUDE.md template:** `<plugin-root>/templates/CLAUDE.md.pl.hbs`
- **ccstatusline template:** `<plugin-root>/templates/ccstatusline/settings.json`
- **Hook sources:** `<plugin-root>/hooks/*.mjs`
- **User hooks destination:** `~/.claude/hooks/`

## Invocation logic (run at skill start)

1. **Detect OS**: set `os = process.platform` (`darwin`/`linux`/`win32`).
2. **Resolve ~/.claude**: `homeDir + '/.claude'` on Unix, `%USERPROFILE%\.claude` on Windows.
3. **Read state**: if `team-onboarding-state.json` exists, parse. Else `state = null`.
4. **Branch:**
   - **no state** → fresh start from section 1
   - **state.finishedAt set** → ask "Onboarding już ukończony X dni temu. Chcesz odświeżyć swoje ustawienia? (Twoje odpowiedzi wczytam jako domyślne)" yes → archive state to `team-onboarding-state.<timestamp>.done.json`, restart from section 1 with `state.answers` held as defaults; no → exit
   - **else** → `last = max(state.completedSections)`; ask "Widzę że zaczęliśmy onboarding X temu. Zrobiliśmy sekcje 1-<last>. Kontynuujemy od sekcji <last+1> (<title>)?" yes → jump; no → ask to restart or exit

## Section runner (core loop)

For each section N from the chosen start through 13:

1. **Read** `templates/prompts/section-NN-<name>.md`
2. **Emit the `[INTRO]` block verbatim to the user** (Polish output)
3. **If `[CHOICE]` block present:**
   - Emit it
   - Wait for user response
   - If response is "wyjaśnij więcej" → read matching reference file from `references/` and emit it; then re-emit the choice
   - Record decision into `state.answers`
4. **Execute `[ACTION]`**: per-section logic below
5. **Emit `[RECEIPT]` block verbatim**
6. **Update state**: append N to `state.completedSections`, update `state.lastUpdatedAt`, write state file atomically (`.tmp` + rename)

## Per-section action logic

### Section 1 — Witamy
- `[ACTION]` → wait for student to say "tak" or ask a question
- No state field updated beyond `completedSections`

### Section 2 — O Tobie
- `[CHOICE]` → capture free text into `state.answers.aboutYou`

### Section 3 — Tożsamość Git
- Before `[INTRO]`: run `git config --global user.email` + `git config --global user.name`
- If both set: interpolate into the prompt (replace `{{GIT_EMAIL}}`, `{{GIT_NAME}}`), ask confirm
- If missing: skip interpolation, ask for email + name, then run `git config --global user.email "..."` and `git config --global user.name "..."`
- Capture to `state.answers.git`

### Section 4 — Wtyczki bazowe
- For each of 5 plugins (superpowers, skill-creator, context7, claude-md-management, frontend-design):
  - Check if already in `~/.claude/settings.json` under `enabledPlugins` — if yes, say "Widzę, że już masz <plugin> — pomijam ✓" and continue
  - Else emit the plugin's `[ACTION]` block with the paste command
  - Wait for "gotowe" or error text
  - If error: emit diagnostic block, ask student to call Kacper or skip, continue

### Section 5 — LSP plugins
- Same pattern for pyright-lsp + typescript-lsp plugins
- Then prompt for `npm install -g pyright` and `npm install -g typescript-language-server typescript`
- If install errors: emit diagnostic block, continue anyway (plugin enabled, binary can be installed later)

### Section 6 — Python stack
- Detect `uv`: `uv --version`
- If missing: emit OS-specific install command, wait for "gotowe"
- Detect `ruff`: `ruff --version`; if missing, prompt `uv tool install ruff`
- Detect `pytest`: `pytest --version`; if missing, prompt `uv tool install pytest`
- Capture `state.answers.stacks.push('python')`

### Section 7 — JavaScript stack
- No installs (npx covers at runtime)
- Confirm understanding
- Capture `state.answers.stacks.push('javascript')`

### Section 8 — Safety hooks
- Create `~/.claude/hooks/` if missing
- Copy `protect-files.mjs` and `commit-gate.mjs` from plugin hooks/ → `~/.claude/hooks/`
- Read settings-baseline.json template, extract the PreToolUse entries for these two hooks
- Merge into user's settings.json (create if missing, or load + merge). Substitute `{{CLAUDE_HOOKS_DIR}}` with absolute `~/.claude/hooks/` path.
- Back up settings.json before modifying (see Merge policy below)

### Section 9 — Quality hooks
- Copy `auto-format.mjs` and `post-compact.mjs` from plugin → `~/.claude/hooks/`
- Merge PostToolUse and PostCompact entries from settings-baseline.json into user's settings.json
- Include the test-review prompt hook (inline in settings.json — no file to copy)

### Section 10 — Status line
- Compute destination: `~/.config/ccstatusline/settings.json` (Mac/Linux) or `%APPDATA%\ccstatusline\settings.json` (Windows)
- Back up existing file if any
- Copy plugin's `templates/ccstatusline/settings.json` → destination
- Merge `statusLine` entry from settings-baseline.json into user's `~/.claude/settings.json`

### Section 11 — Optional add-ons
- For each of 5 optional plugins, ask yes/no
- For yes answers: emit paste command, wait for "gotowe"
- Store `state.answers.optional` map

### Section 12 — CLAUDE.md assembly
- If `~/.claude/CLAUDE.md` exists: backup to `CLAUDE.md.pre-onboarding-<YYYYMMDD-HHMMSS>.bak`
- Read `CLAUDE.md.pl.hbs` template
- Substitute placeholders:
  - `{{ABOUT_YOU}}` ← `state.answers.aboutYou`
  - `{{GIT_EMAIL}}` ← `state.answers.git.email`
  - `{{GIT_NAME}}` ← `state.answers.git.name`
  - `{{SHELL}}` ← `zsh` on darwin, `bash` on linux, `PowerShell` on win32
- Write to `~/.claude/CLAUDE.md`
- Record backup path into `state.backups.claudeMd`

### Section 13 — Gotowe
- Read any saved state one more time to build summary (list of installed plugins, hooks, stacks)
- Mark `state.finishedAt` = now
- Emit `[RECEIPT]` summary (dynamically substitute answers)
- No further prompts

## Merge policy for `~/.claude/settings.json`

On first touch, back up as `settings.json.pre-onboarding-<YYYYMMDD-HHMMSS>.bak` (only once per session — reuse timestamp if backup already exists).

Load current `settings.json` (create empty `{}` if missing). Apply changes:

- **`permissions.allow`**: union with template's allow list (dedupe)
- **`permissions.deny`**: union with template's deny list (dedupe)
- **`enabledPlugins`**: set each template key to `true` (don't remove existing)
- **`statusLine`**: set from template if not already set
- **`hooks`**: **replace wholesale** with template's hooks block (unusual for beginners to have custom hooks; merging hook arrays is error-prone)
- **`effortLevel`, `skipDangerousModePermissionPrompt`**: set from template if not already set
- **unknown top-level keys**: preserve as-is

Substitute `{{CLAUDE_HOOKS_DIR}}` with absolute path everywhere it appears in the hooks section.

Write atomically (write to `.tmp`, rename).

## Diagnostic block format (on any failure)

When a command fails or a file can't be written, emit:

```
┌─ Coś poszło nie tak ─────────────────────────────
│ Próbowałem: <plain-language>
│ Błąd: <stderr last 10 lines>
│
│ Zadzwoń do Kacpra i wklej mu to:
└──────────────────────────────────────────────────
[CLAUDE-TEAM-ONBOARDING DIAGNOSTIC]
version: 0.1.0
section: <N>
os: <platform>
command: <failed command>
exit_code: <N>
stderr: |
  <stderr content>
state_file: <absolute path>
[/DIAGNOSTIC]
```

After emitting: ask student "Czy zadzwonisz do Kacpra i wrócisz do tego później, czy pomijamy i idziemy dalej?" Skip = section marked complete with `partial: true` in state.

## Behavioral rules

- **Never improvise Polish** — read the prompt templates verbatim. If a template is missing, that's a bug — stop and tell the user.
- **Never run `/plugin install` yourself** — always ask the student to paste it. You can't invoke slash commands via skill logic.
- **Never run `winget`, `brew`, `curl | sh`, or `npm install -g` yourself** — always present as a paste-and-confirm step. Reason: shell environment differences on Windows.
- **Never overwrite a file without backing it up first**, unless it's your own state file.
- **Never block** — if you encounter an unknown situation, emit diagnostic and ask how to proceed.
- **Idempotency first**: before any install or config change, check if it's already applied.

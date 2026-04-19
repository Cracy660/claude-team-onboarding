# Team Onboarding Plugin — Design Spec

- **Date:** 2026-04-20
- **Status:** Approved (design), pending implementation plan
- **Author:** Jakub Adamski (spec drafted collaboratively via brainstorming)
- **Target launch:** Board-group onboarding lesson, week of 2026-04-27

## 1. Context

Jakub teaches a small group (8 current students + a new board cohort starting next week) to use Claude Code Desktop for building AI-assisted apps. The students are beginners — most just installed git for the first time, and have already shipped their first app — running at this point on the Claude basic plan with a mix of Mac and mostly Windows machines. WSL is not guaranteed on Windows.

Jakub has a refined personal Claude Code setup: a comprehensive global `CLAUDE.md` (TDD, planning-first workflow, conventional commits, formatting hooks, commit-gating, status line with usage tracking) and a curated set of plugins. The team has been learning workflow pieces by hand (writing `spec.md` / `plan.md` manually for three lessons). It is time to reduce that friction and give them all a uniform starting setup — but as **an onboarding lesson**, not a silent install.

The past distribution mechanism (a `.skill` file attached to email) is being replaced with a public GitHub plugin marketplace. The new delivery is itself pedagogical: students learn what a plugin is, how marketplaces work, and how a well-crafted skill feels.

Kacper is the team's IT escape hatch — the skill explicitly hands off to him whenever it hits a permission wall or unknown failure mode.

## 2. Goals

- A single slash command gives a student Jakub's production setup, uniformly, in ~20 minutes
- Non-negotiable team standards (TDD, planning-first, git hygiene, safety hooks, usage-aware status line) are installed with **the reasoning explained in Polish** — not dictated silently
- Personalization captured via one open-ended question ("what should Claude know about you?") and written into their CLAUDE.md
- Works on mostly-Windows cohort without WSL, without admin wizardry, without Kacper present every step of the way
- Pause-and-resume safe: students can stop mid-interview and come back; no lost work
- Idempotent-safe: re-running never destroys prior configuration (v2 will be full idempotent-refresh)
- The skill itself is a teaching artifact — students will later read its source as a reference for "what a good skill looks like"

## 3. Non-goals (v1)

- No Telegram bot token setup (Kacper territory)
- No corporate-network / proxy handling
- No monorepo handling beyond `CLAUDE_PROJECT_DIR`
- No package-manager pluralism — assumes `winget` on Windows, `brew` on Mac, `uv` as Python package manager
- No enforcement of anything at runtime (hooks do that, not the skill)
- No migration path from the old `.skill` file distribution — clean cutover

## 4. Users and usage

### Primary users

- **Current 8 students** — already past the first-app milestone; some experienced enough that skipping TDD would be risky
- **New board cohort starting 2026-04-27** — greenfield machines, no previous Claude Code customization, need painless first setup; gets the skill a few weeks into curriculum, not day 1

### Usage ritual

```
/plugin marketplace add jakubadamski/claude-team-onboarding
/plugin install claude-team@claude-team-onboarding
/reload-plugins
/claude-team:onboarding              ← or simply chat "zacznij onboarding"
```

Four typed commands total. Then a ~20-minute interactive interview in Polish.

### Naming conventions (locks ambiguity)

- **GitHub repo**: `claude-team-onboarding` (matches marketplace name — convenient for `owner/repo` shortform)
- **Marketplace name** (in `.claude-plugin/marketplace.json`): `claude-team-onboarding`
- **Plugin name** (in `plugins/claude-team/plugin.json`): `claude-team`
- **Skill**: `plugins/claude-team/skills/onboarding/SKILL.md` → skill name `onboarding`
- **Command**: `plugins/claude-team/commands/onboarding.md` → invocation `/claude-team:onboarding`
- **Install command**: `/plugin install claude-team@claude-team-onboarding`

All slash commands namespaced by plugin name (`claude-team`), per Claude Code plugin docs.

### Kacper's role

- Receives the plugin in advance so he can pre-learn every decision the skill makes
- Gets called when students hit any admin/permission wall or unknown error
- Receives diagnostic blocks from the skill that he can paste directly into a debugging workflow

## 5. Architecture overview

### Decisions locked in via brainstorming

| Decision | Choice | Reason |
|---|---|---|
| Philosophy | Hybrid: non-negotiable + stack-dependent + optional + personalized | Teacher-with-curriculum, not consultant offering options |
| Distribution | Public GitHub repo as a single-plugin marketplace | One `/plugin marketplace add owner/repo`, one `/plugin install`. Nothing secret; public repo doubles as curriculum artifact |
| OS target | Mostly Windows without WSL, some Mac, some Linux | Portable Node hooks required; no bash assumptions |
| Hook implementation | Portable Node.js `.mjs` scripts | Runs on every OS via the Node that Claude Code already ships with; no jq/awk/grep dependencies |
| Flow shape | 4-beat (intro → choice → action → receipt) × 13 sections | Uniform rhythm; each section a natural checkpoint; pedagogically embeds "what good skills feel like" |
| State | `~/.claude/team-onboarding-state.json` with checkpoint-after-section writes | Pause-and-resume safe; Kacper-inspectable |
| Tool install | Skill shows copy-paste commands, student pastes in their own shell | No shell-detection complexity; students learn real install syntax |
| Pre-existing config | Backup + merge (v1), full idempotency (v2) | Safety first; cohort is mostly clean slate so edge cases are rare |

## 6. Plugin repository layout

Repository: `github.com/jakubadamski/claude-team-onboarding` (public, MIT or similar)

```
claude-team-onboarding/
├── README.md                              ← EN + PL install instructions + overview
├── LICENSE
├── .gitignore
├── .claude-plugin/
│   └── marketplace.json                   ← declares marketplace "claude-team-onboarding" with one plugin "claude-team"
└── plugins/
    └── claude-team/
        ├── plugin.json                    ← plugin manifest (name: "claude-team")
        ├── skills/
        │   └── onboarding/
        │       ├── SKILL.md               ← main skill file, Polish interview logic
        │       └── references/            ← long content the skill lazy-loads
        │           ├── hook-explanations-pl.md
        │           ├── tdd-lesson-pl.md
        │           └── planning-lesson-pl.md
        ├── commands/
        │   └── onboarding.md              ← `/claude-team:onboarding` slash command
        ├── hooks/                         ← portable Node hook implementations
        │   ├── protect-files.mjs
        │   ├── commit-gate.mjs
        │   ├── auto-format.mjs
        │   └── post-compact.mjs
        └── templates/                     ← text content shipped to user's machine
            ├── CLAUDE.md.pl.hbs           ← Mustache-style template with answer placeholders
            ├── settings-baseline.json     ← starting-point settings.json
            ├── ccstatusline/
            │   └── settings.json          ← Jakub's exact ccstatusline config, verbatim
            └── prompts/                   ← per-section Polish prompt text
                ├── section-01-welcome.md
                ├── section-02-about-you.md
                ├── section-03-git-identity.md
                ├── section-04-baseline-plugins.md
                ├── section-05-lsp-plugins.md
                ├── section-06-python-stack.md
                ├── section-07-javascript-stack.md
                ├── section-08-safety-hooks.md
                ├── section-09-quality-hooks.md
                ├── section-10-statusline.md
                ├── section-11-optional-addons.md
                ├── section-12-claude-md.md
                └── section-13-finish.md
```

### Why this layout

- **Templates as text files**, not hardcoded strings: Jakub (and Kacper) can edit Polish wording in a normal editor without touching skill logic.
- **SKILL.md stays short**: ~300 lines of flow + decision logic, delegating content to `templates/` and `references/`. Matches the pattern used by mature superpowers skills.
- **Hooks live in the plugin** at known paths; the skill copies them into `~/.claude/hooks/` at install time (so the user's settings.json has stable absolute paths that survive plugin cache moves).
- **One plugin in the marketplace**: simpler story for students. The marketplace can grow later (e.g., an `oil-style-guide` plugin) without requiring students to re-add anything.

## 7. Interview flow

### Section order and timing

| # | Section | Polish title | Duration | Notes |
|---|---|---|---|---|
| 1 | Welcome | Witamy | ~1 min | Sets expectations, mentions pause-anytime |
| 2 | Personalization | O Tobie | ~2 min | Single open-ended question captured for CLAUDE.md |
| 3 | Git identity | Tożsamość Git | ~2-3 min | Detect existing `git config`; set if missing; teach conventional commits |
| 4 | Baseline plugins | Wtyczki bazowe | ~5 min | 5 paste-confirms (see Section 8 below) |
| 5 | LSP plugins | Wtyczki językowe (LSP) | ~3 min | 2 plugins + 2 binary installs; Kacper-fallback wording |
| 6 | Python stack | Python — Twój stos | ~3 min | `uv` install, `uv tool install ruff pytest`, src layout explained |
| 7 | JavaScript stack | JavaScript/React — Twój stos | ~2 min | Mostly explanation; no installs (npx covers) |
| 8 | Safety hooks | Hooki bezpieczeństwa | ~2 min | Copies `protect-files.mjs` + `commit-gate.mjs`; writes settings.json entries |
| 9 | Quality hooks | Hooki jakości | ~2 min | Copies `auto-format.mjs` + `post-compact.mjs`; writes `test-review` prompt hook |
| 10 | Status line | Pasek statusu | ~1-2 min | Writes ccstatusline config + enables `statusLine` in settings.json |
| 11 | Optional add-ons | Dodatki opcjonalne | ~1-2 min | Explicit yes/no per optional plugin |
| 12 | CLAUDE.md | Twój CLAUDE.md | ~2 min | Assembles file from template + answers; writes; walks through sections |
| 13 | Finish | Gotowe | ~1 min | Summary of what changed; restart-Claude-Code reminder |

**Total: ~21–24 min**.

### The 4-beat pattern (applied per section)

1. **Intro** — 2-4 sentence Polish explanation: what this section does, why it matters, what will change on their machine
2. **Choice** (if applicable) — yes/no, text answer, or acknowledgement. Omitted for welcome/finish.
3. **Action** — skill executes: writes a file, or shows a paste-this command and waits for "gotowe"
4. **Receipt** — 1-2 sentence confirmation: what just changed, where to see it, ✓

### Baseline plugins (section 4, iterated 5 times)

Installed for every student with a per-plugin 30-second rationale before the paste:

| Plugin | Rationale (Polish intent) |
|---|---|
| `superpowers@claude-plugins-official` | Workflow fundamentals: brainstorming, plan writing, plan execution with checkpoints |
| `skill-creator@claude-plugins-official` | Ability to write their own skills — covered in a later lesson |
| `context7@claude-plugins-official` | Library documentation on demand — beats outdated training knowledge |
| `claude-md-management@claude-plugins-official` | Tools to maintain their CLAUDE.md file over time |
| `frontend-design@claude-plugins-official` | Frontend design principles that improve output regardless of stack |

Each plugin's intro text mentions: *"Istnieją alternatywy (np. BMAD) — jeśli w przyszłości zechcesz je porównać, to jest dobry punkt wyjścia."* (Sets the non-dogmatic tone per Jakub's guidance.)

### LSP plugins (section 5)

Installed for everyone (not stack-gated, since both stacks are installed for everyone):

| Plugin | Required binary | Install command |
|---|---|---|
| `pyright-lsp@claude-plugins-official` | `pyright-langserver` | `npm install -g pyright` |
| `typescript-lsp@claude-plugins-official` | `typescript-language-server` | `npm install -g typescript-language-server` |

Intro explains what LSP gives them ("Claude sees type errors automatically, like a human pair programmer watching your screen"). If a binary install fails: skill prints the Kacper-diagnostic block and marks the section partially complete (plugin enabled, binary install TBD).

### Optional add-ons (section 11)

Explicit yes/no per item. Default to "no" for every newbie:

| Plugin | Default | Notes |
|---|---|---|
| `telegram@claude-plugins-official` | No | Requires bot token + Kacper help; frame as "pair programming over phone" |
| `vercel@claude-plugins-official` | No | Only if they're deploying to Vercel |
| `feature-dev@claude-plugins-official` | No | Advanced workflow; later lesson |
| `code-review@claude-plugins-official` | No | Introduce once they're doing PRs |
| `security-guidance@claude-plugins-official` | No | Introduce once they're deploying |

## 8. State management

### File

- Path: `~/.claude/team-onboarding-state.json` (Mac/Linux) or `%USERPROFILE%\.claude\team-onboarding-state.json` (Windows)
- Owner: the skill itself; never edited manually except by Kacper when debugging
- Atomic writes: write to `.tmp` sibling then rename

### Shape

```json
{
  "version": 1,
  "startedAt": "2026-04-20T09:30:00Z",
  "lastUpdatedAt": "2026-04-20T09:42:00Z",
  "completedSections": [1, 2, 3, 4],
  "answers": {
    "aboutYou": "<free text from section 2>",
    "git": { "email": "jan.k@oil.org.pl", "name": "Jan Kowalski" },
    "stacks": ["python", "javascript"],
    "optional": { "telegram": false, "vercel": false, "featureDev": false, "codeReview": false, "securityGuidance": false }
  },
  "os": "win32",
  "backups": {
    "claudeMd": "/path/to/CLAUDE.md.pre-onboarding-20260420-093045.bak",
    "settingsJson": "/path/to/settings.json.pre-onboarding-20260420-093045.bak"
  },
  "finishedAt": null
}
```

### Resume logic

On invocation, skill:
1. Reads state file
2. If no state: fresh start from section 1
3. If `finishedAt` present: ask "Onboarding ukończony X dni temu — chcesz odświeżyć?"; yes → archive + restart with answers as defaults
4. Else: `last = max(state.completedSections)`; ask "Widzę, że zaczęliście — kontynuujemy od sekcji `<last+1>`?"; yes → jump; no → ask to restart or exit

### Idempotency invariants

1. Running twice on a fresh machine ends in the same state (modulo timestamps)
2. Quitting mid-section resumes cleanly at that section
3. Re-running after completion offers refresh; previous answers preserved as defaults
4. State written atomically only after section completes (no partial state)
5. No file destroyed without a recoverable backup in `state.backups`

## 9. Hook set

Four Node scripts (portable, no dependencies) plus one prompt-type hook (text only).

### Node hooks

Shared skeleton (every `.mjs` file follows this shape):

```js
import { readFileSync } from 'node:fs'
const input = JSON.parse(readFileSync(0, 'utf8'))
// ... decision logic ...
process.exit(0)  // or 2 to block
```

| Hook file | Trigger | Behavior |
|---|---|---|
| `protect-files.mjs` | PreToolUse: Write/Edit/MultiEdit | Block edits to `.env*`, `*.lock`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `uv.lock`. Exit 2 with "BLOCKED: Protected file." on match, else 0. |
| `commit-gate.mjs` | PreToolUse: Bash, guarded by `if: Bash(git commit*)\|Bash(git push*)` | From `CLAUDE_PROJECT_DIR`: run `npx tsc --noEmit` if `tsconfig.json`; run `npm run test:run --passWithNoTests` if `package.json` has `"test:run"`; run `ruff check .` if `pyproject.toml` and `ruff` on PATH; run `pytest` if `pyproject.toml` and `pytest` on PATH. Any failure → exit 2 with "BLOCKED: Fix errors/tests before committing." |
| `auto-format.mjs` | PostToolUse: Edit/Write/MultiEdit | Run formatter by file extension: `ruff format` + `ruff check --fix` on `.py`; `npx prettier --write` on `.{ts,tsx,js,jsx,css,json,html}`; `npx eslint --fix` on `.{ts,tsx,js,jsx}`. Always exits 0. |
| `post-compact.mjs` | PostCompact | Print current non-DONE phase from `plan.md` + last 20 lines of `progress.md` from `CLAUDE_PROJECT_DIR` + a JSON `systemMessage` re-injecting the plan context. |

### Prompt hook (not Node, text in settings.json)

- `test-review` — PostToolUse: Edit/Write/MultiEdit, guarded by `if: Write(*.test.*)|Write(*.spec.*)|Edit(*.test.*)|Edit(*.spec.*)|MultiEdit(*.test.*)|MultiEdit(*.spec.*)`. Prompt asks Claude to evaluate the test file for tautological assertions, missing negative cases, existence-only checks, and circular mocks.

### PATH detection inside Node hooks

```js
function onPath(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'command -v'
  const r = spawnSync(which, [cmd], { encoding: 'utf8', shell: true })
  return r.status === 0
}
```

Used by `commit-gate.mjs` and `auto-format.mjs` to skip tools that aren't installed.

### Delivery

During sections 8 & 9, the skill:
1. Creates `~/.claude/hooks/` if missing
2. Copies each `.mjs` from `${PLUGIN_ROOT}/hooks/` to `~/.claude/hooks/<file>.mjs`
3. Writes entries to user's `~/.claude/settings.json` referencing absolute paths: `node /absolute/path/to/hooks/<file>.mjs`

Plugin updates propagate to user hooks only when they re-run onboarding (by design — gives a clear "refresh my setup" moment).

## 10. Safety & cross-platform

### OS detection

Single `process.platform` read at skill start, stored in `state.os`. Values: `darwin` / `linux` / `win32`. WSL is indistinguishable from Linux; that's fine — same behavior.

### Path resolution

| Asset | Mac/Linux | Windows |
|---|---|---|
| `.claude/` root | `$HOME/.claude/` | `%USERPROFILE%\.claude\` |
| ccstatusline config | `${XDG_CONFIG_HOME:-~/.config}/ccstatusline/settings.json` | `%APPDATA%\ccstatusline\settings.json` |
| Hooks dir | `~/.claude/hooks/` | `%USERPROFILE%\.claude\hooks\` |

Node helpers: `os.homedir()`, `process.env.APPDATA`, `process.env.XDG_CONFIG_HOME`.

### Tool presence detection

Before each paste step the skill runs the detection command and skips if the tool is already installed:

| Tool | Detection | Install if missing |
|---|---|---|
| `git` | `git --version` | n/a (Kacper installed) |
| `node`/`npm`/`npx` | `node --version` | n/a (ships with Claude Code) |
| `uv` | `uv --version` | `winget install astral-sh.uv` / `brew install uv` / `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| `ruff` | `ruff --version` | `uv tool install ruff` |
| `pytest` | `pytest --version` | `uv tool install pytest` |
| `pyright-langserver` | `pyright-langserver --version` | `npm install -g pyright` |
| `typescript-language-server` | `typescript-language-server --version` | `npm install -g typescript-language-server` |

Skipped paste emits: *"Widzę, że już masz `<tool>` zainstalowane — pomijam. ✓"*

### Backup strategy

Pattern: `<filename>.pre-onboarding-<YYYYMMDD-HHMMSS>.bak`

- Single timestamp reused across a whole onboarding session
- Skipped if a backup from today already exists (prevents accumulation on re-runs)
- All paths recorded in `state.backups`

Files always backed up before modification: existing `CLAUDE.md`, existing `settings.json`, existing ccstatusline config.

### Merge policy per target file

| File | Policy |
|---|---|
| `settings.json` | Merge: union `enabledPlugins`, `permissions.allow`/`deny`; set `statusLine`, `effortLevel`, `skipDangerousModePermissionPrompt` if missing; **replace `hooks` block wholesale** (rare for beginners to have custom hooks; merging hook arrays is brittle); preserve unknown top-level keys |
| `CLAUDE.md` | Backup + write new from template. No merge attempt. If backup has non-trivial content (>200 lines or unrecognized section headers), warn: *"Twój CLAUDE.md ma niestandardową zawartość — kopia w `<path>`, Kacper pomoże odzyskać co chcesz."* |
| `~/.config/ccstatusline/settings.json` | Backup + overwrite with Jakub's template |
| `~/.claude/hooks/*.mjs` | Overwrite (plugin is source of truth); backup if content differs from current plugin version |

### Error reporting / Kacper handoff

Every command failure produces a Polish error message with a structured diagnostic block designed for copy-paste into Telegram/email:

```
┌─ Coś poszło nie tak ─────────────────────────────
│ Próbowałem: <plain-language action>
│ Błąd: <stderr, last 10 lines>
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
state_file: <path>
[/DIAGNOSTIC]
```

### Admin/permission-wall handling

Known friction points (`winget install`, `npm install -g`, LSP binary installs): intros include: *"Możliwe, że Windows zapyta o uprawnienia administratora. Kliknij TAK. Jeśli system nie pozwoli — zatrzymaj się i zadzwoń do Kacpra, nie próbuj obejść."*

## 11. Testing strategy

Manual validation matrix before 2026-04-27 launch:

- [ ] Fresh Mac (Jakub's laptop, second user account) — full happy path
- [ ] Linux VPS (use the setup we already provisioned) — catches any POSIX-specific path issues
- [ ] One Windows machine (Kacper's) — catches winget/admin/PATH weirdness
- [ ] Deliberate quit mid-section on each OS — validates resume
- [ ] Re-run after completion on each OS — validates `finishedAt` refresh flow
- [ ] Corrupted state file (manually edit to broken JSON) — validates graceful recovery

No automated test suite in v1. This is a low-frequency, high-touch skill; manual validation is proportional.

## 12. Out of scope (v1, possibly v2+)

- **Full idempotency**: v1 uses backup+merge; v2 target is "run the skill as a refresh, end state deterministic regardless of priors"
- **Telegram bot token setup flow**: could be a separate skill later
- **Corporate proxy / firewall handling**: current plan is "student calls Kacper"
- **Internationalization**: Polish only; no mechanism for English/other languages
- **Automated tests**: not worth it for a ~yearly-use skill
- **Plugin updates propagating without re-running onboarding**: explicitly by design — re-running is the refresh mechanism
- **Monorepo / multi-root `CLAUDE_PROJECT_DIR` handling in hooks**: not relevant to beginners

## 13. Open questions / future work

- **v2 idempotency**: once the skill is stable, every section's action becomes pure (inputs from state → same outputs always). Requires reviewing the merge policy for each file.
- **`/claude-team:update` command**: a lighter slash command that refreshes just hooks + plugin list to current versions without the full interview. Good for once Jakub ships skill v0.2+.
- **Observability**: opt-in telemetry (count of students onboarded, which sections had failures) to inform curriculum tuning. Would require the students' consent and a minimal server.
- **LSP binary install robustness**: `npm install -g` behavior on Windows varies with Node install method. If this becomes a frequent Kacper ticket, explore alternatives (winget, bundled binaries).

## 14. Appendix — non-negotiables bucket list (reference)

Locked in during brainstorming:

- Git identity + conventional commits
- TDD workflow (Red → Green → Refactor)
- Planning-first workflow (spec → plan → execute)
- Superpowers plugin (with "alternatives exist" footnote)
- skill-creator, context7, claude-md-management, frontend-design plugins
- pyright-lsp + typescript-lsp plugins
- protect-files, commit-gate, auto-format, post-compact, test-review hooks
- ccstatusline (with Jakub's exact config)
- Deny rules: `Bash(rm -rf:*)`, `Bash(sudo:*)`
- Never read office/PDF without permission
- Both Python and JS/React stacks installed for everyone

Optional (student choice): telegram, vercel, feature-dev, code-review, security-guidance, screenshots folder path.

Personalized: open-ended "what should Claude know about you?" answer written into CLAUDE.md.

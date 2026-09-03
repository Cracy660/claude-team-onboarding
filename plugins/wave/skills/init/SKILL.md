---
name: init
description: Use when the user runs /wave:init, asks to scaffold the wave dispatch tooling into a repository, asks to add the Codex dispatch skill, the wave hooks, the red-gate agent or the statement registry to a project, or asks to refresh that tooling after a plugin update.
---

# wave init

## Overview

Scaffolds one repository from the plugin's templates: `.claude/wave.env`, the dispatch and
registry skills, the two hooks, the red-gate agent, `AGENTS.md`, a `CLAUDE.md` section, the
registry, and the settings entries that make the whole thing enforceable.

**Templates are rendered, never hand-filled.** Every `.hbs` file goes through
`scripts/render.mjs` with the knobs file. A value you type into a template by hand produces a
file the next `/wave:init` cannot refresh, and a `{{KEY}}` you miss ships as literal text into
the contract an implementer reads.

## Hard rules

- **Render with the script.** Never substitute a `{{KEY}}` yourself and never edit a rendered
  file to correct a value. Fix the knobs file and render again.
- **Back up before every overwrite**, as `<name>.pre-wave-<TS>.bak`, with one timestamp for the
  whole run.
- **Ask the knobs in one message.** Do not interview the user knob by knob.
- **Merge `settings.json` with `scripts/merge-settings.mjs`.** Never rewrite that file by hand.
- **Show a diff and wait for a yes** before appending to `AGENTS.md` or the project `CLAUDE.md`.
- **Never block.** A failed step emits the diagnostic block and asks how to proceed. A dirty tree
  is reported, not refused. Stopping at the knobs question to wait for the answer is not
  blocking: it is the one designed pause, and ending your turn there is how you ask.

## Paths

- Plugin root: `${CLAUDE_PLUGIN_ROOT}` when it is set, else the directory three levels above this
  file. Call it `PLUGIN_ROOT` below.
- Repo root: `git rev-parse --show-toplevel`. Every relative path below is from there.
- Knobs file: `${TMPDIR:-/tmp}/wave-knobs.json`. Delete it in step 9.
- Run timestamp: run `date +%Y%m%d-%H%M%S` once, at the start of step 5, and use that one literal
  string in every backup name for the whole run.

## Step 1: preconditions

```bash
git rev-parse --show-toplevel
[ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ] && echo main-checkout || echo linked-worktree
git status --porcelain | head -20
```

- The first command fails: this is not a git repository. Stop and say so.
- `linked-worktree`: stop. Say that `/wave:init` runs in the main checkout, because the tooling it
  writes is what creates worktrees.
- `git status --porcelain` prints lines: report the dirty tree in one line and continue. Refusing
  on a dirty tree is not this skill's job.

## Step 2: detect

Run these five from the repo root. They are numbered so the table below can point at them; none
of them writes anything.

```bash
basename "$(git rev-parse --show-toplevel)"
ls -1 .env.local .env 2>/dev/null | head -1
ls -1 pnpm-lock.yaml package-lock.json yarn.lock uv.lock 2>/dev/null
node -e 'const s=require(process.cwd()+"/package.json").scripts||{};for(const k of Object.keys(s))console.log(k+"\t"+s[k])'
test -f pyproject.toml && grep -nE '^\[tool\.(pytest|ruff|uv)' pyproject.toml
```

| Knob | From | Rule |
|---|---|---|
| `REPO_NAME` | command 1 | as printed |
| `WT_ROOT` | nothing | `../<REPO_NAME>-wt` |
| `ENV_FILE` | command 2 | the first hit; no output means the empty string, and an empty `ENV_FILE` makes dispatch skip the copy |
| package manager | command 3 | the first hit drives `INSTALL_CMD` and `TEST_BIN_HINT`; no output means you ask in step 3 |
| `TEST_CMD`, `BUILD_CMD`, `VITEST` | command 4 | `<pm> test` and `<pm> build` when those scripts exist; `BUILD_CMD` is empty when there is no build script; `VITEST` is `true` when the test script names vitest |
| python fallback | command 5 | no `package.json`: `TEST_CMD` is `uv run pytest`, `BUILD_CMD` is empty, `VITEST` is `false` |

Command 4 fails loudly when there is no `package.json`; that is the signal to use command 5.

| Lockfile | `INSTALL_CMD` | `TEST_BIN_HINT` |
|---|---|---|
| `pnpm-lock.yaml` | `pnpm install --prefer-offline --silent` | `./node_modules/.bin/<runner>` |
| `package-lock.json` | `npm ci --silent` | `./node_modules/.bin/<runner>` |
| `yarn.lock` | `yarn install --frozen-lockfile --silent` | `./node_modules/.bin/<runner>` |
| `uv.lock` | `uv sync --frozen` | `.venv/bin/pytest` |
| none found | ask; an empty value skips provisioning | ask |

`<runner>` is the first word of the `test` script, for example `vitest` or `jest`. When that word
is `node`, `TEST_BIN_HINT` is empty. The hint exists because the package manager launcher hangs in
the Codex sandbox and the implementer needs the binary path instead.

## Step 3: ask the knobs, once

**Ask the knobs question exactly once, even when the request says do it now, one pass, or
non-interactive.** Values the user already gave in their message count as answers; anything
missing is asked. Taking defaults silently is the failure this step exists to prevent.

**Asking means ending your turn with the question as your last message; the user's next message
is the answer.** There is always a channel: your reply. A run that receives no answer stops at
the question; defaults apply only to knobs the user explicitly said to default.

Send one message. Defaults in brackets. Say that `defaults` accepts all of them.

```
Wave scaffold for <REPO_NAME>. Reply "defaults" to take every bracketed value.

1. Worktree root [../<REPO_NAME>-wt]
2. Task branch prefix [codex]
3. Implementer models: mechanical [gpt-5.6-terra], judgment [gpt-5.6-sol], effort [medium]
4. Statement registry, a SQLite spec and findings database with guarded writes? [yes]
   directory [docs/registry]
5. Dispatch log directory [.superpowers/dispatch-logs]
6. House conventions: three to five lines for AGENTS.md, the indirections an implementer in this
   repo must not bypass. Skipping leaves a marked TODO block in AGENTS.md.
7. Env var names masked when you seal a wave, space separated, for example OPENAI_API_KEY [none]

Detected: package manager <pm>, env file <ENV_FILE or none>, test "<TEST_CMD>",
build "<BUILD_CMD or none>", test binary "<TEST_BIN_HINT or none>".
```

## Step 4: write the knobs file

Write `${TMPDIR:-/tmp}/wave-knobs.json` with all seventeen keys and no others. `REGISTRY` and
`VITEST` are JSON booleans; every other value is a string, and `BUILD_CMD`,
`HOUSE_CONVENTIONS`, `EXTERNAL_KEYS` and `ENV_FILE` may be empty strings.

```json
{
  "REPO_NAME": "demo",
  "WT_ROOT": "../demo-wt",
  "BRANCH_PREFIX": "codex",
  "ENV_FILE": ".env.local",
  "INSTALL_CMD": "pnpm install --prefer-offline --silent",
  "MODEL_DEFAULT": "gpt-5.6-terra",
  "EFFORT_DEFAULT": "medium",
  "MODEL_JUDGMENT": "gpt-5.6-sol",
  "LOG_DIR": ".superpowers/dispatch-logs",
  "REGISTRY_DIR": "docs/registry",
  "REGISTRY": true,
  "TEST_CMD": "pnpm test",
  "BUILD_CMD": "pnpm build",
  "TEST_BIN_HINT": "./node_modules/.bin/vitest",
  "VITEST": true,
  "HOUSE_CONVENTIONS": "",
  "EXTERNAL_KEYS": "OPENAI_API_KEY"
}
```

When the registry is off, `REGISTRY` is `false` and `REGISTRY_DIR` is the empty string. An empty
`WAVE_REGISTRY_DIR` is what makes both hooks pass silently on a repository without a registry.

## Step 5: render

Take the run timestamp now. Back up `.claude/wave.env` first if it exists.

```bash
TS="<the run timestamp>"
PLUGIN_ROOT="<absolute plugin root>"
KNOBS="${TMPDIR:-/tmp}/wave-knobs.json"
[ -f .claude/wave.env ] && cp .claude/wave.env ".claude/wave.env.pre-wave-$TS.bak" && echo "backup .claude/wave.env.pre-wave-$TS.bak"
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/wave.env.hbs" "$KNOBS" --out .claude/wave.env
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/AGENTS.md.hbs" "$KNOBS" --out "${TMPDIR:-/tmp}/wave-AGENTS.md"
node "$PLUGIN_ROOT/scripts/render.mjs" "$PLUGIN_ROOT/templates/project/CLAUDE-section.md.hbs" "$KNOBS" --out "${TMPDIR:-/tmp}/wave-CLAUDE-section.md"
```

A refresh run, one that scaffolds a repository `/wave:init` already scaffolded, is what makes this
backup matter: without it, re-rendering `wave.env` overwrites the previous knobs with no
`.pre-wave-*.bak` next to it, the exact red flag this skill tells you to stop and redo.

`render.mjs` exits 1 with `render: missing knobs: A, B` when a placeholder survives. That is the
renderer telling you the knobs file is incomplete: add the key and run it again. Never patch the
output.

`AGENTS.md` and the project `CLAUDE.md` render to temp files because step 7 appends them section
by section.

House conventions, on the rendered `${TMPDIR:-/tmp}/wave-AGENTS.md`:

- `HOUSE_CONVENTIONS` is non-empty: drop the TODO block entirely, then squeeze the blank-line gap
  the deletion leaves.

  ```bash
  sed -i.bak '/<!-- wave:todo-house-conventions -->/,/<!-- \/wave:todo-house-conventions -->/d' "${TMPDIR:-/tmp}/wave-AGENTS.md" && rm "${TMPDIR:-/tmp}/wave-AGENTS.md.bak"
  sed -i.bak '/^$/N;/^\n$/D' "${TMPDIR:-/tmp}/wave-AGENTS.md" && rm "${TMPDIR:-/tmp}/wave-AGENTS.md.bak"
  ```

- `HOUSE_CONVENTIONS` is empty: leave the file untouched. The TODO block stays with both marker
  lines intact, so a later `/wave:init` run can find it and replace it once conventions are given.
  Do not strip the markers on their own: an orphaned TODO body with no markers is invisible to
  that later run.

`-i.bak` is the form that works on both BSD and GNU sed.

## Step 6: copy the rest verbatim

Everything under `templates/project/` that does not end in `.hbs` is copied byte for byte, so the
next plugin update refreshes it by re-running this skill. Run this as one block, with
`PLUGIN_ROOT` and `TS` filled in as literals.

```bash
set -eu
cd "$(git rev-parse --show-toplevel)"
PLUGIN_ROOT="<absolute plugin root>"
TS="<the run timestamp>"
REGISTRY_DIR="<the REGISTRY_DIR knob, empty without a registry>"
copy() {
  mkdir -p "$(dirname "$2")"
  if [ -f "$2" ]; then cp "$2" "$2.pre-wave-$TS.bak"; echo "backup $2.pre-wave-$TS.bak"; fi
  cp "$PLUGIN_ROOT/templates/project/$1" "$2"; echo "wrote $2"
}
copy hooks/code-only-branch.sh                .claude/hooks/code-only-branch.sh
copy hooks/registry-guard.sh                  .claude/hooks/registry-guard.sh
copy skills/dispatch/SKILL.md                 .claude/skills/dispatch/SKILL.md
copy skills/dispatch/scripts/dispatch.sh      .claude/skills/dispatch/scripts/dispatch.sh
copy agents/red-gate.md                       .claude/agents/red-gate.md
```

With a registry, add these seven, in the same shell call so `copy`, `PLUGIN_ROOT`, `TS` and
`REGISTRY_DIR` are still defined:

```bash
copy skills/registry/SKILL.md                 .claude/skills/registry/SKILL.md
copy skills/registry/scripts/registry-write.sh .claude/skills/registry/scripts/registry-write.sh
copy registry/README.md                       "$REGISTRY_DIR/README.md"
copy registry/schema.sql                      "$REGISTRY_DIR/schema.sql"
copy registry/tools/gen-spec-exec.py          "$REGISTRY_DIR/tools/gen-spec-exec.py"
copy registry/tools/gen-review-panel.py       "$REGISTRY_DIR/tools/gen-review-panel.py"
copy registry/tools/ingest-review.py          "$REGISTRY_DIR/tools/ingest-review.py"
```

`registry-guard.sh` is copied in both cases. The settings fragment installs it as a hook
unconditionally, and a hook command pointing at a file that does not exist fails on every Bash
call. Without a registry it reads an empty `WAVE_REGISTRY_DIR` and exits 0.

Then the settings merge:

```bash
node "$PLUGIN_ROOT/scripts/merge-settings.mjs" .claude/settings.json "$PLUGIN_ROOT/templates/project/settings.json"
```

It makes its own backup, creates the file as `{}` when absent, unions the allow and deny lists,
appends hook entries whose command is not already there, preserves every other key, and prints
one line per change. Read its output into the receipt. Do not open that file in an editor
afterwards.

Then make the shell files executable:

```bash
chmod +x .claude/hooks/*.sh .claude/skills/dispatch/scripts/dispatch.sh
chmod +x .claude/skills/registry/scripts/registry-write.sh   # with a registry only
```

The Python tools stay non-executable: `registry-write.sh` and the playbook call them through
`python3 <path>`.

## Step 7: AGENTS.md and the project CLAUDE.md

`AGENTS.md` is the implementer's contract, so a repository that already has one keeps every
section it wrote itself.

- No `AGENTS.md`: copy the rendered temp file to `AGENTS.md`, report `created`.
- It exists:
  1. `grep -n '^## ' "${TMPDIR:-/tmp}/wave-AGENTS.md"` and `grep -n '^## ' AGENTS.md`.
  2. For each rendered heading absent from the repository's file, by the same prefix, lowercased
     comparison, append that whole section to a copy at `AGENTS.md.wave.tmp`, in rendered order,
     one blank line between sections. Never edit a section the repository already has.
  3. Back up, `diff -u AGENTS.md AGENTS.md.wave.tmp`, wait for a yes, then `mv`.

Project `CLAUDE.md`:

```bash
grep -q '^## Wave dispatch (controller-side)' CLAUDE.md
```

- Found: leave the file alone, report `left`.
- Not found, or no `CLAUDE.md`: append the rendered section, or create the file holding just it,
  with the same backup, diff and confirm.

## Step 8: registry database and .gitignore

With a registry:

```bash
command -v sqlite3 >/dev/null && echo sqlite3-ok || echo sqlite3-missing
test -f "$REGISTRY_DIR/registry.db" || sqlite3 "$REGISTRY_DIR/registry.db" < "$REGISTRY_DIR/schema.sql"
```

Never run the schema against a database that already exists. `sqlite3-missing`: say so in the
receipt, print the one command the user runs once they install it, and carry on. Everything else
in the scaffold works without it.

The log directory never belongs in git:

```bash
[ -f .gitignore ] && [ -n "$(tail -c1 .gitignore)" ] && printf '\n' >> .gitignore
grep -qxF '<LOG_DIR>/' .gitignore 2>/dev/null || printf '%s\n' '<LOG_DIR>/' >> .gitignore
```

The first line exists because a `.gitignore` without a trailing newline would otherwise get the
entry glued onto its last line.

Then check the dependency directory: `node_modules` under npm, pnpm or yarn, `.venv` under uv.
Skip this whole check when step 2 detected no package manager.

```bash
git check-ignore -q <dep-dir> && echo ignored || echo not-ignored
```

`not-ignored` is worth one question. Say why before you ask: `dispatch.sh clean` refuses to remove
a worktree that holds untracked files, and `WAVE_INSTALL_CMD` fills `<dep-dir>` inside every
worktree with thousands of them, so the first `clean` of the first wave fails. Offer to append
`<dep-dir>/` to `.gitignore`, default yes, and append it exactly as the log line above when they
accept. They decline: record it in the receipt under `not done:`.

## Step 9: check your own output

```bash
cd "$(git rev-parse --show-toplevel)"
echo "== placeholders, expect nothing =="; grep -rn '{{' .claude AGENTS.md CLAUDE.md 2>/dev/null
echo "== deny =="; node -e 'const j=JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"));console.log((j.permissions&&j.permissions.deny||[]).join("\n"))'
echo "== executable =="; ls -l .claude/hooks/*.sh .claude/skills/*/scripts/*.sh 2>/dev/null
echo "== backups =="; ls -1 .claude/*.pre-wave-*.bak *.pre-wave-*.bak 2>/dev/null
echo "== wave.env =="; cat .claude/wave.env
rm -f "${TMPDIR:-/tmp}/wave-knobs.json" "${TMPDIR:-/tmp}/wave-AGENTS.md" "${TMPDIR:-/tmp}/wave-CLAUDE-section.md"
```

The placeholder line printing anything means a template reached the repository unrendered: fix
the knobs file and redo step 5 for that file. Do not hand-edit the output.

## Step 10: receipt

Print the file list, not a summary of it.

```
wave init, <REPO_NAME>
written:
  .claude/wave.env
  .claude/settings.json          <merge lines from merge-settings.mjs>
  .claude/hooks/code-only-branch.sh
  .claude/hooks/registry-guard.sh
  .claude/skills/dispatch/SKILL.md
  .claude/skills/dispatch/scripts/dispatch.sh
  .claude/skills/registry/SKILL.md               <registry only>
  .claude/skills/registry/scripts/registry-write.sh   <registry only>
  .claude/agents/red-gate.md
  AGENTS.md                      <created | N sections appended | left>
  CLAUDE.md                      <section appended | left>
  <REGISTRY_DIR>/README.md, schema.sql, tools/*.py, registry.db   <registry only>
  .gitignore                     <lines added: log dir, dependency dir | left>
backups: <paths | none>
knobs: worktree <WT_ROOT>, branch <BRANCH_PREFIX>/<task>, models <MODEL_DEFAULT> and
  <MODEL_JUDGMENT> at <EFFORT_DEFAULT>, env file <ENV_FILE | none>, registry <dir | off>
not done: <sqlite3 missing, house conventions still TODO, ... | nothing>
next: the method itself is the running-waves skill. Ask for the first-wave walkthrough.
```

Close the receipt with these two lines. `.claude/wave.env` is trusted input: `dispatch.sh` runs
`WAVE_INSTALL_CMD` through `eval`, so only the repository owner edits that file and it is reviewed
like any other committed file. Nothing here is committed: the scaffold is left in the working tree
for the user to review and commit.

## Red flags, stop and redo the step

- A `{{` survives anywhere under `.claude/`, in `AGENTS.md`, or in `CLAUDE.md`.
- You typed a value into a template instead of into the knobs file.
- You opened `.claude/settings.json` to edit it by hand.
- You overwrote a file and no `.pre-wave-*.bak` exists next to it.
- You appended to `AGENTS.md` without showing the diff.
- You ran the schema against an existing `registry.db`.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The template has two placeholders, faster to fill them in" | The renderer is also the check: it fails loudly on a key you forgot, hand-filling fails silently. |
| "There is no settings.json yet, so there is nothing to merge" | `merge-settings.mjs` creates it. A hand-written one drifts from the fragment the next update ships. |
| "This repo has no AGENTS.md, so I will write a summary of my own" | `AGENTS.md` is what the implementer reads instead of CLAUDE.md. Render the template. |
| "sqlite3 is missing, so the registry files are pointless" | Copy them, report the missing binary, print the one command. The registry works the moment sqlite3 arrives. |
| "The tree is dirty, I should stop and ask" | Report it in one line and continue. Refusing on a dirty tree is not in this skill. |
| "The rendered AGENTS.md is better than theirs, replace it" | Append the missing sections only. Their sections are their conventions. |
| "This ran non-interactively, so I took the skill's stated defaults" | Ask anyway. Values the user already gave in the request count as answers; anything else still gets asked. Taking defaults silently is the failure step 3 exists to prevent. |
| "There is no channel to ask and block, so I take the defaults" | Your reply is the channel; stopping with the question is the correct end of this turn, not a failure to finish. |

## When something fails

```
┌─ Something went wrong ───────────────────────────
│ Tried: <plain language>
│ Error: <last 10 lines of stderr>
└──────────────────────────────────────────────────
[WAVE DIAGNOSTIC]
plugin: wave 0.1.0
skill: init
step: <N>
os: <uname -s>
command: <the command that failed>
exit_code: <N>
stderr: |
  <stderr>
[/DIAGNOSTIC]
```

Then ask whether to retry, skip this step, or stop. Never continue silently past a failed step.

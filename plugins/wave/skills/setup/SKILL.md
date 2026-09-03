---
name: setup
description: Use when the user runs /wave:setup, asks to set the wave method up on this machine, asks whether Codex is ready for dispatch, or asks to add the multi-model orchestration rules to the global CLAUDE.md.
---

# wave setup

## Overview

One run per machine. It makes the global layer ready for waves: Codex reachable, superpowers
enabled, and the multi-model rules merged into the global `CLAUDE.md`.

**The merge is a merge, never a substitution.** The file is the recipient's record of their own
decisions. What you write is their file with the blocks from `sections.md` inserted, one bullet
extended, and nothing else different: same order, same wording, same personal sections, byte for
byte.

## Hard rules

- **Never run an install yourself.** Print the command, ask the user to paste it, wait for
  "done". This covers `npm install -g`, `codex login`, and every `/plugin install`.
- **Back up before the first byte changes.** No backup path in the receipt means you did not earn
  the write.
- **Show the unified diff and wait for a yes** before writing `CLAUDE.md`.
- **Idempotent.** Every step checks first. A second run reports `left` everywhere and writes
  nothing.
- **Never block.** A failed step emits the diagnostic block and asks how to proceed.

## Paths

- Plugin root: `${CLAUDE_PLUGIN_ROOT}` when it is set, else the directory three levels above this
  file.
- Sections file: `<plugin root>/templates/claude-md/sections.md`.
- Target: `~/.claude/CLAUDE.md`. If the user names a different file, use that path and say which
  file you touched in the receipt.

## Step 1: Codex preflight

Run `codex --version`.

- Prints a version, for example `codex-cli 0.146.0`: record it and continue.
- Not found: present this, do not run it.

  ```
  npm install -g @openai/codex
  ```

  Wait for "done", then run `codex --version` again. Still missing: diagnostic block.

Run `codex login status`.

- `Logged in using ChatGPT`: continue.
- Anything else: present this, do not run it.

  ```
  codex login
  ```

  Say that it opens a browser and that it needs a ChatGPT plan that includes Codex. Wait for
  "done", then re-run `codex login status`.

Do not write `~/.codex/config.toml`. Sandbox and model policy live in the dispatch script that
`/wave:init` installs, so each project carries its own copy and nothing is global.

## Step 2: superpowers check

Run:

```bash
node -e 'const fs=require("fs"),os=require("os");const p=os.homedir()+"/.claude/settings.json";const j=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):{};console.log((j.enabledPlugins||{})["superpowers@claude-plugins-official"]===true?"enabled":"absent")'
```

- `enabled`: continue.
- `absent`: present this, do not run it.

  ```
  /plugin install superpowers@claude-plugins-official
  ```

  Wait for "done", then re-run the probe.

Read that file, change nothing in it. Hooks, permissions and every other key belong to the
claude-team baseline the recipient already runs.

## Step 3: merge the sections into CLAUDE.md

### 3a. Read the target

Missing: say so, and offer to create it holding only the blocks from `sections.md` in file order.
Only on an explicit yes; then go to 3e with an empty original.

### 3b. Back up, once per run

```bash
BAK="$HOME/.claude/CLAUDE.md.pre-wave-$(date +%Y%m%d-%H%M%S).bak"; cp "$HOME/.claude/CLAUDE.md" "$BAK"; echo "$BAK"
```

Keep the printed path for the receipt. If a `CLAUDE.md.pre-wave-*.bak` already exists from this
run, reuse it rather than making a second one.

### 3c. Read the rules

Read `<plugin root>/templates/claude-md/sections.md`. Each block is preceded by one HTML comment
on its own line:

```
<!-- rule: <form>; <key>: "<value>"; <key>: "<value>" -->
```

The block body runs from the line after that comment to the line before the next `<!-- rule:`
comment, or to the end of the file. Values are always double quoted. Apply the blocks in file
order, and let each one read the file as the earlier ones left it.

A body line starting with `<!-- note:` is an annotation addressed to you, not content. Every form
skips those lines and none of them ever reaches the target file. The `## Git` block carries one,
the reminder that the recipient's identity lines and push rule stay untouched.

| Form | Keys | What you do |
|---|---|---|
| `add-if-absent` | `heading`, `after` | A heading matching `heading` is already in the file: change nothing, report `left`. Otherwise insert one blank line and then the body verbatim, after the last non-blank line of the section whose heading matches `after`. Report `added`. |
| `amend-bullet` | `section`, `bullet`, `match` | The section whose heading matches `section` already contains the literal `match`: change nothing, report `left`. Otherwise find the first line in that section that starts with `- ` and whose text after `- ` starts with `bullet`, and append the body to the end of that one line: `. ` before it when the line does not already end in `.`, `;` or `:`, one space when it does. Change no other line. Report `amended`. |
| `append-bullets` | `section` | For each item line of the body, in order, a line starting with `<!-- note:` being an annotation rather than an item: the section whose heading matches `section` already contains that item's `match` literal, report `left`; otherwise append the item, without its trailing match comment, after the last non-blank line of that section. An item that starts with `- ` is a bullet and is appended directly. An item that does not is a paragraph, so put one blank line before it and it renders as its own paragraph rather than joining the list above. Report `added`. |
| `never-touch` | `sections` | Do not modify the named sections, their content or their position. The body is empty. |

Every heading that no rule names is never touched either.

### 3d. Anchor matching

A heading value matches a line in the file when both, lowercased and stripped of leading `#`
characters and surrounding spaces, agree over the full length of the value. The line may carry
more text after it.

So `## Test-Driven Development` matches `## Test-Driven Development (mandatory)`. A file rendered
from the older claude-team template carries exactly that parenthetical. Demanding an exact string
here is how this skill silently adds a second TDD section. Never do that.

A `bullet` value matches the same way, after one more removal on both sides: the list marker
(`- `, `* `, `1. `) and the emphasis characters `*` and `_`. So
`bullet: "**Tests are a design conversation**"` matches its line whether or not the file still
carries the bold markers, and `bullet: "Commit cadence"` matches
`- Commit cadence: one commit per phase, per plan task, or per passing test cycle`.

A section runs from its heading to the line before the next `## ` heading, or to the end of the
file.

Anchor not found: never skip silently. Report it as

```
anchor missing: <form> for "<heading>"; "<after>" not found, proposed after "<closest heading>"
```

and put the insertion at the proposed place inside the diff, so the user judges it. When no
placement is defensible, leave the block out and report `anchor missing: not placed`, so the user
can paste it by hand.

### 3e. Build the result

Apply the rules to a copy and write it to `~/.claude/CLAUDE.md.wave.tmp`. Exactly four kinds of
edit may reach that file:

1. whole blocks inserted after an anchor section, from `add-if-absent`
2. one bullet line extended by one sentence, from `amend-bullet`
3. item lines appended at the end of a section, from `append-bullets`
4. nothing else

Not reordering. Not rewrapping. Not replacing the file with a tidier version. Not restating the
recipient's `## User` line in your own words. Not dropping a section the wave blocks seem to
supersede. If the removed lines in the step 3f diff are anything other than the bullets an
`amend-bullet` rule named, you did the wrong thing: delete the temp file and build it again. One
removed line per `amend-bullet` rule that fired, and no others. Today's `sections.md` carries two
such rules, the "Tests are a design conversation" bullet under `## Test-Driven Development` and
the "Commit cadence" bullet under `## Git`, so on a file rendered from the older claude-team
template the diff removes exactly those two lines.

### 3f. Diff, then write

```bash
diff -u "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.wave.tmp"
```

`diff` exits 1 when the files differ. That is the expected case here, not an error. Show the
whole diff, list any anchor-missing lines above it, and ask in one message: write this, yes or
no.

- yes: `mv "$HOME/.claude/CLAUDE.md.wave.tmp" "$HOME/.claude/CLAUDE.md"`
- no: `rm "$HOME/.claude/CLAUDE.md.wave.tmp"`, keep the backup, report that nothing was written.

## Step 4: receipt

Print every field, including the empty ones.

```
wave setup
- codex: <version | not installed>
- codex login: <ok | pending>
- superpowers: <enabled | install command given>
- target: <path of the merged file>
- backup: <absolute path | none, the file did not exist>
- added: <headings | none>
- amended: <section, bullet prefix | none>
- left: <headings that already carried the content | none>
- anchor missing: <rule and proposed placement | none>
- next: run /wave:init inside a repository
```

## Red flags, stop and redo the step

- You are about to write the file and no diff has been shown.
- The diff removes any line other than an amended bullet.
- You are copying `sections.md` over the target instead of merging into it.
- No `.pre-wave-*.bak` path exists yet.
- A rule's anchor was not found and you moved on.
- You are about to run an install command yourself.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The old sections say roughly the same thing, cleaner to replace them" | Their file records their decisions. The merge adds; it never rewords. |
| "The heading is `## Test-Driven Development (mandatory)`, so the section the rule names is absent" | Anchor matching is prefix matching. A second TDD section is a defect, not a merge. |
| "The user reads the file afterwards, the diff is a formality" | The diff is where a wrong anchor gets caught. Before the write, not after. |
| "I will back up at the end if something goes wrong" | The write is the thing that goes wrong. Backup first, path in the receipt. |
| "`npm install -g` is one command, faster if I run it" | Global installs land in a shell you cannot see. Paste and confirm. |
| "The anchor is missing, so this block does not apply to their setup" | It applies. Propose a placement in the diff and let them judge. |

## When something fails

```
┌─ Something went wrong ───────────────────────────
│ Tried: <plain language>
│ Error: <last 10 lines of stderr>
└──────────────────────────────────────────────────
[WAVE DIAGNOSTIC]
plugin: wave 0.1.0
skill: setup
step: <N>
os: <uname -s>
command: <the command that failed>
exit_code: <N>
stderr: |
  <stderr>
[/DIAGNOSTIC]
```

Then ask whether to retry, skip this step, or stop. Never continue silently past a failed step.

---
name: dispatch
description: Use when dispatching or resuming a Codex implementer for a wave task, or cleaning up after one. Every codex run goes through this skill; raw codex exec and codex resume are permission-denied in this repo.
---

# Codex dispatch

All Codex implementer runs go through
`.claude/skills/dispatch/scripts/dispatch.sh`. The script owns the mechanics so
no dispatch can forget them; the controller owns everything the sandbox blocks.
Every knob (worktree root, branch prefix, env file, install command, models, log
dir) comes from `.claude/wave.env`, and the script exits 1 when that file is
missing.

## Commands

```bash
# New task, mechanical and well-specified (WAVE_MODEL_DEFAULT at WAVE_EFFORT_DEFAULT):
.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file>

# Multi-file or judgment task, on the judgment model. Your shell does not carry
# the wave variables, so source the config first, or write the model id out:
source .claude/wave.env
.claude/skills/dispatch/scripts/dispatch.sh new <task-id> <prompt-file> \
  --model "$WAVE_MODEL_JUDGMENT" --effort high

# Red to Green, or a fix round, on an existing task:
.claude/skills/dispatch/scripts/dispatch.sh resume <task-id> <prompt-file>

# What is still checked out:
.claude/skills/dispatch/scripts/dispatch.sh list

# After the merge:
.claude/skills/dispatch/scripts/dispatch.sh clean <task-id>
```

Runs take many minutes: invoke via Bash with `run_in_background: true` and read
the log under `WAVE_LOG_DIR` (`<task-id>.<timestamp>.log`); the final message
lands in `<task-id>.last.md`.

## What the script enforces (do not work around)

- A dedicated worktree at `<WAVE_WT_ROOT>/<task-id>` on branch
  `<WAVE_BRANCH_PREFIX>/<task-id>`: never the primary checkout, never
  `danger-full-access`, always `--sandbox workspace-write`.
- `WAVE_ENV_FILE` copied in. Without it, service-gated suites skip silently and
  the run reads green while proving nothing. An empty value means there is
  nothing to copy.
- Stdin terminated (`< /dev/null`) and the prompt read from a file into the
  argument: a piped prompt stalls the CLI, and inline quoting breaks in the shell.
- Resume by session ID found through the worktree path. `--last` is a footgun
  once sessions interleave, and `codex exec resume` ignores piped stdin, rejects
  `--sandbox` and `--output-last-message`, and does not restore the working
  directory, so the resume runs from inside the worktree.
- Exit codes survive the log pipe (`pipefail`): a failed run never reads as green.
- Kebab-case task ids only, and an existing worktree is refused rather than
  silently reused.

## What stays on the controller

- Write the prompt file: the task's statements and neighbours verbatim, BAN
  rules, and the refutation checklist for deletion-shaped tasks. Standing
  conventions live in `AGENTS.md`, so do not re-type them into the brief.
- Commit the worktree's work. Codex cannot reach the shared git dir.
- Re-run the legs the sandbox blocks: service-gated suites and the build. A Codex
  green claim never covers them.

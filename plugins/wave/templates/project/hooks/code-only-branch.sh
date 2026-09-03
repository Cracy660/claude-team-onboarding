#!/usr/bin/env bash
# PreToolUse[Bash]: task branches carry CODE ONLY. Block commits that touch
# registry .db files from a linked worktree or a <prefix>/* branch. Registry
# flips happen in the main checkout after rebase-and-merge.
set -uo pipefail
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -n "$cmd" ] || exit 0
case "$cmd" in
  *"git commit"*|*"git -C"*commit*) ;;
  *) exit 0 ;;
esac

# A hook must never block a repository that has no wave tooling: no wave.env, no
# opinion. Same for a project configured without a registry.
WAVE_ENV="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.claude/wave.env"
[ -f "$WAVE_ENV" ] || exit 0
# shellcheck source=/dev/null
. "$WAVE_ENV"
REGISTRY_DIR="${WAVE_REGISTRY_DIR:-}"
[ -n "$REGISTRY_DIR" ] || exit 0
BRANCH_PREFIX="${WAVE_BRANCH_PREFIX:-codex}"

# Resolve the repo the commit targets: honor `git -C <path>` if present.
target="$(printf '%s' "$cmd" | sed -nE 's/.*git -C "([^"]+)" .*/\1/p')"
if [ -z "$target" ]; then
  target="$(printf '%s' "$cmd" | sed -nE "s/.*git -C '([^']+)' .*/\\1/p")"
fi
if [ -z "$target" ]; then
  target="$(printf '%s' "$cmd" | sed -nE 's/.*git -C ([^ ]+) .*/\1/p')"
fi
target="${target:-.}"

gitdir="$(git -C "$target" rev-parse --git-dir 2>/dev/null)" || exit 0
common="$(git -C "$target" rev-parse --git-common-dir 2>/dev/null)" || exit 0
branch="$(git -C "$target" rev-parse --abbrev-ref HEAD 2>/dev/null)" || exit 0

task_branch=0
[ "$gitdir" != "$common" ] && task_branch=1
case "$branch" in "$BRANCH_PREFIX"/*) task_branch=1 ;; esac
[ "$task_branch" = 1 ] || exit 0

staged="$(git -C "$target" diff --cached --name-only 2>/dev/null || true)"
registry_re="$(printf '%s' "$REGISTRY_DIR" | sed 's/[][\.*^$+?(){}|]/\\&/g')"
if printf '%s\n%s' "$cmd" "$staged" | grep -qE "$registry_re/[^[:space:]]*\.db"; then
  echo "Blocked: task branches carry CODE ONLY. Registry .db flips happen in the main checkout after rebase-and-merge (see the wave dispatch section of CLAUDE.md)." >&2
  exit 2
fi
exit 0

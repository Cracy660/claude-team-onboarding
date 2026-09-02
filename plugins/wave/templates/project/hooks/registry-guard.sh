#!/usr/bin/env bash
# PreToolUse[Bash]: destructive SQL against the registry must go through
# registry-write.sh, which prints the full match list before executing.
set -uo pipefail
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -n "$cmd" ] || exit 0

# A hook must never block a repository that has no wave tooling, or one
# configured without a registry.
WAVE_ENV="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.claude/wave.env"
[ -f "$WAVE_ENV" ] || exit 0
# shellcheck source=/dev/null
. "$WAVE_ENV"
REGISTRY_DIR="${WAVE_REGISTRY_DIR:-}"
[ -n "$REGISTRY_DIR" ] || exit 0

case "$cmd" in
  *registry.db*|*spec-exec.db*) ;;
  *) exit 0 ;;
esac
case "$cmd" in
  *registry-write.sh*) exit 0 ;;
  *"$REGISTRY_DIR"/tools/*) exit 0 ;;
esac

# Match SQL statement shapes, not bare English words: ruling prose like
# "hard delete" must not trip this. Still blocks: UPDATE <t> SET ...,
# DELETE FROM ..., DROP TABLE/INDEX/VIEW/TRIGGER, ALTER TABLE.
if printf '%s' "$cmd" | grep -qiE 'update[[:space:]]+["[:alnum:]_]+[[:space:]]+set([^[:alpha:]]|$)|delete[[:space:]]+from([^[:alpha:]]|$)|drop[[:space:]]+(table|index|view|trigger)|alter[[:space:]]+table'; then
  echo "Blocked: raw destructive SQL against the registry. Use .claude/skills/registry/scripts/registry-write.sh, which prints the full match list before executing (see the registry skill)." >&2
  exit 2
fi
exit 0

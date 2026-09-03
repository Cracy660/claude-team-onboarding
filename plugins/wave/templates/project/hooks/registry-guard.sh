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

# Match SQL statement shapes, not bare English words: ruling prose like
# "hard delete" must not trip this. Still blocks: UPDATE <t> SET ...,
# DELETE FROM ..., DROP TABLE/INDEX/VIEW/TRIGGER, ALTER TABLE.
SQL_RE='update[[:space:]]+["[:alnum:]_]+[[:space:]]+set([^[:alpha:]]|$)|delete[[:space:]]+from([^[:alpha:]]|$)|drop[[:space:]]+(table|index|view|trigger)|alter[[:space:]]+table'

# A whole-command substring check on the exemptions is forgeable: an
# unrelated segment can carry "registry-write.sh" or a tools/ path as inert
# text (a comment, an echo, a --note value) while a different segment in the
# same command runs raw destructive SQL. So split into segments on ; && || |
# (a naive split that ignores quoting) and require each destructive-shaped
# segment to carry its OWN exemption via its own program token.
segments="$(printf '%s' "$cmd" | tr ';&|' '\n')"
matched_any=0
blocked=0
while IFS= read -r seg; do
  [ -n "$seg" ] || continue
  if printf '%s' "$seg" | grep -qiE "$SQL_RE"; then
    matched_any=1
    # Program token: the first non-blank word, skipping a leading `bash` or
    # `python3` and any VAR=value assignments.
    token=""
    # A glob in the program token must not expand against the hook's working directory.
    set -f
    for word in $seg; do
      case "$word" in
        [A-Za-z_]*=*) continue ;;
        bash|python3) continue ;;
      esac
      token="$word"
      break
    done
    set +f
    case "$token" in
      *registry-write.sh) : ;;
      *"$REGISTRY_DIR"/tools/*) : ;;
      *) blocked=1 ;;
    esac
  fi
done <<EOF
$segments
EOF

# Conservative fallback: if no single segment matched but the whole command
# does (e.g. the split broke a statement across a boundary), block. There is
# no single segment to derive a program token from, so no exemption applies.
if [ "$matched_any" = 0 ] && printf '%s' "$cmd" | grep -qiE "$SQL_RE"; then
  blocked=1
fi

if [ "$blocked" = 1 ]; then
  echo "Blocked: raw destructive SQL against the registry. Use .claude/skills/registry/scripts/registry-write.sh, which prints the full match list before executing (see the registry skill)." >&2
  exit 2
fi
exit 0

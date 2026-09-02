#!/usr/bin/env bash
# Sanctioned Codex dispatch path. Owns worktree creation, sandbox flags, stdin
# termination, the env-file copy, dependency provisioning and logging. Raw
# `codex exec`/`codex resume` is permission-denied in a wave project
# (.claude/settings.json); this script is the programmatic enforcement of the
# dispatch rules in CLAUDE.md. Every knob comes from .claude/wave.env, so the
# file stays byte-identical across projects.
set -euo pipefail

die() { echo "dispatch: $*" >&2; exit 1; }

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || die "not inside a git repository"
WAVE_ENV="$REPO_ROOT/.claude/wave.env"
[ -f "$WAVE_ENV" ] || die ".claude/wave.env missing"
# shellcheck source=/dev/null
. "$WAVE_ENV"

WT_ROOT_RAW="${WAVE_WT_ROOT:-}"
[ -n "$WT_ROOT_RAW" ] || die "WAVE_WT_ROOT is empty in .claude/wave.env"
BRANCH_PREFIX="${WAVE_BRANCH_PREFIX:-codex}"
ENV_FILE="${WAVE_ENV_FILE:-}"
INSTALL_CMD="${WAVE_INSTALL_CMD:-}"
MODEL_DEFAULT="${WAVE_MODEL_DEFAULT:-gpt-5.6-terra}"
EFFORT_DEFAULT="${WAVE_EFFORT_DEFAULT:-medium}"
MODEL_JUDGMENT="${WAVE_MODEL_JUDGMENT:-$MODEL_DEFAULT}"
LOG_DIR_RAW="${WAVE_LOG_DIR:-.superpowers/dispatch-logs}"

# Relative knobs resolve against the repo root, never against $PWD.
resolve() { case "$1" in /*) printf '%s\n' "$1" ;; *) printf '%s\n' "$REPO_ROOT/$1" ;; esac; }
WT_ROOT="$(resolve "$WT_ROOT_RAW")"
LOG_DIR="$(resolve "$LOG_DIR_RAW")"
mkdir -p "$LOG_DIR"

usage() {
  cat <<EOF
Usage:
  dispatch.sh new <task-id> <prompt-file> [--model <id>] [--effort low|medium|high] [--base <ref>]
  dispatch.sh resume <task-id> <prompt-file>
  dispatch.sh clean <task-id>
  dispatch.sh list
Defaults: --model $MODEL_DEFAULT --effort $EFFORT_DEFAULT (mechanical, well-specified tasks);
use --model $MODEL_JUDGMENT for multi-file or judgment tasks.
EOF
  exit 1
}

cmd="${1:-}"; [ -n "$cmd" ] || usage; shift

case "$cmd" in
  new)
    TASK="${1:?task-id required}"; PROMPT_FILE="${2:?prompt-file required}"; shift 2
    MODEL="$MODEL_DEFAULT"; EFFORT="$EFFORT_DEFAULT"; BASE="HEAD"
    while [ $# -gt 0 ]; do
      case "$1" in
        --model)  MODEL="${2:?--model needs a value}";  shift 2 ;;
        --effort) EFFORT="${2:?--effort needs a value}"; shift 2 ;;
        --base)   BASE="${2:?--base needs a value}";   shift 2 ;;
        *) die "unknown flag: $1" ;;
      esac
    done
    [[ "$TASK" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "task-id must be kebab-case"
    [ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
    if [ -n "$ENV_FILE" ]; then
      [ -f "$REPO_ROOT/$ENV_FILE" ] || die "$ENV_FILE missing in main checkout"
    fi
    WT="$WT_ROOT/$TASK"
    if [ -e "$WT" ]; then die "worktree exists: $WT (use resume, or clean first)"; fi

    git -C "$REPO_ROOT" worktree add "$WT" -b "$BRANCH_PREFIX/$TASK" "$BASE"
    if [ -n "$ENV_FILE" ]; then
      # Without the env file, environment-gated suites silently skip and Green is
      # hollow. An empty WAVE_ENV_FILE means the project has nothing to copy.
      mkdir -p "$(dirname "$WT/$ENV_FILE")"
      cp "$REPO_ROOT/$ENV_FILE" "$WT/$ENV_FILE"
    fi
    if [ -n "$INSTALL_CMD" ]; then
      # Without installed dependencies the test and type binaries cannot run, and
      # the sandbox blocks the package manager's network fetch, so the worktree
      # must be provisioned from the local store before codex starts.
      ( cd "$WT" && eval "$INSTALL_CMD" ) || die "install command failed in $WT: $INSTALL_CMD"
    fi

    LOG="$LOG_DIR/$TASK.$(date +%Y%m%d-%H%M%S).log"
    echo "dispatch: $TASK -> $WT ($MODEL/$EFFORT) log=$LOG"
    # < /dev/null: codex stalls on an open stdin. pipefail keeps codex's exit code
    # through tee (never mask an exit code behind a pipe). --sandbox
    # workspace-write always, never danger-full-access, never the primary checkout.
    codex exec --cd "$WT" --sandbox workspace-write \
      -m "$MODEL" -c model_reasoning_effort="$EFFORT" \
      --output-last-message "$LOG_DIR/$TASK.last.md" \
      "$(cat "$PROMPT_FILE")" < /dev/null 2>&1 | tee "$LOG"
    echo "dispatch: done. Last message: $LOG_DIR/$TASK.last.md"
    ;;

  resume)
    TASK="${1:?task-id required}"; PROMPT_FILE="${2:?prompt-file required}"
    WT="$WT_ROOT/$TASK"
    [ -d "$WT" ] || die "no worktree for $TASK at $WT"
    [ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
    # Resume by session ID, never --last (interleaved sessions pick the wrong one).
    # resume rejects --sandbox/--output-last-message and IGNORES piped stdin, so
    # the resume context must ride the prompt argument.
    SESSIONS_DIR="${CODEX_HOME:-$HOME/.codex}/sessions"
    SESSION_FILE="$(grep -rl "$WT" "$SESSIONS_DIR" 2>/dev/null | sort | tail -1 || true)"
    [ -n "$SESSION_FILE" ] || die "no codex session references $WT"
    SESSION_ID="$(basename "$SESSION_FILE" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)"
    [ -n "$SESSION_ID" ] || die "could not extract session id from: $SESSION_FILE"
    LOG="$LOG_DIR/$TASK.$(date +%Y%m%d-%H%M%S).resume.log"
    echo "dispatch: resume $TASK session=$SESSION_ID log=$LOG"
    # codex exec resume runs in $PWD; it does NOT restore the session's --cd.
    # Resumed from the main checkout, codex operates on the WRONG TREE (it sees a
    # worktree-less repo and blocks). Pin cwd to the worktree.
    PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
    (cd "$WT" && codex exec resume "$SESSION_ID" "$PROMPT_CONTENT" < /dev/null) 2>&1 | tee "$LOG"
    ;;

  clean)
    TASK="${1:?task-id required}"
    WT="$WT_ROOT/$TASK"
    [ -d "$WT" ] || die "no worktree for $TASK at $WT"
    git -C "$REPO_ROOT" worktree remove "$WT" \
      || die "worktree dirty: commit or merge its work first (the controller commits), or remove it manually"
    echo "dispatch: removed $WT (branch $BRANCH_PREFIX/$TASK kept, delete it after merge)"
    ;;

  list)
    git -C "$REPO_ROOT" worktree list
    ;;

  *) usage ;;
esac

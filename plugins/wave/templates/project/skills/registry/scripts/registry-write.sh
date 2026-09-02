#!/usr/bin/env bash
# Guarded write path for the wave registry. Prints the FULL match list before it
# writes: a registry write is never blind. Raw UPDATE and DELETE against
# registry.db are blocked by the registry-guard PreToolUse hook, which exempts
# this script.
#
#   registry-write.sh <table> --set "<sql>" --where "<sql>" [--note "<text>"]
#   registry-write.sh <table> --delete --where "<sql>"
#
# spec_statement and finding updates require --note. The history row
# (statement_history with old_text, or status_history) is written in the SAME
# transaction as the update, so "history first, then status" cannot be skipped
# and a failing update leaves no history behind. After any spec_statement write
# the spec-exec.db projection is regenerated.
set -euo pipefail

die() { echo "registry-write: $*" >&2; exit 1; }

usage="usage: registry-write.sh <table> --set <sql> --where <sql> [--note <text>]
       registry-write.sh <table> --delete --where <sql>"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
WAVE_ENV="$REPO_ROOT/.claude/wave.env"
[ -f "$WAVE_ENV" ] || die "missing $WAVE_ENV, run /wave:init"
# shellcheck source=/dev/null
. "$WAVE_ENV"
[ -n "${WAVE_REGISTRY_DIR:-}" ] || die "WAVE_REGISTRY_DIR is empty: this project has no registry"

case "$WAVE_REGISTRY_DIR" in
  /*) REG_DIR="$WAVE_REGISTRY_DIR" ;;
  *)  REG_DIR="$REPO_ROOT/$WAVE_REGISTRY_DIR" ;;
esac
DB_PATH="$REG_DIR/registry.db"
[ -f "$DB_PATH" ] || die "no registry database at $DB_PATH"

TABLE="${1:-}"
[ -n "$TABLE" ] || die "$usage"
case "$TABLE" in
  --*) die "$usage" ;;
  *[!a-z_]*) die "table must be a bare lowercase name, got: $TABLE" ;;
esac
shift

MODE="update"; SET=""; WHERE=""; NOTE=""; HAVE_NOTE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --set)    [ $# -ge 2 ] || die "--set needs a value";   SET="$2";   shift 2 ;;
    --where)  [ $# -ge 2 ] || die "--where needs a value"; WHERE="$2"; shift 2 ;;
    --note)   [ $# -ge 2 ] || die "--note needs a value";  NOTE="$2"; HAVE_NOTE=1; shift 2 ;;
    --delete) MODE="delete"; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -n "$WHERE" ] || die "--where is required (no blanket writes)"
if [ "$MODE" = "update" ]; then
  [ -n "$SET" ] || die "--set is required for an update"
  case "$TABLE" in
    spec_statement|finding)
      { [ "$HAVE_NOTE" -eq 1 ] && [ -n "$NOTE" ]; } \
        || die "--note is required for a $TABLE write: it becomes the history row"
      ;;
  esac
fi

# SQL escaping for the two values this script interpolates itself: a single
# quote is doubled, never backslashed, because sqlite has no backslash escape.
# --set and --where are raw SQL by contract: the guard is the printed match list.
sq() { printf '%s' "${1//\'/''}"; }
DATE="$(date +%F)"
NOTE_SQL="$(sq "$NOTE")"
DATE_SQL="$(sq "$DATE")"

echo "== matched rows ($TABLE WHERE $WHERE) =="
sqlite3 -header "$DB_PATH" "SELECT * FROM $TABLE WHERE $WHERE;"
COUNT="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $TABLE WHERE $WHERE;")"
echo "== $COUNT row(s) matched =="
[ "$COUNT" -gt 0 ] || die "no rows matched, aborting"

if [ "$MODE" = "delete" ]; then
  sqlite3 -bail "$DB_PATH" "BEGIN IMMEDIATE; DELETE FROM $TABLE WHERE $WHERE; COMMIT;"
else
  case "$TABLE" in
    spec_statement)
      sqlite3 -bail "$DB_PATH" "
BEGIN IMMEDIATE;
CREATE TEMP TABLE _pre AS SELECT id AS sid, text AS old_text FROM spec_statement WHERE $WHERE;
UPDATE spec_statement SET $SET WHERE $WHERE;
INSERT INTO statement_history (statement_id, date, status, note, old_text)
  SELECT p.sid, '$DATE_SQL', s.status, '$NOTE_SQL', p.old_text
  FROM _pre p JOIN spec_statement s ON s.id = p.sid;
COMMIT;"
      ;;
    finding)
      sqlite3 -bail "$DB_PATH" "
BEGIN IMMEDIATE;
CREATE TEMP TABLE _pre AS SELECT id AS fid FROM finding WHERE $WHERE;
UPDATE finding SET $SET WHERE $WHERE;
INSERT INTO status_history (finding_id, date, status, note)
  SELECT p.fid, '$DATE_SQL', f.status, '$NOTE_SQL'
  FROM _pre p JOIN finding f ON f.id = p.fid;
COMMIT;"
      ;;
    *)
      sqlite3 -bail "$DB_PATH" "BEGIN IMMEDIATE; UPDATE $TABLE SET $SET WHERE $WHERE; COMMIT;"
      ;;
  esac
fi

if [ "$TABLE" = "spec_statement" ]; then
  python3 "$REG_DIR/tools/gen-spec-exec.py" --registry-dir "$REG_DIR"
fi

echo "== done: $MODE $TABLE, $COUNT row(s) =="

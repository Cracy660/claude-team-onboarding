#!/usr/bin/env python3
"""Apply a review-panel export to registry.db.

Usage: python3 ingest-review.py <export.json> [--registry-dir DIR] [--date YYYY-MM-DD]

keep sets the status to approved, change replaces the text and sets amended,
remove sets rejected. Every verdict appends a statement_history row carrying the
text the statement had before the change. An export naming an id the registry
does not hold is refused before anything is written.
"""

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

VERDICT_STATUS = {"keep": "approved", "change": "amended", "remove": "rejected"}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("export", help="JSON file exported by the review panel")
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    ap.add_argument(
        "--date",
        default=None,
        help="YYYY-MM-DD written into statement_history (default: today)",
    )
    args = ap.parse_args()

    root = (
        Path(args.registry_dir).resolve()
        if args.registry_dir
        else Path(__file__).resolve().parents[1]
    )
    db_path = root / "registry.db"
    if not db_path.exists():
        raise SystemExit(f"ingest-review: no registry database at {db_path}")

    when = args.date or date.today().isoformat()
    date.fromisoformat(when)  # fail fast on a malformed --date

    payload = json.loads(Path(args.export).read_text(encoding="utf-8"))
    verdicts = payload.get("verdicts") or {}
    if not verdicts:
        raise SystemExit("ingest-review: the export carries no verdicts")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA busy_timeout=30000")
    known = dict(con.execute("SELECT id, text FROM spec_statement"))

    unknown = sorted(set(verdicts) - set(known))
    if unknown:
        con.close()
        raise SystemExit(
            "ingest-review: unknown statement id(s): " + ", ".join(unknown)
        )
    bad = sorted(
        k for k, v in verdicts.items() if (v or {}).get("verdict") not in VERDICT_STATUS
    )
    if bad:
        con.close()
        raise SystemExit("ingest-review: unknown verdict for: " + ", ".join(bad))

    counts = {"keep": 0, "change": 0, "remove": 0}
    try:
        with con:  # one transaction: either every verdict lands or none does
            for sid, v in sorted(verdicts.items()):
                verdict = v["verdict"]
                status = VERDICT_STATUS[verdict]
                note = (v.get("note") or "").strip() or f"panel review: {verdict}"
                if verdict == "change":
                    new_text = (v.get("text") or "").strip()
                    if not new_text:
                        raise SystemExit(
                            f"ingest-review: verdict change without replacement text: {sid}"
                        )
                    con.execute(
                        "UPDATE spec_statement SET text = ?, status = ? WHERE id = ?",
                        (new_text, status, sid),
                    )
                else:
                    con.execute(
                        "UPDATE spec_statement SET status = ? WHERE id = ?",
                        (status, sid),
                    )
                con.execute(
                    "INSERT INTO statement_history (statement_id, date, status, note, old_text) "
                    "VALUES (?,?,?,?,?)",
                    (sid, when, status, note, known[sid]),
                )
                counts[verdict] += 1
    finally:
        con.close()

    print(
        f"keep: {counts['keep']}  change: {counts['change']}  remove: {counts['remove']}"
    )


if __name__ == "__main__":
    main()

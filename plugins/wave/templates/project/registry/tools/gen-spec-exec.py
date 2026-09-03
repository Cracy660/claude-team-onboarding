#!/usr/bin/env python3
"""Regenerate spec-exec.db from registry.db.

Usage: python3 gen-spec-exec.py [--registry-dir DIR]

spec-exec.db is a derived view and is never edited by hand: it carries the
approved statements only, without basis, rationale, findings or ban entries.
Registry contract clause 3: execution agents read spec-exec.db only.
"""

import argparse
import datetime
import os
import pathlib
import sqlite3


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    args = ap.parse_args()

    root = (
        pathlib.Path(args.registry_dir).resolve()
        if args.registry_dir
        else pathlib.Path(__file__).resolve().parents[1]
    )
    src_path = root / "registry.db"
    if not src_path.exists():
        raise SystemExit(f"gen-spec-exec: no registry database at {src_path}")

    src = sqlite3.connect(src_path)
    src.execute("PRAGMA busy_timeout=30000")
    rows = src.execute(
        """
        SELECT s.id, s.area, s.text,
               COALESCE((SELECT group_concat(r.ref, '; ') FROM spec_ref r
                         WHERE r.statement_id = s.id AND r.ref_type = 'code'), ''),
               s.stage
        FROM spec_statement s WHERE s.status = 'approved' ORDER BY s.id
        """
    ).fetchall()
    src.close()

    out = root / "spec-exec.db"
    tmp = root / "spec-exec.db.tmp"
    if tmp.exists():
        tmp.unlink()
    dst = None
    try:
        dst = sqlite3.connect(tmp)
        dst.execute(
            "CREATE TABLE spec (id TEXT PRIMARY KEY, area TEXT, text TEXT, "
            "code_locus TEXT, stage TEXT)"
        )
        dst.execute(
            "CREATE TABLE meta (generated TEXT, source TEXT, statement_count INTEGER, "
            "contract TEXT)"
        )
        dst.executemany("INSERT INTO spec VALUES (?,?,?,?,?)", rows)
        dst.execute(
            "INSERT INTO meta VALUES (?,?,?,?)",
            (
                datetime.date.today().isoformat(),
                "registry.db (spec_statement, status=approved)",
                len(rows),
                "registry README clause 3: execution agents read this file only",
            ),
        )
        dst.commit()
        dst.close()
        dst = None
        os.replace(tmp, out)
    except Exception:
        if dst is not None:
            dst.close()
        if tmp.exists():
            tmp.unlink()
        raise

    print(f"spec-exec.db regenerated: {len(rows)} statements")


if __name__ == "__main__":
    main()

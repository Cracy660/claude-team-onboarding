#!/usr/bin/env python3
"""Generate the owner review panel (local HTML) from registry.db.

Usage: python3 gen-review-panel.py [--registry-dir DIR] [--pending-only] [--out FILE]

Offline by design: the statements are embedded in the page, progress is kept in
localStorage, and the export is one JSON file that ingest-review.py applies back
to the registry. Open it as a local file. Never publish it as an artifact:
artifact viewers block the download the export button needs.
"""

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

PENDING_SQL = "status IN ('proposed','flagged')"


def js(value):
    """JSON for embedding inside a <script> block."""
    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")


def load(db_path, pending_only):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    where = f" WHERE {PENDING_SQL}" if pending_only else ""
    stmts = [
        dict(r)
        for r in con.execute(
            "SELECT id, area, text, basis, status, stage FROM spec_statement"
            + where
            + " ORDER BY area, id"
        )
    ]
    areas = [
        r[0]
        for r in con.execute(
            "SELECT DISTINCT area FROM spec_statement" + where + " ORDER BY area"
        )
    ]
    refs = {}
    for r in con.execute("SELECT statement_id, ref_type, ref FROM spec_ref"):
        refs.setdefault(r["statement_id"], []).append(f"{r['ref_type']}:{r['ref']}")
    con.close()
    for s in stmts:
        s["area"] = s["area"] or ""
        s["refs"] = refs.get(s["id"], [])
    return stmts, [a or "" for a in areas]


PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statement review __STAMP_TXT__</title>
<style>
  :root { --ink:#1c2733; --mut:#5b6b7a; --line:#dbe3ea; --bg:#f6f8fa;
          --acc:#2f6f9f; --ok:#2e7d32; --chg:#b45309; --rm:#b3261e; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 -apple-system,'Segoe UI',sans-serif;
         color:var(--ink); background:var(--bg); }
  header { position:sticky; top:0; z-index:5; background:#fff; padding:10px 20px;
           border-bottom:2px solid var(--line); display:flex; gap:16px;
           align-items:center; flex-wrap:wrap; }
  header h1 { font-size:16px; margin:0; }
  #progress { color:var(--mut); font-variant-numeric:tabular-nums; }
  #onlyopen { border:1px solid var(--line); background:#fff; border-radius:6px;
              padding:4px 12px; cursor:pointer; }
  #onlyopen.on { background:var(--ink); color:#fff; }
  main { max-width:1020px; margin:0 auto; padding:16px 20px 120px; }
  section h2 { font-size:15px; text-transform:uppercase; letter-spacing:.04em;
               border-bottom:1px solid var(--line); padding-bottom:4px;
               margin:26px 0 8px; }
  .card { background:#fff; border:1px solid var(--line); border-left:4px solid var(--line);
          border-radius:8px; padding:10px 14px; margin:8px 0; }
  .card.flagged { border-left-color:var(--acc); }
  .card.done-keep { opacity:.6; border-left-color:var(--ok); }
  .card.done-change { border-left-color:var(--chg); }
  .card.done-remove { opacity:.6; border-left-color:var(--rm); }
  .sid { font:12px ui-monospace,monospace; color:var(--mut); }
  .tag { display:inline-block; font-size:11px; padding:1px 7px; border-radius:9px;
         background:#eef4f8; color:var(--mut); margin-left:6px; }
  .tag.flagged { background:#e8f1f8; color:var(--acc); font-weight:600; }
  .stext { margin:6px 0; }
  .refs { font:12px ui-monospace,monospace; color:var(--mut); word-break:break-all; }
  .acts { margin-top:8px; display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  .acts label { cursor:pointer; }
  .newtext, .note { width:100%; margin-top:6px; border:1px solid var(--line);
                    border-radius:6px; padding:6px 9px; font:14px inherit; }
  .newtext { min-height:64px; }
  #exportbar { position:fixed; bottom:0; left:0; right:0; background:#fff;
               border-top:2px solid var(--line); padding:10px 20px; display:flex;
               gap:14px; align-items:center; z-index:5; }
  #exportbar button { background:var(--acc); color:#fff; border:none;
                      border-radius:7px; padding:9px 22px; font-size:15px;
                      cursor:pointer; }
  #hint { color:var(--mut); font-size:13px; }
</style></head><body>
<header>
  <h1>Statement review</h1>
  <span id="progress"></span>
  <button id="onlyopen" onclick="toggleOpen()">undecided only</button>
  <span style="flex:1"></span>
  <span style="color:var(--mut);font-size:13px">__COUNT__ statements &middot; generated __STAMP_TXT__</span>
</header>
<main id="app"></main>
<div id="exportbar">
  <button onclick="doExport()">Export verdicts (JSON)</button>
  <span id="hint">Progress is saved in this browser. The export downloads a file and
  is copied to the clipboard; hand it to the controller for ingest-review.py.</span>
</div>
<script>
const DATA = __DATA__;
const AREAS = __AREAS__;
const STAMP = __STAMP__;
const KEY = 'wave-review-' + STAMP;
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
let onlyOpen = false;

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} prog(); }
function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
function attr(t) { return esc(t).replace(/"/g, '&quot;'); }
function jsarg(t) { return attr(JSON.stringify(t)); }

function setVerdict(id, v) {
  state[id] = state[id] || {};
  state[id].verdict = v;
  save(); paint(id); applyFilter();
}
function setText(id, v) { state[id] = state[id] || {}; state[id].text = v; save(); }
function setNote(id, v) { state[id] = state[id] || {}; state[id].note = v; save(); }

function paint(id) {
  const card = document.getElementById(id);
  if (!card) return;
  const st = state[id] || {};
  card.className = card.className.replace(/ ?done-\\w+/g, '');
  if (st.verdict) card.className += ' done-' + st.verdict;
  const box = card.querySelector('.newtext');
  if (box) box.style.display = st.verdict === 'change' ? '' : 'none';
  card.querySelectorAll('input[type=radio]').forEach(r => { r.checked = r.value === st.verdict; });
}
function toggleOpen() {
  onlyOpen = !onlyOpen;
  document.getElementById('onlyopen').className = onlyOpen ? 'on' : '';
  applyFilter();
}
function applyFilter() {
  DATA.forEach(s => {
    const c = document.getElementById(s.id);
    if (!c) return;
    const done = state[s.id] && state[s.id].verdict;
    c.style.display = (onlyOpen && done) ? 'none' : '';
  });
}
function prog() {
  const done = DATA.filter(s => state[s.id] && state[s.id].verdict).length;
  document.getElementById('progress').textContent = done + '/' + DATA.length + ' decided';
}
function card(s) {
  const st = state[s.id] || {};
  const radios = ['keep', 'change', 'remove'].map(v =>
    '<label><input type="radio" name="' + attr('v-' + s.id) + '" value="' + v + '"'
    + (st.verdict === v ? ' checked' : '')
    + ' onchange="setVerdict(' + jsarg(s.id) + ',' + jsarg(v) + ')"> ' + v + '</label>'
  ).join('');
  return '<div class="card ' + (s.status === 'flagged' ? 'flagged' : '')
    + (st.verdict ? ' done-' + st.verdict : '') + '" id="' + attr(s.id) + '">'
    + '<span class="sid">' + esc(s.id) + '</span>'
    + '<span class="tag' + (s.status === 'flagged' ? ' flagged' : '') + '">' + esc(s.status) + '</span>'
    + '<span class="tag">' + esc(s.basis) + '</span>'
    + (s.stage ? '<span class="tag">' + esc(s.stage) + '</span>' : '')
    + '<div class="stext">' + esc(s.text) + '</div>'
    + (s.refs.length ? '<div class="refs">' + s.refs.map(esc).join(' &middot; ') + '</div>' : '')
    + '<div class="acts">' + radios + '</div>'
    + '<textarea class="newtext" placeholder="replacement text (required for change)"'
    + ' style="display:' + (st.verdict === 'change' ? '' : 'none') + '"'
    + ' onchange="setText(' + jsarg(s.id) + ', this.value)">' + esc(st.text || '') + '</textarea>'
    + '<input class="note" placeholder="note (optional)" value="' + attr(st.note || '')
    + '" onchange="setNote(' + jsarg(s.id) + ', this.value)">'
    + '</div>';
}
function render() {
  let h = '';
  AREAS.forEach(a => {
    const rows = DATA.filter(s => s.area === a);
    if (!rows.length) return;
    h += '<section><h2>' + esc(a || '(no area)') + ' <span style="color:var(--mut)">('
       + rows.length + ')</span></h2>' + rows.map(card).join('') + '</section>';
  });
  document.getElementById('app').innerHTML = h;
  DATA.forEach(s => paint(s.id));
  prog();
}
function collect() {
  const out = { generated: STAMP, verdicts: {} };
  DATA.forEach(s => {
    const st = state[s.id] || {};
    if (!st.verdict) return;
    const v = { verdict: st.verdict };
    if (st.verdict === 'change') v.text = st.text || '';
    if (st.note) v.note = st.note;
    out.verdicts[s.id] = v;
  });
  return JSON.stringify(out, null, 2);
}
function doExport() {
  const text = collect();
  const n = Object.keys(JSON.parse(text).verdicts).length;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'review-' + STAMP + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const hint = document.getElementById('hint');
  hint.textContent = n + ' verdict(s) exported.';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => { hint.textContent = n + ' verdict(s) exported and copied to the clipboard.'; },
      () => {}
    );
  }
}
render();
</script></body></html>
"""


def build(stmts, areas, stamp):
    return (
        PAGE.replace("__DATA__", js(stmts))
        .replace("__AREAS__", js(areas))
        .replace("__STAMP__", js(stamp))
        .replace("__STAMP_TXT__", stamp)
        .replace("__COUNT__", str(len(stmts)))
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--registry-dir",
        default=None,
        help="directory holding registry.db (default: the parent of this tools directory)",
    )
    ap.add_argument(
        "--pending-only",
        action="store_true",
        help="only statements with status proposed or flagged",
    )
    ap.add_argument(
        "--out",
        default=None,
        help="output HTML file (default: <registry-dir>/review/index.html)",
    )
    args = ap.parse_args()

    root = (
        Path(args.registry_dir).resolve()
        if args.registry_dir
        else Path(__file__).resolve().parents[1]
    )
    db_path = root / "registry.db"
    if not db_path.exists():
        raise SystemExit(f"gen-review-panel: no registry database at {db_path}")

    stmts, areas = load(db_path, args.pending_only)
    out = Path(args.out).resolve() if args.out else root / "review" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(stmts, areas, date.today().isoformat()), encoding="utf-8")
    pending = sum(1 for s in stmts if s["status"] in ("proposed", "flagged"))
    print(f"wrote {out}: {len(stmts)} statements, {pending} pending")


if __name__ == "__main__":
    main()

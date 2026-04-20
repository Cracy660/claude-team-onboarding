[INTRO]
Gotowe! Onboarding ukończony.

[RECEIPT — summary of what changed]
Oto co masz teraz na swojej maszynie:

**Plik CLAUDE.md** (`~/.claude/CLAUDE.md`)
Twój globalny kontekst. Claude czyta go na początku każdej rozmowy.

**Skonfigurowane hooki** (w `~/.claude/hooks/`)
- `protect-files.mjs` — blokuje edycję `.env*` i plików lock
- `commit-gate.mjs` — blokuje commity, jeśli testy/typy/linting padają
- `auto-format.mjs` — formatuje automatycznie po każdej edycji
- `post-compact.mjs` — re-injektuje plan po kompresji kontekstu
- `test-review` (prompt) — ocenia nowe testy automatycznie

**Zainstalowane wtyczki**
- superpowers — brainstorming, writing-plans, subagent-driven-development
- skill-creator — budowanie własnych skilli
- context7 — dokumentacja bibliotek na żądanie
- claude-md-management — narzędzia do utrzymania CLAUDE.md
- frontend-design — dobre wzorce UI
- pyright-lsp, typescript-lsp — rozumienie typów w kodzie

**Stosy**
- Python: uv, ruff, pytest
- JavaScript/TypeScript: npm, Vite, Prettier, ESLint, Vitest

**Pasek statusu**
W dolnej krawędzi widzisz swój model, gałąź git, katalog, zużycie sesji i tygodniowe.

[CHOICE]
**WAŻNE:** Zrestartuj Claude Code — niektóre zmiany (hooki, nowe wtyczki) wymagają restartu. Jak wrócisz, wszystko będzie działać.

Jak coś nie działa, pokażę Ci bloki diagnostyczne — wklej je Kacprowi.

[ACTION]
Naciśnij Ctrl+C (lub zamknij Claude Code). Po ponownym uruchomieniu wszystko będzie gotowe.

[RECEIPT]
Do zobaczenia na następnej lekcji. Powodzenia!

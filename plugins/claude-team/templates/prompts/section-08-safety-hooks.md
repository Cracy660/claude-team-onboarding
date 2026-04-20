[INTRO]
Teraz instalujemy **hooki bezpieczeństwa** — skrypty, które Claude Code uruchamia automatycznie przed pewnymi akcjami. Dwa hooki:

**protect-files** — uruchamia się przed każdą edycją pliku. Jeśli ścieżka to `.env`, `.env.local`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` albo `uv.lock` — blokuje i pokazuje "BLOCKED: Protected file." Po co? `.env` zawiera tokeny API (nie chcesz przypadkiem dać Claude'owi możliwości ich edycji), a pliki lock nigdy nie powinny być edytowane ręcznie.

**commit-gate** — uruchamia się przed każdym `git commit` albo `git push`. Sprawdza czy Twój projekt ma `tsconfig.json` (→ uruchamia `npx tsc`), `package.json` z `test:run` (→ `npm run test:run`), `pyproject.toml` (→ `ruff check .` + `pytest`). Jeśli cokolwiek zwraca błąd — blokuje commit. Bezpieczeństwo przed wypchnięciem niesprawdzonego kodu.

Jak chcesz dłuższe wyjaśnienie, napisz "wyjaśnij więcej".

[ACTION]
Kopiuję pliki hooków z wtyczki do `~/.claude/hooks/` i dodaję wpisy do Twojego `settings.json`. Nic nie musisz wklejać.

[RECEIPT]
Gotowe. Teraz:
- W `~/.claude/hooks/` masz pliki `protect-files.mjs` i `commit-gate.mjs` — możesz je otworzyć i przeczytać, to kilkanaście linii Node.
- W Twoim `settings.json` sekcja `hooks.PreToolUse` ma nowe wpisy wskazujące na te pliki.

Spróbuj: otwórz dowolny projekt i poproś Claude'a o edycję `.env` — zobaczysz komunikat BLOCKED.

# Hooki — szczegóły

Hook to mały program, który Claude Code uruchamia przed lub po określonej akcji. Działa w tle, niezauważalnie — dopóki nie znajdzie powodu, żeby Cię zatrzymać albo poprawić coś automatycznie.

## Hooki bezpieczeństwa

### protect-files
Uruchamia się PRZED każdą próbą edycji pliku. Jeśli ścieżka pasuje do chronionego wzorca (`.env`, `.env.local`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `uv.lock`) — blokuje operację z komunikatem "BLOCKED: Protected file." Po co? `.env` zawiera sekrety (tokeny API, hasła), a pliki `lock` to wygenerowane artefakty pakietów, które nigdy nie powinny być edytowane ręcznie.

### commit-gate
Uruchamia się PRZED każdym `git commit` lub `git push`. Sprawdza co masz w projekcie i uruchamia odpowiednie testy:
- `tsconfig.json` obecny → `npx tsc --noEmit`
- `package.json` ma `test:run` → `npm run test:run`
- `pyproject.toml` obecny → `ruff check .` + `pytest`

Jeśli jakikolwiek sprawdzian zwróci błąd — blokuje commit z komunikatem "BLOCKED: Fix errors/tests before committing." Brzmi restrykcyjnie, jest celowe: niesprawdzony kod nie trafia do repozytorium.

## Hooki jakości

### auto-format
Uruchamia się PO każdej edycji pliku. Automatycznie formatuje według rozszerzenia:
- `.py` → `ruff format` + `ruff check --fix`
- `.ts/.tsx/.js/.jsx/.css/.json/.html` → `npx prettier --write`
- `.ts/.tsx/.js/.jsx` → `npx eslint --fix`

Nigdy nie blokuje — jeśli narzędzie zawiedzie, po prostu pomija. Twój kod zawsze ląduje sformatowany.

### test-review
Uruchamia się PO edycji pliku testowego (`*.test.*`, `*.spec.*`). To nie jest hook "komenda", tylko prompt do Claude'a — model czyta Twój test i ocenia go pod kątem:
- tautologicznych asercji (`expect(true).toBe(true)`)
- brakujących przypadków negatywnych
- testów sprawdzających istnienie zamiast zachowania
- mocków zwracających dokładnie to co test oczekuje (cykliczne)

### post-compact
Uruchamia się po kompresji kontekstu (gdy rozmowa jest długa, Claude streszcza historię). Wyciąga aktualną fazę z `plan.md` i ostatnie 20 linii `progress.md` — i reinjektuje je. Dzięki temu po kompresji nie tracisz kontekstu wykonywanego planu.

## Dlaczego jako pliki Node a nie skrypty bash

Bash nie działa natywnie na Windowsie bez WSL. Node tak — i Claude Code go i tak używa. Jeden plik `.mjs` działa identycznie na Mac, Linux, Windows. Mniej niespodzianek.

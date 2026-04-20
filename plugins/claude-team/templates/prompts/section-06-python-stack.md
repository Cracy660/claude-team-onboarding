[INTRO]
**Python stack** w naszym zespole: `uv` zamiast pip/virtualenv, `ruff` do formatowania i lintingu, `pytest` do testów, struktura `src/` + `tests/`.

Po co uv? Bo jest 10-100x szybszy od pip i zastępuje pip + virtualenv + pip-tools jednym narzędziem. Jak chwilę popracujesz, nie wrócisz.

Sprawdzam czy masz `uv`...

[ACTION 1 — install uv if missing]
(Jeśli brak:)
Wklej w terminalu:
- **Windows PowerShell:** `winget install astral-sh.uv`
- **Mac:** `brew install uv`
- **Linux:** `curl -LsSf https://astral.sh/uv/install.sh | sh`

Jeśli Windows poprosi o uprawnienia administratora → TAK.

[ACTION 2 — ruff]
```
uv tool install ruff
```

[ACTION 3 — pytest]
```
uv tool install pytest
```

[INTRO — src layout]
Struktura projektu Python:
```
my-project/
├── pyproject.toml
├── src/
│   └── my_project/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── test_main.py
```

`src/` layout wymusza, żebyś instalował/a swój pakiet przed importem — co oznacza, że testy importują tak samo, jak będzie importować użytkownik. Żadnego magicznego "działa lokalnie ale nie w produkcji".

[RECEIPT]
Masz teraz uv, ruff, pytest. Przy następnym projekcie Python: `uv init my-project --package`, potem `cd my-project`, potem `uv add <zależność>`, potem `uv run pytest`.

Zapamiętam w Twoim CLAUDE.md, że używasz Python ze stosem uv / ruff / pytest.

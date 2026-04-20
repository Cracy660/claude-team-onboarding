[INTRO]
**Pasek statusu** (ccstatusline) to mały programik, który Claude Code uruchamia, żeby pokazać Ci informacje w dolnej krawędzi — model, gałąź git, katalog, zużycie sesji, zużycie tygodniowe.

Dlaczego ważne: jesteście na planie basic, limity są niskie. Ten pasek pokazuje Ci w czasie rzeczywistym, ile zostało. Bez tego łatwo "natłuc rozmów" i odkryć o 14:00, że limit tygodniowy poszedł.

[ACTION]
Kopiuję plik konfiguracyjny do:
- **Mac/Linux:** `~/.config/ccstatusline/settings.json`
- **Windows:** `%APPDATA%\ccstatusline\settings.json`

i dodaję wpis `statusLine` do Twojego `~/.claude/settings.json`.

Pierwszy raz ccstatusline uruchomi się, `npx -y ccstatusline@latest` pobierze paczkę — chwilę potrwa. Po restarcie Claude Code zobaczysz pasek.

[RECEIPT]
Gotowe. Segmenty które zobaczysz:
- Model (kolor: jasnoczerwony)
- Effort thinking
- Gałąź git + worktree
- Katalog roboczy (3 ostatnie segmenty ścieżki)
- Długość kontekstu + procent użycia
- Tokeny total
- **Zużycie sesji** — ile tokenów zużyłeś/aś w tej rozmowie
- **Zużycie tygodniowe** — kluczowe na planie basic

Patrz na ostatnie dwa. Jeśli zużycie tygodniowe rośnie szybko — pauzuj.

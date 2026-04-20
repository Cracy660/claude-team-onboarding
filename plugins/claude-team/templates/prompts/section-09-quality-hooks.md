[INTRO]
Teraz **hooki jakości** — nie blokują, tylko automatyzują. Trzy hooki:

**auto-format** — po każdej edycji pliku formatuje go automatycznie:
- `.py` → `ruff format` + `ruff check --fix`
- `.ts/.tsx/.js/.jsx/.css/.json/.html` → `npx prettier --write`
- `.ts/.tsx/.js/.jsx` dodatkowo → `npx eslint --fix`

Zapomnij o ręcznym formatowaniu. Nigdy nie blokuje — jeśli narzędzie nie jest zainstalowane, po prostu pomija.

**post-compact** — uruchamia się po kompresji kontekstu. Gdy rozmowa robi się długa, Claude streszcza historię, żeby zmieścić się w pamięci. Czasem traci to precyzyjne detale planu, nad którym pracowaliśmy. Ten hook wyciąga aktualną fazę z `plan.md` i ostatnie 20 linii `progress.md` i reinjektuje. Dzięki temu wracasz do pracy na tym samym planie, nie na streszczeniu.

**test-review** — po edycji pliku testowego (`*.test.*`, `*.spec.*`) Claude sam ocenia Twój test pod kątem:
- tautologicznych asercji (`expect(true).toBe(true)`)
- brakujących przypadków negatywnych
- testów sprawdzających tylko istnienie, nie zachowanie
- mocków, które cyklicznie zwracają dokładnie to co test oczekuje

Jak wykryje problem, pokaże Ci na czym polega.

[ACTION]
Kopiuję pliki hooków i aktualizuję `settings.json`.

[RECEIPT]
Masz teraz 5 aktywnych hooków (2 bezpieczeństwa + 3 jakości). Każda edycja pliku przechodzi przez automatyczne formatowanie, każdy test jest oceniany, każdy commit weryfikowany.

Jak coś zaskoczy Cię (np. "dlaczego mój kod został zmieniony?"), prawdopodobnie to hook — sprawdź `~/.claude/hooks/` i przeczytaj co robi odpowiedni plik `.mjs`.

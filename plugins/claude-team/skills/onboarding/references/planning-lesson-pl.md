# Planowanie PRZED kodowaniem

Zasada: **nie kodujesz, dopóki nie masz planu**. Nieważne jak mały projekt.

## Trzy poziomy

### 1. Aplikacja desktop → `spec.md`
Do wstępnego pomysłu. W folderze projektu: `spec.md` z opisem co robisz, dla kogo, dlaczego, sukces wygląda jak... To samo co robiliście na poprzednich lekcjach ręcznie.

### 2. `/ultraplan` → mały projekt
Bierze Twój `spec.md` i generuje `plan.md` z krokami. Szybko, zwięźle.

### 3. Superpowers → większe projekty
Instalowane jako wtyczka. Daje:
- **brainstorming** — zadaje pytania, wypełnia lukę między pomysłem a specem
- **writing-plans** — bierze spec i rozbija na zadania w rozmiarze 2-5 min każde, z testami TDD
- **subagent-driven-development** — wykonuje plan zadanie po zadaniu, każde w osobnym podagencie (lepsze zarządzanie pamięcią)

Kolejność: `brainstorming` → `writing-plans` → `subagent-driven-development`. Pliki lądują w `docs/superpowers/specs/YYYY-MM-DD-<nazwa>.md` i `docs/superpowers/plans/YYYY-MM-DD-<nazwa>.md`.

## Checkpointy (bramki do weryfikacji)

TDD jest naturalną bramką: **zanim Claude napisze implementację, pokazuje Ci plik z testami**. Ty czytasz (testy są w plain English dla beginnera), proponujesz brzegowe przypadki, potwierdzasz. Dopiero wtedy pisze kod.

To jest moment, w którym Twoja wiedza domenowa trafia do projektu. Claude nie zna Twojej branży — Ty znasz. Brzeg który Claude pominie — Ty wychwycisz.

## Alternatywy (na przyszłość)

Istnieją inne frameworki: **BMAD** (Behavior-Merging Agent Development), **Compound Engineering**, inne. Są warte przeglądu jak będziesz chciał/a porównać. Ale zacznijmy od jednego, który działa — `superpowers`. Jak utrwalicie ten sposób myślenia, łatwo porównać.

## Co to daje w praktyce

Claude bez planu = improwizacja. Po godzinie okazuje się, że robicie coś innego niż chciałeś. Claude z planem = idziecie krok po kroku, każdy zaznaczony DONE w pliku, każdy zakończony commitem. Po godzinie widać co się zrobiło, co zostało, gdzie się utknęło.

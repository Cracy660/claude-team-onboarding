[INTRO]
Zainstalujemy teraz 5 wtyczek bazowych. Każda dostaje 30-sekundowy opis przed pastą.

Instalacja wtyczek to komendy slash — nie uruchamiam ich za Ciebie, dlatego że wolę żebyś sam/a poczuł/a, jak to działa. Po każdej powiesz "gotowe" (albo wklej błąd, jeśli coś pójdzie nie tak).

Uwaga: istnieją alternatywy (BMAD, Compound Engineering) — jak w przyszłości zechcesz porównać, to świetne. Na razie zaczynamy od tych, które znam i używam.

[ACTION 1/5 — superpowers]
**superpowers** — podstawowe narzędzia pracy: brainstormowanie pomysłów, pisanie planów, wykonywanie planów zadanie po zadaniu. Centralny kawałek tego, jak ja pracuję.

Wklej w Claude Code:
```
/plugin install superpowers@claude-plugins-official
```

Napisz "gotowe" kiedy skończy.

[ACTION 2/5 — skill-creator]
**skill-creator** — gdy będziesz chciał/a zrobić własnego skilla (tak jak ten onboarding), to jest narzędzie, które Ci w tym pomoże. Pokryjemy to na lekcji tydzień po.

```
/plugin install skill-creator@claude-plugins-official
```

[ACTION 3/5 — context7]
**context7** — dokumentacja bibliotek i frameworków na żądanie. Zamiast zgadywać API Reacta czy Prisma, Claude pyta aktualnej dokumentacji. Szczególnie ważne dla świeżych bibliotek (model mógł mieć stare dane).

```
/plugin install context7@claude-plugins-official
```

[ACTION 4/5 — claude-md-management]
**claude-md-management** — narzędzia do aktualizacji i utrzymania Twojego CLAUDE.md. Po miesiącu praktyki będziesz chciał/a coś dopisać — ten skill to ułatwia.

```
/plugin install claude-md-management@claude-plugins-official
```

[ACTION 5/5 — frontend-design]
**frontend-design** — dobre praktyki UI i wzorce frontendu. Nawet jeśli nie robisz teraz frontendu, ta wtyczka poprawia jakość sugestii UI gdy o coś zapytasz — i chronię Cię przed dryfowaniem w stronę Swingów i WinForms.

```
/plugin install frontend-design@claude-plugins-official
```

[ACTION — reload]
Na końcu:
```
/reload-plugins
```

[RECEIPT]
Masz teraz 5 wtyczek bazowych. Twój `settings.json` ma nowy rekord `enabledPlugins` — skillowy będzie go aktualizował gdy dodamy kolejne.

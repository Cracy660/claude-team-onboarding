[INTRO]
**JavaScript/React stack** w naszym zespole:
- `npm` do pakietów
- `Vite` do scaffoldingu i buildu (szybszy niż CRA, nowocześniejszy)
- `TypeScript` zawsze (bezpieczeństwo typów od dnia 1)
- `Tailwind CSS` do stylowania
- `Prettier` (bez semikolonów, pojedyncze cudzysłowy) + `ESLint` (typescript-eslint + react-hooks)
- `Vitest` + React Testing Library + `jsdom` do testów
- Pliki testów razem z komponentem: `Component.test.tsx`

Większość tych narzędzi uruchamia się przez `npx` — więc nic nie muszę instalować globalnie. Twoje projekty same przyciągną potrzebne wersje.

[ACTION — confirm understanding, no installs]
Jeden gotowy start: `npm create vite@latest moja-aplikacja -- --template react-ts`, potem `cd moja-aplikacja`, `npm install`, `npm run dev`.

Nie instaluję dziś niczego — tylko zapamiętuję w Twoim CLAUDE.md, że używasz JS/TS stack z Vite + Vitest. Hooki w następnej sekcji będą automatycznie formatować JS/TS plikami, gdy je edytujesz.

[RECEIPT]
OK, gotowe. Idziemy dalej.

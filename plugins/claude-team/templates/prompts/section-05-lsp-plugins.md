[INTRO]
**LSP** = Language Server Protocol. To sposób, w jaki edytory (VS Code, IntelliJ) pokazują Ci błędy typów, definicje funkcji i podpowiedzi — w czasie rzeczywistym, bez uruchamiania kompilatora. Claude w swojej wtyczce LSP dostaje to samo: po każdej edycji widzi błędy typów, brakujące importy, literówki.

Wyobraź sobie, że programujesz w parze z kimś, kto patrzy Ci na ekran. Zauważa literówkę wcześniej niż Ty. Tak działa Claude z LSP.

Zainstalujemy dwa: Python (pyright) i TypeScript. Każdy wymaga dodatkowo binarki language servera — instalujemy razem z wtyczką.

[ACTION 1 — pyright plugin]
```
/plugin install pyright-lsp@claude-plugins-official
```

[ACTION 2 — pyright binary]
Otwórz terminal (na Windowsie PowerShell) i wklej:
```
npm install -g pyright
```

Jeśli system poprosi o uprawnienia administratora → kliknij TAK. Jeśli nie pozwoli → zadzwoń do Kacpra, nie próbuj obejść.

[ACTION 3 — typescript plugin]
```
/plugin install typescript-lsp@claude-plugins-official
```

[ACTION 4 — typescript binary]
```
npm install -g typescript-language-server typescript
```

[ACTION — reload]
```
/reload-plugins
```

[RECEIPT]
Teraz po każdej edycji Twojego kodu Claude widzi błędy typów automatycznie. Jeśli sam wprowadzi błąd — zauważy i poprawi w tym samym ruchu.

Jeśli któraś z komend "npm install -g" zawiodła, pokaż mi dokładny błąd — przygotuję blok diagnostyczny dla Kacpra.

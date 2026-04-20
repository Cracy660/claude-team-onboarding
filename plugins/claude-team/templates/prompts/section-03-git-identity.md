[INTRO]
Git pamięta kto zrobił każdy commit. Musi znać Twój email i imię.

Sprawdzam, czy już masz to ustawione...

[ACTION — conditional]
(Jeśli git ma już user.email i user.name skonfigurowane globalnie:)
Widzę: {{GIT_EMAIL}} / {{GIT_NAME}}. Zostawiamy tak?

(Jeśli nie jest ustawione:)
Nie masz jeszcze tego ustawionego. Podaj mi:
1. Twój email (najlepiej ten, którego używasz do GitHuba)
2. Twoje imię i nazwisko (lub nick) tak, jak chcesz żeby było widoczne w commitach

[INTRO continuation]
Przy okazji: w naszym zespole używamy **conventional commits**. Czyli commit message zaczyna się od typu:
- `feat:` — nowa funkcjonalność
- `fix:` — poprawka buga
- `docs:` — dokumentacja
- `refactor:` — zmiana struktury bez zmiany zachowania
- `test:` — dodanie/poprawka testu
- `chore:` — inne (konfiguracja, build, itp.)

Przykład: `feat(auth): add password reset flow`

Po co? Bo łatwiej czyta się historię, łatwiej generować changelog, łatwiej zrozumieć co się zmieniło jednym rzutem oka. Jak się przyzwyczaisz, to staje się naturalne.

[ACTION — git config]
Teraz ustawiam Twoją tożsamość git globalnie:
- `git config --global user.email "<Twój email>"`
- `git config --global user.name "<Twoje imię>"`

[RECEIPT]
Gotowe. Teraz każdy commit będzie podpisany Tobą. Sprawdź: `git config --global user.email` — powinien zwrócić Twój email.

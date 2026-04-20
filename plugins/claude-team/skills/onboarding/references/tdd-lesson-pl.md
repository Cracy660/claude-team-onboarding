# TDD — Red / Green / Refactor

**TDD** = Test-Driven Development. Piszesz testy PRZED kodem.

## Cykl

1. **Red** — napisz test dla zachowania, które chcesz. Uruchom. Test musi oblać (bo kod jeszcze nie istnieje).
2. **Green** — napisz minimalny kod, żeby test przeszedł. Nie więcej.
3. **Refactor** — jak test zielony, poprawiasz strukturę. Test dalej przechodzi.

Powtarzasz. Jedno zachowanie = jeden cykl.

## Po co to robimy

Trzy powody:

1. **Test to specyfikacja**. Jeśli nie umiesz napisać testu, to znaczy, że nie rozumiesz co masz zbudować. Lepiej to wiedzieć PRZED niż po godzinie kodowania.

2. **Pewność przy zmianach**. Masz 50 testów? Zmieniasz kod, uruchamiasz testy, wiesz czy coś zepsułeś. Bez tego każda zmiana to loteria.

3. **Bezpieczniejsze wdrożenia na podstawie AI**. Claude generuje dużo kodu szybko. Testy są Twoją siatką bezpieczeństwa przed "działa na moim komputerze".

## Co testować

**Zachowanie, nie implementację.**

Źle: `test('używa setState')`
Dobrze: `test('po kliknięciu przycisku pokazuje komunikat sukcesu')`

Testujesz co widzi użytkownik / co robi system. Jeśli zmienisz wewnętrzną strukturę ale zachowanie zostanie takie samo — testy nie powinny paść.

## Przypadki brzegowe PIERWSZE

Nie zaczynasz od happy path. Zaczynasz od:
- pustej listy / pustego stringa
- null / undefined
- za dużych wartości
- błędów sieci / API

Tam są bugi. Claude często pisze testy szczęśliwej ścieżki i pomija brzegi — dlatego te testy zawsze najpierw omawiamy ze mną, zanim kodujesz.

## Hook test-review

Twój projekt ma hook, który czyta nowo napisany test i ocenia go automatycznie. Wyłapuje:
- `expect(true).toBe(true)` — nie testuje niczego
- testy bez przypadków negatywnych
- testy sprawdzające tylko czy coś się zrenderowało, nie zawartość
- mocki zwracające dokładnie to, co test oczekuje (krąży sam w sobie)

Jak hook zgłosi problem — popraw test zanim pójdziesz dalej.

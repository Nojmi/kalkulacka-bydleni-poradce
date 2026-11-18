# Testovací klienti (beta)

Aplikace se při prvním spuštění naplní čtrnácti fiktivními klienty. Prvních pět (Novákovi, Horákovi, Jana Malá, Petr Dvořák, Prázdný klient) je základní ukázka. Devět klientů „Test 1…9“ ukazuje po jednom stavu, kterého aplikace umí dosáhnout. Tabulka slouží poradkyni jako mapa při prvním testování. Čísla jsou orientační a vznikla výpočtem aplikace z fiktivních dat.

Už uložená data v prohlížeči se nepřepisují, testovací klienti se jen doplní. Tlačítko pro obnovu ukázek vrátí všechny výchozí hodnoty.

| Klient | Co ukazuje a kde se podívat | Dnes zbývá měsíčně | Zbude u nového bytu (varianty) |
|---|---|---|---|
| Test 1 · Pronájem a daň | pronájem starého bytu, podíl, který platí vlastník, použitá daň A, ale nejnižší vychází C (návrh daňové optimalizace), refixace za 9 měsíců, nová hypotéka s LTV nad 90 %.. Kde: Stávající byt, Scénáře, Přehled. | 107 271 Kč | 22 187 Kč |
| Test 2 · Refixace brzy, byt prázdný | stávající byt zůstává prázdný, refixace za 10 měsíců (zdraží splátku), scénáře Zůstat a Zůstat po refinancování a dva noví kandidáti.. Kde: Scénáře, Stávající byt (Ponechat prázdný), Přehled (Dnes). | 57 570 Kč | 21 944 Kč, 18 873 Kč |
| Test 3 · Byt bez hypotéky, prodej s daní | stávající byt bez hypotéky (vypnutý přepínač Hypotéka), prodej se zdaněním zisku 15 % (nevyplněno osvobození), čistý výtěžek jde do nového bytu.. Kde: Stávající byt (Prodat), Přehled, Grafy (financování). | 52 733 Kč | 40 214 Kč |
| Test 4 · Záporné cashflow a rizika | vypnuté roční výdaje, bez stávajícího bytu, malé úspory (použití úspor nad dostupné = Pozor), LTV nad 90 %, záporné cashflow (▼), upozornění seřazená Riziko první.. Kde: Přehled, Grafy, Příjmy a výdaje. | 28 100 Kč | −11 337 Kč, 513 Kč |
| Test 5 · Dlouhá fixace a pronájem | refixace až za 30 měsíců (karta pronájmu ukáže jen tabulku po refixaci, bez porovnání do 12 měsíců), pronájem pokrývá hypotéku (přispívá), použitá daň C je nejnižší.. Kde: Stávající byt, Scénáře (Pronajímat). | 59 683 Kč | 52 823 Kč, 44 991 Kč |
| Test 6 · Šest variant, shody a LTV pásma | klient bez bytu, šest variant (maximum), LTV pod 80 %, 80 až 90 % a nad 90 %, dvě shodné varianty (obě označené jako nejlepší, shoda).. Kde: Přehled, Srovnání, Grafy. | 84 533 Kč | 53 329 Kč, 50 185 Kč, 46 516 Kč, 53 329 Kč, 47 812 Kč, 42 421 Kč |
| Test 7 · Jen příjmy a výdaje | klient bez variant a bez bytu. Přehled ukáže výzvu k přidání varianty, ostatní záložky jsou prázdné a nic se nepočítá.. Kde: Přehled, Příjmy a výdaje. | 37 367 Kč | — |
| Test 8 · Pronájem bytu bez hypotéky | pronájem bytu bez hypotéky (všechno z nájmu zůstává), daň z pronájmu ve třech variantách a návrh nejnižší, žádná tabulka refixace.. Kde: Stávající byt (Pronajímat), Scénáře. | 41 483 Kč | 17 724 Kč |
| Test 9 · Prodej se ztrátou | prodejní cena nižší než dluh na hypotéce. Čistý výtěžek je záporný, chybějící částku je nutné doplatit, nová hypotéka je vyšší o tento doplatek.. Kde: Stávající byt (Prodat), Grafy (financování), Přehled. | 4 403 Kč | 3 079 Kč |

## Jak testovat

1. Otevři klienta v seznamu a projdi záložky v pořadí Přehled, Scénáře, Srovnání, Grafy, Stávající byt, Příjmy a výdaje.
2. Změň jednu hodnotu (například nájem, sazbu nebo cenu bytu) a ověř, že se čísla přepočítají hned.
3. Vyzkoušej Prezentovat klientovi: Přehled (scénáře), Grafy, Tabulka a Stávající byt.
4. Při nahlášení problému pošli označení z pruhu pod menu (například K-1PLM · v2026-11-18.1) a popis, co jsi čekala.

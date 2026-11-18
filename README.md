# Kalkulačka bydlení – demo pro finančního poradce

Demonstrační nástroj: více klientů, u každého stávající byt a až 6 kandidátních bytů srovnávaných s „Dnes“, přepínače situací (prodej / pronájem / refixace / koupě) a výsledky hned po zadání.

**Všechna data jsou fiktivní. Výpočet je orientační, ne nabídka banky.**

## Spuštění
- Otevřete `index.html` v prohlížeči (bez serveru, bez instalace, bez externích knihoven či fontů).
- Testy: `node tests/run.js` (57 testů modelu, importu, uložení, grafů, kontrola soukromí).
- Prohlížečový test: `python3 tests/e2e.py` (Playwright + Chromium; živý přepočet, fokus, přepínače, export/import, režim pro klienta).
- Nezávislé ověření čísel: `python3 docs/overeni-hodnot.py` (Decimal, porovnáno s testy).

## Struktura
- `js/model.js` – výpočty (anuita, refixace, LTV, DSTI, prodej s daní, daň z pronájmu varianty A/B/C, scénáře).
- `js/store.js` – localStorage (`kalkulacka-bydleni-demo-v1`), export/import JSON, ukázkoví klienti.
- `js/derive.js` – odvozené texty a hodnoty pro obrazovky. `js/charts.js` – SVG/HTML grafy (Sankey, sloupce, pruhy).
- `js/app.js` – 13 obrazovek + stránka „Jak aplikace funguje“ (schéma, postup, slovníček), průvodce novým klientem (4 kroky, klient vznikne až po dokončení), boční panel, režim pro klienta. `styles.css` – tokeny a komponenty (paleta Okabe–Ito, šrafování místo samotné barvy).

## Data a soukromí
Data zůstávají jen v prohlížeči (localStorage). Nic se neodesílá. Zálohu a přenos řeší export/import JSON (jeden klient nebo všichni; import vždy přidává, nic nepřepisuje). Poškozená data se uloží do `…-poskozena` a načte se ukázka.

## Známá omezení (neskrýváme)
- Daň z pronájmu A/B/C je zjednodušená; pojištění hypotéky je pevná částka; LTV/DSTI jsou informativní, bez bankovních limitů.
- Export PNG/PDF je zatím neaktivní zástupce; žádné mobilní rozložení (cíl Full HD, použitelné od 1366 px).
- Při 1280 px přetéká přehled o cca 7 px (není cílová šířka).

## Odchylky od předlohy
- Zvýraznění shody v „Nemovitosti − dluhy“ označí scénáře 2 i 3 (předloha jen 2).
- Přehled klienta s hodně riziky ukazuje Prodej + Upozornění jen při ≥ 4 upozorněních.
- Tlačítko „Upravit klienta“ chybí (hlavička: Exportovat + Prezentovat).

## Otevřené otázky z předlohy (použit výchozí návrh)
1 nájem u klienta bez bytu · 2 základ LTV · 3 splacení hypotéky při prodeji · 4 dělení výtěžku prodeje · 5 limit DSTI · 6 sazba daně 15/23 % a odpis v prvním roce · 7 scénář „ponechat prázdný“. Podrobnosti viz README předlohy; změna je vždy v `js/model.js`.

Kontrolní příklady: `docs/KONTROLNI-PRIKLADY.md`.

## Pronájem starého bytu: podíl nájemníka, refixace, daň

- **Z provozu platí vlastník** (Kč/měs.): při pronájmu se jako náklad vlastníka počítá jen tato částka (typicky fond oprav, správa, pojištění domu), zbytek provozu hradí nájemník. Vstupuje do čistého nájmu, daně i „Starý byt po odečtu nájmu". Prázdné nebo 0 = celý provoz platí vlastník.
- **Před a po refixaci**: pokud fixace končí do 12 měsíců, karta pronájmu ukáže sloupce Dnes / Po refixaci / Změna a součet prvních 12 měsíců. Při delší fixaci zůstává jednoduchá tabulka „po refixaci".
- **Návrh daňové optimalizace**: text pod tabulkou daně řekne, která varianta (A, B, C) vychází nejníže a o kolik méně než ta použitá. Variantu nepřepíná, jen navrhuje.

## Rozdíly v dani proti osobní kalkulačce autora (záměrně ponecháno)

Splátka, zůstatek po refixaci a čistý nájem se počítají stejně. Daň z nájmu (varianta C) se liší ve třech zjednodušeních:

| | Osobní kalkulačka | Tato demo aplikace |
|---|---|---|
| Odpisy | 1,4 % v prvním roce | 3,4 % z pořizovací ceny |
| Úrok z hypotéky | úroky za 12 měsíců po refixaci | dnešní zůstatek × dnešní sazba |
| Pojištění hypotéky | uznaný výdaj | neuznává se |

Demo je zjednodušený, neověřený model a kontrolní hodnoty v testech (tests/fixtures.js) na tom stojí.

## Správa klientů

Na úvodní obrazovce je celkový přehled: počet klientů, objem a průměr nových hypoték, průměrně zbývající částka měsíčně, průměrná sazba a doba, kalendář fixací (12 měsíců), situace klientů, žebříček „kolik zbude měsíčně“ a tabulka hypoték podle klientů. Čísla se počítají z nejvýhodnější varianty každého klienta.

V seznamu klientů (menu ⋮ u řádku) a v rozbalovátku jde klienta **upravit** (jméno, poznámka; kód `K-XXXX` se nemění), **duplikovat** a **smazat**. Smazání vyžaduje potvrzení (s nabídkou exportu) a po něm je 8 vteřin tlačítko **Vrátit zpět**. Po obnovení stránky už vrátit nejde, proto zálohujte.

## Označení pro hlášení problémů

V šedém pruhu pod menu je vpravo označení ve tvaru `K-JN2T · v2026-11-18.1`: čtyřmístný kód klienta (stálý, přenáší se i exportem a importem) a verze aplikace. Kliknutím se zkopíruje. Při hlášení chyby pošlete toto označení, záložku a popis, ať je jasné, o kterém klientovi a které verzi je řeč. Číslo verze (`VERSION` v `js/app.js`) se zvyšuje ručně při každém vydání.

## Ukázkoví klienti

Při prvním spuštění jsou v aplikaci tři fiktivní klienti, každý s jinou situací:

| Klient | Situace |
|---|---|
| Kučerovi | Stávající byt si nechají a pronajímají, vybírají ze dvou nových bytů. |
| Dostálovi | Stávající byt prodají a z výtěžku financují nový, vybírají ze tří. |
| Marešovi | Byt si nechají a pronajímají, hypotéku refinancují za 7 měsíců, vybírají ze dvou nových bytů. |

Podrobnosti a postup testování: [docs/TESTOVACI-KLIENTI.md](docs/TESTOVACI-KLIENTI.md). Ukázky se při změně dat v nové verzi aplikace nahradí novými, vlastní klienti zůstanou. Automatické testy používají vlastní pevná data v `tests/fixtures.js`, ne ukázkové klienty z aplikace.

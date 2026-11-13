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
- `js/app.js` – 13 obrazovek, průvodce novým klientem (4 kroky, klient vznikne až po dokončení), boční panel, režim pro klienta. `styles.css` – tokeny a komponenty (paleta Okabe–Ito, šrafování místo samotné barvy).

## Data a soukromí
Data zůstávají jen v prohlížeči (localStorage). Nic se neodesílá. Zálohu a přenos řeší export/import JSON (jeden klient nebo všichni; import vždy přidává, nic nepřepisuje). Poškozená data se uloží do `…-poskozena` a načte se ukázka.

## Známá omezení (neskrýváme)
- Daň z pronájmu A/B/C je zjednodušená; pojištění hypotéky je pevná částka; LTV/DSTI jsou informativní, bez bankovních limitů.
- Export PNG/PDF je zatím neaktivní zástupce; žádné mobilní rozložení (cíl Full HD, použitelné od 1366 px).
- Při 1280 px přetéká přehled o cca 7 px (není cílová šířka).

## Odchylky od předlohy
- Zvýraznění shody v „Nemovitosti − dluhy“ označí scénáře 2 i 3 (předloha jen 2).
- Přehled prázdného klienta (Jana) ukazuje Prodej + Upozornění jen při ≥ 4 upozorněních.
- Prázdný ukázkový klient je řazen poslední (aktualizován před 7 dny, ne „před 10 min“).
- Tlačítko „Upravit klienta“ chybí (hlavička: Exportovat + Prezentovat).

## Otevřené otázky z předlohy (použit výchozí návrh)
1 nájem u klienta bez bytu · 2 základ LTV · 3 splacení hypotéky při prodeji · 4 dělení výtěžku prodeje · 5 limit DSTI · 6 sazba daně 15/23 % a odpis v prvním roce · 7 scénář „ponechat prázdný“. Podrobnosti viz README předlohy; změna je vždy v `js/model.js`.

Kontrolní příklady: `docs/KONTROLNI-PRIKLADY.md`.

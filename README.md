# Kalkulačka bydlení – demo pro finanční poradce

Webová kalkulačka bydlení a hypotéky pro finanční poradkyni. Poradkyně si vede více klientů vedle sebe, u každého zapíná situace přepínači a čísla vidí hned po zadání.

> **DEMO. Orientační výpočet, ne nabídka banky.** Všechna data v repozitáři jsou vymyšlená. Do aplikace nezadávejte skutečné údaje klientů.

## Co umí

- **Více klientů**, každý s vlastním profilem. Mezi klienty se přepíná v levém panelu.
- **Přepínače situací** (mění formuláře i výstupy): mám stávající byt, stávající hypotéka, končí fixace, prodat stávající byt, pronajímat stávající byt (daň A/B/C), koupit nový byt, roční výdaje. Prodej a pronájem se vylučují.
- **Domácnost:** příjmy, měsíční výdaje a roční jednorázové výdaje (rozepsané položky), úspory.
- **Až 6 variant nového bytu** u jednoho klienta: cena, rekonstrukce rozepsaná do položek, financování z úspor, hypotéka, dvě pojištění hypotéky (starý byt prodán / ponechán), provozní náklady.
- **Srovnání variant** v tabulce a ve třech grafech (měsíční náklady na bydlení, volné cashflow, financování). Každý graf má i tabulkový pohled.
- **Refixace** stávající hypotéky: splátka po konci fixace za novou sazbu.
- **Data jen lokálně** (localStorage). Záloha a přenos přes export a import JSON. Žádný server, žádné přihlášení.

Optimalizováno pro displeje od Full HD (1920 × 1080). Mobil se nepodporuje.

## Spuštění

Čisté HTML, CSS a JS bez build nástrojů. Otevřete `index.html` v prohlížeči, nebo nasaďte na GitHub Pages.

```
node tests/run.js        # kontrolní příklady v Node
tests/tests.html         # totéž v prohlížeči
python3 docs/overeni-hodnot.py   # nezávislý přepočet očekávaných hodnot
```

## Známá omezení výpočtů

| Oblast | Omezení |
|---|---|
| Daň z pronájmu (A paušál, B skutečné výdaje, C výdaje + odpisy) | Zjednodušený model, daňový poradce ho neověřil. Nepočítá slevy na poplatníka, zaokrouhlování základu ani sazbu 23 %. Ztráta se nezohledňuje. |
| Daň z prodeje bytu | Jen příznak „osvobozeno / zdaněno“ (15 % ze zisku). Podmínky osvobození musí posoudit poradce. |
| Pojištění hypotéky | Pevná částka zadaná ručně, nepřepočítává se podle výše úvěru. |
| LTV, splátky / příjem | Orientační ukazatele, ne bankovní posouzení. |
| Refinancování | Neumí se, jen refixace u stejné banky. |
| Ověření | Výpočty nejsou nezávisle ověřené. Kontrolní příklady dokazují shodu kódu se vzorci, ne právní správnost modelu. |

## Struktura

| Soubor | Obsah |
|---|---|
| `index.html`, `styles.css` | rozhraní |
| `js/calc.js` | čistá výpočetní logika (bez DOM, testovatelná v Node) |
| `js/store.js` | datový model, fiktivní ukázková data, localStorage, export a import JSON |
| `js/charts.js` | vlastní SVG grafy, bez knihoven a bez CDN |
| `js/ui.js` | vykreslování a formuláře |
| `tests/`, `docs/` | kontrolní příklady a jejich nezávislé ověření |

## Co zatím chybí

- Export grafů (PNG/PDF) a sdílení. Poslání e-mailem z webu bez serveru nejde, poradkyně si stažený soubor pošle sama.
- Měsíční časová osa („jak to bude za X měsíců“).
- Refinancování, tmavý režim, mobilní rozložení.

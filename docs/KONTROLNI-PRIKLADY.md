# Kontrolní příklady (fiktivní data)

Hodnoty vznikly nezávisle v `docs/overeni-hodnot.py` (Python Decimal) a hlídá je `tests/cases.js`.

| Příklad | Hodnota |
|---|---|
| Anuita 3 000 000 Kč, 5 %, 30 let | 16 104,65 Kč |
| Anuita 2 000 000 Kč, 4,5 %, 25 let | 11 116,65 Kč |
| Novák – dnešní splátka | 13 454,63 Kč |
| Novák – zůstatek při refixaci | 2 326 937,56 Kč |
| Novák – splátka po refixaci | 16 611,68 Kč (rozdíl +3 157,05) |
| Novák – daň z pronájmu A / B / C | 24 343,20 / 11 412 / 0 Kč |
| Novák – Žižkov 3+1: hypotéka, splátka, LTV | 5 500 000 Kč, 28 823,36 Kč, 79,7 % |
| Novák – Žižkov 3+1: zbývá měsíčně | 15 283,96 Kč |
| Novák – Dnes zbývá | 39 025,37 Kč |
| Scénáře v pořadí 1–5: zůstat / zůstat po refinancování / prodat a koupit / pronajímat a koupit / pronajímat po refinancování a koupit (zbývá) | 39 025,37 / 35 868,32 / 41 606,58 / 18 441,01 / 15 283,96 Kč |
| Výtěžek prodeje Novák / Horák / Jana | 3 574 000 / 6 316 000 / −42 725 Kč |
| Strop paušálu u pronájmu | 600 000 Kč |

Jana: LTV 101,1 % (hypotéka 5 660 000 Kč) – model ukáže upozornění, ne zákaz.
Limity: daň z pronájmu A/B/C je zjednodušená, pojištění hypotéky je pevná částka, výpočet je orientační.

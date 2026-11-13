# Kontrolní příklady

Očekávané hodnoty jsou spočítané **nezávisle na aplikaci**: `docs/overeni-hodnot.py` počítá anuitu a zůstatek cyklem po měsících (Decimal), daň a prodej prostou aritmetikou. Příklad 01 je navíc obecně známá hodnota. Test (`node tests/run.js`) dokazuje, že kód odpovídá těmto vzorcům. **Neříká nic o právní správnosti daňového modelu.**

| # | Co se ověřuje | Vstup | Očekáváno |
|---|---|---|---|
| 01 | Anuita | 3 000 000 Kč, 5 %, 30 let | 16 104,65 Kč |
| 02 | Anuita | 2 000 000 Kč, 4,5 %, 25 let | 11 116,65 Kč |
| 03 | Anuita při 0 % | 1 200 000 Kč, 10 let | 10 000,00 Kč |
| 04 | Zůstatek po 60 měsících | 2 000 000 Kč, 4,5 %, 25 let | 1 757 158,07 Kč |
| 05a | Refixace: splátka dnes | 2 500 000 Kč, 2,19 %, 240 měs. | 12 873,27 Kč |
| 05b | Refixace: zůstatek na konci fixace | po 18 měsících | 2 348 062,83 Kč |
| 05c | Refixace: splátka po refixaci | nová sazba 5,2 %, zbývá 222 měs. | 16 488,93 Kč |
| 06 | Daň z nájmu A | 20 000 × 11 měs. = 220 000, výdaje 30 %, daň 15 % | 23 100,00 Kč |
| 07 | Daň z nájmu A, strop paušálu | příjem 2,4 mil., výdaje max. 600 000 | 270 000,00 Kč |
| 08 | Daň z nájmu B | provoz 36 000 + opravy 20 000 + správa 5 % + úroky za 12 měs. (29 493,20) | 18 526,02 Kč |
| 09 | Daň z nájmu C | jako B + odpisy 2 000 000 × 3,4 % | 8 326,02 Kč |
| 10 | Ztráta z nájmu | výdaje vyšší než příjem | 0 Kč |
| 11a | Výtěžek z prodeje, osvobozeno | 6 mil. − provize 180 000 − náklady 25 000 − hypotéka 2 mil. | 3 795 000 Kč |
| 11b | Výtěžek z prodeje, zdaněno | daň 15 % ze základu 2 295 000 | 3 450 750 Kč |
| 12a | Výše hypotéky u varianty | 7,5 mil. − úspory 800 000 − výtěžek 3 795 000 | 2 905 000 Kč |
| 12b | Splátka této hypotéky | 4,5 %, 30 let | 14 719,21 Kč |
| 13 | Volné cashflow bez starého bytu | příjem 100 000, výdaje 35 000, splátka 4 mil./5 %/30 let + 700 + 3 000 | 39 827,14 Kč |
| 14 | Starý byt ponechán a pronajímán | splátka 10 000 + pojištění 500 + provoz 2 000 − nájem po dani 17 900 | −5 400,00 Kč |

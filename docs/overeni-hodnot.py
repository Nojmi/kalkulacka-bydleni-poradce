#!/usr/bin/env python3
"""Nezávislé ověření výpočtů: stejné vstupy, jiný postup (Decimal, splátky se simulují po měsících,
žádný uzavřený vzorec pro zůstatek). Výstup se porovnává s tests/cases.js (spusťte: python3 docs/overeni-hodnot.py)."""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
getcontext().prec = 40

def pmt(P, rate_pct, n):
    P, r, n = D(P), D(str(rate_pct)) / 1200, int(n)
    if P <= 0 or n <= 0: return D(0)
    if r == 0: return P / n
    f = (1 + r) ** n
    return P * r * f / (f - 1)

def balance_after(P, rate_pct, n, k):
    """zůstatek simulací: každý měsíc úrok, platba, zbytek"""
    r = D(str(rate_pct)) / 1200
    p = pmt(P, rate_pct, n)
    b = D(P)
    for _ in range(k):
        b = b + b * r - p
    return b

def q(x, places="0.01"):
    return D(x).quantize(D(places), rounding=ROUND_HALF_UP)

out = {}
# --- anuity
out["ann_3M_5_30"] = q(pmt(3_000_000, 5, 360))
out["ann_2M_4.5_25"] = q(pmt(2_000_000, "4.5", 300))
out["ann_0pct"] = q(pmt(1_200_000, 0, 240))
# --- Novákovi: stávající hypotéka a refixace
pn = pmt(2_400_000, "2.19", 216)
bf = balance_after(2_400_000, "2.19", 216, 8)
pf = pmt(bf, "4.89", 216 - 8)
out["nov_pmtNow"] = q(pn); out["nov_balFix"] = q(bf); out["nov_pmtFix"] = q(pf); out["nov_delta"] = q(pf - pn)
# --- Novákovi: daň z pronájmu A/B/C
rent_y = D(21000) * 12
inc = rent_y - rent_y * D(8) / 100
ops_y = D(3800 + 3200 + 350) * 12
rep = D(15000); interest = D(2_400_000) * D("2.19") / 100; dep = D(3_900_000) * D("0.034")
baseA = inc - min(inc * D("0.3"), D(600000))
baseB = inc - (ops_y + rep + interest)
baseC = max(D(0), inc - (ops_y + rep + interest + dep))
out["nov_taxA"] = q(baseA * D("0.15")); out["nov_taxB"] = q(baseB * D("0.15")); out["nov_taxC"] = q(baseC * D("0.15"))
out["nov_netM_B"] = q((inc - rep - ops_y - baseB * D("0.15")) / 12)
# --- Novákovi: varianta Žižkov 3+1
need = 6_900_000 + 110_000 + (160000 + 190000 + 70000 + 30000 + 0 + 0 + 20000 + 0 + 0 + 20000)
mort = need - (500_000 + 1_500_000)
p1 = pmt(mort, "4.79", 360)
out["nov_v1_need"] = D(need); out["nov_v1_mort"] = D(mort); out["nov_v1_pmt"] = q(p1)
out["nov_v1_ltv_pct"] = q(D(mort) / D(6_900_000) * 100, "0.1")
old_net = pf + 520 + 7350 - (inc - rep - baseB * D("0.15")) / 12
out["nov_v1_total"] = q(p1 + 680 + (4100 + 3600 + 380 + 120) + old_net)
income = D(110000); exp_total = D(40400) + D(111000) / 12
out["nov_v1_free"] = q(income - exp_total - (p1 + 680 + 8200 + old_net))
out["nov_today_free_pmtNow"] = q(income - exp_total - (pn + 520 + 7350))
# --- Novákovi: scénáře (stejný nový byt, jiné nakládání se starým)
out["nov_free_now_refix"] = q(income - exp_total - (pf + 520 + 7350))
rent_part = (inc - rep - baseB * D("0.15")) / 12
old2 = pn + 520 + 7350 - rent_part                       # sc. 2: dnešní sazba
out["nov_sc2_old"] = q(old2)
out["nov_sc2_free"] = q(income - exp_total - (p1 + 680 + 8200 + old2))
proceeds = D(6_200_000) - D(6_200_000) * 3 / 100 - 40_000 - 2_400_000   # osvobozeno
out["nov_sale_net"] = q(proceeds)
mort1 = need - 2_000_000 - proceeds
p_sc1 = pmt(mort1, "4.79", 360)
out["nov_sc1_mort"] = q(mort1)
out["nov_sc1_free"] = q(income - exp_total - (p_sc1 + 450 + 8200))
# --- prodej: Horákovi (osvobozeno) a Jana (daň 15 %)
out["hor_sale_net"] = q(D(7_800_000) - D(7_800_000) * 3 / 100 - 50_000 - 1_200_000)
gain = D(5_100_000) - 4_300_000 - D(5_100_000) * D("3.5") / 100 - 60_000
tax = gain * D("0.15")
out["jana_gain"] = q(gain); out["jana_tax"] = q(tax)
out["jana_sale_net"] = q(D(5_100_000) - D(5_100_000) * D("3.5") / 100 - 60_000 - 4_820_000 - tax)
need_j = 5_600_000 + 90_000 + (120000 + 150000 + 60000 + 25000 + 15000)
mort_j = need_j - (200_000 + 200_000)
out["jana_v1_mort"] = D(mort_j); out["jana_v1_ltv_pct"] = q(D(mort_j) / D(5_600_000) * 100, "0.1")
# --- strop paušálu 600 000 (nájem 4 mil. ročně)
inc2 = D(4_000_000)
out["pausal_cap_exp"] = q(min(inc2 * D("0.3"), D(600000)))
if __name__ == "__main__":
    for k, v in out.items(): print(f"{k:28s} {v}")

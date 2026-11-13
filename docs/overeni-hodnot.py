"""Nezávislý výpočet očekávaných hodnot pro tests/cases.js.
Postup je záměrně jiný než v aplikaci: anuita a zůstatek se počítají cyklem po měsících (Decimal),
ne uzavřeným vzorcem. Spuštění: python3 docs/overeni-hodnot.py"""
from decimal import Decimal as D, getcontext
getcontext().prec = 40

def pmt(P, r, n):
    P, r = D(P), D(r) / 100 / 12
    return P / n if r == 0 else P * r / (1 - (1 + r) ** (-n))

def amort(P, r, pay, months):
    P, r, pay = D(P), D(r) / 100 / 12, D(pay)
    interest = D(0)
    for _ in range(months):
        i = P * r; interest += i; P = P - (pay - i)
    return P, interest

q = lambda x: x.quantize(D('0.01'))
print('01 anuita 3 000 000 / 5 % / 360 m      ', q(pmt(3000000, 5, 360)))
print('02 anuita 2 000 000 / 4,5 % / 300 m    ', q(pmt(2000000, 4.5, 300)))
print('03 anuita 0 % 1 200 000 / 120 m        ', q(pmt(1200000, 0, 120)))
p = pmt(2000000, 4.5, 300)
print('04 zůstatek po 60 m                    ', q(amort(2000000, 4.5, p, 60)[0]))
pc = pmt(2500000, 2.19, 240); b18, _ = amort(2500000, 2.19, pc, 18)
print('05 splátka dnes / zůstatek 18 m / po   ', q(pc), q(b18), q(pmt(b18, 5.2, 222)))
print('06 daň A: 20 000 x 11 = 220 000        ', q(D(220000) * D('0.7') * D('0.15')))
print('07 daň A se stropem: 2 400 000         ', q((D(2400000) - 600000) * D('0.15')))
pi = pmt(1000000, 3, 240); _, int12 = amort(1000000, 3, pi, 12)
exp_b = 36000 + 20000 + D(220000) * D('0.05') + int12
print('08 daň B (výdaje, základ, daň)         ', q(exp_b), q(D(220000) - exp_b), q((D(220000) - exp_b) * D('0.15')))
exp_c = exp_b + D(2000000) * D('0.034')
print('09 daň C (výdaje, základ, daň)         ', q(exp_c), q(D(220000) - exp_c), q((D(220000) - exp_c) * D('0.15')))
print('10 ztráta: základ se ořízne na 0       ', 0)
proceeds = 6000000 - 180000 - 25000 - 2000000
print('11a výtěžek osvobozeno                 ', proceeds)
print('11b výtěžek zdaněno (daň 15 % ze 2 295 000)', proceeds - q(D(2295000) * D('0.15')))
loan = 7000000 + 100000 + 400000 - 800000 - proceeds
print('12 hypotéka / splátka                  ', loan, q(pmt(loan, 4.5, 360)))
p13 = pmt(4000000, 5, 360)
print('13 splátka / volné cashflow            ', q(p13), q(D(100000) - D(35000) - (p13 + 700 + 3000)))
rent_net = (D(240000) - (D(240000) - D(72000)) * D('0.15')) / 12   # nájem 240 000, paušál 30 % = 72 000, daň 15 %
print('14 nájem po dani měsíčně / netto starý byt', q(rent_net), q(D(10000) + 500 + 2000 - rent_net))

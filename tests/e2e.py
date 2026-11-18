#!/usr/bin/env python3
"""Prohlížečový test (Playwright, headless Chromium): živý přepočet, fokus při psaní, Tab, přepínače,
6 variant, export/import, smazání klienta, režim pro klienta, chyby v konzoli.
Spuštění: python3 tests/e2e.py   (potřebuje: pip install playwright && playwright install chromium)"""
import json, os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
URL = 'file://' + os.path.join(ROOT, 'index.html')
tmp = tempfile.mkdtemp()
# pevná testovací data (tests/fixtures.js), ne ukázkoví klienti z aplikace
FIX = subprocess.run(['node', '-e', "const KB=require('./js/model.js'),F=require('./tests/fixtures.js');const c=F.samples();console.log(JSON.stringify({clients:c,activeId:c[0].id,lastBackup:Date.now()-9*86400000,changes:5,seedV:KB.SEED_V,key:KB.KEY}))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
FIXD = json.loads(FIX); FIXKEY = FIXD.pop('key')
INIT = "if(!localStorage.getItem(%s))localStorage.setItem(%s,%s);" % (json.dumps(FIXKEY), json.dumps(FIXKEY), json.dumps(json.dumps(FIXD)))
fails = []
def check(cond, msg):
    print(('  ok   ' if cond else '  CHYBA ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1920, 'height': 1080}, accept_downloads=True); ctx.add_init_script(INIT); pg = ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    check(pg.inner_text('h1') == 'Dobrý den', 'první obrazovka je domovská stránka')
    check(pg.locator('.note:has-text("Orientační výpočet, ne nabídka banky")').count() == 1, 'pruh s upozorněním je vidět')
    pg.click('.helpbar'); pg.wait_for_timeout(200)
    check(pg.inner_text('h1') == 'Jak aplikace funguje' and pg.locator('svg[aria-label^="Schéma aplikace"]').count() == 1, 'tlačítko na úvodní obrazovce otevře schéma aplikace')
    pg.click('.hdr >> text=Zpět do aplikace'); pg.wait_for_timeout(200)
    check(pg.inner_text('h1') == 'Dobrý den', 'ze schématu je cesta zpět')
    pg.click('.cr:has-text("Novákovi")'); pg.wait_for_timeout(200)
    check(bool(__import__('re').match(r'K-[0-9A-Z]{4} · v\d{4}-\d\d-\d\d', pg.inner_text('.note .ref'))), 'v pruhu je označení klienta a verze ke sdílení problému')
    check('Žižkov 3+1' in pg.inner_text('h1'), 'Novákovi: nejlepší varianta Žižkov 3+1')
    check('15 284' in pg.inner_text('.vcard.best').replace('\xa0', ' '), 'Novákovi: zbude 15 284 Kč')
    pg.hover('.sumbox .tip >> nth=1'); pg.wait_for_timeout(150)
    check(pg.locator('.sumbox .tip >> nth=1 >> .tb').is_visible() and 'Výdaje celkem' in pg.inner_text('.sumbox .tip >> nth=1 >> .tb'), 'ⓘ u výdajů domácnosti ukáže, jak se číslo spočítalo')
    pg.goto(URL + '#grafy'); pg.wait_for_timeout(300)
    check(pg.locator('.card:has-text("Kam jde příjem a nájem") svg').count() == 1, 'graf toků s nájmem je v Grafech')
    pg.goto(URL + '#byt'); pg.wait_for_timeout(300)
    check(pg.locator('.wf .wr').count() == 9, 'rozpad nájmu má 9 řádků')
    pg.goto(URL); pg.wait_for_timeout(300); pg.click('.cr:has-text("Novákovi")'); pg.wait_for_timeout(200)
    # živý přepočet a fokus
    pg.click('.vcard.best'); pg.wait_for_timeout(400)
    pg.click('#panel input[data-f="variants.0.price"]'); pg.keyboard.press('Control+A'); pg.keyboard.type('5900000', delay=15)
    check(pg.evaluate('document.activeElement.dataset.f') == 'variants.0.price', 'fokus zůstane v poli při psaní')
    check(pg.evaluate('window.__KB.cur().variants[0].price') == 5900000, 'hodnota se při psaní správně parsuje')
    check(pg.inner_text('#panel .live b').replace('\xa0', ' ') == '20 525 Kč', 'živý výsledek v panelu se přepočítá')
    check(pg.evaluate('document.activeElement.value') == '5\xa0900\xa0000', 'tisíce se oddělují už při psaní')
    pg.keyboard.press('Home'); pg.keyboard.type('1', delay=20)
    check(pg.evaluate('document.activeElement.value') == '15\xa0900\xa0000' and pg.evaluate('document.activeElement.selectionStart') == 1, 'vložení číslice uprostřed drží kurzor')
    pg.keyboard.press('Backspace')
    pg.keyboard.press('Tab')
    check(pg.evaluate('document.querySelector(\'#panel input[data-f="variants.0.price"]\').value') == '5\xa0900\xa0000', 'po opuštění pole se číslo zformátuje')
    pg.click('#panel input[data-f="variants.0.rate"]'); pg.keyboard.press('Control+A'); pg.keyboard.type('4,', delay=30)
    check(pg.evaluate('document.activeElement.value') == '4,', 'pole drží rozepsané „4,“')
    pg.keyboard.type('5', delay=30)
    check(pg.evaluate('window.__KB.cur().variants[0].rate') == 4.5, 'desetinná čárka se zpracuje (4,5)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(900); pg.reload(); pg.wait_for_timeout(300)
    check(pg.evaluate("window.__KB.S.clients.find(c=>c.name==='Novákovi').variants[0].price") == 5900000, 'změna přežije obnovení stránky (localStorage)')
    # Tab přeskakuje názvy položek
    pg.evaluate("location.hash='#prijmy'"); pg.wait_for_timeout(200)
    pg.click('input[data-f="incomes.0.amount"]'); pg.wait_for_timeout(300); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); pg.keyboard.press('Tab'); pg.wait_for_timeout(150)
    check(pg.evaluate('document.activeElement.dataset.f') == 'incomes.1.amount', 'Tab přeskakuje názvy položek (částka → × → další částka)')
    # přepínače
    pg.click('.trow:has-text("Prodat stávající byt") .tg')
    check(pg.evaluate('(()=>{const t=window.__KB.cur().t;return [t.sell,t.rent]})()') == [True, False], 'zapnutí prodeje vypne pronájem')
    pg.click('.trow:has-text("Pronajímat stávající byt") .tg')
    check(pg.evaluate('(()=>{const t=window.__KB.cur().t;return [t.sell,t.rent]})()') == [False, True], 'zapnutí pronájmu vypne prodej')
    pg.click('.trow:has-text("Mám stávající byt") .tg')
    check('Stávající byt' not in pg.inner_text('.tabs'), 'bez bytu chybí záložka Stávající byt')
    pg.click('.trow:has-text("Mám stávající byt") .tg')
    # 6 variant
    pg.evaluate("location.hash='#prehled'"); pg.wait_for_timeout(200)
    for _ in range(5):
        if pg.locator('[data-act=addVar]').count() == 0: break
        pg.click('[data-act=addVar]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
    check(pg.evaluate('window.__KB.cur().variants.length') == 6, 'nejvýš 6 variant')
    check(pg.locator('text=Maximum 6 variant').count() >= 1, 'po dosažení maxima je tlačítko neaktivní')
    # export + import
    with pg.expect_download() as d: pg.click('text=Exportovat')
    path = os.path.join(tmp, 'exp.json'); d.value.save_as(path)
    data = json.load(open(path))
    check(data['app'] == 'kalkulacka-bydleni' and data['version'] == 1 and len(data['clients']) == 1, 'export jednoho klienta má správnou strukturu')
    with pg.expect_download() as d: pg.click('.bk')
    check(d.value.suggested_filename.startswith('kalkulacka-bydleni_vsichni-klienti_'), 'záloha všech má očekávaný název')
    check('dnes' in pg.inner_text('.bk'), 'štítek zálohy ukazuje „dnes“')
    n0 = pg.evaluate('window.__KB.S.clients.length')
    pg.click('.who'); pg.click('text=Importovat…'); pg.set_input_files('#file', path); pg.wait_for_timeout(300)
    check(pg.evaluate('window.__KB.S.clients.length') == n0 + 1, 'import přidá klienta, nic nepřepíše')
    pg.keyboard.press('Escape')
    bad = os.path.join(tmp, 'bad.json'); open(bad, 'w').write('{"clients":[{"name":"A","variants":[{},{},{},{},{},{},{}]},{"incomes":"x"}]}')
    pg.click('.who'); pg.click('text=Importovat…'); pg.set_input_files('#file', bad); pg.wait_for_timeout(300)
    check(pg.locator('.errb li').count() == 3 and pg.evaluate('window.__KB.S.clients.length') == n0 + 1, 'chybný import vypíše 3 chyby a nic nezmění')
    pg.keyboard.press('Escape')
    # nový klient a smazání
    n1 = pg.evaluate('window.__KB.S.clients.length')
    pg.click('.who'); pg.click('#dd >> text=+ Nový klient'); pg.wait_for_timeout(200)
    check(pg.locator('.wsteps .ws').count() == 4 and 'Klient a příjmy' in pg.inner_text('h1'), 'nový klient spustí průvodce o 4 krocích')
    check(pg.evaluate('window.__KB.S.clients.length') == n1, 'klient se nezaloží před dokončením')
    pg.fill('input[data-f="name"]', 'Testovi'); pg.fill('input[data-f="savings"]', '500000'); pg.fill('input[data-f="incomes.0.amount"]', '80000')
    pg.click('text=Další →'); pg.fill('input[data-f="expenses.0.amount"]', '20000'); pg.click('text=Další →')
    check('Situace' in pg.inner_text('h1'), 'třetí krok je Situace')
    pg.click('text=Další →'); pg.click('[data-act=addVar]'); pg.wait_for_timeout(200)
    pg.fill('#panel input[data-f="variants.0.price"]', '6000000'); pg.keyboard.press('Tab'); pg.keyboard.press('Escape')
    check(pg.locator('.wvar').count() == 1, 'varianta je v průvodci')
    pg.click('.hdr >> text=Zrušit'); pg.click('text=Pokračovat ve vyplňování')
    pg.click('text=Vytvořit klienta a ukázat přehled'); pg.wait_for_timeout(300)
    check(pg.evaluate('window.__KB.S.clients.length') == n1 + 1 and pg.evaluate('window.__KB.S.clients[0].name') == 'Testovi', 'klient vznikne až po dokončení')
    check(pg.locator('.tabs .tab.on').inner_text() == 'Přehled', 'po dokončení se ukáže přehled')
    pg.click('.who'); pg.click('#dd >> text=+ Nový klient'); pg.click('.hdr >> text=Zrušit'); pg.click('text=Zahodit a zrušit'); pg.wait_for_timeout(200)
    check(pg.evaluate('window.__KB.S.clients.length') == n1 + 1 and pg.inner_text('h1') == 'Dobrý den', 'zrušení průvodce nic nezaloží')
    pg.click('.cr:has-text("Testovi")'); pg.evaluate("location.hash='#prijmy'"); pg.wait_for_timeout(200)
    pg.click('text=Smazat klienta'); pg.click('text=Smazat natrvalo >> nth=-1'); pg.wait_for_timeout(200)
    check(pg.evaluate('window.__KB.S.clients.length') == n1, 'smazání klienta')
    # režim pro klienta
    pg.click('.cr >> nth=0'); pg.wait_for_timeout(200)
    pg.click('text=Prezentovat klientovi'); pg.wait_for_timeout(300)
    check(pg.locator('input:visible').count() == 0, 'v režimu pro klienta nejsou žádná vstupní pole')
    check(pg.locator('text=Orientační výpočet, ne nabídka banky').count() == 1, 'v režimu pro klienta je vidět upozornění')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check(pg.locator('.tabs').count() == 1, 'Escape ukončí prezentaci')
    check(not errs, 'v konzoli nejsou chyby ' + str(errs))
    # výchozí ukázková data aplikace: tři klienti, všechny záložky bez chyb
    ctx2 = b.new_context(viewport={'width': 1600, 'height': 1000}); p2 = ctx2.new_page(); e2 = []
    p2.on('pageerror', lambda e: e2.append(str(e)))
    p2.goto(URL); p2.wait_for_timeout(300)
    names = p2.locator('.cr b').all_inner_texts()
    check(names == ['Kučerovi', 'Dostálovi', 'Marešovi'], 'výchozí data: tři ukázkoví klienti ' + str(names))
    # správa klientů: úprava, smazání, vrácení zpět
    p2.click('.cr >> nth=0 >> text=Upravit'); p2.wait_for_timeout(200)
    p2.fill('#ecName', 'Kučerovi upr.'); p2.fill('#ecNote', 'nová poznámka'); p2.click('text=Uložit'); p2.wait_for_timeout(300)
    n2 = p2.locator('.cr b').all_inner_texts()
    check('Kučerovi upr.' in n2, 'úprava klienta změní jméno v seznamu ' + str(n2))
    p2.click('.cr >> nth=0 >> text=Smazat'); p2.wait_for_timeout(200)
    check(p2.locator('.m').count() == 1, 'smazání z řádku otevře potvrzení')
    p2.click('button:has-text("Smazat natrvalo")'); p2.wait_for_timeout(300)
    check(p2.locator('.cr').count() == 2, 'po smazání zbyli dva klienti ' + str(p2.locator('.cr b').all_inner_texts()) + str(p2.locator('.m').count()))
    p2.click('text=Vrátit zpět'); p2.wait_for_timeout(300)
    check(p2.locator('.cr').count() == 3, 'vrácení zpět obnoví klienta')
    for nm in names:
        p2.goto(URL); p2.wait_for_timeout(150); p2.locator('.cr', has_text=nm).first.click(); p2.wait_for_timeout(120)
        bad = False
        for t in ['Přehled', 'Scénáře', 'Srovnání', 'Grafy', 'Stávající byt', 'Příjmy a výdaje']:
            l = p2.locator('.hdr').get_by_text(t, exact=True)
            if l.count() == 0: continue
            l.first.click(); p2.wait_for_timeout(100)
            tx = p2.inner_text('#view')
            bad = bad or 'NaN' in tx or 'undefined' in tx or 'Infinity' in tx
        check(not bad, 'výchozí data: ' + nm + ' bez NaN ve všech záložkách')
    check(not e2, 'výchozí data: v konzoli nejsou chyby ' + str(e2))
    b.close()
print('\n' + ('VŠE V POŘÁDKU' if not fails else str(len(fails)) + ' chyb'))
sys.exit(1 if fails else 0)

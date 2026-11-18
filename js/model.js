/* Výpočetní model a ukázková data (převzato z podkladů návrhu, jen fiktivní data). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KB=factory();})(typeof self!=='undefined'?self:this,function(){
// Výpočetní model a ukázková data Kalkulačky bydlení (převzato z původního prototypu)

const RENO=['Kuchyň','Koupelna','Podlahy','Malování','Elektroinstalace','Voda a topení','Dveře','Okna','Vestavěné skříně','Ostatní'];
const VOPS=['Fond oprav a správa','Energie','Pojištění nemovitosti','Daň z nemovitosti'];
const KEY='kalkulacka-bydleni-demo-v1';
const uid=()=>Math.random().toString(36).slice(2,10);
const L=(label,amount)=>({label,amount:amount||0});
const sum=a=>(a||[]).reduce((s,x)=>s+(+x.amount||0),0);
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function ann(P,r,n){P=+P||0;n=+n||0;r=+r||0;if(P<=0||n<=0)return 0;const i=r/1200;return i===0?P/n:P*i/(1-Math.pow(1+i,-n));}
function balAfter(P,r,n,k){P=+P||0;const i=(+r||0)/1200,p=ann(P,r,n);if(i===0)return Math.max(0,P-p*k);const g=Math.pow(1+i,k);return Math.max(0,P*g-p*(g-1)/i);}
const NF=new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0});
const NF2=new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2});
const kc=n=>{if(n==null||!isFinite(n))return '—';const r=Math.round(n);return (r<0?'−':'')+NF.format(Math.abs(r))+' Kč';};
const kcd=n=>{const r=Math.round(n);return (r>0?'+':r<0?'−':'±')+NF.format(Math.abs(r))+' Kč';};
const pct=n=>n==null||!isFinite(n)?'—':(n*100).toFixed(1).replace('.',',')+' %';
const tis=n=>{const r=Math.round(n/100)/10;return (r<0?'−':'')+NF2.format(Math.abs(r));};
const mil=n=>NF2.format(Math.round(n/10000)/100)+' mil.';
const fmtIn=v=>v?NF2.format(v):'';
const parseNum=raw=>{const s=String(raw).replace(/\s/g,'').replace(/−/g,'-').replace(',','.').replace(/[^0-9.\-]/g,'');const n=parseFloat(s);return isFinite(n)?n:0;};
const pl=(n,a,b,c)=>n===1?a:(n>=2&&n<=4)?b:c;
function rel(ts){const m=Math.round((Date.now()-ts)/60000);if(m<2)return 'upraveno právě teď';if(m<60)return 'upraveno před '+m+' min';const h=Math.round(m/60);if(h<24)return 'upraveno před '+h+' h';const d=Math.round(h/24);return d===1?'upraveno včera':'upraveno před '+d+' dny';}
function mkVar(name,price,o){o=o||{};const r=o.reno||[],op=o.ops||[];return {id:uid(),name,price:price||0,acq:o.acq||0,reno:RENO.map((l,i)=>L(l,r[i])),savReno:o.savReno||0,savMort:o.savMort||0,rate:o.rate||4.79,years:o.years||30,insSold:o.insSold||0,insKept:o.insKept||0,ops:VOPS.map((l,i)=>L(l,op[i]))};}
function mkFlat(o){o=o||{};return {est:o.est||0,purchase:o.purchase||0,ops:o.ops||[L('Fond oprav a správa'),L('Energie'),L('Pojištění nemovitosti')],mort:Object.assign({balance:0,rate:0,months:0,ins:0},o.mort),fix:Object.assign({months:0,rate:0},o.fix),sale:Object.assign({comm:3,costs:0,exempt:true},o.sale),rent:Object.assign({rent:0,vac:8,repairs:0,tax:'A',owner:0},o.rent)};}
function mkClient(o){o=o||{};return {id:uid(),name:o.name||'Nový klient',note:o.note||'',savings:o.savings||0,
 incomes:o.incomes||[L('Příjem 1'),L('Příjem 2')],
 expenses:o.expenses||['Jídlo a drogerie','Doprava','Telefon a internet','Děti','Oblečení','Volný čas','Ostatní'].map(l=>L(l)),
 annual:o.annual||['Pojištění auta','Dovolená','Dárky a svátky','Servis auta','Ostatní'].map(l=>L(l)),
 t:Object.assign({flat:false,mort:false,fix:false,sell:false,rent:false,buy:true,annual:true},o.t),
 flat:mkFlat(o.flat),useRefix:o.useRefix!==false,variants:o.variants||[],sample:!!o.sample,updated:o.updated||Date.now()};}
function normalize(c){const n=mkClient(Object.assign({},c,{variants:(Array.isArray(c.variants)?c.variants:[]).map(v=>Object.assign(mkVar(v.name||'Varianta',+v.price||0),v,{id:uid()}))}));n.id=uid();n.sample=false;n.updated=Date.now();return n;}
function samples(){const now=Date.now(),H=3600000,D=86400000;
 const E=a=>['Jídlo a drogerie','Doprava','Telefon a internet','Děti','Oblečení','Volný čas','Ostatní'].map((l,i)=>L(l,a[i])),A=a=>['Pojištění auta','Dovolená','Dárky a svátky','Servis auta','Ostatní'].map((l,i)=>L(l,a[i]));
 return [
 mkClient({sample:true,updated:now-2*H,name:'Novákovi',note:'Chtějí větší byt kvůli druhému dítěti. Starý byt by rádi pronajímali.',savings:2600000,
  incomes:[L('Mzda – Karel',64000),L('Mzda – Eva',46000)],
  expenses:[L('Jídlo a drogerie',16000),L('Doprava',5500),L('Telefon a internet',1400),L('Děti (školka, kroužky)',6000),L('Oblečení',2500),L('Volný čas',4000),L('Spoření a investice',5000)],
  annual:[L('Pojištění auta',14000),L('Dovolená',60000),L('Dárky a svátky',15000),L('Servis auta',12000),L('Ostatní',10000)],
  t:{flat:true,mort:true,fix:true,rent:true,buy:true,annual:true},
  flat:{est:6200000,purchase:3900000,ops:[L('Fond oprav a správa',3800),L('Energie',3200),L('Pojištění nemovitosti',350)],mort:{balance:2400000,rate:2.19,months:216,ins:520},fix:{months:8,rate:4.89},sale:{comm:3,costs:40000,exempt:true},rent:{rent:21000,vac:8,repairs:15000,tax:'B'}},
  variants:[mkVar('Žižkov 3+1',6900000,{acq:110000,reno:[160000,190000,70000,30000,0,0,20000,0,0,20000],savReno:500000,savMort:1500000,insSold:450,insKept:680,ops:[4100,3600,380,120]}),
   mkVar('Vinohrady 3+kk',8400000,{acq:130000,reno:[180000,220000,90000,35000,60000,0,25000,0,40000,30000],savReno:600000,savMort:1800000,insSold:520,insKept:760,ops:[4600,3900,420,150]}),
   mkVar('Černošice – řadový dům',9600000,{acq:140000,reno:[0,120000,0,40000,0,60000,0,0,0,30000],savReno:250000,savMort:2350000,rate:4.69,insSold:560,insKept:820,ops:[0,5200,650,180]})]}),
 mkClient({sample:true,updated:now-D,name:'Horákovi',note:'Prodej bytu na Pankráci, hledají větší bydlení. Šest kandidátů po prohlídkách.',savings:900000,
  incomes:[L('Mzda – Martin',62000),L('Mzda – Lucie',48000)],
  expenses:[L('Jídlo a drogerie',15000),L('Doprava',6000),L('Telefon a internet',1500),L('Děti',7000),L('Oblečení',3000),L('Volný čas',5000),L('Ostatní',3000)],
  annual:[L('Pojištění aut',22000),L('Dovolená',70000),L('Dárky a svátky',18000),L('Servis aut',15000),L('Ostatní',12000)],
  t:{flat:true,mort:true,fix:true,sell:true,buy:true,annual:true},useRefix:false,
  flat:{est:7800000,purchase:4100000,ops:[L('Fond oprav a správa',4200),L('Energie',3500),L('Pojištění nemovitosti',400)],mort:{balance:1200000,rate:1.89,months:120,ins:300},fix:{months:14,rate:4.6},sale:{comm:3,costs:50000,exempt:true}},
  variants:[mkVar('Dejvice 4+kk',9200000,{acq:130000,reno:[200000,250000,120000,40000,80000,60000,30000,0,50000,20000],savReno:500000,savMort:300000,insSold:400,ops:[4800,4000,450,160]}),
   mkVar('Smíchov 3+1',8100000,{acq:120000,reno:[150000,180000,0,30000,0,0,0,0,0,20000],savReno:380000,savMort:400000,insSold:350,ops:[4300,3600,400,140]}),
   mkVar('Říčany – dům',8900000,{acq:130000,reno:[0,0,0,50000,0,0,0,0,0,30000],savReno:80000,savMort:700000,insSold:380,ops:[0,5600,700,200]}),
   mkVar('Braník 4+1',9500000,{acq:140000,reno:[220000,260000,140000,50000,90000,80000,40000,120000,60000,30000],savReno:600000,savMort:200000,insSold:420,ops:[4900,4100,460,160]}),
   mkVar('Černošice – dům se zahradou',9900000,{acq:145000,reno:[0,150000,0,40000,0,0,0,0,0,20000],savReno:210000,savMort:500000,rate:4.69,insSold:430,ops:[0,6200,800,220]}),
   mkVar('Holešovice – loft',10000000,{acq:150000,savMort:800000,insSold:450,ops:[5600,3800,480,170]})]}),
 mkClient({sample:true,updated:now-3*D,name:'Jana Malá',note:'Prodej bytu v Brně. Hypotéka je vysoká vůči hodnotě bytu, malé úspory.',savings:300000,
  incomes:[L('Mzda',54000),L('Přivýdělek – lektorka',6000)],
  expenses:[L('Jídlo a drogerie',9000),L('Doprava',3000),L('Telefon a internet',900),L('Pes',1500),L('Oblečení',1800),L('Volný čas',3000),L('Ostatní',2000)],
  annual:[L('Pojištění auta',9000),L('Dovolená',25000),L('Dárky a svátky',8000),L('Servis auta',6000),L('Ostatní',5000)],
  t:{flat:true,mort:true,sell:true,buy:true,annual:true},
  flat:{est:5100000,purchase:4300000,ops:[L('Fond oprav a správa',3200),L('Energie',2100),L('Pojištění nemovitosti',250)],mort:{balance:4820000,rate:5.39,months:336,ins:610},sale:{comm:3.5,costs:60000,exempt:false}},
  variants:[mkVar('Brno – Žabovřesky 2+1',5600000,{acq:90000,reno:[120000,150000,60000,25000,0,0,0,0,0,15000],savReno:200000,savMort:200000,rate:5.09,insSold:520,ops:[3100,2200,260,90]}),
   mkVar('Brno – Líšeň, novostavba 3+kk',6900000,{acq:120000,reno:[0,0,0,0,0,0,0,0,80000,20000],savReno:100000,savMort:200000,rate:5.09,insSold:610,ops:[3600,2400,300,110]})]}),
 mkClient({sample:true,updated:now-6*D,name:'Petr Dvořák',note:'Dnes v nájmu, první vlastní byt.',savings:1200000,
  incomes:[L('Mzda',78000)],
  expenses:[L('Jídlo a drogerie',8000),L('Doprava',4500),L('Telefon a internet',800),L('Sport',2500),L('Oblečení',1500),L('Volný čas',3500),L('Ostatní',2000)],
  annual:[L('Pojištění auta',11000),L('Dovolená',40000),L('Dárky a svátky',6000),L('Servis auta',8000),L('Ostatní',5000)],
  t:{buy:true,annual:true},
  variants:[mkVar('Praha 9 – Vysočany 2+kk',6500000,{acq:90000,reno:[0,0,80000,20000,0,0,0,0,0,10000],savReno:110000,savMort:1040000,insSold:420,ops:[3400,2600,300,100]})]}),

 /* ---- testovací klienti: každý ukazuje jeden stav, kterého aplikace umí dosáhnout (viz docs/TESTOVACI-KLIENTI.md) ---- */
 mkClient({sample:true,updated:now-7*D,name:'Test 1 · Pronájem a daň',note:'UKAZUJE: pronájem starého bytu, podíl, který platí vlastník, použitá daň A, ale nejnižší vychází C (návrh daňové optimalizace), refixace za 9 měsíců, nová hypotéka s LTV nad 90 %. KDE: Stávající byt, Scénáře, Přehled.',savings:3000000,
  incomes:[L('Příjem 1',100000),L('Příjem 2',80000)],
  expenses:E([14000,6000,1500,5000,3000,6000,4000]),annual:A([20000,60000,15000,10000,6000]),
  t:{flat:true,mort:true,fix:true,rent:true,buy:true,annual:true},useRefix:false,
  flat:{est:8250000,purchase:3999000,ops:[L('Fond oprav a správa',7200),L('Energie',2000),L('Pojištění nemovitosti',500)],mort:{balance:3000000,rate:1.8,months:280,ins:1150},fix:{months:9,rate:4.9},rent:{rent:28000,vac:5,repairs:12000,tax:'A',owner:7700}},
  variants:[mkVar('Byt 4+kk, 121 m²',18500000,{savMort:1500000,insSold:9800,insKept:9800,ops:[6000,4000,800,200]})]}),
 mkClient({sample:true,updated:now-8*D,name:'Test 2 · Refixace brzy, byt prázdný',note:'UKAZUJE: stávající byt zůstává prázdný, refixace za 10 měsíců (zdraží splátku), scénáře Zůstat a Zůstat po refinancování a dva noví kandidáti. KDE: Scénáře, Stávající byt (Ponechat prázdný), Přehled (Dnes).',savings:1600000,
  incomes:[L('Mzda',68000),L('Mzda partnera',52000)],expenses:E([15000,5000,1300,4000,2500,4000,3000]),annual:A([12000,45000,10000,8000,5000]),
  t:{flat:true,mort:true,fix:true,buy:true,annual:true},
  flat:{est:5500000,purchase:3200000,ops:[L('Fond oprav a správa',3500),L('Energie',2800),L('Pojištění nemovitosti',300)],mort:{balance:2100000,rate:2.3,months:240,ins:400},fix:{months:10,rate:5.2}},
  variants:[mkVar('Praha 5 – 3+kk',6200000,{acq:90000,reno:[80000,100000,0,20000,0,0,0,0,0,10000],savReno:200000,savMort:1000000,insSold:450,insKept:600,ops:[3800,3000,350,100]}),
   mkVar('Praha 4 – 4+kk',6900000,{acq:100000,reno:[0,0,0,30000,0,0,0,0,0,10000],savReno:100000,savMort:1300000,insSold:520,insKept:700,ops:[4400,3500,420,120]})]}),
 mkClient({sample:true,updated:now-9*D,name:'Test 3 · Byt bez hypotéky, prodej s daní',note:'UKAZUJE: stávající byt bez hypotéky (vypnutý přepínač Hypotéka), prodej se zdaněním zisku 15 % (nevyplněno osvobození), čistý výtěžek jde do nového bytu. KDE: Stávající byt (Prodat), Přehled, Grafy (financování).',savings:800000,
  incomes:[L('Mzda',88000)],expenses:E([10000,4000,900,0,2000,4000,3000]),annual:A([9000,35000,8000,6000,4000]),
  t:{flat:true,sell:true,buy:true,annual:true},
  flat:{est:6800000,purchase:3000000,ops:[L('Fond oprav a správa',3300),L('Energie',2600),L('Pojištění nemovitosti',300)],sale:{comm:3,costs:45000,exempt:false}},
  variants:[mkVar('Praha 6 – 3+1',7900000,{acq:100000,reno:[100000,120000,0,20000,0,0,0,0,0,10000],savReno:150000,savMort:0,insSold:380,ops:[3900,3100,330,100]})]}),
 mkClient({sample:true,updated:now-10*D,name:'Test 4 · Záporné cashflow a rizika',note:'UKAZUJE: vypnuté roční výdaje, bez stávajícího bytu, malé úspory (použití úspor nad dostupné = Pozor), LTV nad 90 %, záporné cashflow (▼), upozornění seřazená Riziko první. KDE: Přehled, Grafy, Příjmy a výdaje.',savings:200000,
  incomes:[L('Mzda',52000)],expenses:E([9500,3500,900,3000,1500,3000,2500]),annual:A([]),
  t:{buy:true,annual:false},
  variants:[mkVar('Brno – 3+kk',6200000,{acq:80000,reno:[60000,80000,0,0,0,0,0,0,0,10000],savReno:100000,savMort:500000,rate:5.4,insSold:600,ops:[3300,2400,300,100]}),
   mkVar('Brno – 2+kk',4300000,{acq:60000,savReno:50000,savMort:150000,rate:5.1,insSold:400,ops:[2500,1800,220,80]})]}),
 mkClient({sample:true,updated:now-11*D,name:'Test 5 · Dlouhá fixace a pronájem',note:'UKAZUJE: refixace až za 30 měsíců (karta pronájmu ukáže jen tabulku po refixaci, bez porovnání do 12 měsíců), pronájem pokrývá hypotéku (přispívá), použitá daň C je nejnižší. KDE: Stávající byt, Scénáře (Pronajímat).',savings:1500000,
  incomes:[L('Mzda',72000),L('Mzda partnera',45000)],expenses:E([14000,5000,1300,3500,2500,4000,3000]),annual:A([11000,40000,9000,7000,4000]),
  t:{flat:true,mort:true,fix:true,rent:true,buy:true,annual:true},
  flat:{est:5800000,purchase:2800000,ops:[L('Fond oprav a správa',3000),L('Energie',2500),L('Pojištění nemovitosti',280)],mort:{balance:1600000,rate:2.9,months:180,ins:350},fix:{months:30,rate:4.4},rent:{rent:23500,vac:0,repairs:9000,tax:'C'}},
  variants:[mkVar('Plzeň – 3+1',5400000,{acq:70000,reno:[70000,90000,0,20000,0,0,0,0,0,10000],savReno:150000,savMort:1200000,rate:4.6,insSold:420,insKept:550,ops:[3200,2600,300,90]}),
   mkVar('Plzeň – dům',7300000,{acq:100000,reno:[0,0,0,40000,0,0,0,0,0,20000],savReno:100000,savMort:1300000,rate:4.6,insSold:500,insKept:650,ops:[0,4200,600,150]})]}),
 mkClient({sample:true,updated:now-12*D,name:'Test 6 · Šest variant, shody a LTV pásma',note:'UKAZUJE: klient bez bytu, šest variant (maximum), LTV pod 80 %, 80 až 90 % a nad 90 %, dvě shodné varianty (obě označené jako nejlepší, shoda). KDE: Přehled, Srovnání, Grafy.',savings:2000000,
  incomes:[L('Příjem 1',70000),L('Příjem 2',55000)],expenses:E([14000,5000,1300,4000,2500,4000,3000]),annual:A([12000,45000,10000,8000,5000]),
  t:{buy:true,annual:true},
  variants:[mkVar('Byt A · LTV pod 80 %',6000000,{acq:90000,savReno:0,savMort:1500000,insSold:450,ops:[3500,2800,300,100]}),
   mkVar('Byt B · LTV 80 až 90 %',6000000,{acq:90000,savReno:0,savMort:900000,insSold:450,ops:[3500,2800,300,100]}),
   mkVar('Byt C · LTV nad 90 %',6000000,{acq:90000,savReno:0,savMort:200000,insSold:450,ops:[3500,2800,300,100]}),
   mkVar('Byt D · shodný s A',6000000,{acq:90000,savReno:0,savMort:1500000,insSold:450,ops:[3500,2800,300,100]}),
   mkVar('Byt E · dražší',6400000,{acq:95000,savReno:0,savMort:900000,insSold:470,ops:[3600,2900,320,110]}),
   mkVar('Byt F · větší, dražší',7500000,{acq:110000,savReno:200000,savMort:1000000,insSold:520,ops:[4200,3300,380,120]})]}),
 mkClient({sample:true,updated:now-13*D,name:'Test 7 · Jen příjmy a výdaje',note:'UKAZUJE: klient bez variant a bez bytu. Přehled ukáže výzvu k přidání varianty, ostatní záložky jsou prázdné a nic se nepočítá. KDE: Přehled, Příjmy a výdaje.',savings:400000,
  incomes:[L('Mzda',61000)],expenses:E([9000,3000,800,0,1500,3000,2000]),annual:A([8000,30000,6000,5000,3000]),
  t:{buy:true,annual:true}}),
 mkClient({sample:true,updated:now-14*D,name:'Test 8 · Pronájem bytu bez hypotéky',note:'UKAZUJE: pronájem bytu bez hypotéky (všechno z nájmu zůstává), daň z pronájmu ve třech variantách a návrh nejnižší, žádná tabulka refixace. KDE: Stávající byt (Pronajímat), Scénáře.',savings:1100000,
  incomes:[L('Mzda',80000)],expenses:E([11000,4000,900,2500,2000,4000,3000]),annual:A([10000,40000,8000,6000,4000]),
  t:{flat:true,rent:true,buy:true,annual:true},
  flat:{est:4600000,purchase:2100000,ops:[L('Fond oprav a správa',3000),L('Energie',2200),L('Pojištění nemovitosti',250)],rent:{rent:19500,vac:5,repairs:10000,tax:'A'}},
  variants:[mkVar('Rodinný dům, Hostivice',7200000,{acq:100000,reno:[0,0,0,40000,0,0,0,0,0,20000],savReno:100000,savMort:1000000,insSold:600,insKept:800,ops:[0,5000,700,200]})]}),
 mkClient({sample:true,updated:now-15*D,name:'Test 9 · Prodej se ztrátou',note:'UKAZUJE: prodejní cena nižší než dluh na hypotéce. Čistý výtěžek je záporný, chybějící částku je nutné doplatit, nová hypotéka je vyšší o tento doplatek. KDE: Stávající byt (Prodat), Grafy (financování), Přehled.',savings:700000,
  incomes:[L('Mzda',70000)],expenses:E([11000,4000,900,2500,2000,4000,3000]),annual:A([9000,35000,7000,6000,4000]),
  t:{flat:true,mort:true,sell:true,buy:true,annual:true},
  flat:{est:4200000,purchase:3900000,ops:[L('Fond oprav a správa',3100),L('Energie',2400),L('Pojištění nemovitosti',280)],mort:{balance:4500000,rate:5.2,months:300,ins:500},sale:{comm:3.5,costs:60000,exempt:true}},
  variants:[mkVar('Praha 10 – 2+kk',5400000,{acq:80000,reno:[50000,70000,0,0,0,0,0,0,0,10000],savReno:100000,savMort:300000,rate:5.1,insSold:480,ops:[3000,2300,280,90]})]}),
 mkClient({sample:true,updated:now-10*60000,name:'Prázdný klient (ukázka)'})];}
const SEED_V=2;
function seed(){const c=samples();return {clients:c,activeId:c[0].id,lastBackup:Date.now()-9*86400000,seedV:SEED_V};}
function validate(text){let d;try{d=JSON.parse(text);}catch(e){return {error:'Soubor není platný JSON.',details:['Soubor je poškozený nebo nejde o zálohu z Kalkulačky bydlení.','Technický detail: '+e.message]};}
 const list=Array.isArray(d)?d:(d&&Array.isArray(d.clients))?d.clients:(d&&typeof d==='object'&&'name' in d)?[d]:null;
 if(!list||!list.length)return {error:'V souboru nejsou žádní klienti.',details:['Očekávám zálohu jednoho klienta nebo všech klientů (pole „clients“).']};
 const det=[];list.forEach((c,i)=>{if(!c||typeof c!=='object'){det.push('Klient č. '+(i+1)+': neplatný záznam.');return;}const nm=typeof c.name==='string'&&c.name.trim()?'„'+c.name+'“':'č. '+(i+1);if(typeof c.name!=='string'||!c.name.trim())det.push('Klient č. '+(i+1)+': chybí jméno.');if(c.variants&&!Array.isArray(c.variants))det.push('Klient '+nm+': varianty nejsou seznam.');else if(c.variants&&c.variants.length>6)det.push('Klient '+nm+': '+c.variants.length+' variant, povoleno je nejvýše 6.');['incomes','expenses','annual'].forEach(k=>{if(c[k]!=null&&!Array.isArray(c[k]))det.push('Klient '+nm+': položky „'+k+'“ nejsou seznam.');});});
 if(det.length)return {error:'Import se nepodařil, nic nebylo změněno.',details:det};
 return {list};}
function compute(c){
 const t=c.t,f=c.flat,m=f.mort;
 const T={flat:!!t.flat};T.mort=T.flat&&!!t.mort;T.fix=T.mort&&!!t.fix;T.sell=T.flat&&!!t.sell;T.rent=T.flat&&!!t.rent&&!T.sell;T.buy=!!t.buy;T.annual=!!t.annual;
 const income=sum(c.incomes),exp=sum(c.expenses),annualY=sum(c.annual),annualM=T.annual?annualY/12:0,expTotal=exp+annualM;
 const flatOps=T.flat?sum(f.ops):0;
 const pmtNow=T.mort?ann(m.balance,m.rate,m.months):0;
 const k=Math.min(+f.fix.months||0,+m.months||0);
 const balFix=T.fix?balAfter(m.balance,m.rate,m.months,k):0;
 const pmtFix=T.fix?ann(balFix,f.fix.rate,(+m.months||0)-k):0;
 const useFix=T.fix&&c.useRefix,pmtUsed=useFix?pmtFix:pmtNow,mIns=T.mort?(+m.ins||0):0;
 const housingNow=T.flat?flatOps+pmtUsed+mIns:0,freeNow=income-expTotal-housingNow;
 const S={price:+f.est||0};S.comm=S.price*(+f.sale.comm||0)/100;S.costs=+f.sale.costs||0;S.payoff=T.mort?(+m.balance||0):0;S.gain=S.price-(+f.purchase||0)-S.comm-S.costs;S.tax=(!f.sale.exempt&&S.gain>0)?S.gain*0.15:0;S.net=S.price-S.comm-S.costs-S.payoff-S.tax;
 const r=f.rent,P={gross:(+r.rent||0)*12};P.vacLoss=P.gross*(+r.vac||0)/100;P.inc=P.gross-P.vacLoss;P.ownOps=(+r.owner>0)?Math.min(flatOps,+r.owner):flatOps;P.tenant=flatOps-P.ownOps;P.opsY=P.ownOps*12;P.rep=+r.repairs||0;P.int=T.mort?(+m.balance||0)*(+m.rate||0)/100:0;P.dep=(+f.purchase||0)*0.034;
 P.expA=Math.min(P.inc*0.3,600000);P.expB=P.opsY+P.rep+P.int;P.expC=P.expB+P.dep;
 ['A','B','C'].forEach(x=>{P['base'+x]=Math.max(0,P.inc-P['exp'+x]);P['tax'+x]=P['base'+x]*0.15;});
 P.best=['A','B','C'].reduce((b,x)=>P['tax'+x]<P['tax'+b]?x:b,'A');P.sel=r.tax||'A';P.tax=P['tax'+P.sel];
 P.netM=(P.inc-P.rep-P.opsY-P.tax)/12;
 const oldNet=!T.flat||T.sell?0:pmtUsed+mIns+(T.rent?P.ownOps:flatOps)-(T.rent?(P.inc-P.rep-P.tax)/12:0);
 const proceeds=T.sell?Math.max(0,S.net):0,savings=+c.savings||0;
 const V=(T.buy?c.variants:[]).map(v=>{const reno=sum(v.reno),acq=+v.acq||0,price=+v.price||0,need=price+acq+reno,savUsed=(+v.savReno||0)+(+v.savMort||0);const mortgage=Math.max(0,need-savUsed-proceeds);const pmt=ann(mortgage,v.rate,(+v.years||0)*12);const ins=(T.sell||!T.flat)?(+v.insSold||0):(+v.insKept||0);const ops=sum(v.ops);const total=pmt+ins+ops+oldNet;return {name:v.name||'Bez názvu',price,acq,reno,need,savUsed,proceeds,mortgage,ltv:price>0?mortgage/price:null,rate:+v.rate||0,years:+v.years||0,pmt,ins,ops,old:oldNet,total,free:income-expTotal-total,dsti:income>0?(pmt+(T.mort&&!T.sell?pmtUsed:0))/income:null};});
 const W=[];
 if(income<=0)W.push(['Riziko','Chybí příjem domácnosti','Bez příjmu nejde spočítat volné cashflow ani poměr splátek k příjmu.']);
 if(income>0&&freeNow<0)W.push(['Riziko','Už dnes záporné volné cashflow: '+kc(freeNow),'Výdaje a bydlení převyšují příjem.']);
 if(T.sell&&S.net<0)W.push(['Riziko','Prodej nepokryje hypotéku, výtěžek '+kc(S.net),'Rozdíl je potřeba doplatit z úspor. Varianty počítají s výtěžkem 0 Kč.']);
 V.forEach(v=>{if(v.ltv>0.9)W.push(['Riziko',v.name+': LTV '+pct(v.ltv),'Nad 90 % banky hypotéku běžně neposkytují.']);else if(v.ltv>0.8)W.push(['Pozor',v.name+': LTV '+pct(v.ltv),'Nad 80 % jsou podmínky bank přísnější.']);
  if(income>0&&v.free<0)W.push(['Riziko',v.name+': volné cashflow '+kc(v.free)+' měsíčně','Po zaplacení bydlení a výdajů domácnosti nic nezbývá.']);
  if(v.savUsed>savings)W.push(['Pozor',v.name+': z úspor '+kc(v.savUsed)+', k dispozici '+kc(savings),'Chybí '+kc(v.savUsed-savings)+'.']);});
 W.sort((a,b)=>(a[0]==='Riziko'?0:1)-(b[0]==='Riziko'?0:1));
 return {T,income,exp,annualY,annualM,expTotal,flatOps,pmtNow,balFix,pmtFix,k,useFix,pmtUsed,mIns,housingNow,freeNow,S,P,oldNet,proceeds,V,W,savings,dstiNow:income>0&&T.mort?pmtUsed/income:null};}
const C_PMT='#0072B2',C_INS='repeating-linear-gradient(45deg,#E69F00 0 5px,#f2c66b 5px 9px)',C_OPS='repeating-linear-gradient(90deg,#009E73 0 7px,#5cc4a2 7px 9px)',C_OLD='repeating-linear-gradient(-45deg,#CC79A7 0 3px,#e6b9d3 3px 6px)';
const C_SAV='#009E73',C_PRO='repeating-linear-gradient(45deg,#E69F00 0 5px,#f2c66b 5px 9px)',C_MOR='#0072B2';


return {RENO,VOPS,KEY,uid,L,sum,getPath,ann,balAfter,kc,kcd,pct,tis,mil,fmtIn,NF,NF2,parseNum,pl,rel,mkVar,mkFlat,mkClient,normalize,samples,seed,SEED_V,validate,compute,C_PMT,C_INS,C_OPS,C_OLD,C_SAV,C_PRO,C_MOR};
});

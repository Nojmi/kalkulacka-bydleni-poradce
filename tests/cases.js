/* Kontrolní příklady. Očekávané hodnoty vznikly NEZÁVISLE: docs/overeni-hodnot.py (Decimal, simulace splátek po měsících). */
const KB=require('../js/model.js'),Store=require('../js/store.js'),D=require('../js/derive.js'),Charts=require('../js/charts.js');
const fs=require('fs'),path=require('path');
const cases=[];
const t=(name,fn)=>cases.push({name,fn});
const near=(a,b,tol)=>Math.abs(a-b)<=(tol==null?0.01:tol);
const eq=(a,b,msg)=>{if(!near(a,b,0.01))throw new Error((msg||'')+' očekáváno '+b+', je '+a);};
const ok=(c,msg)=>{if(!c)throw new Error(msg||'neplatí');};
const sample=n=>KB.samples().find(c=>c.name.startsWith(n));
const memStore=()=>{const m={};return {m,getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v);}};};

/* A) čísla proti nezávislému výpočtu */
t('anuita 3 mil. / 5 % / 30 let = 16 104,65',()=>eq(KB.ann(3e6,5,360),16104.65));
t('anuita 2 mil. / 4,5 % / 25 let = 11 116,65',()=>eq(KB.ann(2e6,4.5,300),11116.65));
t('anuita při 0 % = jistina / počet měsíců',()=>eq(KB.ann(1.2e6,0,240),5000));
t('anuita s nulovou jistinou nebo dobou = 0',()=>{eq(KB.ann(0,5,100),0);eq(KB.ann(100,5,0),0);});
t('Novákovi: splátka dnes 13 454,63',()=>eq(KB.compute(sample('Nov')).pmtNow,13454.63));
t('Novákovi: zůstatek po 8 splátkách 2 326 937,56',()=>eq(KB.compute(sample('Nov')).balFix,2326937.56));
t('Novákovi: splátka po refixaci 16 611,68 (+3 157,05)',()=>{const r=KB.compute(sample('Nov'));eq(r.pmtFix,16611.68);eq(r.pmtFix-r.pmtNow,3157.05);});
t('Novákovi: daň z pronájmu A 24 343,20',()=>eq(KB.compute(sample('Nov')).P.taxA,24343.2));
t('Novákovi: daň z pronájmu B 11 412,00',()=>eq(KB.compute(sample('Nov')).P.taxB,11412));
t('Novákovi: daň z pronájmu C 0 (odpisy převýší základ)',()=>eq(KB.compute(sample('Nov')).P.taxC,0));
t('Novákovi: čistý nájem při variantě B 9 769',()=>eq(KB.compute(sample('Nov')).P.netM,9769));
t('Novákovi: nejnižší daň je varianta C',()=>ok(KB.compute(sample('Nov')).P.best==='C'));
t('Novákovi, Žižkov: potřeba 7 500 000, hypotéka 5 500 000, LTV 79,7 %',()=>{const v=KB.compute(sample('Nov')).V[0];eq(v.need,7.5e6);eq(v.mortgage,5.5e6);eq(+(v.ltv*100).toFixed(1),79.7,'LTV');});
t('Novákovi, Žižkov: splátka 28 823,36, bydlení 45 066,04, zbude 15 283,96',()=>{const v=KB.compute(sample('Nov')).V[0];eq(v.pmt,28823.36);eq(v.total,45066.04);eq(v.free,15283.96);});
t('Novákovi: dnes zbývá 35 868,32 (po refixaci)',()=>eq(KB.compute(sample('Nov')).freeNow,35868.32));
t('prodej Novákovi: čistý výtěžek 3 574 000 (osvobozeno)',()=>{const c=sample('Nov');c.t.sell=true;c.t.rent=false;eq(KB.compute(c).S.net,3574000);});
t('prodej Horákovi: čistý výtěžek 6 316 000',()=>eq(KB.compute(sample('Hor')).S.net,6316000));
t('prodej Jana: zisk 561 500, daň 84 225, výtěžek −42 725',()=>{const S=KB.compute(sample('Jana')).S;eq(S.gain,561500);eq(S.tax,84225);eq(S.net,-42725);});
t('Jana: záporný výtěžek se do variant nepromítá (výtěžek 0), hypotéka 5 660 000, LTV 101,1 %',()=>{const v=KB.compute(sample('Jana')).V[0];eq(v.proceeds,0);eq(v.mortgage,5660000);eq(+(v.ltv*100).toFixed(1),101.1);});
t('paušál 30 % má strop 600 000 Kč (nájem 4 mil. ročně)',()=>{const c=sample('Nov');c.flat.rent.rent=4e6/12;c.flat.rent.vac=0;const P=KB.compute(c).P;eq(P.expA,600000);});

/* B) scénáře (nový byt Žižkov) */
t('scénáře Novákovi: zbude 41 606,58 / 18 441,01 / 15 283,96 / 35 868,32',()=>{
  const sc=D.scenarios(sample('Nov'),0);ok(sc.list.length===4,'počet scénářů '+sc.list.length);
  [41606.58,18441.01,15283.96,35868.32].forEach((x,i)=>eq(sc.list[i].free,x,'scénář '+(i+1)));});
t('scénář 1: nová hypotéka 1 926 000, dluh = hypotéka, nemovitosti − dluhy 4 974 000',()=>{const s=D.scenarios(sample('Nov'),0).list[0];eq(s.rows.newMort,1926000);eq(s.rows.debt,1926000);eq(s.rows.net,4974000);});
t('scénář 2: starý byt po odečtu nájmu 4 205,63; dluh 7 900 000; nemovitosti − dluhy 5 200 000',()=>{const s=D.scenarios(sample('Nov'),0).list[1];eq(s.parts[3][1],4205.63);eq(s.rows.debt,7.9e6);eq(s.rows.net,5.2e6);});
t('scénář 4 (bez koupě): zbylé úspory 2 600 000, nemovitosti − dluhy 3 800 000',()=>{const s=D.scenarios(sample('Nov'),0).list[3];eq(s.rows.savLeft,2.6e6);eq(s.rows.net,3.8e6);ok(s.rows.newMort===null);});
t('scénáře: bez konce fixace odpadají 3 a 4',()=>{const c=sample('Nov');c.t.fix=false;const ids=D.scenarios(c,0).list.map(s=>s.id);ok(ids.join()==='1,2',ids.join());});
t('scénáře: klient bez bytu žádné nemá',()=>ok(D.scenarios(sample('Petr'),0).list.length===0));
t('scénáře nemění původního klienta',()=>{const c=sample('Nov'),a=JSON.stringify(c);D.scenarios(c,0);ok(JSON.stringify(c)===a);});

/* C) přepínače, upozornění, nejlepší hodnoty */
t('přepínače: prodej a pronájem se vylučují (prodej vyhrává ve výpočtu)',()=>{const c=sample('Nov');c.t.sell=true;c.t.rent=true;const T=KB.compute(c).T;ok(T.sell&&!T.rent);});
t('přepínače: konec fixace vyžaduje hypotéku, hypotéka byt',()=>{const c=sample('Nov');c.t.mort=false;ok(!KB.compute(c).T.fix);c.t.mort=true;c.t.flat=false;const T=KB.compute(c).T;ok(!T.mort&&!T.fix&&!T.sell&&!T.rent);});
t('upozornění: LTV 81,1 % je Pozor, 101,1 % je Riziko',()=>{const n=KB.compute(sample('Nov')).W;ok(n.some(w=>w[0]==='Pozor'&&/Vinohrady.*81,1/.test(w[1])));const j=KB.compute(sample('Jana')).W;ok(j.some(w=>w[0]==='Riziko'&&/101,1/.test(w[1])));});
t('upozornění: Jana má 5 rizik a 1 pozor, rizika první',()=>{const W=KB.compute(sample('Jana')).W,c=D.counts(W);ok(c.risk===5&&c.warn===1,JSON.stringify(c));ok(W[0][0]==='Riziko'&&W[W.length-1][0]==='Pozor');});
t('upozornění: chybějící příjem je Riziko',()=>ok(KB.compute(sample('Prázdný')).W.some(w=>w[0]==='Riziko'&&/příjem/i.test(w[1]))));
t('upozornění: použité úspory nad dostupné',()=>{const c=sample('Nov');c.savings=1e6;ok(KB.compute(c).W.some(w=>/k dispozici/.test(w[1])));});
t('nejlepší hodnota: žádná při jedné hodnotě nebo shodných hodnotách',()=>{ok(D.bestSet([5],'min').size===0);ok(D.bestSet([5,5,5],'min').size===0);ok(D.bestSet([3,1,2],'min').has(1));ok(D.bestSet([3,1,2],'max').has(0));ok(D.bestSet([2,1,1],'min').size===2);});
t('nejlepší hodnota ignoruje chybějící hodnoty',()=>{const s=D.bestSet([null,4,2],'min');ok(s.size===1&&s.has(2));});
t('nadpis přehledu: nejlepší varianta / žádná v plusu / jedna varianta',()=>{
  ok(/Žižkov 3\+1/.test(D.summary(sample('Nov'),KB.compute(sample('Nov'))).h1));
  ok(D.summary(sample('Jana'),KB.compute(sample('Jana'))).h1==='Ani jedna varianta nevychází do plusu');
  ok(/^Po koupi zbude 13/.test(D.summary(sample('Petr'),KB.compute(sample('Petr'))).h1));});
t('iniciály avatarů',()=>{ok(D.initials('Novákovi')==='N');ok(D.initials('Jana Malá')==='JM');ok(D.initials('Prázdný klient (ukázka)')==='PK');ok(D.initials('')==='?');});
t('nejbližší konec fixace: Novákovi za 8 měsíců, +3 157 Kč',()=>{const f=D.nearestFix(KB.samples());ok(f.months===8&&f.name==='Novákovi');eq(f.delta,3157.05);});

/* D) formát a parsování */
t('parseNum: mezery, čárka, mínus',()=>{eq(KB.parseNum('1 234,5'),1234.5);eq(KB.parseNum('−2 000'),-2000);eq(KB.parseNum('abc'),0);eq(KB.parseNum('4,'),4);});
t('formát: kc, kcd, pct, mil',()=>{ok(KB.kc(-1234.4).replace(/\s/g,' ')==='−1 234 Kč');ok(KB.kc(null)==='—');ok(KB.kcd(3157.05).replace(/\s/g,' ')==='+3 157 Kč');ok(KB.pct(0.797)==='79,7 %');ok(KB.mil(5500000)==='5,5 mil.');});

/* E) validace a import */
t('validate: platná záloha jednoho i všech klientů',()=>{const c=sample('Nov');ok(KB.validate(JSON.stringify(Store.exportPayload([c]))).list.length===1);ok(KB.validate(JSON.stringify(Store.exportPayload(KB.samples()))).list.length===5);});
t('validate: neplatný JSON, 7 variant, chybí jméno, položky nejsou seznam',()=>{
  ok(KB.validate('{').error);
  const bad=KB.validate(JSON.stringify({clients:[{name:'A',variants:new Array(7).fill({})},{incomes:'x'}]}));
  ok(bad.error&&bad.details.length===3,JSON.stringify(bad.details));
  ok(/7 variant/.test(bad.details[0])&&/chybí jméno/.test(bad.details[1])&&/incomes/.test(bad.details[2]));});
t('import: přidá klienty, nic nepřepíše, nevalidní soubor nezmění nic',()=>{
  const st=Store.seedState(),ids=st.clients.map(c=>c.id),n=st.clients.length;
  const res=Store.importText(st,JSON.stringify(Store.exportPayload([st.clients[0]])));
  ok(res.ok&&st.clients.length===n+1&&ids.every(i=>st.clients.some(c=>c.id===i)));
  ok(!ids.includes(st.clients[n].id),'import musí dostat nové id');
  const before=JSON.stringify(st);const bad=Store.importText(st,'{"clients":[{"name":"X","variants":{}}]}');ok(!bad.ok&&JSON.stringify(st)===before);});
t('import: výsledky importovaného klienta se shodují s původním',()=>{
  const st=Store.seedState(),a=KB.compute(st.clients[0]);Store.importText(st,JSON.stringify(Store.exportPayload([st.clients[0]])));
  const b=KB.compute(st.clients[st.clients.length-1]);eq(b.V[0].free,a.V[0].free);eq(b.freeNow,a.freeNow);});

/* F) úložiště */
t('úložiště: uložení a načtení zachová klienty a id',()=>{const m=memStore(),st=Store.seedState();Store.save(m,st);const r=Store.load(m);ok(!r.fresh&&r.state.clients.length===5&&r.state.clients[1].id===st.clients[1].id);eq(KB.compute(r.state.clients[1]).V[0].free,KB.compute(st.clients[1]).V[0].free);});
t('úložiště: poškozená data → ukázková data a kopie poškozených',()=>{const m=memStore();m.setItem(KB.KEY,'{rozbité');const r=Store.load(m);ok(r.fresh&&r.recovered&&r.state.clients.length===5&&m.m[KB.KEY+'-poskozena']==='{rozbité');});
t('úložiště: nedostupné úložiště nespadne',()=>{const bad={getItem(){throw new Error('x');},setItem(){throw new Error('x');}};ok(Store.load(bad).fresh);ok(Store.save(bad,{})===false);});
t('úložiště: hydrate omezí varianty na 6',()=>{const c=sample('Hor');c.variants=c.variants.concat(c.variants);ok(Store.hydrate(c).variants.length===6);});
t('duplikace klienta: nové id, nezávislá kopie',()=>{const c=sample('Nov'),d=Store.duplicate(c);ok(d.id!==c.id&&d.variants[0].id!==c.variants[0].id);d.variants[0].price=1;ok(c.variants[0].price===6.9e6);});
t('obnovení ukázek zachová vlastní klienty',()=>{const st=Store.seedState();const mine=KB.mkClient({name:'Vlastní'});st.clients.push(mine);st.clients[0].savings=1;Store.restoreSamples(st);ok(st.clients.length===6&&st.clients.some(c=>c.id===mine.id)&&st.clients.find(c=>c.name==='Novákovi').savings===2600000);});
t('názvy souborů exportu',()=>{const d=new Date(2026,10,13);ok(Store.fileNameAll(d)==='kalkulacka-bydleni_vsichni-klienti_2026-11-13.json');ok(Store.fileNameOne({name:'Jana Malá'},d)==='kalkulacka-bydleni_jana-mala_2026-11-13.json');});
t('stáří zálohy ve dnech',()=>{ok(Store.backupAge({lastBackup:null})===null);ok(Store.backupAge({lastBackup:Date.now()-9*86400000})===9);});

/* G) grafy */
t('Sankey: toky mají stejnou celkovou šířku vlevo i vpravo, žádné NaN',()=>{
  const svg=Charts.sankey({width:800,height:300,ml:100,mr:100,nodes:[{id:'a',col:0,label:'A'},{id:'b',col:0,label:'B'},{id:'c',col:1,label:'C'},{id:'d',col:1,label:'D'}],links:[{s:'a',t:'c',v:70},{s:'a',t:'d',v:30},{s:'b',t:'d',v:50}]});
  ok(!/NaN|undefined/.test(svg));ok((svg.match(/<path/g)||[]).length===3);});
t('Sankey: šrafovaný uzel „Chybí“ používá vzor, ne jen barvu',()=>{const svg=Charts.sankey({width:600,height:200,ml:80,mr:80,nodes:[{id:'m',col:0,label:'Chybí',hatch:true,neg:true},{id:'t',col:1,label:'Cíl'}],links:[{s:'m',t:'t',v:10,hatch:true}]});ok(/<pattern/.test(svg)&&/url\(#h\d+\)/.test(svg));});
t('vodorovné pruhy: záporná hodnota je šrafovaná a má znak ▼',()=>{const h=Charts.hbars([{label:'a',v:-5},{label:'b',v:10}]);ok(/class="neg"/.test(h)&&/▼/.test(h));});

t('časová osa: kumulace po roce odpovídá měsíčnímu zbytku, po fixaci se mění (Novák)',()=>{
  const sc=D.scenarios(sample('Nov'),0),tl=D.timeline(sc,5),by=id=>tl.series.find(x=>x.id===id);
  eq(Math.round(by(1).yearEnd[0]*100)/100,Math.round(sc.list[0].free*12*100)/100);
  const k=tl.k,m3=by(3).monthly,exp=m3.before*Math.min(12,k)+m3.after*Math.max(0,12-k);
  ok(Math.abs(by(3).yearEnd[0]-exp)<0.01,'scénář 3 po roce');
  ok(Math.abs(tl.base.yearEnd[4]-sc.today.freeNow*60)<0.01,'Dnes po 5 letech');
  ok(Math.abs(by(4).monthly.before-sc.today.freeNow)<0.01,'scénář 4 před refixací = dnešní stav');});

/* H) ukázková data a soukromí */
t('ukázkoví klienti jsou 5 a prázdný nemá varianty',()=>{const s=KB.samples();ok(s.length===5&&s[4].variants.length===0&&s[1].variants.length===6);});
t('v repozitáři nejsou osobní údaje ani cizí služby',()=>{
  const root=path.join(__dirname,'..'),bad=/neumtomas|kalkulackabydleni(?!-poradce)|firebase|neumann|gstatic|googleapis|cdn\./i;
  const files=[];(function walk(d){fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{if(e.name==='.git'||e.name==='node_modules')return;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(js|html|css|md|py|json)$/.test(e.name)&&!/tests[\\/]cases\.js$/.test(p))files.push(p);});})(root);
  files.forEach(f=>{const s=fs.readFileSync(f,'utf8');const m=s.match(bad);if(m)throw new Error(path.relative(root,f)+': '+m[0]);});
  ok(!/https?:\/\/(?!github\.com|claude\.com)/.test(fs.readFileSync(path.join(root,'index.html'),'utf8')),'index.html načítá cizí zdroj');});
module.exports=cases;

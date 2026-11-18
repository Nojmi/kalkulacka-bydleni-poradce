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
const STAGES=[['zjisteni','Zjištění situace'],['nabidka','Nabídka'],['schvaleno','Schváleno'],['banka','Podáno u banky'],['vyrizeno','Vyřízeno']];
function mkClient(o){o=o||{};return {id:uid(),name:o.name||'Nový klient',note:o.note||'',savings:o.savings||0,
 incomes:o.incomes||[L('Příjem 1'),L('Příjem 2')],
 expenses:o.expenses||['Jídlo a drogerie','Doprava','Telefon a internet','Děti','Oblečení','Volný čas','Ostatní'].map(l=>L(l)),
 annual:o.annual||['Pojištění auta','Dovolená','Dárky a svátky','Servis auta','Ostatní'].map(l=>L(l)),
 t:Object.assign({flat:false,mort:false,fix:false,sell:false,rent:false,buy:true,annual:true},o.t),
 flat:mkFlat(o.flat),useRefix:o.useRefix!==false,variants:o.variants||[],sample:!!o.sample,archived:!!o.archived,stage:STAGES.some(x=>x[0]===o.stage)?o.stage:'zjisteni',lastContact:/^\d{4}-\d{2}-\d{2}$/.test(o.lastContact||'')?o.lastContact:'',updated:o.updated||Date.now()};}
function normalize(c){const n=mkClient(Object.assign({},c,{variants:(Array.isArray(c.variants)?c.variants:[]).map(v=>Object.assign(mkVar(v.name||'Varianta',+v.price||0),v,{id:uid()}))}));n.id=uid();n.sample=false;n.updated=Date.now();return n;}
function samples(){const now=Date.now(),H=3600000,D=86400000,iso=n=>new Date(now-n*D).toISOString().slice(0,10);
 const E=a=>['Jídlo a drogerie','Doprava','Telefon a internet','Děti','Oblečení','Volný čas','Ostatní'].map((l,i)=>L(l,a[i])),A=a=>['Pojištění auta','Dovolená','Dárky a svátky','Servis auta','Ostatní'].map((l,i)=>L(l,a[i]));
 return [
 /* 1) stávající byt si nechají a pronajímají, vybírají ze dvou nových bytů */
 mkClient({sample:true,stage:'nabidka',lastContact:iso(3),updated:now-3*H,name:'Kučerovi',note:'Bydlí v bytě 3+kk na Praze 4, narodilo se druhé dítě. Starý byt si chtějí nechat a pronajímat, vybírají mezi dvěma většími byty.',savings:1450000,
  incomes:[L('Mzda – Tomáš',78000),L('Mzda – Veronika (rodičovská + částečný úvazek)',61000)],
  expenses:E([17000,6500,1800,7500,3000,5000,3500]),annual:A([16000,85000,20000,14000,12000]),
  t:{flat:true,mort:true,fix:false,rent:true,buy:true,annual:true},
  flat:{est:7400000,purchase:3650000,ops:[L('Fond oprav a správa',3900),L('Energie',2400),L('Pojištění nemovitosti',350)],mort:{balance:2350000,rate:2.49,months:204,ins:480},fix:{months:0,rate:0},sale:{comm:3,costs:35000,exempt:true},rent:{rent:24500,vac:4,repairs:18000,tax:'A',owner:4250}},
  variants:[mkVar('Praha 6 – Dejvice, 4+kk 98 m²',9800000,{acq:120000,reno:[140000,150000,60000,30000,0,0,0,0,40000,20000],savReno:300000,savMort:1150000,rate:4.79,years:30,insSold:900,insKept:1250,ops:[5200,3600,420,150]}),
   mkVar('Praha 9 – Prosek, novostavba 3+kk',8450000,{acq:60000,reno:[0,0,0,20000,0,0,0,0,50000,20000],savReno:150000,savMort:1250000,rate:4.69,years:30,insSold:780,insKept:1050,ops:[4300,3000,350,0]})]}),
 /* 2) stávající byt prodají a z výtěžku financují nový, vybírají ze tří */
 mkClient({sample:true,stage:'schvaleno',lastContact:iso(21),updated:now-2*D,name:'Dostálovi',note:'Prodávají byt 3+1 na Praze 10 a z výtěžku chtějí koupit větší bydlení. Po prohlídkách zůstaly tři kandidáti.',savings:650000,
  incomes:[L('Mzda – Ondřej',71000),L('Mzda – Martina',54000)],
  expenses:E([15500,5500,1600,6000,2500,4500,3500]),annual:A([13000,70000,15000,11000,9000]),
  t:{flat:true,mort:true,fix:false,sell:true,buy:true,annual:true},
  flat:{est:6900000,purchase:3200000,ops:[L('Fond oprav a správa',3700),L('Energie',2900),L('Pojištění nemovitosti',320)],mort:{balance:1150000,rate:2.19,months:120,ins:300},fix:{months:0,rate:0},sale:{comm:3,costs:35000,exempt:true},rent:{rent:22000,vac:5,repairs:10000,tax:'A',owner:4020}},
  variants:[mkVar('Praha 10 – Vršovice, 4+kk 92 m²',10400000,{acq:130000,reno:[180000,200000,90000,35000,0,0,25000,0,50000,20000],savReno:350000,savMort:0,rate:4.79,years:30,insSold:680,ops:[4800,3500,400,140]}),
   mkVar('Praha 3 – Žižkov, 3+kk po rekonstrukci',9150000,{acq:110000,reno:[0,0,0,20000,0,0,0,0,0,10000],savReno:100000,savMort:0,rate:4.79,years:30,insSold:600,ops:[4200,3200,360,120]}),
   mkVar('Říčany – řadový dům 5+kk',11200000,{acq:150000,reno:[0,0,0,50000,0,0,0,0,40000,30000],savReno:250000,savMort:0,rate:4.69,years:30,insSold:850,ops:[0,5400,700,200]})]}),
 /* 3) byt si nechají a pronajímají, hypotéku refinancují za 7 měsíců */
 mkClient({sample:true,stage:'zjisteni',lastContact:iso(48),updated:now-6*D,name:'Marešovi',note:'Byt 2+kk v Libni si nechají a pronajmou. Fixace hypotéky jim končí za 7 měsíců a zajímá je, o kolik se zvedne splátka. Plánují koupit větší byt.',savings:1800000,
  incomes:[L('Mzda – Jan',84000),L('Mzda – Petra',67000)],
  expenses:E([16000,5500,1700,4000,3000,5000,3500]),annual:A([14000,75000,18000,12000,10000]),
  t:{flat:true,mort:true,fix:true,rent:true,buy:true,annual:true},useRefix:false,
  flat:{est:5900000,purchase:2950000,ops:[L('Fond oprav a správa',3200),L('Energie',2300),L('Pojištění nemovitosti',290)],mort:{balance:1880000,rate:1.79,months:190,ins:390},fix:{months:7,rate:4.79},sale:{comm:3,costs:30000,exempt:true},rent:{rent:21000,vac:5,repairs:12000,tax:'A',owner:3490}},
  variants:[mkVar('Praha 8 – Kobylisy, 3+kk 78 m²',8700000,{acq:90000,reno:[100000,120000,40000,25000,0,0,0,0,30000,15000],savReno:250000,savMort:1450000,rate:4.79,years:30,insSold:720,insKept:980,ops:[4100,3000,380,130]}),
   mkVar('Praha 7 – Holešovice, 4+kk 85 m²',10300000,{acq:110000,reno:[0,0,0,30000,0,0,0,0,0,20000],savReno:100000,savMort:1650000,rate:4.79,years:30,insSold:860,insKept:1150,ops:[4900,3300,420,150]})]}),
 ];}
const SEED_V=4;
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


return {STAGES,RENO,VOPS,KEY,uid,L,sum,getPath,ann,balAfter,kc,kcd,pct,tis,mil,fmtIn,NF,NF2,parseNum,pl,rel,mkVar,mkFlat,mkClient,normalize,samples,seed,SEED_V,validate,compute,C_PMT,C_INS,C_OPS,C_OLD,C_SAV,C_PRO,C_MOR};
});

/* Odvozené hodnoty pro zobrazení (scénáře, nadpisy, nejlepší hodnoty). Čistá logika bez DOM. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model.js'));else root.Derive=factory(root.KB);})(typeof self!=='undefined'?self:this,function(KB){
const {kc,pct,mil,pl,compute,ann}=KB;
const clone=o=>JSON.parse(JSON.stringify(o));

/* indexy nejlepších hodnot v řádku; nic se neoznačuje při jedné hodnotě nebo když jsou všechny stejné */
function bestSet(vals,dir){
  const ok=vals.map((v,i)=>[v,i]).filter(x=>x[0]!=null&&isFinite(x[0]));
  if(ok.length<2)return new Set();
  const r=x=>Math.round(x*100)/100;
  const nums=ok.map(x=>r(x[0]));
  if(nums.every(n=>n===nums[0]))return new Set();
  const best=dir==='max'?Math.max(...nums):Math.min(...nums);
  return new Set(ok.filter(x=>r(x[0])===best).map(x=>x[1]));
}
function initials(name){
  const w=String(name||'').replace(/\(.*?\)/g,' ').trim().split(/\s+/).filter(Boolean);
  if(!w.length)return '?';
  return (w.length===1?w[0][0]:w[0][0]+w[1][0]).toUpperCase();
}
function situation(c,r){
  const T=r.T;
  if(isEmpty(c,r))return 'nevyplněno';
  if(!T.flat)return 'bez bytu';
  if(T.sell)return 'prodej';
  if(T.rent)return 'pronájem';
  return 'ponechání bytu';
}
function eyebrowSituation(c,r){
  const T=r.T;
  if(!T.flat)return 'koupě bez stávajícího bytu';
  if(T.sell)return 'prodej stávajícího bytu';
  if(T.rent)return 'stěhování, stávající byt k pronájmu';
  return 'stěhování, stávající byt zůstává';
}

/* Kumulativní „kolik zbude“ v čase. Do konce fixace platí dnešní splátka, potom podle scénáře.
   Scénář 1 a 2 jsou konstantní (prodej splatí hypotéku; scénář 2 podle zadání počítá s dnešní sazbou). */
function timeline(sc,years){
  const list=sc.list,months=12*years;
  const T=list.length?list[0].k.t:null;
  const k=Math.max(0,Math.round(+((list[0]||{k:{flat:{fix:{}}}}).k.flat.fix.months)||0));
  const sRent=list.find(s=>s.key==='rent');
  const monthlyOf=s=>{
    const after=s.free;
    let before=after;
    if(s.key==='rentRefix'&&sRent)before=sRent.free;
    if(s.key==='stayRefix')before=sc.today.freeNow;
    return {before,after};
  };
  const xs=[0];
  if(k>0&&k<months)xs.push(k);
  for(let y=1;y<=years;y++)xs.push(12*y);
  xs.sort((a,b)=>a-b);
  const cumAt=(m,mo)=>{const b=Math.min(m,k),a=Math.max(0,m-k);return mo.before*b+mo.after*a;};
  const mk=(id,name,mo)=>({id,name,monthly:mo,pts:xs.map(x=>[x,cumAt(x,mo)]),yearEnd:Array.from({length:years},(_,i)=>cumAt(12*(i+1),mo))});
  const series=list.map(s=>mk(s.key,'Scénář '+s.n,monthlyOf(s)));
  const base=mk(0,'Dnes',{before:sc.today.freeNow,after:sc.today.freeNow});
  return {series,base,xs,k:k>0&&k<months?k:null,months,years};
}
function isEmpty(c,r){
  r=r||compute(c);
  return r.income<=0&&!c.variants.some(v=>(+v.price||0)>0)&&!c.t.flat;
}
function counts(W){return {risk:W.filter(w=>w[0]==='Riziko').length,warn:W.filter(w=>w[0]==='Pozor').length};}
function varWarn(v,savings){
  const o={ltv:null,ltvTag:null,dstiWarn:false,sav:false};
  if(v.ltv>0.9)o.ltvTag='r';else if(v.ltv>0.8)o.ltvTag='w';
  if(v.dsti!=null&&v.dsti>0.5)o.dstiWarn=true;
  if(v.savUsed>savings)o.sav=v.savUsed-savings;
  return o;
}
/* shrnutí pro přehled */
function summary(c,r){
  const V=r.V,best=V.length?V.reduce((b,v,i)=>v.free>V[b].free?i:b,0):-1;
  const T=r.T;
  const todayFree=T.flat?r.freeNow:r.income-r.expTotal;
  let h1,lead;
  if(isEmpty(c,r)){h1=c.name||'Nový klient';lead='Zatím nic nevyplněno. Výsledky se přepočítávají při každém zadání, tlačítko Spočítat není potřeba.';}
  else if(!T.buy||!V.length){h1=T.buy?'Zatím žádná varianta nového bytu':'Bez koupě nového bytu';lead=T.buy?'Přidejte první variantu a výsledky se ukážou hned.':'Zapněte „Koupit nový byt“ v záložce Příjmy a výdaje.';}
  else if(V.length===1){const v=V[0];h1='Po koupi zbude '+kc(v.free)+' měsíčně';lead='Varianta '+v.name+': bydlení '+kc(v.total)+' měsíčně, splátky '+(v.dsti==null?'—':pct(v.dsti))+' příjmu.';if(v.free<0)h1='Po koupi by chybělo '+kc(-v.free)+' měsíčně';}
  else if(V.every(v=>v.free<0)){
    const fr=V.map(v=>v.free);
    h1='Ani jedna varianta nevychází do plusu';
    lead='Měsíčně by chybělo <b class="neg">'+kc(Math.max(...fr))+'</b> až <b class="neg">'+kc(Math.min(...fr))+'</b>.'+(T.sell&&r.S.net<0?' Prodej bytu nepokryje hypotéku.':'');
  }else{h1='Nejvíc měsíčně zbude u varianty '+V[best].name;lead='Po bydlení a výdajích domácnosti <b>'+kc(V[best].free)+'</b>. Dnes zbývá '+kc(todayFree)+'.';}
  return {best,todayFree,h1,lead};
}
/* scénáře pro záložku Scénáře: compute() nad kopií klienta s upravenými přepínači */
function scenarios(c,vi){
  const base=clone(c);
  const v=base.variants[vi]||base.variants[0];
  const out=[];
  const T0=compute(base).T;
  const mk=(key,title,mod)=>{
    const k=clone(base);k.variants=v?[v]:[];mod(k);
    const r=compute(k);return {key,id:key,title,k,r,v:r.V[0]||null};
  };
  // dnešek = dnešní splátka, bez koupě
  const today=(()=>{const k=clone(base);k.variants=[];k.t.buy=false;k.t.sell=false;k.t.rent=false;k.useRefix=false;return compute(k);})();
  if(T0.flat){
    out.push(mk('stay','Zůstat',k=>{k.t.buy=false;k.t.sell=false;k.t.rent=false;k.useRefix=false;}));
    if(T0.fix)out.push(mk('stayRefix','Zůstat po refinancování',k=>{k.t.buy=false;k.t.sell=false;k.t.rent=false;k.useRefix=true;}));
  }
  if(T0.flat&&T0.buy&&v){
    out.push(mk('sell','Prodat a koupit nový',k=>{k.t.sell=true;k.t.rent=false;}));
    out.push(mk('rent','Pronajímat a koupit nový',k=>{k.t.sell=false;k.t.rent=true;k.useRefix=false;}));
    if(T0.fix)out.push(mk('rentRefix','Pronajímat po refinancování a koupit nový',k=>{k.t.sell=false;k.t.rent=true;k.useRefix=true;}));
  }
  out.forEach((s,i)=>{s.n=i+1;});
  out.forEach(s=>{
    const r=s.r,x=s.v,f=s.k.flat,m=f.mort;
    if(x){s.free=x.free;s.total=x.total;s.parts=[['Splátka nového bytu',x.pmt,'pmt'],['Pojištění',x.ins,'ins'],['Provoz nového bytu',x.ops,'ops']];if(r.T.flat&&!r.T.sell)s.parts.push(['Starý byt po odečtu nájmu',x.old,'old']);
      s.ltv=x.ltv;s.dsti=x.dsti;s.mortgage=x.mortgage;}
    else{s.free=r.freeNow;s.total=r.housingNow;s.parts=[['Splátka hypotéky',r.pmtUsed,'pmt'],['Pojištění',r.mIns,'ins'],['Provoz bytu',r.flatOps,'ops']];s.ltv=null;s.dsti=r.dstiNow;s.mortgage=0;}
    // majetek a závazky
    const oldDebt=r.T.mort&&!r.T.sell?(+m.balance||0):0;
    s.rows={newMort:x?x.mortgage:null,
      oldMort:!r.T.mort?null:(r.T.sell?'splacena prodejem':{bal:+m.balance||0,rate:r.useFix?+f.fix.rate||0:+m.rate||0}),
      rent:r.T.rent?r.P.netM:null,
      savLeft:Math.max(0,(+s.k.savings||0)-(x?x.savUsed:0)),
      debt:(x?x.mortgage:0)+oldDebt,
      net:(x?x.price:0)+(r.T.sell?0:(+f.est||0))-((x?x.mortgage:0)+oldDebt)};
  });
  return {list:out,today,variant:v};
}
function scenarioText(s,c,r){
  const f=c.flat,m=f.mort;
  switch(s.key){
    case 'stay':return r.T.mort?'Beze změny. Hypotéka běží dál za dnešních '+fmtPct(m.rate)+' %, byt zůstává klientovi.':'Beze změny, nic se neprodává ani nekupuje.';
    case 'stayRefix':return 'Bez stěhování. Po konci fixace za '+(+f.fix.months||0)+' '+pl(+f.fix.months||0,'měsíc','měsíce','měsíců')+' nová sazba '+fmtPct(f.fix.rate)+' %.';
    case 'sell':return 'Starý byt se prodá, čistý výtěžek jde do nového bytu.';
    case 'rent':return r.T.mort?'Starý byt se pronajme, hypotéka běží dál za dnešních '+fmtPct(m.rate)+' %.':'Starý byt se pronajme a zůstává ve vlastnictví.';
    default:return 'Jako vedle, ale po konci fixace za '+(+f.fix.months||0)+' '+pl(+f.fix.months||0,'měsíc','měsíce','měsíců')+' se splátka přepočítá na '+fmtPct(f.fix.rate)+' %.';
  }
}
const fmtPct=n=>KB.NF2.format(+n||0);
/* nejbližší konec fixace přes všechny klienty */
function nearestFix(clients){
  let best=null;
  clients.forEach(c=>{const r=compute(c);if(r.T.fix&&(+c.flat.fix.months||0)>0){const m=+c.flat.fix.months;if(!best||m<best.months)best={months:m,name:c.name,delta:r.pmtFix-r.pmtNow};}});
  return best;
}
return {timeline,bestSet,initials,situation,eyebrowSituation,isEmpty,counts,varWarn,summary,scenarios,scenarioText,nearestFix,fmtPct,clone};
});

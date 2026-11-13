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
  const mk=(id,title,mod)=>{
    const k=clone(base);k.variants=v?[v]:[];mod(k);
    const r=compute(k);return {id,title,k,r,v:r.V[0]||null};
  };
  // dnešek = dnešní splátka, bez koupě
  const today=(()=>{const k=clone(base);k.variants=[];k.t.buy=false;k.t.sell=false;k.t.rent=false;k.useRefix=false;return compute(k);})();
  if(T0.flat&&T0.buy&&v){
    out.push(mk(1,'Prodat a koupit',k=>{k.t.sell=true;k.t.rent=false;}));
    out.push(mk(2,T0.mort?'Pronajímat a koupit':'Ponechat a koupit',k=>{k.t.sell=false;k.t.rent=true;k.useRefix=false;}));
    if(T0.fix)out.push(mk(3,'Refinancovat, pronajímat a koupit',k=>{k.t.sell=false;k.t.rent=true;k.useRefix=true;}));
  }
  if(T0.fix)out.push(mk(4,'Zůstat a jen refinancovat',k=>{k.t.buy=false;k.t.sell=false;k.t.rent=false;k.useRefix=true;}));
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
  switch(s.id){
    case 1:return 'Starý byt se prodá, čistý výtěžek jde do nového bytu.';
    case 2:return r.T.mort?'Starý byt se pronajme, hypotéka běží dál za dnešních '+fmtPct(m.rate)+' %.':'Starý byt se pronajme a zůstává ve vlastnictví.';
    case 3:return 'Jako vedle, ale po konci fixace za '+(+f.fix.months||0)+' '+pl(+f.fix.months||0,'měsíc','měsíce','měsíců')+' se splátka přepočítá na '+fmtPct(f.fix.rate)+' %.';
    default:return 'Bez stěhování. Po konci fixace nová sazba '+fmtPct(f.fix.rate)+' %.';
  }
}
const fmtPct=n=>KB.NF2.format(+n||0);
/* nejbližší konec fixace přes všechny klienty */
function nearestFix(clients){
  let best=null;
  clients.forEach(c=>{const r=compute(c);if(r.T.fix&&(+c.flat.fix.months||0)>0){const m=+c.flat.fix.months;if(!best||m<best.months)best={months:m,name:c.name,delta:r.pmtFix-r.pmtNow};}});
  return best;
}
return {bestSet,initials,situation,eyebrowSituation,isEmpty,counts,varWarn,summary,scenarios,scenarioText,nearestFix,fmtPct,clone};
});

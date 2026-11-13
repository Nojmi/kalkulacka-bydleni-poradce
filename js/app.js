/* Kalkulačka bydlení – obrazovky a interakce. Vše běží v prohlížeči, data jen v localStorage. */
(function(){
'use strict';
const {kc,kcd,pct,tis,mil,pl,rel,parseNum,NF,NF2,L,sum,compute,mkVar,mkClient}=KB;
const kn=n=>n==null||!isFinite(n)?'—':(Math.round(n)<0?'−':'')+NF.format(Math.abs(Math.round(n)));
const {esc,COL}=Charts;
const D=Derive;
const DW='clamp(240px,16vw,300px)';

/* ---------- stav ---------- */
const loaded=Store.load(window.localStorage);
const S=loaded.state;                                  // trvalý stav: clients, activeId, lastBackup, changes
const UI={view:'home',panel:{open:false,vi:0},collapsed:{ins:true},present:false,presTab:'prehled',
  charts:{},dd:false,ddQ:'',modal:null,editing:null,homeQ:'',homeAll:false,scenVar:0,grafVar:0,srovMain:false,importRes:null,saveWarned:false};
const VIEWS=['home','napoveda','prehled','scenare','srovnani','grafy','byt','prijmy'];
const $=s=>document.querySelector(s);
const cur=()=>UI.wiz?UI.wiz.draft:(S.clients.find(c=>c.id===S.activeId)||S.clients[0]);

let saveT=null;
function persist(touch){
  if(UI.wiz){if(touch)cur().updated=Date.now();return;}
  if(touch){const c=cur();if(c)c.updated=Date.now();S.changes=(S.changes||0)+1;}
  clearTimeout(saveT);
  saveT=setTimeout(()=>{if(!Store.save(window.localStorage,S)&&!UI.saveWarned){UI.saveWarned=true;toast('Data se nepodařilo uložit do prohlížeče. Použijte Exportovat.');}},150);
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),3200);}

/* ---------- pomocné ---------- */
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setP(o,p,v){const a=p.split('.'),last=a.pop();const t=a.reduce((x,k)=>x[k],o);t[last]=v;}
const num=v=>{const n=+v;return isFinite(n)?n:0;};
function relShort(ts){return rel(ts).replace('upraveno ','').replace('právě teď','právě teď');}
function days(){return Store.backupAge(S);}
function backupLabel(){const d=days();return (d==null?'Bez zálohy':'Záloha '+(d===0?'dnes':d===1?'před 1 dnem':'před '+d+' dny'))+'<span class="bkz"> · Zálohovat</span>';}
const bkOld=()=>{const d=days();return d==null||d>=7;};
const tag=(t,cls)=>'<span class="pill '+(cls||'')+'">'+t+'</span>';
function fmtField(v,kind){
  if(!v)return '';
  if(kind==='pct'||kind==='dec')return NF2.format(v);
  return NF.format(v);
}
/* živé oddělování tisíců při psaní: číslice, jedna desetinná čárka, mezery po třech */
function fmtLive(raw){
  const t=String(raw).replace(/\./g,',').replace(/[^\d,]/g,'');
  const i=t.indexOf(',');
  let ip=i<0?t:t.slice(0,i),dp=i<0?null:t.slice(i+1).replace(/,/g,'');
  ip=ip.replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');
  return dp==null?ip:(ip||'0')+','+dp;
}
/* pole s číslem: uchovává rozepsaný text při fokusu, formátuje až při opuštění */
function numInp(path,unit,o){
  o=o||{};
  const c=cur();const val=num(getP(c,path));
  const ed=UI.editing&&UI.editing.f===path;
  const shown=ed?UI.editing.raw:fmtField(val,o.kind);
  return '<label class="inp"><input class="n'+(!val&&!ed?' z':'')+'" inputmode="decimal" autocomplete="off" data-f="'+path+'" data-k="'+(o.kind||'int')+'" value="'+esc(shown)+'" placeholder="0" aria-label="'+esc(o.aria||path)+'">'+(unit?'<u>'+unit+'</u>':'')+'</label>';
}
function txtInp(path,o){
  o=o||{};const c=cur();
  return '<label class="inp tx'+(o.big?' big':'')+'"><input data-f="'+path+'" data-k="text" autocomplete="off" value="'+esc(getP(c,path)||'')+'" placeholder="'+esc(o.ph||'')+'" aria-label="'+esc(o.aria||path)+'"></label>';
}
function fld(label,inner,cls){return '<div class="fld '+(cls||'')+'"><span class="k">'+label+'</span>'+inner+'</div>';}
function tg(act,on,label,extra){return '<button class="tg" role="switch" aria-checked="'+(!!on)+'" aria-label="'+esc(label)+'" data-act="'+act+'" '+(extra||'')+'></button>';}
function seg(act,opts,val,cls,attr){return '<div class="seg '+(cls||'')+'" role="group">'+opts.map(o=>'<button class="'+(String(o[0])===String(val)?'on':'')+'" data-act="'+act+'" data-v="'+o[0]+'" '+(attr||'')+'>'+esc(o[1])+'</button>').join('')+'</div>';}
function itemList(list,o){
  const c=cur();
  return '<div class="items">'+getP(c,list).map((it,i)=>'<div class="item"><input class="nm" tabindex="-1" data-f="'+list+'.'+i+'.label" data-k="text" value="'+esc(it.label)+'" aria-label="Název položky">'
    +numInp(list+'.'+i+'.amount','',{aria:it.label||'Částka'})+'<button class="x" data-act="delItem" data-list="'+list+'" data-i="'+i+'" aria-label="Odebrat položku '+esc(it.label)+'">×</button></div>').join('')+'</div>'
    +'<button class="add" data-act="addItem" data-list="'+list+'">+ Přidat položku</button>';
}
function bestHtml(txt,isBest){return isBest?'<span class="bv">'+txt+'</span>':txt;}

/* ---------- hlavička ---------- */
function header(c,r){
  if(UI.view==='home'||UI.view==='napoveda'||!c){
    return '<header class="hdr"><button class="logo" data-act="nav" data-v="home" aria-label="Domů"><i>KB</i><span>Kalkulačka bydlení</span></button><div class="sp"></div><button class="btn" data-act="help">'+(UI.view==='napoveda'?'← Zpět do aplikace':'Jak aplikace funguje')+'</button><button class="bk'+(bkOld()?' old':'')+'" data-act="backup">'+backupLabel()+'</button></header>';
  }
  const T=r.T;
  const tabs=[['prehled','Přehled']];
  if(T.flat&&T.buy&&c.variants.length)tabs.push(['scenare','Scénáře']);
  tabs.push(['srovnani','Srovnání'],['grafy','Grafy']);
  if(T.flat)tabs.push(['byt','Stávající byt']);
  tabs.push(['prijmy','Příjmy a výdaje']);
  return '<header class="hdr"><button class="logo" data-act="nav" data-v="home" aria-label="Domů"><i>KB</i><span>Kalkulačka bydlení</span></button>'
   +'<button class="who'+(UI.dd?' open':'')+'" data-act="dd" aria-haspopup="listbox" aria-expanded="'+UI.dd+'"><span class="av">'+esc(D.initials(c.name))+'</span><b>'+esc(c.name||'Bez jména')+'</b><small>'+S.clients.length+' '+pl(S.clients.length,'klient','klienti','klientů')+(UI.dd?' ▴':' ▾')+'</small></button>'
   +'<nav class="tabs" aria-label="Sekce">'+tabs.map(t=>'<button class="tab'+(UI.view===t[0]?' on':'')+'" data-act="nav" data-v="'+t[0]+'">'+t[1]+'</button>').join('')+'</nav>'
   +'<div class="sp"></div><button class="lnk" data-act="help" style="white-space:nowrap">Nápověda</button><button class="bk'+(bkOld()?' old':'')+'" data-act="backup">'+backupLabel()+'</button>'
   +'<button class="btn" data-act="exportOne">Exportovat</button><button class="btn blk" data-act="present">Prezentovat klientovi</button></header>';
}
const NOTE='<div class="note"><b>Orientační výpočet, ne nabídka banky</b><span>Nezadávejte skutečné údaje klientů</span><span>Daň z pronájmu je zjednodušený, neověřený model</span><span>Pojištění hypotéky je pevná, ručně zadaná částka</span></div>';

/* ---------- domů ---------- */
function viewHome(){
  const q=UI.homeQ.trim().toLowerCase();
  const rs=S.clients.map(c=>({c,r:compute(c)}));
  const sorted=rs.slice().sort((a,b)=>b.c.updated-a.c.updated);
  const filt=q?sorted.filter(x=>(x.c.name+' '+x.c.note).toLowerCase().includes(q)):sorted;
  const list=(UI.homeAll||q?filt:filt.slice(0,5));
  const risky=rs.filter(x=>D.counts(x.r.W).risk>0);
  const empty=rs.filter(x=>D.isEmpty(x.c,x.r)).length;
  const vars=S.clients.reduce((a,c)=>a.concat(c.variants.filter(v=>(+v.price||0)>0)),[]);
  const avg=vars.length?vars.reduce((s,v)=>s+num(v.price),0)/vars.length:0;
  const fx=D.nearestFix(S.clients);
  const rowsH=list.map(x=>{
    const n=x.c.variants.length,cn=D.counts(x.r.W);
    return '<button class="cr" data-act="open" data-id="'+x.c.id+'"><span class="av lg">'+esc(D.initials(x.c.name))+'</span><span class="i"><b>'+esc(x.c.name)+'</b><small>'+(D.isEmpty(x.c,x.r)?'nevyplněno':D.situation(x.c,x.r)+' · '+n+' '+pl(n,'varianta','varianty','variant'))+'</small></span>'
      +(cn.risk?'<span class="pill r">■ riziko</span>':'')+'<span class="tm">'+relShort(x.c.updated)+'</span><span class="ar">→</span></button>';
  }).join('')||'<p class="mut" style="padding:14px">Žádný klient neodpovídá hledání.</p>';
  const ch=S.changes||0;
  return '<div class="page"><div class="home"><div><h1>Dobrý den</h1><p class="q">Koho dnes připravujete?</p></div>'
   +'<input class="search" id="homeq" data-f="homeq" placeholder="Hledat klienta podle jména nebo poznámky…" value="'+esc(UI.homeQ)+'" aria-label="Hledat klienta" autocomplete="off">'
   +'<div class="acts3"><button class="act blk" data-act="newClient"><b>+ Nový klient</b><span>Průvodce ve čtyřech krocích</span></button>'
   +'<button class="act" data-act="importOpen"><b>Importovat zálohu</b><span>Soubor JSON, nic se nepřepíše</span></button>'
   +'<button class="act" data-act="backup"><b>Zálohovat všechny</b><span>'+(S.lastBackup?'Naposledy '+(days()===0?'dnes':'před '+days()+' '+pl(days(),'dnem','dny','dny')):'Zatím nezálohováno')+', od té doby '+ch+' '+pl(ch,'změna','změny','změn')+'</span></button></div>'
   +'<button class="helpbar" data-act="help"><span class="hi">?</span><span class="ht"><b>Jak aplikace funguje</b><small>Schéma celé aplikace: co zadat, co se počítá a kde co najdete. Pro každého, kdo ji otevře poprvé.</small></span><span class="ar">→</span></button>'
   +'<div class="hg"><div class="card"><div class="rowb"><h2>Naposledy upravení</h2>'+(UI.homeAll||q?'':'<button class="lnk" data-act="homeAll">Všichni klienti ('+S.clients.length+')</button>')+'</div><div style="margin-top:10px;display:flex;flex-direction:column;gap:2px">'+rowsH+'</div></div>'
   +'<div class="card"><h2>V číslech</h2><div class="nums">'
   +'<div class="tile"><small>Klientů</small><b>'+S.clients.length+'</b><span>z toho '+empty+' '+pl(empty,'nevyplněný','nevyplněné','nevyplněných')+'</span></div>'
   +'<div class="tile"><small>Zvažovaných bytů</small><b>'+vars.length+'</b><span>'+(vars.length?'průměrná cena '+mil(avg):'zatím žádný')+'</span></div>'
   +'<div class="tile"><small>Klienti s rizikem</small><b>'+risky.length+'</b><span>'+(risky.length?esc(risky.map(x=>x.c.name).join(', ')):'žádný')+'</span></div>'
   +'<div class="tile"><small>Nejbližší konec fixace</small><b>'+(fx?'za '+fx.months+' měs.':'—')+'</b><span>'+(fx?esc(fx.name)+', splátka '+kcd(fx.delta):'žádná fixace')+'</span></div>'
   +'</div></div></div></div></div>';
}

/* ---------- přehled ---------- */
function stackBar(parts){
  const tot=parts.reduce((s,p)=>s+Math.max(0,p[1]),0)||1;
  return '<div class="stack" role="img" aria-label="'+esc(parts.map(p=>p[0]+' '+kc(p[1])).join(', '))+'">'+parts.filter(p=>p[1]>0).map(p=>'<i style="flex:'+p[1]+' 0 0;background:'+p[2]+'" title="'+esc(p[0]+': '+kc(p[1]))+'"></i>').join('')+'</div>';
}
function legendRows(rows){
  return '<div class="leg">'+rows.map(p=>'<div class="'+(p[3]?'z':'')+'"><span class="sw" style="background:'+p[2]+'"></span>'+esc(p[0])+'<b>'+(p[3]?'—':NF.format(Math.round(p[1])))+'</b></div>').join('')+'</div>';
}
function varParts(v,T){
  const rows=[['Splátka',v.pmt,COL.pmt],['Pojištění',v.ins,COL.ins],['Provoz',v.ops,COL.ops]];
  if(T.flat&&!T.sell)rows.push([T.rent?'Starý byt po nájmu':'Starý byt (ponechaný)',v.old,COL.old]);
  return rows;
}
function dnesCard(c,r,sm){
  const T=r.T;
  let body;
  if(!T.flat){
    body='<div><div class="mut" style="font-size:14px">Bydlení měsíčně</div><div style="margin:14px 0 10px;width:34px;height:4px;background:#9aa0a8;border-radius:2px"></div><div class="mut" style="font-size:13.5px">Dnešní nájem se zatím nezadává</div></div><hr><div><div class="mut" style="font-size:14px">Zbude měsíčně</div><div class="free" style="font-size:28px;font-weight:650;letter-spacing:-.025em">'+kc(sm.todayFree)+'</div><div class="mut" style="font-size:13.5px;margin-top:4px">příjem – výdaje domácnosti</div></div>';
  }else{
    const rows=[['Splátka',r.pmtUsed,COL.pmt],['Pojištění',r.mIns,COL.ins],['Provoz',r.flatOps,COL.ops]];
    if(T.rent)rows.push(['Starý byt',0,COL.old,true]);
    const low=r.freeNow>=0&&r.income>0&&r.freeNow<0.05*r.income;
    let note='';
    if(r.freeNow<0)note='<span class="neg">■ už dnes záporné cashflow</span>';
    else if(low)note='▲ téměř nic nezbývá už dnes';
    else if(T.fix&&r.useFix&&Math.abs(r.pmtFix-r.pmtNow)>=1)note='refixace '+(r.pmtFix>r.pmtNow?'zvedne':'sníží')+' splátku o '+kc(Math.abs(r.pmtFix-r.pmtNow));
    body='<div><div class="mut" style="font-size:14px">Bydlení měsíčně</div><div class="big">'+kc(r.housingNow)+'</div></div>'+stackBar(rows.filter(x=>!x[3]))+legendRows(rows)+'<hr><div><div class="mut" style="font-size:14px">Zbude měsíčně</div><div class="free'+(r.freeNow<0?' neg':'')+'">'+kc(r.freeNow)+'</div><div class="mut" style="font-size:13.5px;margin-top:4px">'+note+'</div></div>';
  }
  const sub=!T.flat?'Bez vlastního bytu':'Stávající byt, '+(T.sell?'před prodejem':T.fix&&r.useFix?'splátka po refixaci':'dnešní splátka');
  return '<div class="vcard dnes" tabindex="-1"><div><div class="lbl">Výchozí stav</div><div class="ttl" style="margin-top:2px">Dnes</div><div class="mut" style="font-size:13.5px">'+sub+'</div></div>'+body+'</div>';
}
function varCard(c,r,i,bestI){
  const v=r.V[i],T=r.T,w=D.varWarn(v,r.savings);
  const isBest=i===bestI&&r.V.length>1&&v.free>0;
  const todayFree=D.summary(c,r).todayFree;
  const tagTop=isBest?'<span class="pill a">◆ Nejvíc zbude</span>':(w.ltvTag==='r'?'<span class="pill r">■ LTV nad 90 %</span>':w.ltvTag==='w'?'<span class="pill w">▲ LTV nad 80 %</span>':'');
  const rows=varParts(v,T).map(p=>[p[0],p[1],p[2]]);
  const diff=v.free-todayFree;
  const pills=[];
  const ltvT='LTV '+pct(v.ltv);
  pills.push(w.ltvTag==='r'?tag('■ '+ltvT,'r'):w.ltvTag==='w'?tag('▲ '+ltvT,'w'):tag(ltvT));
  pills.push(v.dsti!=null?(w.dstiWarn?tag('▲ Splátky '+pct(v.dsti)+' příjmu','w'):tag('Splátky '+pct(v.dsti)+' příjmu')):'');
  if(w.sav)pills.push(tag('▲ Úspory chybí '+NF.format(Math.round(w.sav)),'w'));
  else pills.push(tag('Hypotéka '+mil(v.mortgage)));
  return '<div class="vcard'+(isBest?' best':'')+'" role="button" tabindex="0" data-act="editVar" data-i="'+i+'" aria-label="Upravit variantu '+esc(v.name)+'">'
   +'<div class="toprow"><span class="lbl">Varianta '+(i+1)+'</span>'+tagTop+'</div>'
   +'<div><div class="ttl">'+esc(v.name)+'</div><div class="mut" style="font-size:13.5px;margin-top:2px">'+kc(v.price)+' · rekonstrukce '+kc(v.reno)+'</div></div>'
   +'<div><div class="mut" style="font-size:14px">Bydlení měsíčně</div><div class="big">'+kc(v.total)+'</div></div>'
   +stackBar(rows)+legendRows(rows)+'<hr>'
   +'<div><div class="mut" style="font-size:14px">Zbude měsíčně</div><div class="free'+(v.free<0?' neg':'')+'" style="'+(v.free<0?'color:var(--risk)':'')+'">'+kc(v.free)+'</div><div class="mut" style="font-size:13.5px;margin-top:4px">'+kcd(diff).replace('±','±')+' proti dnešku</div></div>'
   +'<div class="pills" style="margin-top:auto">'+pills.join('')+'</div></div>';
}
function warningsPanel(r,wide){
  const W=r.W,cn=D.counts(W);
  const head='<div class="rowb"><h2>Upozornění</h2><span class="row" style="gap:8px">'+(cn.risk?tag('■ '+cn.risk+' '+pl(cn.risk,'riziko','rizika','rizik'),'r'):'')+(cn.warn?tag('▲ '+cn.warn+' pozor','w'):'')+(!W.length?'<span class="mut4">0</span>':'')+'</span></div>';
  let body;
  if(!W.length)body='<p class="mut" style="margin-top:14px">✓ Žádná upozornění. Hodnoty jsou v běžných mezích.</p>';
  else if(W.length<=2||!wide){
    body='<div class="warn" style="margin-top:14px">'+W.map(w=>'<div class="wi '+(w[0]==='Riziko'?'r':'w')+'"><span class="tagw">'+(w[0]==='Riziko'?'■ Riziko':'▲ Pozor')+'</span><b>'+esc(w[1])+'</b><small>'+esc(w[2])+'</small></div>').join('')+'</div>';
  }else{
    body='<div class="warn c3" style="margin-top:14px">'+W.map(w=>'<div class="wi '+(w[0]==='Riziko'?'r':'w')+'"><span class="tagw">'+(w[0]==='Riziko'?'■ Riziko':'▲ Pozor')+'</span><b>'+esc(w[1])+'</b></div>').join('')+'</div>';
  }
  const ok=r.V.length&&W.length&&W.length<=2&&r.V.some(v=>!D.varWarn(v,r.savings).ltvTag)?'<p class="mut" style="margin-top:12px;font-size:13.5px">Ostatní varianty jsou bez upozornění.</p>':'';
  return '<div class="card">'+head+body+ok+'</div>';
}
function flatPanel(c,r){
  const T=r.T,P=r.P,S_=r.S;
  if(T.sell){
    return '<div class="card"><div class="rowb"><h2>Prodej stávajícího bytu</h2><button class="lnk" data-act="nav" data-v="byt">Detail →</button></div><div style="margin-top:6px">'+saleSankey(r,560,230)+'</div>'
     +'<hr style="margin:10px 0"><div class="rowb"><span><b>= Čistý výtěžek</b> <span class="mut" style="font-size:13px">'+(S_.net<0?'chybějící částku je nutné doplatit':'jde do nového bytu')+'</span></span><b class="'+(S_.net<0?'neg':'')+'" style="font-size:22px">'+(S_.net<0?'▼ ':'')+kc(S_.net)+'</b></div></div>';
  }
  const best=P.best;
  return '<div class="card"><div class="rowb"><h2>Stávající byt'+(T.rent?' v pronájmu':' (ponechaný)')+'</h2><button class="lnk" data-act="nav" data-v="byt">Detail →</button></div><div class="panel-list" style="margin-top:8px">'
   +(T.rent?'<div><span>Čistý příjem z nájmu</span><b>'+kc(P.netM)+' / měs.</b></div><div><span>Daň ročně · varianta '+P.sel+'</span><b>'+kc(P.tax)+(best===P.sel?' <span class="pos" style="font-size:12px">◆ nejnižší</span>':'')+'</b></div>'
     +(best!==P.sel?'<div><span>Nejnižší daň: varianta '+best+'</span><b>'+kc(P['tax'+best])+' <span class="pos" style="font-size:12px">◆</span></b></div>':''):'')
   +(!T.rent?'<div><span>Splátka hypotéky + pojištění</span><b>'+kc(r.pmtUsed+r.mIns)+' / měs.</b></div><div><span>Provoz bytu</span><b>'+kc(r.flatOps)+' / měs.</b></div>':'')
   +'<div><span>Starý byt po odečtu nájmu</span><b>'+kc(r.oldNet)+' / měs.</b></div></div></div>';
}
function finPanel(c,r){
  const T=r.T,mx=Math.max(1,...r.V.map(v=>v.need));
  return '<div class="card"><div class="rowb"><h2>Jak se pořízení financuje</h2><div class="legs"><span><i class="sw" style="background:'+COL.sav+'"></i>Úspory</span>'+(T.sell?'<span><i class="sw" style="background:'+COL.pro+'"></i>Výtěžek</span>':'')+'<span><i class="sw" style="background:'+COL.mor+'"></i>Hypotéka</span></div></div>'
   +r.V.map(v=>{const sv=v.savUsed,pr=v.proceeds,mo=v.mortgage;
     return '<div class="fbar"><span class="nmx" title="'+esc(v.name)+'">'+esc(v.name.length>16?v.name.split(' – ')[0]:v.name)+'</span><div class="tr" style="width:'+(v.need/mx*100).toFixed(1)+'%" role="img" aria-label="Úspory '+kc(sv)+(pr?', výtěžek '+kc(pr):'')+', hypotéka '+kc(mo)+'"><i style="flex:'+sv+' 0 0;background:'+COL.sav+'"></i>'+(pr>0?'<i style="flex:'+pr+' 0 0;background:'+COL.pro+'"></i>':'')+'<i style="flex:'+mo+' 0 0;background:'+COL.mor+'"></i></div><b>'+mil(v.need)+'</b></div>';}).join('')+'</div>';
}
function situationPanel(c,r){
  const T=r.T;
  return '<div class="card"><h2>Situace</h2><p style="margin-top:12px;color:var(--ink2)">Klient nemá stávající byt, proto chybí záložka Stávající byt a v kartách se nepočítá starý byt. Zapnuté je jen <b>'+(T.buy?'Koupit nový byt':'—')+'</b>'+(T.annual?' a <b>Roční výdaje</b>':'')+'. Situaci změníte v záložce <a href="#prijmy">Příjmy a výdaje</a>.</p></div>';
}
function viewPrehled(c,r){
  const T=r.T,sm=D.summary(c,r),V=r.V,n=V.length;
  if(D.isEmpty(c,r)||(!n&&T.buy&&!c.variants.length&&r.income<=0))return viewEmpty(c,r);
  const sumb='<div class="sumbox"><div><small>Příjem</small><b>'+kc(r.income)+'</b></div><div><small>Výdaje domácnosti</small><b>'+kc(r.expTotal)+'</b></div><div><small>Úspory</small><b>'+(r.savings>=1e6?mil(r.savings).replace('mil.','mil. Kč'):kc(r.savings))+'</b></div></div>';
  const canAdd=n<Store.MAXV&&T.buy;
  let cols,addCard='';
  if(T.buy){
    addCard=canAdd?'<button class="addcard" data-act="addVar"><span class="pl">+</span><b>Přidat variantu</b><span>'+n+' ze '+Store.MAXV+'</span>'+(n===1?'<span style="margin-top:8px">Srovnání má smysl už se dvěma byty.<br>Další variantu můžete založit kopií první.</span>':'')+'</button>':'<div class="addcard dis"><b>Maximum '+Store.MAXV+' variant</b><span>Jednu odeberte nebo upravte</span></div>';
    cols=n===1?DW+' minmax(0,1fr) minmax(0,1.2fr)':DW+' repeat('+n+',minmax(0,1fr))'+(n<Store.MAXV?' 150px':'');
    if(!n)cols=DW+' minmax(0,1fr)';
  }else cols=DW;
  const cards=dnesCard(c,r,sm)+V.map((v,i)=>varCard(c,r,i,sm.best)).join('')+addCard;
  const wide=r.W.length>=4;
  const panels=[];
  if(T.flat)panels.push(flatPanel(c,r));
  panels.push(warningsPanel(r,wide||!T.flat));
  if(!T.flat)panels.push(situationPanel(c,r));
  else if(!wide&&n)panels.push(finPanel(c,r));
  const pcols=!T.flat?'1fr 1fr':wide?'minmax(0,1fr) minmax(0,1.8fr)':'minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)';
  return '<div class="page"><div class="head"><div class="t"><span class="eyebrow">'+esc(c.name)+' · '+D.eyebrowSituation(c,r)+'</span><h1 class="h1">'+esc(sm.h1)+'</h1><p class="lead">'+sm.lead+'</p></div>'+sumb+'</div>'
   +'<div class="cards" style="grid-template-columns:'+cols+'">'+cards+'</div><div class="panels" style="grid-template-columns:'+pcols+'">'+panels.join('')+'</div></div>';
}
function viewEmpty(c,r){
  return '<div class="page"><div class="head"><div class="t"><span class="eyebrow">Založeno '+rel(c.updated).replace('upraveno ','')+'</span><h1 class="h1">'+esc(c.name||'Nový klient')+'</h1><p class="lead">Zatím nic nevyplněno. Výsledky se přepočítávají při každém zadání, tlačítko Spočítat není potřeba.</p></div>'
   +'<div class="sumbox"><div><small>Příjem</small><b class="mut4">—</b></div><div><small>Výdaje domácnosti</small><b class="mut4">—</b></div><div><small>Úspory</small><b class="mut4">—</b></div></div></div>'
   +'<div class="steps"><div class="step on"><span class="no">1</span><h3>Příjmy a výdaje</h3><p>Výdaje i roční výdaje jsou předvyplněné názvy, stačí doplnit částky.</p><button class="btn blk" data-act="nav" data-v="prijmy">Vyplnit</button></div>'
   +'<div class="step"><span class="no">2</span><h3>Situace</h3><p>Má klient byt, hypotéku a co s bytem zamýšlí? Podle toho se ukážou formuláře.</p><button class="btn" data-act="nav" data-v="prijmy">Nastavit</button></div>'
   +'<div class="step"><span class="no">3</span><h3>Varianty nového bytu</h3><p>Až 6 bytů ke srovnání. Výsledky se objeví hned po zadání ceny.</p><button class="btn" data-act="addVar">+ Přidat variantu</button></div></div>'
   +'<div class="empty">Tady se objeví karty variant a srovnání se stávajícím stavem</div></div>';
}

/* ---------- sankey helpery ---------- */
function saleSankey(r,w,h){
  const S_=r.S,nodes=[],links=[];
  nodes.push({id:'p',col:0,label:'Odhadní cena',color:COL.pmt});
  const missing=S_.net<0?-S_.net:0;
  if(missing>0)nodes.push({id:'m',col:0,label:'Chybí',hatch:true,neg:true});
  const out=[['c','Provize '+NF2.format(+r.S.comm/(r.S.price||1)*100)+' %',S_.comm,'#8c939d'],['n','Náklady prodeje',S_.costs,'#8c939d'],['t','Daň 15 %',S_.tax,'#b4bac2'],['d','Splacení hypotéky',S_.payoff,COL.pmt]];
  out.forEach(o=>{if(o[2]>0)nodes.push({id:o[0],col:1,label:o[1],color:o[3]});});
  if(S_.net>0)nodes.push({id:'y',col:1,label:'Čistý výtěžek',color:COL.pro});
  out.forEach(o=>{if(o[2]>0)links.push({s:'p',t:o[0],v:o[2],color:o[3]});});
  if(S_.net>0)links.push({s:'p',t:'y',v:S_.net,color:COL.pro});
  if(missing>0)links.push({s:'m',t:'d',v:missing,hatch:true});
  // odhadní cena nemůže odtéct víc než vstoupilo: zdroj p = cena, takže ostatní toky se omezí
  if(missing>0){const tot=out.reduce((s,o)=>s+(o[2]>0?o[2]:0),0);const fixed=links.filter(l=>l.s==='p');const sc=S_.price/(tot||1);if(tot>S_.price+missing+1)fixed.forEach(l=>l.v*=sc);else{const l=links.find(x=>x.s==='p'&&x.t==='d');if(l)l.v=S_.payoff-missing;}}
  nodes.forEach(n=>{if(n.id==='m')n.text=NF.format(Math.round(missing));});
  return Charts.sankey({width:w,height:h,ml:w>700?200:168,mr:w>700?210:178,nodes,links,aria:'Rozpad prodeje stávajícího bytu'});
}
function financeSankey(v,r,w,h){
  const T=r.T,nodes=[],links=[];
  const src=[['sr','Úspory na rekonstrukci',num(cur().variants[v.idx].savReno),COL.sav],['sm','Úspory na snížení hypotéky',num(cur().variants[v.idx].savMort),COL.sav],['sp','Výtěžek z prodeje',v.proceeds,COL.pro],['sh','Hypotéka',v.mortgage,COL.mor]];
  src.forEach(s=>{if(s[2]>0){nodes.push({id:s[0],col:0,label:s[1],color:s[3]});links.push({s:s[0],t:'need',v:s[2],color:s[3]});}});
  nodes.push({id:'need',col:1,label:'Potřeba celkem',color:'#3b4048'});
  [['up','Kupní cena',v.price,'#8c939d'],['ua','Náklady na pořízení',v.acq,'#b4bac2'],['ur','Rekonstrukce',v.reno,COL.reno]].forEach(u=>{if(u[2]>0){nodes.push({id:u[0],col:2,label:u[1],color:u[3]});links.push({s:'need',t:u[0],v:u[2],color:u[3]});}});
  return {svg:Charts.sankey({width:w,height:h,ml:260,mr:260,nodes,links,aria:'Jak se pořízení financuje: '+v.name}),nodes,links};
}
function incomeSankey(c,r,w,h){
  const nodes=[],links=[];
  c.incomes.forEach((it,i)=>{if(num(it.amount)>0){nodes.push({id:'i'+i,col:0,label:it.label||'Příjem',color:'#3b4048'});links.push({s:'i'+i,t:'inc',v:num(it.amount),color:'#8c939d'});}});
  const free=r.income-r.expTotal-r.housingNow-(r.T.buy?0:0);
  nodes.push({id:'inc',col:1,label:'Příjem',color:'#101215'});
  const T=r.T;
  const uses=[];
  if(T.flat){uses.push(['u1',T.mort?'Splátka hypotéky':'',r.pmtUsed,COL.pmt],['u2','Pojištění hypotéky',r.mIns,COL.ins],['u3','Provoz bytu',r.flatOps,COL.ops]);}
  uses.push(['u4','Výdaje domácnosti',r.exp,COL.hh]);
  if(T.annual)uses.push(['u5','Roční výdaje ÷ 12',r.annualM,COL.ann]);
  uses.forEach(u=>{if(u[2]>0&&u[1]){nodes.push({id:u[0],col:2,label:u[1],color:u[3]});links.push({s:'inc',t:u[0],v:u[2],color:u[3]});}});
  if(free>=0&&free>0){nodes.push({id:'free',col:2,label:'Zbude',color:COL.pmt,text:NF.format(Math.round(free))});links.push({s:'inc',t:'free',v:free,color:'#0072B2'});}
  if(free<0){nodes.push({id:'miss',col:0,label:'Chybí',hatch:true,neg:true,text:NF.format(Math.round(-free))});links.push({s:'miss',t:'inc',v:-free,hatch:true});}
  return {svg:Charts.sankey({width:w,height:h,ml:190,mr:190,nodes,links,aria:'Kam jde příjem'}),nodes,links};
}

/* ---------- srovnání ---------- */
function compareRows(c,r){
  const T=r.T,V=r.V,rows=[];
  const dn=(f)=>f;
  const mk=(label,get,o)=>rows.push(Object.assign({label,get},o||{}));
  const grp=t=>rows.push({grp:t});
  grp('Pořízení');
  mk('Kupní cena',v=>v.price,{fmt:kn,dn:null});
  mk('Náklady na pořízení',v=>v.acq,{fmt:kn,best:'min'});
  mk('Rekonstrukce',v=>v.reno,{fmt:kn,best:'min'});
  mk('Potřeba celkem',v=>v.need,{fmt:kn,best:'min',tot:true,main:true});
  grp('Zdroje a hypotéka');
  mk('Z úspor',v=>v.savUsed,{fmt:kn});
  if(T.sell)mk('Z prodeje stávajícího bytu',v=>v.proceeds,{fmt:kn});
  mk('Nová hypotéka',v=>v.mortgage,{fmt:kn,best:'min',tot:true,main:true});
  mk('LTV',v=>v.ltv,{fmt:pct,best:'min',sub:'hypotéka / cena'});
  mk('Sazba · doba',v=>null,{fmt:null,text:v=>NF2.format(v.rate)+' % · '+v.years+' let'});
  grp('Měsíčně');
  mk('Splátka hypotéky',v=>v.pmt,{fmt:kn,best:'min',dn:T.mort?r.pmtUsed:null});
  mk('Pojištění hypotéky',v=>v.ins,{fmt:kn,best:'min',dn:T.mort?r.mIns:null});
  mk('Provoz bytu',v=>v.ops,{fmt:kn,best:'min',dn:T.flat?r.flatOps:null});
  if(T.flat&&!T.sell)mk(T.rent?'Starý byt po odečtu nájmu':'Starý byt (ponechaný)',v=>v.old,{fmt:kn,best:'min'});
  mk('Bydlení celkem',v=>v.total,{fmt:kn,best:'min',tot:true,main:true,dn:T.flat?r.housingNow:null});
  mk('Volné cashflow',v=>v.free,{fmt:kn,best:'max',tot:true,main:true,dn:T.flat?r.freeNow:r.income-r.expTotal});
  mk('Splátky / příjem',v=>v.dsti,{fmt:pct,best:'min',main:true,dn:T.mort?r.dstiNow:null});
  return rows;
}
function compareTable(c,r,pres){
  const V=r.V;if(!V.length)return '<div class="empty" style="min-height:200px">Zatím žádná varianta ke srovnání.</div>';
  const rows=compareRows(c,r).filter(x=>x.grp||!UI.srovMain||x.main);
  let h='<table class="tbl"><thead><tr><th><span class="mut4" style="font-weight:500">Měsíční částky v Kč</span></th><th class="dn"><small>Reference</small>Dnes</th>'+V.map((v,i)=>'<th><small>Varianta '+(i+1)+'</small>'+esc(v.name)+'</th>').join('')+'</tr></thead><tbody>';
  rows.forEach(row=>{
    if(row.grp){if(!UI.srovMain)h+='<tr class="grp"><td colspan="'+(V.length+2)+'">'+row.grp+'</td></tr>';return;}
    const vals=V.map(v=>row.get(v));const bs=row.best?D.bestSet(vals,row.best):new Set();
    h+='<tr'+(row.tot?' class="tot"':'')+'><td>'+row.label+(row.sub?' <small>'+row.sub+'</small>':'')+'</td>';
    h+='<td class="dn'+(row.dn==null?' na':'')+'">'+(row.dn==null?'—':(row.fmt===pct?pct(row.dn):kn(row.dn)))+'</td>';
    V.forEach((v,i)=>{const t=row.text?row.text(v):(vals[i]==null?'—':row.fmt(vals[i]));h+='<td>'+(bs.has(i)?'<span class="bv">'+t+'</span>':t)+'</td>';});
    h+='</tr>';
  });
  return h+'</tbody></table>';
}
function viewSrovnani(c,r){
  const V=r.V,canAdd=V.length<Store.MAXV&&r.T.buy;
  return '<div class="page"><div class="head"><div class="t"><h1 class="h1 m">Srovnání variant</h1><span class="sub">'+esc(c.name)+(r.T.sell?' · čistý výtěžek z prodeje '+kc(r.proceeds)+' jde do každé varianty':' · částky v Kč měsíčně, pokud není uvedeno jinak')+'</span></div>'
   +'<span class="legs" style="font-size:13px"><span><i class="sw" style="background:var(--accl);border-radius:4px;color:var(--acc);display:inline-grid;place-items:center;width:20px;height:20px;font-size:9px">◆</i>nejlepší v řádku</span></span>'
   +seg('srovMain',[['all','Všechny řádky'],['main','Jen hlavní']],UI.srovMain?'main':'all','lg')
   +(canAdd?'<button class="btn" data-act="addVar">+ Přidat variantu</button>':'<button class="btn dis" disabled>Maximum '+Store.MAXV+' variant</button>')+'</div>'
   +'<div class="card" style="padding:0;overflow:auto">'+compareTable(c,r)+'</div></div>';
}

/* ---------- grafy ---------- */
function chartCard(key,title,graf,tab,extra){
  const mode=UI.charts[key]||'graf';
  return '<div class="card ch"><div class="rowb"><h2>'+title+'</h2><div class="row">'+(extra||'')+seg('chartMode',[['graf','Graf'],['tab','Tabulka']],mode,'',' data-key="'+key+'"')+'</div></div>'+(mode==='graf'?graf:tab)+'</div>';
}
function viewGrafy(c,r,pres){
  const T=r.T,V=r.V;
  if(!V.length)return '<div class="page"><div class="head"><div class="t"><h1 class="h1 m">Grafy</h1></div></div><div class="empty">Přidejte aspoň jednu variantu, grafy se ukážou hned.</div></div>';
  const items=[];
  if(T.flat)items.push({label:'Dnes',dashed:true,parts:[{v:r.pmtUsed,color:COL.pmt,name:'Splátka'},{v:r.mIns,color:COL.ins,name:'Pojištění',dark:true},{v:r.flatOps,color:COL.ops,name:'Provoz'}],total:r.housingNow});
  V.forEach(v=>{const parts=[{v:v.pmt,color:COL.pmt,name:'Splátka'},{v:v.ins,color:COL.ins,name:'Pojištění',dark:true},{v:v.ops,color:COL.ops,name:'Provoz'}];if(T.flat&&!T.sell)parts.push({v:v.old,color:COL.old,name:'Starý byt po nájmu'});items.push({label:v.name,parts,total:v.total});});
  const leg=[['Splátka',COL.pmt],['Pojištění',COL.ins],['Provoz',COL.ops]];if(T.flat&&!T.sell)leg.push(['Starý byt po nájmu',COL.old]);
  const tblMonthly='<div class="twrap"><table class="tbl sm"><thead><tr><th></th>'+items.map(i=>'<th>'+esc(i.label)+'</th>').join('')+'</tr></thead><tbody>'
    +leg.map((l,li)=>'<tr><td>'+l[0]+'</td>'+items.map(i=>'<td>'+(i.parts[li]?KB.kc(i.parts[li].v):'—')+'</td>').join('')+'</tr>').join('')+'<tr class="tot"><td>Bydlení celkem</td>'+items.map(i=>'<td>'+kc(i.total)+'</td>').join('')+'</tr></tbody></table></div>';
  const today=D.summary(c,r).todayFree;
  const bi=D.bestSet(V.map(v=>v.free),'max');
  const rowsH=[{label:'Dnes',v:today,color:'#9fb6d6',bold:true,today:true}].concat(V.map((v,i)=>({label:v.name,v:v.free,best:bi.has(i)})));
  const hb=Charts.hbars(rowsH,{today})+'<div class="mut" style="font-size:12.5px;margin-top:8px">Přerušovaná svislá čára = dnešní stav. ◆ nejvíc zbude, ▼ záporné cashflow.</div>';
  const tblFree='<div class="twrap"><table class="tbl sm"><thead><tr><th></th><th>Zbude měsíčně</th><th>Proti dnešku</th></tr></thead><tbody><tr><td>Dnes</td><td>'+kc(today)+'</td><td>—</td></tr>'+V.map(v=>'<tr><td>'+esc(v.name)+'</td><td>'+(v.free<0?'▼ ':'')+kc(v.free)+'</td><td>'+kcd(v.free-today)+'</td></tr>').join('')+'</tbody></table></div>';
  const gv=Math.min(UI.grafVar,V.length-1);const v=Object.assign({idx:gv},V[gv]);
  const fs=financeSankey(v,r,1700,280);
  const sel=V.length>1?seg('grafVar',V.map((x,i)=>[i,x.name]),gv,''):'';
  const note=T.flat?(T.sell?'Dnes = stávající byt před prodejem':'splátka stávající hypotéky '+(r.useFix?'po refixaci':'dnes')):'';
  const dnesTxt=T.flat?'':'';
  return '<div class="page"><div class="head"><div class="t"><h1 class="h1 m">Grafy</h1><span class="sub">'+esc(c.name)+' · tisíce Kč měsíčně'+(note?', '+note:'')+'</span></div>'+(pres?'':'<span class="exp" title="Připravujeme">Export PNG / PDF · připravujeme</span>')+'</div>'
   +'<div style="display:grid;grid-template-columns:'+(pres?'1fr':'1.15fr 1fr')+';gap:16px">'
   +chartCard('cost','Měsíční náklady na bydlení',Charts.stackedCols(items,leg),tblMonthly)
   +chartCard('free','Kolik měsíčně zbude',hb,tblFree)
   +'</div>'
   +chartCard('fin','Jak se pořízení financuje',fs.svg,Charts.flowTable({nodes:fs.nodes,links:fs.links}),sel)+'</div>';
}

/* ---------- scénáře ---------- */
function viewScenare(c,r){
  const vi=Math.min(UI.scenVar,c.variants.length-1);
  const sc=D.scenarios(c,vi),list=sc.list;
  if(!list.length)return '<div class="page"><div class="head"><div class="t"><h1 class="h1 m">Scénáře</h1></div></div><div class="empty">Scénáře se ukážou, když má klient stávající byt a aspoň jednu variantu.</div></div>';
  const todayFree=sc.today.freeNow;
  const bi=D.bestSet(list.map(s=>s.free),'max');
  const mxTot=Math.max(1,...list.map(s=>s.total));
  const f=c.flat,m=f.mort;
  const eb=esc(c.name)+' · stávající byt '+kc(f.est)+(r.T.mort?', hypotéka '+kc(m.balance):'')+(r.T.fix?', fixace končí za '+(+f.fix.months||0)+' '+pl(+f.fix.months||0,'měsíc','měsíce','měsíců'):'');
  let cards=list.map((s,i)=>{
    const cl=bi.has(i)?' best':'';
    const rows=s.parts.map(p=>[p[0],p[1],COL[p[2]]]);
    const w=s.total/mxTot*100;
    const pills=[s.ltv!=null?tag('LTV '+pct(s.ltv),s.ltv>0.9?'r':s.ltv>0.8?'w':''):tag('Bez nové hypotéky'),s.dsti!=null?tag('Splátky '+pct(s.dsti)+' příjmu',s.dsti>0.5?'w':''):''];
    if(s.ltv!=null&&s.ltv>0.8)pills[0]=tag((s.ltv>0.9?'■ ':'▲ ')+'LTV '+pct(s.ltv),s.ltv>0.9?'r':'w');
    return '<div class="vcard'+cl+'" style="cursor:default"><div class="toprow"><span class="lbl">Scénář '+s.id+'</span>'+(bi.has(i)?'<span class="pill a">◆ Nejvíc zbude</span>':'')+'</div>'
      +'<div><div class="ttl">'+s.title+'</div><div class="mut" style="font-size:13.5px;margin-top:4px;min-height:40px">'+esc(D.scenarioText(s,c,s.r))+'</div></div>'
      +'<div><div class="mut" style="font-size:14px">Zbude měsíčně</div><div class="big'+(s.free<0?' neg':'')+'" style="font-size:38px;'+(bi.has(i)?'color:var(--accd)':s.free<0?'color:var(--risk)':'')+'">'+(s.free<0?'▼ ':'')+kc(s.free)+'</div><div class="mut" style="font-size:13.5px;margin-top:2px">'+kcd(s.free-todayFree)+' proti dnešku</div><div class="yr"><span>Ročně zbude <small>(12 × měsíčně)</small></span><b class="'+(s.free<0?'neg':'')+'">'+(s.free<0?'▼ ':'')+kc(s.free*12)+'</b></div></div><hr>'
      +'<div class="rowb"><span class="mut" style="font-size:14px">Bydlení měsíčně</span><b style="font-size:20px;font-weight:650">'+kc(s.total)+'</b></div><div style="width:'+w.toFixed(1)+'%">'+stackBar(rows)+'</div>'+legendRows(rows)
      +'<div class="pills" style="margin-top:auto">'+pills.join('')+'</div></div>';
  }).join('');
  const rowsDef=[['Nová hypotéka',s=>s.rows.newMort,'min',v=>v==null?'—':kc(v)],
    ['Stávající hypotéka',s=>null,null,null],
    ['Čistý nájem měsíčně',s=>s.rows.rent,null,v=>v==null?'—':kc(v)],
    ['Zbylé úspory',s=>s.rows.savLeft,'max',kc],
    ['Dluh celkem',s=>s.rows.debt,'min',kc],
    ['Nemovitosti − dluhy',s=>s.rows.net,'max',kc]];
  let tb='<table class="tbl"><thead><tr><th><span class="mut4" style="font-weight:500">Majetek a závazky</span></th>'+list.map(s=>'<th><small>Scénář '+s.id+'</small></th>').join('')+'</tr></thead><tbody>';
  rowsDef.forEach(rw=>{
    if(rw[0]==='Stávající hypotéka'){tb+='<tr><td>'+rw[0]+'</td>'+list.map(s=>{const o=s.rows.oldMort;return '<td>'+(o==null?'—':typeof o==='string'?o:kc(o.bal)+' · '+NF2.format(o.rate)+' %')+'</td>';}).join('')+'</tr>';return;}
    const vals=list.map(rw[1]);const bs=rw[2]?D.bestSet(vals,rw[2]):new Set();
    tb+='<tr><td>'+rw[0]+'</td>'+vals.map((v,i)=>'<td>'+(bs.has(i)?'<span class="bv">'+rw[3](v)+'</span>':rw[3](v))+'</td>').join('')+'</tr>';
  });
  tb+='</tbody></table><p class="mut4" style="font-size:12.5px;padding:10px 24px 16px;border-top:1px solid var(--row)">Nemovitosti podle odhadní a kupní ceny, bez rekonstrukce. Scénáře 1–3 počítají s novým bytem '+esc(sc.variant.name)+'.</p>';
  const yrs=UI.scenYears||5,tl=D.timeline(sc,yrs);
  const SC={1:['#0072B2','d'],2:['#E69F00','t'],3:['#CC79A7','s'],4:['#009E73','v']};
  const tlSeries=tl.series.map(x=>({label:x.name,color:SC[x.id][0],shape:SC[x.id][1],pts:x.pts})).concat([{label:'Dnes',color:'#8c939d',dash:true,pts:tl.base.pts}]);
  const tlGraf='<div class="mut" style="font-size:13px;margin:4px 0 6px">Součet toho, co klientovi po všech výdajích zbyde. Do konce fixace platí dnešní splátka, potom podle scénáře. Čárkovaně dnešní stav beze změny.</div>'+Charts.lines({width:1700,height:250,months:tl.months,years:yrs,series:tlSeries,mark:tl.k?{x:tl.k,label:'konec fixace'}:null});
  const tlTab='<div class="twrap"><table class="tbl sm"><thead><tr><th></th>'+tl.series.map(x=>'<th>'+x.name+'</th>').join('')+'<th>Dnes</th></tr></thead><tbody><tr><td>Měsíčně (po fixaci)</td>'+tl.series.map(x=>'<td>'+kc(x.monthly.after)+'</td>').join('')+'<td>'+kc(tl.base.monthly.after)+'</td></tr>'
    +Array.from({length:yrs},(_,i)=>'<tr><td>Za '+(i+1)+' '+(i===0?'rok':i<4?'roky':'let')+'</td>'+tl.series.map(x=>'<td>'+kc(x.yearEnd[i])+'</td>').join('')+'<td>'+kc(tl.base.yearEnd[i])+'</td></tr>').join('')+'</tbody></table></div>';
  const tlCard=chartCard('scenTime','Kolik klientovi zbude v čase',tlGraf,tlTab,seg('scenYears',[[3,'3 roky'],[5,'5 let'],[10,'10 let']],yrs));
  return '<div class="page"><div class="head"><div class="t"><span class="eyebrow">'+eb+'</span><h1 class="h1 m" style="font-size:38px">Co udělat se stávajícím bytem</h1></div>'
   +(c.variants.length>1?'<div class="row"><span class="mut" style="font-size:14px">Nový byt</span>'+seg('scenVar',c.variants.map((v,i)=>[i,v.name]),vi,'lg')+'</div>':'')
   +'<div class="tile" style="background:var(--dnes);text-align:right;padding:12px 20px"><small>Dnes zbývá</small><b>'+kc(todayFree)+'</b></div></div>'
   +tlCard+'<div class="cards" style="grid-template-columns:repeat('+list.length+',minmax(0,1fr))">'+cards+'</div><div class="card" style="padding:0">'+tb+'</div></div>';
}

/* ---------- stávající byt ---------- */
function toggleCard(title,act,on,inner,extra){
  return '<div class="card fc"><div class="hd"><b>'+title+'</b>'+(extra||'')+(act?tg(act,on,title):'')+'</div>'+(on||!act?inner:'')+'</div>';
}
function flatCards(c,r){
  const T=r.T,f=c.flat;
  const opsC='<div class="card fc"><div class="hd"><b>Hodnota a provoz</b><span class="sum">'+kc(r.flatOps)+' / měs.</span></div><div class="g2">'+fld('Odhadní cena',numInp('flat.est','Kč',{aria:'Odhadní cena'}))+fld('Pořizovací cena',numInp('flat.purchase','Kč',{aria:'Pořizovací cena'}))+'</div>'
    +'<div class="sec">Provozní náklady · Kč měsíčně</div>'+itemList('flat.ops')+'</div>';
  const mortC='<div class="card fc"><div class="hd"><b>Hypotéka</b>'+tg('tMort',c.t.mort,'Stávající hypotéka')+'</div>'+(c.t.mort?'<div class="g4">'+fld('Zůstatek',numInp('flat.mort.balance','Kč',{aria:'Zůstatek'}))+fld('Sazba',numInp('flat.mort.rate','%',{kind:'dec',aria:'Sazba'}))+fld('Zbývá',numInp('flat.mort.months','měs.',{aria:'Zbývá měsíců'}))+fld('Pojištění',numInp('flat.mort.ins','Kč',{aria:'Pojištění'}))+'</div>':'')+'</div>';
  const fixC=c.t.mort?'<div class="card fc"><div class="hd"><b>Konec fixace</b>'+tg('tFix',c.t.fix,'Konec fixace')+'</div>'+(c.t.fix?'<div class="g2">'+fld('Fixace končí za',numInp('flat.fix.months','měsíců',{aria:'Fixace končí za'}))+fld('Očekávaná nová sazba',numInp('flat.fix.rate','%',{kind:'dec',aria:'Očekávaná nová sazba'}))+'</div>':'')+'</div>':'';
  let useC='';
  if(T.rent)useC='<div class="card fc"><div class="hd"><b>Pronájem</b></div><div class="g3">'+fld('Nájemné',numInp('flat.rent.rent','Kč/měs.',{aria:'Nájemné'}))+fld('Neobsazenost',numInp('flat.rent.vac','%',{kind:'dec',aria:'Neobsazenost'}))+fld('Opravy a údržba',numInp('flat.rent.repairs','Kč/rok',{aria:'Opravy a údržba'}))+'</div></div>';
  if(T.sell)useC='<div class="card fc"><div class="hd"><b>Prodej</b></div><div class="g3">'+fld('Provize',numInp('flat.sale.comm','%',{kind:'dec',aria:'Provize'}))+fld('Náklady prodeje',numInp('flat.sale.costs','Kč',{aria:'Náklady prodeje'}))+fld('Osvobozeno od daně',seg('exempt',[['1','Ano'],['0','Ne']],f.sale.exempt?'1':'0','lg'))+'</div></div>';
  return {opsC,mortC,fixC,useC};
}
function viewByt(c,r){
  const T=r.T,f=c.flat,P=r.P;
  const usage=T.sell?'sell':T.rent?'rent':'none';
  const head='<div class="head"><div class="t"><h1 class="h1 m">Stávající byt</h1><span class="sub">Odhadní cena '+kc(f.est)+' · koupen za '+kc(f.purchase)+'</span></div><div class="row"><span class="mut" style="font-size:14px">Co s bytem po přestěhování</span>'+seg('usage',[['none','Ponechat prázdný'],['sell','Prodat'],['rent','Pronajímat']],usage,'lg')+'</div></div>';
  const {opsC,mortC,fixC,useC}=flatCards(c,r);
  const left='<div class="stk">'+opsC+mortC+fixC+useC+'</div>';
  // pravá strana
  let right='';
  if(T.mort){
    const diff=r.pmtFix-r.pmtNow;
    right+='<div class="card fc"><div class="hd"><b style="font-size:19px">Stávající hypotéka</b>'+(T.fix?'<span class="row"><span class="mut" style="font-size:13px">Ve srovnání použít</span>'+seg('useRefix',[['0','Dnešní splátku'],['1','Splátku po refixaci']],c.useRefix?'1':'0')+'</span>':'')+'</div>'
      +'<div class="g4"><div class="tile"><small>Splátka dnes</small><b>'+kc(r.pmtNow)+'</b><span>sazba '+NF2.format(+f.mort.rate||0)+' %</span></div>'
      +(T.fix?'<div class="tile"><small>Zůstatek na konci fixace</small><b>'+kc(r.balFix)+'</b><span>za '+r.k+' '+pl(r.k,'měsíc','měsíce','měsíců')+'</span></div><div class="tile"><small>Splátka po refixaci</small><b>'+kc(r.pmtFix)+'</b><span>nová sazba '+NF2.format(+f.fix.rate||0)+' %</span></div>'
        +'<div class="tile '+(diff>0.5?'w':'')+'"><small>Změna splátky</small><b>'+(diff>0.5?'▲ ':diff<-0.5?'▼ ':'')+kcd(diff).replace('±','')+'</b><span>měsíčně</span></div>':'<div class="tile" style="grid-column:span 3"><small>Konec fixace</small><b style="font-size:17px">Nezadáno</b><span>Zapněte „Konec fixace“ vlevo</span></div>')+'</div></div>';
  }else right+='<div class="card"><h2>Stávající hypotéka</h2><p class="mut" style="margin-top:8px">Byt je bez hypotéky. Zapněte „Hypotéka“ vlevo, pokud má klient úvěr.</p></div>';
  if(T.rent){
    const cols=['A','B','C'],names={A:'A · Paušál',B:'B · Skutečné výdaje',C:'C · Výdaje + odpisy'};
    const cell=(x,key,neg)=>'<td'+(P.sel===x?' class="u"':'')+'>'+(key==null?'<span class="zz">—</span>':(neg?'−':'')+NF.format(Math.round(key)))+'</td>';
    const rowsT=[['Nájemné za rok (12 × '+NF.format(num(f.rent.rent))+')',[P.gross,P.gross,P.gross],false],['− Neobsazenost '+NF2.format(+f.rent.vac||0)+' %',[P.vacLoss,P.vacLoss,P.vacLoss],true],['= Příjem z nájmu',[P.inc,P.inc,P.inc],false,'s'],
      ['− Paušální výdaje 30 %'+(P.inc*0.3>600000?' (strop 600 000)':''),[P.expA,null,null],true],['− Provoz bytu za rok',[null,P.opsY,P.opsY],true],['− Opravy a údržba',[null,P.rep,P.rep],true],['− Úroky z hypotéky (odhad)',[null,P.int,P.int],true],['− Odpisy 3,4 % z pořizovací ceny',[null,null,P.dep],true],
      ['= Základ daně',[P.baseA,P.baseB,P.baseC],false,'s'],['Daň 15 %',[P.taxA,P.taxB,P.taxC],false,'s']];
    let tb='<table class="tx"><colgroup><col class="c0"><col><col><col></colgroup><thead><tr><th></th>'+cols.map(x=>'<th'+(P.sel===x?' class="u"':'')+'>'+names[x]+(P.sel===x?'<small>použito</small>':P.best===x?'<small>◆ nejnižší daň</small>':'')+'</th>').join('')+'</tr></thead><tbody>';
    rowsT.forEach(rw=>{tb+='<tr'+(rw[3]?' class="s"':'')+'><td>'+esc(rw[0])+'</td>'+rw[1].map((v,i)=>{const x=cols[i];const isTax=rw[0]==='Daň 15 %';const b=isTax&&P.best===x&&D.bestSet([P.taxA,P.taxB,P.taxC],'min').size>0;return '<td'+(P.sel===x?' class="u"':'')+(v==null?' class="zz"':'')+'>'+(v==null?'—':b?'<span class="bv">'+NF.format(Math.round(v))+'</span>':(rw[2]&&v>0?'−':'')+NF.format(Math.round(v)))+'</td>';}).join('')+'</tr>';});
    tb+='</tbody></table>';
    const diffTax=P.tax-P['tax'+P.best];
    right+='<div class="card fc"><div class="hd"><b style="font-size:19px">Pronájem: daň krok za krokem</b><span class="row"><span class="mut" style="font-size:13px">Použít</span>'+seg('taxsel',[['A','A'],['B','B'],['C','C']],P.sel)+'</span></div>'+tb
      +'<div class="g3"><div class="tile"><small>Daň ročně · varianta '+P.sel+'</small><b>'+kc(P.tax)+'</b><span>'+(diffTax>0.5?'varianta '+P.best+' vychází o '+kc(diffTax)+' nižší':'nejnižší z variant')+'</span></div><div class="tile"><small>Čistý příjem z nájmu</small><b>'+kc(P.netM)+' / měs.</b><span>po neobsazenosti, provozu, opravách a dani</span></div><div class="tile"><small>Starý byt po odečtu nájmu</small><b>'+kc(r.oldNet)+' / měs.</b><span>splátka + pojištění + provoz − čistý nájem</span></div></div></div>';
  }
  if(T.sell){
    const S_=r.S;
    right+='<div class="card fc"><div class="hd"><b style="font-size:19px">Prodej: rozpad ceny</b></div>'+saleSankey(r,900,280)
      +'<hr><div class="rowb"><span><b>= Čistý výtěžek</b> <span class="mut" style="font-size:13px">'+(S_.net<0?'chybějící částku je nutné doplatit':'jde do nového bytu')+'</span></span><b class="'+(S_.net<0?'neg':'')+'" style="font-size:24px">'+(S_.net<0?'▼ ':'')+kc(S_.net)+'</b></div>'
      +'<div class="mut" style="font-size:13px">Zisk '+kc(S_.gain)+(f.sale.exempt?' je osvobozen od daně.':', daň 15 % ze zisku '+kc(S_.tax)+'.')+' Splácí se dnešní zůstatek hypotéky.</div></div>';
  }
  if(!T.rent&&!T.sell)right+='<div class="card"><h2>Byt zůstává prázdný</h2><p class="mut" style="margin-top:8px">Klient platí splátku, pojištění a provoz starého bytu '+kc(r.oldNet)+' měsíčně navíc k novému bydlení. Vyberte Prodat nebo Pronajímat, pokud to chce porovnat.</p></div>';
  return '<div class="page cap">'+head+'<div class="two">'+left+'<div class="stk">'+right+'</div></div></div>';
}

/* ---------- příjmy a výdaje ---------- */
function viewPrijmy(c,r){
  const T=r.T,t=c.t;
  const tr=(act,on,label,cls,hint)=>'<div class="trow '+(cls||'')+'">'+tg(act,on,label)+'<span>'+label+'</span>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</div>';
  const sit='<div class="card"><div class="rowb"><h2>Situace</h2><span class="mut" style="font-size:12.5px">mění, co se zadává a počítá</span></div><div style="margin-top:8px">'
    +tr('tFlat',t.flat,'Mám stávající byt')
    +(t.flat?tr('tMort',t.mort,'Stávající hypotéka','l1')+(t.mort?tr('tFix',t.fix,'Končí fixace','l2'):'')+tr('tSell',t.sell,'Prodat stávající byt','l1','vylučuje se s pronájmem')+tr('tRent',t.rent,'Pronajímat stávající byt','l1'):'')
    +tr('tBuy',t.buy,'Koupit nový byt')+tr('tAnnual',t.annual,'Roční jednorázové výdaje')+'</div></div>';
  const client='<div class="card fc"><b style="font-size:17px">Klient</b>'+fld('Jméno',txtInp('name',{aria:'Jméno klienta'}))
    +fld('Poznámka','<label class="inp ta"><textarea rows="2" data-f="note" data-k="text" aria-label="Poznámka">'+esc(c.note||'')+'</textarea></label>')+fld('Úspory k dispozici',numInp('savings','Kč',{aria:'Úspory k dispozici'}))
    +'<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="dupClient">Duplikovat klienta</button><button class="btn sm" data-act="exportOne">Exportovat klienta</button><button class="btn sm" data-act="delClient" style="color:var(--risk)">Smazat klienta</button></div></div>';
  const inc='<div class="card fc"><div class="hd"><b>Měsíční příjmy</b><span class="sum">'+kc(r.income)+'</span></div>'+itemList('incomes')+'</div>';
  const exp='<div class="card fc"><div class="hd"><b>Výdaje domácnosti</b><span class="sum">'+kc(r.exp)+' / měs.</span></div>'+itemList('expenses')+'</div>';
  const ann=t.annual?'<div class="card fc"><div class="hd"><b>Roční jednorázové výdaje</b><span class="sum">'+kc(r.annualY)+' / rok</span></div>'+itemList('annual')+'<div class="mut" style="font-size:13px">÷ 12 = '+kc(r.annualM)+' měsíčně, započítává se do výdajů</div></div>':'';
  const sk=incomeSankey(c,r,640,360);
  const flow='<div class="card"><div class="rowb"><h2>Kam jde příjem</h2><span class="mut" style="font-size:13px">Kč měsíčně · dnes</span></div><div style="margin-top:10px">'+(r.income>0?sk.svg:'<p class="mut">Zadejte příjem, diagram se ukáže hned.</p>')+'</div></div>';
  return '<div class="page cap"><div class="head"><div class="t"><h1 class="h1 m">Příjmy a výdaje</h1><span class="sub">Společné pro všechny varianty. Tab přeskakuje mezi částkami, názvy položek jsou přepsatelné.</span></div></div>'
   +'<div class="three"><div class="stk">'+client+sit+'</div><div class="stk">'+inc+exp+'</div><div class="stk">'+ann+flow+'</div></div></div>';
}

/* ---------- nápověda: schéma aplikace ---------- */
function helpSvg(){
  const box=(x,y,w,h,col,t,sub)=>'<g><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="#fff" stroke="'+col+'" stroke-width="2"/><rect x="'+x+'" y="'+y+'" width="7" height="'+h+'" rx="3" fill="'+col+'"/><text x="'+(x+20)+'" y="'+(y+25)+'" font-size="16" font-weight="650" fill="#1f2328">'+t+'</text>'+sub.map((l,i)=>'<text x="'+(x+20)+'" y="'+(y+45+i*17)+'" font-size="13" fill="#5b616b">'+l+'</text>').join('')+'</g>';
  const arr=(x1,y1,x2,y2,col)=>{const m=(x1+x2)/2;return '<path d="M'+x1+' '+y1+' C'+m+' '+y1+' '+m+' '+y2+' '+x2+' '+y2+'" fill="none" stroke="'+(col||'#9aa1ab')+'" stroke-width="2" marker-end="url(#ah)"/>';};
  const colH=(x,n,t)=>'<g><circle cx="'+(x+14)+'" cy="22" r="14" fill="#1f2328"/><text x="'+(x+14)+'" y="27" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">'+n+'</text><text x="'+(x+38)+'" y="28" font-size="17" font-weight="700" fill="#1f2328">'+t+'</text></g>';
  const B='#0072B2',G='#009E73',O='#E69F00',P='#CC79A7',K='#3b4048';
  const inY=[60,150,240,330,420];
  let g='<svg viewBox="0 0 1500 540" width="100%" role="img" aria-label="Schéma aplikace: zadání údajů, výpočet v prohlížeči, obrazovky s výsledky a předání klientovi" style="display:block"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9aa1ab"/></marker></defs>';
  g+=colH(10,1,'Zadáte')+colH(450,2,'Počítá se hned')+colH(830,3,'Vidíte')+colH(1200,4,'Předáte a uložíte');
  const ins=[['Klient','jméno, poznámka, úspory'],['Příjmy a výdaje','měsíční a roční položky'],['Situace','byt, hypotéka, fixace, prodej / pronájem'],['Stávající byt','hodnota, provoz, hypotéka, nájem nebo prodej'],['Varianty nového bytu','1 až 6: cena, rekonstrukce, úspory, hypotéka']];
  ins.forEach((x,i)=>{g+=box(10,inY[i],360,76,B,x[0],[x[1]]);g+=arr(370,inY[i]+38,450,270,B);});
  g+='<g><rect x="450" y="60" width="330" height="436" rx="18" fill="#f1f7fc" stroke="'+B+'" stroke-width="2"/><text x="474" y="92" font-size="17" font-weight="700" fill="#1f2328">Výpočet v prohlížeči</text>'
    +['Anuita a měsíční splátka','Zůstatek hypotéky a splátka po refixaci','LTV a poměr splátek k příjmu','Prodej: provize, náklady, daň ze zisku','Pronájem: daň ve variantách A, B, C','Čtyři scénáře co se stávajícím bytem','Kumulativní zbytek v čase'].map((l,i)=>'<text x="474" y="'+(130+i*36)+'" font-size="14" fill="#1f2328">• '+l+'</text>').join('')
    +'<text x="474" y="410" font-size="13" fill="#5b616b">Výsledky se přepočítají po každém</text><text x="474" y="428" font-size="13" fill="#5b616b">zadaném znaku, tlačítko Spočítat</text><text x="474" y="446" font-size="13" fill="#5b616b">není potřeba. Nic se neodesílá.</text></g>';
  const outs=[['Přehled','nejlepší varianta, Dnes vs. varianty','prehled'],['Scénáře','prodat · pronajímat · refinancovat','scenare'],['Srovnání','tabulka všech variant vedle sebe','srovnani'],['Grafy','splátky, financování, zbytek','grafy'],['Stávající byt','daně, prodej, hypotéka krok za krokem','byt']];
  const outY=[60,150,240,330,420];
  outs.forEach((x,i)=>{g+=box(830,outY[i],340,76,G,x[0],[x[1]]);g+=arr(780,270,830,outY[i]+38,G);});
  const last=[['Režim pro klienta','bez políček, jen výsledky k ukázání',K,60],['Export JSON','jeden klient nebo všichni',O,150],['Import ze zálohy','jen přidává, nic nepřepíše',O,240],['Uloženo v prohlížeči','localStorage, nikam se neposílá',P,330]];
  last.forEach(x=>{g+=box(1200,x[3],290,76,x[2],x[0],[x[1]]);g+=arr(1170,270,1200,x[3]+38,x[2]);});
  return g+'</svg>';
}
function helpMap(){
  const CX=750,CY=320;
  const br=[
   {side:'L',y:105,col:'#0072B2',t:'1 · Koho řešíme?',leaf:['Jméno a poznámka','Kolik doma vydělávají','Kolik měsíčně utratí a kolik mají našetřeno']},
   {side:'L',y:320,col:'#E69F00',t:'2 · Co už mají?',leaf:['Starý byt: kolik asi stojí','Dluh u banky (hypotéka) a úrok','Za jak dlouho končí pevný úrok']},
   {side:'L',y:535,col:'#CC79A7',t:'3 · Co chtějí koupit?',leaf:['Až 6 bytů ke srovnání','Cena, oprava, kolik si půjčit','Kolik dají z vlastních peněz']},
   {side:'R',y:105,col:'#009E73',t:'4 · Co se starým bytem?',leaf:['Prodat a peníze dát do nového','Pronajímat a počítat daň z nájmu','Nechat být nebo jen změnit úrok']},
   {side:'R',y:320,col:'#D55E00',t:'5 · Co z toho vyjde?',leaf:['Kolik měsíčně zbude (a za rok)','Která varianta je nejlepší','Kde hrozí potíže: ■ ▲ upozornění']},
   {side:'R',y:535,col:'#3b4048',t:'6 · Co dál?',leaf:['Ukázat klientovi bez políček','Uložit do souboru (záloha)','Data zůstávají jen v tomto počítači']}];
  let g='<svg viewBox="0 0 1500 640" width="100%" role="img" aria-label="Myšlenková mapa aplikace: koho řešíme, co už mají, co chtějí koupit, co se starým bytem, co z toho vyjde a co dál" style="display:block">';
  br.forEach(b=>{
    const L=b.side==='L',bx=L?380:910,bw=210,cx=L?bx+bw:bx,ex=L?CX-125:CX+125;
    g+='<path d="M'+ex+' '+CY+' C'+(ex+(L?-90:90))+' '+CY+' '+(cx+(L?90:-90))+' '+b.y+' '+cx+' '+b.y+'" fill="none" stroke="'+b.col+'" stroke-width="3.5" stroke-linecap="round"/>';
    b.leaf.forEach((l,i)=>{
      const ly=b.y-52+i*52,lx=L?10:1150,lw=340,jx=L?bx:bx+bw,tx=L?lx+lw:lx;
      g+='<path d="M'+jx+' '+b.y+' C'+(jx+(L?-25:25))+' '+b.y+' '+(tx+(L?25:-25))+' '+ly+' '+tx+' '+ly+'" fill="none" stroke="'+b.col+'" stroke-width="2" opacity=".7"/>'
        +'<rect x="'+lx+'" y="'+(ly-19)+'" width="'+lw+'" height="38" rx="19" fill="#fff" stroke="'+b.col+'" stroke-width="1.6"/><text x="'+(lx+lw/2)+'" y="'+(ly+5)+'" text-anchor="middle" font-size="14" fill="#1f2328">'+l+'</text>';
    });
    g+='<rect x="'+bx+'" y="'+(b.y-26)+'" width="'+bw+'" height="52" rx="26" fill="'+b.col+'"/><text x="'+(bx+bw/2)+'" y="'+(b.y+6)+'" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">'+b.t+'</text>';
  });
  g+='<ellipse cx="'+CX+'" cy="'+CY+'" rx="135" ry="78" fill="#1f2328"/><text x="'+CX+'" y="'+(CY-12)+'" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">Kalkulačka</text><text x="'+CX+'" y="'+(CY+12)+'" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">bydlení</text><text x="'+CX+'" y="'+(CY+38)+'" text-anchor="middle" font-size="13" fill="#d5d9df">Vyplatí se nový byt?</text>';
  return g+'</svg>';
}
function viewHelp(){
  const svg=helpSvg();
  const steps=[['Založte klienta','Na úvodní obrazovce „+ Nový klient“. Průvodce má čtyři kroky: klient a příjmy, výdaje, situace, varianty. Klient vznikne až na konci.'],['Nastavte situaci','Má klient stávající byt a hypotéku? Končí fixace? Co zamýšlí s bytem? Podle toho se zobrazí jen potřebné formuláře.'],['Zadejte varianty','Až 6 bytů. Stačí cena, ostatní má předvyplněné. Výsledky vidíte ihned v bočním panelu.'],['Začněte Přehledem','Ukáže, která varianta nechá klientovi nejvíc, a porovná ji s dneškem.'],['Projděte Scénáře','Prodat, pronajímat, nebo jen refinancovat. Karty mají i roční součet a graf v čase.'],['Ukažte klientovi','„Prezentovat klientovi“ skryje všechna pole. Pak exportujte JSON jako zálohu.']];
  const where=[['Přehled','Která varianta je nejlepší a jak se liší od dneška','vždy'],['Scénáře','Co se stávajícím bytem: prodat, pronajímat, refinancovat','stávající byt + nový byt + aspoň jedna varianta'],['Srovnání','Všechny varianty v jedné tabulce, nejlepší hodnota označená','vždy'],['Grafy','Splátky, financování, zbytek měsíčně','aspoň jedna varianta'],['Stávající byt','Hodnota, provoz, hypotéka, fixace, daň z pronájmu, prodej','pokud má klient byt'],['Příjmy a výdaje','Společné údaje pro všechny varianty, přepínače situace','vždy']];
  const know=[['Orientační výpočet','Není to nabídka banky. Čísla slouží k rozhovoru, ne ke smlouvě.'],['Fiktivní data','Do aplikace nezadávejte skutečné údaje klientů. Ukázkoví klienti jsou vymyšlení.'],['Daň z pronájmu','Varianty A, B, C jsou zjednodušený, neověřený model.'],['Pojištění hypotéky','Pevná, ručně zadaná částka, ne výpočet z rizik.'],['Značky','◆ nejlepší hodnota, ▲ pozor, ■ riziko, ▼ záporná nebo chybějící. Nikdy jen barva.'],['Data','Jen v tomto prohlížeči. Po smazání dat prohlížeče zmizí, proto zálohujte do JSON.']];
  const gloss=[['Hypotéka','Půjčka od banky na bydlení, splácí se každý měsíc.'],['Splátka','Kolik měsíčně klient zaplatí bance.'],['Úrok (sazba)','Cena půjčených peněz. Čím vyšší, tím dražší splátka.'],['Fixace','Doba, po kterou banka drží úrok pevný. Když skončí, nabídne nový.'],['Refinancování','Nastavení nového úroku po konci fixace. Splátka se může zvýšit nebo snížit.'],['LTV','Kolik procent ceny bytu tvoří dluh. Aplikace upozorní nad 80 % a ukáže riziko nad 90 %.'],['Splátky k příjmu','Kolik procent příjmu domácnosti jde na splátky.'],['Zbude měsíčně','Co zbyde z příjmu po zaplacení bydlení a běžných výdajů.'],['Čistý výtěžek','Co zbyde z prodeje starého bytu po splacení dluhu, provizi, nákladech a případné dani.'],['Daň z pronájmu','Varianty A, B, C jsou tři způsoby, jak ji spočítat. Aplikace ukáže, která vychází nejníž.']];
  return '<div class="page cap"><div class="head"><div class="t"><span class="eyebrow">Nápověda</span><h1 class="h1 m">Jak aplikace funguje</h1><span class="sub">Zadáte, co o klientovi víte, aplikace to hned přepočítá a ukáže, jestli se nový byt vyplatí. Nepotřebujete žádné znalosti IT.</span></div></div>'
   +'<div class="card"><div class="rowb"><h2>Aplikace na jedné stránce</h2><span class="mut" style="font-size:13.5px">Čtěte po šesti větvích: nejdřív vlevo shora dolů, potom vpravo</span></div><div style="margin-top:8px">'+helpMap()+'</div></div>'
   +'<div class="card"><div class="rowb"><h2>Schéma: co se děje s údaji</h2><span class="mut" style="font-size:13.5px">zadáte → aplikace spočítá → vidíte → předáte</span></div><div style="overflow:auto;margin-top:8px">'+svg+'</div></div>'
   +'<div class="two2"><div class="card fc"><h2>Doporučený postup</h2><ol class="hp">'+steps.map((x,i)=>'<li><span class="no">'+(i+1)+'</span><div><b>'+x[0]+'</b><p>'+x[1]+'</p></div></li>').join('')+'</ol></div>'
   +'<div class="stk"><div class="card fc"><h2>Kde co najdu</h2><table class="wh"><thead><tr><th>Záložka</th><th>Odpovídá na</th><th>Kdy je vidět</th></tr></thead><tbody>'+where.map(x=>'<tr><td><b>'+x[0]+'</b></td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>').join('')+'</tbody></table></div>'
   +'<div class="card fc"><h2>Slovníček jednoduše</h2><dl class="kn">'+gloss.map(x=>'<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>').join('')+'</dl></div>'
   +'<div class="card fc"><h2>Co je dobré vědět</h2><dl class="kn">'+know.map(x=>'<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>').join('')+'</dl></div></div></div></div>';
}
/* ---------- průvodce novým klientem ---------- */
const WSTEPS=[['Klient a příjmy','jméno, úspory, měsíční příjmy'],['Výdaje','měsíční a roční výdaje domácnosti'],['Situace a stávající byt','co klient má a co s tím zamýšlí'],['Varianty nového bytu','až '+Store.MAXV+' bytů ke srovnání']];
function wizHeader(){
  const st=UI.wiz.step;
  return '<header class="hdr wizh"><button class="logo" data-act="wizCancel" aria-label="Zrušit zakládání"><i>KB</i><span>Kalkulačka bydlení</span></button><b class="wt">Nový klient</b>'
   +'<nav class="wsteps" aria-label="Kroky">'+WSTEPS.map((x,i)=>'<button class="ws'+(i===st?' on':i<st?' done':'')+'" data-act="wizGo" data-s="'+i+'"'+(i===st?' aria-current="step"':'')+'><i>'+(i<st?'✓':i+1)+'</i><span>'+x[0]+'</span></button>').join('')+'</nav>'
   +'<div class="sp"></div><button class="btn" data-act="wizCancel">Zrušit</button></header>';
}
function wizLive(c,r){
  const nv=c.variants.length;
  return '<div class="wlive"><span><small>Příjem</small><b>'+(r.income>0?kc(r.income):'—')+'</b></span><span><small>Výdaje domácnosti</small><b>'+(r.exp>0?kc(r.exp):'—')+'</b></span><span><small>Úspory</small><b>'+(r.savings>0?kc(r.savings):'—')+'</b></span><span><small>Varianty</small><b>'+nv+' z '+Store.MAXV+'</b></span></div>';
}
function viewWiz(c,r){
  const st=UI.wiz.step,t=c.t,T=r.T;
  let body='',title=WSTEPS[st][0],sub='';
  if(st===0){
    sub='Vyplňte, co už víte. Cokoli můžete nechat prázdné a doplnit později.';
    body='<div class="three"><div class="stk"><div class="card fc"><b style="font-size:17px">Klient</b>'+fld('Jméno',txtInp('name',{aria:'Jméno klienta',ph:'např. Novákovi'}))
      +fld('Poznámka','<label class="inp ta"><textarea rows="2" data-f="note" data-k="text" aria-label="Poznámka">'+esc(c.note||'')+'</textarea></label>')+fld('Úspory k dispozici',numInp('savings','Kč',{aria:'Úspory k dispozici'}))+'</div></div>'
      +'<div class="stk"><div class="card fc"><div class="hd"><b>Měsíční příjmy</b><span class="sum">'+kc(r.income)+'</span></div>'+itemList('incomes')+'</div></div><div class="stk"></div></div>';
  }else if(st===1){
    sub='Názvy jsou předvyplněné a přepsatelné, stačí doplnit částky.';
    const ann=t.annual?'<div class="card fc"><div class="hd"><b>Roční jednorázové výdaje</b><span class="sum">'+kc(r.annualY)+' / rok</span></div>'+itemList('annual')+'<div class="mut" style="font-size:13px">÷ 12 = '+kc(r.annualM)+' měsíčně</div></div>':'';
    body='<div class="three"><div class="stk"><div class="card fc"><div class="hd"><b>Výdaje domácnosti</b><span class="sum">'+kc(r.exp)+' / měs.</span></div>'+itemList('expenses')+'</div></div>'
      +'<div class="stk"><div class="card"><div class="trow">'+tg('tAnnual',t.annual,'Roční jednorázové výdaje')+'<span>Roční jednorázové výdaje</span><span class="hint">pojištění, dovolená, poplatky…</span></div></div>'+ann+'<div class="card"><h2>Kam jde příjem</h2><div style="margin-top:10px">'+(r.income>0?incomeSankey(c,r,520,320).svg:'<p class="mut">Zadejte příjem v kroku 1, diagram se ukáže hned.</p>')+'</div></div></div></div>';
  }else if(st===2){
    sub='Podle toho se ukážou formuláře. Co klient nemá, vypněte.';
    const tr=(act,on,label,cls,hint)=>'<div class="trow '+(cls||'')+'">'+tg(act,on,label)+'<span>'+label+'</span>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</div>';
    const sit='<div class="card"><div class="rowb"><h2>Situace</h2></div><div style="margin-top:8px">'
      +tr('tFlat',t.flat,'Má stávající byt')
      +(t.flat?tr('tMort',t.mort,'Stávající hypotéka','l1')+(t.mort?tr('tFix',t.fix,'Končí fixace','l2'):'')+tr('tSell',t.sell,'Prodat stávající byt','l1','vylučuje se s pronájmem')+tr('tRent',t.rent,'Pronajímat stávající byt','l1'):'')
      +tr('tBuy',t.buy,'Koupit nový byt')+'</div></div>';
    if(t.flat){const fc=flatCards(c,r);body='<div class="three"><div class="stk">'+sit+fc.useC+(!t.sell&&!t.rent?'<div class="card"><h2>Byt zůstane prázdný</h2><p class="mut" style="margin-top:8px">Zapněte Prodat nebo Pronajímat, pokud to klient zvažuje.</p></div>':'')+'</div><div class="stk">'+fc.opsC+fc.mortC+fc.fixC+'</div></div>';}
    else body='<div class="three"><div class="stk">'+sit+'</div><div class="stk"><div class="card"><h2>Bez stávajícího bytu</h2><p class="mut" style="margin-top:8px">Klient nemá co prodat ani pronajmout. Pokračujte na varianty nového bytu.</p></div></div><div class="stk"></div></div>';
  }else{
    sub='Přidejte byty, které klient zvažuje. Výsledky se počítají hned po zadání ceny.';
    const n=c.variants.length,canAdd=n<Store.MAXV;
    const cards=r.V.map((v,i)=>'<button class="wvar" data-act="editVar" data-i="'+i+'"><span class="no">'+(i+1)+'</span><span class="i"><b>'+esc(v.name)+'</b><small>'+(c.variants[i].price>0?kc(c.variants[i].price)+' · hypotéka '+mil(v.mortgage):'cena zatím nezadána')+'</small></span>'+(c.variants[i].price>0?'<span class="r"><small>zbude měsíčně</small><b class="'+(v.free<0?'neg':'')+'">'+(v.free<0?'▼ ':'')+kc(v.free)+'</b></span>':'')+'<span class="ed">Upravit →</span></button>').join('');
    body='<div class="wvars">'+(cards||'<div class="card"><p class="mut">Zatím žádná varianta. Klienta lze založit i bez variant a byty doplnit později.</p></div>')
      +(canAdd?'<button class="addcard" data-act="addVar" style="min-height:96px"><span class="pl">+</span><b>Přidat variantu</b><span>'+n+' ze '+Store.MAXV+'</span></button>':'<div class="addcard dis"><b>Maximum '+Store.MAXV+' variant</b></div>')+'</div>';
  }
  const last=st===3;
  return '<div class="page wiz"><div class="head"><div class="t"><span class="eyebrow">Krok '+(st+1)+' ze 4</span><h1 class="h1 m">'+title+'</h1><span class="sub">'+sub+'</span></div>'+wizLive(c,r)+'</div>'+body
   +'<div class="wfoot"><button class="btn" data-act="wizBack"'+(st===0?' disabled':'')+'>← Zpět</button><span class="mut" style="font-size:13px">Klient se vytvoří až na konci. Do té doby se nic neukládá.</span><div class="sp"></div>'
   +(last?'':'<button class="btn" data-act="wizNext">Další →</button>')
   +'<button class="btn blk" data-act="wizFinish">'+(last?'Vytvořit klienta a ukázat přehled':'Dokončit a ukázat přehled')+'</button></div></div>';
}

/* ---------- boční panel varianty ---------- */
function acc(key,title,sumTxt,inner){
  const open=!UI.collapsed[key];
  return '<div class="acc"><button data-act="collapse" data-key="'+key+'" aria-expanded="'+open+'"><b>'+title+'</b><span>'+(sumTxt||'')+' '+(open?'▴':'▾')+'</span></button>'+(open?'<div>'+inner+'</div>':'')+'</div>';
}
function renderPanel(){
  const el=$('#panel'),c=cur();
  if(!c||!UI.panel.open||!c.variants[UI.panel.vi]){el.classList.remove('on');el.setAttribute('aria-hidden','true');return;}
  const r=compute(c),vi=UI.panel.vi,v=c.variants[vi],x=r.V[vi];
  const p='variants.'+vi+'.';
  const reno=v.reno.map((it,i)=>'<div class="fld"><span class="k"><span><input class="nm" tabindex="-1" style="width:100%;font-size:13px;color:var(--ink3);padding:0;border:0;background:transparent;outline:0" data-f="'+p+'reno.'+i+'.label" data-k="text" value="'+esc(it.label)+'" aria-label="Název položky rekonstrukce"></span></span>'+numInp(p+'reno.'+i+'.amount','Kč',{aria:it.label,panel:1})+'</div>').join('');
  const used=x.savUsed,over=used>r.savings;
  const years=[20,25,30];if(!years.includes(+v.years))years.push(+v.years);years.sort((a,b)=>a-b);
  const insTxt=x.ins+x.ops;
  const body='<div class="pb"><div class="rowb" style="align-items:center"><span class="lbl">Varianta '+(vi+1)+' z '+c.variants.length+'</span><span class="row" style="gap:6px"><button class="btn sm" data-act="dupVar" '+(c.variants.length>=Store.MAXV?'disabled':'')+'>Duplikovat</button><button class="btn sm" data-act="delVar" style="color:var(--risk)">Odebrat</button><button class="x" style="width:32px;height:32px;font-size:20px" data-act="closePanel" aria-label="Zavřít panel">×</button></span></div>'
   +txtInp(p+'name',{big:1,ph:'Název varianty',aria:'Název varianty'})
   +(c.variants.length>1?seg('panelVar',c.variants.map((q,i)=>[i,'Varianta '+(i+1)]),vi,''):'')
   +acc('price','Cena',kc(v.price)+' + '+kc(v.acq),'<div class="g2">'+fld('Kupní cena',numInp(p+'price','Kč',{aria:'Kupní cena',panel:1}))+fld('Náklady na pořízení',numInp(p+'acq','Kč',{aria:'Náklady na pořízení',panel:1}))+'</div>')
   +acc('reno','Rekonstrukce',kc(x.reno),'<div class="ren">'+reno+'</div><button class="add" data-act="addReno">+ Přidat položku</button>')
   +acc('fin','Financování','hypotéka '+mil(x.mortgage),'<div class="g2">'+fld('Z úspor na rekonstrukci',numInp(p+'savReno','Kč',{aria:'Z úspor na rekonstrukci',panel:1}))+fld('Z úspor na snížení hypotéky',numInp(p+'savMort','Kč',{aria:'Z úspor na snížení hypotéky',panel:1}))+'</div>'
     +'<div><div class="rowb" style="font-size:13px"><span class="mut">Čerpání úspor</span><b class="'+(over?'neg':'')+'">'+(over?'▲ ':'')+kc(used)+' z '+kc(r.savings)+'</b></div><div class="use'+(over?' over':'')+'" style="margin-top:6px" role="img" aria-label="Čerpání úspor"><i style="width:'+Math.min(100,r.savings>0?used/r.savings*100:(used>0?100:0)).toFixed(1)+'%"></i></div></div>'
     +(r.T.sell&&x.proceeds>0?'<div class="mut" style="font-size:13px">Z prodeje stávajícího bytu jde do hypotéky '+kc(x.proceeds)+'.</div>':'')
     +'<div class="g2">'+fld('Sazba',numInp(p+'rate','%',{kind:'dec',aria:'Sazba',panel:1}))+fld('Doba',seg('years',years.map(y=>[y,y+' let']),+v.years,'lg'))+'</div>')
   +acc('ins','Pojištění a provoz',kc(insTxt)+' / měs.','<div class="g2">'+fld('Pojištění hypotéky'+(r.T.flat&&!r.T.sell?' (starý byt prodán / žádný)':''),numInp(p+'insSold','Kč',{aria:'Pojištění hypotéky',panel:1}))+(r.T.flat&&!r.T.sell?fld('Pojištění při ponechání starého bytu',numInp(p+'insKept','Kč',{aria:'Pojištění při ponechání bytu',panel:1})):'')+'</div>'
     +'<div class="ren">'+v.ops.map((it,i)=>'<div class="fld"><span class="k">'+esc(it.label)+'</span>'+numInp(p+'ops.'+i+'.amount','Kč',{aria:it.label,panel:1})+'</div>').join('')+'</div>')
   +'</div>';
  const foot='<div class="pf"><div class="live"><small>Živě · zbude měsíčně</small><b class="'+(x.free<0?'neg':'')+'">'+(x.free<0?'▼ ':'')+kc(x.free)+'</b></div><div class="kv"><span>Bydlení</span><b>'+kc(x.total)+'</b></div><div class="kv"><span>LTV</span><b>'+pct(x.ltv)+'</b></div><div class="sp"></div><button class="btn blk" data-act="closePanel">Hotovo</button></div>';
  el.innerHTML=body+foot;el.classList.add('on');el.setAttribute('aria-hidden','false');
}

/* ---------- dropdown klientů a modály ---------- */
function renderDD(){
  const el=$('#dd'),c=cur();
  $('#scrim').classList.toggle('on',UI.dd);
  el.classList.toggle('on',UI.dd);
  if(!UI.dd)return;
  const q=UI.ddQ.trim().toLowerCase();
  const list=S.clients.slice().sort((a,b)=>b.updated-a.updated).filter(x=>!q||(x.name+' '+x.note).toLowerCase().includes(q));
  const old=bkOld(),d=days();
  el.innerHTML='<div class="s"><input class="search" id="ddq" data-f="ddq" placeholder="Hledat klienta…" value="'+esc(UI.ddQ)+'" aria-label="Hledat klienta" autocomplete="off"></div>'
   +'<div class="meta"><span>Klienti · '+S.clients.length+'</span><i>seřazeno podle poslední úpravy</i></div><div class="list" role="listbox">'
   +(list.map(x=>{const r=compute(x),n=x.variants.length,cn=D.counts(r.W),tot=r.W.length;
     return '<button class="li'+(x.id===c.id?' on':'')+'" role="option" aria-selected="'+(x.id===c.id)+'" data-act="open" data-id="'+x.id+'"><span class="av lg '+(x.id===c.id?'on':'g')+'">'+esc(D.initials(x.name))+'</span><div><b>'+esc(x.name)+'</b><small>'+(D.isEmpty(x,r)?'nevyplněno':n+' '+pl(n,'varianta','varianty','variant')+' · '+D.situation(x,r))+' · '+(x.id===c.id?rel(x.updated):relShort(x.updated))+'</small></div>'+(tot?(cn.risk?'<span class="pill r">■ '+tot+' '+pl(tot,'upozornění','upozornění','upozornění')+'</span>':'<span class="pill w">▲ '+tot+' '+pl(tot,'upozornění','upozornění','upozornění')+'</span>'):'')+'</button>';}).join('')||'<p class="mut" style="padding:14px">Nikdo nenalezen.</p>')
   +'</div><div class="ft"><div class="r2"><button class="btn blk" data-act="newClient">+ Nový klient</button><button class="btn" data-act="dupClient">Duplikovat '+esc(c.name)+'</button></div>'
   +'<div class="ls"><button class="lnk" data-act="importOpen">Importovat…</button><button class="lnk" data-act="backup">Exportovat všechny</button><button class="mut" data-act="restoreSamples" style="font-weight:500;font-size:13px">Obnovit ukázková data</button></div></div>'
   +'<div class="bkw'+(old?'':' ok')+'">'+(old?'<b>▲ Poslední záloha '+(d==null?'nikdy':'před '+d+' dny')+'.</b> ':'')+'Data jsou jen v tomto prohlížeči, záloha je jediná ochrana.</div>';
}
function renderModal(){
  const el=$('#dlg'),m=UI.modal;
  el.classList.toggle('on',!!m);
  if(!m){el.innerHTML='';return;}
  const c=cur();
  if(m.type==='import'){
    const res=UI.importRes;
    let msg='';
    if(res&&!res.ok)msg='<div class="errb" role="alert"><h3>■ '+esc(res.error)+'</h3><span class="mut" style="font-size:13px">'+esc(res.file||'')+(res.count!=null?' · '+res.count+' '+pl(res.count,'klient','klienti','klientů')+' v souboru':'')+'</span><ul>'+res.details.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ul><p>Zkontrolujte, že jde o nezměněný soubor z exportu. Ruční úpravy JSON mohou zálohu poškodit.</p></div>';
    if(res&&res.ok)msg='<div class="okb" role="status">✓ Importováno: '+res.added.map(a=>esc(a.name)).join(', ')+'. Stávající klienti zůstali beze změny.</div>';
    el.innerHTML='<div class="m" role="dialog" aria-modal="true" aria-label="Import ze zálohy"><div class="hd"><h2>Import ze zálohy</h2><button class="cl" data-act="closeModal" aria-label="Zavřít">×</button></div><p style="color:var(--ink2)">Soubor JSON exportovaný z Kalkulačky bydlení, jeden klient nebo všichni. Importovaní klienti se přidají k současným, nic se nepřepíše.</p>'
     +'<div class="drop" id="drop"><b>Přetáhněte soubor sem</b><span class="mut" style="font-size:14px">nebo <button class="lnk" data-act="pickFile">vyberte z počítače</button></span><input type="file" id="file" accept=".json,application/json" class="sr" tabindex="-1"></div>'+msg
     +'<div class="acts"><button class="btn" data-act="closeModal">Zavřít</button>'+(res&&!res.ok?'<button class="btn blk" data-act="pickFile">Vybrat jiný soubor</button>':'')+'</div></div>';
  }else if(m.type==='delete'){
    el.innerHTML='<div class="m" role="dialog" aria-modal="true" aria-label="Smazat natrvalo"><div class="hd"><h2>Smazat natrvalo</h2><button class="cl" data-act="closeModal" aria-label="Zavřít">×</button></div><p style="color:var(--ink2)">Klient <b>'+esc(c.name)+'</b> se smaže z tohoto prohlížeče a nejde vrátit. Doporučujeme nejdřív exportovat.</p><div class="acts"><button class="btn" data-act="exportOne">Exportovat klienta</button><button class="btn" data-act="closeModal">Zrušit</button><button class="btn red" data-act="delConfirm">Smazat natrvalo</button></div></div>';
  }else if(m.type==='wizcancel'){
    el.innerHTML='<div class="m" role="dialog" aria-modal="true" aria-label="Zrušit zakládání klienta"><div class="hd"><h2>Zrušit zakládání klienta?</h2><button class="cl" data-act="closeModal" aria-label="Zavřít">×</button></div><p style="color:var(--ink2)">Zatím zadané údaje se zahodí, klient se nevytvoří.</p><div class="acts"><button class="btn" data-act="closeModal">Pokračovat ve vyplňování</button><button class="btn blk" data-act="wizDiscard" style="background:var(--risk)">Zahodit a zrušit</button></div></div>';
  }else if(m.type==='restore'){
    el.innerHTML='<div class="m" role="dialog" aria-modal="true" aria-label="Obnovit ukázková data"><div class="hd"><h2>Obnovit ukázková data</h2><button class="cl" data-act="closeModal" aria-label="Zavřít">×</button></div><p style="color:var(--ink2)">Ukázkoví klienti se vrátí do původního stavu, vaše úpravy v nich se ztratí. Klienti, které jste založili nebo importovali, zůstanou.</p><div class="acts"><button class="btn" data-act="closeModal">Zrušit</button><button class="btn blk" data-act="restoreConfirm">Obnovit ukázky</button></div></div>';
  }
}

/* ---------- režim pro klienta ---------- */
function presentHeader(c){
  return '<header class="hdr"><span class="logo"><i>KB</i>'+esc(c.name)+' · srovnání bydlení</span><div class="sp"></div>'+seg('presTab',[['prehled','Přehled'],['grafy','Grafy'],['tabulka','Tabulka']],UI.presTab,'lg')+'<button class="btn" data-act="endPresent">Ukončit prezentaci</button></header>'
   +'<div class="note"><b>Orientační výpočet, ne nabídka banky.</b><span>Daň z pronájmu je zjednodušený model. Pojištění hypotéky je odhad.</span></div>';
}
function presentBody(c,r){
  const V=r.V,T=r.T,sm=D.summary(c,r);
  if(UI.presTab==='grafy')return viewGrafy(c,r,true);
  if(UI.presTab==='tabulka')return '<div class="page"><h1 class="h1" style="font-size:44px">Srovnání variant</h1><div class="card" style="padding:0;overflow:auto">'+compareTable(c,r,true)+'</div></div>';
  if(!V.length)return '<div class="page"><h1 class="h1">'+esc(c.name)+'</h1><p class="lead">Zatím není zadaná žádná varianta nového bytu.</p></div>';
  const bi=sm.best;
  const cards=(['x'].map(()=>'<div class="vcard dnes"><div class="ttl">Dnes</div><div><div class="lbl2">Bydlení měsíčně</div><div class="big">'+(T.flat?kc(r.housingNow):'—')+'</div></div><hr><div><div class="lbl2">Zbude měsíčně</div><div class="big">'+kc(sm.todayFree)+'</div><div class="mut" style="font-size:16px">dnešní stav</div></div></div>')).join('')
   +V.map((v,i)=>{const w=D.varWarn(v,r.savings),isB=i===bi&&V.length>1&&v.free>0;
     return '<div class="vcard'+(isB?' best':'')+'"><div class="toprow"><div class="ttl">'+esc(v.name)+'</div>'+(isB?'<span class="pill a">◆ Nejvíc zbude</span>':w.ltvTag==='r'?'<span class="pill r">■ LTV nad 90 %</span>':w.ltvTag==='w'?'<span class="pill w">▲ LTV nad 80 %</span>':'')+'</div><div><div class="lbl2">Bydlení měsíčně</div><div class="big">'+kc(v.total)+'</div></div><hr><div><div class="lbl2">Zbude měsíčně</div><div class="free'+(v.free<0?' neg':'')+'" style="'+(isB?'color:var(--accd)':v.free<0?'color:var(--risk)':'')+'">'+kc(v.free)+'</div><div class="mut" style="font-size:16px">'+kcd(v.free-sm.todayFree)+' proti dnešku</div></div></div>';}).join('');
  const bs=D.bestSet(V.map(v=>v.free),'max');
  const hb=Charts.hbars([{label:'Dnes',v:sm.todayFree,color:'#9fb6d6',bold:true,today:true}].concat(V.map((v,i)=>({label:v.name,v:v.free,best:bs.has(i)}))));
  return '<div class="page"><div><h1 class="h1">'+esc(sm.h1)+'</h1><p class="lead" style="margin-top:8px">'+sm.lead+'</p></div><div class="cards" style="grid-template-columns:repeat('+(V.length+1)+',minmax(0,1fr))">'+cards+'</div><div class="card" style="padding:36px 40px">'+hb+'</div></div>';
}

/* ---------- vykreslení ---------- */
function activeKey(){const a=document.activeElement;return a&&a.dataset&&a.dataset.f?{f:a.dataset.f,s:a.selectionStart,e:a.selectionEnd,top:window.scrollY}:null;}
function render(){
  const ak=activeKey();
  const c=cur();
  if(UI.panel.open&&(!c||!c.variants[UI.panel.vi]))UI.panel.open=false;
  const r=c?compute(c):null;
  const app=$('#app');
  document.body.classList.toggle('pres',UI.present);
  let html;
  if(UI.wiz){html=wizHeader()+NOTE+'<main id="view">'+viewWiz(c,r)+'</main>';}
  else if(UI.present&&c){html=presentHeader(c)+'<main id="view">'+presentBody(c,r)+'</main>';}
  else if(UI.view==='napoveda'){html=header(c,r)+NOTE+'<main id="view">'+viewHelp()+'</main>';}
  else if(UI.view==='home'||!c){html=header(c,r)+NOTE+'<main id="view">'+viewHome()+'</main>';}
  else{
    let view=UI.view;
    if(view==='byt'&&!r.T.flat)view='prehled';
    if(view==='scenare'&&!(r.T.flat&&r.T.buy&&c.variants.length))view='prehled';
    UI.view=view;
    const fn={prehled:viewPrehled,scenare:viewScenare,srovnani:viewSrovnani,grafy:viewGrafy,byt:viewByt,prijmy:viewPrijmy}[view];
    html=header(c,r)+NOTE+'<main id="view">'+fn(c,r)+'</main>';
  }
  UI.rendering=true;app.innerHTML=html;UI.rendering=false;
  UI.rendering=true;renderPanel();renderDD();renderModal();UI.rendering=false;
  document.title=(c&&UI.view!=='home'?c.name+' · ':'')+'Kalkulačka bydlení';
  if(ak){
    const el=document.querySelector('[data-f="'+ak.f+'"]');
    if(el){UI.restoring=true;el.focus({preventScroll:true});try{el.setSelectionRange(ak.s,ak.e);}catch(e){}UI.restoring=false;}
    window.scrollTo(0,ak.top);
  }
}

/* ---------- akce ---------- */
const A={};
function go(v){if(UI.wiz)return;UI.view=v;UI.dd=false;UI.panel.open=false;if(location.hash!=='#'+v)history.replaceState(null,'','#'+v);window.scrollTo(0,0);}
A.nav=t=>{go(t.dataset.v);};
A.help=()=>{if(UI.view==='napoveda'){go(UI.helpBack&&UI.helpBack!=='napoveda'?UI.helpBack:'home');}else{UI.helpBack=UI.view;go('napoveda');}};
A.open=t=>{S.activeId=t.dataset.id;UI.dd=false;UI.view='prehled';UI.panel.open=false;UI.scenVar=0;UI.grafVar=0;persist();history.replaceState(null,'','#prehled');window.scrollTo(0,0);};
A.dd=()=>{UI.dd=!UI.dd;UI.ddQ='';};
A.homeAll=()=>{UI.homeAll=true;};
A.newClient=()=>{UI.dd=false;UI.panel.open=false;UI.modal=null;UI.wiz={draft:mkClient({name:''}),step:0};window.scrollTo(0,0);};
A.wizGo=t=>{UI.wiz.step=+t.dataset.s;UI.panel.open=false;window.scrollTo(0,0);};
A.wizNext=()=>{UI.wiz.step=Math.min(3,UI.wiz.step+1);UI.panel.open=false;window.scrollTo(0,0);};
A.wizBack=()=>{UI.wiz.step=Math.max(0,UI.wiz.step-1);UI.panel.open=false;window.scrollTo(0,0);};
A.wizFinish=()=>{
  const d=UI.wiz.draft;if(!(d.name||'').trim())d.name='Nový klient';
  d.updated=Date.now();S.clients.unshift(d);S.activeId=d.id;S.changes=(S.changes||0)+1;
  UI.wiz=null;UI.panel.open=false;UI.view='prehled';UI.scenVar=0;UI.grafVar=0;history.replaceState(null,'','#prehled');window.scrollTo(0,0);persist();toast('Klient založen');
};
A.wizCancel=()=>{UI.modal={type:'wizcancel'};};
A.wizDiscard=()=>{UI.wiz=null;UI.modal=null;UI.panel.open=false;UI.view='home';history.replaceState(null,'','#home');window.scrollTo(0,0);toast('Zakládání klienta zrušeno');};
A.dupClient=()=>{const c=cur();const n=Store.duplicate(c);S.clients.unshift(n);S.activeId=n.id;S.changes=(S.changes||0)+1;UI.dd=false;UI.view='prehled';persist();toast('Klient zduplikován');};
A.delClient=()=>{UI.modal={type:'delete'};};
A.delConfirm=()=>{const c=cur();S.clients=S.clients.filter(x=>x.id!==c.id);UI.modal=null;S.changes=(S.changes||0)+1;if(!S.clients.length){const n=mkClient({name:'Nový klient'});S.clients.push(n);}S.activeId=S.clients[0].id;UI.view='home';persist();toast('Klient smazán');};
A.closeModal=()=>{UI.modal=null;UI.importRes=null;};
A.importOpen=()=>{UI.dd=false;UI.importRes=null;UI.modal={type:'import'};};
A.pickFile=()=>{const f=$('#file');if(f)f.click();};
A.restoreSamples=()=>{UI.dd=false;UI.modal={type:'restore'};};
A.restoreConfirm=()=>{Store.restoreSamples(S);UI.modal=null;S.changes=(S.changes||0)+1;persist();toast('Ukázková data obnovena');};
function download(name,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
A.exportOne=()=>{const c=cur();download(Store.fileNameOne(c),Store.exportPayload([c]));toast('Exportováno: '+c.name);};
A.backup=()=>{download(Store.fileNameAll(),Store.exportPayload(S.clients));S.lastBackup=Date.now();S.changes=0;persist();toast('Záloha všech klientů uložena');};
A.present=()=>{UI.present=true;UI.dd=false;UI.panel.open=false;UI.presTab='prehled';window.scrollTo(0,0);};
A.endPresent=()=>{UI.present=false;};
A.presTab=t=>{UI.presTab=t.dataset.v;};
A.srovMain=t=>{UI.srovMain=t.dataset.v==='main';};
A.chartMode=t=>{UI.charts[t.dataset.key]=t.dataset.v;};
A.grafVar=t=>{UI.grafVar=+t.dataset.v;};
A.scenYears=t=>{UI.scenYears=+t.dataset.v;};
A.scenVar=t=>{UI.scenVar=+t.dataset.v;};
A.collapse=t=>{const k=t.dataset.key;UI.collapsed[k]=!UI.collapsed[k];};
A.closePanel=()=>{UI.panel.open=false;};
A.editVar=t=>{UI.panel={open:true,vi:+t.dataset.i};};
A.panelVar=t=>{UI.panel.vi=+t.dataset.v;};
A.addVar=()=>{
  const c=cur();if(c.variants.length>=Store.MAXV)return;
  const base=c.variants[c.variants.length-1];
  const v=mkVar('Nová varianta '+(c.variants.length+1),0);
  if(base){v.rate=base.rate;v.years=base.years;}
  c.t.buy=true;c.variants.push(v);persist(true);if(!UI.wiz&&UI.view!=='prehled'&&UI.view!=='srovnani')go('prehled');UI.panel={open:true,vi:c.variants.length-1};
};
A.dupVar=()=>{const c=cur();if(c.variants.length>=Store.MAXV)return;c.variants.splice(UI.panel.vi+1,0,Store.dupVariant(c.variants[UI.panel.vi]));UI.panel.vi++;persist(true);};
A.delVar=()=>{const c=cur();c.variants.splice(UI.panel.vi,1);UI.panel.vi=Math.max(0,UI.panel.vi-1);if(!c.variants.length)UI.panel.open=false;UI.scenVar=0;UI.grafVar=0;persist(true);toast('Varianta odebrána');};
A.addReno=()=>{const v=cur().variants[UI.panel.vi];v.reno.push(L('Nová položka',0));persist(true);};
A.years=t=>{cur().variants[UI.panel.vi].years=+t.dataset.v;persist(true);};
A.addItem=t=>{getP(cur(),t.dataset.list).push(L('Nová položka',0));persist(true);};
A.delItem=t=>{getP(cur(),t.dataset.list).splice(+t.dataset.i,1);persist(true);};
A.tFlat=()=>{const c=cur();c.t.flat=!c.t.flat;if(!c.t.flat){c.t.sell=false;c.t.rent=false;}persist(true);};
A.tMort=()=>{const c=cur();c.t.mort=!c.t.mort;if(!c.t.mort)c.t.fix=false;persist(true);};
A.tFix=()=>{const c=cur();c.t.fix=!c.t.fix;persist(true);};
A.tSell=()=>{const c=cur();c.t.sell=!c.t.sell;if(c.t.sell)c.t.rent=false;persist(true);};
A.tRent=()=>{const c=cur();c.t.rent=!c.t.rent;if(c.t.rent)c.t.sell=false;persist(true);};
A.tBuy=()=>{const c=cur();c.t.buy=!c.t.buy;persist(true);};
A.tAnnual=()=>{const c=cur();c.t.annual=!c.t.annual;persist(true);};
A.usage=t=>{const c=cur(),v=t.dataset.v;c.t.sell=v==='sell';c.t.rent=v==='rent';persist(true);};
A.exempt=t=>{cur().flat.sale.exempt=t.dataset.v==='1';persist(true);};
A.taxsel=t=>{cur().flat.rent.tax=t.dataset.v;persist(true);};
A.useRefix=t=>{cur().useRefix=t.dataset.v==='1';persist(true);};

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');
  if(!t){
    if(UI.dd&&!e.target.closest('#dd')){UI.dd=false;render();}
    const hl=e.target.closest('a[href^="#"]');if(hl){e.preventDefault();const v=hl.getAttribute('href').slice(1);if(VIEWS.includes(v)){go(v);render();}}
    return;
  }
  if(t.disabled)return;
  const fn=A[t.dataset.act];if(!fn)return;
  e.preventDefault();
  if(t.dataset.act==='pickFile'){fn(t);return;}
  fn(t);render();
  if(t.dataset.act==='dd'&&UI.dd){const q=$('#ddq');if(q)q.focus();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(UI.modal){UI.modal=null;UI.importRes=null;}else if(UI.dd)UI.dd=false;else if(UI.panel.open)UI.panel.open=false;else if(UI.present)UI.present=false;else return;
    render();return;
  }
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.vcard[data-act]')){e.preventDefault();A.editVar(e.target);render();}
  if(e.key==='Enter'&&e.target.matches&&e.target.matches('.inp input')){e.target.blur();}
});
document.addEventListener('focusin',e=>{
  const el=e.target;if(!el.dataset||!el.dataset.f||UI.restoring)return;
  const f=el.dataset.f,k=el.dataset.k;
  if(k==='text'||f==='homeq'||f==='ddq')return;
  const c=cur(),v=num(getP(c,f));
  UI.editing={f,raw:v?fmtLive(String(v)):''};
  el.value=UI.editing.raw;el.classList.remove('z');
  setTimeout(()=>{try{el.select();}catch(_){}},0);
});
document.addEventListener('focusout',e=>{
  const el=e.target;if(!el.dataset||!el.dataset.f||UI.rendering)return;
  if(UI.editing&&UI.editing.f===el.dataset.f){
    UI.editing=null;
    const c=cur(),v=num(getP(c,el.dataset.f));
    el.value=fmtField(v,el.dataset.k);el.classList.toggle('z',!v);
  }
});
document.addEventListener('input',e=>{
  const el=e.target;if(!el.dataset||!el.dataset.f)return;
  const f=el.dataset.f,k=el.dataset.k;
  if(f==='homeq'){UI.homeQ=el.value;render();return;}
  if(f==='ddq'){UI.ddQ=el.value;renderDD();const q=$('#ddq');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length);}return;}
  const c=cur();
  if(k==='text'){setP(c,f,el.value);persist(true);render();return;}
  // číslo: držíme rozepsaný text, hodnotu parsujeme při každém znaku
  const before=el.value,pos=el.selectionStart==null?before.length:el.selectionStart;
  const digits=before.slice(0,pos).replace(/[^\d,.]/g,'').length;
  const raw=fmtLive(before);
  if(raw!==before){
    el.value=raw;let n=0,np=raw.length;
    if(digits===0)np=0;else for(let i=0;i<raw.length;i++){if(/[\d,]/.test(raw[i])&&++n===digits){np=i+1;break;}}
    try{el.setSelectionRange(np,np);}catch(_){}
  }
  UI.editing={f,raw};
  let v=parseNum(raw);
  if(k==='pct'||k==='dec'){v=Math.max(0,v);}
  else v=Math.round(v*100)/100;
  setP(c,f,v);persist(true);render();
});
/* import souboru */
function handleFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    let count=null;try{const d=JSON.parse(rd.result);count=Array.isArray(d)?d.length:Array.isArray(d.clients)?d.clients.length:1;}catch(_){}
    const res=Store.importText(S,String(rd.result));
    if(res.ok){UI.importRes=res;persist();UI.view='prehled';}
    else UI.importRes={ok:false,error:res.error,details:res.details,file:file.name,count};
    render();
  };
  rd.onerror=()=>{UI.importRes={ok:false,error:'Soubor se nepodařilo přečíst.',details:['Zkuste soubor vybrat znovu.'],file:file.name};render();};
  rd.readAsText(file);
}
document.addEventListener('change',e=>{if(e.target.id==='file'&&e.target.files[0])handleFile(e.target.files[0]);});
document.addEventListener('dragover',e=>{const d=e.target.closest&&e.target.closest('#drop');if(d){e.preventDefault();d.classList.add('hot');}});
document.addEventListener('dragleave',e=>{const d=e.target.closest&&e.target.closest('#drop');if(d)d.classList.remove('hot');});
document.addEventListener('drop',e=>{const d=e.target.closest&&e.target.closest('#drop');if(d){e.preventDefault();d.classList.remove('hot');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);}});
window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(VIEWS.includes(v)&&v!==UI.view){UI.view=v;render();}});
window.addEventListener('beforeunload',()=>{clearTimeout(saveT);Store.save(window.localStorage,S);});

(function init(){
  const v=location.hash.slice(1);
  if(VIEWS.includes(v)&&v!=='home')UI.view=v;
  render();
  if(loaded.recovered)toast('Uložená data byla poškozená, načetla se ukázková. Původní zůstala v localStorage.');
  window.__KB={S,UI,render,cur};
})();
})();

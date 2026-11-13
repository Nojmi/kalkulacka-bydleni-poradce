/* Grafy jako samostatné SVG/HTML bloky (bez knihoven). Barvy Okabe–Ito, nikdy jediný nositel informace. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model.js'));else root.Charts=factory(root.KB);})(typeof self!=='undefined'?self:this,function(KB){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={pmt:'#0072B2',ins:'#E69F00',ops:'#009E73',old:'#CC79A7',neg:'#D55E00',sav:'#009E73',pro:'#E69F00',mor:'#0072B2',hh:'#8c939d',ann:'#b4bac2',reno:'#CC79A7',dark:'#3b4048'};
const NF=KB.NF;
let uidn=0;

/* ---------- Sankey ----------
 opts: {width,height,ml,mr,nodeW,gap,nodes:[{id,col,label,value?,text?,color,hatch,neg}],links:[{s,t,v,color,hatch}],midLabel:'top'|'right'} */
function sankey(o){
  const W=o.width,H=o.height,nw=o.nodeW||12,gap=o.gap||12,ml=o.ml||0,mr=o.mr||0;
  const nodes=o.nodes.map(n=>Object.assign({in:0,out:0},n));
  const byId={};nodes.forEach(n=>byId[n.id]=n);
  const links=o.links.filter(l=>l.v>0&&byId[l.s]&&byId[l.t]).map(l=>Object.assign({},l));
  links.forEach(l=>{byId[l.s].out+=l.v;byId[l.t].in+=l.v;});
  nodes.forEach(n=>{n.val=Math.max(n.in,n.out,n.value||0);});
  const cols=[...new Set(nodes.map(n=>n.col))].sort((a,b)=>a-b);
  const colNodes=cols.map(c=>nodes.filter(n=>n.col===c));
  const innerH=H-24;
  let k=Infinity;
  colNodes.forEach(cn=>{const tot=cn.reduce((s,n)=>s+n.val,0);if(tot>0)k=Math.min(k,(innerH-gap*(cn.length-1))/tot);});
  if(!isFinite(k))k=1;
  const x0=ml,x1=W-mr-nw;
  colNodes.forEach((cn,ci)=>{
    cn.forEach(n=>{n.h=Math.max(4,n.val*k);n.x=cols.length===1?x0:x0+(x1-x0)*ci/Math.max(1,cols.length-1);});
    const tot=cn.reduce((s,n)=>s+n.h,0)+gap*(cn.length-1);let y=12+(innerH-tot)/2;
    cn.forEach(n=>{n.y=y;y+=n.h+gap;});
  });
  // pořadí toků kvůli minimu křížení
  nodes.forEach(n=>{n.so=0;n.to=0;});
  const outs=n=>links.filter(l=>l.s===n.id).sort((a,b)=>byId[a.t].y-byId[b.t].y);
  const ins=n=>links.filter(l=>l.t===n.id).sort((a,b)=>byId[a.s].y-byId[b.s].y);
  nodes.forEach(n=>{let off=0;outs(n).forEach(l=>{l.sy=n.y+off;off+=l.v*k;});});
  nodes.forEach(n=>{let off=0;ins(n).forEach(l=>{l.ty=n.y+off;off+=l.v*k;});});
  const id='h'+(++uidn);
  let s='<svg class="sk" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.aria||'Sankeyho diagram')+'" xmlns="http://www.w3.org/2000/svg">';
  s+='<defs><pattern id="'+id+'" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f0a46f"/><rect width="4" height="7" fill="#D55E00"/></pattern></defs>';
  links.forEach(l=>{
    const a=byId[l.s],b=byId[l.t],w=Math.max(1.5,l.v*k),xa=a.x+nw,xb=b.x,xm=(xa+xb)/2;
    const ya=l.sy+l.v*k/2,yb=l.ty+l.v*k/2;
    const stroke=l.hatch?'url(#'+id+')':(l.color||'#8c939d');
    s+='<path d="M'+xa+' '+ya.toFixed(1)+' C'+xm+' '+ya.toFixed(1)+' '+xm+' '+yb.toFixed(1)+' '+xb+' '+yb.toFixed(1)+'" fill="none" stroke="'+stroke+'" stroke-width="'+w.toFixed(1)+'" stroke-opacity="'+(l.hatch?.75:.3)+'"><title>'+esc(a.label+' → '+b.label+': '+NF.format(Math.round(l.v))+' Kč')+'</title></path>';
  });
  nodes.forEach(n=>{
    const fill=n.hatch?'url(#'+id+')':(n.color||'#3b4048');
    s+='<rect x="'+n.x+'" y="'+n.y.toFixed(1)+'" width="'+nw+'" height="'+n.h.toFixed(1)+'" rx="3" fill="'+fill+'"><title>'+esc(n.label+': '+NF.format(Math.round(n.val))+' Kč')+'</title></rect>';
  });
  // popisky: levý sloupec vlevo, pravý vpravo, prostřední nad uzlem
  const lab=(n,side)=>{
    const val=n.text!=null?n.text:NF.format(Math.round(n.val));
    return {n,side,txt:esc(n.label)+' <tspan class="v">'+esc(val)+'</tspan>'};
  };
  const L=[],R=[],M=[];
  nodes.forEach(n=>{const ci=cols.indexOf(n.col);if(cols.length>1&&ci===0)L.push(lab(n,'l'));else if(ci===cols.length-1&&cols.length>1)R.push(lab(n,'r'));else if(cols.length===1)R.push(lab(n,'r'));else M.push(lab(n,'m'));});
  const spread=(arr)=>{arr.sort((a,b)=>(a.n.y+a.n.h/2)-(b.n.y+b.n.h/2));let last=-1e9;arr.forEach(a=>{let y=a.n.y+a.n.h/2;if(y<last+15)y=last+15;a.y=y;last=y;});
    let over=(arr.length?arr[arr.length-1].y:0)-(H-6);if(over>0){let nxt=1e9;for(let i=arr.length-1;i>=0;i--){arr[i].y=Math.min(arr[i].y-Math.max(0,over),nxt-15);nxt=arr[i].y;}}};
  spread(L);spread(R);
  L.forEach(a=>{s+='<text x="'+(a.n.x-8)+'" y="'+(a.y+4).toFixed(1)+'" text-anchor="end"'+(a.n.neg?' class="neg"':'')+'>'+a.txt+'</text>';});
  R.forEach(a=>{s+='<text x="'+(a.n.x+nw+8)+'" y="'+(a.y+4).toFixed(1)+'"'+(a.n.neg?' class="neg"':'')+'>'+a.txt+'</text>';});
  M.forEach(a=>{s+='<text x="'+(a.n.x+nw/2)+'" y="'+(Math.max(10,a.n.y-8)).toFixed(1)+'" text-anchor="middle">'+a.txt+'</text>';});
  return s+'</svg>';
}
/* tabulková podoba toků (zdroj → cíl) */
function flowTable(o){
  const byId={};o.nodes.forEach(n=>byId[n.id]=n);
  let h='<div class="twrap"><table class="tbl sm"><thead><tr><th>Zdroj</th><th>Cíl</th><th>Částka</th></tr></thead><tbody>';
  o.links.filter(l=>l.v>0).forEach(l=>{h+='<tr><td>'+esc(byId[l.s].label)+'</td><td style="text-align:left">'+esc(byId[l.t].label)+'</td><td>'+KB.kc(l.v)+'</td></tr>';});
  return h+'</tbody></table></div>';
}
/* ---------- skládané sloupce (HTML) ---------- */
function stackedCols(items,legend){
  const max=Math.max(1,...items.map(i=>i.total));
  let h='<div class="legs">'+legend.map(l=>'<span><i class="sw" style="background:'+l[1]+'"></i>'+esc(l[0])+'</span>').join('')+'</div>';
  h+='<div class="cols">';
  items.forEach(it=>{
    const hp=(it.total/max*100*0.86).toFixed(2);
    h+='<div class="col"><span class="tot">'+KB.NF.format(Math.round(it.total))+'</span><div class="bar'+(it.dashed?' dash':'')+'" style="height:'+hp+'%">';
    it.parts.forEach(p=>{if(p.v<=0)return;const big=p.v/it.total*parseFloat(hp)/100*300>=16;
      h+='<div style="flex:'+p.v+' 0 0;background:'+p.color+';color:'+(p.dark?'#101215':'#fff')+'" title="'+esc(p.name+': '+KB.kc(p.v))+'">'+(big?KB.tis(p.v):'')+'</div>';});
    h+='</div></div>';
  });
  h+='</div><div class="cnames">'+items.map(it=>'<span>'+esc(it.label)+'</span>').join('')+'</div>';
  return h;
}
/* ---------- vodorovné pruhy (HTML) ---------- */
function hbars(rows,o){
  o=o||{};
  const vals=rows.map(r=>r.v),mx=Math.max(1,...vals,0),mn=Math.min(0,...vals),span=mx-mn||1;
  const pos=v=>((v-mn)/span*100);
  const zero=pos(0);
  let h='<div class="items" style="gap:14px">';
  let first=true;
  rows.forEach(r=>{
    const lab=first&&!r.today;if(lab)first=false;
    const a=r.v>=0?zero:pos(r.v),b=r.v>=0?pos(r.v):zero;
    const mark=r.best?'◆ ':(r.v<0?'▼ ':'');
    h+='<div class="hb'+(lab?' f':'')+'"><span class="nm"'+(r.bold?' style="font-weight:700;color:var(--ink)"':'')+'>'+esc(r.label)+'</span><div class="tr">'
      +(mn<0?'<span class="zero" style="left:'+zero.toFixed(2)+'%"></span>':'')
      +'<i class="'+(r.v<0?'neg':'')+'" style="left:'+a.toFixed(2)+'%;width:'+Math.max(.6,b-a).toFixed(2)+'%;'+(r.v<0?'':'background:'+(r.color||COL.pmt))+'"></i>'
      +(o.today!=null&&!r.today?'<span class="today" style="left:'+pos(o.today).toFixed(2)+'%"></span>':'')
      +'</div><b'+(r.v<0?' class="neg"':'')+'>'+mark+KB.kc(r.v)+'</b></div>';
  });
  return h+'</div>';
}
return {esc,COL,sankey,flowTable,stackedCols,hbars};
});

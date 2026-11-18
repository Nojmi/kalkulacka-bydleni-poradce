/* Ukládání do localStorage, export a import JSON. Bez serveru. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./model.js'));else root.Store=factory(root.KB);})(typeof self!=='undefined'?self:this,function(KB){
const MAXV=6;
/* načtení klienta z uložených dat: zachová id (na rozdíl od normalize, které id nahrazuje) */
function hydrate(c){
  const vs=(Array.isArray(c.variants)?c.variants:[]).slice(0,MAXV).map(v=>Object.assign(KB.mkVar(v.name||'Varianta',+v.price||0),v,{id:v.id||KB.uid()}));
  const n=KB.mkClient(Object.assign({},c,{variants:vs}));
  n.id=c.id||KB.uid();n.sample=!!c.sample;n.updated=+c.updated||Date.now();
  return n;
}
function seedState(){
  const s=KB.seed();s.changes=5;
  return s;
}
function load(storage){
  let raw=null;
  try{raw=storage&&storage.getItem(KB.KEY);}catch(e){}
  if(!raw)return {state:seedState(),fresh:true};
  try{
    const d=JSON.parse(raw);
    if(!d||!Array.isArray(d.clients))throw new Error('tvar');
    let clients=d.clients.map(hydrate);
    // starší verze ukázkových dat: ukázkoví klienti se nahradí novými, vlastní klienti zůstanou
    if((+d.seedV||0)<KB.SEED_V)clients=KB.samples().concat(clients.filter(c=>!c.sample));
    const activeId=clients.some(c=>c.id===d.activeId)?d.activeId:(clients[0]&&clients[0].id)||null;
    return {state:{clients,activeId,lastBackup:d.lastBackup||null,changes:+d.changes||0,seedV:KB.SEED_V},fresh:false};
  }catch(e){
    try{storage.setItem(KB.KEY+'-poskozena',raw);}catch(_){}
    return {state:seedState(),fresh:true,recovered:true};
  }
}
function save(storage,state){
  try{storage.setItem(KB.KEY,JSON.stringify(state));return true;}catch(e){return false;}
}
function exportPayload(clients){return {app:'kalkulacka-bydleni',version:1,exported:new Date().toISOString(),clients};}
const slug=s=>String(s||'klient').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'klient';
const dateStr=(d)=>{d=d||new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
const fileNameAll=(d)=>'kalkulacka-bydleni_vsichni-klienti_'+dateStr(d)+'.json';
const fileNameOne=(c,d)=>'kalkulacka-bydleni_'+slug(c.name)+'_'+dateStr(d)+'.json';
/* import: nic nepřepisuje, jen přidá nové klienty */
function importText(state,text){
  const v=KB.validate(text);
  if(v.error)return {ok:false,error:v.error,details:v.details};
  const add=v.list.map(KB.normalize);
  state.clients=state.clients.concat(add);
  state.activeId=add[0].id;
  state.changes=(state.changes||0)+add.length;
  return {ok:true,added:add};
}
function duplicate(c){
  const n=JSON.parse(JSON.stringify(c));
  n.id=KB.uid();n.name=c.name+' (kopie)';n.sample=false;n.updated=Date.now();
  n.variants.forEach(v=>v.id=KB.uid());
  return n;
}
function dupVariant(v){const n=JSON.parse(JSON.stringify(v));n.id=KB.uid();n.name=(v.name||'Varianta')+' (kopie)';return n;}
function restoreSamples(state){
  const keep=state.clients.filter(c=>!c.sample),s=KB.samples();
  state.clients=s.concat(keep);
  if(!state.clients.some(c=>c.id===state.activeId))state.activeId=state.clients[0].id;
}
function backupAge(state,now){if(!state.lastBackup)return null;return Math.floor(((now||Date.now())-state.lastBackup)/86400000);}
return {MAXV,hydrate,load,save,exportPayload,slug,dateStr,fileNameAll,fileNameOne,importText,duplicate,dupVariant,restoreSamples,backupAge,seedState};
});

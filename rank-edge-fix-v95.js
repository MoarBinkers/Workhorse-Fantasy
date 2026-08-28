// v95.2 — render Sleeper Rank and My EDGE from verified top-250 ADP without DOM observer loops.
(()=>{
  let byId=new Map();
  let byNamePos=new Map();
  let repairing=false;
  let scheduled=false;

  const activeFormat=()=>{
    try{return typeof window.DraftEdgeAdpFormat==='function'?String(window.DraftEdgeAdpFormat()||'ppr'):'ppr'}catch(_){return 'ppr'}
  };
  const nrm=v=>{
    try{return typeof norm==='function'?norm(v):String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}catch(_){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
  };
  const validEntry=e=>{
    if(!e||e.identityOnly!==false)return false;
    const rank=Number(e.rank);if(!Number.isFinite(rank)||rank<1||rank>250)return false;
    const fmt=String(e.format||'');
    return !fmt||fmt===activeFormat();
  };
  const keyFor=(name,pos)=>String(pos||'').toUpperCase()+'|'+nrm(name);

  function rebuild(){
    const ids=new Map(),names=new Map(),dupes=new Set();
    try{
      for(const [name,e] of Object.entries(market||{})){
        if(!validEntry(e))continue;
        const id=String(e.id||'');
        if(id)ids.set(id,e);
        const key=keyFor(name,e.pos);if(!key)continue;
        if(names.has(key))dupes.add(key);else names.set(key,e);
      }
    }catch(_){}
    dupes.forEach(k=>names.delete(k));
    byId=ids;byNamePos=names;
    return ids.size;
  }

  function resolve(p){
    if(!p)return null;
    const id=String(p.sleeperId||p.id||'');
    if(id){const hit=byId.get(id);if(hit)return hit}
    return byNamePos.get(keyFor(p.name,p.position||p.pos))||null;
  }

  const baseMarketFor=typeof marketFor==='function'?marketFor:null;
  marketFor=function(p){
    let hit=resolve(p);if(hit)return hit;
    rebuild();hit=resolve(p);if(hit)return hit;
    try{return baseMarketFor?baseMarketFor(p):null}catch(_){return null}
  };
  try{window.marketFor=marketFor}catch(_){}

  function setTextIfChanged(el,text){
    if(el&&el.textContent!==text)el.textContent=text;
  }
  function setEdgeClass(el,edge){
    if(!el)return;
    const shouldGood=edge>0,shouldBad=edge<0;
    if(el.classList.contains('good')!==shouldGood)el.classList.toggle('good',shouldGood);
    if(el.classList.contains('bad')!==shouldBad)el.classList.toggle('bad',shouldBad);
  }

  function repairRoot(id){
    const root=document.getElementById(id);if(!root||!Array.isArray(players))return {matched:0,total:0};
    let matched=0,total=0;
    for(const row of root.querySelectorAll('.player[data-index]')){
      const i=Number(row.dataset.index);if(!Number.isInteger(i))continue;
      const p=players[i];if(!p)continue;total++;
      const info=resolve(p);if(!info)continue;
      const rank=Number(info.rank);if(!Number.isFinite(rank)||rank<1||rank>250)continue;
      matched++;
      const metrics=[...row.children].filter(x=>x.classList?.contains('metric'));
      if(metrics.length<4)continue;
      setTextIfChanged(metrics[2]?.querySelector('.num'),'#'+rank);
      const edgeEl=metrics[3]?.querySelector('.edge')||metrics[3];
      const myRank=Number(p.overall);
      if(edgeEl&&Number.isFinite(myRank)&&myRank>0){
        const edge=rank-myRank;
        setTextIfChanged(edgeEl,(edge>0?'+':'')+edge);
        setEdgeClass(edgeEl,edge);
      }
    }
    return {matched,total};
  }

  function repairAll(){
    scheduled=false;
    if(repairing)return;
    repairing=true;
    try{
      rebuild();
      const rankings=repairRoot('rankList');
      const draft=document.getElementById('page-draft');
      if(draft?.classList.contains('active'))repairRoot('draftList');
      window.WorkhorseRankEdgeStatus={...rankings,format:activeFormat(),at:Date.now()};
    }finally{repairing=false}
  }
  function scheduleRepair(){
    if(scheduled)return;
    scheduled=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(repairAll);
    else setTimeout(repairAll,0);
  }

  function wrap(name){
    try{
      const base=eval(name);if(typeof base!=='function'||base.__whRankEdge952)return;
      const wrapped=function(){const out=base.apply(this,arguments);scheduleRepair();return out};
      wrapped.__whRankEdge952=true;
      eval(name+'=wrapped');
      try{window[name]=wrapped}catch(_){}
    }catch(_){}
  }

  rebuild();
  wrap('renderRankings');
  wrap('renderDraft');

  window.addEventListener('workhorse:central-adp-ready',scheduleRepair);
  window.addEventListener('workhorse:cloud-rankings-ready',scheduleRepair);
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('button,a,[data-page],[data-tab]');if(!el)return;
    const hint=[el.textContent,el.getAttribute('href'),el.dataset?.page,el.dataset?.tab,el.id].filter(Boolean).join(' ').toLowerCase();
    if(hint.includes('rank')||hint.includes('draft')||hint.includes('adp')||hint.includes('sleeper'))scheduleRepair();
  },true);

  // No MutationObserver here: the previous observer could self-trigger on text rewrites and lock the page.
  [0,250,900].forEach(ms=>setTimeout(scheduleRepair,ms));
  window.WorkhorseRepairRankEdge=scheduleRepair;
})();

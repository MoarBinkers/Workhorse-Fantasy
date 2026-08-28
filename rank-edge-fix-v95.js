// v95 — render Sleeper Rank and My EDGE from the verified top-250 feed using stable Sleeper IDs first.
(()=>{
  let byId=new Map();
  let byNamePos=new Map();
  let repairing=false;

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
        const key=keyFor(name,e.pos);
        if(!key)continue;
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
    const hit=byNamePos.get(keyFor(p.name,p.position||p.pos));
    return hit||null;
  }

  // Replace the fragile legacy matcher for true ADP rows. Saved Sleeper IDs are authoritative.
  const baseMarketFor=typeof marketFor==='function'?marketFor:null;
  marketFor=function(p){
    let hit=resolve(p);
    if(hit)return hit;
    // Market may have just refreshed between renders; rebuild once before falling back.
    rebuild();hit=resolve(p);
    if(hit)return hit;
    try{return baseMarketFor?baseMarketFor(p):null}catch(_){return null}
  };
  try{window.marketFor=marketFor}catch(_){}

  function repairRoot(id){
    const root=document.getElementById(id);if(!root||!Array.isArray(players))return {matched:0,total:0};
    rebuild();
    let matched=0,total=0;
    for(const row of root.querySelectorAll('.player[data-index]')){
      const i=Number(row.dataset.index);if(!Number.isInteger(i))continue;
      const p=players[i];if(!p)continue;total++;
      const info=resolve(p);if(!info)continue;
      const rank=Number(info.rank);if(!Number.isFinite(rank)||rank<1||rank>250)continue;
      matched++;

      const metrics=[...row.querySelectorAll(':scope > .metric')];
      if(metrics.length<4)continue;
      const sleeperNum=metrics[2]?.querySelector('.num');
      if(sleeperNum)sleeperNum.textContent='#'+rank;

      const edgeEl=metrics[3]?.querySelector('.edge')||metrics[3];
      const myRank=Number(p.overall);
      if(edgeEl&&Number.isFinite(myRank)&&myRank>0){
        const edge=rank-myRank;
        edgeEl.textContent=(edge>0?'+':'')+edge;
        edgeEl.classList.remove('good','bad');
        if(edge>0)edgeEl.classList.add('good');
        else if(edge<0)edgeEl.classList.add('bad');
      }
    }
    return {matched,total};
  }

  function repairAll(){
    if(repairing)return;repairing=true;
    try{
      const rankings=repairRoot('rankList');
      repairRoot('draftList');
      window.WorkhorseRankEdgeStatus={...rankings,format:activeFormat(),at:Date.now()};
    }finally{repairing=false}
  }

  function wrap(name){
    try{
      const base=eval(name);if(typeof base!=='function'||base.__whRankEdge95)return;
      const wrapped=function(){
        const out=base.apply(this,arguments);
        queueMicrotask(repairAll);
        return out;
      };
      wrapped.__whRankEdge95=true;
      eval(name+'=wrapped');
      try{window[name]=wrapped}catch(_){}
    }catch(_){}
  }

  rebuild();
  wrap('renderRankings');
  wrap('renderDraft');
  wrap('renderEverything');

  window.addEventListener('workhorse:central-adp-ready',()=>{rebuild();setTimeout(repairAll,0)});
  window.addEventListener('workhorse:cloud-rankings-ready',()=>setTimeout(repairAll,0));

  for(const id of ['rankList','draftList']){
    const root=document.getElementById(id);
    if(root&&typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{if(!repairing)queueMicrotask(repairAll)}).observe(root,{childList:true,subtree:true});
    }
  }

  [0,150,700,1800].forEach(ms=>setTimeout(repairAll,ms));
  window.WorkhorseRepairRankEdge=repairAll;
})();

// v96 — fix Sleeper Rank / My EDGE at the data lookup source with one cheap ID index; no DOM scanning or observers.
(()=>{
  let byId=new Map();
  let rebuilding=false;

  const activeFormat=()=>{
    try{return typeof window.DraftEdgeAdpFormat==='function'?String(window.DraftEdgeAdpFormat()||'ppr'):'ppr'}catch(_){return 'ppr'}
  };
  const valid=e=>{
    if(!e||e.identityOnly!==false)return false;
    const rank=Number(e.rank);if(!Number.isFinite(rank)||rank<1||rank>250)return false;
    const fmt=String(e.format||'');
    return !fmt||fmt===activeFormat();
  };

  function rebuild(){
    if(rebuilding)return;
    rebuilding=true;
    try{
      const next=new Map();
      for(const e of Object.values((typeof market!=='undefined'&&market)||{})){
        if(!valid(e))continue;
        const id=String(e.id||'');
        if(id)next.set(id,e);
      }
      byId=next;
    }catch(_){}finally{rebuilding=false}
  }

  const baseMarketFor=typeof marketFor==='function'?marketFor:null;
  marketFor=function(p){
    const id=String(p?.sleeperId||p?.id||'');
    if(id){
      const hit=byId.get(id);
      if(hit)return hit;
    }
    try{return baseMarketFor?baseMarketFor(p):null}catch(_){return null}
  };
  try{window.marketFor=marketFor}catch(_){}

  // Rebuild once before each real rankings render. This is only ~250 tiny entries,
  // and existing rankRow/edge logic then receives the correct Sleeper row naturally.
  try{
    const base=typeof renderRankings==='function'?renderRankings:null;
    if(base&&!base.__whSource96){
      renderRankings=function(){rebuild();return base.apply(this,arguments)};
      renderRankings.__whSource96=true;
      try{window.renderRankings=renderRankings}catch(_){}
    }
  }catch(_){}

  rebuild();
  try{if(typeof renderRankings==='function')renderRankings()}catch(_){}
  window.addEventListener('workhorse:central-adp-ready',()=>{
    rebuild();
    try{if(typeof renderRankings==='function')renderRankings()}catch(_){}
  });

  window.WorkhorseSleeperIdIndex={rebuild,get size(){return byId.size}};
})();

// v94 — hard-cap Sleeper Rankings / Current ADP to 250 players on every device, including stale caches.
(()=>{
  const MAX=250;
  const POOL_KEY='de_sleeper_pool';
  let capping=false;

  function topPool(arr){
    const rows=Array.isArray(arr)?arr.slice():[];
    try{
      rows.sort((a,b)=>{
        let ar=999999,br=999999;
        try{ar=Number(marketFor(a)?.rank)||999999}catch(_){}
        try{br=Number(marketFor(b)?.rank)||999999}catch(_){}
        return ar-br;
      });
    }catch(_){}
    return rows.slice(0,MAX);
  }

  function capStoredPool(){
    try{
      const raw=localStorage.getItem(POOL_KEY);if(!raw)return false;
      const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.length<=MAX)return false;
      localStorage.setItem(POOL_KEY,JSON.stringify(parsed.slice(0,MAX)));
      return true;
    }catch(_){return false}
  }

  function capRuntimePool(){
    try{
      if(!Array.isArray(sleeperPool)||sleeperPool.length<=MAX)return false;
      sleeperPool=topPool(sleeperPool);
      try{window.sleeperPool=sleeperPool}catch(_){}
      try{localStorage.setItem(POOL_KEY,JSON.stringify(sleeperPool))}catch(_){}
      return true;
    }catch(_){return false}
  }

  function capDom(){
    const root=document.getElementById('adpList');if(!root)return 0;
    const rows=[...root.querySelectorAll('.player.market,.player[data-market-player],.player')];
    if(rows.length<=MAX)return rows.length;
    rows.slice(MAX).forEach(el=>el.remove());
    return MAX;
  }

  function enforce(){
    if(capping)return;capping=true;
    try{capStoredPool();capRuntimePool();capDom()}finally{capping=false}
  }

  // Wrap the actual Sleeper rankings renderer so it never receives/keeps >250 rows.
  try{
    const base=typeof renderAdp==='function'?renderAdp:(typeof window.renderAdp==='function'?window.renderAdp:null);
    if(base&&!base.__wh250){
      const wrapped=function(){
        capRuntimePool();
        const out=base.apply(this,arguments);
        capDom();
        return out;
      };
      wrapped.__wh250=true;
      try{renderAdp=wrapped}catch(_){}
      try{window.renderAdp=wrapped}catch(_){}
    }
  }catch(_){}

  // Old browsers may already have a giant cached pool by the time this patch arrives.
  // Trim it immediately and again whenever fresh central ADP is applied/opened.
  enforce();
  window.addEventListener('workhorse:central-adp-ready',()=>setTimeout(enforce,0));
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a,[data-page],[data-tab]');if(!el)return;
    const hint=[el.textContent,el.getAttribute('href'),el.dataset?.page,el.dataset?.tab,el.id].filter(Boolean).join(' ').toLowerCase();
    if(hint.includes('adp')||hint.includes('sleeper'))setTimeout(enforce,0);
  },true);

  const root=document.getElementById('adpList');
  if(root&&typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(root.querySelectorAll('.player').length>MAX)capDom()}).observe(root,{childList:true,subtree:true});
  }

  window.WorkhorseSleeperRankCap={max:MAX,enforce};
})();

// v49.2 — one ADP Change source everywhere with scoped repaint observers.
(()=>{
  const HISTORY_KEY='de29_adp_history';
  let painting=false,scheduled=false;

  const numMove=v=>{
    const n=Number(v);
    return Number.isFinite(n)?n:0;
  };
  const moveView=n=>({
    text:n>0?'+'+n:String(n),
    cls:n>0?'up':n<0?'down':'flat'
  });

  function marketMoveFor(p){
    try{return numMove(marketFor(p)?.move)}catch(_){return 0}
  }

  function paintMove(el,n){
    if(!el)return;
    const v=moveView(n);
    if(el.textContent!==v.text)el.textContent=v.text;
    el.classList.add('move');
    el.classList.toggle('up',v.cls==='up');
    el.classList.toggle('down',v.cls==='down');
    el.classList.toggle('flat',v.cls==='flat');
  }

  function paintPersonalRows(rootId){
    const root=document.getElementById(rootId);if(!root||!Array.isArray(players))return;
    root.querySelectorAll('.player[data-index]').forEach(row=>{
      const i=Number(row.dataset.index);if(!Number.isInteger(i)||!players[i])return;
      const moves=row.querySelectorAll('.metric .move');
      if(!moves.length)return;
      paintMove(moves[moves.length-1],marketMoveFor(players[i]));
    });
  }

  function paintMarketRows(){
    const root=document.getElementById('adpList');if(!root)return;
    root.querySelectorAll('.player.market').forEach(row=>{
      const hit=row.querySelector('[data-market-player]');if(!hit)return;
      let name='';try{name=decodeURIComponent(hit.dataset.marketPlayer||'')}catch(_){name=hit.dataset.marketPlayer||''}
      if(!name)return;
      const moves=row.querySelectorAll('.metric .move');if(!moves.length)return;
      paintMove(moves[moves.length-1],marketMoveFor({name}));
    });
  }

  function paintHeaders(){
    document.querySelectorAll('.colheads > div,.stat > span').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(t==='ADP Move'||t==='Latest ADP Move')el.textContent='ADP Change';
    });
  }

  function paintStatus(){
    const el=document.getElementById('adpStatus');if(!el)return;
    const t=el.textContent||'';
    if(/moved in the latest .* update/i.test(t)||/No .* rank changes in the latest central update/i.test(t)){
      el.textContent='ADP Change keeps each player’s latest real Sleeper rank move until that player moves again.';
    }
  }

  function paintAll(){
    if(painting)return;painting=true;
    try{
      paintHeaders();
      paintPersonalRows('rankList');
      paintPersonalRows('draftList');
      paintMarketRows();
      paintStatus();
    }finally{painting=false}
  }
  function schedulePaint(){
    if(scheduled)return;scheduled=true;
    const run=()=>{scheduled=false;paintAll()};
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:180});
    else setTimeout(run,50);
  }

  // Collapse consecutive equal Sleeper ranks. Raw Supabase history can contain
  // snapshots where decimal ADP changed but the displayed ordinal rank did not.
  function collapseRankRuns(arr){
    if(!Array.isArray(arr))return arr;
    const out=[];
    for(const item of arr){
      const rank=Number(item?.rank);
      if(!Number.isFinite(rank))continue;
      if(!out.length||Number(out[out.length-1]?.rank)!==rank)out.push(item);
    }
    return out;
  }
  function collapseHistoryJson(value){
    try{
      const store=JSON.parse(value||'{}');
      if(!store||typeof store!=='object'||Array.isArray(store))return value;
      for(const k of Object.keys(store))if(Array.isArray(store[k]))store[k]=collapseRankRuns(store[k]);
      return JSON.stringify(store);
    }catch(_){return value}
  }

  async function withCollapsedHistory(fn,args,ctx){
    const proto=Storage.prototype,baseSet=proto.setItem;
    proto.setItem=function(key,value){
      if(this===localStorage&&key===HISTORY_KEY)value=collapseHistoryJson(value);
      return baseSet.call(this,key,value);
    };
    try{return await fn.apply(ctx,args)}finally{proto.setItem=baseSet;schedulePaint()}
  }

  const baseOpen=window.openDetail;
  if(typeof baseOpen==='function'){
    const wrapped=async function(...args){return withCollapsedHistory(baseOpen,args,this)};
    window.openDetail=wrapped;try{openDetail=wrapped}catch(_){}
  }
  const baseMarketOpen=window.openMarketDetail;
  if(typeof baseMarketOpen==='function'){
    const wrapped=async function(...args){return withCollapsedHistory(baseMarketOpen,args,this)};
    window.openMarketDetail=wrapped;try{openMarketDetail=wrapped}catch(_){}
  }

  // Also clean any history already stored in this browser from older builds.
  try{
    const old=localStorage.getItem(HISTORY_KEY);
    if(old)localStorage.setItem(HISTORY_KEY,collapseHistoryJson(old));
  }catch(_){}

  function wrapRender(name){
    try{
      const base=window[name]||eval(name);
      if(typeof base!=='function'||base.__de49Paint)return;
      const wrapped=function(){const out=base.apply(this,arguments);schedulePaint();return out};
      wrapped.__de49Paint=true;wrapped.__de49Base=base;
      try{window[name]=wrapped}catch(_){}
      try{eval(name+'=wrapped')}catch(_){}
    }catch(_){}
  }

  function observeRoot(id){
    const root=document.getElementById(id);if(!root||root.__de49Observed)return false;
    const ob=new MutationObserver(schedulePaint);
    ob.observe(root,{childList:true,subtree:true});
    root.__de49Observed=true;return true;
  }
  function installObservers(){
    ['rankList','draftList','adpList','drawerContent','adpStatus'].forEach(observeRoot);
  }

  wrapRender('renderRankings');wrapRender('renderDraft');wrapRender('renderAdp');
  installObservers();
  [250,900,2200].forEach(ms=>setTimeout(installObservers,ms));
  document.addEventListener('click',e=>{
    if(e.target.closest('#rankPills,[data-adp-format],#topUpdate,#connectDraft,#deDraftSlot'))setTimeout(schedulePaint,0);
  });
  schedulePaint();

  window.DraftEdgeAdpMovement={paint:paintAll,collapseRankRuns};
})();

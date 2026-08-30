// v39.4 — one canonical ranking order across Overall, position tabs, and tiers.
(()=>{
  if(window.__WORKHORSE_RANK_SYNC_394__)return;
  window.__WORKHORSE_RANK_SYNC_394__=true;

  let fixing=false,state=null,suppressClickUntil=0,renderWrapping=false;
  const DESKTOP_QUERY='(min-width: 821px)';
  const DRAG_THRESHOLD=10;
  const isDesktop=()=>window.matchMedia?.(DESKTOP_QUERY).matches;
  const tierVal=v=>v==null||v===''||Number(v)===0?null:Number(v);
  const num=(v,f=999999)=>Number.isFinite(Number(v))?Number(v):f;
  const overallOrder=()=>Array.isArray(players)?players.slice().sort((a,b)=>num(a.overall)-num(b.overall)):[];

  function syncPosRanksFromOverall(){
    if(!Array.isArray(players))return false;
    const counts={};let changed=false;
    overallOrder().forEach(p=>{
      const pos=String(p.position||'');
      counts[pos]=(counts[pos]||0)+1;
      if(num(p.posRank,-1)!==counts[pos]){p.posRank=counts[pos];changed=true}
    });
    return changed;
  }
  window.WorkhorseSyncPosRanksFromOverall=syncPosRanksFromOverall;

  orderedPos=function(pos){
    syncPosRanksFromOverall();
    return overallOrder().filter(p=>String(p.position||'')===String(pos));
  };
  resequencePos=function(){syncPosRanksFromOverall()};
  window.orderedPos=orderedPos;
  window.resequencePos=resequencePos;

  const playerFromRow=row=>{
    const i=Number(row?.dataset?.index);
    return Number.isInteger(i)&&Array.isArray(players)?players[i]||null:null;
  };

  function canonicalizeRenderedTierRows(){
    if((typeof rankPos==='string'?rankPos:'ALL')==='ALL')return;
    const list=document.getElementById('rankList');if(!list)return;
    list.querySelectorAll(':scope > .tier-drop[data-tier]').forEach(section=>{
      const rows=[...section.querySelectorAll(':scope > .player[data-index]')];
      if(rows.length<2)return;
      const sorted=rows.slice().sort((a,b)=>num(playerFromRow(a)?.overall)-num(playerFromRow(b)?.overall));
      if(rows.every((r,i)=>r===sorted[i]))return;
      sorted.forEach(r=>section.appendChild(r));
    });
  }

  function installRenderSync(){
    if(renderWrapping)return;
    let base=null;try{base=renderRankings}catch(_){}
    if(typeof base!=='function'||base.__whCanonical394)return;
    renderWrapping=true;
    const wrapped=function(){
      syncPosRanksFromOverall();
      const out=base.apply(this,arguments);
      canonicalizeRenderedTierRows();
      return out;
    };
    wrapped.__whCanonical394=true;wrapped.__whCanonicalBase=base;
    try{renderRankings=wrapped}catch(_){}
    try{window.renderRankings=wrapped}catch(_){}
    renderWrapping=false;
  }

  function installCss(){
    if(document.getElementById('workhorse-rank-pointer-v394'))return;
    document.getElementById('workhorse-rank-pointer-v393')?.remove();
    const s=document.createElement('style');
    s.id='workhorse-rank-pointer-v394';
    s.textContent=`
      @media (min-width:821px){
        #rankList .player[data-index]{-webkit-user-select:none;user-select:none;cursor:grab}
        #rankList .player[data-index] img{-webkit-user-drag:none!important;user-drag:none!important;pointer-events:none}
        #rankList .player.wh-pointer-dragging{opacity:.46!important;cursor:grabbing!important}
        #rankList .player.wh-drop-before{box-shadow:inset 0 3px 0 #60a5fa!important}
        #rankList .player.wh-drop-after{box-shadow:inset 0 -3px 0 #60a5fa!important}
        #rankList .tier-drop.wh-tier-target{outline:2px solid rgba(96,165,250,.68);outline-offset:-2px}
        body.wh-ranking-dragging,body.wh-ranking-dragging *{cursor:grabbing!important}
      }`;
    document.head.appendChild(s);
  }

  function disableNativeRows(root=document){
    if(!isDesktop())return;
    root.querySelectorAll?.('#rankList .player[data-index]').forEach(row=>{
      row.draggable=false;row.setAttribute('draggable','false');
      row.querySelectorAll('img').forEach(img=>{img.draggable=false;img.setAttribute('draggable','false')});
    });
  }

  function installRowGuard(){
    installCss();installRenderSync();disableNativeRows();canonicalizeRenderedTierRows();
    const list=document.getElementById('rankList');
    if(!list||list.__whPointerObserver394)return;
    const mo=new MutationObserver(muts=>{
      if(isDesktop()){
        for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)disableNativeRows(n.matches?.('.player[data-index]')?n.parentElement||n:n);
      }
      if(!fixing)queueMicrotask(()=>{syncPosRanksFromOverall();canonicalizeRenderedTierRows()});
    });
    mo.observe(list,{childList:true,subtree:true});
    list.__whPointerObserver394=mo;
  }

  function clearMarks(){
    document.querySelectorAll('#rankList .wh-drop-before,#rankList .wh-drop-after').forEach(el=>el.classList.remove('wh-drop-before','wh-drop-after'));
    document.querySelectorAll('#rankList .wh-tier-target').forEach(el=>el.classList.remove('wh-tier-target'));
  }
  function tierFromSection(section){return section?tierVal(section.dataset.tier):null}
  function nearestTierAt(y){
    const tiers=[...document.querySelectorAll('#rankList > .tier-drop[data-tier]')];
    let best=null,dist=Infinity;
    for(const t of tiers){
      const r=t.getBoundingClientRect();
      const d=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;
      if(d<dist){dist=d;best=t}
    }
    return best;
  }
  function targetInRows(rows,y){
    if(!rows.length)return {row:null,after:false};
    for(const row of rows){
      const r=row.getBoundingClientRect();
      if(y<r.top+r.height/2)return {row,after:false};
    }
    return {row:rows[rows.length-1],after:true};
  }
  function resolveTarget(x,y){
    const list=document.getElementById('rankList');
    if(!list)return {row:null,tier:null,after:false};
    const mode=typeof rankPos==='string'?rankPos:'ALL';
    if(mode==='ALL'){
      const rows=[...list.querySelectorAll('.player[data-index]')].filter(r=>r!==state?.row&&r.offsetParent!==null);
      const t=targetInRows(rows,y);return {row:t.row,tier:null,after:t.after};
    }
    const hit=document.elementFromPoint(x,y);
    const tier=hit?.closest?.('#rankList > .tier-drop[data-tier]')||nearestTierAt(y);
    if(!tier)return {row:null,tier:null,after:false};
    const rows=[...tier.querySelectorAll(':scope > .player[data-index]')].filter(r=>r!==state?.row&&r.offsetParent!==null);
    const t=targetInRows(rows,y);return {row:t.row,tier,after:t.after};
  }
  function markTarget(x,y){
    if(!state?.active)return;
    clearMarks();
    const t=resolveTarget(x,y);
    state.targetRow=t.row;state.targetTier=t.tier;state.after=t.after;
    if(t.row)t.row.classList.add(t.after?'wh-drop-after':'wh-drop-before');
    else if(t.tier)t.tier.classList.add('wh-tier-target');
  }
  function autoScroll(y){
    const edge=76;
    if(y<edge)window.scrollBy(0,-Math.max(6,(edge-y)*.3));
    else if(y>window.innerHeight-edge)window.scrollBy(0,Math.max(6,(y-(window.innerHeight-edge))*.3));
  }

  function reorderAll(dragged,target,after){
    const ordered=overallOrder();
    const slots=ordered.map(p=>num(p.overall)).sort((a,b)=>a-b);
    const from=ordered.indexOf(dragged);if(from<0)return false;
    ordered.splice(from,1);
    let at=target?ordered.indexOf(target):-1;
    if(at<0)at=ordered.length;else if(after)at+=1;
    ordered.splice(Math.max(0,Math.min(at,ordered.length)),0,dragged);
    ordered.forEach((p,i)=>p.overall=slots[i]??i+1);
    syncPosRanksFromOverall();return true;
  }

  function tierConfigIndex(pos,tier){
    if(tier==null)return 999999;
    try{
      const cfg=Array.isArray(tiers?.[pos])?tiers[pos]:[];
      const i=cfg.findIndex(t=>tierVal(t?.id)===tierVal(tier));
      return i<0?999998:i;
    }catch(_){return 999998}
  }

  function tierBoundaryIndex(order,pos,destTier){
    if(destTier==null)return order.length;
    const same=order.map((p,i)=>({p,i})).filter(x=>tierVal(x.p.tier)===destTier);
    if(same.length)return same[same.length-1].i+1;
    const destIdx=tierConfigIndex(pos,destTier);
    for(let i=0;i<order.length;i++){
      const t=tierVal(order[i].tier);
      if(t==null||tierConfigIndex(pos,t)>destIdx)return i;
    }
    return order.length;
  }

  function reorderPosition(dragged,target,after,destTier){
    const pos=String(dragged.position||'');
    const posOrder=overallOrder().filter(p=>String(p.position||'')===pos);
    const slots=posOrder.map(p=>num(p.overall)).sort((a,b)=>a-b);
    const from=posOrder.indexOf(dragged);if(from<0)return false;
    const next=posOrder.filter(p=>p!==dragged);
    let at=-1;
    if(target&&String(target.position||'')===pos){
      at=next.indexOf(target);
      if(at>=0&&after)at+=1;
    }
    if(at<0)at=tierBoundaryIndex(next,pos,destTier);
    at=Math.max(0,Math.min(at,next.length));
    dragged.tier=destTier;
    next.splice(at,0,dragged);
    next.forEach((p,i)=>p.overall=slots[i]??p.overall);
    syncPosRanksFromOverall();return true;
  }

  function commit(){
    if(!state?.active||fixing)return;
    fixing=true;
    try{
      const dragged=state.player,target=playerFromRow(state.targetRow);
      const mode=typeof rankPos==='string'?rankPos:'ALL';
      if(mode==='ALL')reorderAll(dragged,target,state.after);
      else{
        const destTier=state.targetTier?tierFromSection(state.targetTier):(target?tierVal(target.tier):state.sourceTier);
        reorderPosition(dragged,target,state.after,destTier);
      }
      syncPosRanksFromOverall();
      try{save()}catch(_){}
      try{renderRankings()}catch(_){try{renderEverything()}catch(__){}}
    }finally{fixing=false}
  }

  function finish(doCommit){
    if(!state)return;
    const current=state,wasActive=current.active;
    if(wasActive&&doCommit)commit();
    current.row?.classList.remove('wh-pointer-dragging');
    document.body.classList.remove('wh-ranking-dragging');
    clearMarks();
    if(wasActive)suppressClickUntil=Date.now()+250;
    if(wasActive){try{current.row?.releasePointerCapture?.(current.pointerId)}catch(_){}}
    state=null;disableNativeRows();
  }
  function beginState(e,row,player){
    state={pointerId:e.pointerId,row,player,active:false,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,
      sourceTier:tierVal(player.tier),targetRow:null,targetTier:null,after:false};
  }
  function activateDrag(e){
    if(!state||state.active)return;
    state.active=true;
    try{state.row.setPointerCapture?.(state.pointerId)}catch(_){}
    state.row.classList.add('wh-pointer-dragging');
    document.body.classList.add('wh-ranking-dragging');
    markTarget(e.clientX,e.clientY);
  }

  document.addEventListener('pointerdown',e=>{
    if(!isDesktop()||e.button!==0||state)return;
    const row=e.target.closest?.('#rankList .player[data-index]');if(!row)return;
    if(e.target.closest?.('button,input,textarea,select,a,[contenteditable="true"]'))return;
    const player=playerFromRow(row);if(!player)return;
    row.draggable=false;beginState(e,row,player);
  },true);
  document.addEventListener('pointermove',e=>{
    if(!state||e.pointerId!==state.pointerId)return;
    state.lastX=e.clientX;state.lastY=e.clientY;
    if(!state.active){
      if(Math.hypot(e.clientX-state.startX,e.clientY-state.startY)<DRAG_THRESHOLD)return;
      activateDrag(e);
    }
    e.preventDefault();markTarget(e.clientX,e.clientY);autoScroll(e.clientY);
  },true);
  document.addEventListener('pointerup',e=>{
    if(!state||e.pointerId!==state.pointerId)return;
    if(state.active){e.preventDefault();markTarget(e.clientX,e.clientY);finish(true)}
    else finish(false);
  },true);
  document.addEventListener('pointercancel',e=>{if(state&&e.pointerId===state.pointerId)finish(false)},true);
  window.addEventListener('blur',()=>{if(state)finish(false)});
  document.addEventListener('lostpointercapture',e=>{
    if(state?.active&&e.pointerId===state.pointerId)setTimeout(()=>{if(state?.active&&state.pointerId===e.pointerId)finish(false)},0);
  },true);

  document.addEventListener('dragstart',e=>{
    if(isDesktop()&&e.target.closest?.('#rankList .player[data-index]')){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('dragover',e=>{
    if(isDesktop()&&e.target.closest?.('#rankList')){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('drop',e=>{
    if(isDesktop()&&e.target.closest?.('#rankList')){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('click',e=>{
    if(Date.now()<suppressClickUntil&&e.target.closest?.('#rankList .player[data-index]')){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    }
  },true);

  installRowGuard();
  if(!document.getElementById('rankList')){
    const boot=new MutationObserver(()=>{if(document.getElementById('rankList')){installRowGuard();boot.disconnect()}});
    boot.observe(document.documentElement,{childList:true,subtree:true});
  }

  const verifyInitialRanks=()=>{
    if(fixing||!Array.isArray(players))return;
    installRenderSync();
    if(syncPosRanksFromOverall()){
      try{save()}catch(_){}
      try{renderRankings()}catch(_){}
    }else canonicalizeRenderedTierRows();
    disableNativeRows();
  };
  if('requestIdleCallback' in window)requestIdleCallback(verifyInitialRanks,{timeout:2200});
  else setTimeout(verifyInitialRanks,900);
})();

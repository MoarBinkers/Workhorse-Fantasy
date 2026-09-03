// v39.7 — one ranking model: Overall, position ranks, and tier order stay bidirectionally connected.
(()=>{
  if(window.__WORKHORSE_RANK_SYNC_397__)return;
  window.__WORKHORSE_RANK_SYNC_397__=true;

  let fixing=false,state=null,suppressClickUntil=0,renderWrapping=false,loadWrapping=false;
  const DESKTOP_QUERY='(min-width: 821px)';
  const DRAG_THRESHOLD=10;
  const isDesktop=()=>window.matchMedia?.(DESKTOP_QUERY).matches;
  const tierVal=v=>v==null||v===''||Number(v)===0?null:Number(v);
  const num=(v,f=999999)=>Number.isFinite(Number(v))?Number(v):f;
  const overallOrder=()=>Array.isArray(players)?players.slice().sort((a,b)=>num(a.overall)-num(b.overall)):[];
  const allPositions=()=>[...new Set((Array.isArray(players)?players:[]).map(p=>String(p?.position||'')).filter(Boolean))];
  const tierIds=pos=>{
    let cfg=[];try{cfg=Array.isArray(tiers?.[pos])?tiers[pos]:[]}catch(_){}
    return cfg.map(t=>tierVal(t?.id)).filter(v=>v!=null);
  };
  const validTier=(pos,value)=>{
    const t=tierVal(value);return t!=null&&tierIds(pos).includes(t)?t:null;
  };

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

  function captureTierCounts(pos){
    const ids=tierIds(pos),valid=new Set(ids),counts=new Map(ids.map(id=>[id,0]));
    let untiered=0;
    overallOrder().filter(p=>String(p.position||'')===String(pos)).forEach(p=>{
      const t=tierVal(p.tier);
      if(valid.has(t))counts.set(t,(counts.get(t)||0)+1);
      else untiered++;
    });
    return {ids,counts,untiered};
  }

  // Tiers are ranking bands, not a second independent ordering system. Preserve
  // each tier's size, then let the current Overall-derived position order fill
  // those bands from top to bottom. This keeps tier rows and WR#/RB#/QB#/TE#
  // monotonic even after a player is moved from the ALL tab.
  function applyTierCounts(pos,snapshot){
    if(!snapshot)return false;
    const ordered=overallOrder().filter(p=>String(p.position||'')===String(pos));
    let i=0,changed=false;
    for(const id of snapshot.ids){
      const n=Math.max(0,Number(snapshot.counts.get(id))||0);
      for(let j=0;j<n&&i<ordered.length;j++,i++){
        if(tierVal(ordered[i].tier)!==id){ordered[i].tier=id;changed=true}
      }
    }
    while(i<ordered.length){
      if(tierVal(ordered[i].tier)!==null){ordered[i].tier=null;changed=true}
      i++;
    }
    return changed;
  }

  function normalizeOverallNumbers(){
    let changed=false;
    overallOrder().forEach((p,i)=>{if(num(p.overall,-1)!==i+1){p.overall=i+1;changed=true}});
    return changed;
  }

  function repairCanonical(){
    if(!Array.isArray(players))return false;
    const snapshots={};
    allPositions().forEach(pos=>snapshots[pos]=captureTierCounts(pos));
    let changed=normalizeOverallNumbers();
    if(syncPosRanksFromOverall())changed=true;
    for(const [pos,snap] of Object.entries(snapshots))if(applyTierCounts(pos,snap))changed=true;
    if(syncPosRanksFromOverall())changed=true;
    return changed;
  }

  // The original app treated tier/position order and Overall as two separate
  // rankings. On load, reconcile any legacy split state by taking the visible
  // tier order (tier 1, tier 2, ... untiered) and writing that relative position
  // order into the Overall slots already occupied by that position.
  function visualTierOrder(pos){
    const ids=tierIds(pos),valid=new Set(ids);
    const base=(Array.isArray(players)?players:[]).filter(p=>String(p.position||'')===String(pos))
      .slice().sort((a,b)=>num(a.posRank)-num(b.posRank)||num(a.overall)-num(b.overall));
    const out=[];
    ids.forEach(id=>out.push(...base.filter(p=>tierVal(p.tier)===id)));
    out.push(...base.filter(p=>!valid.has(tierVal(p.tier))));
    return out;
  }

  function reconcilePositionFromTiers(pos){
    if(!Array.isArray(players)||!pos)return false;
    const current=overallOrder().filter(p=>String(p.position||'')===String(pos));
    if(!current.length)return false;
    const desired=visualTierOrder(pos);
    if(desired.length!==current.length)return false;
    const slots=current.map(p=>num(p.overall)).sort((a,b)=>a-b);
    let changed=false;
    desired.forEach((p,i)=>{
      if(num(p.overall,-1)!==slots[i]){p.overall=slots[i];changed=true}
      const cleaned=validTier(pos,p.tier);
      if(tierVal(p.tier)!==cleaned){p.tier=cleaned;changed=true}
    });
    if(syncPosRanksFromOverall())changed=true;
    return changed;
  }

  function reconcileLegacyState(){
    if(!Array.isArray(players)||!players.length)return false;
    let changed=normalizeOverallNumbers();
    allPositions().forEach(pos=>{if(reconcilePositionFromTiers(pos))changed=true});
    if(syncPosRanksFromOverall())changed=true;
    // The desired order above is already grouped by tiers. Re-applying the band
    // sizes makes any invalid/removed tier id safely become Untiered.
    const snaps={};allPositions().forEach(pos=>snaps[pos]=captureTierCounts(pos));
    for(const [pos,snap] of Object.entries(snaps))if(applyTierCounts(pos,snap))changed=true;
    return changed;
  }

  orderedPos=function(pos){
    syncPosRanksFromOverall();
    return overallOrder().filter(p=>String(p.position||'')===String(pos));
  };
  // Base moveTier/deleteTier call this. Reordering a tier therefore now changes
  // the same-position players' Overall slots instead of only renumbering posRank.
  resequencePos=function(pos){
    if(pos&&String(pos).toUpperCase()!=='ALL')return reconcilePositionFromTiers(String(pos));
    return syncPosRanksFromOverall();
  };
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
    if(typeof base!=='function'||base.__whCanonical397)return;
    renderWrapping=true;
    const wrapped=function(){
      repairCanonical();
      const out=base.apply(this,arguments);
      canonicalizeRenderedTierRows();
      return out;
    };
    wrapped.__whCanonical397=true;wrapped.__whCanonicalBase=base;
    try{renderRankings=wrapped}catch(_){}
    try{window.renderRankings=wrapped}catch(_){}
    renderWrapping=false;
  }

  function installLoadSync(){
    if(loadWrapping)return;
    let base=null;try{base=loadActiveList}catch(_){}
    if(typeof base!=='function'||base.__whCanonicalLoad397)return;
    loadWrapping=true;
    const wrapped=function(){
      const out=base.apply(this,arguments);
      const changed=reconcileLegacyState();
      if(changed)queueMicrotask(()=>{try{save()}catch(_){}});
      return out;
    };
    wrapped.__whCanonicalLoad397=true;wrapped.__whCanonicalLoadBase=base;
    try{loadActiveList=wrapped}catch(_){}
    try{window.loadActiveList=wrapped}catch(_){}
    loadWrapping=false;
  }

  function installCss(){
    if(document.getElementById('workhorse-rank-pointer-v397'))return;
    document.getElementById('workhorse-rank-pointer-v396')?.remove();
    const s=document.createElement('style');
    s.id='workhorse-rank-pointer-v397';
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
    installCss();installLoadSync();installRenderSync();disableNativeRows();canonicalizeRenderedTierRows();
    const list=document.getElementById('rankList');
    if(!list||list.__whPointerObserver397)return;
    const mo=new MutationObserver(muts=>{
      if(isDesktop()){
        for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)disableNativeRows(n.matches?.('.player[data-index]')?n.parentElement||n:n);
      }
      if(!fixing)queueMicrotask(()=>{repairCanonical();canonicalizeRenderedTierRows()});
    });
    mo.observe(list,{childList:true,subtree:true});
    list.__whPointerObserver397=mo;
  }

  function clearMarks(){
    document.querySelectorAll('#rankList .wh-drop-before,#rankList .wh-drop-after').forEach(el=>el.classList.remove('wh-drop-before','wh-drop-after'));
    document.querySelectorAll('#rankList .wh-tier-target').forEach(el=>el.classList.remove('wh-tier-target'));
  }
  function tierFromSection(section){return section?validTier(String(state?.player?.position||rankPos||''),section.dataset.tier):null}
  function nearestTierAt(y){
    const tiersEls=[...document.querySelectorAll('#rankList > .tier-drop[data-tier]')];
    let best=null,dist=Infinity;
    for(const t of tiersEls){
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
    if(!dragged)return false;
    repairCanonical();
    const snapshots={};allPositions().forEach(pos=>snapshots[pos]=captureTierCounts(pos));
    const ordered=overallOrder();
    const slots=ordered.map(p=>num(p.overall)).sort((a,b)=>a-b);
    const from=ordered.indexOf(dragged);if(from<0)return false;
    ordered.splice(from,1);
    let at=target?ordered.indexOf(target):-1;
    if(at<0)at=ordered.length;else if(after)at+=1;
    ordered.splice(Math.max(0,Math.min(at,ordered.length)),0,dragged);
    ordered.forEach((p,i)=>p.overall=slots[i]??i+1);
    syncPosRanksFromOverall();
    for(const [pos,snap] of Object.entries(snapshots))applyTierCounts(pos,snap);
    syncPosRanksFromOverall();
    return true;
  }

  function tierBoundaryIndex(order,pos,destTier){
    const ids=tierIds(pos),group=new Map(ids.map((id,i)=>[id,i]));
    const wanted=destTier==null?ids.length:(group.get(destTier)??ids.length);
    let last=-1;
    for(let i=0;i<order.length;i++){
      const t=validTier(pos,order[i].tier);
      const g=t==null?ids.length:(group.get(t)??ids.length);
      if(g===wanted)last=i;
      if(g>wanted)return last>=0?last+1:i;
    }
    return order.length;
  }

  // Editing QB/RB/WR/TE changes only that position's relative order. Those
  // players are then written into the same Overall slots previously occupied by
  // that position, so unrelated positions do not jump randomly.
  function reorderPosition(dragged,target,after,destTier){
    if(!dragged)return false;
    repairCanonical();
    const pos=String(dragged.position||'');
    const posOrder=overallOrder().filter(p=>String(p.position||'')===pos);
    const slots=posOrder.map(p=>num(p.overall)).sort((a,b)=>a-b);
    const from=posOrder.indexOf(dragged);if(from<0)return false;
    const next=posOrder.filter(p=>p!==dragged);
    destTier=validTier(pos,destTier);
    dragged.tier=destTier;
    const tierSnapshot=captureTierCounts(pos);
    let at=-1;
    if(target&&String(target.position||'')===pos){
      at=next.indexOf(target);
      if(at>=0&&after)at+=1;
    }
    if(at<0)at=tierBoundaryIndex(next,pos,destTier);
    at=Math.max(0,Math.min(at,next.length));
    next.splice(at,0,dragged);
    next.forEach((p,i)=>p.overall=slots[i]??p.overall);
    syncPosRanksFromOverall();
    applyTierCounts(pos,tierSnapshot);
    syncPosRanksFromOverall();
    return true;
  }

  function fallbackCommitVisualOrder(){
    if(fixing)return;
    const mode=typeof rankPos==='string'?rankPos:'ALL';
    let changed=false;
    if(mode==='ALL'){
      const rows=[...document.querySelectorAll('#rankList > .player[data-index]')];
      const visible=rows.map(playerFromRow).filter(Boolean);
      const slots=visible.map(p=>num(p.overall)).sort((a,b)=>a-b);
      visible.forEach((p,i)=>{if(num(p.overall,-1)!==slots[i]){p.overall=slots[i];changed=true}});
      if(repairCanonical())changed=true;
    }else{
      const pos=String(mode),visible=[];
      document.querySelectorAll('#rankList > .tier-drop[data-tier]').forEach(section=>{
        const t=validTier(pos,section.dataset.tier);
        section.querySelectorAll(':scope > .player[data-index]').forEach(row=>{
          const p=playerFromRow(row);if(!p||String(p.position||'')!==pos)return;
          if(tierVal(p.tier)!==t){p.tier=t;changed=true}visible.push(p);
        });
      });
      const slots=visible.map(p=>num(p.overall)).sort((a,b)=>a-b);
      visible.forEach((p,i)=>{if(num(p.overall,-1)!==slots[i]){p.overall=slots[i];changed=true}});
      if(repairCanonical())changed=true;
    }
    if(changed){try{save()}catch(_){}}
    try{renderRankings()}catch(_){try{renderEverything()}catch(__){}}
  }

  // Replace the original split-order fallback too. Even if an old/native drag
  // handler fires, it can no longer save posRank independently from Overall.
  try{commitVisualOrder=fallbackCommitVisualOrder;window.commitVisualOrder=fallbackCommitVisualOrder}catch(_){}

  function audit(){
    const issues=[];const ordered=overallOrder(),counts={};
    ordered.forEach((p,i)=>{
      if(num(p.overall,-1)!==i+1)issues.push('overall:'+String(p.name||i));
      const pos=String(p.position||'');counts[pos]=(counts[pos]||0)+1;
      if(num(p.posRank,-1)!==counts[pos])issues.push('posRank:'+String(p.name||i));
    });
    allPositions().forEach(pos=>{
      const ids=tierIds(pos),group=new Map(ids.map((id,i)=>[id,i]));let last=-1;
      ordered.filter(p=>String(p.position||'')===pos).forEach(p=>{
        const t=validTier(pos,p.tier),g=t==null?ids.length:(group.get(t)??ids.length);
        if(g<last)issues.push('tierOrder:'+pos+':'+String(p.name||''));
        last=Math.max(last,g);
      });
    });
    return {ok:issues.length===0,issues};
  }

  window.WorkhorseRankingModel={
    version:'39.7',overallOrder,syncPosRanksFromOverall,repair:repairCanonical,
    reconcileFromTiers:reconcilePositionFromTiers,reorderAll,reorderPosition,audit
  };

  function commit(){
    if(!state?.active||fixing)return;
    fixing=true;
    try{
      const dragged=state.player,target=playerFromRow(state.targetRow);
      const mode=typeof rankPos==='string'?rankPos:'ALL';
      if(mode==='ALL')reorderAll(dragged,target,state.after);
      else{
        const destTier=state.targetTier?tierFromSection(state.targetTier):(target?validTier(String(dragged.position||''),target.tier):state.sourceTier);
        reorderPosition(dragged,target,state.after,destTier);
      }
      repairCanonical();
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
    repairCanonical();
    state={pointerId:e.pointerId,row,player,active:false,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,
      sourceTier:validTier(String(player.position||''),player.tier),targetRow:null,targetTier:null,after:false};
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

  installLoadSync();installRowGuard();
  const migrated=reconcileLegacyState();
  if(migrated){try{save()}catch(_){}try{renderRankings()}catch(_){}}
  if(!document.getElementById('rankList')){
    const boot=new MutationObserver(()=>{if(document.getElementById('rankList')){installRowGuard();boot.disconnect()}});
    boot.observe(document.documentElement,{childList:true,subtree:true});
  }

  window.addEventListener('workhorse:cloud-rankings-ready',()=>setTimeout(()=>{
    const changed=reconcileLegacyState();repairCanonical();
    if(changed){try{save()}catch(_){}try{renderRankings()}catch(_){}}
  },0));

  const verifyInitialRanks=()=>{
    if(fixing||!Array.isArray(players))return;
    installLoadSync();installRenderSync();
    const changed=repairCanonical();
    if(changed){try{save()}catch(_){}try{renderRankings()}catch(_){}}
    else canonicalizeRenderedTierRows();
    disableNativeRows();
  };
  if('requestIdleCallback' in window)requestIdleCallback(verifyInitialRanks,{timeout:2200});
  else setTimeout(verifyInitialRanks,900);
})();

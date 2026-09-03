// v75.6 — mobile uses the same canonical Overall/position/tier ranking model as desktop.
(()=>{
  if(window.__WORKHORSE_MOBILE_TOUCH_756__)return;
  window.__WORKHORSE_MOBILE_TOUCH_756__=true;

  const MOBILE_QUERY='(max-width: 820px)';
  const HOLD_MS=280,MOVE_CANCEL=12;
  const isMobileTouch=()=>window.matchMedia?.(MOBILE_QUERY).matches&&(navigator.maxTouchPoints||0)>0;
  if(!isMobileTouch())return;

  document.getElementById('workhorse-mobile-touch-v755')?.remove();
  const style=document.createElement('style');
  style.id='workhorse-mobile-touch-v756';
  style.textContent=`
    @media (max-width:820px){
      html,body{overflow-x:hidden}
      #rankList,#rankList .player{max-width:100%;box-sizing:border-box}
      #rankList .player[data-index]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      #rankList .player.mobile-touch-dragging{opacity:.34}
      .mobile-touch-ghost{position:fixed!important;z-index:2147483000!important;pointer-events:none!important;margin:0!important;opacity:.96!important;box-shadow:0 18px 42px rgba(0,0,0,.42)!important;transform:scale(.985)}
      #rankList .player.mobile-drop-before{box-shadow:inset 0 3px 0 #60a5fa!important}
      #rankList .player.mobile-drop-after{box-shadow:inset 0 -3px 0 #60a5fa!important}
      #rankList .tier-drop.mobile-tier-drop{outline:2px solid rgba(96,165,250,.72);outline-offset:-2px}
    }`;
  document.head.appendChild(style);

  let state=null,suppressClickUntil=0;
  const num=(v,f=999999)=>Number.isFinite(Number(v))?Number(v):f;
  const tierVal=v=>v==null||v===''||Number(v)===0?null:Number(v);
  const overallOrder=()=>Array.isArray(players)?players.slice().sort((a,b)=>num(a.overall)-num(b.overall)):[];
  const playerFromRow=row=>{
    const i=Number(row?.dataset?.index);
    return Number.isInteger(i)&&Array.isArray(players)?players[i]||null:null;
  };
  const syncPosRanks=()=>{
    const model=window.WorkhorseRankingModel;
    if(typeof model?.repair==='function'){model.repair();return}
    if(typeof window.WorkhorseSyncPosRanksFromOverall==='function'){
      window.WorkhorseSyncPosRanksFromOverall();return;
    }
    const counts={};
    overallOrder().forEach(p=>{
      const pos=String(p.position||'');counts[pos]=(counts[pos]||0)+1;p.posRank=counts[pos];
    });
  };
  const saveAndRender=()=>{
    syncPosRanks();
    try{save()}catch(_){}
    try{renderRankings()}catch(_){try{renderEverything()}catch(__){}}
  };
  const clearMarks=()=>{
    document.querySelectorAll('#rankList .mobile-drop-before,#rankList .mobile-drop-after').forEach(el=>el.classList.remove('mobile-drop-before','mobile-drop-after'));
    document.querySelectorAll('#rankList .mobile-tier-drop').forEach(el=>el.classList.remove('mobile-tier-drop'));
  };
  const tierFromEl=el=>{
    const section=el?.closest?.('.tier-drop[data-tier]');
    return section?tierVal(section.dataset.tier):null;
  };

  function makeGhost(row,x,y){
    const rect=row.getBoundingClientRect(),ghost=row.cloneNode(true);
    ghost.classList.add('mobile-touch-ghost');
    ghost.classList.remove('mobile-touch-dragging','mobile-drop-before','mobile-drop-after');
    ghost.removeAttribute('draggable');
    ghost.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
    ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';
    ghost.style.left=rect.left+'px';ghost.style.top=(y-rect.height/2)+'px';
    document.body.appendChild(ghost);
    return {ghost,rect,grabX:x-rect.left};
  }
  function activateDrag(touch){
    if(!state||state.active||!state.row.isConnected)return;
    try{window.WorkhorseRankingModel?.repair?.()}catch(_){}
    state.active=true;state.row.classList.add('mobile-touch-dragging');
    const g=makeGhost(state.row,touch.clientX,touch.clientY);
    state.ghost=g.ghost;state.ghostHeight=g.rect.height;state.grabX=g.grabX;
    suppressClickUntil=Date.now()+500;
    try{navigator.vibrate?.(8)}catch(_){}
  }
  function moveGhost(touch){
    if(!state?.ghost)return;
    const width=state.ghost.getBoundingClientRect().width;
    state.ghost.style.left=Math.max(6,Math.min(window.innerWidth-width-6,touch.clientX-state.grabX))+'px';
    state.ghost.style.top=(touch.clientY-state.ghostHeight/2)+'px';
  }
  function markTarget(touch){
    clearMarks();
    const hit=document.elementFromPoint(touch.clientX,touch.clientY);
    const row=hit?.closest?.('#rankList .player[data-index]');
    const tier=hit?.closest?.('#rankList .tier-drop[data-tier]');
    state.targetRow=row&&row!==state.row?row:null;
    state.targetTier=tier||row?.closest?.('.tier-drop[data-tier]')||null;
    state.after=false;
    if(state.targetRow){
      const r=state.targetRow.getBoundingClientRect();
      state.after=touch.clientY>r.top+r.height/2;
      state.targetRow.classList.add(state.after?'mobile-drop-after':'mobile-drop-before');
    }else if(state.targetTier)state.targetTier.classList.add('mobile-tier-drop');
  }
  function autoScroll(y){
    const edge=72;
    if(y<edge)window.scrollBy(0,-Math.max(6,(edge-y)*.26));
    else if(y>window.innerHeight-edge)window.scrollBy(0,Math.max(6,(y-(window.innerHeight-edge))*.26));
  }

  // Fallbacks are retained for an old cached page, but the normal path below
  // delegates to WorkhorseRankingModel so mobile and desktop cannot diverge.
  function reorderAllFallback(dragged,target,after){
    const ordered=overallOrder(),slots=ordered.map(p=>num(p.overall)).sort((a,b)=>a-b);
    const from=ordered.indexOf(dragged);if(from<0)return false;
    ordered.splice(from,1);
    let at=target?ordered.indexOf(target):-1;
    if(at<0)at=ordered.length;else if(after)at+=1;
    ordered.splice(Math.max(0,Math.min(at,ordered.length)),0,dragged);
    ordered.forEach((p,i)=>p.overall=slots[i]??i+1);syncPosRanks();return true;
  }
  function reorderPositionFallback(dragged,target,after,destTier){
    const pos=String(dragged.position||''),posOrder=overallOrder().filter(p=>String(p.position||'')===pos);
    const slots=posOrder.map(p=>num(p.overall)).sort((a,b)=>a-b),next=posOrder.filter(p=>p!==dragged);
    let at=target&&String(target.position||'')===pos?next.indexOf(target):-1;
    if(at>=0&&after)at+=1;if(at<0)at=next.length;
    dragged.tier=tierVal(destTier);next.splice(at,0,dragged);next.forEach((p,i)=>p.overall=slots[i]??p.overall);syncPosRanks();return true;
  }

  function commitDrop(){
    if(!state?.active)return;
    const dragged=state.player,target=playerFromRow(state.targetRow);
    const mode=typeof rankPos==='string'?rankPos:'ALL';
    const model=window.WorkhorseRankingModel;
    if(mode==='ALL'){
      if(typeof model?.reorderAll==='function')model.reorderAll(dragged,target,state.after);
      else reorderAllFallback(dragged,target,state.after);
    }else{
      const destTier=state.targetTier?tierFromEl(state.targetTier):(target?tierVal(target.tier):state.sourceTier);
      if(typeof model?.reorderPosition==='function')model.reorderPosition(dragged,target,state.after,destTier);
      else reorderPositionFallback(dragged,target,state.after,destTier);
    }
    saveAndRender();
  }
  function finish(commit){
    if(!state)return;
    const current=state;clearTimeout(current.holdTimer);
    if(current.active&&commit)commitDrop();
    if(current.row?.isConnected)current.row.classList.remove('mobile-touch-dragging');
    current.ghost?.remove();clearMarks();
    if(current.active)suppressClickUntil=Date.now()+450;
    state=null;
  }

  document.addEventListener('touchstart',e=>{
    if(!isMobileTouch()||e.touches.length!==1||state)return;
    const row=e.target.closest?.('#rankList .player[data-index]');if(!row)return;
    if(e.target.closest?.('button,input,textarea,select,a,[contenteditable="true"]'))return;
    const player=playerFromRow(row);if(!player)return;
    const t=e.touches[0];
    state={row,player,active:false,startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,
      sourceTier:tierVal(player.tier),targetRow:null,targetTier:null,after:false,ghost:null,ghostHeight:0,grabX:0,holdTimer:null};
    state.holdTimer=setTimeout(()=>{
      if(!state)return;
      const fake={clientX:state.lastX,clientY:state.lastY};activateDrag(fake);markTarget(fake);
    },HOLD_MS);
  },{capture:true,passive:true});
  document.addEventListener('touchmove',e=>{
    if(!state||e.touches.length!==1)return;
    const t=e.touches[0];state.lastX=t.clientX;state.lastY=t.clientY;
    if(!state.active){
      if(Math.hypot(t.clientX-state.startX,t.clientY-state.startY)>MOVE_CANCEL){clearTimeout(state.holdTimer);state=null}
      return;
    }
    e.preventDefault();moveGhost(t);markTarget(t);autoScroll(t.clientY);
  },{capture:true,passive:false});
  document.addEventListener('touchend',e=>{
    if(!state)return;if(state.active)e.preventDefault();finish(true);
  },{capture:true,passive:false});
  document.addEventListener('touchcancel',()=>finish(false),{capture:true,passive:true});
  window.addEventListener('blur',()=>finish(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(false)});
  document.addEventListener('dragstart',e=>{
    if(isMobileTouch()&&e.target.closest?.('#rankList .player[data-index]'))e.preventDefault();
  },true);
  document.addEventListener('contextmenu',e=>{
    if((state?.active||Date.now()<suppressClickUntil)&&e.target.closest?.('#rankList .player[data-index]'))e.preventDefault();
  },true);
  document.addEventListener('click',e=>{
    if(Date.now()<suppressClickUntil&&e.target.closest?.('#rankList .player[data-index]')){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    }
  },true);
})();

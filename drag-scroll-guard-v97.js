// v97.2 — preserve the user's viewport across Rankings drag/drop rerenders.
// ALL rankings keeps the simple scroll lock. Position views (WR/RB/QB/TE)
// preserve a visible player row in the same viewport location, because moving a
// filtered row can change the amount/height of content above the drop point.
(()=>{
  if(window.__WORKHORSE_DRAG_SCROLL_GUARD_97__)return;
  window.__WORKHORSE_DRAG_SCROLL_GUARD_97__=true;

  const root=document.getElementById('rankList');
  if(!root)return;

  let dragging=false;
  let restoreToken=0;
  let cancelRestore=false;
  let unlockTimer=0;

  const style=document.createElement('style');
  style.id='whDragScrollGuard97Css';
  style.textContent='#rankList.wh97-drag-lock{overflow-anchor:none!important}';
  document.head.appendChild(style);

  const userInterrupt=()=>{if(!dragging)cancelRestore=true};
  window.addEventListener('wheel',userInterrupt,{passive:true,capture:true});
  window.addEventListener('touchstart',userInterrupt,{passive:true,capture:true});
  window.addEventListener('pointerdown',userInterrupt,{passive:true,capture:true});
  window.addEventListener('keydown',userInterrupt,true);

  function currentPos(){
    try{return String(rankPos||'ALL').toUpperCase()}catch(_){return 'ALL'}
  }
  function rowName(row){return row?.querySelector?.('.name')?.textContent?.trim()||''}
  function findRowByName(name){
    if(!name)return null;
    for(const row of root.querySelectorAll(':scope .player.rankings')){
      if(rowName(row)===name)return row;
    }
    return null;
  }
  function firstVisibleRow(){
    const top=Math.max(0,document.querySelector('header')?.getBoundingClientRect?.().bottom||0);
    let best=null,bestDist=Infinity;
    for(const row of root.querySelectorAll(':scope .player.rankings')){
      const r=row.getBoundingClientRect();
      if(r.bottom<=top||r.top>=window.innerHeight)continue;
      const dist=Math.abs(r.top-top);
      if(dist<bestDist){best=row;bestDist=dist}
    }
    return best;
  }
  function captureAnchor(e){
    // Prefer the actual row under the drop pointer. If the pointer lands in a
    // gap, preserve the first visible player instead.
    const row=e?.target?.closest?.('.player.rankings')||firstVisibleRow();
    if(!row)return null;
    const name=rowName(row);if(!name)return null;
    return {name,top:row.getBoundingClientRect().top};
  }
  function holdAbsolute(y,token){
    if(cancelRestore||token!==restoreToken)return;
    const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const target=Math.min(y,maxY);
    if(Math.abs(window.scrollY-target)>1)window.scrollTo({top:target,left:window.scrollX,behavior:'auto'});
  }
  function holdAnchor(anchor,fallbackY,token){
    if(cancelRestore||token!==restoreToken)return;
    const row=findRowByName(anchor?.name);
    if(!row){holdAbsolute(fallbackY,token);return}
    const delta=row.getBoundingClientRect().top-anchor.top;
    if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:'auto'});
  }
  function restore(anchor,y,token,filtered){
    if(filtered&&anchor)holdAnchor(anchor,y,token);
    else holdAbsolute(y,token);
  }
  function releaseLock(token){
    if(token!==restoreToken)return;
    root.classList.remove('wh97-drag-lock');
  }

  root.addEventListener('dragstart',e=>{
    if(!e.target.closest('.player[draggable="true"]'))return;
    dragging=true;cancelRestore=false;restoreToken++;
    clearTimeout(unlockTimer);
    root.classList.add('wh97-drag-lock');
  },true);

  root.addEventListener('drop',e=>{
    if(!dragging)return;
    const y=window.scrollY;
    const filtered=currentPos()!=='ALL';
    const anchor=filtered?captureAnchor(e):null;
    const token=++restoreToken;
    cancelRestore=false;dragging=false;

    // Position views need row anchoring because reordering a filtered player can
    // change layout above the viewport. Keep the anchor stable through the normal
    // synchronous render plus the short save/cloud rerender window.
    queueMicrotask(()=>restore(anchor,y,token,filtered));
    requestAnimationFrame(()=>{
      restore(anchor,y,token,filtered);
      requestAnimationFrame(()=>restore(anchor,y,token,filtered));
    });
    setTimeout(()=>restore(anchor,y,token,filtered),40);
    setTimeout(()=>restore(anchor,y,token,filtered),120);
    setTimeout(()=>restore(anchor,y,token,filtered),220);
    unlockTimer=setTimeout(()=>releaseLock(token),260);
  },true);

  root.addEventListener('dragend',()=>{
    dragging=false;
    if(!unlockTimer)unlockTimer=setTimeout(()=>root.classList.remove('wh97-drag-lock'),260);
  },true);

  window.WorkhorseDragScrollGuard={version:97.2};
})();

// v97.3 — preserve the user's viewport across the real custom pointer/touch ranking reorder paths.
// Desktop Rankings no longer use native HTML5 drag/drop, and mobile uses its own
// touch engine, so this guard tracks both custom drag systems and keeps a stable
// visible player anchored through the synchronous render and short save rerender window.
(()=>{
  if(window.__WORKHORSE_DRAG_SCROLL_GUARD_97__)return;
  window.__WORKHORSE_DRAG_SCROLL_GUARD_97__=true;

  const root=document.getElementById('rankList');
  if(!root)return;

  let tracking=false;
  let restoring=false;
  let restoreToken=0;
  let cancelRestore=false;
  let unlockTimer=0;
  let scrollRaf=0;
  let draggedIndex='';
  let snapshot=null;

  const style=document.createElement('style');
  style.id='whDragScrollGuard97Css';
  style.textContent=`
    html.wh97-drag-lock,html.wh97-drag-lock body,#rankList.wh97-drag-lock{
      overflow-anchor:none!important;
      scroll-behavior:auto!important;
    }
  `;
  document.head.appendChild(style);

  function currentPos(){
    try{return String(rankPos||'ALL').toUpperCase()}catch(_){return 'ALL'}
  }
  const rowIndex=row=>String(row?.dataset?.index??'');
  const isVisible=row=>{
    if(!row||!row.isConnected||row.offsetParent===null)return false;
    const r=row.getBoundingClientRect();
    return r.bottom>0&&r.top<window.innerHeight;
  };
  function firstVisibleRow(excludeIndex=''){
    const top=Math.max(0,document.querySelector('header')?.getBoundingClientRect?.().bottom||0);
    let best=null,bestDist=Infinity;
    for(const row of root.querySelectorAll('.player[data-index]')){
      if(rowIndex(row)===excludeIndex||!isVisible(row))continue;
      const r=row.getBoundingClientRect();
      if(r.bottom<=top)continue;
      const dist=Math.abs(r.top-top);
      if(dist<bestDist){best=row;bestDist=dist}
    }
    return best;
  }
  function findRowByIndex(index){
    if(index==='')return null;
    for(const row of root.querySelectorAll('.player[data-index]')){
      if(rowIndex(row)===String(index))return row;
    }
    return null;
  }
  function captureAnchor(e){
    let row=e?.target?.closest?.('#rankList .player[data-index]')||null;
    if(!row||rowIndex(row)===draggedIndex||!isVisible(row))row=firstVisibleRow(draggedIndex);
    if(!row)return null;
    return {index:rowIndex(row),top:row.getBoundingClientRect().top};
  }
  function captureSnapshot(e){
    snapshot={
      x:window.scrollX,
      y:window.scrollY,
      anchor:captureAnchor(e),
      filtered:currentPos()!=='ALL'
    };
    return snapshot;
  }
  function lock(){
    document.documentElement.classList.add('wh97-drag-lock');
    root.classList.add('wh97-drag-lock');
  }
  function unlock(){
    document.documentElement.classList.remove('wh97-drag-lock');
    root.classList.remove('wh97-drag-lock');
  }
  function holdAbsolute(y,token){
    if(cancelRestore||token!==restoreToken)return;
    const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const target=Math.max(0,Math.min(y,maxY));
    if(Math.abs(window.scrollY-target)>1)window.scrollTo({top:target,left:window.scrollX,behavior:'auto'});
  }
  function holdAnchor(anchor,fallbackY,token){
    if(cancelRestore||token!==restoreToken)return;
    const row=findRowByIndex(anchor?.index);
    if(!row){holdAbsolute(fallbackY,token);return}
    const delta=row.getBoundingClientRect().top-anchor.top;
    if(Math.abs(delta)>1){
      const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      const target=Math.max(0,Math.min(window.scrollY+delta,maxY));
      window.scrollTo({top:target,left:window.scrollX,behavior:'auto'});
    }
  }
  function restore(anchor,y,token,filtered){
    // Preserve a stable visible row whenever possible. This avoids the subtle
    // one-row jump that absolute scrollY alone can still show after reordering.
    if(anchor)holdAnchor(anchor,y,token);
    else holdAbsolute(y,token);
  }
  function scheduleRestore(snap){
    if(!snap)return;
    const {anchor,y,filtered}=snap;
    const token=++restoreToken;
    cancelRestore=false;
    restoring=true;
    clearTimeout(unlockTimer);
    lock();

    queueMicrotask(()=>restore(anchor,y,token,filtered));
    requestAnimationFrame(()=>{
      restore(anchor,y,token,filtered);
      requestAnimationFrame(()=>restore(anchor,y,token,filtered));
    });
    setTimeout(()=>restore(anchor,y,token,filtered),40);
    setTimeout(()=>restore(anchor,y,token,filtered),120);
    setTimeout(()=>restore(anchor,y,token,filtered),220);
    unlockTimer=setTimeout(()=>{
      if(token!==restoreToken)return;
      restore(anchor,y,token,filtered);
      restoring=false;
      unlock();
    },280);
  }

  const customDragActive=()=>
    document.body.classList.contains('wh-ranking-dragging')||
    !!root.querySelector('.player.mobile-touch-dragging');

  function startTracking(e){
    if(tracking)return;
    const dragged=root.querySelector('.player.wh-pointer-dragging,.player.mobile-touch-dragging');
    draggedIndex=rowIndex(dragged);
    tracking=true;
    cancelRestore=false;
    lock();
    captureSnapshot(e);
  }
  function trackMove(e){
    if(!customDragActive())return;
    if(!tracking)startTracking(e);
    captureSnapshot(e);
  }
  function finishCustom(e){
    // A quick desktop drag can activate and release before a second pointermove.
    // If the engine is visibly dragging at release, take the snapshot right here.
    if(!tracking&&customDragActive())startTracking(e);
    if(!tracking)return;
    // If this listener runs before the drag engine's pointerup/touchend handler,
    // capture the final pre-render viewport. If it runs after, keep the last move/
    // scroll snapshot rather than accidentally anchoring the already-rebuilt list.
    if(customDragActive())captureSnapshot(e);
    const snap=snapshot;
    tracking=false;
    draggedIndex='';
    scheduleRestore(snap);
  }
  function cancelTracking(){
    if(!tracking)return;
    tracking=false;
    draggedIndex='';
    snapshot=null;
    if(!restoring)unlock();
  }

  document.addEventListener('pointermove',trackMove,{capture:true,passive:true});
  document.addEventListener('touchmove',trackMove,{capture:true,passive:true});
  window.addEventListener('scroll',()=>{
    if(!tracking||scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;if(tracking)captureSnapshot()});
  },{passive:true});
  document.addEventListener('pointerup',finishCustom,true);
  document.addEventListener('touchend',finishCustom,true);
  document.addEventListener('pointercancel',cancelTracking,true);
  document.addEventListener('touchcancel',cancelTracking,true);
  window.addEventListener('blur',cancelTracking);

  const userInterrupt=()=>{
    if(!restoring)return;
    cancelRestore=true;
    restoring=false;
    clearTimeout(unlockTimer);
    unlock();
  };
  window.addEventListener('wheel',userInterrupt,{passive:true,capture:true});
  window.addEventListener('touchstart',userInterrupt,{passive:true,capture:true});
  window.addEventListener('pointerdown',userInterrupt,{passive:true,capture:true});
  window.addEventListener('keydown',userInterrupt,true);

  // Keep the legacy native path as a fallback for any older renderer that still
  // emits HTML5 drag events. The current desktop/mobile engines are handled above.
  root.addEventListener('dragstart',e=>{
    const row=e.target.closest?.('.player[data-index]');
    if(!row)return;
    draggedIndex=rowIndex(row);
    tracking=true;
    cancelRestore=false;
    lock();
    captureSnapshot(e);
  },true);
  root.addEventListener('drop',e=>{
    if(!tracking)return;
    captureSnapshot(e);
    const y=window.scrollY;
    const filtered=currentPos()!=='ALL';
    const anchor=captureAnchor(e);
    const token=++restoreToken;
    cancelRestore=false;
    tracking=false;
    restoring=true;
    draggedIndex='';
    queueMicrotask(()=>restore(anchor,y,token,filtered));
    requestAnimationFrame(()=>{
      restore(anchor,y,token,filtered);
      requestAnimationFrame(()=>restore(anchor,y,token,filtered));
    });
    setTimeout(()=>restore(anchor,y,token,filtered),40);
    setTimeout(()=>restore(anchor,y,token,filtered),120);
    setTimeout(()=>restore(anchor,y,token,filtered),220);
    clearTimeout(unlockTimer);
    unlockTimer=setTimeout(()=>{if(token===restoreToken){restoring=false;unlock()}},280);
  },true);
  root.addEventListener('dragend',()=>{if(tracking)cancelTracking()},true);

  window.WorkhorseDragScrollGuard={version:97.3,mode:'pointer-touch-anchor'};
})();

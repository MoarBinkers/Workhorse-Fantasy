// v97 — preserve the user's viewport across the rankings drag/drop rerender.
// The base reorder logic remains untouched; this only prevents an intermittent
// browser/focus/rerender scroll jump after the drop has already completed.
(()=>{
  if(window.__WORKHORSE_DRAG_SCROLL_GUARD_97__)return;
  window.__WORKHORSE_DRAG_SCROLL_GUARD_97__=true;

  const root=document.getElementById('rankList');
  if(!root)return;

  let dragging=false;
  let restoreToken=0;
  let cancelRestore=false;

  const userInterrupt=()=>{
    if(!dragging)cancelRestore=true;
  };
  // If the user intentionally interacts immediately after dropping, stop
  // restoring so this guard never fights a real scroll/input action.
  window.addEventListener('wheel',userInterrupt,{passive:true,capture:true});
  window.addEventListener('touchstart',userInterrupt,{passive:true,capture:true});
  window.addEventListener('pointerdown',userInterrupt,{passive:true,capture:true});
  window.addEventListener('keydown',userInterrupt,true);

  root.addEventListener('dragstart',e=>{
    if(!e.target.closest('.player[draggable="true"]'))return;
    dragging=true;
    cancelRestore=false;
    restoreToken++;
  },true);

  function holdViewport(y,token){
    if(cancelRestore||token!==restoreToken)return;
    const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const target=Math.min(y,maxY);
    if(Math.abs(window.scrollY-target)>1)window.scrollTo({top:target,left:window.scrollX,behavior:'auto'});
  }

  root.addEventListener('drop',e=>{
    if(!dragging)return;
    // Capture AFTER any drag auto-scroll has occurred. This is the viewport the
    // user chose at the instant of the drop and is what should remain visible.
    const y=window.scrollY;
    const token=++restoreToken;
    cancelRestore=false;
    dragging=false;

    // Cover the normal synchronous render, the next paint, and a delayed cloud/
    // save render without installing a MutationObserver or permanent scroll loop.
    queueMicrotask(()=>holdViewport(y,token));
    requestAnimationFrame(()=>{
      holdViewport(y,token);
      requestAnimationFrame(()=>holdViewport(y,token));
    });
    setTimeout(()=>holdViewport(y,token),40);
    setTimeout(()=>holdViewport(y,token),120);
  },true);

  root.addEventListener('dragend',()=>{
    dragging=false;
  },true);

  window.WorkhorseDragScrollGuard={version:97};
})();

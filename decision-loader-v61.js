// v61 feature loader — download optional features in parallel while preserving execution order. Production redeploy checkpoint.
(()=>{
  const files=['./draft-current-pick-v68.js?v=682','./round-bands-v61.js?v=614','./list-modal-layout-v79.js?v=791','./list-delete-v80.js?v=802','./smart-search-v62.js?v=621','./player-compare-v63.js?v=631','./edge-heat-v64.js?v=642','./draft-recap-v65.js?v=652','./draft-recap-trigger-v66.js?v=661','./draft-recap-all-picks-v84.js?v=84','./draft-risk-v73.js?v=734','./player-fantasy-outlook-v74.js?v=747','./mobile-polish-v81.js?v=81','./news-update-red-dot-v85.js?v=85'];
  const loadOne=src=>new Promise(resolve=>{
    try{
      const s=document.createElement('script');
      s.src=src;
      s.async=false;
      s.onload=()=>resolve();
      s.onerror=()=>{console.warn('Workhorse optional feature failed to load:',src);resolve()};
      document.body.appendChild(s);
    }catch(e){console.warn('Workhorse optional feature loader error:',src,e);resolve()}
  });
  const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const start=async()=>{
    for(let i=0;i<files.length;i+=2){
      await Promise.all(files.slice(i,i+2).map(loadOne));
      await yieldFrame();
    }
  };
  if('requestIdleCallback' in window)requestIdleCallback(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),{timeout:1600});
  else setTimeout(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),500);
})();

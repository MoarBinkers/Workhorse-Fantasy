// v61.11 — keep startup lean while keeping Rankings-critical controls available immediately.
(()=>{
  const coreFiles=[
    './on-demand-player-search-v88.js?v=882',
    './rank-sync-v38.js?v=395',
    './sleeper-update-status-v40.js?v=402',
    './adp-movement-v49.js?v=495',
    './player-tags-cta-v53.js?v=533',
    './tags-upgrade-v59.js?v=60',
    './list-modal-layout-v79.js?v=792',
    './list-delete-v80.js?v=803',
    './mobile-polish-v81.js?v=812'
  ];
  const backgroundFiles=[
    './logo-fix-v291.js?v=301',
    './rankings-news-update-v83.js?v=834',
    './rankings-help-v51.js?v=52',
    './smart-search-v62.js?v=622',
    './player-compare-v63.js?v=632',
    './edge-heat-v64.js?v=643',
    './player-fantasy-outlook-v74.js?v=748',
    './news-update-red-dot-v85.js?v=852'
  ];
  const draftFiles=[
    './draft-room-v41.js?v=414',
    './draft-help-v76.js?v=763',
    './reset-draft-v42.js?v=43',
    './sleeper-auto-draft-v44.js?v=45',
    './draft-ownership-v45.js?v=452',
    './draft-intelligence-v48.js?v=49',
    './live-draft-tier-context-v77.js?v=772',
    './live-draft-edge-v82.js?v=823',
    './draft-current-pick-v68.js?v=683',
    './draft-recap-v65.js?v=653',
    './draft-recap-trigger-v66.js?v=662',
    './draft-recap-all-picks-v84.js?v=842',
    './draft-risk-v73.js?v=735'
  ];

  const loaded=new Map();
  const loadOne=src=>{
    if(loaded.has(src))return loaded.get(src);
    const promise=new Promise(resolve=>{
      try{
        const s=document.createElement('script');s.src=src;s.async=false;
        s.onload=()=>resolve();
        s.onerror=()=>{console.warn('Workhorse optional feature failed to load:',src);resolve()};
        document.body.appendChild(s);
      }catch(e){console.warn('Workhorse optional feature loader error:',src,e);resolve()}
    });
    loaded.set(src,promise);return promise;
  };
  const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  async function loadBatch(files,batch=2){
    for(let i=0;i<files.length;i+=batch){
      await Promise.all(files.slice(i,i+batch).map(loadOne));
      await yieldFrame();
    }
  }
  const idle=(fn,timeout)=>{
    if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout});
    else setTimeout(fn,Math.min(1200,timeout));
  };

  // Rankings-critical guards/controls stay immediate. These are small and avoid
  // regressions where controls or drag behavior depend on unrelated lazy tabs.
  loadOne('./rank-list-cap-v93.js?v=932');
  loadOne('./sleeper-rank-cap-v94.js?v=942');
  loadOne('./ranking-data-recovery-v95.js?v=951');
  loadOne('./round-bands-v61.js?v=616');
  loadOne('./drag-scroll-guard-v97.js?v=972');

  let coreBegun=false;
  const beginCore=()=>{
    if(coreBegun)return;coreBegun=true;
    setTimeout(()=>idle(()=>loadBatch(coreFiles,2).catch(e=>console.warn('Workhorse core extras failed',e)),4000),1800);
  };
  if(window.WorkhorseCentralAdpReady)beginCore();
  else window.addEventListener('workhorse:central-adp-ready',beginCore,{once:true});
  setTimeout(beginCore,8000);

  let backgroundBegun=false;
  const beginBackground=()=>{
    if(backgroundBegun)return;backgroundBegun=true;
    idle(()=>loadBatch(backgroundFiles,1).catch(e=>console.warn('Workhorse background features failed',e)),9000);
  };
  setTimeout(beginBackground,10000);
  document.addEventListener('click',e=>{
    if(e.target.closest('.player,.person,.name-line,[data-market-player]'))setTimeout(beginBackground,0);
  },{passive:true});

  let draftBegun=false;
  const beginDraft=()=>{
    if(draftBegun)return;draftBegun=true;
    loadBatch(draftFiles,2).catch(e=>console.warn('Workhorse draft feature batch error',e));
  };
  const draftIsOpen=()=>document.getElementById('page-draft')?.classList.contains('active');
  if(draftIsOpen())beginDraft();
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a,[data-page],[data-tab]');if(!el)return;
    const hint=[el.textContent,el.getAttribute('href'),el.dataset?.page,el.dataset?.tab,el.id].filter(Boolean).join(' ').toLowerCase();
    if(hint.includes('draft'))setTimeout(beginDraft,0);
  },true);
  const draftPage=document.getElementById('page-draft');
  if(draftPage&&typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(draftIsOpen())beginDraft()}).observe(draftPage,{attributes:true,attributeFilter:['class']});
  }

  window.WorkhorseFeatureLoader={loadGeneral:beginCore,loadBackground:beginBackground,loadDraft:beginDraft};
})();

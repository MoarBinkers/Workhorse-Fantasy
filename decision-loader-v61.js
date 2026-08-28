// v61.1 — keep noncritical features off the startup path; load draft code only when Draft is opened.
(()=>{
  const generalFiles=[
    './logo-fix-v291.js?v=301',
    './on-demand-player-search-v88.js?v=882',
    './rank-sync-v38.js?v=395',
    './sleeper-update-status-v40.js?v=402',
    './adp-movement-v49.js?v=495',
    './rankings-news-update-v83.js?v=834',
    './rankings-help-v51.js?v=52',
    './player-tags-cta-v53.js?v=533',
    './tags-upgrade-v59.js?v=60',
    './list-modal-layout-v79.js?v=792',
    './list-delete-v80.js?v=803',
    './smart-search-v62.js?v=622',
    './player-compare-v63.js?v=632',
    './edge-heat-v64.js?v=643',
    './player-fantasy-outlook-v74.js?v=748',
    './mobile-polish-v81.js?v=812',
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
    './round-bands-v61.js?v=615',
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
  async function loadBatch(files,batch=4){
    for(let i=0;i<files.length;i+=batch){
      await Promise.all(files.slice(i,i+batch).map(loadOne));
      await yieldFrame();
    }
  }

  let generalBegun=false;
  const beginGeneral=()=>{
    if(generalBegun)return;generalBegun=true;
    const run=()=>loadBatch(generalFiles,4).catch(e=>console.warn('Workhorse general feature batch error',e));
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});else setTimeout(run,250);
  };
  if(window.WorkhorseCentralAdpReady)beginGeneral();
  else window.addEventListener('workhorse:central-adp-ready',beginGeneral,{once:true});
  setTimeout(beginGeneral,7000);

  let draftBegun=false;
  const beginDraft=()=>{
    if(draftBegun)return;draftBegun=true;
    loadBatch(draftFiles,3).catch(e=>console.warn('Workhorse draft feature batch error',e));
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

  window.WorkhorseFeatureLoader={loadGeneral:beginGeneral,loadDraft:beginDraft};
})();

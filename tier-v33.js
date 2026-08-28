// v33.1 — tier UI plus a lightweight render guard so hidden player pages do not build hundreds of rows at startup.
(function tierUiV33(){
  const install=()=>{
    const rankList=document.getElementById('rankList');
    const native=document.getElementById('addTier');
    if(!rankList||!native)return false;

    const numberedAddTier=()=>{
      if(rankPos==='ALL')return;
      const cfg=tiers[rankPos]||[];
      const id=cfg.length?Math.max(...cfg.map(t=>t.id))+1:1;
      const name='Tier '+(cfg.length+1);
      cfg.push({id,name});
      tiers[rankPos]=cfg;
      save();
      renderRankings();
      editTier(id);
    };
    window.addTier=numberedAddTier;
    native.onclick=numberedAddTier;

    let bar=document.getElementById('centerAddTierBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='centerAddTierBar';
      bar.style.cssText='display:none;justify-content:center;align-items:center;margin:14px 0 10px';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn primary';
      btn.id='centerAddTier';
      btn.textContent='＋ Add Tier';
      btn.style.cssText='min-width:150px;font-weight:900';
      btn.onclick=()=>native.click();
      bar.appendChild(btn);
      rankList.parentNode.insertBefore(bar,rankList);
    }

    const sync=()=>{bar.style.display=getComputedStyle(native).display==='none'?'none':'flex'};
    const putUntieredLast=()=>{
      const untiered=rankList.querySelector(':scope > .tier-drop[data-tier="0"]');
      const realTiers=rankList.querySelectorAll(':scope > .tier-drop:not([data-tier="0"])');
      if(untiered&&realTiers.length&&untiered!==rankList.lastElementChild)rankList.appendChild(untiered);
    };
    const refresh=()=>{sync();putUntieredLast()};

    refresh();
    const nativeObserver=new MutationObserver(refresh);
    nativeObserver.observe(native,{attributes:true,attributeFilter:['style','class']});
    const listObserver=new MutationObserver(()=>requestAnimationFrame(putUntieredLast));
    listObserver.observe(rankList,{childList:true});
    const pills=document.getElementById('rankPills');
    if(pills)pills.addEventListener('click',()=>setTimeout(refresh,0));
    return true;
  };

  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();

// v93 render performance guard. Keep all ranking/ADP data in memory, but do not
// build hidden 250-row pages or eagerly download hundreds of player headshots.
(()=>{
  if(window.__WORKHORSE_RENDER_GUARD_93__)return;
  window.__WORKHORSE_RENDER_GUARD_93__=true;

  const style=document.createElement('style');
  style.id='whRenderGuard93Css';
  style.textContent='#rankList .player,#adpList .player,#draftList .player{content-visibility:auto;contain-intrinsic-size:72px}';
  document.head.appendChild(style);

  const getFn=name=>{try{return window[name]||globalThis[name]||eval(name)}catch(_){return null}};
  const setFn=(name,fn)=>{try{window[name]=fn}catch(_){}try{globalThis[name]=fn}catch(_){}try{eval(name+'=fn')}catch(_){}};

  const lowPriorityImages=html=>typeof html==='string'?html.replace(/<img class="avatar"(?![^>]*\bloading=)/g,'<img class="avatar" loading="lazy" decoding="async" fetchpriority="low"'):html;
  ['rankRow','marketRow'].forEach(name=>{
    const base=getFn(name);if(typeof base!=='function'||base.__wh93Lazy)return;
    const wrapped=function(){return lowPriorityImages(base.apply(this,arguments))};
    wrapped.__wh93Lazy=true;wrapped.__wh93Base=base;setFn(name,wrapped);
  });

  const tuneExisting=()=>document.querySelectorAll('img.avatar').forEach(img=>{
    if(!img.hasAttribute('loading'))img.loading='lazy';
    if(!img.hasAttribute('decoding'))img.decoding='async';
    try{img.fetchPriority='low'}catch(_){}
  });
  tuneExisting();

  function gateRender(name,pageId,listId){
    const base=getFn(name),page=document.getElementById(pageId),list=document.getElementById(listId);
    if(typeof base!=='function'||!page||!list||base.__wh93Gate)return;
    const active=()=>page.classList.contains('active');
    const wrapped=function(){
      if(!active()){page.dataset.wh93Dirty='1';return}
      page.dataset.wh93Dirty='0';
      const out=base.apply(this,arguments);tuneExisting();return out;
    };
    wrapped.__wh93Gate=true;wrapped.__wh93Base=base;setFn(name,wrapped);

    // The base app may have rendered every page before patches run. Drop hidden
    // rows now; their data is still in JS and is rebuilt only when the tab opens.
    if(!active()){
      list.replaceChildren();
      page.dataset.wh93Dirty='1';
    }
    new MutationObserver(()=>{
      if(active()&&page.dataset.wh93Dirty==='1'){
        page.dataset.wh93Dirty='0';
        requestAnimationFrame(()=>{try{base()}catch(e){console.warn('Workhorse deferred '+name+' render failed',e)}tuneExisting()});
      }
    }).observe(page,{attributes:true,attributeFilter:['class']});
  }

  gateRender('renderAdp','page-adp','adpList');
  gateRender('renderDraft','page-draft','draftList');

  const rootObserver=new MutationObserver(tuneExisting);
  rootObserver.observe(document.body,{childList:true,subtree:true});
})();

// v75.8 — helper copy matches the unified Overall/position/tier ranking model.
(()=>{
  const mobileTouch=()=>window.matchMedia?.('(max-width: 820px)').matches&&(navigator.maxTouchPoints||0)>0;
  const copy=mobileTouch()
    ? 'ALL, position ranks, and position tiers are connected. On mobile, press and hold a player card to reorder. Moving a player in ALL updates their position rank and tier placement; moving them in a position tab updates ALL.'
    : 'ALL, position ranks, and position tiers are connected. Moving a player in ALL updates their position rank and tier placement; moving them in a position tab or between tiers updates ALL.';
  const hint=mobileTouch()?'Tap any player card to see more details.':'Click any player card to see more details.';

  function addHint(target,key){
    if(!target)return;
    let el=target.querySelector('[data-player-detail-hint="'+key+'"]');
    if(!el){
      el=document.createElement('div');
      el.dataset.playerDetailHint=key;
      el.style.cssText='margin-top:9px;font-size:14px;font-weight:850;color:#f4f7fa;letter-spacing:.01em;line-height:1.35;';
      const p=target.querySelector(':scope > p')||target.querySelector('p');
      if(p)p.insertAdjacentElement('afterend',el);else target.prepend(el);
    }
    if(el.textContent!==hint)el.textContent=hint;
  }

  const apply=()=>{
    const myHead=document.querySelector('#page-rankings .pagehead');
    const p=myHead?.querySelector('p');
    if(p&&p.textContent!==copy)p.textContent=copy;
    addHint(myHead,'my-rankings');
    addHint(document.querySelector('#page-adp .pagehead'),'current-adp');
  };

  apply();
  [250,900,2200,5000].forEach(ms=>setTimeout(apply,ms));

  if(mobileTouch()&&!window.__WORKHORSE_MOBILE_TOUCH_756__&&!document.querySelector('script[data-mobile-touch-v75]')){
    const s=document.createElement('script');
    s.src='./mobile-touch-v75.js?v=757';
    s.async=false;
    s.dataset.mobileTouchV75='1';
    document.head.appendChild(s);
  }
})();

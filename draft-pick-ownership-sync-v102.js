// v102.2 — keep Live Draft summary and completed roster aligned to traded-pick ownership.
(()=>{
  if(window.__WORKHORSE_DRAFT_PICK_SYNC_102__)return;
  window.__WORKHORSE_DRAFT_PICK_SYNC_102__=true;

  function capital(){try{return window.WorkhorseDraftTradeCapital?.capital?.()||null}catch(_){return null}}
  function currentPick(){
    try{const n=Number(window.DraftEdgeDraftIntelligence?.currentPick?.());if(n>0)return n}catch(_){}
    const txt=document.querySelector('#deDraftRoomSummary .de-draft-card .v')?.textContent||'';
    const n=Number(txt.replace(/[^0-9]/g,''));return n>0?n:null;
  }
  function compactCounts(rows){
    const c={QB:0,RB:0,WR:0,TE:0};
    for(const p of Array.isArray(rows)?rows:[]){const pos=String(p?.metadata?.position||'').toUpperCase();if(pos in c)c[pos]++}
    return Object.entries(c).filter(([,v])=>v>0).map(([k,v])=>k+' '+v).join(' · ')||'—';
  }
  function syncSummary(){
    const c=capital();if(!c?.slot||!Array.isArray(c.owned)||!c.owned.length)return;
    const cur=currentPick()||1,remaining=c.owned.map(x=>Number(x.pickNo)).filter(n=>n>=cur).sort((a,b)=>a-b),next=remaining[0],after=remaining[1];
    const cards=document.querySelectorAll('#deDraftRoomSummary .de-draft-card'),card=cards?.[1];
    if(card){
      const v=card.querySelector('.v'),s=card.querySelector('.s');
      if(next){if(v)v.textContent='#'+next;if(s)s.textContent=next===cur?'You are on the clock':(next-cur)+' picks away'}
      else{if(v)v.textContent='—';if(s)s.textContent='Draft complete'}
    }
    const rosterPanel=[...document.querySelectorAll('#deDraftContext .de-draft-panel')].find(x=>x.querySelector('h3')?.textContent.trim()==='Your Roster');
    if(rosterPanel){
      const small=rosterPanel.querySelector('.small');
      if(small){
        const own=window.DraftEdgeDraftOwnership?.ownPicks?.()||[];
        if(own.length||cur>1)small.innerHTML=small.innerHTML.replace(/<b>Drafted:<\/b>\s*.*?(?=<br><b>Starter slots:)/i,'<b>Drafted:</b> '+compactCounts(own));
        small.innerHTML=small.innerHTML.replace(/<br><b>Pick after this:<\/b>\s*#[0-9]+/i,'');
        if(after)small.insertAdjacentHTML('beforeend','<br><b>Pick after this:</b> #'+after);
      }
    }
  }
  const base=typeof window.renderDraft==='function'?window.renderDraft:null;
  if(base){window.renderDraft=function(){const out=base.apply(this,arguments);queueMicrotask(syncSummary);return out}}
  document.addEventListener('change',e=>{if(e.target?.id==='deDraftSlot')setTimeout(syncSummary,0)});
  window.addEventListener('workhorse:draft-owned-picks-updated',()=>setTimeout(syncSummary,0));
  setTimeout(syncSummary,500);
  window.WorkhorseSyncDraftPickOwnership=syncSummary;
})();

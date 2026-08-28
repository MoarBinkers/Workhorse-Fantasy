// v102.1 — make the main Live Draft summary use the same traded-pick ownership engine as Draft Capital.
(()=>{
  if(window.__WORKHORSE_DRAFT_PICK_SYNC_102__)return;
  window.__WORKHORSE_DRAFT_PICK_SYNC_102__=true;

  function capital(){try{return window.WorkhorseDraftTradeCapital?.capital?.()||null}catch(_){return null}}
  function currentPick(){
    try{const n=Number(window.DraftEdgeDraftIntelligence?.currentPick?.());if(n>0)return n}catch(_){}
    const txt=document.querySelector('#deDraftRoomSummary .de-draft-card .v')?.textContent||'';
    const n=Number(txt.replace(/[^0-9]/g,''));return n>0?n:null;
  }
  function syncSummary(){
    const c=capital();if(!c?.slot||!Array.isArray(c.owned)||!c.owned.length)return;
    const cur=currentPick()||1,remaining=c.owned.map(x=>Number(x.pickNo)).filter(n=>n>=cur).sort((a,b)=>a-b),next=remaining[0],after=remaining[1];
    const cards=document.querySelectorAll('#deDraftRoomSummary .de-draft-card');
    const card=cards?.[1];if(card&&next){
      const v=card.querySelector('.v'),s=card.querySelector('.s');if(v)v.textContent='#'+next;
      if(s)s.textContent=next===cur?'You are on the clock':(next-cur)+' picks away';
    }
    const rosterPanel=[...document.querySelectorAll('#deDraftContext .de-draft-panel')].find(x=>x.querySelector('h3')?.textContent.trim()==='Your Roster');
    if(rosterPanel&&after){
      const small=rosterPanel.querySelector('.small');
      if(small){small.innerHTML=small.innerHTML.replace(/<br><b>Pick after this:<\/b>\s*#[0-9]+/i,'');small.insertAdjacentHTML('beforeend','<br><b>Pick after this:</b> #'+after)}
    }
  }
  const base=typeof window.renderDraft==='function'?window.renderDraft:null;
  if(base){window.renderDraft=function(){const out=base.apply(this,arguments);queueMicrotask(syncSummary);return out}}
  document.addEventListener('change',e=>{if(e.target?.id==='deDraftSlot')setTimeout(syncSummary,0)});
  window.addEventListener('workhorse:draft-ownership-ready',()=>setTimeout(syncSummary,0));
  setTimeout(syncSummary,500);
  window.WorkhorseSyncDraftPickOwnership=syncSummary;
})();

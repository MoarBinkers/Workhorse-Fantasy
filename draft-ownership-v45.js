// v45.2 — authoritative Sleeper ownership mapping and live pick sync for the selected roster.
(()=>{
  const POLL_MS=1000,INPUT_KEY='de34_draft_input';
  let timer=null,draftId='',draftMeta=null,picks=[],busy=false,resolving=false,lastResolve=0,lastSig='';
  const esc45=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureStatus(){let el=document.getElementById('deFastSync43');if(el)return el;const state=document.getElementById('draftState');if(!state)return null;el=document.createElement('div');el.id='deFastSync43';el.className='small';el.style.cssText='margin:-14px 0 14px;color:#91a0ad';el.textContent='Live sync ready';state.insertAdjacentElement('afterend',el);return el}
  function inputValue(){return document.getElementById('draftId')?.value?.trim()||localStorage.getItem(INPUT_KEY)||''}
  function savedDraftId(){try{return String(currentList?.()?.draftPrefs?.draftId||'')}catch(_){return ''}}
  function extractId(raw){const s=String(raw||'').trim(),m=s.match(/\/draft(?:\/nfl)?\/(\d{8,})/i)||s.match(/draft[^0-9]*(\d{8,})/i);return m?.[1]||(s.match(/\b\d{8,}\b/)||[])[0]||''}
  async function resolveDraft(force=false){
    if(resolving)return !!draftId;if(draftId&&!force)return true;if(!force&&Date.now()-lastResolve<2500)return false;lastResolve=Date.now();resolving=true;
    try{
      const id=savedDraftId()||extractId(inputValue());if(!id)return false;
      try{const d=await sleeper('https://api.sleeper.app/v1/draft/'+id);if(d?.draft_id){draftId=String(d.draft_id);draftMeta=d;return true}}catch(_){}
      try{const league=await sleeper('https://api.sleeper.app/v1/league/'+id);if(league?.draft_id){const d=await sleeper('https://api.sleeper.app/v1/draft/'+league.draft_id);if(d?.draft_id){draftId=String(d.draft_id);draftMeta=d;return true}}}catch(_){}
      try{const ds=await sleeper('https://api.sleeper.app/v1/league/'+id+'/drafts');const d=Array.isArray(ds)?(ds.find(x=>x.status==='drafting')||ds.find(x=>x.status==='pre_draft')||ds[0]):null;if(d?.draft_id){draftId=String(d.draft_id);draftMeta=d;return true}}catch(_){}
      return false;
    }finally{resolving=false}
  }
  function selectedSlot(){const ui=Number(document.getElementById('deDraftSlot')?.value||0);if(ui>0)return ui;if(draftId){let listSlot=0;try{listSlot=Number(currentList?.()?.draftPrefs?.slot||0)}catch(_){}const saved=Number(localStorage.getItem('de41_draft_slot:'+draftId)||listSlot||0);if(saved>0)return saved}return null}
  function userIdsForSlot(slot){if(!slot)return [];return Object.entries(draftMeta?.draft_order||{}).filter(([,s])=>Number(s)===Number(slot)).map(([uid])=>String(uid))}
  function rosterForSlot(slot){const map=draftMeta?.slot_to_roster_id||{},v=map[String(slot)]??map[slot];return v==null?'':String(v)}
  function isOwnPick(p,slot){
    if(!slot||!p)return false;
    const myRoster=rosterForSlot(slot),pickRoster=String(p.roster_id||'').trim();
    // Sleeper documents roster_id as the roster the completed pick goes to. For
    // traded picks this is the authoritative owner; draft_slot is only the board column.
    if(myRoster&&pickRoster)return pickRoster===myRoster;
    const users=userIdsForSlot(slot),pickedBy=String(p.picked_by||'').trim();
    if(pickedBy&&users.length)return users.includes(pickedBy);
    return Number(p.draft_slot)===Number(slot);
  }
  function ownPicks(){const slot=selectedSlot();return slot?picks.filter(p=>isOwnPick(p,slot)).sort((a,b)=>(Number(a.pick_no)||0)-(Number(b.pick_no)||0)):[]}
  function playerName(p){const m=p?.metadata||{},name=[m.first_name,m.last_name].filter(Boolean).join(' ').trim();if(name)return name;const id=String(p?.player_id||'');try{const mine=players.find(x=>String(marketFor(x)?.id||x.sleeperId||x.id||'')===id);if(mine?.name)return mine.name}catch(_){}return 'Player '+id}
  function ensurePanel(){let root=document.getElementById('deMyPicks43');if(root)return root;const ctx=document.getElementById('deDraftContext');if(!ctx)return null;root=document.createElement('div');root.id='deMyPicks43';root.className='de-draft-panel';root.style.margin='0 0 14px';ctx.insertAdjacentElement('afterend',root);return root}
  function renderOwnPicks(){const root=ensurePanel();if(!root)return;const slot=selectedSlot();if(!draftId){root.innerHTML='<h3>Your Picks</h3><div class="small">Connect a Sleeper draft to track your picks.</div>';return}if(!slot){root.innerHTML='<h3>Your Picks</h3><div class="small">Choose your draft slot above so Workhorse knows which picks are yours.</div>';return}const mine=ownPicks(),users=userIdsForSlot(slot);root.innerHTML='<h3>Your Picks · Draft Slot '+slot+'</h3><div class="small" style="margin-bottom:8px">'+(users.length?'Matched to your Sleeper roster, including traded picks.':'Matched directly from Sleeper roster ownership.')+'</div>'+(mine.length?mine.map(p=>{const m=p.metadata||{};return '<div class="de-pick-row"><span><b>#'+(Number(p.pick_no)||'—')+' · '+esc45(playerName(p))+'</b></span><span>'+esc45(String(m.position||''))+(m.team?' · '+esc45(m.team):'')+'</span></div>'}).join(''):'<div class="small">No picks owned by your selected roster yet.</div>')}
  function reconcile(){if(!Array.isArray(players)||!draftId)return false;const picked=new Map(picks.map(p=>[String(p.player_id),p])),mine=new Set(ownPicks().map(p=>String(p.player_id)));let changed=false;players.forEach(p=>{let id='';try{id=String(marketFor(p)?.id||p.sleeperId||p.id||'')}catch(_){}if(!id)return;const pick=picked.get(id);if(pick){const byMe=mine.has(id);if(!p.drafted||p.draftedSource!=='sleeper'||p.draftedDraftId!==draftId||Number(p.draftedPickNo)!==Number(pick.pick_no)||!!p.draftedByMe!==byMe)changed=true;p.drafted=true;p.draftedSource='sleeper';p.draftedDraftId=draftId;p.draftedPickNo=Number(pick.pick_no)||null;p.draftedByMe=byMe;p.draftedAt=p.draftedAt||Date.now()}else if(p.draftedSource==='sleeper'&&p.draftedDraftId===draftId){p.drafted=false;p.draftedSource=null;p.draftedDraftId=null;p.draftedPickNo=null;p.draftedByMe=false;p.draftedAt=null;changed=true}});if(changed){try{save()}catch(_){};try{renderTagDrawer()}catch(_){};try{renderDraft()}catch(_){};try{if(document.getElementById('draftedModal')?.classList.contains('open'))renderDraftedModal()}catch(_){}}return changed}
  function status(text,bad=false){const el=ensureStatus();if(!el)return;el.textContent=text;el.style.color=bad?'#f0a2ad':'#91a0ad'}
  function signature(arr){return arr.map(p=>[p.pick_no,p.player_id,p.picked_by,p.roster_id,p.draft_slot].join(':')).join('|')}
  async function tick(){if(busy)return;busy=true;try{if(!draftId&&!(await resolveDraft(false))){renderOwnPicks();return}const latest=await sleeper('https://api.sleeper.app/v1/draft/'+draftId+'/picks');if(!Array.isArray(latest))throw new Error('Invalid Sleeper picks response');const next=signature(latest),changed=next!==lastSig;picks=latest;lastSig=next;renderOwnPicks();reconcile();status('● Live sync · Sleeper picks checked about every 1 second');if(changed){try{if(typeof window.pollDraft==='function')await window.pollDraft()}catch(_){};try{window.WorkhorseDraftTradeCapital?.refresh?.()}catch(_){};renderOwnPicks()}}catch(e){status('Live sync reconnecting automatically…',true);if(Date.now()-lastResolve>4000){draftId='';draftMeta=null}}finally{busy=false}}
  function start(){clearInterval(timer);timer=setInterval(tick,POLL_MS);tick()}
  function install(){ensureStatus();const connect=document.getElementById('connectDraft'),stop=document.getElementById('stopDraft'),slot=document.getElementById('deDraftSlot');if(!connect)return false;if(!connect.dataset.de45Wrapped){connect.addEventListener('click',()=>setTimeout(async()=>{draftId='';draftMeta=null;picks=[];lastSig='';await resolveDraft(true);start()},150));connect.dataset.de45Wrapped='1'}if(stop&&!stop.dataset.de45Wrapped){stop.addEventListener('click',()=>{clearInterval(timer);timer=null;draftId='';draftMeta=null;picks=[];lastSig='';renderOwnPicks()});stop.dataset.de45Wrapped='1'}if(slot&&!slot.dataset.de45Wrapped){slot.addEventListener('change',()=>{renderOwnPicks();reconcile()});slot.dataset.de45Wrapped='1'}return true}
  if(!install()){const ob=new MutationObserver(()=>{if(install())ob.disconnect()});ob.observe(document.documentElement,{childList:true,subtree:true})}
  setTimeout(async()=>{await resolveDraft(true).catch(()=>false);start()},1100);
  window.DraftEdgeDraftOwnership={tick,start,ownPicks:()=>ownPicks(),selectedSlot,rosterForSlot};
})();
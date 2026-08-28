// v98.2 — resilient Sleeper draft-pick ownership before and during the draft.
(()=>{
  if(window.__WORKHORSE_DRAFT_TRADE_CAPITAL_98__)return;
  window.__WORKHORSE_DRAFT_TRADE_CAPITAL_98__=true;

  const INPUT_KEY='de34_draft_input';
  const POLL_MS=15000;
  let state={draft:null,league:null,rosters:[],picks:[],traded:[],lastSig:'',lastChecked:0,timer:null,busy:false,source:{draft:0,league:0,inferred:0}};

  const esc98=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async url=>{
    if(typeof window.sleeper==='function')return window.sleeper(url);
    const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Sleeper HTTP '+r.status);return r.json();
  };
  const extractId=raw=>{
    const s=String(raw||'').trim();
    const m=s.match(/\/draft(?:\/nfl)?\/(\d{8,})/i)||s.match(/draft[^0-9]*(\d{8,})/i)||s.match(/\b\d{8,}\b/);
    return m?.[1]||m?.[0]||'';
  };

  async function resolve(raw){
    const id=extractId(raw);if(!id)throw new Error('No Sleeper draft or league ID found.');
    try{
      const draft=await api('https://api.sleeper.app/v1/draft/'+id);
      if(draft?.draft_id){
        let league=null;if(draft.league_id)try{league=await api('https://api.sleeper.app/v1/league/'+draft.league_id)}catch(_){}
        return {draft,league};
      }
    }catch(_){}
    const league=await api('https://api.sleeper.app/v1/league/'+id);
    if(!league)throw new Error('Sleeper league not found.');
    let draft=null;
    if(league.draft_id)try{draft=await api('https://api.sleeper.app/v1/draft/'+league.draft_id)}catch(_){}
    if(!draft){
      const drafts=await api('https://api.sleeper.app/v1/league/'+id+'/drafts');
      if(Array.isArray(drafts))draft=drafts.find(x=>x.status==='drafting')||drafts.find(x=>x.status==='pre_draft')||drafts[0]||null;
    }
    if(!draft?.draft_id)throw new Error('No Sleeper draft exists for this league yet.');
    return {draft,league};
  }

  function injectCss(){
    if(document.getElementById('de98TradeCss'))return;
    const s=document.createElement('style');s.id='de98TradeCss';s.textContent=`
      #de98DraftCapital{margin:0 0 14px;border:1px solid #293a49;background:#0e161e;border-radius:14px;padding:13px}
      .de98-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.de98-head h3{margin:0;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8fa0af}.de98-refresh{border:1px solid #304352;background:#111b24;color:#aebbc6;border-radius:8px;padding:6px 9px;font-size:9px;font-weight:900;cursor:pointer}.de98-refresh:hover{border-color:#4d687b;color:#d6e6f0}.de98-refresh:disabled{opacity:.55;cursor:default}
      .de98-summary{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}.de98-chip{font-size:9px;font-weight:900;padding:4px 7px;border-radius:7px;border:1px solid #304352;background:#111a22;color:#a6b5c1}.de98-chip.in{border-color:#346b4b;background:#102018;color:#78e3a4}.de98-chip.out{border-color:#74434a;background:#28171a;color:#ff9eaa}
      .de98-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.de98-section{min-width:0}.de98-title{font-size:9px;font-weight:950;letter-spacing:.07em;text-transform:uppercase;color:#8293a2;margin:0 0 5px}.de98-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #1e2b36;font-size:11px}.de98-row:last-child{border-bottom:0}.de98-pick{font-weight:950;color:#dce7ef}.de98-detail{font-size:9px;color:#8697a5;text-align:right}.de98-acquired{color:#6ee7a1}.de98-away{color:#ff9eaa;text-decoration:line-through;text-decoration-thickness:1px}.de98-empty{font-size:10px;color:#788895;line-height:1.5}.de98-alert{margin-bottom:9px;padding:7px 9px;border:1px solid #5d7340;border-radius:8px;background:#172011;color:#bde789;font-size:10px;font-weight:850}.de98-foot{margin-top:8px;font-size:9px;color:#71808c}
      @media(max-width:720px){.de98-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function ensurePanel(){
    injectCss();
    let panel=document.getElementById('de98DraftCapital');if(panel)return panel;
    const ctx=document.getElementById('deDraftContext'),list=document.getElementById('draftList');
    if(!ctx&&!list)return null;
    panel=document.createElement('div');panel.id='de98DraftCapital';
    if(ctx)ctx.insertAdjacentElement('afterend',panel);else list.parentNode?.insertBefore(panel,list);
    panel.addEventListener('click',e=>{if(e.target.closest('[data-de98-refresh]'))refresh(true)});
    return panel;
  }

  function teams(){return Math.max(1,Number(state.draft?.settings?.teams)||Number(state.league?.total_rosters)||0)}
  function rounds(){return Math.max(1,Number(state.draft?.settings?.rounds)||0)}
  function season(){return String(state.draft?.season||state.league?.season||'')}
  function selectedSlot(){
    const ui=Number(document.getElementById('deDraftSlot')?.value||0);if(ui>0)return ui;
    const draftId=String(state.draft?.draft_id||'');
    let listSlot=0;try{listSlot=Number(window.currentList?.()?.draftPrefs?.slot||0)}catch(_){}
    const saved=draftId?Number(localStorage.getItem('de41_draft_slot:'+draftId)||listSlot||0):listSlot;
    return saved>0?saved:0;
  }
  function userIdsForSlot(slot){
    const order=state.draft?.draft_order||{};
    return Object.entries(order).filter(([,s])=>Number(s)===Number(slot)).map(([uid])=>String(uid));
  }
  function rosterMatchesUser(r,userIds){
    if(!r||!userIds.length)return false;
    if(r.owner_id&&userIds.includes(String(r.owner_id)))return true;
    return Array.isArray(r.co_owners)&&r.co_owners.some(x=>userIds.includes(String(x)));
  }
  function rosterForSlot(slot){
    const m=state.draft?.slot_to_roster_id||{},direct=m[String(slot)]??m[slot];
    if(direct!=null&&String(direct)!=='')return String(direct);
    const users=userIdsForSlot(slot);if(users.length){
      const hit=state.rosters.find(r=>rosterMatchesUser(r,users));
      if(hit?.roster_id!=null)return String(hit.roster_id);
    }
    return '';
  }
  function slotForRoster(roster){
    const wanted=String(roster||'');if(!wanted)return 0;
    const m=state.draft?.slot_to_roster_id||{};
    for(const [slot,rid] of Object.entries(m))if(String(rid)===wanted)return Number(slot)||0;
    const r=state.rosters.find(x=>String(x?.roster_id)===wanted);
    if(r){
      const ownerIds=[r.owner_id,...(Array.isArray(r.co_owners)?r.co_owners:[])].filter(Boolean).map(String);
      const order=state.draft?.draft_order||{};
      for(const [uid,slot] of Object.entries(order))if(ownerIds.includes(String(uid)))return Number(slot)||0;
    }
    return 0;
  }
  function withinRoundForSlot(slot,round){const n=teams();return state.draft?.type==='snake'&&Number(round)%2===0?n-Number(slot)+1:Number(slot)}
  function pickNo(round,slot){return (Number(round)-1)*teams()+withinRoundForSlot(slot,round)}
  function pickLabel(no){const n=teams(),r=Math.floor((Number(no)-1)/n)+1,w=((Number(no)-1)%n)+1;return r+'.'+String(w).padStart(2,'0')}

  function mergeTraded(draftRows,leagueRows,picks){
    const currentSeason=season(),map=new Map(),validRoster=new Set(state.rosters.map(r=>String(r?.roster_id)).filter(Boolean));
    const ingest=(rows,priority,source,strictSeason)=>{
      for(const t of Array.isArray(rows)?rows:[]){
        const round=Number(t?.round),original=String(t?.roster_id??''),owner=String(t?.owner_id??'');
        if(!round||!original||!owner)continue;
        if(strictSeason&&currentSeason&&t?.season&&String(t.season)!==currentSeason)continue;
        if(validRoster.size&&(!validRoster.has(original)||!validRoster.has(owner)))continue;
        const key=round+'|'+original,prev=map.get(key);
        if(!prev||priority>=prev._priority)map.set(key,{...t,round,roster_id:original,owner_id:owner,_priority:priority,_source:source});
      }
    };
    // Draft-level ownership is authoritative for this exact draft and must never
    // be discarded because of a season-string mismatch.
    ingest(draftRows,4,'draft',false);
    ingest(leagueRows,2,'league',true);

    // Once a traded pick has actually been made, Sleeper's pick payload is the
    // strongest proof of ownership. Use it as a fallback/confirmation.
    for(const p of Array.isArray(picks)?picks:[]){
      const round=Number(p?.round),slot=Number(p?.draft_slot),owner=String(p?.roster_id??'');
      if(!round||!slot||!owner)continue;
      const original=rosterForSlot(slot);if(!original||original===owner)continue;
      const key=round+'|'+original,prev=map.get(key);
      if(!prev||5>=prev._priority)map.set(key,{season:currentSeason,round,roster_id:original,previous_owner_id:original,owner_id:owner,_priority:5,_source:'pick'});
    }
    const out=[...map.values()].map(({_priority,...x})=>x);
    state.source={draft:Array.isArray(draftRows)?draftRows.length:0,league:Array.isArray(leagueRows)?leagueRows.length:0,inferred:out.filter(x=>x._source==='pick').length};
    return out;
  }
  function ownerFor(round,originalRoster){
    let owner=String(originalRoster||'');
    for(const t of state.traded)if(Number(t.round)===Number(round)&&String(t.roster_id)===String(originalRoster))owner=String(t.owner_id||owner);
    return owner;
  }
  function capital(){
    const slot=selectedSlot(),myRoster=rosterForSlot(slot),n=teams(),rs=rounds();
    if(!slot||!myRoster||!n||!rs)return {owned:[],acquired:[],away:[],myRoster,slot};
    const owned=[],acquired=[],away=[];
    for(let round=1;round<=rs;round++){
      for(let originalSlot=1;originalSlot<=n;originalSlot++){
        const originalRoster=rosterForSlot(originalSlot);if(!originalRoster)continue;
        const owner=ownerFor(round,originalRoster),no=pickNo(round,originalSlot);
        const item={round,originalSlot,originalRoster,owner,pickNo:no,label:pickLabel(no),ownerSlot:slotForRoster(owner)};
        if(owner===myRoster){owned.push(item);if(originalRoster!==myRoster)acquired.push(item)}
        if(originalRoster===myRoster&&owner!==myRoster)away.push(item);
      }
    }
    owned.sort((a,b)=>a.pickNo-b.pickNo);acquired.sort((a,b)=>a.pickNo-b.pickNo);away.sort((a,b)=>a.pickNo-b.pickNo);
    return {owned,acquired,away,myRoster,slot};
  }
  function tradeSig(rows){return rows.map(t=>[t.season,t.round,t.roster_id,t.owner_id].join(':')).sort().join('|')}

  function render(changed=false){
    const panel=ensurePanel();if(!panel)return;
    const input=document.getElementById('draftId')?.value||localStorage.getItem(INPUT_KEY)||'';
    if(!state.draft){
      panel.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Check Sleeper</button></div><div class="de98-empty">'+(input?'Connect the Sleeper draft above to load traded picks.':'Paste a Sleeper draft or league ID above. Workhorse will show acquired and traded-away picks here before and during the draft.')+'</div>';
      return;
    }
    const slot=selectedSlot();
    if(!slot){
      panel.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Refresh</button></div><div class="de98-empty">Choose <b>Your draft slot</b> above. Workhorse already has Sleeper’s current pick ownership and will identify which picks you acquired or traded away.</div><div class="de98-foot">'+esc98(state.draft?.status||'Connected')+' · '+state.traded.length+' traded-pick ownership record'+(state.traded.length===1?'':'s')+'</div>';
      return;
    }
    const cap=capital(),intelCurrent=window.DraftEdgeDraftIntelligence?.currentPick?.(),current=Number(intelCurrent)||((state.picks||[]).reduce((m,p)=>Math.max(m,Number(p.pick_no)||0),0)+1)||1;
    const upcoming=cap.owned.filter(x=>x.pickNo>=current).slice(0,8),acquiredSet=new Set(cap.acquired.map(x=>x.pickNo));
    const ownedRows=upcoming.length?upcoming.map(x=>'<div class="de98-row"><span class="de98-pick '+(acquiredSet.has(x.pickNo)?'de98-acquired':'')+'">'+esc98(x.label)+'</span><span class="de98-detail">'+(acquiredSet.has(x.pickNo)?'Acquired from Slot '+x.originalSlot:'Original pick')+'</span></div>').join(''):'<div class="de98-empty">No remaining picks detected.</div>';
    const moves=[...cap.acquired.map(x=>({...x,type:'in'})),...cap.away.map(x=>({...x,type:'out'}))].sort((a,b)=>a.pickNo-b.pickNo);
    const moveRows=moves.length?moves.map(x=>'<div class="de98-row"><span class="de98-pick '+(x.type==='in'?'de98-acquired':'de98-away')+'">'+esc98(x.label)+'</span><span class="de98-detail">'+(x.type==='in'?'Acquired · from Slot '+x.originalSlot:'Traded away · now Slot '+(x.ownerSlot||'?'))+'</span></div>').join(''):'<div class="de98-empty">No traded picks mapped to your slot yet.</div>';
    const sourceText='Sleeper trade records: draft '+state.source.draft+' · league '+state.source.league+(state.source.inferred?' · '+state.source.inferred+' confirmed from live picks':'');
    panel.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh '+(state.busy?'disabled':'')+'>'+(state.busy?'Checking…':'Refresh')+'</button></div>'+
      (changed?'<div class="de98-alert">Sleeper pick ownership changed — your draft capital was updated.</div>':'')+
      '<div class="de98-summary"><span class="de98-chip">'+cap.owned.length+' picks owned</span><span class="de98-chip in">+'+cap.acquired.length+' acquired</span><span class="de98-chip out">−'+cap.away.length+' traded away</span></div>'+
      '<div class="de98-grid"><div class="de98-section"><div class="de98-title">Your Upcoming Picks</div>'+ownedRows+'</div><div class="de98-section"><div class="de98-title">Pick Trades</div>'+moveRows+'</div></div>'+
      '<div class="de98-foot">'+sourceText+' · auto-refreshes every 15 seconds</div>';
  }

  async function refresh(force=false){
    if(state.busy)return;state.busy=true;render(false);
    try{
      const raw=document.getElementById('draftId')?.value||localStorage.getItem(INPUT_KEY)||'';
      const resolved=state.draft&&!force?{draft:state.draft,league:state.league}:await resolve(raw);
      state.draft=resolved.draft||state.draft;state.league=resolved.league||state.league;
      const draftId=String(state.draft?.draft_id||'');if(!draftId)throw new Error('Draft ID unavailable.');
      const leagueId=String(state.draft?.league_id||state.league?.league_id||'');
      const [freshDraft,draftTraded,leagueTraded,rosters,picks]=await Promise.all([
        api('https://api.sleeper.app/v1/draft/'+draftId).catch(()=>state.draft),
        api('https://api.sleeper.app/v1/draft/'+draftId+'/traded_picks').catch(()=>[]),
        leagueId?api('https://api.sleeper.app/v1/league/'+leagueId+'/traded_picks').catch(()=>[]):Promise.resolve([]),
        leagueId?api('https://api.sleeper.app/v1/league/'+leagueId+'/rosters').catch(()=>state.rosters):Promise.resolve(state.rosters),
        api('https://api.sleeper.app/v1/draft/'+draftId+'/picks').catch(()=>state.picks)
      ]);
      state.draft=freshDraft||state.draft;state.rosters=Array.isArray(rosters)?rosters:[];state.picks=Array.isArray(picks)?picks:[];
      const merged=mergeTraded(draftTraded,leagueTraded,state.picks),sig=tradeSig(merged),changed=!!state.lastSig&&sig!==state.lastSig;
      state.traded=merged;state.lastSig=sig;state.lastChecked=Date.now();render(changed);
    }catch(e){
      const panel=ensurePanel();if(panel)panel.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Retry</button></div><div class="de98-empty">Could not refresh Sleeper traded picks: '+esc98(e.message)+'</div>';
    }finally{state.busy=false}
  }

  function start(){ensurePanel();if(state.timer)clearInterval(state.timer);setTimeout(()=>refresh(true),350);state.timer=setInterval(()=>refresh(false),POLL_MS)}
  function stop(){if(state.timer)clearInterval(state.timer);state.timer=null}

  document.addEventListener('click',e=>{
    if(e.target.closest('#connectDraft'))setTimeout(start,550);
    if(e.target.closest('#stopDraft')){stop();state={draft:null,league:null,rosters:[],picks:[],traded:[],lastSig:'',lastChecked:0,timer:null,busy:false,source:{draft:0,league:0,inferred:0}};setTimeout(()=>render(false),0)}
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='deDraftSlot')render(false)});

  ensurePanel();render(false);
  window.WorkhorseDraftTradeCapital={refresh:()=>refresh(true),render,capital:()=>capital(),selectedSlot,rosterForSlot,slotForRoster};
})();

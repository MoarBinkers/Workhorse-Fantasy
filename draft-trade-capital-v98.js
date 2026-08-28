// v98.5 — resilient Sleeper draft-pick ownership with durable draft-specific overrides.
(()=>{
  if(window.__WORKHORSE_DRAFT_TRADE_CAPITAL_985__)return;
  window.__WORKHORSE_DRAFT_TRADE_CAPITAL_985__=true;

  const INPUT_KEY='de34_draft_input';
  const POLL_MS=15000;
  let state={
    draft:null,league:null,rosters:[],picks:[],traded:[],lastSig:'',timer:null,busy:false,
    durableOverrides:[],overrideDraftId:'',
    source:{draft:0,league:0,inferred:0,overrides:0}
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async url=>{
    if(typeof window.sleeper==='function')return window.sleeper(url);
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error('Sleeper HTTP '+r.status);
    return r.json();
  };
  const extractId=raw=>{
    const s=String(raw||'').trim();
    const m=s.match(/\/draft(?:\/nfl)?\/(\d{8,})/i)||s.match(/draft[^0-9]*(\d{8,})/i)||s.match(/\b\d{8,}\b/);
    return m?.[1]||m?.[0]||'';
  };
  function prefs(){try{return currentList?.()?.draftPrefs||{}}catch(_){return {}}}
  function savedSource(){
    const dom=document.getElementById('draftId')?.value?.trim();
    if(dom)return dom;
    const p=prefs();
    if(p.draftId)return String(p.draftId);
    if(p.input)return String(p.input);
    return localStorage.getItem(INPUT_KEY)||'';
  }
  function normalizeOverrides(rows){
    return (Array.isArray(rows)?rows:[]).map(x=>({
      round:Number(x?.round)||0,
      originalSlot:Number(x?.originalSlot??x?.original_slot)||0,
      ownerSlot:Number(x?.ownerSlot??x?.owner_slot)||0
    })).filter(x=>x.round>0&&x.originalSlot>0&&x.ownerSlot>0);
  }
  function pickOverrides(){
    const activeId=String(state.draft?.draft_id||extractId(savedSource())||'');
    const p=prefs();
    const prefsDraftId=String(p.draftId||extractId(p.input)||'');
    const localRows=(!prefsDraftId||!activeId||prefsDraftId===activeId)?normalizeOverrides(p.pickOverrides):[];
    const durableRows=state.overrideDraftId===activeId?normalizeOverrides(state.durableOverrides):[];
    const map=new Map();
    for(const x of localRows)map.set(x.round+'|'+x.originalSlot,x);
    for(const x of durableRows)map.set(x.round+'|'+x.originalSlot,x);
    return [...map.values()];
  }
  function overrideOwnerSlot(round,originalSlot){
    return pickOverrides().find(x=>x.round===Number(round)&&x.originalSlot===Number(originalSlot))?.ownerSlot||0;
  }
  async function loadDurableOverrides(draftId){
    const did=String(draftId||'');
    state.overrideDraftId=did;
    state.durableOverrides=[];
    if(!did)return [];
    try{
      let client=null,user=null;
      try{client=typeof supabaseClient!=='undefined'?supabaseClient:window.supabaseClient}catch(_){client=window.supabaseClient}
      try{user=typeof currentUser!=='undefined'?currentUser:window.currentUser}catch(_){user=window.currentUser}
      if(!client?.from)return [];
      let uid=user?.id||'';
      if(!uid&&client.auth?.getUser){
        try{const {data}=await client.auth.getUser();uid=data?.user?.id||''}catch(_){}
      }
      if(!uid)return [];
      const {data,error}=await client.from('draft_pick_overrides')
        .select('round,original_slot,owner_slot')
        .eq('user_id',uid)
        .eq('draft_id',did)
        .order('round',{ascending:true})
        .order('original_slot',{ascending:true});
      if(error)throw error;
      state.durableOverrides=normalizeOverrides(data);
      return state.durableOverrides;
    }catch(e){
      console.warn('Workhorse durable pick overrides unavailable',e);
      return [];
    }
  }

  async function resolve(raw=savedSource()){
    const id=extractId(raw);
    if(!id)throw new Error('No Sleeper draft or league ID found.');
    try{
      const d=await api('https://api.sleeper.app/v1/draft/'+id);
      if(d?.draft_id){
        let l=null;
        if(d.league_id)try{l=await api('https://api.sleeper.app/v1/league/'+d.league_id)}catch(_){}
        return {draft:d,league:l};
      }
    }catch(_){}
    const l=await api('https://api.sleeper.app/v1/league/'+id);
    if(!l)throw new Error('Sleeper league not found.');
    let d=null;
    if(l.draft_id)try{d=await api('https://api.sleeper.app/v1/draft/'+l.draft_id)}catch(_){}
    if(!d){
      const ds=await api('https://api.sleeper.app/v1/league/'+id+'/drafts');
      if(Array.isArray(ds))d=ds.find(x=>x.status==='drafting')||ds.find(x=>x.status==='pre_draft')||ds[0]||null;
    }
    if(!d?.draft_id)throw new Error('No Sleeper draft exists for this league yet.');
    return {draft:d,league:l};
  }

  function css(){
    if(document.getElementById('de98TradeCss'))return;
    const s=document.createElement('style');s.id='de98TradeCss';s.textContent=`
      #de98DraftCapital{margin:0 0 14px;border:1px solid #293a49;background:#0e161e;border-radius:14px;padding:13px}
      .de98-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.de98-head h3{margin:0;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8fa0af}.de98-refresh{border:1px solid #304352;background:#111b24;color:#aebbc6;border-radius:8px;padding:6px 9px;font-size:9px;font-weight:900;cursor:pointer}
      .de98-summary{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}.de98-chip{font-size:9px;font-weight:900;padding:4px 7px;border-radius:7px;border:1px solid #304352;background:#111a22;color:#a6b5c1}.de98-chip.in,.de98-acquired{color:#78e3a4}.de98-chip.in{border-color:#346b4b;background:#102018}.de98-chip.out,.de98-away{color:#ff9eaa}.de98-chip.out{border-color:#74434a;background:#28171a}
      .de98-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.de98-title{font-size:9px;font-weight:950;letter-spacing:.07em;text-transform:uppercase;color:#8293a2;margin:0 0 5px}.de98-row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #1e2b36;font-size:11px}.de98-pick{font-weight:950}.de98-detail{font-size:9px;color:#8697a5;text-align:right}.de98-away{text-decoration:line-through}.de98-empty,.de98-foot{font-size:10px;color:#788895;line-height:1.5}.de98-foot{margin-top:8px;font-size:9px}.de98-alert{margin-bottom:9px;padding:7px 9px;border:1px solid #5d7340;border-radius:8px;background:#172011;color:#bde789;font-size:10px;font-weight:850}
      @media(max-width:720px){.de98-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function panel(){
    css();
    let p=document.getElementById('de98DraftCapital');if(p)return p;
    const ctx=document.getElementById('deDraftContext'),list=document.getElementById('draftList');
    if(!ctx&&!list)return null;
    p=document.createElement('div');p.id='de98DraftCapital';
    (ctx||list).insertAdjacentElement(ctx?'afterend':'beforebegin',p);
    p.onclick=e=>{if(e.target.closest('[data-de98-refresh]'))refresh(true)};
    return p;
  }

  function teams(){return Math.max(1,Number(state.draft?.settings?.teams)||Number(state.league?.total_rosters)||0)}
  function rounds(){return Math.max(1,Number(state.draft?.settings?.rounds)||0)}
  function season(){return String(state.draft?.season||state.league?.season||'')}
  function selectedSlot(){
    const ui=Number(document.getElementById('deDraftSlot')?.value)||0;if(ui)return ui;
    const did=String(state.draft?.draft_id||'');
    try{return Number(localStorage.getItem('de41_draft_slot:'+did)||prefs().slot||0)||0}catch(_){return 0}
  }
  function userIdsForSlot(slot){
    return Object.entries(state.draft?.draft_order||{}).filter(([,s])=>Number(s)===Number(slot)).map(([u])=>String(u));
  }
  function rosterForSlot(slot){
    const m=state.draft?.slot_to_roster_id||{},direct=m[String(slot)]??m[slot];
    if(direct!=null&&String(direct)!=='')return String(direct);
    const users=userIdsForSlot(slot);
    const hit=state.rosters.find(r=>users.includes(String(r?.owner_id||''))||(r?.co_owners||[]).some(x=>users.includes(String(x))));
    return hit?.roster_id!=null?String(hit.roster_id):'';
  }
  function slotForRoster(roster){
    for(const [s,r] of Object.entries(state.draft?.slot_to_roster_id||{}))if(String(r)===String(roster))return Number(s)||0;
    return 0;
  }
  function within(slot,round){const n=teams();return state.draft?.type==='snake'&&round%2===0?n-slot+1:slot}
  function pickNo(round,slot){return (round-1)*teams()+within(slot,round)}
  function label(no){const n=teams(),r=Math.floor((no-1)/n)+1,w=((no-1)%n)+1;return r+'.'+String(w).padStart(2,'0')}

  function merge(draftRows,leagueRows,picks){
    const map=new Map(),valid=new Set(state.rosters.map(r=>String(r?.roster_id)).filter(Boolean)),yr=season();
    const ingest=(rows,priority,source,strictSeason)=>{
      for(const t of Array.isArray(rows)?rows:[]){
        const round=Number(t?.round),orig=String(t?.roster_id??''),owner=String(t?.owner_id??'');
        if(!round||!orig||!owner)continue;
        if(strictSeason&&yr&&t?.season&&String(t.season)!==yr)continue;
        if(valid.size&&(!valid.has(orig)||!valid.has(owner)))continue;
        const k=round+'|'+orig,prev=map.get(k);
        if(!prev||priority>=prev.p)map.set(k,{...t,round,roster_id:orig,owner_id:owner,p:priority,source});
      }
    };
    ingest(draftRows,4,'draft',false);
    ingest(leagueRows,2,'league',true);
    for(const p of Array.isArray(picks)?picks:[]){
      const round=Number(p?.round),slot=Number(p?.draft_slot),owner=String(p?.roster_id??''),orig=rosterForSlot(slot);
      if(!round||!slot||!owner||!orig||orig===owner)continue;
      const k=round+'|'+orig,prev=map.get(k);
      if(!prev||5>=prev.p)map.set(k,{season:yr,round,roster_id:orig,previous_owner_id:orig,owner_id:owner,p:5,source:'pick'});
    }
    const out=[...map.values()].map(({p,...x})=>x);
    state.source={draft:Array.isArray(draftRows)?draftRows.length:0,league:Array.isArray(leagueRows)?leagueRows.length:0,inferred:out.filter(x=>x.source==='pick').length,overrides:pickOverrides().length};
    return out;
  }
  function ownerFor(round,orig){
    return String(state.traded.find(t=>Number(t.round)===round&&String(t.roster_id)===String(orig))?.owner_id??orig);
  }
  function capital(){
    const slot=selectedSlot(),mine=rosterForSlot(slot),n=teams(),rs=rounds();
    if(!slot||!n||!rs)return {owned:[],acquired:[],away:[],myRoster:mine,slot};
    const owned=[],acquired=[],away=[];
    for(let r=1;r<=rs;r++)for(let s=1;s<=n;s++){
      const orig=rosterForSlot(s);
      const forcedOwnerSlot=overrideOwnerSlot(r,s);
      const apiOwner=orig?ownerFor(r,orig):'';
      const apiOwnerSlot=apiOwner?slotForRoster(apiOwner):0;
      const ownerSlot=forcedOwnerSlot||apiOwnerSlot||s;
      const owner=rosterForSlot(ownerSlot)||apiOwner||orig||('slot:'+ownerSlot);
      const no=pickNo(r,s);
      const x={round:r,originalSlot:s,originalRoster:orig,owner,pickNo:no,label:label(no),ownerSlot,overridden:!!forcedOwnerSlot};
      const isMine=ownerSlot===slot||(mine&&owner===mine),wasMine=s===slot;
      if(isMine){owned.push(x);if(s!==slot)acquired.push(x)}
      if(wasMine&&!isMine)away.push(x);
    }
    owned.sort((a,b)=>a.pickNo-b.pickNo);acquired.sort((a,b)=>a.pickNo-b.pickNo);away.sort((a,b)=>a.pickNo-b.pickNo);
    return {owned,acquired,away,myRoster:mine,slot};
  }
  function sig(rows){
    return rows.map(t=>[t.season,t.round,t.roster_id,t.owner_id].join(':')).sort().join('|')+'|ov:'+pickOverrides().map(x=>[x.round,x.originalSlot,x.ownerSlot].join(':')).sort().join(',');
  }

  function render(changed=false){
    const p=panel();if(!p)return;
    if(!state.draft){
      p.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Check Sleeper</button></div><div class="de98-empty">Loading current draft pick ownership…</div>';
      return;
    }
    const slot=selectedSlot();
    if(!slot){
      p.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Refresh</button></div><div class="de98-empty">Choose your draft slot above. Workhorse will combine Sleeper ownership with saved draft-specific overrides.</div>';
      return;
    }
    const c=capital();
    const cur=(state.picks||[]).reduce((m,x)=>Math.max(m,Number(x.pick_no)||0),0)+1;
    const acq=new Set(c.acquired.map(x=>x.pickNo));
    const up=c.owned.filter(x=>x.pickNo>=cur).slice(0,8);
    const moves=[...c.acquired.map(x=>({...x,type:'in'})),...c.away.map(x=>({...x,type:'out'}))].sort((a,b)=>a.pickNo-b.pickNo);
    const upHtml=up.length?up.map(x=>'<div class="de98-row"><span class="de98-pick '+(acq.has(x.pickNo)?'de98-acquired':'')+'">'+x.label+'</span><span class="de98-detail">'+(acq.has(x.pickNo)?'Acquired from Slot '+x.originalSlot:'Original pick')+'</span></div>').join(''):'<div class="de98-empty">No remaining picks detected.</div>';
    const moveHtml=moves.length?moves.map(x=>'<div class="de98-row"><span class="de98-pick '+(x.type==='in'?'de98-acquired':'de98-away')+'">'+x.label+'</span><span class="de98-detail">'+(x.type==='in'?'Acquired · from Slot '+x.originalSlot:'Traded away · now Slot '+(x.ownerSlot||'?'))+'</span></div>').join(''):'<div class="de98-empty">No traded picks mapped to your roster.</div>';
    p.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>'+(state.busy?'Checking…':'Refresh')+'</button></div>'+
      (changed?'<div class="de98-alert">Pick ownership changed — updated.</div>':'')+
      '<div class="de98-summary"><span class="de98-chip">'+c.owned.length+' picks owned</span><span class="de98-chip in">+'+c.acquired.length+' acquired</span><span class="de98-chip out">−'+c.away.length+' traded away</span></div>'+
      '<div class="de98-grid"><div><div class="de98-title">Your Upcoming Picks</div>'+upHtml+'</div><div><div class="de98-title">Pick Trades</div>'+moveHtml+'</div></div>'+
      '<div class="de98-foot">Sleeper trade records: draft '+state.source.draft+' · league '+state.source.league+(state.source.inferred?' · '+state.source.inferred+' confirmed from live picks':'')+(state.source.overrides?' · '+state.source.overrides+' durable Workhorse overrides':'')+' · auto-refreshes every 15 seconds</div>';
  }

  async function refresh(force=false){
    if(state.busy)return;
    state.busy=true;render(false);
    try{
      const resolved=state.draft&&!force?{draft:state.draft,league:state.league}:await resolve();
      state.draft=resolved.draft||state.draft;
      state.league=resolved.league||state.league;
      const did=String(state.draft?.draft_id||''),lid=String(state.draft?.league_id||state.league?.league_id||'');
      if(!did)throw new Error('Draft ID unavailable.');
      const [d,dt,lt,rs,ps]=await Promise.all([
        api('https://api.sleeper.app/v1/draft/'+did).catch(()=>state.draft),
        api('https://api.sleeper.app/v1/draft/'+did+'/traded_picks').catch(()=>[]),
        lid?api('https://api.sleeper.app/v1/league/'+lid+'/traded_picks').catch(()=>[]):Promise.resolve([]),
        lid?api('https://api.sleeper.app/v1/league/'+lid+'/rosters').catch(()=>state.rosters):Promise.resolve(state.rosters),
        api('https://api.sleeper.app/v1/draft/'+did+'/picks').catch(()=>state.picks),
        loadDurableOverrides(did)
      ]);
      state.draft=d||state.draft;
      state.rosters=Array.isArray(rs)?rs:[];
      state.picks=Array.isArray(ps)?ps:[];
      const merged=merge(dt,lt,state.picks),next=sig(merged),changed=!!state.lastSig&&next!==state.lastSig;
      state.traded=merged;state.lastSig=next;
      render(changed);
      try{window.WorkhorseLiveDraftCommand?.refresh?.()}catch(_){}
    }catch(e){
      const p=panel();
      if(p)p.innerHTML='<div class="de98-head"><h3>Your Draft Capital</h3><button class="de98-refresh" data-de98-refresh>Retry</button></div><div class="de98-empty">Could not refresh draft pick ownership: '+esc(e.message)+'</div>';
    }finally{state.busy=false}
  }
  function start(){if(state.timer)clearInterval(state.timer);refresh(true);state.timer=setInterval(()=>refresh(false),POLL_MS)}
  function stop(){if(state.timer)clearInterval(state.timer);state.timer=null}

  document.addEventListener('click',e=>{
    if(e.target.closest('#connectDraft'))setTimeout(start,500);
    if(e.target.closest('#stopDraft')){
      stop();
      state={draft:null,league:null,rosters:[],picks:[],traded:[],lastSig:'',timer:null,busy:false,durableOverrides:[],overrideDraftId:'',source:{draft:0,league:0,inferred:0,overrides:0}};
      render(false);
    }
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='deDraftSlot')render(false)});

  panel();render(false);
  if(extractId(savedSource()))setTimeout(start,300);
  window.WorkhorseDraftTradeCapital={refresh:()=>refresh(true),start,render,capital,selectedSlot,rosterForSlot,slotForRoster,pickOverrides,loadDurableOverrides};
})();
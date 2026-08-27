// v41.2 — Sleeper-connected draft room with one cached, non-blocking injury/status directory load.
(()=>{
  const INPUT_KEY='de34_draft_input';
  const SMART_KEY='de41_draft_filter';
  const STATUS_CACHE_KEY='workhorse-draft-player-status-v412';
  const STATUS_TTL=15*60*1000;
  const STATUS_LIMIT=250;
  const htmlEsc=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>Number(n)>0?'+'+Number(n):String(Number(n)||0);
  let smartFilter=localStorage.getItem(SMART_KEY)||'all';
  let statusClient=null,statusLoadedAt=0,statusLoading=null;
  const playerStatus=new Map();
  let connected={id:'',draft:null,league:null,picks:[],traded:[],slot:null,rosterId:null,format:'ppr',scoringLabel:'Full PPR',timer:null,lastChecked:null};

  function injectCss(){
    if(document.getElementById('deDraft41Css'))return;
    const s=document.createElement('style');s.id='deDraft41Css';s.textContent=`
      #deDraftRoomSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}
      .de-draft-card{border:1px solid #293a49;background:#101820;border-radius:14px;padding:13px;min-height:70px}
      .de-draft-card .k{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8293a2;font-weight:900}.de-draft-card .v{font-size:20px;font-weight:1000;margin-top:5px}.de-draft-card .s{font-size:10px;color:#91a0ad;margin-top:4px;line-height:1.35}
      #deDraftContext{display:grid;grid-template-columns:1.1fr 1fr;gap:10px;margin:0 0 14px}.de-draft-panel{border:1px solid #293a49;background:#0e161e;border-radius:14px;padding:13px}.de-draft-panel h3{margin:0 0 9px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8fa0af}.de-pick-row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #1e2b36;font-size:11px}.de-pick-row:last-child{border-bottom:0}
      #deDraftSmartFilters{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}.de-smart{border:1px solid #304352;background:#111b24;color:#aebbc6;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:900;cursor:pointer}.de-smart.active{border-color:#4c86b5;color:#ddecf7;background:#142535}
      .injury-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:17px;padding:0 5px;border-radius:5px;border:1px solid #74434a;background:#28171a;color:#ff9eaa;font-size:9px;font-weight:1000;margin-left:6px;vertical-align:1px}.injury-badge.warn{border-color:#806735;background:#261f12;color:#f3ca65}.injury-badge.ir{border-color:#654a78;background:#201729;color:#caa8e8}
      .draft-insight-line{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}.draft-chip{font-size:9px;font-weight:900;padding:3px 6px;border-radius:6px;border:1px solid #304352;color:#9fb0bd;background:#111a22}.draft-chip.value{border-color:#346b4b;color:#6ee7a1;background:#102018}.draft-chip.pressure{border-color:#7b5f31;color:#f2c566;background:#241d11}.draft-chip.wait{border-color:#355b7a;color:#80bdec;background:#101c27}
      .draft-value-num{font-weight:1000;color:#6ee7a1}.draft-value-num.none{color:#71808c}
      #deDraftSlot{max-width:165px;min-width:140px}
      @media(max-width:900px){#deDraftRoomSummary{grid-template-columns:repeat(2,minmax(0,1fr))}#deDraftContext{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function getStatusClient(){
    if(statusClient)return statusClient;
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient){statusClient=supabaseClient;return statusClient}}catch(_){}
    if(window.supabase&&typeof window.supabase.createClient==='function'&&typeof DRAFT_EDGE_SUPABASE_URL!=='undefined'&&typeof DRAFT_EDGE_SUPABASE_KEY!=='undefined'){
      statusClient=window.supabase.createClient(DRAFT_EDGE_SUPABASE_URL,DRAFT_EDGE_SUPABASE_KEY);return statusClient;
    }
    return null;
  }

  function readStatusCache(){
    try{
      const cached=JSON.parse(localStorage.getItem(STATUS_CACHE_KEY)||'null');
      if(!cached||!Array.isArray(cached.rows)||!Number(cached.savedAt)||Date.now()-Number(cached.savedAt)>=STATUS_TTL)return false;
      playerStatus.clear();cached.rows.forEach(r=>{if(r?.player_id)playerStatus.set(String(r.player_id),r)});
      statusLoadedAt=Number(cached.savedAt);
      return playerStatus.size>0;
    }catch(_){return false}
  }
  function writeStatusCache(rows){
    try{localStorage.setItem(STATUS_CACHE_KEY,JSON.stringify({savedAt:Date.now(),rows:(rows||[]).slice(0,STATUS_LIMIT)}))}catch(_){}
  }

  async function loadPlayerStatus(force=false){
    if(statusLoading)return statusLoading;
    if(!playerStatus.size)readStatusCache();
    if(!force&&playerStatus.size&&Date.now()-statusLoadedAt<STATUS_TTL)return;
    const client=getStatusClient();if(!client)return;
    statusLoading=(async()=>{
      try{
        const {data,error}=await client.from('sleeper_player_status')
          .select('player_id,status,injury_status,injury_body_part,team,updated_at,search_rank')
          .in('position',['QB','RB','WR','TE'])
          .not('search_rank','is',null)
          .order('search_rank',{ascending:true})
          .limit(STATUS_LIMIT);
        if(error)throw error;
        const all=Array.isArray(data)?data:[];
        playerStatus.clear();all.forEach(r=>{if(r?.player_id)playerStatus.set(String(r.player_id),r)});statusLoadedAt=Date.now();
        writeStatusCache(all);
        try{renderAdp();renderRankings();renderDraft()}catch(_){}
      }catch(error){console.warn('Sleeper injury status unavailable',error)}
      finally{statusLoading=null}
    })();
    return statusLoading;
  }

  function statusFor(p){
    let id='';try{id=String(marketFor(p)?.id||p?.sleeperId||p?.id||'')}catch(_){}
    return id?playerStatus.get(id)||null:null;
  }
  function injuryCode(r){
    if(!r)return '';
    const inj=String(r.injury_status||'').trim().toLowerCase(),status=String(r.status||'').trim().toLowerCase();
    if(status.includes('physically unable')||status==='pup')return 'PUP';
    if(status.includes('injured reserve')||status==='ir')return 'IR';
    if(status.includes('suspend'))return 'SUS';
    if(inj.includes('question'))return 'Q';
    if(inj.includes('doubt'))return 'D';
    if(inj.includes('out'))return 'OUT';
    return '';
  }
  function injuryBadge(p){
    const r=statusFor(p),code=injuryCode(r);if(!code)return '';
    const cls=(code==='IR'||code==='PUP')?' ir':(code==='Q'||code==='D')?' warn':'';
    const detail=[r.injury_status,r.injury_body_part,r.status].filter(Boolean).join(' · ');
    return '<span class="injury-badge'+cls+'" title="Sleeper status: '+htmlEsc(detail||code)+'">'+code+'</span>';
  }

  const baseRankRow=typeof rankRow==='function'?rankRow:null;
  if(baseRankRow){
    rankRow=function(p,mode='rankings'){
      let out=baseRankRow(p,mode),badge=injuryBadge(p);if(!badge)return out;
      return out.replace('</span><span class="tags">','</span>'+badge+'<span class="tags">');
    };window.rankRow=rankRow;
  }
  const baseMarketRow=typeof marketRow==='function'?marketRow:null;
  if(baseMarketRow){
    marketRow=function(p){let out=baseMarketRow(p),badge=injuryBadge(p);if(!badge)return out;return out.replace('</span><span class="tags">','</span>'+badge+'<span class="tags">')};window.marketRow=marketRow;
  }

  function extractNumericId(raw){
    const s=String(raw||'').trim();
    const draftMatch=s.match(/\/draft(?:\/nfl)?\/(\d{8,})/i)||s.match(/draft[^0-9]*(\d{8,})/i);
    return draftMatch?.[1]||(s.match(/\b\d{8,}\b/)||[])[0]||'';
  }
  async function resolveInput(raw){
    const id=extractNumericId(raw);if(!id)throw new Error('Paste a Sleeper draft link, Draft ID, or League ID.');
    try{
      const draft=await sleeper('https://api.sleeper.app/v1/draft/'+id);
      if(draft?.draft_id){let league=null;if(draft.league_id)try{league=await sleeper('https://api.sleeper.app/v1/league/'+draft.league_id)}catch(_){}return {draft,league}}
    }catch(_){}
    try{
      const league=await sleeper('https://api.sleeper.app/v1/league/'+id);
      let draft=null;
      if(league?.draft_id)try{draft=await sleeper('https://api.sleeper.app/v1/draft/'+league.draft_id)}catch(_){}
      if(!draft){const drafts=await sleeper('https://api.sleeper.app/v1/league/'+id+'/drafts');draft=Array.isArray(drafts)?(drafts.find(x=>x.status==='drafting')||drafts.find(x=>x.status==='pre_draft')||drafts[0]):null}
      if(draft?.draft_id)return {draft,league};
    }catch(_){}
    throw new Error('Could not find a Sleeper draft from that link or ID.');
  }

  function detectFormat(draft,league){
    const roster=Array.isArray(league?.roster_positions)?league.roster_positions.map(x=>String(x).toUpperCase()):[];
    const sf=roster.includes('SUPER_FLEX')||roster.filter(x=>x==='QB').length>=2||Number(draft?.settings?.slots_super_flex||0)>0||Number(draft?.settings?.slots_qb||0)>=2;
    const rec=Number(league?.scoring_settings?.rec);
    const meta=String(draft?.metadata?.scoring_type||'').toLowerCase();
    let base='ppr',label='Full PPR';
    if(Number.isFinite(rec)){if(rec>0&&rec<0.75){base='half_ppr';label='Half PPR'}else if(rec>=0.75){base='ppr';label='Full PPR'}else{label='Standard'}}
    else if(meta.includes('half')){base='half_ppr';label='Half PPR'}
    else if(meta.includes('ppr')){base='ppr';label='Full PPR'}
    if(sf)return {format:'superflex',label:label+' · Superflex'};
    return {format:base,label};
  }

  function teams(){return Math.max(1,Number(connected.draft?.settings?.teams)||Number(connected.league?.total_rosters)||0)}
  function rounds(){return Math.max(1,Number(connected.draft?.settings?.rounds)||0)}
  function slotForPick(pickNo){
    const n=teams(),round=Math.floor((pickNo-1)/n)+1,within=((pickNo-1)%n)+1;
    return connected.draft?.type==='snake'&&round%2===0?n-within+1:within;
  }
  function rosterForSlot(slot){const map=connected.draft?.slot_to_roster_id||{};const v=map[String(slot)]??map[slot];return v==null?null:String(v)}
  function tradedOwner(round,originalRoster){
    let owner=String(originalRoster||'');
    for(const t of connected.traded||[])if(Number(t.round)===Number(round)&&String(t.roster_id)===String(originalRoster))owner=String(t.owner_id);
    return owner;
  }
  function ownerForPick(pickNo){
    const n=teams(),round=Math.floor((pickNo-1)/n)+1,slot=slotForPick(pickNo),original=rosterForSlot(slot);
    return original?tradedOwner(round,original):null;
  }
  function currentPickNo(){
    if(!connected.id)return null;
    const max=(connected.picks||[]).reduce((m,p)=>Math.max(m,Number(p.pick_no)||0),0);return max+1;
  }
  function userPickNumbers(){
    const total=teams()*rounds(),slot=Number(connected.slot);if(!slot||!total)return [];
    const roster=connected.rosterId||rosterForSlot(slot),out=[];
    for(let p=1;p<=total;p++){
      if(roster){if(ownerForPick(p)===String(roster))out.push(p)}else if(slotForPick(p)===slot)out.push(p);
    }
    return out;
  }
  function upcomingUserPicks(){const cur=currentPickNo();if(!cur)return [];return userPickNumbers().filter(x=>x>=cur)}
  function pickPlayerName(p){
    const meta=p?.metadata||{};const n=[meta.first_name,meta.last_name].filter(Boolean).join(' ').trim();if(n)return n;
    const id=String(p?.player_id||'');
    const personal=players.find(x=>String(marketFor(x)?.id||x.sleeperId||'')===id);if(personal)return personal.name;
    const pool=(typeof sleeperPool!=='undefined'?sleeperPool:[]).find(x=>String(x.id||'')===id);return pool?.name||'Player '+id;
  }

  function reconcilePicks(){
    if(!connected.id)return;
    const byId=new Map((connected.picks||[]).map(p=>[String(p.player_id),p]));let changed=false;
    players.forEach(p=>{
      const id=String(marketFor(p)?.id||p.sleeperId||'');if(!id)return;
      const pick=byId.get(id);
      if(pick){
        if(!p.drafted||p.draftedSource!=='sleeper'||p.draftedDraftId!==connected.id||Number(p.draftedPickNo)!==Number(pick.pick_no))changed=true;
        p.drafted=true;p.draftedSource='sleeper';p.draftedDraftId=connected.id;p.draftedPickNo=Number(pick.pick_no)||null;p.draftedAt=p.draftedAt||Date.now();
      }else if(p.draftedSource==='sleeper'&&p.draftedDraftId===connected.id){
        p.drafted=false;p.draftedSource=null;p.draftedDraftId=null;p.draftedPickNo=null;p.draftedAt=null;changed=true;
      }
    });
    if(changed)save();
  }

  const oldToggle=typeof toggleDraft==='function'?toggleDraft:null;
  toggleDraft=function(i){
    const p=players?.[i];if(!p)return;
    if(p.drafted&&p.draftedSource==='sleeper'&&connected.id&&p.draftedDraftId===connected.id){alert('Sleeper still has this player drafted. Workhorse will make them available automatically if that Sleeper pick is removed.');return}
    p.drafted=!p.drafted;p.draftedAt=p.drafted?Date.now():null;p.draftedSource=p.drafted?'manual':null;p.draftedDraftId=null;p.draftedPickNo=null;save();renderTagDrawer();renderDraft();if(document.getElementById('draftedModal')?.classList.contains('open'))renderDraftedModal();
  };window.toggleDraft=toggleDraft;

  function ensureUi(){
    injectCss();
    const list=document.getElementById('draftList');if(!list)return;
    const controls=document.querySelector('#page-draft .controls');
    if(controls&&!document.getElementById('deDraftSlot')){
      const select=document.createElement('select');select.id='deDraftSlot';select.className='search';select.innerHTML='<option value="">Your draft slot</option>';select.onchange=()=>setSlot(select.value);controls.insertBefore(select,document.getElementById('draftedTab'));
    }
    if(!document.getElementById('deDraftRoomSummary')){
      const summary=document.createElement('div');summary.id='deDraftRoomSummary';list.parentNode.insertBefore(summary,list);
      const context=document.createElement('div');context.id='deDraftContext';list.parentNode.insertBefore(context,list);
      const filters=document.createElement('div');filters.id='deDraftSmartFilters';list.parentNode.insertBefore(filters,list);
    }
    const old=document.getElementById('draftHelp34');if(old)old.remove();
    const staticHelp=[...document.querySelectorAll('#page-draft .small')].find(x=>x!==document.getElementById('draftState')&&x.textContent.includes('Where to get it:'));if(staticHelp)staticHelp.style.display='none';
    const head=document.querySelector('#page-draft .pagehead p');if(head)head.textContent='Connect Sleeper for live picks, format detection, roster context, true value versus your rankings, market timing, and injury status.';
  }

  function setSlot(value){
    connected.slot=value?Number(value):null;connected.rosterId=connected.slot?rosterForSlot(connected.slot):null;
    if(connected.id){if(value)localStorage.setItem('de41_draft_slot:'+connected.id,String(value));else localStorage.removeItem('de41_draft_slot:'+connected.id)}
    const list=currentList?.();if(list){list.draftPrefs={...(list.draftPrefs||{}),draftId:connected.id||null,slot:connected.slot||null,input:document.getElementById('draftId')?.value||''};try{save()}catch(_){}}
    renderDraft();
  }
  function populateSlotSelect(){
    const el=document.getElementById('deDraftSlot');if(!el)return;
    const n=teams();el.innerHTML='<option value="">Your draft slot</option>'+Array.from({length:n},(_,i)=>'<option value="'+(i+1)+'">Draft Slot '+(i+1)+'</option>').join('');
    const saved=connected.id?(localStorage.getItem('de41_draft_slot:'+connected.id)||currentList?.()?.draftPrefs?.slot):null;
    if(saved&&Number(saved)<=n){connected.slot=Number(saved);connected.rosterId=rosterForSlot(connected.slot);el.value=String(saved)}else{connected.slot=null;connected.rosterId=null;el.value=''}
  }

  function rosterPicks(){
    if(!connected.slot)return [];
    if(connected.rosterId)return connected.picks.filter(p=>String(p.roster_id||'')===String(connected.rosterId));
    return connected.picks.filter(p=>Number(p.draft_slot)===Number(connected.slot));
  }
  function positionCounts(picks){const c={QB:0,RB:0,WR:0,TE:0};picks.forEach(p=>{const pos=String(p.metadata?.position||'').toUpperCase();if(pos in c)c[pos]++});return c}
  function starterSlots(){
    const roster=Array.isArray(connected.league?.roster_positions)?connected.league.roster_positions.map(x=>String(x).toUpperCase()):[];
    if(roster.length){const c={};roster.filter(x=>x!=='BN').forEach(x=>c[x]=(c[x]||0)+1);return c}
    const s=connected.draft?.settings||{},c={};[['QB','slots_qb'],['RB','slots_rb'],['WR','slots_wr'],['TE','slots_te'],['FLEX','slots_flex'],['SUPER_FLEX','slots_super_flex']].forEach(([k,key])=>{if(Number(s[key])>0)c[k]=Number(s[key])});return c;
  }
  function compactCounts(c){return Object.entries(c).filter(([,v])=>Number(v)>0).map(([k,v])=>(k==='SUPER_FLEX'?'SF':k)+' '+v).join(' · ')||'—'}

  function timingFor(p){
    const m=marketFor(p),cur=currentPickNo(),up=upcomingUserPicks();if(!m?.rank||!cur||!up.length)return null;
    const target=up[0]===cur?up[1]:up[0];if(!target)return null;
    const adp=Number(m.adp)||Number(m.rank),gap=adp-target;
    if(gap>=6)return {cls:'wait',text:'Market later than next pick',detail:'Sleeper #'+m.rank+' · next pick #'+target};
    if(gap<=-4)return {cls:'pressure',text:'Market before next pick',detail:'Sleeper #'+m.rank+' · next pick #'+target};
    return {cls:'',text:'Market near next pick',detail:'Sleeper #'+m.rank+' · next pick #'+target};
  }
  function valueFor(p){const cur=currentPickNo();if(!cur)return null;const v=cur-Number(p.overall);return Number.isFinite(v)&&v>0?v:0}

  function draftRow(p){
    const i=players.indexOf(p),m=marketFor(p),mv=moveText(p),value=valueFor(p),timing=timingFor(p),badge=injuryBadge(p);
    const insights=[];
    if(value>0)insights.push('<span class="draft-chip value">+'+value+' past your rank</span>');
    if(timing)insights.push('<span class="draft-chip '+timing.cls+'" title="'+htmlEsc(timing.detail)+'">'+htmlEsc(timing.text)+'</span>');
    const draftControl='<button class="draft-btn" onclick="event.stopPropagation();toggleDraft('+i+')">Draft</button>';
    return '<div class="player rankings" data-index="'+i+'"><div class="person" onclick="openDetail('+i+')"><img class="avatar" src="'+imgUrl(p)+'" onerror="this.style.visibility=\'hidden\'"><div class="playertext"><div class="name-line"><span class="name">'+htmlEsc(typeof cleanPlayerName==='function'?cleanPlayerName(p.name):p.name)+'</span>'+badge+'<span class="tags">'+tagsHtml(p)+'</span>'+noteHtml(p,i)+'</div><div class="meta"><span class="pos '+p.position+'">'+p.position+'</span><span>'+htmlEsc(p.team)+'</span><span>Bye '+htmlEsc(p.bye)+'</span>'+draftControl+'</div>'+notePreview(p)+(insights.length?'<div class="draft-insight-line">'+insights.join('')+'</div>':'')+'</div></div><div class="metric"><div class="num">#'+p.overall+'</div></div><div class="metric"><div class="num">'+p.position+'#'+p.posRank+'</div></div><div class="metric"><div class="num">'+(m?.rank!=null?'#'+m.rank:'—')+'</div></div><div class="metric"><div class="draft-value-num '+(value>0?'':'none')+'">'+(value>0?'+'+value:'—')+'</div></div><div class="metric"><div class="move '+mv.cls+'">'+mv.text+'</div></div></div>';
  }
  function draftHeads(){return '<div class="colheads rankings"><div>Player</div><div>My Overall</div><div>My Pos Rank</div><div>Sleeper Rank</div><div>Value Now</div><div>ADP Move</div></div>'}

  function passesSmart(p){
    if(smartFilter==='all')return true;
    if(smartFilter==='value')return valueFor(p)>0;
    if(smartFilter==='target')return (p.tags||[]).includes('blue');
    if(smartFilter==='avoid')return (p.tags||[]).includes('red');
    if(smartFilter==='injured')return !!injuryCode(statusFor(p));
    return true;
  }
  function renderSmartFilters(){
    const root=document.getElementById('deDraftSmartFilters');if(!root)return;
    const opts=[['all','All Available'],['value','Value Now'],['target','🎯 Targets'],['avoid','❌ Avoids'],['injured','Injury Status']];
    root.innerHTML=opts.map(([k,label])=>'<button class="de-smart '+(smartFilter===k?'active':'')+'" data-smart="'+k+'">'+label+'</button>').join('');
    root.querySelectorAll('[data-smart]').forEach(b=>b.onclick=()=>{smartFilter=b.dataset.smart;localStorage.setItem(SMART_KEY,smartFilter);renderDraft()});
  }

  function renderSummary(){
    const root=document.getElementById('deDraftRoomSummary'),ctx=document.getElementById('deDraftContext');if(!root||!ctx)return;
    const cur=currentPickNo(),ups=upcomingUserPicks(),next=ups[0],after=next===cur?ups[1]:ups[0];
    const onClock=next&&cur===next;
    const available=players.filter(p=>!p.drafted).sort((a,b)=>a.overall-b.overall);
    const best=available[0],bestValue=best?valueFor(best):0;
    root.innerHTML=
      '<div class="de-draft-card"><div class="k">Current Pick</div><div class="v">'+(cur?'#'+cur:'—')+'</div><div class="s">'+(connected.id?htmlEsc(connected.draft?.status||'Connected'):'Connect Sleeper to track the draft')+'</div></div>'+
      '<div class="de-draft-card"><div class="k">Your Next Pick</div><div class="v">'+(next?'#'+next:'—')+'</div><div class="s">'+(!connected.slot?'Choose your draft slot':onClock?'You are on the clock':next&&cur?(next-cur)+' picks away':'—')+'</div></div>'+
      '<div class="de-draft-card"><div class="k">Best Available</div><div class="v" style="font-size:15px">'+(best?htmlEsc(best.name):'—')+'</div><div class="s">'+(best?'Your #'+best.overall+(bestValue>0?' · +'+bestValue+' value':''):'No available players')+'</div></div>'+
      '<div class="de-draft-card"><div class="k">League Format</div><div class="v" style="font-size:15px">'+(connected.id?htmlEsc(connected.scoringLabel):'—')+'</div><div class="s">'+(connected.id?'Sleeper settings detected automatically':'Connect a draft to detect')+'</div></div>';

    if(!connected.id){ctx.innerHTML='';return}
    const recent=connected.picks.slice().sort((a,b)=>(Number(b.pick_no)||0)-(Number(a.pick_no)||0)).slice(0,6);
    const rp=rosterPicks(),counts=positionCounts(rp),slots=starterSlots();
    ctx.innerHTML='<div class="de-draft-panel"><h3>Recent Picks</h3>'+(recent.length?recent.map(p=>'<div class="de-pick-row"><span>#'+Number(p.pick_no)+' · '+htmlEsc(pickPlayerName(p))+'</span><span>'+htmlEsc(String(p.metadata?.position||''))+'</span></div>').join(''):'<div class="small">No picks yet.</div>')+'</div>'+
      '<div class="de-draft-panel"><h3>Your Roster</h3><div class="small" style="line-height:1.7">'+(connected.slot?'<b>Drafted:</b> '+compactCounts(counts)+'<br><b>Starter slots:</b> '+compactCounts(slots)+(after?'<br><b>Pick after this:</b> #'+after:''):'Select your draft slot above to track your roster and picks.')+'</div></div>';
  }

  renderDraft=function(){
    ensureUi();renderSmartFilters();renderSummary();
    const q=(document.getElementById('draftSearch')?.value||'').toLowerCase();
    let list=filterByActiveTag(players).filter(p=>!p.drafted&&(draftPos==='ALL'||p.position===draftPos)&&(!q||p.name.toLowerCase().includes(q)||(p.team||'').toLowerCase().includes(q))).filter(passesSmart).sort((a,b)=>a.overall-b.overall);
    document.getElementById('draftList').innerHTML=draftHeads()+(list.length?list.map(draftRow).join(''):'<div class="small" style="padding:18px 0">No available players match these filters.</div>');
    document.getElementById('draftedCount').textContent=players.filter(p=>p.drafted).length;
  };window.renderDraft=renderDraft;

  renderDraftedModal=function(){
    const drafted=players.filter(p=>p.drafted).sort((a,b)=>(b.draftedAt||0)-(a.draftedAt||0));
    document.getElementById('draftedList').innerHTML=drafted.length?drafted.map(p=>{
      const auto=p.draftedSource==='sleeper';
      return '<div class="drafted-row"><div><div class="drafted-name">'+htmlEsc(p.name)+'</div><div class="drafted-meta">'+p.position+' · '+htmlEsc(p.team)+' · My Overall #'+p.overall+' · '+(auto?'Sleeper pick #'+(p.draftedPickNo||'—'):'Manual')+'</div></div>'+(auto?'<span class="small">Auto</span>':'<button class="undo-btn" onclick="toggleDraft('+players.indexOf(p)+');renderDraftedModal()">Undo</button>')+'</div>';
    }).join(''):'<div class="small" style="padding:20px 0">No drafted players yet.</div>';
  };window.renderDraftedModal=renderDraftedModal;

  async function refreshConnected(){
    if(!connected.id)return;
    try{
      const [draft,picks,traded]=await Promise.all([
        sleeper('https://api.sleeper.app/v1/draft/'+connected.id),
        sleeper('https://api.sleeper.app/v1/draft/'+connected.id+'/picks'),
        sleeper('https://api.sleeper.app/v1/draft/'+connected.id+'/traded_picks').catch(()=>[])
      ]);
      connected.draft=draft||connected.draft;connected.picks=Array.isArray(picks)?picks:[];connected.traded=Array.isArray(traded)?traded:[];connected.lastChecked=Date.now();
      connected.rosterId=connected.slot?rosterForSlot(connected.slot):null;
      reconcilePicks();renderDraft();
      const state=document.getElementById('draftState'),name=connected.draft?.metadata?.name||connected.league?.name||'Sleeper Draft';
      if(state)state.innerHTML='<span style="color:#4ade80;font-weight:900">● LIVE</span> · '+htmlEsc(name)+' · '+htmlEsc(connected.scoringLabel)+' · '+connected.picks.length+' picks';
    }catch(e){const state=document.getElementById('draftState');if(state)state.textContent='Connection error: '+e.message}
  }
  pollDraft=refreshConnected;window.pollDraft=pollDraft;

  async function connectDraft41(){
    ensureUi();
    const input=document.getElementById('draftId'),state=document.getElementById('draftState'),btn=document.getElementById('connectDraft'),raw=input?.value.trim();
    if(!raw){if(state)state.textContent='Paste a Sleeper draft link, Draft ID, or League ID first.';return}
    if(connected.timer)clearInterval(connected.timer);if(typeof draftTimer!=='undefined')clearInterval(draftTimer);
    if(state)state.textContent='Connecting to Sleeper…';if(btn)btn.disabled=true;
    try{
      const resolved=await resolveInput(raw),draft=resolved.draft,league=resolved.league;
      connected={...connected,id:String(draft.draft_id),draft,league,picks:[],traded:[],slot:null,rosterId:null,lastChecked:null};
      const detected=detectFormat(draft,league);connected.format=detected.format;connected.scoringLabel=detected.label;
      localStorage.setItem(INPUT_KEY,raw);populateSlotSelect();
      if(typeof window.setDraftEdgeAdpFormat==='function')try{await window.setDraftEdgeAdpFormat(detected.format)}catch(e){console.warn('Could not switch ADP format',e)}
      const list=currentList?.();if(list){list.draftPrefs={...(list.draftPrefs||{}),input:raw,draftId:connected.id,slot:connected.slot||null};try{save()}catch(_){}}
      await refreshConnected();connected.timer=setInterval(refreshConnected,15000);try{draftTimer=connected.timer}catch(_){}
      const loadStatusLater=()=>loadPlayerStatus().catch(()=>{});
      if('requestIdleCallback' in window)requestIdleCallback(loadStatusLater,{timeout:1200});
      else setTimeout(loadStatusLater,250);
    }catch(e){if(state)state.textContent='Connection error: '+e.message}
    finally{if(btn)btn.disabled=false}
  }

  function stopDraft41(){
    if(connected.timer)clearInterval(connected.timer);if(typeof draftTimer!=='undefined')clearInterval(draftTimer);
    connected={id:'',draft:null,league:null,picks:[],traded:[],slot:null,rosterId:null,format:connected.format,scoringLabel:connected.scoringLabel,timer:null,lastChecked:null};
    const state=document.getElementById('draftState');if(state)state.textContent='Stopped';renderDraft();
  }

  ensureUi();
  const input=document.getElementById('draftId'),connect=document.getElementById('connectDraft'),stop=document.getElementById('stopDraft');
  if(input){input.placeholder='Paste Sleeper draft link, Draft ID, or League ID';input.style.maxWidth='390px';const listPref=currentList?.()?.draftPrefs?.input,saved=listPref||localStorage.getItem(INPUT_KEY);if(saved&&!input.value)input.value=saved;input.onkeydown=e=>{if(e.key==='Enter')connectDraft41()}}
  if(connect)connect.onclick=connectDraft41;if(stop)stop.onclick=stopDraft41;
  setTimeout(renderDraft,600);
})();
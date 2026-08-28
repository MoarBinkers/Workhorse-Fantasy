// v92.1 — fast true Sleeper ADP: top 250 data only, no directory preload, and never auto-add players to an existing ranking list.
(()=>{
  const HISTORY_KEY='de29_adp_history';
  const FORMAT_KEY='de36_adp_format';
  const CACHE_PREFIX='wh92_true_adp_';
  const CACHE_VERSION=2;
  const HISTORY_TTL=5*60*1000;
  const AUTO_RANK_LIMIT=250;
  const FORMATS={
    ppr:{label:'Full PPR',short:'PPR'},
    half_ppr:{label:'Half PPR',short:'Half PPR'},
    superflex:{label:'Superflex / 2QB',short:'Superflex'}
  };
  const FIRST_NAME_ALIASES={
    cam:'cameron',cameron:'cameron',kenny:'kenneth',kenneth:'kenneth',nick:'nicholas',nicholas:'nicholas',
    mike:'michael',michael:'michael',matt:'matthew',matthew:'matthew',chris:'christopher',christopher:'christopher',
    nate:'nathan',nathan:'nathan',gabe:'gabriel',gabriel:'gabriel',zach:'zachary',zachary:'zachary',
    josh:'joshua',joshua:'joshua',ben:'benjamin',benjamin:'benjamin',will:'william',william:'william',
    tony:'anthony',anthony:'anthony',rob:'robert',robert:'robert',drew:'andrew',andy:'andrew',andrew:'andrew',
    dan:'daniel',danny:'daniel',daniel:'daniel',sam:'samuel',samuel:'samuel'
  };

  let activeFormat=FORMATS[localStorage.getItem(FORMAT_KEY)]?localStorage.getItem(FORMAT_KEY):'ppr';
  let activeRows=[];
  let activeSignature='';
  let loadSeq=0;
  let reconciling=false;
  const historyCache=new Map();

  const clean=v=>typeof cleanPlayerName==='function'?cleanPlayerName(v):String(v||'').trim();
  const nrm=v=>typeof norm==='function'?norm(v):clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const teamText=v=>{const s=String(v||'').trim();return s&&s.toUpperCase()!=='FA'?s:'—'};
  const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  const fmtTime=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''};

  function exactNameKey(name,pos=''){return String(pos||'').toUpperCase()+'|'+nrm(name)}
  function identityNameKey(name,pos=''){
    const parts=clean(name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
    while(parts.length&&['jr','sr','ii','iii','iv'].includes(parts[parts.length-1]))parts.pop();
    if(!parts.length)return '';
    parts[0]=FIRST_NAME_ALIASES[parts[0]]||parts[0];
    return String(pos||'').toUpperCase()+'|'+parts.join('');
  }
  function sameIdentity(aName,aPos,bName,bPos){
    if(String(aPos||'').toUpperCase()!==String(bPos||'').toUpperCase())return false;
    return exactNameKey(aName,aPos)===exactNameKey(bName,bPos)||identityNameKey(aName,aPos)===identityNameKey(bName,bPos);
  }
  function uniqueIndex(rows,keyFn){
    const map=new Map();
    for(const row of rows||[]){
      const key=keyFn(row);if(!key)continue;
      if(map.has(key))map.set(key,null);else map.set(key,row);
    }
    return map;
  }

  function validRows(rows,format=activeFormat){
    if(!Array.isArray(rows)||rows.length<100||rows.length>AUTO_RANK_LIMIT)return false;
    let valid=0;
    for(const r of rows){
      const rank=Number(r?.sleeper_rank),pos=String(r?.position||'').toUpperCase();
      if(String(r?.format||format)!==format||!r?.player_id||!r?.full_name||!Number.isFinite(rank)||rank<=0||rank>AUTO_RANK_LIMIT||!['QB','RB','WR','TE'].includes(pos))continue;
      valid++;
    }
    return valid>=100;
  }
  function signature(rows){
    return (rows||[]).map(r=>[
      r.player_id,r.full_name,r.position,r.team,Number(r.sleeper_rank),Number(r.position_rank),Number(r.sleeper_adp),Number(r.rank_change)||0
    ].join(':')).join('|');
  }
  function cacheKey(format){return CACHE_PREFIX+format}
  function readCache(format){
    try{
      const data=JSON.parse(localStorage.getItem(cacheKey(format))||'null');
      if(!data||data.v!==CACHE_VERSION||data.format!==format||!validRows(data.rows,format))return null;
      return data.rows;
    }catch(_){return null}
  }
  function writeCache(format,rows){
    try{localStorage.setItem(cacheKey(format),JSON.stringify({v:CACHE_VERSION,format,savedAt:Date.now(),rows}))}catch(_){}
  }

  function applyRows(rows,format=activeFormat){
    if(!validRows(rows,format))return false;
    const target=(typeof market!=='undefined'&&market&&typeof market==='object')?market:null;
    if(!target)return false;

    const incomingIds=new Set(rows.map(r=>String(r.player_id||'')).filter(Boolean));
    const preserved=[];
    for(const [name,entry] of Object.entries(target)){
      if(!entry||typeof entry!=='object')continue;
      if(entry.identityOnly===false&&String(entry.format||'')===format&&entry.id&&!incomingIds.has(String(entry.id)))preserved.push([name,entry]);
    }
    Object.keys(target).forEach(k=>delete target[k]);

    const pool=[];
    for(const r of rows){
      const id=String(r.player_id||''),name=clean(r.full_name),pos=String(r.position||'').toUpperCase();
      const rank=Number(r.sleeper_rank);
      if(!id||!name||!['QB','RB','WR','TE'].includes(pos)||!Number.isFinite(rank)||rank<=0||rank>AUTO_RANK_LIMIT)continue;
      const entry={
        id,rank,posRank:Number(r.position_rank)||null,team:teamText(r.team),pos,
        adp:Number.isFinite(Number(r.sleeper_adp))?Number(r.sleeper_adp):null,
        searchRank:null,move:Number(r.rank_change)||0,
        updatedAt:r.captured_at?new Date(r.captured_at).getTime():Date.now(),
        central:true,identityOnly:false,format
      };
      target[name]=entry;
      pool.push({id,name,position:pos,team:entry.team,bye:'—',tier:null,tags:[],note:'',drafted:false});
    }
    for(const [name,entry] of preserved){
      if(!Object.values(target).some(x=>x&&String(x.id||'')===String(entry.id||'')))target[name]=entry;
    }
    try{sleeperPool=pool}catch(_){}
    const savePool=()=>{try{localStorage.setItem('de_sleeper_pool',JSON.stringify(pool))}catch(_){}};
    if('requestIdleCallback' in window)requestIdleCallback(savePool,{timeout:2000});else setTimeout(savePool,300);
    return true;
  }

  function statusFor(rows,format,source){
    const latest=rows.reduce((m,r)=>Math.max(m,r.captured_at?new Date(r.captured_at).getTime():0),0);
    const moved=rows.filter(r=>Number(r.rank_change)!==0).length;
    if(source==='cache')setText('liveText','Saved Sleeper '+FORMATS[format].short+' ranks · refreshing…');
    else setText('liveText','Sleeper '+FORMATS[format].short+' updated'+(latest?' '+fmtTime(latest):''));
    setText('adpStatus',moved?moved+' player'+(moved===1?'':'s')+' moved in the latest '+FORMATS[format].short+' update':'No '+FORMATS[format].short+' rank changes in the latest central update');
  }

  function showRows(rows,format,source){
    const sig=signature(rows),changed=sig!==activeSignature||format!==activeFormat||!activeRows.length;
    activeRows=rows;activeSignature=sig;
    if(changed){
      applyRows(rows,format);
      if(typeof renderEverything==='function')renderEverything();
    }
    statusFor(rows,format,source);
    return changed;
  }

  function activeList(){try{return typeof currentList==='function'?currentList():rankingLists?.[activeListId]||null}catch(_){return null}}
  function reconcileCurrentRankings(rows=activeRows){
    if(reconciling||!validRows(rows,activeFormat))return false;
    const list=activeList();
    try{if(!list||!Array.isArray(players)||!players.length)return false}catch(_){return false}
    reconciling=true;
    try{
      const byId=new Map(rows.map(r=>[String(r.player_id||''),r]));
      const exact=uniqueIndex(rows,r=>exactNameKey(r.full_name,r.position));
      const alias=uniqueIndex(rows,r=>identityNameKey(r.full_name,r.position));
      const find=p=>{
        const pos=String(p?.position||'').toUpperCase(),id=String(p?.sleeperId||'');
        const hit=id?byId.get(id):null;
        if(hit&&sameIdentity(p?.name,pos,hit.full_name,hit.position))return hit;
        return exact.get(exactNameKey(p?.name,pos))||alias.get(identityNameKey(p?.name,pos))||null;
      };
      let changed=false;
      for(const p of players){
        const row=find(p);if(!row)continue;
        const id=String(row.player_id||'');
        if(id&&String(p.sleeperId||'')!==id){p.sleeperId=id;changed=true}
        const team=teamText(row.team);
        if(team&&String(p.team||'')!==team){p.team=team;changed=true}
      }

      // Reconciliation is identity/team cleanup only. Never append missing ADP
      // players to an existing user list; the user's saved list size is authoritative.
      const seen=new Map(),remove=new Set();
      for(const p of players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999))){
        const id=String(p?.sleeperId||'');if(!id)continue;
        if(!seen.has(id)){seen.set(id,p);continue}
        const keeper=seen.get(id);
        if(!String(keeper.note||'').trim()&&String(p.note||'').trim())keeper.note=p.note;
        keeper.tags=[...new Set([...(Array.isArray(keeper.tags)?keeper.tags:[]),...(Array.isArray(p.tags)?p.tags:[])])];
        remove.add(p);changed=true;
      }
      if(remove.size)players=players.filter(p=>!remove.has(p));

      if(changed){
        const ordered=players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999));
        const counts={};ordered.forEach((p,i)=>{p.overall=i+1;const pos=String(p.position||'');counts[pos]=(counts[pos]||0)+1;p.posRank=counts[pos]});
        list.players=players;list.updatedAt=Date.now();
        try{if(activeListId&&rankingLists?.[activeListId])rankingLists[activeListId]=list}catch(_){}
        try{save()}catch(e){console.warn('Workhorse ranking reconciliation save failed',e)}
      }
      return changed;
    }finally{reconciling=false}
  }
  function scheduleReconcile(rows){
    const run=()=>{
      try{if(reconcileCurrentRankings(rows)&&typeof renderRankings==='function')renderRankings()}catch(e){console.warn('Workhorse ranking reconciliation unavailable',e)}
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:2200});else setTimeout(run,700);
  }
  window.WorkhorseReconcileSleeperRankings=()=>reconcileCurrentRankings(activeRows);

  function renderFormatTabs(){
    const adpList=document.getElementById('adpList');if(!adpList)return;
    let root=document.getElementById('adpFormatTabs');
    if(!root){root=document.createElement('div');root.id='adpFormatTabs';root.className='pills';root.style.cssText='margin:-12px 0 18px;gap:8px;flex-wrap:wrap';adpList.parentNode.insertBefore(root,adpList)}
    root.innerHTML=Object.entries(FORMATS).map(([key,cfg])=>'<button class="pill '+(key===activeFormat?'active':'')+'" data-adp-format="'+key+'" style="padding:9px 14px">'+cfg.label+'</button>').join('');
    root.querySelectorAll('[data-adp-format]').forEach(btn=>btn.onclick=()=>setFormat(btn.dataset.adpFormat));
    const p=document.querySelector('#page-adp .pagehead p');if(p)p.textContent='Sleeper '+FORMATS[activeFormat].label+' redraft ADP.';
  }

  function apiConfig(){
    try{return {url:String(DRAFT_EDGE_SUPABASE_URL||''),key:String(DRAFT_EDGE_SUPABASE_KEY||'')}}catch(_){return {url:'',key:''}}
  }
  async function fetchJson(path,timeout=4500){
    const cfg=apiConfig();if(!cfg.url||!cfg.key)throw new Error('Workhorse database is not ready yet.');
    const options={headers:{apikey:cfg.key,Accept:'application/json'},cache:'no-store'};
    if(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function')options.signal=AbortSignal.timeout(timeout);
    const r=await fetch(cfg.url+'/rest/v1/'+path,options);
    if(!r.ok)throw new Error('Sleeper data request failed (HTTP '+r.status+').');
    const data=await r.json();return Array.isArray(data)?data:[];
  }
  async function fetchCentralRows(format){
    const select='format,player_id,full_name,position,team,sleeper_rank,position_rank,sleeper_adp,captured_at,rank_change';
    const path='sleeper_adp_current?select='+encodeURIComponent(select)+'&format=eq.'+encodeURIComponent(format)+'&sleeper_rank=lte.'+AUTO_RANK_LIMIT+'&order=sleeper_rank.asc&limit='+AUTO_RANK_LIMIT;
    const rows=await fetchJson(path,4500);
    if(!validRows(rows,format))throw new Error('Shared Sleeper '+FORMATS[format].short+' ranks are incomplete.');
    return rows;
  }

  function signalReady(format,count){
    window.WorkhorseCentralAdpReady=true;
    try{window.dispatchEvent(new CustomEvent('workhorse:central-adp-ready',{detail:{format,count}}))}catch(_){}
  }
  async function loadCentralRanks(){
    const format=activeFormat,seq=++loadSeq;
    renderFormatTabs();
    const cached=readCache(format);
    if(cached){showRows(cached,format,'cache')}
    else setText('liveText','Loading shared Sleeper '+FORMATS[format].short+' ranks…');
    try{
      const rows=await fetchCentralRows(format);
      if(seq!==loadSeq||format!==activeFormat)return rows;
      writeCache(format,rows);
      showRows(rows,format,'network');
      scheduleReconcile(rows);
      signalReady(format,rows.length);
      return rows;
    }catch(e){
      if(seq!==loadSeq||format!==activeFormat)return;
      console.error('Central Sleeper ADP failed',e);
      if(cached){
        setText('liveText','Using saved Sleeper '+FORMATS[format].short+' ranks');
        setText('adpStatus','Live refresh failed; showing the last verified format-specific Sleeper ranks.');
        signalReady(format,cached.length);
        return cached;
      }
      setText('liveText','Couldn’t load shared Sleeper ranks');setText('adpStatus',e?.message||String(e));
      throw e;
    }
  }
  async function setFormat(format){
    if(!FORMATS[format]||format===activeFormat)return;
    activeFormat=format;localStorage.setItem(FORMAT_KEY,format);activeRows=[];activeSignature='';historyCache.clear();renderFormatTabs();
    return loadCentralRanks();
  }
  window.DraftEdgeAdpFormat=()=>activeFormat;
  window.setDraftEdgeAdpFormat=setFormat;
  refreshCurrentAdp=loadCentralRanks;window.refreshCurrentAdp=loadCentralRanks;
  const update=document.getElementById('topUpdate');if(update)update.onclick=loadCentralRanks;

  async function fetchHistory(playerId){
    const id=String(playerId||'');if(!id)return [];
    const cacheKey=activeFormat+':'+id,cached=historyCache.get(cacheKey);
    if(cached&&Date.now()-cached.at<HISTORY_TTL)return cached.rows;
    const select='sleeper_rank,captured_at,sleeper_adp';
    const path='sleeper_adp_history?select='+encodeURIComponent(select)+'&format=eq.'+encodeURIComponent(activeFormat)+'&player_id=eq.'+encodeURIComponent(id)+'&order=captured_at.desc&limit=240';
    const data=await fetchJson(path,5000);
    const latest=data.slice().reverse();
    const rows=latest.map(r=>({t:r.captured_at?new Date(r.captured_at).getTime():null,rank:Number(r.sleeper_rank),label:null}))
      .filter(r=>Number.isFinite(r.rank)).filter((r,i,a)=>i===0||Number(r.rank)!==Number(a[i-1].rank));
    historyCache.set(cacheKey,{at:Date.now(),rows});return rows;
  }
  function playerIdFor(value){
    if(value&&typeof value==='object'){
      try{const m=marketFor(value);if(m?.id)return String(m.id)}catch(_){}
      if(value.sleeperId)return String(value.sleeperId);if(value.id)return String(value.id);
    }
    const name=typeof value==='string'?value:value?.name;if(!name)return '';
    try{if(market[name]?.id)return String(market[name].id);const n=nrm(name);for(const [key,m] of Object.entries(market||{}))if(m?.id&&nrm(key)===n)return String(m.id)}catch(_){}
    return '';
  }
  async function hydrateHistory(value){
    const id=playerIdFor(value);if(!id)return;
    const rows=await fetchHistory(id);
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify({['id:'+id]:rows}))}catch(_){}
  }
  const detailBase=typeof openDetail==='function'?openDetail:null;
  if(detailBase){openDetail=function(i){const p=players?.[i];const out=detailBase(i);if(p)setTimeout(()=>hydrateHistory(p).then(()=>window.WorkhorseRefreshPlayerHistory?.(p)).catch(e=>console.warn('Sleeper history unavailable',e)),0);return out};window.openDetail=openDetail}
  const marketDetailBase=typeof window.openMarketDetail==='function'?window.openMarketDetail:null;
  if(marketDetailBase){const wrapped=function(name){const p=(typeof sleeperPool!=='undefined'?sleeperPool:[]).find(x=>nrm(x.name)===nrm(name))||{name};const out=marketDetailBase(name);setTimeout(()=>hydrateHistory(p).then(()=>window.WorkhorseRefreshPlayerHistory?.(p)).catch(e=>console.warn('Sleeper history unavailable',e)),0);return out};window.openMarketDetail=wrapped;try{openMarketDetail=wrapped}catch(_){}}

  try{localStorage.removeItem(HISTORY_KEY);localStorage.removeItem('de5_history')}catch(_){}
  renderFormatTabs();
  loadCentralRanks().catch(()=>{});
})();

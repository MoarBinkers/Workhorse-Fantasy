// v36.5 — render current Sleeper ADP first; keep identity enrichment off the critical path and capped at 500 players.
(()=>{
  const HISTORY_KEY='de29_adp_history';
  const FORMAT_KEY='de36_adp_format';
  const HISTORY_TTL=5*60*1000;
  const AUTO_RANK_LIMIT=250;
  const DIRECTORY_LIMIT=500;
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
  let centralClient=null;
  let activeRows=[],activeDirectory=[];
  let applying=false,reconciling=false,directoryPromise=null;
  const historyCache=new Map();

  function getClient(){
    if(centralClient)return centralClient;
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient){centralClient=supabaseClient;return centralClient}}catch(_){}
    if(window.supabase&&typeof window.supabase.createClient==='function'&&typeof DRAFT_EDGE_SUPABASE_URL!=='undefined'&&typeof DRAFT_EDGE_SUPABASE_KEY!=='undefined'){
      centralClient=window.supabase.createClient(DRAFT_EDGE_SUPABASE_URL,DRAFT_EDGE_SUPABASE_KEY);return centralClient;
    }
    throw new Error('Workhorse database is not ready yet.');
  }
  const clean=v=>typeof cleanPlayerName==='function'?cleanPlayerName(v):String(v||'').trim();
  const nrm=v=>typeof norm==='function'?norm(v):clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const teamText=v=>{const s=String(v||'').trim();return s&&s.toUpperCase()!=='FA'?s:'—'};
  const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  const fmtTime=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''};

  function identityNameKey(name,pos=''){
    const parts=clean(name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
    while(parts.length&&['jr','sr','ii','iii','iv'].includes(parts[parts.length-1]))parts.pop();
    if(!parts.length)return '';
    parts[0]=FIRST_NAME_ALIASES[parts[0]]||parts[0];
    return String(pos||'').toUpperCase()+'|'+parts.join('');
  }
  function exactNameKey(name,pos=''){return String(pos||'').toUpperCase()+'|'+nrm(name)}
  function uniqueIndex(rows,keyFn){
    const map=new Map();
    for(const row of rows||[]){
      const key=keyFn(row);if(!key)continue;
      if(map.has(key))map.set(key,null);else map.set(key,row);
    }
    return map;
  }
  function sameIdentity(aName,aPos,bName,bPos){
    if(String(aPos||'').toUpperCase()!==String(bPos||'').toUpperCase())return false;
    return exactNameKey(aName,aPos)===exactNameKey(bName,bPos)||identityNameKey(aName,aPos)===identityNameKey(bName,bPos);
  }
  function mergeDuplicatePlayer(keeper,duplicate){
    const tags=[...(Array.isArray(keeper.tags)?keeper.tags:[]),...(Array.isArray(duplicate.tags)?duplicate.tags:[])];
    keeper.tags=[...new Set(tags)];
    if(!String(keeper.note||'').trim()&&String(duplicate.note||'').trim())keeper.note=duplicate.note;
    if((keeper.tier==null||keeper.tier==='')&&duplicate.tier!=null&&duplicate.tier!=='')keeper.tier=duplicate.tier;
    if((!keeper.bye||keeper.bye==='—')&&duplicate.bye&&duplicate.bye!=='—')keeper.bye=duplicate.bye;
    if(!keeper.drafted&&duplicate.drafted){
      keeper.drafted=true;keeper.draftedAt=duplicate.draftedAt||keeper.draftedAt||Date.now();
      keeper.draftedSource=duplicate.draftedSource||null;keeper.draftedDraftId=duplicate.draftedDraftId||null;keeper.draftedPickNo=duplicate.draftedPickNo||null;
    }
  }

  function activeList(){try{return typeof currentList==='function'?currentList():rankingLists?.[activeListId]||null}catch(_){return null}}
  function excludedIds(list){
    if(!list)return new Set();
    if(!Array.isArray(list.excludedSleeperIds))list.excludedSleeperIds=[];
    return new Set(list.excludedSleeperIds.map(String));
  }

  async function loadPlayerDirectory(client){
    if(directoryPromise)return directoryPromise;
    directoryPromise=(async()=>{
      const {data,error}=await client.from('sleeper_player_status')
        .select('player_id,full_name,position,team,status,updated_at,search_rank')
        .in('position',['QB','RB','WR','TE'])
        .not('search_rank','is',null)
        .order('search_rank',{ascending:true})
        .limit(DIRECTORY_LIMIT);
      if(error)throw error;
      return (Array.isArray(data)?data:[]).filter(r=>['QB','RB','WR','TE'].includes(String(r.position||'').toUpperCase())&&r.player_id&&r.full_name).slice(0,DIRECTORY_LIMIT);
    })();
    try{return await directoryPromise}catch(e){directoryPromise=null;throw e}
  }

  function reconcileCurrentRankings(rows,directory=activeDirectory){
    if(reconciling||!Array.isArray(rows)||!rows.length)return false;
    const list=activeList();
    try{if(!list||!Array.isArray(players)||!players.length)return false}catch(_){return false}
    reconciling=true;
    try{
      const dirById=new Map(),adpById=new Map();
      for(const r of directory||[]){const id=String(r.player_id||'');if(id)dirById.set(id,r)}
      for(const r of rows){const id=String(r.player_id||'');if(id)adpById.set(id,r)}
      const dirExact=uniqueIndex(directory,r=>exactNameKey(r.full_name,r.position));
      const dirAlias=uniqueIndex(directory,r=>identityNameKey(r.full_name,r.position));
      const adpExact=uniqueIndex(rows,r=>exactNameKey(r.full_name,r.position));
      const adpAlias=uniqueIndex(rows,r=>identityNameKey(r.full_name,r.position));

      const findIdentity=p=>{
        const pos=String(p?.position||'').toUpperCase(),id=String(p?.sleeperId||'');
        const byId=id?dirById.get(id):null;
        if(byId&&sameIdentity(p?.name,pos,byId.full_name,byId.position))return byId;
        return dirExact.get(exactNameKey(p?.name,pos))||dirAlias.get(identityNameKey(p?.name,pos))||null;
      };
      const findAdp=p=>{
        const pos=String(p?.position||'').toUpperCase(),id=String(p?.sleeperId||'');
        const byId=id?adpById.get(id):null;
        if(byId&&sameIdentity(p?.name,pos,byId.full_name,byId.position))return byId;
        return adpExact.get(exactNameKey(p?.name,pos))||adpAlias.get(identityNameKey(p?.name,pos))||null;
      };

      let changed=false;
      for(const p of players){
        const identity=findIdentity(p)||findAdp(p);
        if(!identity)continue;
        const currentId=String(identity.player_id||'');
        if(currentId&&String(p.sleeperId||'')!==currentId){p.sleeperId=currentId;changed=true}
        const liveTeam=String(identity.team||'').trim(),currentTeam=String(p.team||'').trim();
        if(liveTeam&&liveTeam.toUpperCase()!=='FA'&&currentTeam!==liveTeam){p.team=liveTeam;changed=true}
        else if((!currentTeam||currentTeam.toUpperCase()==='FA')&&!liveTeam){p.team='—';changed=true}
      }

      const keepById=new Map(),remove=new Set();
      for(const p of players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999))){
        const id=String(p?.sleeperId||'');if(!id)continue;
        const keeper=keepById.get(id);
        if(!keeper){keepById.set(id,p);continue}
        mergeDuplicatePlayer(keeper,p);remove.add(p);changed=true;
      }
      if(remove.size){
        players=players.filter(p=>!remove.has(p));
        const ordered=players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999));
        const counts={};
        ordered.forEach((p,i)=>{p.overall=i+1;const pos=String(p.position||'');counts[pos]=(counts[pos]||0)+1;p.posRank=counts[pos]});
      }

      const existingIds=new Set(),existingNames=new Set(),existingAliases=new Set();
      for(const p of players){
        const id=String(p?.sleeperId||'');if(id)existingIds.add(id);
        existingNames.add(exactNameKey(p?.name,p?.position));
        existingAliases.add(identityNameKey(p?.name,p?.position));
      }

      if(players.length>=100){
        const excluded=excludedIds(list);
        let maxOverall=players.reduce((m,p)=>Math.max(m,Number(p?.overall)||0),0);
        const posCounts={};
        for(const p of players){const pos=String(p?.position||'');posCounts[pos]=(posCounts[pos]||0)+1}
        const incoming=rows.filter(r=>['QB','RB','WR','TE'].includes(String(r.position||'').toUpperCase())&&Number(r.sleeper_rank)>0&&Number(r.sleeper_rank)<=AUTO_RANK_LIMIT)
          .sort((a,b)=>Number(a.sleeper_rank)-Number(b.sleeper_rank));
        for(const r of incoming){
          const id=String(r.player_id||''),name=clean(r.full_name),pos=String(r.position||'').toUpperCase();
          const exact=exactNameKey(name,pos),alias=identityNameKey(name,pos);
          if(!id||!name||existingIds.has(id)||existingNames.has(exact)||existingAliases.has(alias)||excluded.has(id))continue;
          const dir=dirById.get(id),displayName=clean(dir?.full_name||name),team=teamText(dir?.team||r.team);
          posCounts[pos]=(posCounts[pos]||0)+1;
          players.push({overall:++maxOverall,name:displayName,position:pos,team,bye:'—',posRank:posCounts[pos],tier:null,tags:[],note:'',drafted:false,draftedAt:null,draftedSource:null,draftedDraftId:null,draftedPickNo:null,sleeperId:id});
          existingIds.add(id);existingNames.add(exactNameKey(displayName,pos));existingAliases.add(identityNameKey(displayName,pos));changed=true;
        }
      }
      if(changed){
        list.players=players;list.updatedAt=Date.now();
        try{if(activeListId&&rankingLists?.[activeListId])rankingLists[activeListId]=list}catch(_){}
        try{save()}catch(e){console.warn('Workhorse ranking reconciliation save failed',e)}
      }
      return changed;
    }finally{reconciling=false}
  }
  window.WorkhorseReconcileSleeperRankings=()=>reconcileCurrentRankings(activeRows,activeDirectory);

  function applyRows(rows,directory=activeDirectory){
    if(applying||!Array.isArray(rows)||!rows.length)return;
    applying=true;
    try{
      const target=(typeof market!=='undefined'&&market&&typeof market==='object')?market:{};
      Object.keys(target).forEach(k=>delete target[k]);
      const dirById=new Map();
      for(const r of directory||[]){
        const id=String(r.player_id||''),name=clean(r.full_name),pos=String(r.position||'').toUpperCase();
        if(!id||!name||!['QB','RB','WR','TE'].includes(pos))continue;
        dirById.set(id,r);
        target[name]={id,rank:null,posRank:null,team:teamText(r.team),pos,adp:null,searchRank:Number(r.search_rank)||null,move:null,updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now(),central:true,identityOnly:true,format:activeFormat};
      }
      const pool=[];
      for(const r of rows){
        const id=String(r.player_id||''),dir=dirById.get(id);
        const name=clean(r.full_name);if(!name)continue;
        const pos=String(r.position||'').toUpperCase(),team=teamText(dir?.team||r.team);
        const entry={id,rank:Number(r.sleeper_rank),posRank:Number(r.position_rank),team,pos,adp:Number(r.sleeper_adp),searchRank:Number(dir?.search_rank)||Number(r.sleeper_adp),move:Number(r.rank_change)||0,updatedAt:r.captured_at?new Date(r.captured_at).getTime():Date.now(),central:true,identityOnly:false,format:activeFormat};
        target[name]=entry;
        const dirName=clean(dir?.full_name);if(dirName&&dirName!==name)target[dirName]=entry;
        if(['QB','RB','WR','TE'].includes(pos))pool.push({id,name:dirName||name,position:pos,team,bye:'—',tier:null,tags:[],note:'',drafted:false});
      }
      try{sleeperPool=pool}catch(_){}
      try{localStorage.setItem('de_sleeper_pool',JSON.stringify(pool))}catch(_){}
    }finally{applying=false}
  }

  function scheduleRankingReconcile(rows,directory=activeDirectory){
    const run=()=>{
      try{
        if(reconcileCurrentRankings(rows,directory)){
          if(typeof renderRankings==='function')renderRankings();
          else if(typeof renderEverything==='function')renderEverything();
        }
      }catch(e){console.warn('Workhorse ranking reconciliation unavailable',e)}
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});
    else setTimeout(run,500);
  }

  function renderFormatTabs(){
    const adpList=document.getElementById('adpList');if(!adpList)return;
    let root=document.getElementById('adpFormatTabs');
    if(!root){
      root=document.createElement('div');root.id='adpFormatTabs';root.className='pills';root.style.cssText='margin:-12px 0 18px;gap:8px;flex-wrap:wrap';
      adpList.parentNode.insertBefore(root,adpList);
    }
    root.innerHTML=Object.entries(FORMATS).map(([key,cfg])=>'<button class="pill '+(key===activeFormat?'active':'')+'" data-adp-format="'+key+'" style="padding:9px 14px">'+cfg.label+'</button>').join('');
    root.querySelectorAll('[data-adp-format]').forEach(btn=>btn.onclick=()=>setFormat(btn.dataset.adpFormat));
    const p=document.querySelector('#page-adp .pagehead p');
    if(p)p.textContent='Sleeper '+FORMATS[activeFormat].label+' redraft ADP.';
  }

  async function loadCentralRanks(){
    renderFormatTabs();
    setText('liveText','Loading shared Sleeper '+FORMATS[activeFormat].short+' ranks…');
    try{
      const client=getClient();
      const {data,error}=await client.from('sleeper_adp_current')
        .select('format,player_id,full_name,position,team,sleeper_rank,position_rank,sleeper_adp,captured_at,rank_change')
        .eq('format',activeFormat).order('sleeper_rank',{ascending:true}).limit(AUTO_RANK_LIMIT);
      if(error)throw error;
      if(!Array.isArray(data)||data.length<100)throw new Error('Shared Sleeper '+FORMATS[activeFormat].short+' ranks are incomplete.');

      activeRows=data;
      applyRows(activeRows,activeDirectory);
      const latest=data.reduce((m,r)=>Math.max(m,r.captured_at?new Date(r.captured_at).getTime():0),0);
      const moved=data.filter(r=>Number(r.rank_change)!==0).length;
      setText('liveText','Sleeper '+FORMATS[activeFormat].short+' updated'+(latest?' '+fmtTime(latest):''));
      setText('adpStatus',moved?moved+' player'+(moved===1?'':'s')+' moved in the latest '+FORMATS[activeFormat].short+' update':'No '+FORMATS[activeFormat].short+' rank changes in the latest central update');
      if(typeof renderEverything==='function')renderEverything();
      window.WorkhorseCentralAdpReady=true;
      try{window.dispatchEvent(new CustomEvent('workhorse:central-adp-ready',{detail:{format:activeFormat,count:data.length}}))}catch(_){}
      scheduleRankingReconcile(activeRows,activeDirectory);

      // Do not preload the 500-player identity directory. The Add Player box searches
      // the full Sleeper directory on demand, so startup stays limited to these top 250 rows.
      return data;
    }catch(e){console.error('Central Sleeper ADP failed',e);setText('liveText','Couldn’t load shared Sleeper ranks');setText('adpStatus',e?.message||String(e));throw e}
  }

  async function setFormat(format){
    if(!FORMATS[format]||format===activeFormat)return;
    activeFormat=format;localStorage.setItem(FORMAT_KEY,format);activeRows=[];historyCache.clear();renderFormatTabs();
    await loadCentralRanks();
  }
  window.DraftEdgeAdpFormat=()=>activeFormat;
  window.setDraftEdgeAdpFormat=setFormat;

  refreshCurrentAdp=loadCentralRanks;window.refreshCurrentAdp=loadCentralRanks;
  const update=document.getElementById('topUpdate');if(update)update.onclick=loadCentralRanks;

  // Central ADP is applied only when fresh central data arrives. Ordinary UI renders stay DOM-only.

  async function fetchHistory(playerId){
    const id=String(playerId||'');if(!id)return [];
    const cacheKey=activeFormat+':'+id,cached=historyCache.get(cacheKey);
    if(cached&&Date.now()-cached.at<HISTORY_TTL)return cached.rows;
    const client=getClient();
    const {data,error}=await client.from('sleeper_adp_history')
      .select('sleeper_rank,captured_at,sleeper_adp')
      .eq('format',activeFormat).eq('player_id',id)
      .order('captured_at',{ascending:false}).limit(240);
    if(error)throw error;
    const latest=(Array.isArray(data)?data:[]).slice().reverse();
    const rows=latest.map(r=>({t:r.captured_at?new Date(r.captured_at).getTime():null,rank:Number(r.sleeper_rank),label:null}))
      .filter(r=>Number.isFinite(r.rank))
      .filter((r,i,a)=>i===0||Number(r.rank)!==Number(a[i-1].rank));
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
  if(detailBase){openDetail=function(i){
    const p=players?.[i];
    const out=detailBase(i);
    if(p)setTimeout(()=>hydrateHistory(p).then(()=>window.WorkhorseRefreshPlayerHistory?.(p)).catch(e=>console.warn('Sleeper history unavailable',e)),0);
    return out;
  };window.openDetail=openDetail}

  const marketDetailBase=typeof window.openMarketDetail==='function'?window.openMarketDetail:null;
  if(marketDetailBase){const wrapped=function(name){
    const p=(typeof sleeperPool!=='undefined'?sleeperPool:[]).find(x=>nrm(x.name)===nrm(name))||{name};
    const out=marketDetailBase(name);
    setTimeout(()=>hydrateHistory(p).then(()=>window.WorkhorseRefreshPlayerHistory?.(p)).catch(e=>console.warn('Sleeper history unavailable',e)),0);
    return out;
  };window.openMarketDetail=wrapped;try{openMarketDetail=wrapped}catch(_){}}

  try{localStorage.removeItem(HISTORY_KEY);localStorage.removeItem('de5_history')}catch(_){}
  renderFormatTabs();
  loadCentralRanks().catch(()=>{});
  // No timed full-app rerenders: data loaders repaint only when their data actually changes.
})();

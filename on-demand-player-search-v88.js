// v88.1 — keep startup at top 250; search the full Sleeper player directory only when the Add Player box is used.
(()=>{
  const REMOTE_LIMIT=40;
  const MIN_QUERY=2;
  const CACHE_TTL=5*60*1000;
  const cache=new Map();
  const remoteById=new Map();
  const remoteByName=new Map();
  let timer=null,seq=0;

  const clean=v=>typeof cleanPlayerName==='function'?cleanPlayerName(v):String(v||'').trim();
  const nrm=v=>typeof norm==='function'?norm(v):clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const escapeHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=()=>typeof window.DraftEdgeAdpFormat==='function'?window.DraftEdgeAdpFormat():'ppr';

  function client(){
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient)return supabaseClient}catch(_){}
    throw new Error('Workhorse database is not ready yet.');
  }

  function remember(player,adp){
    remoteById.set(String(player.id),player);
    remoteByName.set(nrm(player.name),player);
    try{
      const existing=market?.[player.name];
      market[player.name]={
        ...(existing&&typeof existing==='object'?existing:{}),
        id:String(player.id),
        rank:adp&&Number.isFinite(Number(adp.sleeper_rank))?Number(adp.sleeper_rank):null,
        posRank:adp&&Number.isFinite(Number(adp.position_rank))?Number(adp.position_rank):null,
        team:player.team||'—',
        pos:player.position,
        adp:adp&&Number.isFinite(Number(adp.sleeper_adp))?Number(adp.sleeper_adp):null,
        searchRank:Number(player.searchRank)||null,
        move:adp?Number(adp.rank_change)||0:null,
        updatedAt:adp?.captured_at?new Date(adp.captured_at).getTime():Date.now(),
        central:true,
        identityOnly:!adp,
        format:format()
      };
    }catch(_){}
  }

  async function searchAll(raw){
    const q=String(raw||'').trim().replace(/[%_]/g,'').slice(0,60);
    if(q.length<MIN_QUERY)return [];
    const key=format()+'|'+q.toLowerCase();
    const hit=cache.get(key);
    if(hit&&Date.now()-hit.at<CACHE_TTL)return hit.rows;

    const db=client();
    const {data:directory,error}=await db.from('sleeper_player_status')
      .select('player_id,full_name,position,team,status,updated_at,search_rank')
      .in('position',['QB','RB','WR','TE'])
      .not('search_rank','is',null)
      .ilike('full_name','%'+q+'%')
      .order('search_rank',{ascending:true})
      .limit(REMOTE_LIMIT);
    if(error)throw error;

    const base=(Array.isArray(directory)?directory:[]).filter(r=>r?.player_id&&r?.full_name);
    const ids=base.map(r=>String(r.player_id));
    let adpMap=new Map();
    if(ids.length){
      const {data:adp,error:adpError}=await db.from('sleeper_adp_current')
        .select('player_id,sleeper_rank,position_rank,sleeper_adp,captured_at,rank_change')
        .eq('format',format())
        .in('player_id',ids);
      if(!adpError)adpMap=new Map((Array.isArray(adp)?adp:[]).map(r=>[String(r.player_id),r]));
    }

    const rows=base.map(r=>{
      const p={
        id:String(r.player_id),
        name:clean(r.full_name),
        position:String(r.position||'').toUpperCase(),
        team:String(r.team||'').trim()||'—',
        bye:'—',tier:null,tags:[],note:'',drafted:false,
        searchRank:Number(r.search_rank)||null
      };
      const a=adpMap.get(p.id)||null;
      remember(p,a);
      return {player:p,adp:a};
    });
    cache.set(key,{at:Date.now(),rows});
    if(cache.size>30)cache.delete(cache.keys().next().value);
    return rows;
  }

  function renderRows(rows){
    const picker=document.getElementById('playerPicker');if(!picker)return;
    let owned=new Set();
    try{owned=new Set(players.map(p=>nrm(p.name)))}catch(_){}
    const visible=rows.filter(x=>!owned.has(nrm(x.player.name))).slice(0,REMOTE_LIMIT);
    picker.innerHTML=visible.length?visible.map(({player:p,adp:a})=>{
      const rank=a&&Number.isFinite(Number(a.sleeper_rank))?' · Sleeper #'+Number(a.sleeper_rank):'';
      const image='https://sleepercdn.com/content/nfl/players/thumb/'+encodeURIComponent(p.id)+'.jpg';
      return '<div class="pick-player"><div class="pick-left"><img class="avatar" src="'+image+'" onerror="this.style.visibility=\'hidden\'"><div><b style="font-size:11px">'+escapeHtml(p.name)+'</b><div class="small">'+escapeHtml(p.position)+' · '+escapeHtml(p.team||'—')+rank+'</div></div></div><button class="btn" data-add-player-id="'+escapeHtml(p.id)+'">＋ Add</button></div>';
    }).join(''):'<div class="small" style="padding:20px">No matching unlisted players.</div>';
  }

  const baseRender=typeof window.renderPlayerPicker==='function'?window.renderPlayerPicker:(typeof renderPlayerPicker==='function'?renderPlayerPicker:null);
  const remoteRender=function(q){
    const value=String(q||'').trim();
    clearTimeout(timer);
    const request=++seq;
    if(value.length<MIN_QUERY){
      if(baseRender)baseRender(value);
      const picker=document.getElementById('playerPicker');
      if(picker&&value.length>0)picker.insertAdjacentHTML('beforeend','<div class="small" style="padding:10px 20px;color:#8fa0af">Type at least 2 letters to search every Sleeper player.</div>');
      return;
    }
    const picker=document.getElementById('playerPicker');
    if(picker)picker.innerHTML='<div class="small" style="padding:20px">Searching all Sleeper players…</div>';
    timer=setTimeout(async()=>{
      try{
        const rows=await searchAll(value);
        if(request!==seq)return;
        renderRows(rows);
      }catch(e){
        if(request!==seq)return;
        console.warn('Full player search unavailable',e);
        if(picker)picker.innerHTML='<div class="small" style="padding:20px">Couldn’t search all players right now. Try again.</div>';
      }
    },180);
  };
  window.renderPlayerPicker=remoteRender;try{renderPlayerPicker=remoteRender}catch(_){}

  const baseAdd=typeof window.addPlayerFromPoolName==='function'?window.addPlayerFromPoolName:(typeof addPlayerFromPoolName==='function'?addPlayerFromPoolName:null);
  const remoteAdd=function(value){
    const id=String(value||'');
    let src=remoteById.get(id)||remoteByName.get(nrm(value))||null;
    if(!src){if(baseAdd)return baseAdd(value);return}
    try{if(typeof findPersonalByName==='function'&&findPersonalByName(src.name))return}catch(_){}
    let overall=1,posRank=1;
    try{
      overall=players.length?Math.max(...players.map(p=>Number(p.overall)||0))+1:1;
      posRank=players.filter(p=>p.position===src.position).length+1;
      players.push(playerTemplate(src,overall,posRank));
      save();renderEverything();
    }catch(e){console.warn('Could not add searched player',e)}
  };
  window.addPlayerFromPoolName=remoteAdd;try{addPlayerFromPoolName=remoteAdd}catch(_){}

  const picker=document.getElementById('playerPicker');
  if(picker){
    picker.onclick=e=>{
      const remote=e.target.closest('[data-add-player-id]');
      if(remote){
        e.preventDefault();e.stopPropagation();
        remoteAdd(remote.dataset.addPlayerId);
        remoteRender(document.getElementById('addPlayerSearch')?.value||'');
        return;
      }
      const normal=e.target.closest('[data-add-player]');
      if(normal){remoteAdd(normal.dataset.addPlayer);remoteRender(document.getElementById('addPlayerSearch')?.value||'')}
    };
  }

  window.WorkhorseFullPlayerSearch={search:searchAll,limit:REMOTE_LIMIT,minQuery:MIN_QUERY};
})();

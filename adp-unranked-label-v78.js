// v78.3 — reuse the main Sleeper directory before making any delayed fallback-rank queries.
(()=>{
  const FALLBACK_LIMIT=500;
  const BATCH=100;
  let installed=false,client=null,loading=null;
  const fallbackRanks=new Map();

  function getClient(){
    if(client)return client;
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient){client=supabaseClient;return client}}catch(_){}
    try{
      if(window.supabase&&typeof window.supabase.createClient==='function'&&typeof DRAFT_EDGE_SUPABASE_URL!=='undefined'&&typeof DRAFT_EDGE_SUPABASE_KEY!=='undefined'){
        client=window.supabase.createClient(DRAFT_EDGE_SUPABASE_URL,DRAFT_EDGE_SUPABASE_KEY);return client;
      }
    }catch(_){}
    return null;
  }

  function playerIds(){
    const out=[],seen=new Set();
    try{
      for(const p of Array.isArray(players)?players:[]){
        let info=null;
        try{info=typeof marketFor==='function'?marketFor(p):null}catch(_){}
        if(info?.rank!=null)continue;
        const id=String(p?.sleeperId||info?.id||'');
        if(!id||seen.has(id))continue;
        seen.add(id);
        const direct=Number(info?.searchRank);
        if(Number.isFinite(direct)&&direct>0){fallbackRanks.set(id,direct);continue}
        out.push(id);
        if(out.length>=FALLBACK_LIMIT)break;
      }
    }catch(_){}
    return out;
  }

  async function loadNeededRanks(){
    if(loading)return loading;
    const ids=playerIds().filter(id=>!fallbackRanks.has(id));
    if(!ids.length)return;
    const db=getClient();if(!db)return;
    loading=(async()=>{
      try{
        const batches=[];
        for(let i=0;i<ids.length;i+=BATCH)batches.push(ids.slice(i,i+BATCH));
        const results=await Promise.all(batches.map(batch=>db.from('sleeper_player_status').select('player_id,search_rank').in('player_id',batch)));
        for(const result of results){
          if(result?.error)throw result.error;
          for(const row of result?.data||[]){
            const id=String(row.player_id||''),rank=Number(row.search_rank);
            fallbackRanks.set(id,Number.isFinite(rank)&&rank>0?rank:null);
          }
        }
        for(const id of ids)if(!fallbackRanks.has(id))fallbackRanks.set(id,null);
      }catch(e){console.warn('Workhorse Sleeper fallback ranks could not load',e)}
      finally{loading=null}
    })();
    return loading;
  }

  function ensureMyRank(metrics,p){
    if(!metrics[0])return;
    const value=metrics[0].querySelector('.num');
    if(!value||value.textContent.trim())return;
    let rank=null;
    try{rank=String(rankPos||'ALL').toUpperCase()==='ALL'?Number(p?.overall):Number(p?.posRank)}catch(_){rank=Number(p?.overall)}
    if(Number.isFinite(rank)&&rank>0)value.textContent='#'+rank;
  }

  function install(){
    try{
      if(installed)return true;
      if(typeof rankRow!=='function')return false;
      const base=rankRow;
      if(base.__workhorseSleeperFallback){installed=true;return true}

      const wrapped=function(p,mode='rankings'){
        const html=base.apply(this,arguments);
        if(mode!=='rankings')return html;

        let info=null;
        try{info=typeof marketFor==='function'?marketFor(p):null}catch(_){}
        if(info?.rank!=null)return html;

        try{
          const box=document.createElement('div');box.innerHTML=html;
          const row=box.firstElementChild;if(!row)return html;
          const metrics=row.querySelectorAll(':scope > .metric');
          ensureMyRank(metrics,p);

          const id=String(p?.sleeperId||info?.id||'');
          const direct=Number(info?.searchRank);
          const cached=Number(fallbackRanks.get(id));
          const fallback=Number.isFinite(direct)&&direct>0?direct:cached;
          if(Number.isFinite(fallback)&&fallback>0){
            if(metrics[2]){
              const value=metrics[2].querySelector('.num');
              if(value){
                value.textContent='#'+fallback;
                value.title='Sleeper live player rank. Format-specific PPR ADP is currently unavailable for this player.';
              }
            }
            if(metrics[3]){
              const value=metrics[3].querySelector('.edge');
              if(value){
                const myRank=Number(p?.overall),edge=Number.isFinite(myRank)?fallback-myRank:null;
                value.classList.remove('good','bad');
                if(edge==null)value.textContent='N/A';
                else{
                  value.textContent=(edge>0?'+':'')+edge;
                  if(edge>0)value.classList.add('good');else if(edge<0)value.classList.add('bad');
                }
                value.title='My Edge compared with Sleeper live player rank because PPR ADP is unavailable.';
              }
            }
            if(metrics[4]){
              const value=metrics[4].querySelector('.move');
              if(value){value.textContent='N/A';value.classList.remove('up','down');value.classList.add('flat');value.title='PPR ADP movement is unavailable for this player.'}
            }
          }else{
            const explanation='Sleeper currently has neither usable PPR ADP nor a live player rank for this player.';
            if(metrics[2]){const value=metrics[2].querySelector('.num');if(value){value.textContent='NR';value.title=explanation}}
            if(metrics[3]){const value=metrics[3].querySelector('.edge');if(value){value.textContent='NR';value.classList.remove('good','bad');value.title=explanation}}
            if(metrics[4]){const value=metrics[4].querySelector('.move');if(value){value.textContent='N/A';value.classList.remove('up','down');value.classList.add('flat');value.title=explanation}}
          }
          return row.outerHTML;
        }catch(_){return html}
      };

      wrapped.__workhorseSleeperFallback=true;
      rankRow=wrapped;try{window.rankRow=wrapped}catch(_){}
      installed=true;return true;
    }catch(e){console.warn('Workhorse Sleeper fallback rank helper could not install',e);return false}
  }

  async function refresh(){
    if(!install())return;
    await loadNeededRanks();
    try{if(typeof renderRankings==='function')renderRankings()}catch(e){console.warn('Workhorse Sleeper fallback render skipped',e)}
  }

  const scheduleRefresh=()=>setTimeout(refresh,3000);
  if(document.readyState==='complete')scheduleRefresh();
  else window.addEventListener('load',scheduleRefresh,{once:true});
  setTimeout(install,600);
  setTimeout(refresh,6000);
  window.WorkhorseUnrankedLabels={refresh};
})();

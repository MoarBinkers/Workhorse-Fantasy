// v95 — recover the intended cloud ranking list, restore bye metadata, and keep the Sleeper pool tied to verified central ADP.
(()=>{
  const RECOVERY_KEY='workhorse_v95_blank_active_checked';
  const validBye=v=>{const s=String(v??'').trim();return !!s&&!['—','-','NA','N/A','NR'].includes(s.toUpperCase())};
  const key=v=>{
    try{return typeof norm==='function'?norm(v):String(v||'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,'').replace(/[^a-z0-9]/g,'')}
    catch(_){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
  };

  function initialByeMap(){
    const map=new Map();
    try{
      if(Array.isArray(INITIAL))for(const p of INITIAL){if(p?.name&&validBye(p.bye))map.set(key(p.name),String(p.bye))}
    }catch(_){}
    return map;
  }

  function centralRows(){
    const out=[];
    try{
      for(const [name,m] of Object.entries(market||{})){
        const rank=Number(m?.rank),pos=String(m?.pos||'').toUpperCase();
        if(m?.central!==true||!Number.isFinite(rank)||rank<=0||rank>250||!['QB','RB','WR','TE'].includes(pos))continue;
        out.push({name,m,rank,pos});
      }
    }catch(_){}
    return out.sort((a,b)=>a.rank-b.rank);
  }

  function normalizeSleeperPool(){
    const rows=centralRows();if(rows.length<100)return false;
    const byes=initialByeMap();
    const pool=rows.map(({name,m,pos})=>({
      id:String(m.id||''),name,position:pos,team:m.team||'—',bye:byes.get(key(name))||'—',tier:null,tags:[],note:'',drafted:false
    }));
    try{sleeperPool=pool}catch(_){return false}
    const persist=()=>{try{localStorage.setItem('de_sleeper_pool',JSON.stringify(pool))}catch(_){}};
    if('requestIdleCallback' in window)requestIdleCallback(persist,{timeout:1800});else setTimeout(persist,250);
    return true;
  }

  function enrichActiveByes(){
    const byes=initialByeMap();if(!byes.size)return false;
    let changed=false,list=null;
    try{list=typeof currentList==='function'?currentList():rankingLists?.[activeListId]||null}catch(_){return false}
    if(!list||!Array.isArray(players)||!players.length)return false;
    for(const p of players){
      if(validBye(p?.bye))continue;
      const bye=byes.get(key(p?.name));
      if(bye){p.bye=bye;changed=true}
    }
    if(changed){
      list.players=players;list.updatedAt=Date.now();
      try{if(activeListId&&rankingLists?.[activeListId])rankingLists[activeListId]=list}catch(_){}
      try{save()}catch(e){console.warn('Workhorse bye-week save failed',e)}
    }
    return changed;
  }

  function listStats(list){
    const arr=Array.isArray(list?.players)?list.players:[];
    let tagged=0,noted=0,byes=0;
    for(const p of arr){if(Array.isArray(p?.tags)&&p.tags.length)tagged++;if(String(p?.note||'').trim())noted++;if(validBye(p?.bye))byes++}
    return {count:arr.length,tagged,noted,byes,score:tagged*4+noted*3+byes};
  }

  function recoverBlankActiveOnce(){
    if(localStorage.getItem(RECOVERY_KEY))return false;
    let lists,active;
    try{lists=Object.values(rankingLists||{});active=rankingLists?.[activeListId]||null}catch(_){return false}
    if(!window.WorkhorseCloudRankingsReady||!active||!lists.length)return false;
    const a=listStats(active);
    const ranked=lists.map(list=>({list,stats:listStats(list)})).sort((x,y)=>y.stats.score-x.stats.score);
    const best=ranked[0];
    const looksLikeBrokenMirror=a.count>=100&&a.tagged===0&&a.noted===0&&a.byes<=5;
    const clearlyRicher=best&&best.list?.id!==activeListId&&best.stats.count>=100&&best.stats.score>=50&&best.stats.score>=a.score+40;
    localStorage.setItem(RECOVERY_KEY,'1');
    if(!looksLikeBrokenMirror||!clearlyRicher)return false;
    try{
      activeListId=best.list.id;
      loadActiveList();
      enrichActiveByes();
      if(typeof renderEverything==='function')renderEverything();
      console.info('Workhorse recovered the richer saved ranking list after the blank ADP-mirror regression.');
      return true;
    }catch(e){console.warn('Workhorse ranking-list recovery failed',e);return false}
  }

  // Any later legacy completion calls renderEverything(). Normalize the shared
  // Sleeper pool immediately before that render so it cannot reintroduce 300/450
  // search-rank rows after true central ADP has loaded.
  try{
    const base=typeof renderEverything==='function'?renderEverything:null;
    if(base&&!base.__wh95){
      const wrapped=function(){if(window.WorkhorseCentralAdpReady)normalizeSleeperPool();const out=base.apply(this,arguments);return out};
      wrapped.__wh95=true;renderEverything=wrapped;window.renderEverything=wrapped;
    }
  }catch(_){}

  function repair(){
    normalizeSleeperPool();
    const switched=recoverBlankActiveOnce();
    if(!switched&&enrichActiveByes()&&typeof renderRankings==='function')renderRankings();
  }
  window.addEventListener('workhorse:central-adp-ready',()=>setTimeout(repair,0));
  window.addEventListener('workhorse:cloud-rankings-ready',()=>setTimeout(repair,0));
  setTimeout(repair,250);
  setTimeout(repair,1800);
  window.WorkhorseRankingDataRecovery={repair,normalizeSleeperPool,enrichActiveByes};
})();

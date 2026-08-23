// v60.6 — guarantee guest and brand-new account My Rankings starts as an exact Sleeper Full PPR ADP mirror until customized.
(()=>{
  const MIGRATION_KEY='de60_clean_adp_onboarding';
  const STARTER_FORMAT='ppr';
  const STARTER_LIMIT=300;
  let busy=false,createConfirmBusy=false,starterRowsPromise=null;

  window.WorkhorseDefaultRankingsPolicy='sleeper-adp-until-customized';

  const allowedPos=pos=>['QB','RB','WR','TE'].includes(String(pos||'').toUpperCase());

  function starterClient(){
    try{return supabaseClient||null}catch(_){return null}
  }

  async function fetchStarterRows(force=false){
    if(starterRowsPromise&&!force)return starterRowsPromise;
    const client=starterClient();
    if(!client)return null;
    starterRowsPromise=(async()=>{
      const {data,error}=await client.from('sleeper_adp_current')
        .select('player_id,full_name,position,team,sleeper_rank,position_rank,sleeper_adp,captured_at')
        .eq('format',STARTER_FORMAT)
        .in('position',['QB','RB','WR','TE'])
        .not('sleeper_rank','is',null)
        .order('sleeper_rank',{ascending:true})
        .limit(STARTER_LIMIT);
      if(error)throw error;
      const rows=(Array.isArray(data)?data:[])
        .filter(r=>allowedPos(r.position)&&Number(r.sleeper_rank)>0&&r.player_id&&r.full_name)
        .sort((a,b)=>Number(a.sleeper_rank)-Number(b.sleeper_rank))
        .slice(0,STARTER_LIMIT);
      if(rows.length<100)throw new Error('Sleeper ADP snapshot is incomplete.');
      return rows;
    })();
    try{return await starterRowsPromise}catch(e){starterRowsPromise=null;throw e}
  }

  function playersFromRows(rows){
    return (Array.isArray(rows)?rows:[]).map(r=>({
      overall:Number(r.sleeper_rank),
      name:String(r.full_name||'').trim(),
      position:String(r.position||'NA').toUpperCase(),
      team:String(r.team||'—').trim()||'—',
      bye:'—',
      posRank:Number(r.position_rank)||null,
      tier:null,
      tags:[],
      note:'',
      drafted:false,
      draftedAt:null,
      draftedSource:null,
      draftedDraftId:null,
      draftedPickNo:null,
      sleeperId:String(r.player_id||'')||null
    }));
  }

  function freshPlayersFromMemory(){
    let pool=[];
    try{pool=(Array.isArray(sleeperPool)?sleeperPool:[]).filter(p=>allowedPos(p.position))}catch(_){return []}
    pool=pool.filter(p=>{try{return Number.isFinite(Number(marketFor(p)?.rank))}catch(_){return false}})
      .sort((a,b)=>Number(marketFor(a)?.rank||99999)-Number(marketFor(b)?.rank||99999))
      .slice(0,STARTER_LIMIT);
    return pool.map(p=>{
      let m=null;try{m=marketFor(p)}catch(_){}
      return {
        overall:Number(m?.rank)||99999,
        name:p.name,
        position:p.position||p.pos||'NA',
        team:p.team||'—',
        bye:p.bye??'—',
        posRank:Number(m?.posRank)||null,
        tier:null,
        tags:[],
        note:'',
        drafted:false,
        draftedAt:null,
        draftedSource:null,
        draftedDraftId:null,
        draftedPickNo:null,
        sleeperId:p.id||p.sleeperId||m?.id||null
      };
    }).sort((a,b)=>a.overall-b.overall);
  }

  function untouchedBuiltInList(list){
    if(!list||list.name!=='My Rankings'||!Array.isArray(list.players)||!list.players.length)return false;
    let initial=null;try{initial=Array.isArray(INITIAL)?INITIAL:null}catch(_){}
    if(!initial||list.players.length!==initial.length)return false;
    let initialTiers=null;try{initialTiers=INITIAL_TIERS}catch(_){}
    if(!initialTiers)return false;
    for(const pos of POS){
      const a=Array.isArray(list.tiers?.[pos])?list.tiers[pos]:[];
      const b=Array.isArray(initialTiers?.[pos])?initialTiers[pos]:[];
      if(a.length!==b.length)return false;
      for(let j=0;j<b.length;j++){
        if(Number(a[j]?.id)!==Number(b[j]?.id)||String(a[j]?.name||'')!==String(b[j]?.name||''))return false;
      }
    }
    for(let i=0;i<initial.length;i++){
      const p=list.players[i],src=initial[i];
      if(!p||!src)return false;
      let same=false;
      try{same=norm(p.name)===norm(src.name)}catch(_){same=String(p.name||'').toLowerCase()===String(src.name||'').toLowerCase()}
      if(!same)return false;
      if(Number(p.overall)!==i+1||String(p.position||'')!==String(src.position||''))return false;
      if(Number(p.posRank)!==Number(src.posRank)||Number(p.tier)!==Number(src.tier))return false;
      if((p.tags||[]).length||String(p.note||'').trim()||p.drafted)return false;
    }
    return true;
  }

  function cleanListData(name,ps){
    if(!Array.isArray(ps)||ps.length<100)return null;
    return {
      id:localId(),name:name||'My Rankings',players:ps,tiers:emptyTiers(),draftPrefs:null,
      excludedSleeperIds:[],createdAt:Date.now(),updatedAt:Date.now()
    };
  }

  async function createCloudStarter(){
    if(busy||!currentUser||activeListId||Object.keys(rankingLists||{}).length)return false;
    busy=true;
    try{
      const rows=await fetchStarterRows();
      if(!rows)return false;
      if(!currentUser||activeListId||Object.keys(rankingLists||{}).length)return false;
      const list=cleanListData('My Rankings',playersFromRows(rows));
      if(!list)return false;
      await persistNewList(list);
      activeTagFilter='ALL';
      document.getElementById('newListModal')?.classList.remove('open');
      try{renderEverything()}catch(_){}
      return true;
    }catch(e){
      console.warn('Workhorse starter rankings could not be created from Sleeper ADP',e);
      return false;
    }finally{busy=false}
  }

  async function createLocalStarter(){
    let count=0;try{count=Object.keys(rankingLists||{}).length}catch(_){return false}
    if(busy||currentUser||count)return false;
    if(activeListId&&!rankingLists?.[activeListId])activeListId=null;
    if(activeListId)return false;
    busy=true;
    try{
      const rows=await fetchStarterRows();
      if(!rows||currentUser||activeListId||Object.keys(rankingLists||{}).length)return false;
      const list=cleanListData('My Rankings',playersFromRows(rows));
      if(!list)return false;
      await persistNewList(list);
      activeTagFilter='ALL';
      document.getElementById('newListModal')?.classList.remove('open');
      try{localStorage.setItem(MIGRATION_KEY,'1')}catch(_){}
      try{renderEverything()}catch(_){}
      return true;
    }catch(e){
      console.warn('Workhorse guest starter rankings could not be created from Sleeper ADP',e);
      return false;
    }finally{busy=false}
  }

  async function migrateUntouchedLocalStarter(){
    if(currentUser)return false;
    let ids=[];try{ids=Object.keys(rankingLists||{})}catch(_){return false}
    if(ids.length!==1)return false;
    const id=ids[0],before=rankingLists[id];
    if(!untouchedBuiltInList(before))return false;
    try{
      const rows=await fetchStarterRows();
      if(!rows||currentUser)return false;
      const list=rankingLists?.[id];
      if(!list||!untouchedBuiltInList(list))return false;
      list.players=playersFromRows(rows);
      list.tiers=emptyTiers();
      list.draftPrefs=null;
      list.excludedSleeperIds=[];
      list.updatedAt=Date.now();
      rankingLists[id]=list;
      activeListId=id;
      loadActiveList();
      activeTagFilter='ALL';
      try{saveLocalLists()}catch(_){}
      try{localStorage.setItem(MIGRATION_KEY,'1')}catch(_){}
      try{renderEverything()}catch(_){}
      return true;
    }catch(e){
      console.warn('Workhorse local starter could not be replaced with Sleeper ADP',e);
      return false;
    }
  }

  async function migrateUntouchedCloudStarter(){
    if(!currentUser)return false;
    let ids=[];try{ids=Object.keys(rankingLists||{})}catch(_){return false}
    if(ids.length!==1)return false;
    const id=ids[0],before=rankingLists[id];
    if(!untouchedBuiltInList(before))return false;
    try{
      const rows=await fetchStarterRows();
      if(!rows||!currentUser)return false;
      const list=rankingLists?.[id];
      if(!list||!untouchedBuiltInList(list))return false;
      list.players=playersFromRows(rows);
      list.tiers=emptyTiers();
      list.draftPrefs=null;
      list.excludedSleeperIds=[];
      list.updatedAt=Date.now();
      rankingLists[id]=list;
      activeListId=id;
      loadActiveList();
      activeTagFilter='ALL';
      try{renderEverything()}catch(_){}
      try{queueCloudSave()}catch(_){try{save()}catch(__){}}
      return true;
    }catch(e){
      console.warn('Workhorse legacy cloud starter could not be replaced with Sleeper ADP',e);
      return false;
    }
  }

  // Explicit "from ADP" lists preserve the current ADP format the user is viewing.
  const baseCreateNamedList=typeof createNamedList==='function'?createNamedList:null;
  if(baseCreateNamedList){
    createNamedList=async function(kind){
      if(kind!=='adp')return baseCreateNamedList.apply(this,arguments);
      const name=document.getElementById('newListName')?.value?.trim();
      if(!name){document.getElementById('newListName')?.focus();return}
      try{
        if(typeof refreshCurrentAdp==='function')await refreshCurrentAdp();
        const ps=freshPlayersFromMemory();
        const list=cleanListData(name,ps);
        if(!list)throw new Error('Sleeper ADP is still loading.');
        await persistNewList(list);
        activeTagFilter='ALL';
        document.getElementById('newListModal')?.classList.remove('open');
      }catch(e){alert('Could not create list: '+(e?.message||e))}
    };
    try{window.createNamedList=createNamedList}catch(_){}
  }

  async function confirmNewList(){
    const input=document.getElementById('newListName');
    const name=input?.value?.trim();
    if(!name){input?.focus();return}
    if(createConfirmBusy)return;
    createConfirmBusy=true;
    const btn=document.getElementById('workhorseCreateListConfirm');
    if(btn){btn.disabled=true;btn.textContent='Creating…'}
    try{
      if(typeof createNamedList!=='function')throw new Error('List creation is not ready yet.');
      await createNamedList('adp');
    }catch(e){
      alert('Could not create list: '+(e?.message||e));
    }finally{
      createConfirmBusy=false;
      if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='Create List'}
    }
  }

  function ensureCreateConfirm(){
    const modal=document.getElementById('newListModal');
    const input=document.getElementById('newListName');
    if(!modal||!input)return false;
    let btn=document.getElementById('workhorseCreateListConfirm');
    if(!btn){
      btn=document.createElement('button');
      btn.id='workhorseCreateListConfirm';
      btn.type='button';
      btn.textContent='Create List';
      const sample=[...modal.querySelectorAll('button')].find(x=>x.id!=='workhorseCreateListConfirm');
      if(sample?.className)btn.className=sample.className;
      if(!String(btn.className||'').trim())btn.className='btn primary';
      btn.style.marginTop='12px';
      btn.style.width='100%';
      btn.addEventListener('click',confirmNewList);
      input.insertAdjacentElement('afterend',btn);
    }
    if(!input.dataset.workhorseCreateConfirm){
      input.dataset.workhorseCreateConfirm='1';
      input.addEventListener('keydown',e=>{
        if(e.key!=='Enter'||e.shiftKey||e.altKey||e.ctrlKey||e.metaKey)return;
        e.preventDefault();
        confirmNewList();
      });
    }
    return true;
  }

  // Cloud reliability loads the account first. If the account has zero lists, create the starter from Sleeper PPR directly. If it has only the untouched legacy built-in, migrate it.
  const baseLoadCloudLists=typeof loadCloudLists==='function'?loadCloudLists:null;
  if(baseLoadCloudLists){
    loadCloudLists=async function(){
      const out=await baseLoadCloudLists.apply(this,arguments);
      if(currentUser&&!activeListId&&Object.keys(rankingLists||{}).length===0)await createCloudStarter();
      else if(currentUser)await migrateUntouchedCloudStarter();
      return out;
    };
    try{window.loadCloudLists=loadCloudLists}catch(_){}
  }

  async function reconcile(){
    if(currentUser){
      if(!activeListId&&Object.keys(rankingLists||{}).length===0)await createCloudStarter();
      else await migrateUntouchedCloudStarter();
    }else{
      let ids=[];try{ids=Object.keys(rankingLists||{})}catch(_){}
      if(ids.length===0)await createLocalStarter();
      else await migrateUntouchedLocalStarter();
    }
    try{window.WorkhorseReconcileSleeperRankings?.()}catch(_){}
  }

  [80,250,700,1500,3000].forEach(ms=>setTimeout(ensureCreateConfirm,ms));
  document.addEventListener('click',e=>{
    const modal=document.getElementById('newListModal');
    if(modal&&!modal.classList.contains('open'))setTimeout(ensureCreateConfirm,0);
  });
  window.addEventListener('workhorse:cloud-rankings-ready',()=>setTimeout(reconcile,0));
  [100,500,1200,2500,5000,8000].forEach(ms=>setTimeout(reconcile,ms));
})();

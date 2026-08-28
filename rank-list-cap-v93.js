// v93 — hard-cap every ranking list at 250 players, including existing local/cloud lists.
(()=>{
  const MAX_PLAYERS=250;
  let enforcing=false;

  const orderedTop=arr=>(Array.isArray(arr)?arr.slice():[])
    .sort((a,b)=>(Number(a?.overall)||999999)-(Number(b?.overall)||999999))
    .slice(0,MAX_PLAYERS);

  function normalizeList(list){
    if(!list||!Array.isArray(list.players)||list.players.length<=MAX_PLAYERS)return false;
    list.players=orderedTop(list.players);
    const posCounts={};
    list.players.forEach((p,i)=>{
      p.overall=i+1;
      const pos=String(p?.position||'');
      posCounts[pos]=(posCounts[pos]||0)+1;
      p.posRank=posCounts[pos];
    });
    list.updatedAt=Date.now();
    return true;
  }

  function normalizeAll(){
    const changed=[];
    try{
      for(const [id,list] of Object.entries(rankingLists||{})){
        if(normalizeList(list)){rankingLists[id]=list;changed.push(list)}
      }
      if(changed.some(x=>String(x.id)===String(activeListId))){
        try{loadActiveList()}catch(_){}
      }
    }catch(_){}
    return changed;
  }

  async function persistCloudList(list){
    try{
      if(!supabaseClient||!currentUser||!list?.id||String(list.id).startsWith('local_'))return;
      const payload={
        players:list.players||[],tiers:list.tiers||emptyTiers(),draftPrefs:list.draftPrefs||null,
        excludedSleeperIds:Array.isArray(list.excludedSleeperIds)?list.excludedSleeperIds:[]
      };
      let expected=Number(list._cloudRevision)||1;
      let {data,error}=await supabaseClient.from('ranking_lists').update({name:list.name||'Untitled List',data:payload})
        .eq('id',list.id).eq('user_id',currentUser.id).eq('revision',expected)
        .select('revision,updated_at').maybeSingle();
      if(error)throw error;
      if(!data){
        const latest=await supabaseClient.from('ranking_lists').select('name,data,revision,updated_at').eq('id',list.id).eq('user_id',currentUser.id).single();
        if(latest.error)throw latest.error;
        const serverList={
          id:list.id,name:latest.data.name||list.name,players:latest.data.data?.players||[],tiers:latest.data.data?.tiers||emptyTiers(),
          draftPrefs:latest.data.data?.draftPrefs||null,excludedSleeperIds:latest.data.data?.excludedSleeperIds||[],
          _cloudRevision:Number(latest.data.revision)||1
        };
        if(!normalizeList(serverList))return;
        const retry=await supabaseClient.from('ranking_lists').update({
          name:serverList.name,data:{players:serverList.players,tiers:serverList.tiers,draftPrefs:serverList.draftPrefs,excludedSleeperIds:serverList.excludedSleeperIds}
        }).eq('id',serverList.id).eq('user_id',currentUser.id).eq('revision',serverList._cloudRevision)
          .select('revision,updated_at').maybeSingle();
        if(retry.error)throw retry.error;
        data=retry.data;
      }
      if(data){
        list._cloudRevision=Number(data.revision)||expected;
        list._cloudUpdatedAt=Date.parse(data.updated_at)||Date.now();
      }
    }catch(e){console.warn('Workhorse 250-player cloud cap save failed',e)}
  }

  async function enforceAll({persistCloud=true}={}){
    if(enforcing)return [];
    enforcing=true;
    try{
      const changed=normalizeAll();
      if(!changed.length)return changed;
      try{
        if(typeof currentUser!=='undefined'&&currentUser){
          if(persistCloud)await Promise.all(changed.map(persistCloudList));
        }else if(typeof saveLocalLists==='function')saveLocalLists();
      }catch(_){}
      try{if(typeof renderRankings==='function')renderRankings()}catch(_){}
      return changed;
    }finally{enforcing=false}
  }

  // Never allow a normal save to put >250 players back into storage.
  try{
    const baseSave=typeof save==='function'?save:null;
    if(baseSave){
      save=function(){try{normalizeAll()}catch(_){}return baseSave.apply(this,arguments)};
      window.save=save;
    }
  }catch(_){}
  try{
    const baseLocal=typeof saveLocalLists==='function'?saveLocalLists:null;
    if(baseLocal){
      saveLocalLists=function(){try{normalizeAll()}catch(_){}return baseLocal.apply(this,arguments)};
      window.saveLocalLists=saveLocalLists;
    }
  }catch(_){}
  try{
    const basePersist=typeof persistNewList==='function'?persistNewList:null;
    if(basePersist){
      persistNewList=async function(list){normalizeList(list);return basePersist.apply(this,arguments)};
      window.persistNewList=persistNewList;
    }
  }catch(_){}
  try{
    const baseCloud=typeof loadCloudLists==='function'?loadCloudLists:null;
    if(baseCloud){
      loadCloudLists=async function(){const out=await baseCloud.apply(this,arguments);await enforceAll({persistCloud:true});return out};
      window.loadCloudLists=loadCloudLists;
    }
  }catch(_){}

  // Clean lists already sitting in this browser immediately, then clean cloud lists after restore.
  enforceAll({persistCloud:false});
  window.addEventListener('workhorse:cloud-rankings-ready',()=>enforceAll({persistCloud:true}));
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-restore-version]'))[700,1800].forEach(ms=>setTimeout(()=>enforceAll({persistCloud:true}),ms));
  },true);

  window.WorkhorseRankingListCap={max:MAX_PLAYERS,enforce:()=>enforceAll({persistCloud:true})};
})();

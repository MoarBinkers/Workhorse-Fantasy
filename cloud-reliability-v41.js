// v41.2 — reliable cloud saves, valid cloud-list restore, optimistic revision checks, ranking backups, and sync preferences.
(()=>{
  const DEVICE_KEY='de41_device_id';
  const CACHE_KEY='de41_cloud_cache';
  const deviceId=localStorage.getItem(DEVICE_KEY)||('dev_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10));
  localStorage.setItem(DEVICE_KEY,deviceId);
  let saveBusy=false,pendingSave=false,retryCount=0,statusTimer=null,cloudLoadPromise=null;

  function syncStatus(text,tone='normal'){
    let el=document.getElementById('deCloudStatus');
    if(!el){
      const note=document.getElementById('accountSettingsNote');
      if(!note)return;
      el=document.createElement('div');el.id='deCloudStatus';el.className='settings-note';el.style.marginTop='8px';note.insertAdjacentElement('afterend',el);
    }
    el.textContent=text;
    el.style.borderLeftColor=tone==='good'?'#3c8f62':tone==='bad'?'#a94b5b':tone==='warn'?'#b08a3f':'#40576a';
  }
  function cacheLists(){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({activeListId,rankingLists,savedAt:Date.now()}))}catch(_){}
  }
  function cloneData(list){return {players:structuredClone(list?.players||[]),tiers:structuredClone(list?.tiers||emptyTiers()),draftPrefs:structuredClone(list?.draftPrefs||null),excludedSleeperIds:structuredClone(list?.excludedSleeperIds||[])}}

  const baseSave=typeof save==='function'?save:null;
  if(baseSave){
    save=function(){const out=baseSave();cacheLists();return out};
    window.save=save;
  }

  async function storeRecoveryVersion(list,source='manual'){
    if(!supabaseClient||!currentUser||!list?.id||String(list.id).startsWith('local_'))return null;
    const {data,error}=await supabaseClient.from('ranking_list_versions').insert({
      list_id:list.id,user_id:currentUser.id,name:list.name||'Untitled List',data:cloneData(list),revision:Number(list._cloudRevision)||1,source
    }).select('id,created_at').single();
    if(error)throw error;return data;
  }

  async function fetchCloudRow(id){
    const {data,error}=await supabaseClient.from('ranking_lists')
      .select('id,user_id,name,data,created_at,updated_at,revision,last_device_id')
      .eq('id',id).eq('user_id',currentUser.id).single();
    if(error)throw error;return data;
  }

  async function writePayload(id,payload,expectedRevision){
    const {data,error}=await supabaseClient.from('ranking_lists').update({
      name:payload.name,data:payload.data,last_device_id:deviceId
    }).eq('id',id).eq('user_id',currentUser.id).eq('revision',expectedRevision)
      .select('revision,updated_at,last_device_id').maybeSingle();
    if(error)throw error;return data;
  }

  async function resolveConflict(id,payload,list){
    const server=await fetchCloudRow(id);
    try{await storeRecoveryVersion({...list,name:payload.name,players:payload.data.players,tiers:payload.data.tiers,excludedSleeperIds:payload.data.excludedSleeperIds||[]},'conflict_local')}catch(e){console.warn('Conflict recovery snapshot failed',e)}
    const written=await writePayload(id,payload,Number(server.revision)||1);
    if(!written)throw new Error('Cloud version changed again while resolving a sync conflict.');
    list._cloudRevision=Number(written.revision)||((Number(server.revision)||1)+1);
    list._cloudUpdatedAt=Date.parse(written.updated_at)||Date.now();
    list._lastDeviceId=written.last_device_id||deviceId;
    syncStatus('Cloud synced · a conflicting version was safely preserved in Backups.','warn');
  }

  async function flushCloudSave(){
    if(saveBusy){pendingSave=true;return}
    if(!supabaseClient||!currentUser||!activeListId||!currentList())return;
    const list=currentList();
    if(String(list.id||'').startsWith('local_'))return;
    saveBusy=true;pendingSave=false;
    const id=list.id;
    const payload={name:list.name||'Untitled List',data:cloneData(list)};
    const expected=Number(list._cloudRevision)||1;
    syncStatus('Saving to cloud…');
    try{
      const written=await writePayload(id,payload,expected);
      if(!written){
        await resolveConflict(id,payload,list);
      }else{
        list._cloudRevision=Number(written.revision)||expected;
        list._cloudUpdatedAt=Date.parse(written.updated_at)||Date.now();
        list._lastDeviceId=written.last_device_id||deviceId;
        retryCount=0;
        syncStatus('Cloud synced.','good');
      }
      cacheLists();
    }catch(e){
      console.warn('Cloud save failed',e);
      retryCount++;
      syncStatus('Cloud save pending — your changes are protected in this browser.','bad');
      if(retryCount<=3){
        clearTimeout(statusTimer);
        statusTimer=setTimeout(()=>flushCloudSave(),Math.min(8000,1200*Math.pow(2,retryCount-1)));
      }
    }finally{
      saveBusy=false;
      if(pendingSave){pendingSave=false;setTimeout(()=>flushCloudSave(),80)}
    }
  }

  queueCloudSave=function(){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer=setTimeout(flushCloudSave,450);
  };
  window.queueCloudSave=queueCloudSave;
  window.DraftEdgeFlushCloudSave=flushCloudSave;

  persistNewList=async function(list){
    if(!Array.isArray(list.excludedSleeperIds))list.excludedSleeperIds=[];
    if(currentUser&&supabaseClient){
      const {data,error}=await supabaseClient.from('ranking_lists').insert({
        user_id:currentUser.id,name:list.name,data:{players:list.players,tiers:list.tiers,draftPrefs:list.draftPrefs||null,excludedSleeperIds:list.excludedSleeperIds||[]},last_device_id:deviceId
      }).select('id,name,data,created_at,updated_at,revision,last_device_id').single();
      if(error)throw error;
      list.id=data.id;list.createdAt=Date.parse(data.created_at)||Date.now();list.updatedAt=Date.parse(data.updated_at)||Date.now();
      list._cloudRevision=Number(data.revision)||1;list._cloudUpdatedAt=Date.parse(data.updated_at)||Date.now();list._lastDeviceId=data.last_device_id||deviceId;
    }
    rankingLists[list.id]=list;activeListId=list.id;
    if(!currentUser)saveLocalLists();
    cacheLists();loadActiveList();renderEverything();return list;
  };
  window.persistNewList=persistNewList;

  loadCloudLists=async function(){
    if(cloudLoadPromise)return cloudLoadPromise;
    if(!supabaseClient||!currentUser)return;
    cloudLoadPromise=(async()=>{
      const prior=activeListId;
      suspendCloudSave=true;
      syncStatus('Loading cloud rankings…');
      try{
        const {data,error}=await supabaseClient.from('ranking_lists')
          .select('id,user_id,name,data,created_at,updated_at,revision,last_device_id')
          .eq('user_id',currentUser.id).order('updated_at',{ascending:false});
        if(error)throw error;
        rankingLists={};
        (data||[]).forEach(row=>rankingLists[row.id]={
          id:row.id,name:row.name,players:row.data?.players||[],tiers:row.data?.tiers||emptyTiers(),draftPrefs:row.data?.draftPrefs||null,excludedSleeperIds:Array.isArray(row.data?.excludedSleeperIds)?row.data.excludedSleeperIds:[],
          createdAt:Date.parse(row.created_at)||Date.now(),updatedAt:Date.parse(row.updated_at)||Date.now(),
          _cloudRevision:Number(row.revision)||1,_cloudUpdatedAt:Date.parse(row.updated_at)||Date.now(),_lastDeviceId:row.last_device_id||null
        });
        activeListId=(prior&&rankingLists[prior])?prior:(data?.[0]?.id||null);
        loadActiveList();cacheLists();renderEverything();syncStatus('Cloud synced.','good');
        window.WorkhorseCloudRankingsReady=true;
        try{window.dispatchEvent(new CustomEvent('workhorse:cloud-rankings-ready',{detail:{count:(data||[]).length,activeListId}}))}catch(_){}
        if(!activeListId)openNewList();
      }catch(e){
        console.warn('Could not load cloud rankings',e);
        syncStatus('Could not load cloud rankings. Your browser copy is still protected.','bad');
      }finally{suspendCloudSave=false}
    })();
    try{return await cloudLoadPromise}finally{cloudLoadPromise=null}
  };
  window.loadCloudLists=loadCloudLists;

  function ensureBackupUI(){
    const actions=document.querySelector('#settingsModal .settings-section .settings-actions');
    if(actions&&!document.getElementById('deBackupsBtn')){
      const b=document.createElement('button');b.className='btn';b.id='deBackupsBtn';b.textContent='Ranking Backups';b.onclick=openBackups;actions.appendChild(b);
    }
    if(document.getElementById('deBackupsModal'))return;
    const modal=document.createElement('div');modal.className='modal';modal.id='deBackupsModal';
    modal.innerHTML='<div class="modalbox" style="width:min(720px,calc(100vw - 40px))"><button class="close" id="deCloseBackups">×</button><h2>Ranking Backups</h2><div class="small" id="deBackupSub">Automatic cloud snapshots protect earlier versions of your current ranking list.</div><div class="settings-actions" style="margin:14px 0"><button class="btn primary" id="deBackupNow">Save Backup Now</button></div><div id="deBackupList"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('mousedown',e=>{if(e.target===modal)modal.classList.remove('open')});
    modal.querySelector('#deCloseBackups').onclick=()=>modal.classList.remove('open');
    modal.querySelector('#deBackupNow').onclick=async()=>{try{await storeRecoveryVersion(currentList(),'manual');await renderBackups();syncStatus('Manual backup saved.','good')}catch(e){alert('Could not save backup: '+e.message)}};
    modal.querySelector('#deBackupList').addEventListener('click',async e=>{
      const btn=e.target.closest('[data-restore-version]');if(!btn)return;
      const id=btn.dataset.restoreVersion;
      if(!confirm('Restore this ranking backup? Your current cloud version will be backed up first.'))return;
      try{
        const {data,error}=await supabaseClient.from('ranking_list_versions').select('id,name,data,revision,created_at').eq('id',id).eq('user_id',currentUser.id).single();
        if(error)throw error;
        const list=currentList();if(!list)throw new Error('No active ranking list.');
        list.name=data.name;list.players=structuredClone(data.data?.players||[]);list.tiers=structuredClone(data.data?.tiers||emptyTiers());list.excludedSleeperIds=structuredClone(data.data?.excludedSleeperIds||[]);list.updatedAt=Date.now();
        rankingLists[activeListId]=list;loadActiveList();cacheLists();renderEverything();await flushCloudSave();await renderBackups();
      }catch(err){alert('Restore failed: '+err.message)}
    });
  }

  async function renderBackups(){
    const root=document.getElementById('deBackupList');if(!root)return;
    if(!supabaseClient||!currentUser||!activeListId){root.innerHTML='<div class="small" style="padding:16px 0">Sign in to use cloud backups.</div>';return}
    root.innerHTML='<div class="small" style="padding:16px 0">Loading backups…</div>';
    const {data,error}=await supabaseClient.from('ranking_list_versions')
      .select('id,name,data,revision,source,created_at').eq('list_id',activeListId).eq('user_id',currentUser.id)
      .order('created_at',{ascending:false}).limit(50);
    if(error){root.innerHTML='<div class="small">Could not load backups: '+String(error.message||error)+'</div>';return}
    root.innerHTML=(data||[]).length?(data||[]).map(v=>{
      const when=new Date(v.created_at).toLocaleString();const count=Array.isArray(v.data?.players)?v.data.players.length:0;
      const source=v.source==='manual'?'Manual':v.source==='conflict_local'?'Conflict protected':'Automatic';
      return '<div class="historyrow" style="padding:11px 0"><span><b>'+when+'</b><br><span class="small">'+source+' · Revision '+v.revision+' · '+count+' players</span></span><button class="btn" data-restore-version="'+v.id+'">Restore</button></div>';
    }).join(''):'<div class="small" style="padding:16px 0">No older cloud versions yet. They are created automatically as you edit.</div>';
  }

  function openBackups(){ensureBackupUI();document.getElementById('deBackupsModal').classList.add('open');renderBackups()}
  window.openDraftEdgeBackups=openBackups;

  function refreshSettingsCopy(){
    const sections=[...document.querySelectorAll('#settingsModal .settings-section')];
    const adp=sections.find(x=>x.querySelector('h3')?.textContent.trim()==='Current ADP');
    const small=adp?.querySelector('.small');if(small)small.textContent='Sleeper ADP and movement history are shared centrally and update independently of your browser.';
    const note=document.getElementById('accountSettingsNote');if(note)note.textContent='Signed-in ranking lists use conflict-safe cloud saves and automatic version backups across devices.';
  }

  function startCloudRestore(attempt=0){
    const signedIn=typeof currentUser!=='undefined'&&currentUser;
    if(signedIn){loadCloudLists();return}
    if(attempt<20)setTimeout(()=>startCloudRestore(attempt+1),250);
  }

  ensureBackupUI();refreshSettingsCopy();
  startCloudRestore();
})();

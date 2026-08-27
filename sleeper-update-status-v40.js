// v40 — show the last actual Sleeper rank-data update, not the last app/database check.
(()=>{
  const CACHE_MS=30000;
  const cache=new Map();
  let client=null;
  let pending=null;

  function getClient(){
    if(client)return client;
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient){client=supabaseClient;return client}}catch(_){}
    if(window.supabase&&typeof window.supabase.createClient==='function'&&typeof DRAFT_EDGE_SUPABASE_URL!=='undefined'&&typeof DRAFT_EDGE_SUPABASE_KEY!=='undefined'){
      client=window.supabase.createClient(DRAFT_EDGE_SUPABASE_URL,DRAFT_EDGE_SUPABASE_KEY);
      return client;
    }
    throw new Error('Draft Edge database is not ready yet.');
  }

  function activeFormat(){
    try{if(typeof window.DraftEdgeAdpFormat==='function')return window.DraftEdgeAdpFormat()}catch(_){}
    return localStorage.getItem('de36_adp_format')||'ppr';
  }

  function whenText(value){
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '—';
    const now=new Date();
    const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const startThatDay=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    const dayDiff=Math.round((startToday-startThatDay)/86400000);
    const time=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    if(dayDiff===0)return 'Today at '+time;
    if(dayDiff===1)return 'Yesterday at '+time;
    return d.toLocaleDateString([], {month:'short',day:'numeric'})+' at '+time;
  }

  async function lastActualUpdate(force=false){
    const format=activeFormat();
    const hit=cache.get(format);
    if(!force&&hit&&Date.now()-hit.checked<CACHE_MS)return hit.value;
    const {data,error}=await getClient().from('sleeper_adp_history')
      .select('captured_at')
      .eq('format',format)
      .order('captured_at',{ascending:false})
      .limit(1);
    if(error)throw error;
    const value=Array.isArray(data)&&data[0]?.captured_at?data[0].captured_at:null;
    cache.set(format,{checked:Date.now(),value});
    return value;
  }

  async function paint(force=false){
    const el=document.getElementById('liveText');
    if(!el)return;
    try{
      const value=await lastActualUpdate(force);
      el.textContent='Last available update: '+(value?whenText(value):'—');
    }catch(e){
      console.warn('Could not read last available Sleeper update',e);
      if(!el.textContent.startsWith('Last available update:'))el.textContent='Last available update: —';
    }
  }

  function schedule(force=false,delay=120){
    clearTimeout(pending);
    pending=setTimeout(()=>paint(force),delay);
  }

  function install(){
    const live=document.getElementById('liveText');
    if(!live)return false;

    new MutationObserver(()=>{
      if(!live.textContent.startsWith('Last available update:'))schedule(false,80);
    }).observe(live,{childList:true,subtree:true,characterData:true});

    const update=document.getElementById('topUpdate');
    if(update)update.addEventListener('click',()=>schedule(true,350),true);

    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-adp-format]'))schedule(false,250);
    },true);

    const initial=()=>schedule(true,0);
    if('requestIdleCallback' in window)requestIdleCallback(initial,{timeout:1800});
    else setTimeout(initial,800);
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();

// v83.2 — subtle material-news badges with list-scoped decoration work.
(()=>{
  const LOOKBACK_HOURS=48;
  const REFRESH_MS=10*60*1000;
  const MAX_ROWS=350;
  const newsByPlayer=new Map();
  const pendingLists=new Set();
  let client=null,loading=null,lastLoaded=0;

  const $=id=>document.getElementById(id);
  const keyFor=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
  const cats=n=>Array.isArray(n?.categories)?n.categories.map(x=>String(x).toLowerCase()):[];
  const stamp=n=>{const t=new Date(n?.published_at||0).getTime();return Number.isFinite(t)?t:0};

  function css(){
    if($('whRankNews83Css'))return;
    const s=document.createElement('style');s.id='whRankNews83Css';s.textContent=`
      #page-rankings .wh83-news-update,#page-adp .wh83-news-update{
        display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 6px;
        border:1px solid #425565;border-radius:999px;background:#111b23;color:#9db0bd;
        font-size:8px;font-weight:900;line-height:1.25;letter-spacing:.025em;white-space:nowrap;
        vertical-align:1px;cursor:pointer
      }
      #page-rankings .wh83-news-update::before,#page-adp .wh83-news-update::before{
        content:'';width:5px;height:5px;border-radius:50%;background:#6f9bb7;box-shadow:0 0 0 2px rgba(111,155,183,.10)
      }
      #page-rankings .wh83-news-update:hover,#page-adp .wh83-news-update:hover{border-color:#587287;color:#c2d0d9}
      @media(max-width:760px){
        #page-rankings .wh83-news-update,#page-adp .wh83-news-update{margin-left:4px;padding:2px 5px;font-size:7.5px}
      }
    `;document.head.appendChild(s);
  }

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

  function materialScore(n){
    const categories=cats(n);if(categories.includes('trending')||categories.includes('indirect'))return -99;
    const h=String(n?.headline||'').toLowerCase();
    const s=String(n?.summary||'').toLowerCase();
    const f=String(n?.fantasy_impact||'').toLowerCase();
    const text=h+' '+s;
    let score=0;

    if(categories.includes('status'))score+=7;
    if(/\b(injured reserve|injury|injured|questionable|doubtful|ruled out|out for|surgery|acl|mcl|concussion|hamstring|ankle|knee|hip|shoulder|foot)\b/.test(text))score+=5;
    if(/\b(signs?|signed|signing|trade|traded|acquired|released|waived|waive|cut|suspended|suspension|activated|pup|holdout)\b/.test(text))score+=5;
    if(/\b(qb1|starter|starting job|starting role|named the starter|depth chart|first[- ]team|promoted|demoted|wins? the job|loses? the job)\b/.test(text))score+=4;
    if(/\b(expanded route|route tree|workload|touches|targets|snap share|snaps|featured role|larger role|reduced role|role increase|role decrease|backfield split|committee)\b/.test(text))score+=4;
    if(/\b(return(?:s|ed|ing)? to practice|resume(?:s|d)? practic|cleared to practice|full practice|limited practice|miss(?:es|ed|ing)? practice|expected to play|not expected to play|unlikely to play|week 1 status)\b/.test(text))score+=4;

    if(/health and availability|availability concern/.test(f))score+=3;
    if(/roster change can materially affect/.test(f))score+=3;
    if(/changed this player.?s injury or status|fresh availability signal/.test(f))score+=4;
    if(/volume, efficiency and surrounding competition/.test(f))score+=2;

    // Do not promote relationship/commentary stories just because they mention an older transaction.
    if(/\b(post-trade rift|reunite|reunited|caught up|joint practices?)\b/.test(h))score-=8;

    return score;
  }

  function isMaterial(n){
    const age=Date.now()-stamp(n);if(!Number.isFinite(age)||age<0||age>LOOKBACK_HOURS*3600000)return false;
    return materialScore(n)>=4;
  }

  function relative(v){
    const t=stamp({published_at:v});if(!t)return '';
    const min=Math.max(0,Math.floor((Date.now()-t)/60000));
    if(min<60)return min<=1?'just now':min+'m ago';
    const hr=Math.floor(min/60);if(hr<24)return hr+'h ago';
    return Math.floor(hr/24)+'d ago';
  }

  async function load(force=false){
    if(loading)return loading;
    if(!force&&lastLoaded&&Date.now()-lastLoaded<REFRESH_MS)return;
    const db=getClient();if(!db)return;
    loading=(async()=>{
      try{
        const cutoff=new Date(Date.now()-LOOKBACK_HOURS*3600000).toISOString();
        const {data,error}=await db.from('player_news')
          .select('player_key,provider,headline,summary,fantasy_impact,categories,published_at')
          .gte('published_at',cutoff)
          .order('published_at',{ascending:false})
          .limit(MAX_ROWS);
        if(error)throw error;
        newsByPlayer.clear();
        for(const n of Array.isArray(data)?data:[]){
          if(!isMaterial(n))continue;
          const key=keyFor(n.player_key);if(!key||newsByPlayer.has(key))continue;
          newsByPlayer.set(key,n);
        }
        lastLoaded=Date.now();decorate();
      }catch(e){console.warn('Workhorse rankings news badges unavailable',e)}
      finally{loading=null}
    })();
    return loading;
  }

  function rowName(row){return String(row.querySelector('.name')?.textContent||'').trim()}

  function decorateList(list){
    if(!list)return;
    list.querySelectorAll('.player').forEach(row=>{
      const line=row.querySelector('.name-line');if(!line)return;
      const key=keyFor(rowName(row));
      const news=key?newsByPlayer.get(key):null;
      let badge=line.querySelector(':scope > .wh83-news-update');
      if(!news){badge?.remove();return}
      if(!badge){
        badge=document.createElement('span');badge.className='wh83-news-update';badge.textContent='News Update';
        const name=line.querySelector('.name');if(name)name.insertAdjacentElement('afterend',badge);else line.prepend(badge);
      }
      const when=relative(news.published_at);
      badge.title=(news.headline||'Recent player news')+(when?' · '+when:'')+' — click the player for details';
      badge.setAttribute('aria-label','News Update: '+String(news.headline||'recent player news'));
    });
  }

  function decorate(){
    css();
    decorateList($('rankList'));
    decorateList($('adpList'));
  }

  function scheduleList(id){
    if(pendingLists.has(id))return;
    pendingLists.add(id);
    const run=()=>{pendingLists.delete(id);decorateList($(id))};
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:250});
    else setTimeout(run,60);
  }

  function observe(id){
    const list=$(id);if(!list||list.__whNews83Observed)return false;
    const mo=new MutationObserver(()=>scheduleList(id));
    mo.observe(list,{childList:true,subtree:true});list.__whNews83Observed=true;return true;
  }

  function boot(){css();decorate();observe('rankList');observe('adpList')}
  boot();
  setTimeout(boot,900);
  const loadNews=()=>load(false);
  if('requestIdleCallback' in window)requestIdleCallback(loadNews,{timeout:2500});
  else setTimeout(loadNews,1200);
  setInterval(()=>load(false),REFRESH_MS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(false)});
  window.WorkhorseRankingsNews={refresh:()=>load(true),decorate};
})();

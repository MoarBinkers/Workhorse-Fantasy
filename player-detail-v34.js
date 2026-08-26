// v34.2 — player details open immediately; heavier ADP history renders after the drawer opens.
(()=>{
  const HISTORY_KEY='de29_adp_history';
  let detailRenderSeq=0;

  const htmlEsc=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>typeof cleanPlayerName==='function'?cleanPlayerName(v):String(v||'').trim();
  const normalized=v=>typeof norm==='function'?norm(v):clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const signed=n=>!Number.isFinite(Number(n))?'—':Number(n)>0?'+'+Number(n):String(Number(n));
  const moveClass=n=>Number(n)>0?'up':Number(n)<0?'down':'flat';

  function readHistoryStore(){
    try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}')||{}}catch(_){return {}}
  }
  function writeHistoryStore(store){
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify(store))}catch(e){console.warn('Could not save full ADP history',e)}
  }
  function marketMatch34(value){
    const name=typeof value==='string'?value:value?.name;
    const id=typeof value==='object'?(value?.sleeperId||value?.id):null;
    if(name&&market[name])return {name,entry:market[name]};
    const n=normalized(name);
    for(const [key,entry] of Object.entries(market||{})){
      if(!entry||typeof entry!=='object')continue;
      if(id&&entry.id&&String(entry.id)===String(id))return {name:key,entry};
      if(n&&normalized(key)===n)return {name:key,entry};
    }
    return null;
  }
  function historyKey34(p){
    const m=marketFor(p)||marketMatch34(p)?.entry;
    const id=m?.id||p?.sleeperId||p?.id;
    return id?'id:'+id:'name:'+normalized(p?.name||p);
  }
  function allHistoryFor(p){
    const store=readHistoryStore();
    let list=Array.isArray(store[historyKey34(p)])?store[historyKey34(p)].slice():[];
    if(!list.length&&typeof history==='object'&&history){
      const n=normalized(p?.name||p);
      for(const [oldName,oldList] of Object.entries(history)){
        if(normalized(oldName)===n&&Array.isArray(oldList)){
          list=oldList.map(x=>({t:x.t||null,rank:Number(x.rank),label:x.label||null}));
          break;
        }
      }
    }
    list=list.filter(x=>Number.isFinite(Number(x.rank))).map(x=>({...x,rank:Number(x.rank)}));
    const current=Number(marketFor(p)?.rank);
    if(Number.isFinite(current)&&(!list.length||Number(list[list.length-1].rank)!==current)){
      list.push({t:Date.now(),rank:current,label:'Current'});
    }
    return list;
  }
  function historySummary(p){
    const list=allHistoryFor(p);
    if(!list.length)return {list,first:null,current:null,best:null,worst:null,total:null};
    const ranks=list.map(x=>Number(x.rank));
    const first=ranks[0],current=ranks[ranks.length-1];
    return {list,first,current,best:Math.min(...ranks),worst:Math.max(...ranks),total:first-current};
  }
  function formatUpdatedAt(ms){
    const n=Number(ms);if(!Number.isFinite(n)||n<=0)return '—';
    const d=new Date(n);if(Number.isNaN(d.getTime()))return '—';
    const now=new Date();
    const sameDay=d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
    return sameDay?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function historyHtml(p){
    const h=historySummary(p),raw=h.list,step=raw.length>120?(raw.length-1)/119:1,all=raw.length>120?Array.from({length:120},(_,i)=>raw[Math.round(i*step)]):raw;
    if(!all.length)return '<div class="small" style="padding:14px 0">No Sleeper ADP history has been recorded for this player yet.</div>';
    const ranks=all.map(x=>Number(x.rank));
    const min=Math.min(...ranks),max=Math.max(...ranks),range=Math.max(1,max-min);
    const W=Math.max(560,all.length*44),H=210,L=46,R=20,T=20,B=36,iw=W-L-R,ih=H-T-B;
    const pts=all.map((x,i)=>({x:L+(all.length===1?iw/2:(i/(all.length-1))*iw),y:T+((Number(x.rank)-min)/range)*ih,rank:Number(x.rank)}));
    const d=pts.map((c,i)=>(i?'L':'M')+c.x.toFixed(1)+' '+c.y.toFixed(1)).join(' ');
    const color=h.total>0?'#4ade80':h.total<0?'#fb7185':'#8292a0';
    const dots=pts.map(c=>'<circle cx="'+c.x.toFixed(1)+'" cy="'+c.y.toFixed(1)+'" r="4" fill="'+color+'"><title>#'+c.rank+'</title></circle>').join('');
    const graph='<div style="overflow-x:auto;background:#0d141b;border:1px solid #2c3c4b;border-radius:14px;padding:12px;margin-top:8px"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="display:block;max-width:none"><line x1="'+L+'" y1="'+(T+ih)+'" x2="'+(W-R)+'" y2="'+(T+ih)+'" stroke="#2d3c49"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(T+ih)+'" stroke="#2d3c49"/><text x="5" y="'+(T+5)+'" fill="#8fa0af" font-size="11">#'+min+'</text><text x="5" y="'+(T+ih)+'" fill="#8fa0af" font-size="11">#'+max+'</text>'+(all.length>1?'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'')+dots+'</svg></div>';
    const summary='<div class="stats" style="grid-template-columns:repeat(5,minmax(0,1fr));margin-top:10px"><div class="stat"><b>#'+h.first+'</b><span>First Saved</span></div><div class="stat"><b>#'+h.current+'</b><span>Current</span></div><div class="stat"><b>#'+h.best+'</b><span>Best Rank</span></div><div class="stat"><b>#'+h.worst+'</b><span>Worst Rank</span></div><div class="stat"><b class="move '+moveClass(h.total)+'">'+signed(h.total)+'</b><span>Total Move</span></div></div>';
    const stamp='<div class="small" style="margin-top:10px;color:#8fa0af">Last updated: '+htmlEsc(formatUpdatedAt(marketFor(p)?.updatedAt))+'</div>';
    return summary+graph+stamp;
  }

  function historyPlaceholder(token){
    return '<div id="de34History" data-de34-token="'+token+'"><div class="small" style="padding:14px 0;color:#8fa0af">Loading Sleeper ADP history…</div></div>';
  }
  function scheduleHistory(p,token){
    const run=()=>{
      const slot=document.getElementById('de34History');
      if(!slot||slot.dataset.de34Token!==token)return;
      try{slot.innerHTML=historyHtml(p)}catch(e){
        console.warn('Workhorse ADP history could not render',e);
        if(slot&&slot.dataset.de34Token===token)slot.innerHTML='<div class="small" style="padding:14px 0">Sleeper ADP history is temporarily unavailable.</div>';
      }
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:300});else setTimeout(run,0);
  }
  window.WorkhorseRefreshPlayerHistory=function(p){
    const slot=document.getElementById('de34History');if(!slot||!p)return;
    const shown=document.querySelector('#drawerContent .detailhead h2')?.textContent||'';
    if(normalized(shown)!==normalized(p.name||''))return;
    scheduleHistory(p,slot.dataset.de34Token||'');
  };

  function ownedDetailHtml(p,i,token){
    const m=marketFor(p),edge=m?.rank!=null?Number(m.rank)-Number(p.overall):null,mv=Number(m?.move)||0;
    return '<div class="detailhead"><img class="detailimg" src="'+imgUrl(p)+'" onerror="this.style.visibility=\'hidden\'"><div><h2 style="margin:0">'+htmlEsc(clean(p.name))+'</h2><div class="small">'+htmlEsc(p.team)+' · '+htmlEsc(p.position)+' · Bye '+htmlEsc(p.bye)+'</div></div></div>'+
      '<div class="section"><h3>Rank Snapshot</h3><div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="stat"><b>#'+p.overall+'</b><span>My Overall</span></div><div class="stat"><b>'+p.position+'#'+p.posRank+'</b><span>My Pos Rank</span></div><div class="stat"><b>'+(m?.rank!=null?'#'+m.rank:'—')+'</b><span>Sleeper Overall</span></div><div class="stat"><b>'+(m?.posRank?(m.pos||p.position)+'#'+m.posRank:'—')+'</b><span>Sleeper Pos Rank</span></div><div class="stat"><b class="edge '+(edge>0?'good':edge<0?'bad':'')+'">'+(edge==null?'—':signed(edge))+'</b><span>My Edge</span></div><div class="stat"><b class="move '+moveClass(mv)+'">'+signed(mv)+'</b><span>Latest ADP Move</span></div></div></div>'+
      '<div class="section"><h3>Sleeper ADP History</h3>'+historyPlaceholder(token)+'</div>'+
      '<div class="section"><h3>Tags & Note</h3><div class="tags">'+tagsHtml(p)+' <button class="btn" onclick="openEdit('+i+')" style="padding:6px 10px">＋ Add Tags & Note</button></div></div>'+
      '<div class="section"><h3>Notes</h3><div style="font-size:12px;color:#b8c4ce;white-space:pre-wrap;line-height:1.55">'+htmlEsc(p.note||'No notes yet.')+'</div></div>'+
      '<div class="section" style="padding-top:12px;border-top:1px solid #293744"><button class="btn" onclick="removePlayer('+i+')" style="border-color:#6b3440;color:#fb9aaa;background:#25161b">Remove Player From List</button></div>';
  }
  openDetail=function(i){
    const p=players[i];if(!p)return;
    const token=String(++detailRenderSeq);
    document.getElementById('drawerContent').innerHTML=ownedDetailHtml(p,i,token);
    document.getElementById('drawer').classList.add('open');
    scheduleHistory(p,token);
  };
  window.openMarketDetail=function(name){
    const p=sleeperPool.find(x=>normalized(x.name)===normalized(name))||{name},owned=findPersonalByName(name),m=marketFor(p),mv=Number(m?.move)||0;
    if(owned){openDetail(players.indexOf(owned));return}
    const token=String(++detailRenderSeq);
    document.getElementById('drawerContent').innerHTML='<div class="detailhead"><img class="detailimg" src="'+imgUrl(p)+'" onerror="this.style.visibility=\'hidden\'"><div><h2 style="margin:0">'+htmlEsc(clean(p.name))+'</h2><div class="small">'+htmlEsc(p.team||'FA')+' · '+htmlEsc(p.position||m?.pos||'')+'</div></div></div><div class="section"><h3>Rank Snapshot</h3><div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="stat"><b>'+(m?.rank!=null?'#'+m.rank:'—')+'</b><span>Sleeper Overall</span></div><div class="stat"><b>'+(m?.posRank?(p.position||m.pos)+'#'+m.posRank:'—')+'</b><span>Sleeper Pos Rank</span></div><div class="stat"><b class="move '+moveClass(mv)+'">'+signed(mv)+'</b><span>Latest ADP Move</span></div></div></div><div class="section"><h3>Sleeper ADP History</h3>'+historyPlaceholder(token)+'</div><div class="section"><button class="btn primary" data-detail-add="'+encodeURIComponent(p.name)+'">＋ Add To My Rankings</button></div>';
    document.getElementById('drawer').classList.add('open');
    scheduleHistory(p,token);
    const b=document.querySelector('[data-detail-add]');if(b)b.onclick=()=>{addPlayerFromPoolName(decodeURIComponent(b.dataset.detailAdd));document.getElementById('drawer').classList.remove('open')};
  };

  // Record every actual Sleeper rank change with no history-length cap.
  refreshCurrentAdp=async function(){
    document.getElementById('liveText').textContent='Updating current ADP…';
    try{
      const data=await sleeper('https://api.sleeper.app/v1/players/nfl'),arr=[];
      Object.entries(data).forEach(([id,p])=>{
        if(!p||p.active===false||typeof p.search_rank!=='number'||!(p.search_rank>0))return;
        const fps=p.fantasy_positions||[],pos=fps.find(x=>MARKET_POS.includes(x))||p.position;if(!MARKET_POS.includes(pos))return;
        const full=clean(p.full_name||((p.first_name||'')+' '+(p.last_name||'')).trim());if(!full)return;
        arr.push({id,p,pos,full});
      });
      arr.sort((a,b)=>a.p.search_rank-b.p.search_rank);
      const posCounts={},store=readHistoryStore(),newPool=[];let changed=0;const now=Date.now();
      arr.forEach((x,i)=>{
        posCounts[x.pos]=(posCounts[x.pos]||0)+1;
        const oldMatch=marketMatch34({name:x.full,id:x.id}),oldRank=Number(oldMatch?.entry?.rank),rank=i+1;
        const hit={id:x.id,rank,posRank:posCounts[x.pos],team:x.p.team||'FA',pos:x.pos,searchRank:x.p.search_rank,move:Number.isFinite(oldRank)?oldRank-rank:0,updatedAt:now};
        const key='id:'+x.id,h=Array.isArray(store[key])?store[key]:[];
        if(!h.length&&Number.isFinite(oldRank))h.push({t:null,rank:oldRank,label:'Previous saved rank'});
        const last=h[h.length-1];
        if(!last||Number(last.rank)!==rank){h.push({t:now,rank});if(Number.isFinite(oldRank)&&oldRank!==rank)changed++}
        store[key]=h;
        if(oldMatch?.name&&oldMatch.name!==x.full)delete market[oldMatch.name];
        market[x.full]=hit;
        if(POS.includes(x.pos))newPool.push({id:x.id,name:x.full,position:x.pos,team:x.p.team||'FA',bye:'—',tier:null,tags:[],note:'',drafted:false});
      });
      sleeperPool=newPool;
      try{localStorage.setItem('de_sleeper_pool',JSON.stringify(newPool))}catch(_){}
      writeHistoryStore(store);
      save();
      const d=new Date();document.getElementById('liveText').textContent='Current ADP updated '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      document.getElementById('adpStatus').textContent=changed?changed+' player'+(changed===1?'':'s')+' moved since your last refresh':'No rank changes since your last refresh';
      renderEverything();
    }catch(e){document.getElementById('liveText').textContent='Couldn’t update ADP';document.getElementById('adpStatus').textContent=e.message}
  };
  const updateBtn=document.getElementById('topUpdate');if(updateBtn)updateBtn.onclick=refreshCurrentAdp;

})();

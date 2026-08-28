// v29.5 — foundational normalization, self-healing indexed market matching, list sanitation, and synced-player exclusions.
(()=>{
  function cleanPlayerName(value){
    let s=String(value||"").trim().replace(/\s+/g," ");
    s=s.replace(/\s+(?:lll|iii|3rd)\.?$/i," III")
       .replace(/\s+(?:ll|ii|2nd)\.?$/i," II")
       .replace(/\s+(?:iv|4th)\.?$/i," IV")
       .replace(/\s+jr\.?$/i," Jr.")
       .replace(/\s+sr\.?$/i," Sr.");
    return s;
  }
  window.cleanPlayerName=cleanPlayerName;

  norm=function(value){
    return cleanPlayerName(value).toLowerCase()
      .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,"")
      .replace(/[^a-z0-9]/g,"");
  };

  let marketIdIndex=new Map();
  let marketNamePosIndex=new Map();
  let marketNameIndex=new Map();
  let indexedProbeName='';
  let indexedProbeEntry=null;
  const namePosKey=(name,pos)=>String(pos||'').toUpperCase()+'|'+norm(name);

  function rebuildMarketIndex(){
    const ids=new Map(),namePos=new Map(),names=new Map(),duplicateNames=new Set();
    let probeName='',probeEntry=null;
    try{
      for(const [key,entry] of Object.entries(market||{})){
        if(!entry||typeof entry!=="object")continue;
        if(!probeEntry){probeName=key;probeEntry=entry}
        const ref={name:key,entry};
        const id=String(entry.id||'');
        if(id)ids.set(id,ref);
        const np=namePosKey(key,entry.pos);
        if(np)namePos.set(np,ref);
        const nk=norm(key);
        if(nk){
          if(names.has(nk))duplicateNames.add(nk);
          else names.set(nk,ref);
        }
      }
    }catch(_){}
    duplicateNames.forEach(k=>names.delete(k));
    marketIdIndex=ids;marketNamePosIndex=namePos;marketNameIndex=names;
    indexedProbeName=probeName;indexedProbeEntry=probeEntry;
  }
  window.WorkhorseRebuildMarketIndex=rebuildMarketIndex;

  function ensureMarketIndex(){
    let stale=!marketIdIndex.size;
    try{
      if(!stale&&indexedProbeName&&market?.[indexedProbeName]!==indexedProbeEntry)stale=true;
    }catch(_){stale=true}
    if(stale)rebuildMarketIndex();
  }

  function marketMatch(value){
    ensureMarketIndex();
    const name=typeof value==="string"?value:value?.name;
    const sleeperId=typeof value==="object"?(value?.sleeperId||value?.id):null;
    const position=typeof value==="object"?String(value?.position||value?.pos||'').toUpperCase():'';

    // Sleeper player IDs are stable and authoritative. Only reject an ID match
    // when both sides explicitly disagree on position; do not require name text
    // to be identical (e.g. James Cook III vs James Cook).
    if(sleeperId){
      let hit=marketIdIndex.get(String(sleeperId));
      if(!hit){
        // Rare path: on-demand search may add one market row without replacing
        // the probe object. Scan once on the miss, rebuild the indexes, then all
        // subsequent rows return to O(1) lookups.
        try{
          for(const [key,entry] of Object.entries(market||{})){
            if(entry&&String(entry.id||'')===String(sleeperId)){
              rebuildMarketIndex();hit=marketIdIndex.get(String(sleeperId));break;
            }
          }
        }catch(_){}
      }
      if(hit){
        const entryPos=String(hit.entry?.pos||'').toUpperCase();
        if(!position||!entryPos||entryPos===position)return hit;
      }
    }

    if(name){
      if(position){
        const byPos=marketNamePosIndex.get(namePosKey(name,position));
        if(byPos)return byPos;
      }
      const exact=market?.[name];
      if(exact&&typeof exact==="object"){
        const entryPos=String(exact.pos||'').toUpperCase();
        if(!position||!entryPos||entryPos===position)return {name,entry:exact};
      }
      const byName=marketNameIndex.get(norm(name));
      if(byName){
        const entryPos=String(byName.entry?.pos||'').toUpperCase();
        if(!position||!entryPos||entryPos===position)return byName;
      }
    }
    return null;
  }

  marketFor=function(p){return marketMatch(p)?.entry||null};
  function trueSleeperAdpEntry(info){
    if(!info||info.identityOnly!==false)return null;
    const rank=Number(info.rank);if(!Number.isFinite(rank)||rank<=0)return null;
    let active='';try{active=typeof window.DraftEdgeAdpFormat==='function'?String(window.DraftEdgeAdpFormat()||''):''}catch(_){}
    const format=String(info.format||'');
    if(active&&format&&active!==format)return null;
    return info;
  }
  window.WorkhorseTrueSleeperAdpEntry=trueSleeperAdpEntry;
  imgUrl=function(p){const m=marketFor(p);return m?.id?"https://sleepercdn.com/content/nfl/players/thumb/"+encodeURIComponent(m.id)+".jpg":""};
  moveText=function(p){
    const info=trueSleeperAdpEntry(marketFor(p));
    if(!info)return {text:"N/A",cls:"flat"};
    const raw=Number(info.move),m=Number.isFinite(raw)?raw:0;
    return {text:m>0?"+"+m:String(m),cls:m>0?"up":m<0?"down":"flat"};
  };

  marketHeads=function(){return '<div class="colheads market"><div>Player</div><div>Sleeper Rank</div><div>Pos Rank</div><div>ADP Change</div></div>'};

  rankRow=function(p,mode="rankings"){
    const i=players.indexOf(p),m=marketFor(p),adp=trueSleeperAdpEntry(m),mv=moveText(p);
    const myPrimary=rankPos==="ALL"?p.overall:p.posRank;
    const mySecondary=rankPos==="ALL"?p.position+p.posRank:p.overall;
    const sleeperRank=adp?Number(adp.rank):null;
    const edge=sleeperRank!=null?sleeperRank-p.overall:null;
    const draftControl=mode==="draft"?'<button class="draft-btn" onclick="event.stopPropagation();toggleDraft('+i+')">Draft</button>':"";
    return '<div class="player rankings '+(mode==="draft"&&p.drafted?"drafted":"")+'" draggable="'+(mode==="rankings")+'" data-index="'+i+'">'+
    '<div class="person" onclick="openDetail('+i+')"><img class="avatar" src="'+imgUrl(p)+'" onerror="this.style.visibility=\'hidden\'"><div class="playertext"><div class="name-line"><span class="name">'+esc(cleanPlayerName(p.name))+'</span><span class="tags">'+tagsHtml(p)+'</span>'+noteHtml(p,i)+'</div><div class="meta"><span class="pos '+p.position+'">'+p.position+'</span><span>'+esc(p.team||'—')+'</span><span>Bye '+esc(p.bye)+'</span>'+draftControl+'</div>'+notePreview(p)+'</div></div>'+
    '<div class="metric"><div class="num">#'+myPrimary+'</div></div><div class="metric"><div class="num">'+(rankPos==="ALL"?p.position+"#"+p.posRank:"#"+mySecondary)+'</div></div><div class="metric"><div class="num">'+(sleeperRank!=null?"#"+sleeperRank:"NR")+'</div></div><div class="metric"><div class="edge '+(edge==null?"":edge>0?"good":edge<0?"bad":"")+'">'+(edge==null?"—":(edge>0?"+":"")+edge)+'</div></div><div class="metric"><div class="move '+mv.cls+'">'+mv.text+'</div></div></div>';
  };

  marketRow=function(p){
    const owned=findPersonalByName(p.name),i=owned?players.indexOf(owned):-1,m=marketFor(p),adp=trueSleeperAdpEntry(m),mv=moveText(p),sleeperRank=adp?Number(adp.rank):null;
    const add=i<0?'<button class="market-add" data-market-add="'+esc(p.name)+'">＋ Add</button>':"";
    return '<div class="player market"><div class="person" data-market-player="'+encodeURIComponent(p.name)+'"><img class="avatar" src="'+imgUrl(p)+'" onerror="this.style.visibility=\'hidden\'"><div class="playertext"><div class="name-line"><span class="name">'+esc(cleanPlayerName(p.name))+'</span><span class="tags">'+(owned?tagsHtml(owned):"")+'</span>'+(owned?noteHtml(owned,i):"")+'</div><div class="meta"><span class="pos '+p.position+'">'+p.position+'</span><span>'+esc(p.team||"—")+'</span>'+add+'</div>'+(owned?notePreview(owned):"")+'</div></div><div class="metric"><div class="num">'+(sleeperRank!=null?"#"+sleeperRank:"NR")+'</div></div><div class="metric"><div class="num">'+(m?.posRank?p.position+"#"+m.posRank:"—")+'</div></div><div class="metric"><div class="move '+mv.cls+'">'+mv.text+'</div></div></div>';
  };

  function listRef(){try{return typeof currentList==='function'?currentList():rankingLists?.[activeListId]||null}catch(_){return null}}
  function playerSleeperId(p){try{return String(p?.sleeperId||marketFor(p)?.id||'')}catch(_){return String(p?.sleeperId||'')}}
  function excludeFromAutoSync(p){
    const id=playerSleeperId(p),list=listRef();if(!id||!list)return;
    const ids=Array.isArray(list.excludedSleeperIds)?list.excludedSleeperIds.map(String):[];
    if(!ids.includes(id))ids.push(id);
    list.excludedSleeperIds=ids;
  }
  function allowAutoSyncAgain(value){
    const m=marketMatch(value),id=String(m?.entry?.id||''),list=listRef();if(!id||!list||!Array.isArray(list.excludedSleeperIds))return;
    list.excludedSleeperIds=list.excludedSleeperIds.map(String).filter(x=>x!==id);
  }

  function removePlayer(i){
    const p=players[i];if(!p)return;
    if(!confirm('Remove "'+cleanPlayerName(p.name)+'" from this ranking list?'))return;
    excludeFromAutoSync(p);
    const pos=p.position;players.splice(i,1);
    players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999)).forEach((x,n)=>x.overall=n+1);
    players.filter(x=>x.position===pos).sort((a,b)=>(Number(a.posRank)||9999)-(Number(b.posRank)||9999)).forEach((x,n)=>x.posRank=n+1);
    save();document.getElementById("drawer")?.classList.remove("open");renderEverything();
  }
  window.removePlayer=removePlayer;

  // Market rows delegate to the current player-detail implementation at click time.
  const adpList=document.getElementById("adpList");
  if(adpList&&!adpList.dataset.v29Click){
    adpList.dataset.v29Click="1";
    adpList.addEventListener("click",e=>{
      const addBtn=e.target.closest("[data-market-add]");
      if(addBtn){allowAutoSyncAgain(addBtn.dataset.marketAdd);return}
      const row=e.target.closest("[data-market-player]");
      if(row&&typeof openMarketDetail==='function')openMarketDetail(decodeURIComponent(row.dataset.marketPlayer));
    });
  }

  playerTemplate=function(src,overall,posRank){return {overall,name:cleanPlayerName(src.name),position:src.position||src.pos||"NA",team:src.team||"—",bye:src.bye??"—",posRank,tier:null,tags:[],note:"",drafted:false,sleeperId:src.id||src.sleeperId||null}};

  function sanitizeCurrentPlayers(){
    const seen=new Set();let changed=false;const next=[];
    for(const p of players){
      const cleaned=cleanPlayerName(p.name);if(cleaned!==p.name){p.name=cleaned;changed=true}
      const m=marketMatch(p);if(m?.entry?.id&&!p.sleeperId){p.sleeperId=m.entry.id;changed=true}
      const key=p.sleeperId?'id:'+p.sleeperId:p.position+':'+norm(p.name);
      if(seen.has(key)){changed=true;continue}
      seen.add(key);next.push(p);
    }
    if(next.length!==players.length)players=next;
    players.slice().sort((a,b)=>(Number(a.overall)||99999)-(Number(b.overall)||99999)).forEach((p,i)=>p.overall=i+1);
    POS.forEach(pos=>players.filter(p=>p.position===pos).sort((a,b)=>(Number(a.posRank)||9999)-(Number(b.posRank)||9999)).forEach((p,i)=>p.posRank=i+1));
    if(changed)save();
  }

  const oldLoadActiveList=loadActiveList;
  loadActiveList=function(){oldLoadActiveList();sanitizeCurrentPlayers();setTimeout(()=>window.WorkhorseReconcileSleeperRankings?.(),0)};

  const oldConfirmImportList=confirmImportList;
  confirmImportList=async function(){
    if(Array.isArray(pendingImport))pendingImport=pendingImport.map(p=>({...p,name:cleanPlayerName(p.name)}));
    return oldConfirmImportList();
  };

  const oldExportCurrentList=exportCurrentList;
  exportCurrentList=function(){
    players.forEach(p=>p.name=cleanPlayerName(p.name));
    return oldExportCurrentList();
  };
  const exportBtn=document.getElementById("exportRankings");if(exportBtn)exportBtn.onclick=exportCurrentList;

  rebuildMarketIndex();
  sanitizeCurrentPlayers();
  renderEverything();
})();

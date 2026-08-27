from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected text missing in {path}: {old[:120]!r}')
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one match in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# 1) Remove the legacy generic Sleeper search-rank fallback entirely.
replace_once(
    'decision-loader-v61.js',
    "'./adp-unranked-label-v78.js?v=783',",
    '',
)

# 2) Harden market matching: a stale Sleeper ID may not attach another player's rank.
old_market = '''  function marketMatch(value){
    const name=typeof value==="string"?value:value?.name;
    const sleeperId=typeof value==="object"?(value?.sleeperId||value?.id):null;
    if(sleeperId){
      for(const [key,entry] of Object.entries(market)){
        if(entry&&typeof entry==="object"&&entry.id&&String(entry.id)===String(sleeperId))return {name:key,entry};
      }
    }
    if(name&&market[name])return {name,entry:market[name]};
    const n=norm(name);
    for(const [key,entry] of Object.entries(market)){
      if(!entry||typeof entry!=="object")continue;
      if(n&&norm(key)===n)return {name:key,entry};
    }
    return null;
  }

  marketFor=function(p){return marketMatch(p)?.entry||null};
'''
new_market = '''  function marketMatch(value){
    const name=typeof value==="string"?value:value?.name;
    const sleeperId=typeof value==="object"?(value?.sleeperId||value?.id):null;
    const position=typeof value==="object"?String(value?.position||value?.pos||'').toUpperCase():'';
    const identityMatches=(key,entry)=>{
      if(!name)return true;
      const sameName=norm(key)===norm(name);
      const entryPos=String(entry?.pos||'').toUpperCase();
      return sameName&&(!position||!entryPos||entryPos===position);
    };
    if(sleeperId){
      for(const [key,entry] of Object.entries(market)){
        if(entry&&typeof entry==="object"&&entry.id&&String(entry.id)===String(sleeperId)&&identityMatches(key,entry))return {name:key,entry};
      }
    }
    if(name&&market[name]&&identityMatches(name,market[name]))return {name,entry:market[name]};
    const n=norm(name);
    for(const [key,entry] of Object.entries(market)){
      if(!entry||typeof entry!=="object")continue;
      if(n&&norm(key)===n&&identityMatches(key,entry))return {name:key,entry};
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
'''
replace_once('patch-v29.js', old_market, new_market)

old_move = '''  moveText=function(p){
    const info=marketFor(p);
    if(!info||info.rank==null)return {text:"—",cls:"flat"};
    const m=Number(info.move)||0;
    return {text:m>0?"+"+m:String(m),cls:m>0?"up":m<0?"down":"flat"};
  };
'''
new_move = '''  moveText=function(p){
    const info=trueSleeperAdpEntry(marketFor(p));
    if(!info)return {text:"N/A",cls:"flat"};
    const raw=Number(info.move),m=Number.isFinite(raw)?raw:0;
    return {text:m>0?"+"+m:String(m),cls:m>0?"up":m<0?"down":"flat"};
  };
'''
replace_once('patch-v29.js', old_move, new_move)

old_rankrow = '''  rankRow=function(p,mode="rankings"){
    const i=players.indexOf(p),m=marketFor(p),mv=moveText(p);
    const myPrimary=rankPos==="ALL"?p.overall:p.posRank;
    const mySecondary=rankPos==="ALL"?p.position+p.posRank:p.overall;
    const edge=m?.rank!=null?m.rank-p.overall:null;
'''
new_rankrow = '''  rankRow=function(p,mode="rankings"){
    const i=players.indexOf(p),m=marketFor(p),adp=trueSleeperAdpEntry(m),mv=moveText(p);
    const myPrimary=rankPos==="ALL"?p.overall:p.posRank;
    const mySecondary=rankPos==="ALL"?p.position+p.posRank:p.overall;
    const sleeperRank=adp?Number(adp.rank):null;
    const edge=sleeperRank!=null?sleeperRank-p.overall:null;
'''
replace_once('patch-v29.js', old_rankrow, new_rankrow)
replace_once('patch-v29.js', '(m?.rank!=null?"#"+m.rank:"—")', '(sleeperRank!=null?"#"+sleeperRank:"NR")')

old_marketrow = '''  marketRow=function(p){
    const owned=findPersonalByName(p.name),i=owned?players.indexOf(owned):-1,m=marketFor(p),mv=moveText(p);
'''
new_marketrow = '''  marketRow=function(p){
    const owned=findPersonalByName(p.name),i=owned?players.indexOf(owned):-1,m=marketFor(p),adp=trueSleeperAdpEntry(m),mv=moveText(p),sleeperRank=adp?Number(adp.rank):null;
'''
replace_once('patch-v29.js', old_marketrow, new_marketrow)
# Replace the remaining market-row rank expression.
replace_once('patch-v29.js', '(m?.rank!=null?"#"+m.rank:"—")', '(sleeperRank!=null?"#"+sleeperRank:"NR")')

# 3) Make ADP Change paint only from true format-specific ADP.
old_movement = '''  function marketMoveFor(p){
    try{return numMove(marketFor(p)?.move)}catch(_){return 0}
  }

  function paintMove(el,n){
    if(!el)return;
    const v=moveView(n);
'''
new_movement = '''  function marketMoveFor(p){
    try{
      const raw=marketFor(p);
      const info=typeof window.WorkhorseTrueSleeperAdpEntry==='function'?window.WorkhorseTrueSleeperAdpEntry(raw):(raw?.identityOnly===false?raw:null);
      if(!info)return null;
      return numMove(info.move);
    }catch(_){return null}
  }

  function paintMove(el,n){
    if(!el)return;
    if(n==null){
      if(el.textContent!=='N/A')el.textContent='N/A';
      el.classList.add('move','flat');el.classList.remove('up','down');
      el.title='Format-specific Sleeper ADP change is unavailable.';
      return;
    }
    el.removeAttribute('title');
    const v=moveView(n);
'''
replace_once('adp-movement-v49.js', old_movement, new_movement)

# 4) Live Draft Edge must also reject any non-ADP market entry.
old_edge = '''  function rankInfo(p){
    let m=null;
    try{m=typeof marketFor==='function'?marketFor(p):null}catch(_){}
    const sleeper=Number(m?.rank),source='Sleeper ADP';
    const mine=Number(p?.overall);
'''
new_edge = '''  function rankInfo(p){
    let raw=null,m=null;
    try{raw=typeof marketFor==='function'?marketFor(p):null}catch(_){}
    try{m=typeof window.WorkhorseTrueSleeperAdpEntry==='function'?window.WorkhorseTrueSleeperAdpEntry(raw):(raw?.identityOnly===false?raw:null)}catch(_){}
    const sleeper=Number(m?.rank),source='Sleeper ADP';
    const mine=Number(p?.overall);
'''
replace_once('live-draft-edge-v82.js', old_edge, new_edge)

# 5) Bust browser caches for every changed runtime script.
index = Path('index.html')
text = index.read_text(encoding='utf-8')
for old, new in [
    ('./patch-v29.js?v=294', './patch-v29.js?v=295'),
    ('./adp-movement-v49.js?v=493', './adp-movement-v49.js?v=494'),
    ('./live-draft-edge-v82.js?v=821', './live-draft-edge-v82.js?v=822'),
    ('./decision-loader-v61.js?v=638', './decision-loader-v61.js?v=639'),
]:
    if old not in text:
        raise SystemExit(f'Index cache key missing: {old}')
    text = text.replace(old, new, 1)
index.write_text(text, encoding='utf-8')

# 6) Permanent performance/accuracy guard.
p = Path('.github/performance-regression-check.py')
text = p.read_text(encoding='utf-8')
text = text.replace("    './adp-movement-v49.js?v=493',", "    './adp-movement-v49.js?v=494',")
text = text.replace("    './decision-loader-v61.js?v=638',", "    './decision-loader-v61.js?v=639',")
# Add the other cache keys to the required index list after player detail.
needle = "    './player-detail-v34.js?v=343',\n"
insert = needle + "    './patch-v29.js?v=295',\n    './live-draft-edge-v82.js?v=822',\n"
if needle not in text: raise SystemExit('Performance guard insertion point missing')
text = text.replace(needle, insert, 1)
append_guard = '''\npatch = Path('patch-v29.js').read_text(encoding='utf-8')\nedge = Path('live-draft-edge-v82.js').read_text(encoding='utf-8')\nif './adp-unranked-label-v78.js' in loader:\n    raise SystemExit('Generic Sleeper search-rank fallback must never load.')\nfor term in ['identityMatches', 'WorkhorseTrueSleeperAdpEntry', 'identityOnly!==false', 'sleeperRank=adp?Number(adp.rank):null']:\n    if term not in patch:\n        raise SystemExit(f'True-ADP/player-identity protection missing: {term}')\nif 'WorkhorseTrueSleeperAdpEntry' not in edge or 'searchRank' in edge:\n    raise SystemExit('Live Draft Edge is not locked to true Sleeper ADP.')\nif 'WorkhorseTrueSleeperAdpEntry' not in movement:\n    raise SystemExit('ADP Change is not locked to true Sleeper ADP.')\n'''
marker = "print('Top-250 startup, on-demand search, and interaction responsiveness checks passed.')"
if marker not in text: raise SystemExit('Performance guard print marker missing')
text = text.replace(marker, append_guard + "\n" + marker, 1)
p.write_text(text, encoding='utf-8')

# 7) Keep the PR validator aligned with production.
v = Path('.github/workflows/validate.yml')
text = v.read_text(encoding='utf-8')
for old, new in [
    ('./new-user-adp-v60.js?v=607', './new-user-adp-v60.js?v=608'),
    ('./draft-room-v41.js?v=412', './draft-room-v41.js?v=413'),
    ('./decision-loader-v61.js?v=637', './decision-loader-v61.js?v=639'),
]:
    text = text.replace(old, new)
old_loader_guard = '''          loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
          if './adp-unranked-label-v78.js?v=783' not in loader:
              raise SystemExit('Optimized fallback-rank helper cache key is missing')
          fallback = Path('adp-unranked-label-v78.js').read_text(encoding='utf-8')
          for term in [
              'const direct=Number(info?.searchRank)',
              "window.addEventListener('load',scheduleRefresh,{once:true})",
              'setTimeout(refresh,6000)',
          ]:
              if term not in fallback:
                  raise SystemExit(f'Fallback-rank performance guard missing: {term}')
          if "window.addEventListener('workhorse:central-adp-ready'" in fallback:
              raise SystemExit('Fallback rank helper must not race the central ADP directory at startup')
'''
new_loader_guard = '''          loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
          if './adp-unranked-label-v78.js' in loader:
              raise SystemExit('Generic Sleeper search-rank fallback must never load')
          if 'WorkhorseTrueSleeperAdpEntry' not in market_patch or 'identityMatches' not in market_patch:
              raise SystemExit('True Sleeper ADP / stale-ID protection is missing')
          movement = Path('adp-movement-v49.js').read_text(encoding='utf-8')
          if 'WorkhorseTrueSleeperAdpEntry' not in movement:
              raise SystemExit('ADP Change must use true format-specific Sleeper ADP only')
'''
if old_loader_guard not in text: raise SystemExit('Old validator fallback block missing')
text = text.replace(old_loader_guard, new_loader_guard, 1)
old_draft_guard = '''          draft = Path('draft-room-v41.js').read_text(encoding='utf-8')
          for term in [
              "STATUS_CACHE_KEY='workhorse-draft-player-status-v412'",
              "window.addEventListener('load',scheduleStatusLoad,{once:true})",
              'setTimeout(kickStatusLoad,2500)',
              ".order('search_rank',{ascending:true})",
              '.limit(STATUS_LIMIT)',
          ]:
              if term not in draft:
                  raise SystemExit(f'Draft status performance guard missing: {term}')
          if 'STATUS_BATCH' in draft:
              raise SystemExit('Draft room reintroduced chunked startup status batches')
          if draft.count("client.from('sleeper_player_status')") != 1:
              raise SystemExit('Draft room must have exactly one Sleeper status query path')
'''
new_draft_guard = '''          draft = Path('draft-room-v41.js').read_text(encoding='utf-8')
          for term in [
              "STATUS_CACHE_KEY='workhorse-draft-player-status-v412'",
              'const STATUS_LIMIT=250;',
              'if(!playerStatus.size)readStatusCache();',
              ".order('search_rank',{ascending:true})",
              '.limit(STATUS_LIMIT)',
          ]:
              if term not in draft:
                  raise SystemExit(f'Draft status performance guard missing: {term}')
          for forbidden in ['scheduleStatusLoad', 'setTimeout(kickStatusLoad,2500)', 'STATUS_BATCH']:
              if forbidden in draft:
                  raise SystemExit(f'Draft room reintroduced hidden startup work: {forbidden}')
          if draft.count("client.from('sleeper_player_status')") != 1:
              raise SystemExit('Draft room must have exactly one Sleeper status query path')
'''
if old_draft_guard not in text: raise SystemExit('Old validator draft block missing')
text = text.replace(old_draft_guard, new_draft_guard, 1)
v.write_text(text, encoding='utf-8')

print('True-ADP Edge patch prepared.')

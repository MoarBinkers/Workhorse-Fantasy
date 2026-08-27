from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text(encoding='utf-8')
    if old not in text: raise SystemExit(f'Missing expected block in {path}: {old[:100]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Central ADP: publish true ADP immediately; reconcile personal lists only when browser is idle.
replace_once('central-adp-v36.js',
'''    }finally{applying=false}\n    reconcileCurrentRankings(rows,directory);\n  }\n\n  function renderFormatTabs(){''',
'''    }finally{applying=false}\n  }\n\n  function scheduleRankingReconcile(rows,directory=activeDirectory){\n    const run=()=>{\n      try{\n        if(reconcileCurrentRankings(rows,directory)){\n          if(typeof renderRankings==='function')renderRankings();\n          else if(typeof renderEverything==='function')renderEverything();\n        }\n      }catch(e){console.warn('Workhorse ranking reconciliation unavailable',e)}\n    };\n    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});\n    else setTimeout(run,500);\n  }\n\n  function renderFormatTabs(){''')
replace_once('central-adp-v36.js',
'''      if(typeof renderEverything==='function')renderEverything();\n      window.WorkhorseCentralAdpReady=true;\n      try{window.dispatchEvent(new CustomEvent('workhorse:central-adp-ready',{detail:{format:activeFormat,count:data.length}}))}catch(_){}\n''',
'''      if(typeof renderEverything==='function')renderEverything();\n      window.WorkhorseCentralAdpReady=true;\n      try{window.dispatchEvent(new CustomEvent('workhorse:central-adp-ready',{detail:{format:activeFormat,count:data.length}}))}catch(_){}\n      scheduleRankingReconcile(activeRows,activeDirectory);\n''')

# Optional features: never compete with the critical central ADP request.
replace_once('decision-loader-v61.js',
'''  if('requestIdleCallback' in window)requestIdleCallback(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),{timeout:1600});\n  else setTimeout(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),500);\n})();\n''',
'''  let begun=false;\n  const begin=()=>{\n    if(begun)return;begun=true;\n    const run=()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e));\n    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:3000});\n    else setTimeout(run,900);\n  };\n  if(window.WorkhorseCentralAdpReady)begin();\n  else window.addEventListener('workhorse:central-adp-ready',begin,{once:true});\n  setTimeout(begin,6000);\n})();\n''')

# Ranking integrity scan: keep it, but do not make it a 350ms startup snag.
replace_once('rank-sync-v38.js',
'''  setTimeout(()=>{\n    if(fixing||!Array.isArray(players))return;\n    if(syncPosRanksFromOverall()){\n      try{save()}catch(_){}\n      try{renderRankings()}catch(_){}\n    }\n    disableNativeRows();\n  },350);\n})();\n''',
'''  const verifyInitialRanks=()=>{\n    if(fixing||!Array.isArray(players))return;\n    if(syncPosRanksFromOverall()){\n      try{save()}catch(_){}\n      try{renderRankings()}catch(_){}\n    }\n    disableNativeRows();\n  };\n  if('requestIdleCallback' in window)requestIdleCallback(verifyInitialRanks,{timeout:2200});\n  else setTimeout(verifyInitialRanks,900);\n})();\n''')

# Cache bust.
p=Path('index.html'); text=p.read_text(encoding='utf-8')
for old,new in [
 ('./central-adp-v36.js?v=368','./central-adp-v36.js?v=369'),
 ('./rank-sync-v38.js?v=393','./rank-sync-v38.js?v=394'),
 ('./decision-loader-v61.js?v=639','./decision-loader-v61.js?v=640'),
]:
    if old not in text: raise SystemExit(f'Missing cache key {old}')
    text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Permanent guard.
p=Path('.github/performance-regression-check.py'); text=p.read_text(encoding='utf-8')
text=text.replace("loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')", "loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')\nrank_sync = Path('rank-sync-v38.js').read_text(encoding='utf-8')")
text=text.replace("'./central-adp-v36.js?v=368'", "'./central-adp-v36.js?v=369'")
text=text.replace("'./decision-loader-v61.js?v=639'", "'./decision-loader-v61.js?v=640'")
needle="    './on-demand-player-search-v88.js?v=881',\n"
if needle not in text: raise SystemExit('Guard cache insertion missing')
text=text.replace(needle,needle+"    './rank-sync-v38.js?v=394',\n",1)
text=text.replace("if 'files.length;i+=2' not in loader or 'timeout:1600' not in loader:\n    raise SystemExit('Optional feature batching protection missing.')",
"if 'files.length;i+=2' not in loader or \"window.addEventListener('workhorse:central-adp-ready',begin,{once:true})\" not in loader or 'setTimeout(begin,6000)' not in loader:\n    raise SystemExit('Optional features can compete with critical ADP loading.')\nif 'scheduleRankingReconcile' not in central or 'requestIdleCallback(run,{timeout:1800})' not in central:\n    raise SystemExit('Ranking reconciliation moved back onto the critical ADP path.')\nif 'requestIdleCallback(verifyInitialRanks,{timeout:2200})' not in rank_sync or '},350);' in rank_sync:\n    raise SystemExit('Ranking integrity scan moved back onto the startup hot path.')")
p.write_text(text,encoding='utf-8')

print('Safe v90 loading patch prepared.')

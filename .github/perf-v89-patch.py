from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected performance patch target missing in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# Draft injury/status data should never be a hidden global startup cost.
replace('draft-room-v41.js', "  const STATUS_LIMIT=500;", "  const STATUS_LIMIT=250;")
replace(
    'draft-room-v41.js',
    "  async function loadPlayerStatus(force=false){\n    if(statusLoading)return statusLoading;\n    if(!force&&playerStatus.size&&Date.now()-statusLoadedAt<STATUS_TTL)return;",
    "  async function loadPlayerStatus(force=false){\n    if(statusLoading)return statusLoading;\n    if(!playerStatus.size)readStatusCache();\n    if(!force&&playerStatus.size&&Date.now()-statusLoadedAt<STATUS_TTL)return;"
)
replace(
    'draft-room-v41.js',
    "      await loadPlayerStatus().catch(()=>{});\n      const list=currentList?.();if(list){list.draftPrefs={...(list.draftPrefs||{}),input:raw,draftId:connected.id,slot:connected.slot||null};try{save()}catch(_){}}\n      await refreshConnected();connected.timer=setInterval(refreshConnected,15000);try{draftTimer=connected.timer}catch(_){}",
    "      const list=currentList?.();if(list){list.draftPrefs={...(list.draftPrefs||{}),input:raw,draftId:connected.id,slot:connected.slot||null};try{save()}catch(_){}}\n      await refreshConnected();connected.timer=setInterval(refreshConnected,15000);try{draftTimer=connected.timer}catch(_){}\n      const loadStatusLater=()=>loadPlayerStatus().catch(()=>{});\n      if('requestIdleCallback' in window)requestIdleCallback(loadStatusLater,{timeout:1200});\n      else setTimeout(loadStatusLater,250);"
)
replace(
    'draft-room-v41.js',
    "  readStatusCache();\n  const input=document.getElementById('draftId'),connect=document.getElementById('connectDraft'),stop=document.getElementById('stopDraft');",
    "  const input=document.getElementById('draftId'),connect=document.getElementById('connectDraft'),stop=document.getElementById('stopDraft');"
)
replace(
    'draft-room-v41.js',
    "  const kickStatusLoad=()=>loadPlayerStatus().catch(()=>{});\n  const scheduleStatusLoad=()=>setTimeout(kickStatusLoad,2500);\n  if(document.readyState==='complete')scheduleStatusLoad();\n  else window.addEventListener('load',scheduleStatusLoad,{once:true});\n",
    ""
)

# News badges are useful, but not worth a 700-row request during startup or repeated full-list scans.
replace('rankings-news-update-v83.js', "  const MAX_ROWS=700;", "  const MAX_ROWS=350;")
replace(
    'rankings-news-update-v83.js',
    "  function scheduleList(id){\n    if(pendingLists.has(id))return;\n    pendingLists.add(id);\n    queueMicrotask(()=>{pendingLists.delete(id);decorateList($(id))});\n  }",
    "  function scheduleList(id){\n    if(pendingLists.has(id))return;\n    pendingLists.add(id);\n    const run=()=>{pendingLists.delete(id);decorateList($(id))};\n    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:250});\n    else setTimeout(run,60);\n  }"
)
replace(
    'rankings-news-update-v83.js',
    "  function boot(){css();decorate();observe('rankList');observe('adpList');load(false)}\n  boot();\n  [250,900,2200,5000].forEach(ms=>setTimeout(boot,ms));\n  setInterval(()=>load(false),REFRESH_MS);",
    "  function boot(){css();decorate();observe('rankList');observe('adpList')}\n  boot();\n  setTimeout(boot,900);\n  const loadNews=()=>load(false);\n  if('requestIdleCallback' in window)requestIdleCallback(loadNews,{timeout:2500});\n  else setTimeout(loadNews,1200);\n  setInterval(()=>load(false),REFRESH_MS);"
)

# The update timestamp is non-critical; let the first paint and user input win.
replace(
    'sleeper-update-status-v40.js',
    "    schedule(true,50);\n    return true;",
    "    const initial=()=>schedule(true,0);\n    if('requestIdleCallback' in window)requestIdleCallback(initial,{timeout:1800});\n    else setTimeout(initial,800);\n    return true;"
)

# Stop rescanning settings DOM ten times a second while auth initializes.
replace(
    'cloud-reliability-v41.js',
    "  function startCloudRestore(attempt=0){\n    ensureBackupUI();refreshSettingsCopy();\n    const signedIn=typeof currentUser!=='undefined'&&currentUser;\n    if(signedIn){loadCloudLists();return}\n    if(attempt<60)setTimeout(()=>startCloudRestore(attempt+1),100);\n  }",
    "  function startCloudRestore(attempt=0){\n    const signedIn=typeof currentUser!=='undefined'&&currentUser;\n    if(signedIn){loadCloudLists();return}\n    if(attempt<20)setTimeout(()=>startCloudRestore(attempt+1),250);\n  }"
)

# ADP movement decoration no longer gets to compete with clicks every animation frame.
replace(
    'adp-movement-v49.js',
    "  function schedulePaint(){\n    if(scheduled)return;scheduled=true;\n    requestAnimationFrame(()=>{scheduled=false;paintAll()});\n  }",
    "  function schedulePaint(){\n    if(scheduled)return;scheduled=true;\n    const run=()=>{scheduled=false;paintAll()};\n    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:180});\n    else setTimeout(run,50);\n  }"
)
replace(
    'adp-movement-v49.js',
    "  [0,350,1000,2500].forEach(ms=>setTimeout(paintAll,ms));",
    "  schedulePaint();"
)

# Onboarding only needs one early attempt, an auth/cloud event, and one fallback—not six full reconciles.
replace(
    'new-user-adp-v60.js',
    "  [80,250,700,1500,3000].forEach(ms=>setTimeout(ensureCreateConfirm,ms));",
    "  [150,900].forEach(ms=>setTimeout(ensureCreateConfirm,ms));"
)
replace(
    'new-user-adp-v60.js',
    "  [100,500,1200,2500,5000,8000].forEach(ms=>setTimeout(reconcile,ms));",
    "  [600,4000].forEach(ms=>setTimeout(()=>{\n    const run=()=>reconcile();\n    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:700});\n    else setTimeout(run,80);\n  },ms));"
)

# Optional enhancements load in smaller batches and yield between batches.
replace(
    'decision-loader-v61.js',
    "  const start=async()=>{for(let i=0;i<files.length;i+=4)await Promise.all(files.slice(i,i+4).map(loadOne))};\n  if('requestIdleCallback' in window)requestIdleCallback(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),{timeout:600});\n  else setTimeout(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),200);",
    "  const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));\n  const start=async()=>{\n    for(let i=0;i<files.length;i+=2){\n      await Promise.all(files.slice(i,i+2).map(loadOne));\n      await yieldFrame();\n    }\n  };\n  if('requestIdleCallback' in window)requestIdleCallback(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),{timeout:1600});\n  else setTimeout(()=>start().catch(e=>console.warn('Workhorse optional feature batch error',e)),500);"
)

# Cache-bust every changed production script.
for old, new in [
    ('./sleeper-update-status-v40.js?v=40', './sleeper-update-status-v40.js?v=401'),
    ('./cloud-reliability-v41.js?v=412', './cloud-reliability-v41.js?v=413'),
    ('./draft-room-v41.js?v=412', './draft-room-v41.js?v=413'),
    ('./adp-movement-v49.js?v=492', './adp-movement-v49.js?v=493'),
    ('./new-user-adp-v60.js?v=607', './new-user-adp-v60.js?v=608'),
    ('./decision-loader-v61.js?v=637', './decision-loader-v61.js?v=638'),
    ('./rankings-news-update-v83.js?v=832', './rankings-news-update-v83.js?v=833'),
]:
    replace('index.html', old, new)

# Make the anti-regression guard protect the new responsiveness wins.
guard = Path('.github/performance-regression-check.py')
text = guard.read_text(encoding='utf-8')
text = text.replace("index = Path('index.html').read_text(encoding='utf-8')\n", "index = Path('index.html').read_text(encoding='utf-8')\ndraft = Path('draft-room-v41.js').read_text(encoding='utf-8')\nnews = Path('rankings-news-update-v83.js').read_text(encoding='utf-8')\nmovement = Path('adp-movement-v49.js').read_text(encoding='utf-8')\ncloud = Path('cloud-reliability-v41.js').read_text(encoding='utf-8')\nonboarding = Path('new-user-adp-v60.js').read_text(encoding='utf-8')\nloader = Path('decision-loader-v61.js').read_text(encoding='utf-8')\n")
old_versions = "    './player-detail-v34.js?v=343',\n]"
new_versions = "    './player-detail-v34.js?v=343',\n    './draft-room-v41.js?v=413',\n    './rankings-news-update-v83.js?v=833',\n    './adp-movement-v49.js?v=493',\n    './cloud-reliability-v41.js?v=413',\n    './new-user-adp-v60.js?v=608',\n    './decision-loader-v61.js?v=638',\n]"
if old_versions not in text:
    raise SystemExit('Could not extend performance guard cache keys')
text = text.replace(old_versions, new_versions, 1)
extra = """

if 'scheduleStatusLoad' in draft or "readStatusCache();\\n  const input=" in draft:
    raise SystemExit('Hidden draft-status startup load was reintroduced.')
if 'const STATUS_LIMIT=250;' not in draft or "if(!playerStatus.size)readStatusCache();" not in draft:
    raise SystemExit('On-demand draft-status protection missing.')
if 'const MAX_ROWS=350;' not in news or '[250,900,2200,5000].forEach' in news:
    raise SystemExit('Rankings-news startup protection missing.')
if "requestIdleCallback(run,{timeout:180})" not in movement or '[0,350,1000,2500].forEach' in movement:
    raise SystemExit('ADP movement idle-paint protection missing.')
if 'attempt<20' not in cloud or 'attempt<60' in cloud:
    raise SystemExit('Cloud startup polling protection missing.')
if '[600,4000].forEach' not in onboarding or '[100,500,1200,2500,5000,8000].forEach' in onboarding:
    raise SystemExit('Onboarding reconciliation protection missing.')
if 'files.length;i+=2' not in loader or 'timeout:1600' not in loader:
    raise SystemExit('Optional feature batching protection missing.')
"""
if 'Hidden draft-status startup load was reintroduced.' not in text:
    text = text.replace("\nprint('Top-250 startup and on-demand player-search regression checks passed.')", extra + "\nprint('Top-250 startup, on-demand search, and interaction responsiveness checks passed.')")
guard.write_text(text, encoding='utf-8')

print('Applied Workhorse v89 responsiveness patch.')

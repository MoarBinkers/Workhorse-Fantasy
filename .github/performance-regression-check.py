from pathlib import Path

central = Path('central-adp-v92.js').read_text(encoding='utf-8')
detail = Path('player-detail-v34.js').read_text(encoding='utf-8')
ondemand = Path('on-demand-player-search-v88.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
draft = Path('draft-room-v41.js').read_text(encoding='utf-8')
news = Path('rankings-news-update-v83.js').read_text(encoding='utf-8')
movement = Path('adp-movement-v49.js').read_text(encoding='utf-8')
cloud = Path('cloud-reliability-v41.js').read_text(encoding='utf-8')
onboarding = Path('new-user-adp-v60.js').read_text(encoding='utf-8')
loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
rank_sync = Path('rank-sync-v38.js').read_text(encoding='utf-8')
patch = Path('patch-v29.js').read_text(encoding='utf-8')
edge = Path('live-draft-edge-v82.js').read_text(encoding='utf-8')
tier = Path('tier-v33.js').read_text(encoding='utf-8')
rank_cap = Path('rank-list-cap-v93.js').read_text(encoding='utf-8')
sleeper_cap = Path('sleeper-rank-cap-v94.js').read_text(encoding='utf-8')
recovery = Path('ranking-data-recovery-v95.js').read_text(encoding='utf-8')
rounds = Path('round-bands-v61.js').read_text(encoding='utf-8')
drag_scroll = Path('drag-scroll-guard-v97.js').read_text(encoding='utf-8')

# Core Sleeper feed must stay true-format, top-250, and free of directory preload/autofill.
required_central = [
    "const AUTO_RANK_LIMIT=250;",
    "const CACHE_PREFIX='wh92_true_adp_';",
    "const CACHE_VERSION=2;",
    "identityOnly:false",
    "searchRank:null",
    "fetchCentralRows(format)",
    "cache:'no-store'",
    "sleeper_rank=lte.'+AUTO_RANK_LIMIT",
    "requestIdleCallback(run,{timeout:2200})",
    "signalReady(format,rows.length)",
    "Never append missing ADP",
]
for term in required_central:
    if term not in central:
        raise SystemExit(f'Fast true-ADP protection missing: {term}')
for forbidden in [
    '.range(from,from+999)',
    'loadPlayerDirectory',
    ".from('sleeper_player_status')",
    'searchRank:Number',
    'players.push({overall:++maxOverall',
]:
    if forbidden in central:
        raise SystemExit(f'Blocking/generic/auto-fill startup behavior reintroduced: {forbidden}')

# Full directory access is allowed only after explicit Add Player search.
for term in [
    'const REMOTE_LIMIT=40;',
    'const MIN_QUERY=2;',
    ".from('sleeper_player_status')",
    ".ilike('full_name','%'+q+'%')",
    '.limit(REMOTE_LIMIT)',
    ".from('sleeper_adp_current')",
    ".in('player_id',ids)",
    'added.sleeperId=String(src.id);',
    'window.WorkhorseFullPlayerSearch',
]:
    if term not in ondemand:
        raise SystemExit(f'On-demand full-player search protection missing: {term}')

# Critical startup stays small and cache versions must point at current hydration/matcher code.
for term in [
    './brand-fast-v92.js?v=922',
    './patch-v29.js?v=298',
    './tier-v33.js?v=335',
    './player-detail-v34.js?v=344',
    './central-adp-v92.js?v=921',
    './mobile-touch-v75.js?v=753',
    './cloud-reliability-v41.js?v=415',
    './new-user-adp-v60.js?v=610',
    './decision-loader-v61.js?v=645',
]:
    if term not in index:
        raise SystemExit(f'Critical startup key missing: {term}')
if index.count(' defer src=') > 12:
    raise SystemExit('Too many scripts are back on the critical startup path.')
for term in ['./draft-room-v41.js','./live-draft-edge-v82.js','./rankings-news-update-v83.js','./adp-movement-v49.js','./logo-fix-v291.js']:
    if term in index:
        raise SystemExit(f'Noncritical file moved back onto startup path: {term}')

# Lazy feature loader: no Rank/EDGE repair layer is allowed on startup.
for term in [
    'const coreFiles=[',
    'const backgroundFiles=[',
    'const draftFiles=[',
    "window.addEventListener('workhorse:central-adp-ready',beginCore,{once:true})",
    'loadBatch(coreFiles,2)',
    'loadBatch(backgroundFiles,1)',
    'loadBatch(draftFiles,2)',
    'setTimeout(beginBackground,10000)',
    "loadOne('./rank-list-cap-v93.js?v=932')",
    "loadOne('./sleeper-rank-cap-v94.js?v=942')",
    "loadOne('./ranking-data-recovery-v95.js?v=951')",
    "loadOne('./round-bands-v61.js?v=616')",
    "loadOne('./drag-scroll-guard-v97.js?v=971')",
]:
    if term not in loader:
        raise SystemExit(f'Lazy feature loading protection missing: {term}')
for term in ['./draft-room-v41.js?v=414','./live-draft-edge-v82.js?v=823','./rankings-news-update-v83.js?v=834','./adp-movement-v49.js?v=495','./logo-fix-v291.js?v=301']:
    if term not in loader:
        raise SystemExit(f'Lazy feature missing from loader: {term}')
for forbidden in ['rank-edge-fix-v95.js','rank-edge-source-v96.js','adp-unranked-label-v78.js']:
    if forbidden in loader or forbidden in index:
        raise SystemExit(f'Obsolete hot-path layer must not load: {forbidden}')
for retired in ['rank-edge-fix-v95.js','rank-edge-source-v96.js']:
    if Path(retired).exists():
        raise SystemExit(f'Obsolete Rank/EDGE repair file still exists: {retired}')

# Ranking drop must preserve the viewport without a permanent MutationObserver or
# scroll loop. The guard captures the drop-time scroll position and restores only
# during the short rerender/save window.
for term in [
    '__WORKHORSE_DRAG_SCROLL_GUARD_97__',
    "root.addEventListener('dragstart'",
    "root.addEventListener('drop'",
    'const y=window.scrollY;',
    'queueMicrotask(()=>holdViewport(y,token));',
    'requestAnimationFrame(()=>{',
    'setTimeout(()=>holdViewport(y,token),120);',
    'if(cancelRestore||token!==restoreToken)return;',
]:
    if term not in drag_scroll:
        raise SystemExit(f'Drag/drop viewport protection missing: {term}')
if 'MutationObserver' in drag_scroll:
    raise SystemExit('Drag/drop viewport guard must not add a MutationObserver.')

# Recovery must keep verified central ADP authoritative, preserve metadata, and
# keep round controls available in Rankings/ADP without waiting for Draft.
for term in [
    'function normalizeSleeperPool()',
    'function enrichActiveByes()',
    'function recoverBlankActiveOnce()',
    "window.addEventListener('workhorse:central-adp-ready'",
    "window.addEventListener('workhorse:cloud-rankings-ready'",
]:
    if term not in recovery:
        raise SystemExit(f'Ranking metadata recovery protection missing: {term}')
for term in ['const VALID_SIZES=[10,12,14];','League Size','10 teams','12 teams','14 teams','function addStatic(kind,list)']:
    if term not in rounds:
        raise SystemExit(f'Ranking round-band control missing: {term}')
if "./round-bands-v61.js?v=615" in loader:
    raise SystemExit('Round bands must not be Draft-only anymore.')

# Rank/EDGE must resolve inside marketFor with authoritative Sleeper IDs. The
# index self-heals when central ADP replaces market objects; it must not depend on
# an extra render pass just to refresh lookup state.
for term in [
    'let marketIdIndex=new Map();',
    'let indexedProbeName=',
    'function rebuildMarketIndex()',
    'function ensureMarketIndex()',
    'market?.[indexedProbeName]!==indexedProbeEntry',
    'ensureMarketIndex();',
    'marketIdIndex.get(String(sleeperId))',
    'marketNamePosIndex.get',
    'WorkhorseTrueSleeperAdpEntry',
    'identityOnly!==false',
    'sleeperRank=adp?Number(adp.rank):null',
    'const edge=sleeperRank!=null?sleeperRank-p.overall:null',
]:
    if term not in patch:
        raise SystemExit(f'Self-healing true-ADP Rank/EDGE protection missing: {term}')
if 'wrapRenderWithMarketIndex' in patch:
    raise SystemExit('Sleeper index refresh must not depend on wrapping/rerunning renderers.')

# Signed-in cloud data must win the startup race. Guest starter creation is
# forbidden until Supabase has resolved the initial session.
for term in [
    'window.WorkhorseAuthResolved=false;',
    'function readCachedActiveId()',
    'let preferredActiveId=readCachedActiveId();',
    'client.auth.getSession()',
    'client.auth.onAuthStateChange',
    "window.dispatchEvent(new CustomEvent('workhorse:auth-resolved'",
    'preferredActiveId&&rankingLists[preferredActiveId]',
    'window.WorkhorseCloudRankingsReady=true;',
]:
    if term not in cloud:
        raise SystemExit(f'Cloud hydration/auth protection missing: {term}')
for term in [
    'const authResolved=()=>window.WorkhorseAuthResolved===true||signedInNow();',
    'if(!authResolved()||signedInNow())return false;',
    'if(!window.WorkhorseAuthResolved&&!signed)return;',
    "window.addEventListener('workhorse:auth-resolved'",
    "window.addEventListener('workhorse:cloud-rankings-ready'",
]:
    if term not in onboarding:
        raise SystemExit(f'Onboarding auth-race protection missing: {term}')

# Hidden pages and avatars must stay cheap. Never scan every avatar in response
# to arbitrary body mutations.
for term in [
    'window.__WORKHORSE_RENDER_GUARD_93__',
    'content-visibility:auto',
    'loading="lazy"',
    "gateRender('renderAdp','page-adp','adpList')",
    "gateRender('renderDraft','page-draft','draftList')",
    'list.replaceChildren()',
    'mutation.addedNodes',
    'tuneNode(node)',
]:
    if term not in tier:
        raise SystemExit(f'Hidden-row/avatar render protection missing: {term}')
if 'new MutationObserver(tuneExisting)' in tier:
    raise SystemExit('Whole-page avatar rescan observer was reintroduced.')

# Cap scripts must install only once; personal cap must not bootstrap a second
# Sleeper cap script and create duplicate listeners/observers.
if '__WORKHORSE_RANK_LIST_CAP_93__' not in rank_cap:
    raise SystemExit('Personal ranking cap one-time guard missing.')
if 'sleeper-rank-cap-v94.js' in rank_cap:
    raise SystemExit('Personal cap must not dynamically inject Sleeper cap.')
if '__WORKHORSE_SLEEPER_RANK_CAP_94__' not in sleeper_cap:
    raise SystemExit('Sleeper ranking cap one-time guard missing.')
if 'root.children.length>MAX' not in sleeper_cap:
    raise SystemExit('Sleeper cap observer is not using the lightweight size check.')

# Existing delayed-work protections.
for term in ['WorkhorseRefreshPlayerHistory', 'raw.length>120', 'requestIdleCallback(run,{timeout:300})']:
    if term not in detail:
        raise SystemExit(f'Player drawer performance protection missing: {term}')
if 'scheduleStatusLoad' in draft or "readStatusCache();\n  const input=" in draft:
    raise SystemExit('Hidden draft-status startup load was reintroduced.')
if 'const STATUS_LIMIT=250;' not in draft or "if(!playerStatus.size)readStatusCache();" not in draft:
    raise SystemExit('On-demand draft-status protection missing.')
if 'const MAX_ROWS=350;' not in news or '[250,900,2200,5000].forEach' in news:
    raise SystemExit('Rankings-news startup protection missing.')
if "requestIdleCallback(run,{timeout:180})" not in movement or '[0,350,1000,2500].forEach' in movement:
    raise SystemExit('ADP movement idle-paint protection missing.')
if '[600,4000].forEach' not in onboarding or '[100,500,1200,2500,5000,8000].forEach' in onboarding:
    raise SystemExit('Onboarding reconciliation protection missing.')
if 'requestIdleCallback(verifyInitialRanks,{timeout:2200})' not in rank_sync or '},350);' in rank_sync:
    raise SystemExit('Ranking integrity scan moved back onto the startup hot path.')

if 'WorkhorseTrueSleeperAdpEntry' not in edge or 'searchRank' in edge:
    raise SystemExit('Live Draft Edge is not locked to true Sleeper ADP.')
if 'WorkhorseTrueSleeperAdpEntry' not in movement:
    raise SystemExit('ADP Change is not locked to true Sleeper ADP.')

# Single compressed bundle remains the only base-app request in normal startup.
if "const bundle='./app-v28.bin?v=28d';" not in index:
    raise SystemExit('Single-request Workhorse bundle is not the primary startup path.')
if 'loadChunkFallback' not in index or "app-v28-part-'" not in index:
    raise SystemExit('Multi-part emergency bundle fallback is missing.')
if 'joined=await fetchAsset(bundle,2);' not in index:
    raise SystemExit('Combined bundle is not fetched before chunk fallback.')
if not Path('app-v28.bin').is_file() or Path('app-v28.bin').stat().st_size != 28016:
    raise SystemExit('Combined Workhorse bundle file is missing or incomplete.')

print('Production performance, stable ranking drag/drop viewport, cloud hydration, preserved custom data, ranking round controls, 250-player caps, and true Sleeper Rank/EDGE checks passed.')

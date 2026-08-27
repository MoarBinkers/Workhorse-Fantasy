from pathlib import Path

central = Path('central-adp-v36.js').read_text(encoding='utf-8')
detail = Path('player-detail-v34.js').read_text(encoding='utf-8')
ondemand = Path('on-demand-player-search-v88.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
draft = Path('draft-room-v41.js').read_text(encoding='utf-8')
news = Path('rankings-news-update-v83.js').read_text(encoding='utf-8')
movement = Path('adp-movement-v49.js').read_text(encoding='utf-8')
cloud = Path('cloud-reliability-v41.js').read_text(encoding='utf-8')
onboarding = Path('new-user-adp-v60.js').read_text(encoding='utf-8')
loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')

required_central = [
    ".order('captured_at',{ascending:false}).limit(240)",
    "setTimeout(()=>hydrateHistory(p)",
    "const AUTO_RANK_LIMIT=250;",
    ".order('sleeper_rank',{ascending:true}).limit(AUTO_RANK_LIMIT)",
]
for term in required_central:
    if term not in central:
        raise SystemExit(f'Interaction/startup performance protection missing: {term}')

for forbidden in [
    '.range(from,from+999)',
    'await hydrateHistory(p)',
    'if(activeRows.length)applyRows(activeRows,activeDirectory);return originalRender',
    '[1200,3000].forEach',
    'loadPlayerDirectory(client).then',
]:
    if forbidden in central:
        raise SystemExit(f'Blocking or bulk startup behavior reintroduced: {forbidden}')

for term in ['WorkhorseRefreshPlayerHistory', 'raw.length>120', 'requestIdleCallback(run,{timeout:300})']:
    if term not in detail:
        raise SystemExit(f'Player drawer performance protection missing: {term}')

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

for term in [
    './central-adp-v36.js?v=368',
    './on-demand-player-search-v88.js?v=881',
    './player-detail-v34.js?v=343',
    './draft-room-v41.js?v=413',
    './rankings-news-update-v83.js?v=833',
    './adp-movement-v49.js?v=493',
    './cloud-reliability-v41.js?v=413',
    './new-user-adp-v60.js?v=608',
    './decision-loader-v61.js?v=638',
]:
    if term not in index:
        raise SystemExit(f'Performance cache/load key missing: {term}')


if 'scheduleStatusLoad' in draft or "readStatusCache();\n  const input=" in draft:
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

print('Top-250 startup, on-demand search, and interaction responsiveness checks passed.')

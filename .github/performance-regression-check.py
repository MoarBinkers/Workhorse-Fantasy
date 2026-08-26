from pathlib import Path

central = Path('central-adp-v36.js').read_text(encoding='utf-8')
detail = Path('player-detail-v34.js').read_text(encoding='utf-8')
ondemand = Path('on-demand-player-search-v88.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')

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
]:
    if term not in index:
        raise SystemExit(f'Performance cache/load key missing: {term}')

print('Top-250 startup and on-demand player-search regression checks passed.')

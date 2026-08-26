from pathlib import Path

central = Path('central-adp-v36.js').read_text(encoding='utf-8')
detail = Path('player-detail-v34.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')

required_central = [
    ".order('captured_at',{ascending:false}).limit(240)",
    "setTimeout(()=>hydrateHistory(p)",
    "requestIdleCallback(repaint,{timeout:1200})",
    "const AUTO_RANK_LIMIT=250;",
    "const DIRECTORY_LIMIT=500;",
]
for term in required_central:
    if term not in central:
        raise SystemExit(f'Interaction performance protection missing: {term}')

for forbidden in [
    '.range(from,from+999)',
    'await hydrateHistory(p)',
    'if(activeRows.length)applyRows(activeRows,activeDirectory);return originalRender',
    '[1200,3000].forEach',
]:
    if forbidden in central:
        raise SystemExit(f'Blocking interaction behavior reintroduced: {forbidden}')

for term in ['WorkhorseRefreshPlayerHistory', 'raw.length>120', 'requestIdleCallback(run,{timeout:300})']:
    if term not in detail:
        raise SystemExit(f'Player drawer performance protection missing: {term}')

for term in ['./central-adp-v36.js?v=367', './player-detail-v34.js?v=343']:
    if term not in index:
        raise SystemExit(f'Performance cache key missing: {term}')

print('Interaction performance regression checks passed.')

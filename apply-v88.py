from pathlib import Path


def replace_exact(path, old, new, expected=1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} match(es), found {count}: {old!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')


replace_exact(
    'central-adp-v36.js',
    ".eq('format',activeFormat).order('sleeper_rank',{ascending:true});",
    ".eq('format',activeFormat).order('sleeper_rank',{ascending:true}).limit(AUTO_RANK_LIMIT);"
)

replace_exact(
    'central-adp-v36.js',
    """      loadPlayerDirectory(client).then(directory=>{
        activeDirectory=directory;
        applyRows(activeRows,activeDirectory);
        const repaint=()=>{if(typeof renderEverything==='function')renderEverything()};
        if('requestIdleCallback' in window)requestIdleCallback(repaint,{timeout:1200});else setTimeout(repaint,80);
      }).catch(e=>console.warn('Sleeper player directory enrichment unavailable',e));""",
    """      // Do not preload the 500-player identity directory. The Add Player box searches
      // the full Sleeper directory on demand, so startup stays limited to these top 250 rows."""
)

replace_exact('index.html', './central-adp-v36.js?v=367', './central-adp-v36.js?v=368')
rank_sync_marker = r'<scr"+"ipt src=\"./rank-sync-v38.js?v=393'
replace_exact(
    'index.html',
    rank_sync_marker,
    r'<scr"+"ipt src=\"./on-demand-player-search-v88.js?v=881\"></scr"+"ipt>' + rank_sync_marker
)

central = Path('central-adp-v36.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
ondemand = Path('on-demand-player-search-v88.js').read_text(encoding='utf-8')
assert ".limit(AUTO_RANK_LIMIT);" in central
assert 'loadPlayerDirectory(client).then' not in central
assert 'const AUTO_RANK_LIMIT=250;' in central
assert './central-adp-v36.js?v=368' in index
assert './on-demand-player-search-v88.js?v=881' in index
assert ".from('sleeper_player_status')" in ondemand
assert ".ilike('full_name','%'+q+'%')" in ondemand
assert '.limit(REMOTE_LIMIT)' in ondemand

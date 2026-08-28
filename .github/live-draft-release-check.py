from pathlib import Path


def require(ok, message):
    if not ok:
        raise SystemExit('LIVE DRAFT CONTRACT FAILED: ' + message)

loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
trade = Path('draft-trade-capital-v98.js').read_text(encoding='utf-8')
command = Path('live-draft-command-v99.js').read_text(encoding='utf-8')
recap = Path('draft-recap-upgrade-v100.js').read_text(encoding='utf-8')
base_recap = Path('draft-recap-v65.js').read_text(encoding='utf-8')

# All upgrades remain Draft-only and never move onto ranking startup.
for term in [
    "'./draft-trade-capital-v98.js?v=981'",
    "'./live-draft-command-v99.js?v=991'",
    "'./draft-recap-upgrade-v100.js?v=1001'",
]:
    require(term in loader, 'Draft-only loader lost ' + term)
    require(term.split('?')[0].replace("'./", '') not in index, 'Live Draft feature moved onto critical startup: ' + term)
require('draft-recap-all-picks-v84.js' not in loader,
        'old recap override returned and can replace the authoritative recap')

# Traded-pick ownership must remain automatic before and during drafts.
for term in [
    "/traded_picks'",
    'completed pick trades/current ownership',
    'auto-refreshes every 15 seconds',
    'function capital()',
    'acquired',
    'traded away',
]:
    require(term in trade, 'traded-pick ownership behavior missing: ' + term)

# Command center must use ACTUAL owned picks (including trades), not theoretical snake picks.
for term in [
    'WorkhorseDraftTradeCapital?.capital?.()',
    'const POSITIONS=[\'QB\',\'RB\',\'WR\',\'TE\'];',
    'Position Run Pressure',
    'Will They Make It Back?',
    "pressure.level==='high'",
    'tier.last',
    'next decision point',
    'schedule.acquired',
]:
    require(term in command, 'trade-aware draft intelligence missing: ' + term)

# Notes are a first-class Live Draft field and cannot be hidden behind a drawer.
for term in [
    "note=String(p?.note||'').trim()",
    'wh99-note',
    'wh99-note-existing',
    'NOTE</span>',
]:
    require(term in command, 'visible Live Draft notes protection missing: ' + term)

# Command center adds no network polling of its own; it reuses existing draft state.
require('fetch(' not in command and 'sleeper(' not in command,
        'command center reintroduced duplicate network polling')
require('MutationObserver' not in command,
        'command center must not add a persistent DOM observer')

# Recap must stay comprehensive and own the final recap API.
for term in [
    'WORKHORSE SCORE',
    'Draft Story',
    'Draft Highlights',
    'Roster By Position',
    'Tags & Tendencies',
    'Every Pick You Made',
    'Biggest Reach vs Your Board',
    'Bye Cluster',
    'ACQUIRED',
    'api.open=open',
]:
    require(term in recap, 'upgraded recap behavior missing: ' + term)
require('deRecap65' in base_recap,
        'base recap modal/button disappeared; v100 needs the durable recap shell')

print('Live Draft contract passed: trade-aware picks, positional pressure, visible notes, make-it-back guidance, and upgraded recap are protected.')

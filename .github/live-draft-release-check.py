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

for term in [
    "'./draft-trade-capital-v98.js?v=982'",
    "'./live-draft-command-v99.js?v=991'",
    "'./draft-recap-upgrade-v100.js?v=1001'",
]:
    require(term in loader, 'Draft-only loader lost ' + term)
    require(term.split('?')[0].replace("'./", '') not in index, 'Live Draft feature moved onto critical startup: ' + term)
require('draft-recap-all-picks-v84.js' not in loader,
        'old recap override returned and can replace the authoritative recap')

# Traded-pick ownership must remain automatic and resilient to incomplete Sleeper draft maps.
for term in [
    "/traded_picks'",
    "/rosters'",
    "/picks'",
    'function capital()',
    'function userIdsForSlot(slot)',
    'function rosterMatchesUser(r,userIds)',
    'const ui=Number(document.getElementById(\'deDraftSlot\')?.value||0)',
    "localStorage.getItem('de41_draft_slot:'",
    "ingest(draftRows,4,'draft',false)",
    "ingest(leagueRows,2,'league',true)",
    "_source:'pick'",
    'Sleeper trade records: draft ',
    'acquired',
    'traded away',
]:
    require(term in trade, 'resilient traded-pick ownership behavior missing: ' + term)
require('if(currentSeason&&t?.season&&String(t.season)!==currentSeason)continue;' not in trade,
        'draft-level trades are being discarded by the old strict season filter again')

for term in [
    'WorkhorseDraftTradeCapital?.capital?.()',
    'const POSITIONS=[\'QB\',\'RB\',\'WR\',\'TE\'];',
    'Position Run Pressure',
    'Will They Make It Back?',
    "pressure.level==='high'",
    'tier.last',
    'Next decision point',
    'schedule.acquired',
]:
    require(term in command, 'trade-aware draft intelligence missing: ' + term)

for term in [
    "note=String(p?.note||'').trim()",
    'wh99-note',
    'wh99-note-existing',
    'NOTE</span>',
]:
    require(term in command, 'visible Live Draft notes protection missing: ' + term)

require('fetch(' not in command and 'sleeper(' not in command,
        'command center reintroduced duplicate network polling')
require('MutationObserver' not in command,
        'command center must not add a persistent DOM observer')

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

print('Live Draft contract passed: resilient Sleeper trade ownership, positional pressure, visible notes, make-it-back guidance, and upgraded recap are protected.')

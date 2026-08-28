from pathlib import Path


def require(ok, message):
    if not ok:
        raise SystemExit('LIVE DRAFT CONTRACT FAILED: ' + message)

loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
trade = Path('draft-trade-capital-v98.js').read_text(encoding='utf-8')
ownership = Path('draft-ownership-v45.js').read_text(encoding='utf-8')
command = Path('live-draft-command-v99.js').read_text(encoding='utf-8')
recap = Path('draft-recap-upgrade-v100.js').read_text(encoding='utf-8')
base_recap = Path('draft-recap-v65.js').read_text(encoding='utf-8')

for term in [
    "'./draft-trade-capital-v98.js?v=983'",
    "'./draft-ownership-v45.js?v=453'",
    "'./live-draft-command-v99.js?v=991'",
    "'./draft-recap-upgrade-v100.js?v=1001'",
]:
    require(term in loader, 'Draft-only loader lost ' + term)
    require(term.split('?')[0].replace("'./", '') not in index, 'Live Draft feature moved onto critical startup: ' + term)
require('draft-recap-all-picks-v84.js' not in loader,
        'old recap override returned and can replace the authoritative recap')

# Traded-pick ownership must hydrate automatically even when Draft scripts load
# after the user already connected Sleeper. Draft-level trades win; league rows
# and completed pick roster ownership provide fallbacks.
for term in [
    "const INPUT_KEY='de34_draft_input',POLL_MS=15000;",
    'function savedSource()',
    'currentList?.()?.draftPrefs',
    "/traded_picks'",
    "/rosters'",
    "/picks'",
    'function capital()',
    'function userIdsForSlot(slot)',
    "ingest(draftRows,4,'draft',false)",
    "ingest(leagueRows,2,'league',true)",
    "source:'pick'",
    'Sleeper trade records: draft ',
    'if(extractId(savedSource()))setTimeout(start,300);',
    'acquired',
    'traded away',
]:
    require(term in trade, 'automatic/resilient traded-pick ownership behavior missing: ' + term)

# Completed picks must use Sleeper roster_id as current ownership. draft_slot is
# only the physical board column and is not ownership after a trade.
for term in [
    'const myRoster=rosterForSlot(slot),pickRoster=String(p.roster_id',
    'if(myRoster&&pickRoster)return pickRoster===myRoster;',
    'draft_slot is only the board column',
    'WorkhorseDraftTradeCapital?.refresh?.()',
]:
    require(term in ownership, 'completed traded-pick ownership mapping missing: ' + term)

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

print('Live Draft contract passed: automatic resilient Sleeper trade ownership, roster-aware completed picks, positional pressure, notes, make-it-back guidance, and recap are protected.')
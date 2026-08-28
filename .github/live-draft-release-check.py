from pathlib import Path


def require(ok, message):
    if not ok:
        raise SystemExit('LIVE DRAFT CONTRACT FAILED: ' + message)

loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
index = Path('index.html').read_text(encoding='utf-8')
trade = Path('draft-trade-capital-v98.js').read_text(encoding='utf-8')
sync = Path('draft-pick-ownership-sync-v102.js').read_text(encoding='utf-8')
ownership = Path('draft-ownership-v45.js').read_text(encoding='utf-8')
command = Path('live-draft-command-v99.js').read_text(encoding='utf-8')
recap = Path('draft-recap-upgrade-v100.js').read_text(encoding='utf-8')
base_recap = Path('draft-recap-v65.js').read_text(encoding='utf-8')

for term in [
    "'./draft-trade-capital-v98.js?v=986'",
    "'./draft-pick-ownership-sync-v102.js?v=1022'",
    "'./draft-ownership-v45.js?v=454'",
    "'./live-draft-command-v99.js?v=991'",
    "'./draft-recap-upgrade-v100.js?v=1002'",
]:
    require(term in loader, 'Draft-only loader lost ' + term)
    require(term.split('?')[0].replace("'./", '') not in index, 'Live Draft feature moved onto critical startup: ' + term)
require('draft-recap-all-picks-v84.js' not in loader,
        'old recap override returned and can replace the authoritative recap')

# Traded-pick ownership must survive changing Sleeper/mock draft IDs. Exact-draft
# rows win, while list-scoped profile rows provide a stable fallback.
for term in [
    "const INPUT_KEY='de34_draft_input',POLL_MS=15000;",
    'function listId()',
    'function pickOverrides()',
    'function loadDurableOverrides(draftId)',
    "client.from('draft_pick_overrides')",
    ".eq('draft_id',did)",
    ".eq('draft_id','*').eq('list_id',lid)",
    "scope:'profile'",
    "scope:'exact'",
    'state.source.profile=profile.length',
    'function overrideOwnerSlot(round,originalSlot)',
    'forcedOwnerSlot=overrideOwnerSlot(r,s)',
    'ownerSlot=forcedOwnerSlot||apiOwnerSlot||s',
    'overridden:!!forcedOwnerSlot',
    '/traded_picks',
    '/rosters',
    '/picks',
    'function capital()',
    'function userIdsForSlot(slot)',
    "ingest(draftRows,4,'draft',false)",
    "ingest(leagueRows,2,'league',true)",
    "source:'pick'",
    'Workhorse profile ',
    'loadDurableOverrides(did)',
    "window.addEventListener('workhorse:cloud-rankings-ready'",
    'acquired',
    'traded away',
]:
    require(term in trade, 'stable/profile traded-pick ownership behavior missing: ' + term)

# The headline cards and roster summary must use the same capital/ownership engine,
# including after the final pick when there is no next selection left.
for term in [
    'WorkhorseDraftTradeCapital?.capital?.()',
    "document.querySelectorAll('#deDraftRoomSummary .de-draft-card')",
    "v.textContent='#'+next",
    "s.textContent='Draft complete'",
    'function compactCounts(rows)',
    'DraftEdgeDraftOwnership?.ownPicks?.()',
    "window.addEventListener('workhorse:draft-owned-picks-updated'",
    'window.WorkhorseSyncDraftPickOwnership=syncSummary',
]:
    require(term in sync, 'main Live Draft summary/roster is not synced to traded-pick ownership: ' + term)
require('MutationObserver' not in sync,
        'draft ownership summary sync must not add a persistent DOM observer')

# Completed-pick ownership must use the Workhorse owned pick-number schedule when
# a trade exists. Sleeper roster_id/picked_by are only fallback ownership signals.
for term in [
    'function tradedSchedule(slot=selectedSlot())',
    'api?.pickOverrides?.()?.length>0',
    'if(schedule&&pickNo)return schedule.has(pickNo);',
    'Matched to your Workhorse traded-pick schedule.',
    "window.dispatchEvent(new CustomEvent('workhorse:draft-owned-picks-updated'",
    'await window.WorkhorseDraftTradeCapital?.refresh?.()',
    'window.DraftEdgeDraftOwnership={tick,start,ownPicks:()=>ownPicks(),selectedSlot,rosterForSlot,isOwnPick,tradedSchedule}',
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

# The end-of-draft recap must independently filter the full Sleeper pick list by
# Workhorse's owned pick numbers whenever a trade schedule exists. This prevents
# original-slot roster fields from assigning traded-away selections to the user.
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
    'hasTradeSchedule',
    'ownedPickNos',
    'picks.filter(pk=>ownedPickNos.has(Number(pk.pick_no)||0))',
    'api.open=open',
]:
    require(term in recap, 'upgraded/trade-correct recap behavior missing: ' + term)
require('deRecap65' in base_recap,
        'base recap modal/button disappeared; v100 needs the durable recap shell')

print('Live Draft contract passed: stable traded-pick ownership drives live cards, completed picks, roster summary, and end-of-draft recap.')

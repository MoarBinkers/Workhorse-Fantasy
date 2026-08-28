from pathlib import Path
import gzip
import re


def require(condition, message):
    if not condition:
        raise SystemExit('RELEASE CONTRACT FAILED: ' + message)

index = Path('index.html').read_text(encoding='utf-8')
patch = Path('patch-v29.js').read_text(encoding='utf-8')
central = Path('central-adp-v92.js').read_text(encoding='utf-8')
loader = Path('decision-loader-v61.js').read_text(encoding='utf-8')
cloud = Path('cloud-reliability-v41.js').read_text(encoding='utf-8')
onboarding = Path('new-user-adp-v60.js').read_text(encoding='utf-8')
recovery = Path('ranking-data-recovery-v95.js').read_text(encoding='utf-8')
rounds = Path('round-bands-v61.js').read_text(encoding='utf-8')
rank_cap = Path('rank-list-cap-v93.js').read_text(encoding='utf-8')
sleeper_cap = Path('sleeper-rank-cap-v94.js').read_text(encoding='utf-8')

# 1) Inspect the ACTUAL compressed base application. A later patch cannot be
# allowed to hide the fact that the legacy bundle still contains startup work.
base_path = Path('app-v28.bin')
require(base_path.is_file(), 'compressed base app is missing')
try:
    base = gzip.decompress(base_path.read_bytes()).decode('utf-8')
except Exception as exc:
    raise SystemExit('RELEASE CONTRACT FAILED: compressed base app cannot be decoded: ' + str(exc))

legacy_boot = 'renderDraft();initSupabase();refreshCurrentAdp();'
require(legacy_boot in base, 'expected legacy ADP boot signature changed; audit the base bundle before deploying')
require("sourceBranded=sourceBranded.replace('renderDraft();initSupabase();refreshCurrentAdp();','renderDraft();initSupabase();');" in index,
        'production transform no longer disables the legacy full Sleeper refresh')
require("sourceBranded=sourceBranded.replace('bye:src.bye??\"—\"'" in index,
        'production transform no longer preserves built-in bye-week metadata for generated players')

# 2) Core personal-player fields must remain present in the NORMAL row renderer.
# These are one contract: a speed optimization may not replace personal objects
# with a blank market mirror.
for term in [
    'Bye '+"'+esc(p.bye)+'",
    'tagsHtml(p)',
    'noteHtml(p,i)',
    'notePreview(p)',
    'sleeperRank=adp?Number(adp.rank):null',
    'const edge=sleeperRank!=null?sleeperRank-p.overall:null',
    'sleeperRank!=null?"#"+sleeperRank:"NR"',
]:
    require(term in patch, 'rankings row lost required field/formula: ' + term)

# Stable Sleeper ID must be the primary live-data join. Never fall back to
# search_rank or a linear name-only repair pass.
for term in [
    'marketIdIndex.get(String(sleeperId))',
    'identityOnly!==false',
    'WorkhorseTrueSleeperAdpEntry',
]:
    require(term in patch, 'true Sleeper ID/rank join protection missing: ' + term)
for forbidden in ['searchRank:Number', 'rank-edge-fix-v95.js', 'rank-edge-source-v96.js']:
    require(forbidden not in patch + loader + index, 'obsolete/fake Rank/EDGE path returned: ' + forbidden)

# 3) Sleeper data is reference data only: top 250, true format-specific ADP,
# and never an excuse to overwrite/append the user's personal list.
for term in [
    'const AUTO_RANK_LIMIT=250;',
    'sleeper_rank=lte.',
    'identityOnly:false',
    'searchRank:null',
    'Never append missing ADP',
]:
    require(term in central, 'top-250 true ADP contract missing: ' + term)
require('players.push({overall:++maxOverall' not in central, 'central ADP is auto-filling personal rankings again')
require('__WORKHORSE_RANK_LIST_CAP_93__' in rank_cap and 'MAX_PLAYERS=250' in rank_cap,
        'personal ranking hard cap is not 250')
require('__WORKHORSE_SLEEPER_RANK_CAP_94__' in sleeper_cap and 'const MAX=250;' in sleeper_cap,
        'Sleeper rankings hard cap is not 250')

# 4) Auth/cloud hydration owns custom data. Guest onboarding cannot win before
# auth resolution, and blank-mirror recovery must remain available.
for term in [
    'window.WorkhorseAuthResolved=false;',
    'client.auth.getSession()',
    'client.auth.onAuthStateChange',
    'window.WorkhorseCloudRankingsReady=true;',
]:
    require(term in cloud, 'cloud/auth hydration protection missing: ' + term)
for term in [
    'if(!authResolved()||signedInNow())return false;',
    "window.addEventListener('workhorse:auth-resolved'",
    "window.addEventListener('workhorse:cloud-rankings-ready'",
]:
    require(term in onboarding, 'guest onboarding can race cloud auth again: ' + term)
for term in [
    'function recoverBlankActiveOnce()',
    'a.tagged===0&&a.noted===0&&a.byes<=5',
    'best.stats.score>=a.score+40',
    'function enrichActiveByes()',
]:
    require(term in recovery, 'saved metadata recovery contract missing: ' + term)

# 5) Rankings round controls are a Rankings feature, NOT a Draft-only feature.
for term in [
    'const VALID_SIZES=[10,12,14];',
    '10 teams', '12 teams', '14 teams',
    "add('rankings')", "add('adp')",
]:
    require(term in rounds, '10/12/14 ranking round feature missing: ' + term)
require("loadOne('./round-bands-v61.js?v=616')" in loader,
        'round-band controls are no longer loaded as Rankings-critical behavior')

draft_match = re.search(r'const draftFiles=\[(.*?)\];', loader, re.S)
require(draft_match is not None, 'cannot identify Draft-only loader section')
require('round-bands-v61.js' not in draft_match.group(1),
        'round-band controls were moved back into Draft-only loading')

# 6) Recovery and round controls must be immediate tiny guards, while the heavy
# Draft/news/logo stacks stay deferred.
for term in [
    "loadOne('./rank-list-cap-v93.js?v=932')",
    "loadOne('./sleeper-rank-cap-v94.js?v=942')",
    "loadOne('./ranking-data-recovery-v95.js?v=951')",
    "loadOne('./round-bands-v61.js?v=616')",
]:
    require(term in loader, 'critical lightweight guard is not immediate: ' + term)
for heavy in ['./draft-room-v41.js', './rankings-news-update-v83.js', './logo-fix-v291.js']:
    require(heavy not in index, 'heavy optional feature returned to critical HTML startup: ' + heavy)

# 7) Known browser-hang patterns stay forbidden.
require('new MutationObserver(tuneExisting)' not in Path('tier-v33.js').read_text(encoding='utf-8'),
        'whole-page avatar rescan observer returned')
require(not Path('rank-edge-fix-v95.js').exists(), 'obsolete DOM Rank/EDGE repair file was recreated')
require(not Path('rank-edge-source-v96.js').exists(), 'obsolete Rank/EDGE wrapper file was recreated')

print('Critical release contract passed: speed protections coexist with true Sleeper Rank/EDGE, saved metadata/byes, 250 caps, and 10/12/14 round controls.')

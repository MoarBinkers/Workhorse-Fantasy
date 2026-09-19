'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');

const must=[
  "bundle=await loadStartSitPlayerBundle(p)",
  "playerBundleCache=new Map()",
  "/functions/v1/get-startsit-player-data",
  "async function loadStartSitPlayerBundle(p)",
  "label:'Routes & efficiency'",
  "label:'Player props'",
  "label:'Week projection'",
  "function seasonPpgCell(x)",
  "/functions/v1/get-sleeper-week-data?type=projections",
  "/functions/v1/get-sleeper-week-data?type=stats",
  "/functions/v1/get-week-games",
  "function mergeVerifiedGame(p,id,base)",
  "function mergeVerifiedRole(p,id,base)",
  "player_week_projection_verified",
  "player_week_usage_verified",
  "async function loadVerifiedWeeklyData()",
  "actionable:!out&&!bye",
  "const valid=graded.filter(x=>x.availability?.actionable)",
  "player grade failed; using emergency verified-data grade",
  "function emergencyGrade(id,reason='')",
  "function calendarWeek(now=Date.now())",
  "/functions/v1/get-nfl-state",
  "weekSource='calendar-fallback'",
  "function weeklyOrder()",
  "source:'saved+normalized'",
  "function explicitAvailability({inj,game})",
  "function coreFallbackScore(",
  "Core verified data fallback",
  "function safeMatrixCell(row,x)",
  "function safeDetailCard(x)",
  "Promise.allSettled(selected.map(grade))",
  "async function loadPropsFor(p)",
  "&season=${SEASON}&week=${week}",
  "function latestGameStats(pos,stats)",
  "const targetShare=totalTargets>0?targets/totalTargets:null",
  "const targetDistribution=targetShare;",
  "const routeParticipation=routes>0&&teamDropbacks>0?Math.min(1,routes/teamDropbacks):null",
  "const targetsPerRoute=routes>0?targets/routes:null",
  "roleNorm(targetShare,.08,.30),.55",
  "roleNorm(routeParticipation,.55,.95),.20",
  "roleNorm(targetsPerRoute,.08,.28),.12",
  "label:'Target share'",
  "all ${pos}s combined",
  "method:'raw-box-score-v3'",
  "wh_start_sit_matchup_v4::",
  "workhorseRank=whRank(id)",
  "providerProjection:weeklyProjection",
  "latestRoleScore:forwardRoleScore",
  "function matchupFromBundle(bundle,p,game)",
  "bundleRoleChange",
  "Targets ÷ total team targets",
  "route_pct_available",
  "2026 matchup vs",
  "2025 matchup baseline",
  "const roleReport=recent.find",
  "bundle=playerBundleCache.get(sid)||null",
  "for(let attempt=0;attempt<2&&!out;attempt++)",
  "function matchupYearCell(x,year)",
  "<h4>Role change</h4>",
  "out.routeSource=v.route_pct_source||v.source||''",
  "if(routePos&&!routeVerified){out.routeParticipation=null;out.routes=null",
  "['Routes',fmt(lr.routes,0)]",
  "['Route source',lr.routeSource||'—']",
  "function modelConfidence(g)",
  "function decisionConfidence(a,b)",
  "function matchupYearTone(raw,d)",
  "label:'Model confidence'",
  "label:'RB trench matchup'",
  "label:'RB game script'",
  "trenchScore:trenchContext?.score",
  "confidence:modelConfidence(g)"
];
for(const m of must)if(!s.includes(m))throw new Error('Start/Sit data contract missing: '+m);

const forbidden=[
  'VERIFIED_2025_PPR',
  "const targetShare=teamPassAttempts>0?targets/teamPassAttempts:null",
  "if(propsCache.has(k)&&propsCache.get(k)?.length)return propsCache.get(k)",
  "Number(lg.recYds)/Number(lg.routes)",
  'verifiedPpr25(',
  "label:'Workhorse projection'",
  "['Workhorse projection'",
  '/32',
  'return week=1',
  'const valid=graded.filter(x=>x.g?.eligible',
  'None of the selected players is currently a valid lineup option',
  'Workhorse could not verify enough current data to complete this comparison. No recommendation was forced.',
  'weeklyRank:rank',
  'rankWeight',
  'coreFallbackScore({rank',
  'rank-emergency',
  'components:{rank',
  'confidence:confidence(g)',
  "year===2026?matchupTone(x.mu?.score):''"
];
for(const m of forbidden)if(s.includes(m))throw new Error('Start/Sit forbidden regression returned: '+m);

const hist=(s.match(/function historicalTeam\(entry\)\{([^}]*)\}/)||[])[1]||'';
if(/pool\.get|status\.get/.test(hist))throw new Error('Historical matchup attribution must not fall back to current team');

const propsFn=s.slice(s.indexOf('async function loadPropsFor'),s.indexOf('function textFirst',s.indexOf('async function loadPropsFor')));
if(propsFn.indexOf('/functions/v1/get-player-props')<0)throw new Error('Live prop endpoint missing');
if(!propsFn.includes('&season=${SEASON}&week=${week}'))throw new Error('Live prop endpoint must be week-scoped');
if(propsFn.indexOf('/rest/v1/player_prop_lines')>propsFn.indexOf('/functions/v1/get-player-props'))throw new Error('Verified prop cache must be checked before live scraper');

if(!s.includes("const valid=graded.filter(x=>x.availability?.actionable)"))throw new Error('selected active players must survive score/model failures');
if(s.includes('Workhorse could not produce a score from the available core data'))throw new Error('score-failure warning returned');
if(s.includes("label:'RB target share'"))throw new Error('mixed-position comparison must not create RB-only blank cells');
console.log('PASS: Start/Sit current-week, actionability, data and prop contracts');

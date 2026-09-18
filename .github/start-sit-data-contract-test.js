'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');

const must=[
  "actionable:!out&&!bye",
  "const valid=graded.filter(x=>x.availability?.actionable)",
  "player grade failed; using emergency rank grade",
  "function emergencyGrade(id,reason='')",
  "function calendarWeek(now=Date.now())",
  "/functions/v1/get-nfl-state",
  "weekSource='calendar-fallback'",
  "function weeklyOrder()",
  "source:'saved+normalized'",
  "function explicitAvailability({inj,game})",
  "function coreFallbackScore(",
  "const emergencyRank=(rank??workhorseRank",
  "Core verified data fallback",
  "function safeMatrixCell(row,x)",
  "function safeDetailCard(x)",
  "Promise.allSettled(selected.map(grade))",
  "async function loadPropsFor(p)",
  "&season=${SEASON}&week=${week}",
  "function latestGameStats(pos,stats)",
  "const targetShare=teamPassAttempts>0?targets/teamPassAttempts:null",
  "const targetDistribution=totalTargets>0?targets/totalTargets:null",
  "const routeParticipation=routes>0&&teamDropbacks>0?Math.min(1,routes/teamDropbacks):null",
  "const targetsPerRoute=routes>0?targets/routes:null",
  "roleNorm(targetShare,.08,.30),.55",
  "roleNorm(routeParticipation,.55,.95),.20",
  "roleNorm(targetsPerRoute,.08,.28),.12",
  "label:'Target share'",
  "Targets ÷ team pass attempts",
  "all ${pos}s combined",
  "method:'raw-box-score-v3'",
  "wh_start_sit_matchup_v4::",
  "workhorseRank=whRank(id)",
  "providerProjection:weeklyProjection",
  "latestRoleScore:forwardRoleScore"
];
for(const m of must)if(!s.includes(m))throw new Error('Start/Sit data contract missing: '+m);

const forbidden=[
  'VERIFIED_2025_PPR',
  'verifiedPpr25(',
  "const targetShare=totalTargets>0?targets/totalTargets:null",
  "label:'Workhorse projection'",
  "['Workhorse projection'",
  '/32',
  'return week=1',
  'const valid=graded.filter(x=>x.g?.eligible',
  'None of the selected players is currently a valid lineup option',
  'Workhorse could not verify enough current data to complete this comparison. No recommendation was forced.'
];
for(const m of forbidden)if(s.includes(m))throw new Error('Start/Sit forbidden regression returned: '+m);

const hist=(s.match(/function historicalTeam\(entry\)\{([^}]*)\}/)||[])[1]||'';
if(/pool\.get|status\.get/.test(hist))throw new Error('Historical matchup attribution must not fall back to current team');

const propsFn=s.slice(s.indexOf('async function loadPropsFor'),s.indexOf('function textFirst',s.indexOf('async function loadPropsFor')));
if(propsFn.indexOf('/functions/v1/get-player-props')<0)throw new Error('Live prop endpoint missing');
if(!propsFn.includes('&season=${SEASON}&week=${week}'))throw new Error('Live prop endpoint must be week-scoped');
if(propsFn.indexOf('/functions/v1/get-player-props')>propsFn.indexOf('/rest/v1/player_prop_lines'))throw new Error('Live prop endpoint must be checked before local cache');

if(!s.includes("const valid=graded.filter(x=>x.availability?.actionable)"))throw new Error('selected active players must survive score/model failures');
if(s.includes('Workhorse could not produce a score from the available core data'))throw new Error('score-failure warning returned');
console.log('PASS: Start/Sit current-week, actionability, data and prop contracts');

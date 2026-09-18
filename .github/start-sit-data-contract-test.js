'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');

const must=[
  "const emergencyRank=(rank??workhorseRank",
  "source:'saved+normalized'",
  "function explicitAvailability({inj,game})",
  "weekSource='calendar-fallback'",
  "/functions/v1/get-nfl-state",
  "function calendarWeek(now=Date.now())",
  "scheduleLoaded=games.size>=20",
  "function coreFallbackScore(",
  "2026 matchup unavailable",
  "2025 matchup unavailable",
  "Core verified data fallback",
  "function safeDetailCard(x)",
  "function safeMatrixCell(row,x)",
  "Promise.allSettled(selected.map(grade))",
  "async function loadPropsFor(p)",
  "&season=${SEASON}&week=${week}",
  "age>24",
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
  "route participation",
  "all ${pos}s combined",
  "targets,receptions,carries,passAtt,passYds,passTd,rushYds,rushTd,recYds,recTd",
  "method:'raw-box-score-v3'",
  "wh_start_sit_matchup_v4::",
  "rank=format==='ppr'?whRank(id):null",
  "bye:scheduleLoaded&&!game",
  "x.g?.eligible&&!x.g?.locked",
  "providerProjection:weeklyProjection",
  "latestRoleScore:forwardRoleScore"
];
for(const m of must)if(!s.includes(m))throw new Error('Start/Sit data contract missing: '+m);

if(s.includes('VERIFIED_2025_PPR')||s.includes('verifiedPpr25('))throw new Error('Hard-coded 2025 PPR matchup override returned');
if(s.includes("const targetShare=totalTargets>0?targets/totalTargets:null"))throw new Error('WR target share reverted to recorded-target distribution');
if(s.includes("label:'Workhorse projection'")||s.includes("['Workhorse projection'"))throw new Error('Workhorse projection must stay hidden from Start/Sit UI');
if(s.includes('/32'))throw new Error('Matchup rank should not display /32');
if(s.includes("bye:!game"))throw new Error('Schedule failure must not be treated as a bye');

const hist=(s.match(/function historicalTeam\(entry\)\{([^}]*)\}/)||[])[1]||'';
if(/pool\.get|status\.get/.test(hist))throw new Error('Historical matchup attribution must not fall back to current team');

const propsFn=s.slice(s.indexOf('async function loadPropsFor'),s.indexOf('function textFirst',s.indexOf('async function loadPropsFor')));
if(propsFn.indexOf('/functions/v1/get-player-props')<0)throw new Error('Live prop endpoint missing');
if(!propsFn.includes('&season=${SEASON}&week=${week}'))throw new Error('Live prop endpoint must be week-scoped');
if(propsFn.indexOf('/functions/v1/get-player-props')>propsFn.indexOf('/rest/v1/player_prop_lines'))throw new Error('Live prop endpoint must be checked before local cache');

if(s.includes('Workhorse could not verify enough current data to complete this comparison. No recommendation was forced.'))throw new Error('all-or-nothing failure message returned');
if(s.includes('None of the selected players is currently a valid lineup option'))throw new Error('misleading all-invalid lineup message returned');
if(s.includes('return week=1'))throw new Error('network failure must not silently become Week 1');
if(s.includes('const valid=graded.filter(x=>x.g?.eligible'))throw new Error('model eligibility must not control lineup actionability');
console.log('PASS: Start/Sit data contracts');

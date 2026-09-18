'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  "label:'Expected role'",
  "Clear role edge",
  "sits out again",
  "latestRoleScore:latestRole.score",
  "function latestRoleContext(p,id)",
  "https://api.sleeper.com/stats/nfl/${season}/${w}?season_type=regular",
  "https://api.sleeper.com/projections/nfl/${SEASON}/${week}?season_type=regular",
  "providerProjection:weeklyProjection",
  "if(team!=null&&base.team==null)base.team=team",
  "function matchupCacheKey(season,through)",
  "['ppr','half','std','yards','td']",
  "function matchupPointKey()",
  "rank=format==='ppr'?whRank(id):null",
  "bye:scheduleLoaded&&!game",
  "x.g?.eligible&&!x.g?.locked",
  "function availabilityRisk(injury,newsCtx)",
  "function teamContext(){return {adjustment:0,reasons:[]}}",
  "let scheduleLoaded=false,projectionsLoaded=false"
];
for(const m of must){if(!s.includes(m))throw new Error('Start/Sit data contract missing: '+m)}
const hist=(s.match(/function historicalTeam\(entry\)\{([^}]*)\}/)||[])[1]||'';
if(/pool\.get|status\.get/.test(hist))throw new Error('Historical matchup attribution must not fall back to current team');
if(s.includes("bye:!game"))throw new Error('Schedule failure must not be treated as a bye');
if(/search_rank[\s\S]{0,600}teamContext/.test(s))throw new Error('Start/Sit must not infer starting QB from search rank');
console.log('PASS: Start/Sit data contracts');

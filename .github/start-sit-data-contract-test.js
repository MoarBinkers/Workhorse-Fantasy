'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  "https://api.sleeper.com/stats/nfl/${season}/${w}?season_type=regular",
  "if(team!=null&&base.team==null)base.team=team",
  "function matchupCacheKey(season,through)",
  "['ppr','yards','td']",
  "bye:scheduleLoaded&&!game",
  "x.g?.eligible&&!x.g?.locked",
  "function availabilityRisk(injury,newsCtx)",
  "let scheduleLoaded=false"
];
for(const m of must){if(!s.includes(m))throw new Error('Start/Sit data contract missing: '+m)}
const hist=(s.match(/function historicalTeam\(entry\)\{([^}]*)\}/)||[])[1]||'';
if(/pool\.get|status\.get/.test(hist))throw new Error('Historical matchup attribution must not fall back to current team');
if(s.includes("bye:!game"))throw new Error('Schedule failure must not be treated as a bye');
console.log('PASS: Start/Sit data contracts');
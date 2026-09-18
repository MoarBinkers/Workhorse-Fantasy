'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  "Live consensus markets fetched for the selected player",
  "PPR baseline externally cross-checked",
  "LV:{QB:16.73,RB:23.28,WR:32.72,TE:10.04}",
  "ARI:{QB:17.54,RB:27.15,WR:29.82,TE:17.04}",
  "method:'raw-box-score-v2'",
  "function matchupFantasyPoints(s,format='ppr')",
  "roleNorm(targetShare,.08,.30),.60",
  "targetsPerRoute",
  "routeParticipation",
  "targetRate",
  "get-player-props",
  "Prop display unavailable",
  "try{",
  "function ago(iso)",
  "matchupYardLabel",
  "No verified line",
  "age>24",
  "async function loadPropsFor(p)",
  "function latestGameStats(pos,stats)",
  "label:'Last game'",
  "label:'Player props'",
  "Clear role edge",
  "sits out again",
  "latestRoleScore:forwardRoleScore",
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
if(s.includes("label:'Workhorse projection'")||s.includes("['Workhorse projection'"))throw new Error('Workhorse projection must stay hidden from Start/Sit UI');
if(s.includes('/32'))throw new Error('Matchup rank should not display /32');
if((s.match(/ago\(/g)||[]).length>0&&!s.includes('function ago(iso)'))throw new Error('Start/Sit prop timestamp helper is missing');
const propsFn=s.slice(s.indexOf('async function loadPropsFor'),s.indexOf('function textFirst',s.indexOf('async function loadPropsFor')));
if(propsFn.indexOf('/functions/v1/get-player-props')<0)throw new Error('Live prop endpoint missing');
if(propsFn.indexOf('/functions/v1/get-player-props')>propsFn.indexOf('/rest/v1/player_prop_lines'))throw new Error('live prop endpoint must be checked before local cache');
const dm=(s.match(/function defenseMetrics\(pos,s\)\{([\s\S]*?)\n\}/)||[])[1]||'';
if(dm.includes("E.fantasyPoints(s,'ppr')"))throw new Error('Matchup PPG must be recalculated from raw box-score stats');
if(!s.includes("format==='ppr'"))throw new Error('Verified 2025 PPR override missing');
console.log('PASS: Start/Sit data contracts');

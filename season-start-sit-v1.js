(()=>{
'use strict';
if(window.__WH_START_SIT_V1__)return;window.__WH_START_SIT_V1__=true;
const E=window.WorkhorseDecisionEngine;if(!E){document.body.innerHTML='<div style="padding:40px;color:white">Workhorse decision engine could not load.</div>';return}
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co',KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k',SEASON=2026;
const qs=new URLSearchParams(location.search);let week=Math.min(18,Math.max(0,Number(qs.get('week')||0)||0)),format='ppr',slot='FLEX',selected=[];
const pool=new Map(),status=new Map(),weeks=new Map(),games=new Map(),projections=new Map(),newsCache=new Map(),propsCache=new Map(),teamStatus=new Map(),scheduleCache=new Map(),matchupCache={2025:null,2026:null};let scheduleLoaded=false,projectionsLoaded=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normTeam=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const compatible=(p,s=slot)=>s==='SUPERFLEX'?['QB','RB','WR','TE'].includes(p.position):s==='FLEX'?['RB','WR','TE'].includes(p.position):p.position===s;
const token=v=>String(v||'').toLowerCase();
function load(k,f=[]){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function whRank(id){const a=load(`wh_week_master_v3::${week}`,[]);const i=Array.isArray(a)?a.map(String).indexOf(String(id)):-1;return i<0?null:i+1}
async function currentWeek(){if(week)return week;try{const r=await fetch('https://api.sleeper.app/v1/state/nfl',{cache:'no-store'});if(r.ok){const x=await r.json();week=Math.max(1,Math.min(18,Number(x?.week)||1));return week}}catch(_){}return week=1}
function ingest(data){
 const m=new Map();
 const pack=(r)=>{
  const base={...(r?.stats||r||{})};
  const team=r?.team||r?.player?.team||base.team||base.tm||base.team_abbr;
  const position=r?.position||r?.player?.position||base.position||base.pos;
  const gp=r?.gp??r?.stats?.gp??base.gp;
  if(team!=null&&base.team==null)base.team=team;
  if(position!=null&&base.position==null)base.position=position;
  if(gp!=null&&base.gp==null)base.gp=gp;
  return base;
 };
 if(Array.isArray(data)){
  for(const r of data){const id=r?.player_id||r?.player?.player_id;if(id)m.set(String(id),pack(r))}
 }else if(data&&typeof data==='object'){
  for(const [id,r] of Object.entries(data))if(!String(id).startsWith('TEAM_'))m.set(String(id),pack(r));
 }
 return m
}

async function weekStats(season,w){
 const key=`${season}:${w}`;if(weeks.has(key))return weeks.get(key);
 let data=null;
 for(const u of [`https://api.sleeper.com/stats/nfl/${season}/${w}?season_type=regular`,`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${w}`]){
  try{const r=await fetch(u,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
 }
 const m=ingest(data);weeks.set(key,m);return m
}
async function loadProjections(){
 projections.clear();projectionsLoaded=false;
 let data=null;
 for(const u of [
  `https://api.sleeper.com/projections/nfl/${SEASON}/${week}?season_type=regular`,
  `https://api.sleeper.app/v1/projections/nfl/regular/${SEASON}/${week}`
 ]){
  try{const r=await fetch(u,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
 }
 const m=ingest(data);
 for(const [id,row] of m.entries()){
  const hasPoints=['pts_ppr','pts_half_ppr','pts_std'].some(k=>row?.[k]!=null&&Number.isFinite(Number(row[k])));
  if(hasPoints)projections.set(String(id),row);
 }
 projectionsLoaded=true;
}
function providerProjection(id){
 const row=projections.get(String(id));if(!row)return null;
 const k=format==='ppr'?'pts_ppr':format==='half'?'pts_half_ppr':'pts_std',v=Number(row[k]);
 return Number.isFinite(v)?v:null
}
async function loadPool(){
 const r=await fetch(`${SB}/rest/v1/sleeper_adp_current?select=player_id,full_name,position,team,sleeper_rank&format=eq.ppr&order=sleeper_rank.asc&limit=750`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
 if(!r.ok)throw new Error('Player pool unavailable');
 for(const p of await r.json())if(p?.player_id&&['QB','RB','WR','TE'].includes(p.position))pool.set(String(p.player_id),p)
}
async function loadStatus(){
 try{
  const r=await fetch(`${SB}/rest/v1/sleeper_player_status?select=player_id,full_name,position,team,status,injury_status,injury_body_part,updated_at,search_rank&limit=4000`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok)for(const x of await r.json())if(x?.player_id){
   const id=String(x.player_id);status.set(id,x);
   const tm=normTeam(x.team);if(tm){if(!teamStatus.has(tm))teamStatus.set(tm,[]);teamStatus.get(tm).push(x)}
  }
 }catch(_){}
}
function parseSpread(details,team){
 const m=String(details||'').toUpperCase().match(/\b([A-Z]{2,3})\s+([+-]?\d+(?:\.\d+)?)/);
 if(!m)return null;
 const fav=normTeam(m[1]),line=Number(m[2]);if(!Number.isFinite(line))return null;
 return normTeam(team)===fav?line:-line
}
async function loadGames(){
 games.clear();scheduleLoaded=false;
 try{
  const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON}&seasontype=2&week=${week}`,{cache:'no-store'});if(!r.ok)return;
  const d=await r.json();scheduleLoaded=true;
  for(const ev of d?.events||[]){
   const c=ev?.competitions?.[0],teams=c?.competitors||[],odds=c?.odds?.[0]||{},state=c?.status?.type?.state||'pre';
   for(const a of teams){
    const b=teams.find(x=>x!==a),tm=normTeam(a?.team?.abbreviation),opp=normTeam(b?.team?.abbreviation);
    if(!tm||!opp)continue;
    const total=Number(odds?.overUnder)||0,details=odds?.details||'',spread=parseSpread(details,tm);
    const teamImplied=total&&Number.isFinite(spread)?total/2-spread/2:null;
    const weather=c?.weather?.displayValue||ev?.weather?.displayValue||c?.weather?.conditionId||'';
    games.set(tm,{opp,home:a?.homeAway==='home',total,details,date:ev?.date||'',state,locked:state!=='pre',spread,teamImplied,weather:String(weather||'')})
   }
  }
 }catch(_){}
}
async function history(id){
 const out=[];for(let w=1;w<week;w++)out.push((await weekStats(SEASON,w)).get(String(id))||{});return out
}
async function priorHistory(id){
 const maps=await Promise.all(Array.from({length:18},(_,i)=>weekStats(2025,i+1)));
 return maps.map(m=>m.get(String(id))||{})
}
function customMeta(id){try{return JSON.parse(localStorage.getItem(`wh_cc_meta_v1::${id}`)||'{}')||{}}catch(_){return{}}}
function injuryText(id){
 const c=customMeta(id),s=status.get(String(id))||{};
 return c.injury||s.injury_status||((s.status&&String(s.status).toLowerCase()!=='active')?s.status:'')||''
}
function playerKey(p){return String(p?.full_name||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
async function loadNewsFor(p){
 const k=String(p.player_id);if(newsCache.has(k))return newsCache.get(k);
 let rows=[];
 try{
  const pk=encodeURIComponent(playerKey(p));
  const r=await fetch(`${SB}/rest/v1/player_news?select=provider,headline,summary,fantasy_impact,categories,published_at,source_url&player_key=eq.${pk}&order=published_at.desc&limit=14`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok)rows=await r.json()
 }catch(_){}
 const seen=new Set(),clean=[];
 for(const n of rows){
  const key=String(n.headline||'').replace(/\s+/g,' ').trim().toLowerCase();
  if(!key||seen.has(key))continue;seen.add(key);clean.push(n);if(clean.length>=8)break
 }
 newsCache.set(k,clean);return clean
}
async function loadPropsFor(p){
 const k=String(p.player_id);if(propsCache.has(k))return propsCache.get(k);
 let rows=[];
 try{
  const pk=encodeURIComponent(playerKey(p));
  const r=await fetch(`${SB}/rest/v1/player_prop_lines?select=market,line,over_odds,under_odds,source,source_url,observed_at&season=eq.${SEASON}&week=eq.${week}&player_key=eq.${pk}&order=observed_at.desc&limit=10`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok)rows=await r.json()
 }catch(_){}
 const now=Date.now(),seen=new Set(),fresh=[];
 for(const x of rows){
  const age=(now-new Date(x.observed_at||0).getTime())/36e5;
  if(!Number.isFinite(age)||age>24)continue;
  if(seen.has(x.market))continue;
  seen.add(x.market);fresh.push(x)
 }
 propsCache.set(k,fresh);return fresh
}

function newsContext(items,injury){
 const now=Date.now(),market=[],reasons=[];
 const recent=(items||[]).filter(n=>{
  const age=(now-new Date(n.published_at||0).getTime())/86400000;
  return Number.isFinite(age)&&age<=7;
 });
 const direct=recent.find(n=>{
  const c=Array.isArray(n.categories)?n.categories:[];
  return !c.includes('indirect')&&!c.includes('trending');
 });
 let directAdjustment=0,directState='neutral';
 if(direct){
  const text=`${direct.headline||''} ${direct.summary||''} ${direct.fantasy_impact||''}`.toLowerCase();
  if(/ruled out|will miss|out for|placed on ir|inactive/.test(text)){directAdjustment=-7;directState='out';reasons.push('Latest player report indicates he is not expected to be available.')}
  else if(/doubtful|unlikely to play|uncertain to play/.test(text)){directAdjustment=-4.5;directState='doubtful';reasons.push('Latest player report adds major availability risk.')}
  else if(/ready to go|expected to play|will play|full practice|cleared|no injury designation/.test(text)){directAdjustment=1.5;directState='positive';reasons.push('Latest player report is positive for availability.')}
  else if(/questionable|limited|did not practice|dnp|hamstring|ankle|shoulder|knee|groin|ribs?/.test(text)){directAdjustment=-1.5;directState='questionable';reasons.push('Latest player report adds some health volatility.')}
  if(/named starter|will start|starting role|starter going forward|clear starter/.test(text)){directAdjustment=Math.min(7,directAdjustment+3);directState='role_up';reasons.push('Latest player report confirms a stronger role.')}
  if(/earned more reps|more reps moving forward|more playing time|more opportunities|workload (will|should|could) increase|role (will|should|could) expand|increase his workload/.test(text)){directAdjustment=Math.min(7,directAdjustment+4);directState='role_up';reasons.push('Coach-confirmed workload expansion materially raises the expected role.')}
  if(/deliberate about the reps|deliberately limited|cautious (with|in terms of) (his )?workload/.test(text)&&/not physical|nothing physical|just being a rookie/.test(text)){directAdjustment=Math.min(7,directAdjustment+1.5);directState='role_up';reasons.push('The prior workload cap was developmental, not a physical limitation.')}
  if(/benched|demoted|backup role|will not start/.test(text)){directAdjustment=Math.max(-7,directAdjustment-4.5);directState='role_down';reasons.push('Latest player report points to a reduced role.')}
 }
 let indirectAdjustment=0,indirectState='neutral',indirect=null;
 for(const n of recent){
  const cats=Array.isArray(n.categories)?n.categories:[];
  if(cats.includes('trending')){market.push(n);continue}
  if(!cats.includes('indirect'))continue;
  const text=`${n.headline||''} ${n.summary||''} ${n.fantasy_impact||''}`.toLowerCase();
  let adj=0,state='neutral';
  if(/ruled out|will miss|out for|placed on ir|inactive/.test(text)){adj=3.5;state='teammate_out'}
  else if(/doubtful|unlikely to play|uncertain to play|sits out again|did not practice|dnp|missed practice|misses practice|absent from practice/.test(text)){adj=2.5;state='teammate_major_risk'}
  else if(/questionable|limited|day-to-day|undergoing testing|injury concern/.test(text)){adj=1.25;state='teammate_risk'}
  else if(/ready to go|expected to play|will play|full practice|cleared|activated|returns to practice/.test(text)){adj=-2;state='teammate_return'}
  if(adj!==0){indirectAdjustment=adj;indirectState=state;indirect=n;break}
 }
 if(indirectAdjustment>=3)reasons.push('A key teammate is expected to miss time, creating a meaningful opportunity bump.');
 else if(indirectAdjustment>=2)reasons.push('A teammate availability issue creates a real path to more opportunity.');
 else if(indirectAdjustment>0)reasons.push('A teammate health issue modestly improves the opportunity outlook.');
 else if(indirectAdjustment<0)reasons.push('A teammate is returning, which can tighten the available opportunity.');
 const adjustment=Math.max(-7,Math.min(7,directAdjustment+indirectAdjustment));
 const forwardRoleBoost=directState==='role_up'?22:directState==='role_down'?-22:indirectState==='teammate_out'?8:indirectState==='teammate_major_risk'?5:0;
 return {adjustment,reasons:[...new Set(reasons)].slice(0,3),market:market.slice(0,2),direct,directState,directAdjustment,indirectAdjustment,indirectState,indirect,forwardRoleBoost}
}
function teamContext(){return {adjustment:0,reasons:[]}}
function roleNorm(v,lo,hi){return v==null?null:Math.max(0,Math.min(100,(Number(v)-lo)/(hi-lo)*100))}
async function latestRoleContext(p,id){
 for(let w=Math.max(1,week-1);w>=Math.max(1,week-3);w--){
  const m=await weekStats(SEASON,w),row=m.get(String(id));
  if(!row||!E.played(row))continue;
  const team=normTeam(textFirst(row,'team','tm','team_abbr')||p.team);
  if(!team)continue;
  const peers=[...m.entries()].filter(([pid,x])=>normTeam(textFirst(x,'team','tm','team_abbr'))===team&&E.played(x));
  const totalTargets=peers.reduce((a,[,x])=>a+E.targets(x),0),totalCarries=peers.reduce((a,[pid,x])=>{const pp=String(textFirst(x,'position','pos')||pool.get(String(pid))?.position||status.get(String(pid))?.position||'').toUpperCase();return a+(pp==='RB'?E.carries(x):0)},0),totalRz=peers.reduce((a,[,x])=>a+E.rz(x),0);
  const snap=E.snapPct(row),targets=E.targets(row),carries=E.carries(row),rz=E.rz(row);
  const targetShare=totalTargets>0?targets/totalTargets:null,rushShare=totalCarries>0?carries/totalCarries:null,rzShare=totalRz>0?rz/totalRz:null,pos=String(p.position||'').toUpperCase();
  const parts=[];
  if(pos==='WR'||pos==='TE'){
    if(snap!=null)parts.push([roleNorm(snap,.45,.90),.38]);
    if(targetShare!=null)parts.push([roleNorm(targetShare,.08,.30),.50]);
    if(rzShare!=null)parts.push([roleNorm(rzShare,0,.35),.12]);
  }else if(pos==='RB'){
    if(snap!=null)parts.push([roleNorm(snap,.30,.75),.28]);
    if(rushShare!=null)parts.push([roleNorm(rushShare,.20,.70),.42]);
    if(targetShare!=null)parts.push([roleNorm(targetShare,.02,.16),.16]);
    if(rzShare!=null)parts.push([roleNorm(rzShare,0,.50),.14]);
  }else if(pos==='QB'){
    if(snap!=null)parts.push([roleNorm(snap,.70,1),1]);
  }
  const wt=parts.reduce((a,x)=>a+x[1],0),score=wt?parts.reduce((a,[v,w])=>a+v*w,0)/wt:null;
  const confidence=Math.round(Math.min(100,55+(snap!=null?15:0)+(targetShare!=null||rushShare!=null?20:0)+(rzShare!=null?10:0)));
  const bits=[];
  if(snap!=null)bits.push(`${Math.round(snap*100)}% snaps`);
  if(pos==='RB'&&rushShare!=null)bits.push(`${Math.round(rushShare*100)}% RB carry share`);
  if(['RB','WR','TE'].includes(pos)&&targetShare!=null)bits.push(`${Math.round(targetShare*100)}% target share`);
  if(rzShare!=null&&totalRz>0)bits.push(`${Math.round(rzShare*100)}% red-zone share`);
  return {week:w,score:score==null?null:Math.round(score),confidence,snap,targetShare,rushShare,rzShare,targets,carries,rz,label:bits.join(' · ')||'Role data unavailable'};
 }
 return {week:null,score:null,confidence:0,snap:null,targetShare:null,rushShare:null,rzShare:null,label:'Role data unavailable'}
}
function availabilityRisk(injury,newsCtx){
 const st=String(injury||'').toLowerCase();
 if(/(^|\b)(out|ir|pup|na|dnr|sus|suspended)(\b|$)/.test(st))return 1;
 if(/doubtful/.test(st))return newsCtx?.directState==='positive'?.20:.34;
 if(/questionable/.test(st)){
  if(newsCtx?.directState==='positive')return .03;
  if(['doubtful','out'].includes(newsCtx?.directState))return .16;
  return .08;
 }
 if(/limited|dnp|did not practice/.test(st))return newsCtx?.directState==='positive'?.02:.06;
 return newsCtx?.directState==='doubtful'?.12:newsCtx?.directState==='questionable'?.05:0;
}
function confidence(g){return g?.confidence??0}

function textFirst(o,...keys){for(const k of keys)if(o&&o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]);return ''}
function statRows(data){
 const out=[];
 if(Array.isArray(data)){for(const row of data||[]){const id=String(row?.player_id||row?.player?.player_id||'');if(id)out.push({id,row,stats:row?.stats||row})}}
 else if(data&&typeof data==='object'){for(const [id,row] of Object.entries(data)){if(!id.startsWith('TEAM_'))out.push({id:String(id),row,stats:row?.stats||row})}}
 return out
}
function historicalTeam(entry){return normTeam(textFirst(entry.row,'team','tm','team_abbr')||entry.row?.player?.team||textFirst(entry.stats,'team','tm','team_abbr'))}
function historicalPos(entry){return String(textFirst(entry.row,'position','pos')||entry.row?.player?.position||textFirst(entry.stats,'position','pos')||pool.get(entry.id)?.position||status.get(entry.id)?.position||'').toUpperCase()}
async function scheduleFor(season,w){
 const key=`${season}:${w}`;if(scheduleCache.has(key))return scheduleCache.get(key);
 let data=null;
 for(const url of [`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${w}`,`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?season=${season}&seasontype=2&week=${w}`]){
  try{const r=await fetch(url,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
 }
 const map=new Map();
 for(const ev of data?.events||[]){const c=ev?.competitions?.[0],teams=c?.competitors||[];if(teams.length<2)continue;for(const a of teams){const b=teams.find(x=>x!==a),team=normTeam(a?.team?.abbreviation),opp=normTeam(b?.team?.abbreviation);if(team&&opp)map.set(team,{opp})}}
 scheduleCache.set(key,map);return map
}
function defenseMetrics(pos,s){
 const base={ppr:E.fantasyPoints(s,'ppr'),half:E.fantasyPoints(s,'half'),std:E.fantasyPoints(s,'standard')};
 if(pos==='QB')return {...base,yards:E.num(E.first(s,'pass_yd')),td:E.num(E.first(s,'pass_td'))};
 if(pos==='RB')return {...base,yards:E.num(E.first(s,'rush_yd')),td:E.num(E.first(s,'rush_td'))};
 return {...base,yards:E.num(E.first(s,'rec_yd')),td:E.num(E.first(s,'rec_td'))}
}
function matchupCacheKey(season,through){return `wh_start_sit_matchup_v3::${season}::${through}`}
function readMatchupCache(season,through){
 try{const x=JSON.parse(localStorage.getItem(matchupCacheKey(season,through))||'null');return x?.table?x:null}catch(_){return null}
}
async function buildMatchupReference(season,through){
 const cached=readMatchupCache(season,through);if(cached)return cached;
 const table={},positions=['QB','RB','WR','TE'];let attributed=0,skipped=0;
 const packs=await Promise.all(Array.from({length:through},async(_,i)=>{const w=i+1;const [sched,stats]=await Promise.all([scheduleFor(season,w),weekStats(season,w)]);return {sched,stats}}));
 const bucket=(team,pos)=>{table[team]??={};table[team][pos]??={games:0,totals:{ppr:0,half:0,std:0,yards:0,td:0},avg:{},ranks:{}};return table[team][pos]};
 for(const {sched,stats} of packs){
  for(const team of sched.keys())for(const pos of positions)bucket(team,pos).games++;
  for(const entry of statRows(Object.fromEntries(stats))){
   const pos=historicalPos(entry);if(!positions.includes(pos))continue;
   const team=historicalTeam(entry),game=sched.get(team);if(!team||!game?.opp){skipped++;continue}
   attributed++;
   const b=bucket(game.opp,pos),m=defenseMetrics(pos,entry.stats);b.totals.ppr+=m.ppr;b.totals.half+=m.half;b.totals.std+=m.std;b.totals.yards+=m.yards;b.totals.td+=m.td
  }
 }
 for(const byPos of Object.values(table))for(const b of Object.values(byPos)){b.avg.ppr=b.games?b.totals.ppr/b.games:0;b.avg.half=b.games?b.totals.half/b.games:0;b.avg.std=b.games?b.totals.std/b.games:0;b.avg.yards=b.games?b.totals.yards/b.games:0;b.avg.td=b.games?b.totals.td/b.games:0}
 for(const pos of positions)for(const metric of ['ppr','half','std','yards','td']){
  const list=Object.entries(table).filter(([,x])=>x?.[pos]?.games).map(([team,x])=>({team,value:x[pos].avg[metric]})).sort((a,b)=>a.value-b.value);
  list.forEach((x,i)=>{table[x.team][pos].ranks[metric]=i+1;table[x.team][pos].rankTotal=list.length})
 }
 const built={season,through,generatedAt:Date.now(),table,coverage:{attributed,skipped}};
 try{localStorage.setItem(matchupCacheKey(season,through),JSON.stringify(built))}catch(_){}
 return built
}
async function ensureMatchups(){
 if(!matchupCache[2025])matchupCache[2025]=await buildMatchupReference(2025,18);
 const through=Math.max(0,week-1);
 if(through&&!matchupCache[2026])matchupCache[2026]=await buildMatchupReference(2026,through);
 return matchupCache
}
function matchupPointKey(){return format==='half'?'half':format==='standard'?'std':'ppr'}
function rankScore(d){
 const total=Number(d?.rankTotal)||32,pointsKey=matchupPointKey();
 const ranks=[pointsKey,'yards','td'].map(k=>Number(d?.ranks?.[k])).filter(r=>r>0);
 if(!ranks.length||total<=1)return null;
 const avg=ranks.reduce((x,y)=>x+y,0)/ranks.length;
 return Math.round((avg-1)/(total-1)*100)
}
function matchupFor(p,game){
 if(!game?.opp)return {score:null,confidence:0,label:'No matchup data',y2025:null,y2026:null};
 const pos=p.position,opp=game.opp,d25=matchupCache[2025]?.table?.[opp]?.[pos]||null,d26=matchupCache[2026]?.table?.[opp]?.[pos]||null,s25=rankScore(d25),s26=rankScore(d26),games26=Number(d26?.games)||0;
 let w26=games26>=5?.70:games26===4?.60:games26===3?.50:games26===2?.40:games26===1?.25:0,score=null;
 if(s25!=null&&s26!=null)score=s25*(1-w26)+s26*w26;else score=s26??s25;
 const cov25=matchupCache[2025]?.coverage,coverage25=cov25&&cov25.attributed+cov25.skipped?cov25.attributed/(cov25.attributed+cov25.skipped):1;
 const cov26=matchupCache[2026]?.coverage,coverage26=cov26&&cov26.attributed+cov26.skipped?cov26.attributed/(cov26.attributed+cov26.skipped):1;
 const sourceCoverage=Math.min(coverage25,coverage26||1);
 const confidence=score==null?0:Math.round(Math.min(90,((s25!=null?46:26)+games26*8)*sourceCoverage));
 return {score:score==null?null:Math.round(score),confidence,label:score==null?'Unknown':score>=66?'Favorable':score<=34?'Tough':'Neutral',opp,y2025:d25,y2026:d26,currentWeight:w26}
}
function avgMetric(stats,fn){const a=(stats||[]).filter(E.played).map(fn).filter(v=>v!=null&&Number.isFinite(Number(v)));return a.length?E.mean(a):null}
function workload(pos,stats,limit=3){
 const played=(stats||[]).filter(E.played),a=limit?played.slice(-limit):played;
 return {
  games:a.length,snap:avgMetric(a,E.snapPct),passAtt:avgMetric(a,x=>E.first(x,'pass_att')),targets:avgMetric(a,E.targets),carries:avgMetric(a,E.carries),
  routes:avgMetric(a,E.routes),rz:avgMetric(a,E.rz),goal:avgMetric(a,E.goalLine),opps:avgMetric(a,s=>E.opportunities(pos,s)),
  ppg:avgMetric(a,s=>E.fantasyPoints(s,format))
 }
}

function latestGameStats(pos,stats){
 const row=[...(stats||[])].reverse().find(E.played);if(!row)return null;
 const rec=E.num(E.first(row,'rec','receptions')),targets=E.targets(row),carries=E.carries(row);
 return {
  fantasy:E.fantasyPoints(row,format),
  snap:E.snapPct(row),
  passAtt:E.first(row,'pass_att'),passYds:E.first(row,'pass_yd'),passTd:E.first(row,'pass_td'),
  carries,rushYds:E.first(row,'rush_yd'),rushTd:E.first(row,'rush_td'),
  targets,rec,recYds:E.first(row,'rec_yd'),recTd:E.first(row,'rec_td'),
  touches:carries+rec,routes:E.routes(row),rz:E.rz(row),goal:E.goalLine(row)
 }
}
async function grade(id){
 const p=pool.get(String(id)),current=await history(id),priorPromise=priorHistory(id),newsPromise=loadNewsFor(p),propsPromise=loadPropsFor(p),rolePromise=latestRoleContext(p,id);
 const game=games.get(normTeam(p.team))||null,prior=await priorPromise,news=await newsPromise,props=await propsPromise,latestRole=await rolePromise,custom=customMeta(id);
 const inj=injuryText(id),rank=format==='ppr'?whRank(id):null,newsCtx=newsContext(news,inj),teamCtx=teamContext(p),mu=matchupFor(p,game);
 const priorTeam=[...prior].reverse().map(s=>normTeam(textFirst(s,'team','tm','team_abbr'))).find(Boolean)||'',teamChanged=!!priorTeam&&priorTeam!==normTeam(p.team);
 const ownerProjection=custom.projection===''||custom.projection==null?null:Number(custom.projection),weeklyProjection=providerProjection(id);
 const rankWeight=slot==='SUPERFLEX'?.04:.14;
 const injuryRisk=availabilityRisk(inj,newsCtx);
 const forwardRoleScore=latestRole.score==null?(newsCtx.forwardRoleBoost?Math.max(0,Math.min(100,50+newsCtx.forwardRoleBoost)):null):Math.max(0,Math.min(100,latestRole.score+(newsCtx.forwardRoleBoost||0)));
 const forwardRoleLabel=newsCtx.forwardRoleBoost?`${latestRole.label||'Latest role'} · coach/news adjustment ${newsCtx.forwardRoleBoost>0?'+':''}${newsCtx.forwardRoleBoost}`:latestRole.label;
 const g=E.startSitScoreV2({pos:p.position,currentStats:current,priorStats:prior,format,weeklyRank:rank,injuryStatus:inj,injuryRisk,ownerProjection,providerProjection:weeklyProjection,teamChanged,latestRoleScore:forwardRoleScore,latestRoleConfidence:Math.max(latestRole.confidence||0,newsCtx.forwardRoleBoost?88:0),latestRoleLabel:forwardRoleLabel,matchupScore:mu.score,matchupConfidence:mu.confidence,environment:{gameTotal:game?.total,teamImplied:game?.teamImplied,spread:game?.spread,home:game?.home},newsAdjustment:newsCtx.adjustment,contextAdjustment:teamCtx.adjustment,locked:!!game?.locked,bye:scheduleLoaded&&!game,rankWeight});
 return {id:String(id),p,current,prior,inj,injuryRisk,rank,weeklyProjection,latestRole,forwardRoleScore,forwardRoleLabel,g,confidence:confidence(g),game,news,props,newsCtx,teamCtx,mu,teamChanged,latestGame:latestGameStats(p.position,current),currentWork:workload(p.position,current,3),seasonWork:workload(p.position,current,0),priorWork:workload(p.position,prior,3)}
}

function styles(){
 if(document.querySelector('#wh-startsit-css'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="wh-startsit-css">
#wh-startsit{--bg:#081018;--panel:#0d1720;--panel2:#101d27;--line:#203441;--text:#eef4f7;--muted:#91a3ae;--soft:#bdcad1;--gold:#e6c96f;--green:#7bd59b;--red:#e98994;--blue:#79bfe8;min-height:100vh;background:#081018;color:var(--text);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding-bottom:72px}
#wh-startsit *{box-sizing:border-box}
#wh-startsit button,#wh-startsit input{font:inherit}
#wh-startsit .top{display:flex;align-items:center;gap:12px;padding:16px clamp(18px,3vw,40px);border-bottom:1px solid #182a34;background:#081018}
#wh-startsit .brand{font-size:22px;font-weight:1000;letter-spacing:-.05em}
#wh-startsit .tag{font-size:10px;font-weight:900;letter-spacing:.08em;background:var(--gold);color:#081018;padding:6px 8px;border-radius:999px}
#wh-startsit .spacer{flex:1}
#wh-startsit .back{color:#c7d3d9;text-decoration:none;border:1px solid #2a4350;border-radius:9px;padding:8px 11px;font-size:12px;font-weight:800}
#wh-startsit .shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:34px 0 0}
#wh-startsit .intro{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;margin-bottom:22px}
#wh-startsit .eyebrow{font-size:11px;color:var(--green);letter-spacing:.12em;font-weight:900;text-transform:uppercase}
#wh-startsit .intro h1{font-size:clamp(36px,5vw,58px);line-height:1;letter-spacing:-.055em;margin:7px 0 10px}
#wh-startsit .intro p{max-width:760px;margin:0;color:#9aabb4;font-size:14px;line-height:1.6}
#wh-startsit .weekpill{border:1px solid #2a424f;background:#0b151d;border-radius:10px;padding:10px 12px;color:#a9bac3;font-size:12px;font-weight:800;white-space:nowrap}
#wh-startsit .setup{border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:16px;margin-bottom:16px}
#wh-startsit .controls{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin-bottom:14px}
#wh-startsit .control label{display:block;font-size:11px;color:#8398a4;font-weight:850;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
#wh-startsit .seg{display:flex;gap:7px;flex-wrap:wrap}
#wh-startsit .seg button{border:1px solid #2a4350;background:#09141b;color:#a4b4bd;border-radius:8px;padding:8px 11px;font-size:12px;font-weight:850;cursor:pointer}
#wh-startsit .seg button:hover{border-color:#476574;color:#d9e3e8}
#wh-startsit .seg button.active{background:#eef4f7;color:#071018;border-color:#eef4f7}
#wh-startsit .searchrow{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:10px;align-items:start}
#wh-startsit .searchbox{position:relative}
#wh-startsit .search{width:100%;border:1px solid #2a4553;border-radius:9px;background:#081219;color:#fff;padding:12px 13px;font-size:14px;outline:none}
#wh-startsit .search:focus{border-color:#54788a;box-shadow:0 0 0 3px #2e526329}
#wh-startsit .results{position:absolute;z-index:30;top:calc(100% + 5px);left:0;right:0;max-height:340px;overflow:auto;border:1px solid #2a4553;border-radius:10px;background:#09151d;box-shadow:0 18px 50px #0009;display:none}
#wh-startsit .results.open{display:block}
#wh-startsit .res{width:100%;display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;text-align:left;border:0;border-top:1px solid #172a34;background:transparent;color:#edf3f6;padding:10px 12px;cursor:pointer}
#wh-startsit .res:first-child{border-top:0}
#wh-startsit .res:hover{background:#10212b}
#wh-startsit .res img{width:38px;height:38px;border-radius:9px;object-fit:cover;object-position:center top;background:#11222c}
#wh-startsit .res b{font-size:13px}
#wh-startsit .res small{display:block;color:#8094a0;font-size:11px;margin-top:2px}
#wh-startsit .res em{font-style:normal;color:#89d9a5;font-weight:900;font-size:11px}
#wh-startsit .run{border:0;border-radius:9px;background:#eef4f7;color:#071018;padding:12px 15px;font-size:13px;font-weight:950;cursor:pointer;min-height:44px}
#wh-startsit .run:disabled{opacity:.38;cursor:not-allowed}
#wh-startsit .picked{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 0}
#wh-startsit .chip{display:flex;align-items:center;gap:8px;border:1px solid #2b4654;background:#0a1720;border-radius:9px;padding:7px 9px}
#wh-startsit .chip img{width:30px;height:30px;border-radius:7px;object-fit:cover;object-position:center top}
#wh-startsit .chip b{font-size:12px}
#wh-startsit .chip button{border:0;background:none;color:#8ba0ab;font-size:17px;cursor:pointer;padding:0 1px}
#wh-startsit .status{display:block;color:#6f8591;font-size:11px;min-height:16px;margin-top:9px}
#wh-startsit .call{margin-top:18px;border:1px solid #345846;border-left:4px solid var(--green);border-radius:13px;background:#0c1b16;padding:18px}
#wh-startsit .call.knot{border-color:#5a4f2f;border-left-color:var(--gold);background:#19160d}
#wh-startsit .call small{font-size:10px;letter-spacing:.1em;color:#8fd4a5;font-weight:900;text-transform:uppercase}
#wh-startsit .call.knot small{color:#dbc27e}
#wh-startsit .call h2{margin:6px 0 6px;font-size:26px;letter-spacing:-.035em}
#wh-startsit .call p{margin:0;color:#afbec5;font-size:13px;line-height:1.5}
#wh-startsit .drivers{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
#wh-startsit .drivers span{border:1px solid #355544;border-radius:999px;padding:5px 8px;color:#9bd4ad;font-size:11px;font-weight:800}
#wh-startsit .compare-panel{margin-top:12px;border:1px solid var(--line);border-radius:14px;background:var(--panel);overflow:hidden}
#wh-startsit .compare-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #1b303b}
#wh-startsit .compare-head h3{margin:0;font-size:15px}
#wh-startsit .compare-head span{color:#718793;font-size:11px}
#wh-startsit .matrix-wrap{overflow-x:auto}
#wh-startsit .matrix{width:100%;min-width:760px;border-collapse:collapse;table-layout:fixed}
#wh-startsit .matrix th,#wh-startsit .matrix td{border-top:1px solid #182b35;padding:12px 14px;vertical-align:middle}
#wh-startsit .matrix thead th{border-top:0;background:#0a151d}
#wh-startsit .matrix th:first-child,#wh-startsit .matrix td:first-child{width:190px;text-align:left}
#wh-startsit .matrix th:not(:first-child),#wh-startsit .matrix td:not(:first-child){text-align:center}
#wh-startsit .rowlabel strong{display:block;font-size:12px;color:#dbe5ea}
#wh-startsit .rowlabel small{display:block;font-size:10px;color:#6f8590;margin-top:3px;line-height:1.35}
#wh-startsit .playercol{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0}
#wh-startsit .playercol img{width:38px;height:38px;border-radius:9px;object-fit:cover;object-position:center top;background:#11222c}
#wh-startsit .playercol div{text-align:left;min-width:0}
#wh-startsit .playercol b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wh-startsit .playercol small{display:block;color:#778d99;font-size:10px;margin-top:2px}
#wh-startsit .val{font-size:15px;font-weight:900;color:#e8eff2}
#wh-startsit .sub{display:block;color:#708692;font-size:10px;font-weight:700;margin-top:3px;line-height:1.35}
#wh-startsit .good{color:var(--green)!important}
#wh-startsit .bad{color:var(--red)!important}
#wh-startsit .neutral{color:var(--gold)!important}
#wh-startsit .winner-cell{background:#0d1d17}
#wh-startsit .details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
#wh-startsit details.player-data{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:0 14px}
#wh-startsit details.player-data>summary{list-style:none;cursor:pointer;padding:13px 0;font-size:12px;font-weight:900;color:#c2cfd5}
#wh-startsit details.player-data>summary::-webkit-details-marker{display:none}
#wh-startsit details.player-data>summary:after{content:'+';float:right;color:#718792;font-size:16px}
#wh-startsit details.player-data[open]>summary:after{content:'−'}
#wh-startsit .detail-body{border-top:1px solid #1a2d37;padding:12px 0 14px}
#wh-startsit .detail-section{margin-top:13px}
#wh-startsit .detail-section:first-child{margin-top:0}
#wh-startsit .detail-section h4{margin:0 0 7px;font-size:10px;color:#718894;text-transform:uppercase;letter-spacing:.08em}
#wh-startsit .drow{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #142730;padding:6px 0;color:#8da0aa;font-size:11px}
#wh-startsit .drow:first-of-type{border-top:0}
#wh-startsit .drow b{color:#d1dce1;font-size:11px;text-align:right}
#wh-startsit .newsline{border-top:1px solid #142730;padding:7px 0}
#wh-startsit .newsline:first-child{border-top:0}
#wh-startsit .newsline b{display:block;color:#c4d0d6;font-size:11px;line-height:1.4}
#wh-startsit .newsline small{display:block;color:#6e8490;font-size:10px;margin-top:3px}
#wh-startsit .warning{margin-top:12px;border:1px solid #5a492f;border-radius:10px;background:#18140c;padding:11px 12px;color:#d2b980;font-size:11px;line-height:1.5}
#wh-startsit .empty{margin-top:18px;border:1px dashed #2a4350;border-radius:12px;padding:28px;text-align:center;color:#7d919c;font-size:13px}
#wh-startsit .source-note{margin-top:12px;color:#617884;font-size:10px;line-height:1.5}
@media(max-width:820px){#wh-startsit .intro{display:block}#wh-startsit .weekpill{display:inline-block;margin-top:14px}#wh-startsit .controls{grid-template-columns:1fr}#wh-startsit .details-grid{grid-template-columns:1fr}}
@media(max-width:580px){#wh-startsit .shell{width:min(100% - 20px,1180px);padding-top:24px}#wh-startsit .intro h1{font-size:40px}#wh-startsit .searchrow{grid-template-columns:1fr}#wh-startsit .run{width:100%}#wh-startsit .top{padding:13px 12px}#wh-startsit .brand{font-size:19px}#wh-startsit .tag{display:none}}
</style>`)
}
function shell(){
 document.body.innerHTML=`<div id="wh-startsit">
  <header class="top"><div class="brand">WORKHORSE</div><span class="tag">START / SIT</span><div class="spacer"></div><a class="back" href="./sandbox.html?view=tools">← Tools</a></header>
  <main class="shell">
   <section class="intro"><div><div class="eyebrow">Weekly lineup decision</div><h1>Start the right player.</h1><p>Compare 2–4 players using current-week projection, actual 2026 production, verified workload, opponent-vs-position results, injuries, news, game environment and your Workhorse ranking. Missing stats stay missing.</p></div><div class="weekpill">Week <b id="ss-week-pill">—</b> · Sandbox</div></section>
   <section class="setup"><div class="controls"><div class="control"><label>Lineup slot</label><div class="seg" id="slot-seg">${['FLEX','SUPERFLEX','QB','RB','WR','TE'].map(x=>`<button data-slot="${x}" class="${x===slot?'active':''}">${x}</button>`).join('')}</div></div><div class="control"><label>Scoring</label><div class="seg" id="format-seg">${[['ppr','PPR'],['half','Half PPR'],['standard','Standard']].map(([x,l])=>`<button data-format="${x}" class="${x===format?'active':''}">${l}</button>`).join('')}</div></div></div>
   <div class="searchrow"><div class="searchbox"><input id="ss-search" class="search" placeholder="Search players…" autocomplete="off"><div id="ss-results" class="results"></div></div><button id="ss-run" class="run" disabled>Compare</button></div><div id="ss-picked" class="picked"></div><span id="ss-status" class="status"></span></section>
   <section id="ss-output"><div class="empty">Add at least two eligible players to compare.</div></section>
  </main>
 </div>`
}
function renderSearch(){const q=token(document.querySelector('#ss-search')?.value).trim(),box=document.querySelector('#ss-results');if(!box)return;if(!q){box.classList.remove('open');box.innerHTML='';return}const picked=new Set(selected),matches=[...pool.values()].filter(p=>compatible(p)&&!picked.has(String(p.player_id))&&token(`${p.full_name} ${p.team} ${p.position}`).includes(q)).slice(0,25);box.innerHTML=matches.map(p=>`<button class="res" data-add="${esc(p.player_id)}"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(p.player_id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><span><b>${esc(p.full_name)}</b><br><small>${esc(p.position)} · ${esc(p.team||'FA')}</small></span><em>＋</em></button>`).join('')||'<div style="padding:13px;color:#758b99;font-size:9px">No eligible matches.</div>';box.classList.add('open')}
function renderPicked(){const box=document.querySelector('#ss-picked');box.innerHTML=selected.map(id=>{const p=pool.get(id);return `<div class="chip"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><b>${esc(p?.full_name||'Player')}</b><button data-remove="${esc(id)}" aria-label="Remove">×</button></div>`}).join('');document.querySelector('#ss-run').disabled=selected.length<2}
function switchSlot(next){slot=next;selected=selected.filter(id=>{const p=pool.get(id);return p&&compatible(p,next)});document.querySelectorAll('[data-slot]').forEach(b=>b.classList.toggle('active',b.dataset.slot===slot));renderPicked();renderSearch();document.querySelector('#ss-output').innerHTML='<div class="empty">Choose at least two eligible players.</div>'}
function fmt(v,d=1){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d)}
function pct(v){return v==null||!Number.isFinite(Number(v))?'—':`${Math.round(Number(v)*100)}%`}
function matchupTone(score){return score==null?'':score>=66?'good':score<=34?'bad':'neutral'}
function matchupRank(d){const a=['ppr','yards','td'].map(k=>Number(d?.ranks?.[k])).filter(v=>v>0);return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null}
function scoringName(){return format==='ppr'?'PPR':format==='half'?'Half PPR':'Standard'}
function sourceProjectionName(x){return x.weeklyProjection==null?'—':fmt(x.weeklyProjection,1)}
function statusTone(x){return x.g?.eligible===false?'bad':x.injuryRisk>=.15?'bad':x.injuryRisk>0?'neutral':''}
function playerHeader(x){const g=x.game;return `<div class="playercol"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(x.id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><div><b>${esc(x.p.full_name)}</b><small>${esc(x.p.position)} · ${esc(x.p.team||'FA')}${g?` · ${g.home?'vs':'@'} ${esc(g.opp)}`:''}</small></div></div>`}
function matrixCell(main,sub='',cls=''){return `<span class="val ${cls}">${esc(main)}</span>${sub?`<span class="sub">${esc(sub)}</span>`:''}`}

function ago(iso){
 if(!iso)return '';
 const t=new Date(iso).getTime();if(!Number.isFinite(t))return '';
 const mins=Math.max(0,Math.floor((Date.now()-t)/60000));
 if(mins<60)return `${mins}m ago`;
 const hrs=Math.floor(mins/60);if(hrs<24)return `${hrs}h ago`;
 return `${Math.floor(hrs/24)}d ago`
}
function propLabel(m){return ({rushing_yards:'Rush yds',rushing_receiving_yards:'Rush + rec yds',receiving_yards:'Rec yds',receptions:'Receptions',rushing_attempts:'Rush att',touchdown_scored:'Anytime TD'}[m]||String(m||'').replaceAll('_',' '))}
function propsCell(x){
 try{
  const a=(x.props||[]).slice(0,3);
  if(!a.length)return matrixCell('No verified line','Nothing fresh in the last 24h');
  const first=a[0],rest=a.slice(1).map(p=>`${propLabel(p.market)} ${fmt(p.line,1)}`).join(' · ');
  return matrixCell(`${propLabel(first.market)} ${fmt(first.line,1)}`,rest||`${first.source||'Verified line'} · updated ${ago(first.observed_at)}`)
 }catch(_){return matrixCell('No verified line','Prop display unavailable')}
}
function latestStatCell(x){
 const g=x.latestGame||{},p=x.p.position;
 if(p==='RB')return matrixCell(`${fmt(g.touches,0)} touches`,`${fmt(g.carries,0)} car · ${fmt(g.rushYds,0)} rush yds · ${fmt(g.rec,0)} rec · ${fmt(g.recYds,0)} rec yds`);
 if(p==='WR'||p==='TE')return matrixCell(`${fmt(g.rec,0)} rec / ${fmt(g.targets,0)} tgt`,`${fmt(g.recYds,0)} rec yds${g.recTd!=null?` · ${fmt(g.recTd,0)} TD`:''}`);
 if(p==='QB')return matrixCell(`${fmt(g.passYds,0)} pass yds`,`${fmt(g.passAtt,0)} att · ${fmt(g.passTd,0)} pass TD`);
 return matrixCell('—','No verified last-game line')
}
function roleShareCell(x){
 const r=x.latestRole||{},p=x.p.position;
 if(p==='RB')return matrixCell(r.rushShare==null?'—':pct(r.rushShare),`RB carry share · ${r.snap==null?'—':pct(r.snap)} snaps${r.targetShare!=null?` · ${pct(r.targetShare)} target share`:''}`);
 if(p==='WR'||p==='TE')return matrixCell(r.targetShare==null?'—':pct(r.targetShare),`${r.snap==null?'—':pct(r.snap)} snaps${r.rzShare!=null?` · ${pct(r.rzShare)} RZ share`:''}`);
 if(p==='QB')return matrixCell(r.snap==null?'—':pct(r.snap),'snap share');
 return matrixCell('—','')
}
function matchupYardLabel(pos){return pos==='QB'?'pass yds':pos==='RB'?'rush yds':'rec yds'}
function matchupCell(x){
 const d=x.mu?.y2026||x.mu?.y2025,source=x.mu?.y2026?'2026':'2025';
 if(!d)return matrixCell('—','No verified matchup sample');
 const pts=fmt(d.avg?.[matchupPointKey()],1),yds=fmt(d.avg?.yards,1),td=fmt(d.avg?.td,2);
 return matrixCell(`${pts} ${scoringName()} pts/G`,`${yds} ${matchupYardLabel(x.p.position)}/G · ${td} TD/G · ${source}`,matchupTone(x.mu?.score))
}
function gameCell(x){const g=x.game;if(!g)return matrixCell(scheduleLoaded?'BYE':'—',scheduleLoaded?'No game this week':'Schedule unavailable',scheduleLoaded?'bad':'');const main=g.total?`O/U ${fmt(g.total,1)}`:'Scheduled';const sub=[g.teamImplied?`team ${fmt(g.teamImplied,1)}`:'',Number.isFinite(g.spread)?`${g.spread>0?'+':''}${fmt(g.spread,1)} spread`:'' ].filter(Boolean).join(' · ');return matrixCell(main,sub)}
function roleCell(x){const r=x.g?.role||{};return matrixCell(r.label||'—',r.confidence?`${r.confidence} confidence`:'',r.direction==='up'?'good':r.direction==='down'?'bad':'')}
function matrixRows(graded){
 const rows=[
  {label:'Sleeper projection',note:'Current-week projection from Sleeper',cell:x=>matrixCell(sourceProjectionName(x),x.weeklyProjection==null?(projectionsLoaded?'Not supplied':'Projection feed unavailable'):'this week')},
  {label:'Player props',note:'Verified consensus lines observed within 24 hours',cell:propsCell},
  {label:`2026 ${scoringName()} points / game`,note:'Actual completed games',cell:x=>matrixCell(fmt(x.seasonWork?.ppg,1),`${x.seasonWork?.games||0} game${x.seasonWork?.games===1?'':'s'}`)},
  {label:'Last game',note:'Exact box-score usage, not an average',cell:latestStatCell},
  {label:'Last-game share',note:'Team opportunity share from the most recent completed game',cell:roleShareCell},
  {label:`Opponent vs ${graded.length&&graded.every(x=>x.p.position===graded[0].p.position)?graded[0].p.position:'position'}`,note:'#1 toughest · higher number = easier',cell:matchupCell},
  {label:'Game line',note:'Current team spread / total when available',cell:gameCell},
  {label:'Workhorse weekly rank',note:'Your PPR weekly board; excluded in non-PPR',cell:x=>matrixCell(x.rank?`#${x.rank}`:'—',x.rank?'current week':format==='ppr'?'not initialized':'PPR-only')},
  {label:'Role news',note:'Confirmed coach/injury context only',cell:x=>matrixCell(x.newsCtx?.forwardRoleBoost>0?'Trending up':x.newsCtx?.forwardRoleBoost<0?'Trending down':'No confirmed change',x.newsCtx?.reasons?.[0]||'No verified role-change report',x.newsCtx?.forwardRoleBoost>0?'good':x.newsCtx?.forwardRoleBoost<0?'bad':'')},
  {label:'Player status',note:'Current availability designation',cell:x=>matrixCell(x.inj||'Active',x.injuryRisk?'Availability risk applied':'',statusTone(x))}
 ];
 return rows
}
function renderMatrix(graded){const rows=matrixRows(graded);return `<section class="compare-panel"><div class="compare-head"><h3>Head-to-head</h3><span>Actual stats first · projections and model context clearly labeled</span></div><div class="matrix-wrap"><table class="matrix"><thead><tr><th></th>${graded.map(x=>`<th>${playerHeader(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td class="rowlabel"><strong>${esc(r.label)}</strong><small>${esc(r.note)}</small></td>${graded.map((x,i)=>`<td class="${i===0&&x.g?.eligible?'winner-cell':''}">${r.cell(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}
function dataRows(rows){return rows.filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`<div class="drow"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
function detailCard(x){
 const d26=x.mu?.y2026,d25=x.mu?.y2025,r26=matchupRank(d26),r25=matchupRank(d25),st=status.get(String(x.id))||{},lg=x.latestGame||{},lr=x.latestRole||{};
 const projectionRows=[['Sleeper weekly projection',x.weeklyProjection==null?'—':`${fmt(x.weeklyProjection,1)} pts`]];
 let propRows=[];try{propRows=(x.props||[]).map(p=>[propLabel(p.market),`${fmt(p.line,1)} · ${p.source||'Verified line'} · ${ago(p.observed_at)}`])}catch(_){propRows=[]}
 const lastRows=x.p.position==='RB'
  ?[['Fantasy points',fmt(lg.fantasy,1)],['Touches',fmt(lg.touches,0)],['Carries',fmt(lg.carries,0)],['Rushing yards',fmt(lg.rushYds,0)],['Receptions / targets',`${fmt(lg.rec,0)} / ${fmt(lg.targets,0)}`],['Receiving yards',fmt(lg.recYds,0)],['Snap share',pct(lg.snap)],['Team rush share',pct(lr.rushShare)],['Team target share',pct(lr.targetShare)],['Red-zone share',pct(lr.rzShare)]]
  :x.p.position==='WR'||x.p.position==='TE'
   ?[['Fantasy points',fmt(lg.fantasy,1)],['Receptions / targets',`${fmt(lg.rec,0)} / ${fmt(lg.targets,0)}`],['Receiving yards',fmt(lg.recYds,0)],['Receiving TD',fmt(lg.recTd,0)],['Snap share',pct(lg.snap)],['Team target share',pct(lr.targetShare)],['Red-zone share',pct(lr.rzShare)],['Routes',fmt(lg.routes,0)]]
   :[['Fantasy points',fmt(lg.fantasy,1)],['Pass attempts',fmt(lg.passAtt,0)],['Passing yards',fmt(lg.passYds,0)],['Passing TD',fmt(lg.passTd,0)],['Snap share',pct(lg.snap)]];
 const matchupRows=[
  ['Opponent',x.game?.opp||'—'],
  ['2026 matchup rank',r26?`#${r26} (combined pts/yds/TD)`:'—'],
  [`2026 ${scoringName()} points allowed / G`,d26?fmt(d26.avg?.[matchupPointKey()],1):'—'],
  [`2026 ${matchupYardLabel(x.p.position)} allowed / G`,d26?fmt(d26.avg?.yards,1):'—'],
  ['2026 TD allowed / G',d26?fmt(d26.avg?.td,2):'—'],
  ['2026 sample',d26?.games?`${d26.games} game${d26.games===1?'':'s'}`:'—'],
  ['2025 matchup rank',r25?`#${r25} (combined pts/yds/TD)`:'—'],
  [`2025 ${scoringName()} points allowed / G`,d25?fmt(d25.avg?.[matchupPointKey()],1):'—'],
  [`2025 ${matchupYardLabel(x.p.position)} allowed / G`,d25?fmt(d25.avg?.yards,1):'—'],
  ['2025 TD allowed / G',d25?fmt(d25.avg?.td,2):'—']
 ];
 const gameRows=[['Status',x.inj||'Active'],['Status updated',st.updated_at?new Date(st.updated_at).toLocaleString():'—'],['Game',x.game?`${x.game.home?'vs':'@'} ${x.game.opp}`:(scheduleLoaded?'BYE':'—')],['Game total',x.game?.total?fmt(x.game.total,1):'—'],['Team implied points',x.game?.teamImplied?fmt(x.game.teamImplied,1):'—'],['Spread',Number.isFinite(x.game?.spread)?`${x.game.spread>0?'+':''}${fmt(x.game.spread,1)}`:'—']];
 const news=(x.news||[]).filter(n=>!(Array.isArray(n.categories)&&n.categories.includes('trending'))).slice(0,4);
 return `<details class="player-data"><summary>${esc(x.p.full_name)} · supporting data</summary><div class="detail-body"><div class="detail-section"><h4>Current week</h4>${dataRows(projectionRows)}${propRows.length?dataRows(propRows):'<div class="drow"><span>Verified player props</span><b>—</b></div>'}</div><div class="detail-section"><h4>Last game — exact</h4>${dataRows(lastRows)}</div><div class="detail-section"><h4>Matchup — actual allowed stats</h4>${dataRows(matchupRows)}</div><div class="detail-section"><h4>Game & availability</h4>${dataRows(gameRows)}</div><div class="detail-section"><h4>Recent news</h4>${news.length?news.map(n=>`<div class="newsline"><b>${esc(n.headline||'Player update')}</b><small>${esc(n.provider||'Source')} · ${esc(n.published_at?new Date(n.published_at).toLocaleString():'')}</small></div>`).join(''):'<div class="drow"><span>No recent matched player news</span><b>—</b></div>'}</div></div></details>`
}
function renderDetails(graded){return `<div class="details-grid">${graded.map(detailCard).join('')}</div>`}

function edgeLabel(a,b){
 if(!a||a.g?.score==null)return 'Not enough data';
 if(!b||b.g?.score==null)return 'Data edge';
 const d=a.g.score-b.g.score,low=Math.min(a.confidence,b.confidence);
 const roleDiff=(a.latestRole?.score??50)-(b.latestRole?.score??50);
 const newsDiff=(a.newsCtx?.adjustment||0)-(b.newsCtx?.adjustment||0);
 const projDiff=(a.g?.projection?.points??0)-(b.g?.projection?.points??0);
 const structural=roleDiff>=20&&newsDiff>=1.25&&projDiff>=-2;
 if(d>=10)return 'Clear edge';
 if(structural&&d>=4)return 'Clear role edge';
 if(d>=6)return low<48?'Lean · limited confidence':'Lean';
 if(structural)return 'Lean · strong role signal';
 if(d<3.5)return low<55?'Toss-up · limited confidence':'Toss-up';
 return 'Slight edge'
}
function callout(a,b){
 if(!a)return '<div class="warning">None of the selected players is currently a valid lineup option. Bye, unavailable and already-started players are excluded.</div>';
 if(!b)return `<div class="call"><small>Only actionable option</small><h2>Start ${esc(a.p.full_name)}</h2><p>${esc(a.p.full_name)} is the only selected player currently eligible for this lineup slot.</p></div>`;
 const edge=edgeLabel(a,b),toss=edge.startsWith('Toss'),drivers=[],ca=a.g.components||{},cb=b.g.components||{},labels={projection:'Projection',role:'Latest role',usage:'Verified usage',rank:'Workhorse rank',matchup:'Matchup',environment:'Game environment'};
 for(const k of Object.keys(labels))if(ca[k]!=null&&cb[k]!=null&&ca[k]-cb[k]>=7)drivers.push(labels[k]);
 if((a.newsCtx?.adjustment||0)>(b.newsCtx?.adjustment||0)+1.5)drivers.push(a.newsCtx?.indirect?'Teammate injury opportunity':'News / availability');
 if((a.teamCtx?.adjustment||0)>(b.teamCtx?.adjustment||0)+1.5)drivers.push('Team / QB context');
 const cls=toss?'call knot':'call',headline=toss?'Too close to force':`Start ${esc(a.p.full_name)}`,copy=toss?`${esc(a.p.full_name)} has the small model edge, but the evidence gap is not strong enough for a confident call.`:`${esc(a.p.full_name)} has the stronger current-week profile over ${esc(b.p.full_name)}.`;
 return `<div class="${cls}"><small>${esc(edge)}</small><h2>${headline}</h2><p>${copy}</p>${drivers.length?`<div class="drivers">${[...new Set(drivers)].slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div>`
}
async function compare(){
 const btn=document.querySelector('#ss-run'),st=document.querySelector('#ss-status');btn.disabled=true;st.textContent='Checking projections, stats, matchup and news…';
 try{
  await ensureMatchups();
  const graded=await Promise.all(selected.map(grade));
  graded.sort((a,b)=>{const ae=!!a.g?.eligible&&!a.g?.locked,be=!!b.g?.eligible&&!b.g?.locked;if(ae!==be)return ae?-1:1;return (b.g?.score??-1)-(a.g?.score??-1)});
  const valid=graded.filter(x=>x.g?.eligible&&!x.g?.locked&&x.g?.score!=null),a=valid[0],b=valid[1];
  const warnings=[];
  if(!projectionsLoaded)warnings.push('Sleeper weekly projections could not be verified, so Workhorse excluded them instead of substituting another source.');
  else if(graded.some(x=>x.g?.eligible&&x.weeklyProjection==null))warnings.push('Sleeper did not supply a weekly projection for at least one selected player. That field is excluded for that player.');
  if(!scheduleLoaded)warnings.push('The current ESPN schedule could not be verified, so opponent, matchup and game-environment inputs were excluded instead of guessed.');
  if(format==='ppr'&&!load(`wh_week_master_v3::${week}`,[]).length)warnings.push('Workhorse weekly rank is not initialized in this browser, so rank is excluded instead of being replaced with Sleeper ADP.');
  if(graded.some(x=>x.g?.eligible&&x.confidence<48))warnings.push('At least one eligible player has limited evidence coverage. Confidence is reduced rather than filling missing stats with estimates.');
  if(graded.some(x=>x.mu?.y2026&&Number(x.mu.y2026.games)<2))warnings.push('At least one 2026 opponent-vs-position sample is only one game; 2025 still carries most of that matchup context.');
  document.querySelector('#ss-output').innerHTML=callout(a,b)+renderMatrix(graded)+renderDetails(graded)+(warnings.length?`<div class="warning">${warnings.map(esc).join('<br>')}</div>`:'')+`<div class="source-note">Actual stats: Sleeper completed-week data. Weekly projection: Sleeper current-week projection when supplied. Player props: verified consensus lines stored with source and observation time; lines older than 24 hours are hidden. Matchup: actual opponent-vs-position results. Schedule/game odds: ESPN. News/status: Workhorse feed + Sleeper status. Missing fields are shown as — and are not backfilled with guesses.</div>`;
  st.textContent=`Week ${week} · ${scoringName()} · ${valid.length} actionable`;
 }catch(e){console.error(e);document.querySelector('#ss-output').innerHTML='<div class="warning">Workhorse could not verify enough current data to complete this comparison. No recommendation was forced.</div>';st.textContent='Unavailable'}
 finally{btn.disabled=selected.length<2}
}
function bind(){document.querySelector('#ss-search').oninput=renderSearch;document.querySelector('#ss-results').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||selected.length>=4)return;selected.push(String(b.dataset.add));document.querySelector('#ss-search').value='';document.querySelector('#ss-results').classList.remove('open');renderPicked()};document.querySelector('#ss-picked').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected=selected.filter(x=>x!==String(b.dataset.remove));renderPicked()};document.querySelector('#slot-seg').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)switchSlot(b.dataset.slot)};document.querySelector('#format-seg').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===b))};document.querySelector('#ss-run').onclick=compare;document.addEventListener('click',e=>{if(!e.target.closest('.searchbox'))document.querySelector('#ss-results')?.classList.remove('open')})}
async function start(){styles();shell();bind();const st=document.querySelector('#ss-status');st.textContent='Loading current data…';try{await currentWeek();document.querySelector('#ss-week-pill').textContent=week;await Promise.all([loadPool(),loadStatus(),loadGames(),loadProjections()]);st.textContent=`Week ${week}`;renderPicked()}catch(e){console.error(e);st.textContent='Player data unavailable';document.querySelector('#ss-output').innerHTML='<div class="warning">Current player data could not be loaded. Workhorse will not guess.</div>'}}
start();
})();

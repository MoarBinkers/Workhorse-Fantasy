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
  const u=`${SB}/functions/v1/get-player-props?player=${encodeURIComponent(p.full_name||'')}&position=${encodeURIComponent(p.position||'')}&season=${SEASON}&week=${week}`;
  const r=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const j=await r.json();if(Array.isArray(j?.props))rows.push(...j.props)}
 }catch(_){}
 try{
  const pk=encodeURIComponent(playerKey(p));
  const r=await fetch(`${SB}/rest/v1/player_prop_lines?select=market,line,over_odds,under_odds,source,source_url,observed_at&season=eq.${SEASON}&week=eq.${week}&player_key=eq.${pk}&order=observed_at.desc&limit=20`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const cached=await r.json();if(Array.isArray(cached))rows.push(...cached)}
 }catch(_){}
 const now=Date.now(),seen=new Set(),fresh=[];
 for(const x of rows){
  const age=(now-new Date(x.observed_at||0).getTime())/36e5;
  if(!Number.isFinite(age)||age>24||!Number.isFinite(Number(x.line)))continue;
  if(seen.has(x.market))continue;
  seen.add(x.market);fresh.push(x)
 }
 propsCache.set(k,fresh);return fresh
}
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
 for(const ev of data?.events||[]){
  const c=ev?.competitions?.[0],teams=c?.competitors||[];if(teams.length<2)continue;
  const state=String(ev?.status?.type?.state||'').toLowerCase();
  const completed=ev?.status?.type?.completed===true||state==='post'||season<SEASON||(season===SEASON&&w<week);
  for(const a of teams){
   const b=teams.find(x=>x!==a),team=normTeam(a?.team?.abbreviation),opp=normTeam(b?.team?.abbreviation);
   if(team&&opp)map.set(team,{opp,completed})
  }
 }
 scheduleCache.set(key,map);return map
}
function matchupFantasyPoints(s,format='ppr'){
 const rec=E.num(E.first(s,'rec','receptions')),recMult=format==='ppr'?1:format==='half'?.5:0;
 return E.num(E.first(s,'pass_yd'))*.04+E.num(E.first(s,'pass_td'))*4-E.num(E.first(s,'pass_int'))+
  E.num(E.first(s,'rush_yd'))*.1+E.num(E.first(s,'rush_td'))*6+
  rec*recMult+E.num(E.first(s,'rec_yd'))*.1+E.num(E.first(s,'rec_td'))*6+
  2*(E.num(E.first(s,'pass_2pt'))+E.num(E.first(s,'rush_2pt'))+E.num(E.first(s,'rec_2pt')))-
  2*E.num(E.first(s,'fum_lost'))
}
function defenseMetrics(pos,s){
 const targets=E.targets(s),receptions=E.num(E.first(s,'rec','receptions')),carries=E.carries(s);
 const passAtt=E.num(E.first(s,'pass_att')),passYds=E.num(E.first(s,'pass_yd')),passTd=E.num(E.first(s,'pass_td'));
 const rushYds=E.num(E.first(s,'rush_yd')),rushTd=E.num(E.first(s,'rush_td'));
 const recYds=E.num(E.first(s,'rec_yd')),recTd=E.num(E.first(s,'rec_td'));
 const base={ppr:matchupFantasyPoints(s,'ppr'),half:matchupFantasyPoints(s,'half'),std:matchupFantasyPoints(s,'standard'),
  targets,receptions,carries,passAtt,passYds,passTd,rushYds,rushTd,recYds,recTd};
 if(pos==='QB')return {...base,yards:passYds,td:passTd};
 if(pos==='RB')return {...base,yards:rushYds,td:rushTd};
 return {...base,yards:recYds,td:recTd}
}
function matchupCacheKey(season,through){return `wh_start_sit_matchup_v4::${season}::${through}`}
function readMatchupCache(season,through){
 try{const x=JSON.parse(localStorage.getItem(matchupCacheKey(season,through))||'null');return x?.table?x:null}catch(_){return null}
}
async function buildMatchupReference(season,through){
 const cached=readMatchupCache(season,through);if(cached?.method==='raw-box-score-v3')return cached;
 const table={},positions=['QB','RB','WR','TE'];let attributed=0,skipped=0;
 const keys=['ppr','half','std','yards','td','targets','receptions','carries','passAtt','passYds','passTd','rushYds','rushTd','recYds','recTd'];
 const packs=await Promise.all(Array.from({length:through},async(_,i)=>{const w=i+1;const [sched,stats]=await Promise.all([scheduleFor(season,w),weekStats(season,w)]);return {sched,stats}}));
 const bucket=(team,pos)=>{table[team]??={};table[team][pos]??={games:0,totals:Object.fromEntries(keys.map(k=>[k,0])),avg:{},ranks:{}};return table[team][pos]};
 for(const {sched,stats} of packs){
  for(const [team,g] of sched.entries())if(g?.completed!==false)for(const pos of positions)bucket(team,pos).games++;
  for(const entry of statRows(Object.fromEntries(stats))){
   const pos=historicalPos(entry);if(!positions.includes(pos))continue;
   const team=historicalTeam(entry),game=sched.get(team);if(!team||!game?.opp||game.completed===false){skipped++;continue}
   attributed++;
   const b=bucket(game.opp,pos),m=defenseMetrics(pos,entry.stats);
   for(const k of keys)b.totals[k]+=Number(m[k])||0
  }
 }
 for(const byPos of Object.values(table))for(const b of Object.values(byPos))for(const k of keys)b.avg[k]=b.games?b.totals[k]/b.games:0;
 for(const pos of positions)for(const metric of ['ppr','half','std','yards','td']){
  const list=Object.entries(table).filter(([,x])=>x?.[pos]?.games).map(([team,x])=>({team,value:x[pos].avg[metric]})).sort((a,b)=>a.value-b.value);
  list.forEach((x,i)=>{table[x.team][pos].ranks[metric]=i+1;table[x.team][pos].rankTotal=list.length})
 }
 const built={season,through,generatedAt:Date.now(),table,coverage:{attributed,skipped},method:'raw-box-score-v3'};
 try{localStorage.setItem(matchupCacheKey(season,through),JSON.stringify(built))}catch(_){}
 return built
}
async function ensureMatchups(){
 const through=Math.max(0,week-1);
 try{if(!matchupCache[2025])matchupCache[2025]=await buildMatchupReference(2025,18)}catch(e){console.warn('2025 matchup unavailable',e);matchupCache[2025]=null}
 try{if(through&&!matchupCache[2026])matchupCache[2026]=await buildMatchupReference(2026,through)}catch(e){console.warn('2026 matchup unavailable',e);matchupCache[2026]=null}
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
 const pos=p.position,opp=game.opp,d25=matchupCache[2025]?.table?.[opp]?.[pos]||null,d26=matchupCache[2026]?.table?.[opp]?.[pos]||null;
 const s25=rankScore(d25),s26=rankScore(d26),games26=Number(d26?.games)||0;
 let w26=games26>=5?.70:games26===4?.60:games26===3?.50:games26===2?.40:games26===1?.25:0,score=null;
 if(s25!=null&&s26!=null)score=s25*(1-w26)+s26*w26;else score=s26??s25;
 const cov25=matchupCache[2025]?.coverage,coverage25=cov25&&cov25.attributed+cov25.skipped?cov25.attributed/(cov25.attributed+cov25.skipped):1;
 const cov26=matchupCache[2026]?.coverage,coverage26=cov26&&cov26.attributed+cov26.skipped?cov26.attributed/(cov26.attributed+cov26.skipped):1;
 const sourceCoverage=Math.min(coverage25,coverage26||1);
 const confidence=score==null?0:Math.round(Math.min(90,((s25!=null?52:26)+games26*8)*sourceCoverage));
 return {score:score==null?null:Math.round(score),confidence,label:score==null?'Unknown':score>=66?'Favorable':score<=34?'Tough':'Neutral',opp,y2025:d25,y2026:d26,currentWeight:w26}
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
  const totalTargets=peers.reduce((a,[,x])=>a+E.targets(x),0);
  const teamPassAttempts=peers.reduce((a,[,x])=>a+E.num(E.first(x,'pass_att')),0);
  const teamSacks=peers.reduce((a,[,x])=>a+E.num(E.first(x,'pass_sack','sacks')),0);
  const teamDropbacks=teamPassAttempts+teamSacks;
  const totalCarries=peers.reduce((a,[pid,x])=>{
   const pp=String(textFirst(x,'position','pos')||pool.get(String(pid))?.position||status.get(String(pid))?.position||'').toUpperCase();
   return a+(pp==='RB'?E.carries(x):0)
  },0);
  const totalRz=peers.reduce((a,[,x])=>a+E.rz(x),0);
  const snap=E.snapPct(row),targets=E.targets(row),carries=E.carries(row),rz=E.rz(row),routes=E.routes(row);
  const targetShare=teamPassAttempts>0?targets/teamPassAttempts:null;
  const targetDistribution=totalTargets>0?targets/totalTargets:null;
  const routeParticipation=routes>0&&teamDropbacks>0?Math.min(1,routes/teamDropbacks):null;
  const targetsPerRoute=routes>0?targets/routes:null;
  const rushShare=totalCarries>0?carries/totalCarries:null;
  const rzShare=totalRz>0?rz/totalRz:null;
  const pos=String(p.position||'').toUpperCase(),parts=[];
  if(pos==='WR'||pos==='TE'){
   if(targetShare!=null)parts.push([roleNorm(targetShare,.08,.30),.55]);
   if(routeParticipation!=null)parts.push([roleNorm(routeParticipation,.55,.95),.20]);
   if(targetsPerRoute!=null)parts.push([roleNorm(targetsPerRoute,.08,.28),.12]);
   if(snap!=null)parts.push([roleNorm(snap,.45,.90),.08]);
   if(rzShare!=null)parts.push([roleNorm(rzShare,0,.35),.05]);
  }else if(pos==='RB'){
   if(rushShare!=null)parts.push([roleNorm(rushShare,.20,.70),.44]);
   if(snap!=null)parts.push([roleNorm(snap,.30,.75),.24]);
   if(targetShare!=null)parts.push([roleNorm(targetShare,.02,.16),.18]);
   if(rzShare!=null)parts.push([roleNorm(rzShare,0,.50),.14]);
  }else if(pos==='QB'){
   if(snap!=null)parts.push([roleNorm(snap,.70,1),1]);
  }
  const wt=parts.reduce((a,x)=>a+x[1],0),score=wt?parts.reduce((a,[v,w])=>a+v*w,0)/wt:null;
  const confidence=Math.round(Math.min(100,50+(targetShare!=null||rushShare!=null?30:0)+(routes>0?5:0)+(snap!=null?10:0)+(rzShare!=null?5:0)));
  const bits=[];
  if(pos==='RB'&&rushShare!=null)bits.push(`${Math.round(rushShare*100)}% RB carry share`);
  if(['RB','WR','TE'].includes(pos)&&targetShare!=null)bits.push(`${Math.round(targetShare*100)}% target share`);
  if(snap!=null)bits.push(`${Math.round(snap*100)}% snaps`);
  return {week:w,score:score==null?null:Math.round(score),confidence,snap,targetShare,targetDistribution,routeParticipation,targetsPerRoute,rushShare,rzShare,targets,carries,routes,rz,totalTargets,totalCarries,teamPassAttempts,teamDropbacks,label:bits.join(' · ')||'Role data unavailable'};
 }
 return {week:null,score:null,confidence:0,snap:null,targetShare:null,targetDistribution:null,routeParticipation:null,targetsPerRoute:null,rushShare:null,rzShare:null,totalTargets:null,totalCarries:null,teamPassAttempts:null,teamDropbacks:null,label:'Role data unavailable'}
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
  targets,rec,recYds:E.first(row,'rec_yd'),recTd:E.first(row,'rec_td'),airYds:E.first(row,'rec_air_yd','air_yd'),
  touches:carries+rec,routes:E.routes(row),rz:E.rz(row),goal:E.goalLine(row)
 }
}
async function grade(id){
 const p=pool.get(String(id));if(!p)throw new Error('Selected player missing from pool');
 let current=[],prior=[],news=[],props=[],latestRole={week:null,score:null,confidence:0,label:'Role data unavailable'};
 try{current=await history(id)}catch(e){console.warn('history unavailable',id,e)}
 try{prior=await priorHistory(id)}catch(e){console.warn('prior history unavailable',id,e)}
 try{news=await loadNewsFor(p)}catch(e){console.warn('news unavailable',id,e)}
 try{props=await loadPropsFor(p)}catch(e){console.warn('props unavailable',id,e)}
 try{latestRole=await latestRoleContext(p,id)}catch(e){console.warn('role unavailable',id,e)}
 const game=games.get(normTeam(p.team))||null,custom=customMeta(id);
 const inj=injuryText(id),rank=format==='ppr'?whRank(id):null,newsCtx=newsContext(news,inj),teamCtx=teamContext(p);
 let mu={score:null,confidence:0,label:'No matchup data',y2025:null,y2026:null};
 try{mu=matchupFor(p,game)}catch(e){console.warn('matchup grade unavailable',id,e)}
 const priorTeam=[...prior].reverse().map(x=>normTeam(textFirst(x,'team','tm','team_abbr'))).find(Boolean)||'',teamChanged=!!priorTeam&&priorTeam!==normTeam(p.team);
 const ownerProjection=custom.projection===''||custom.projection==null?null:Number(custom.projection),weeklyProjection=providerProjection(id);
 const rankWeight=slot==='SUPERFLEX'?.04:.14,injuryRisk=availabilityRisk(inj,newsCtx);
 const forwardRoleScore=latestRole.score==null?(newsCtx.forwardRoleBoost?Math.max(0,Math.min(100,50+newsCtx.forwardRoleBoost)):null):Math.max(0,Math.min(100,latestRole.score+(newsCtx.forwardRoleBoost||0)));
 const forwardRoleLabel=newsCtx.forwardRoleBoost?`${latestRole.label||'Latest role'} · coach/news adjustment ${newsCtx.forwardRoleBoost>0?'+':''}${newsCtx.forwardRoleBoost}`:latestRole.label;
 let g=null;
 try{
  g=E.startSitScoreV2({pos:p.position,currentStats:current,priorStats:prior,format,weeklyRank:rank,injuryStatus:inj,injuryRisk,ownerProjection,providerProjection:weeklyProjection,teamChanged,latestRoleScore:forwardRoleScore,latestRoleConfidence:Math.max(latestRole.confidence||0,newsCtx.forwardRoleBoost?88:0),latestRoleLabel:forwardRoleLabel,matchupScore:mu.score,matchupConfidence:mu.confidence,environment:{gameTotal:game?.total,teamImplied:game?.teamImplied,spread:game?.spread,home:game?.home},newsAdjustment:newsCtx.adjustment,contextAdjustment:teamCtx.adjustment,locked:!!game?.locked,bye:scheduleLoaded&&!game,rankWeight})
 }catch(e){console.warn('advanced Start/Sit model unavailable',id,e)}
 if(!g||g.score==null){
  const recent=workload(p.position,current,3),fallbackPts=weeklyProjection??recent.ppg;
  const unavailable=/\b(out|ir|pup|suspended|inactive)\b/i.test(String(inj||''));
  const bye=scheduleLoaded&&!game,locked=!!game?.locked;
  const fallbackScore=fallbackPts==null?null:Math.max(0,Math.min(100,Math.round(Number(fallbackPts)*4)));
  g={score:fallbackScore,eligible:!unavailable&&!bye,locked,components:{projection:fallbackScore},projection:{points:fallbackPts,source:'core-fallback'},reasons:['Core verified data fallback']}
 }
 return {id:String(id),p,current,prior,inj,injuryRisk,rank,weeklyProjection,latestRole,forwardRoleScore,forwardRoleLabel,g,confidence:confidence(g),game,news,props,newsCtx,teamCtx,mu,teamChanged,latestGame:latestGameStats(p.position,current),currentWork:workload(p.position,current,3),seasonWork:workload(p.position,current,0),priorWork:workload(p.position,prior,3)}
}
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
  document.querySelector('#ss-output').innerHTML=callout(a,b)+renderMatrix(graded)+renderDetails(graded)+(warnings.length?`<div class="warning">${warnings.map(esc).join('<br>')}</div>`:'')+`<div class="source-note">Actual stats: Sleeper completed-week data. WR/TE target share = player targets ÷ all team player targets; target rate = player targets ÷ team pass attempts. Player props are fetched on demand from current BettingPros consensus pages, with the local cache only as fallback. 2026 matchup data is recalculated from raw box scores; 2025 PPR points allowed is externally cross-checked. Schedule/game odds: ESPN. Missing fields stay — instead of being guessed.</div>`;
  st.textContent=`Week ${week} · ${scoringName()} · ${valid.length} actionable`;
 }catch(e){console.error(e);document.querySelector('#ss-output').innerHTML='<div class="warning">Workhorse could not verify enough current data to complete this comparison. No recommendation was forced.</div>';st.textContent='Unavailable'}
 finally{btn.disabled=selected.length<2}
}
function bind(){document.querySelector('#ss-search').oninput=renderSearch;document.querySelector('#ss-results').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||selected.length>=4)return;selected.push(String(b.dataset.add));document.querySelector('#ss-search').value='';document.querySelector('#ss-results').classList.remove('open');renderPicked()};document.querySelector('#ss-picked').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected=selected.filter(x=>x!==String(b.dataset.remove));renderPicked()};document.querySelector('#slot-seg').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)switchSlot(b.dataset.slot)};document.querySelector('#format-seg').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===b))};document.querySelector('#ss-run').onclick=compare;document.addEventListener('click',e=>{if(!e.target.closest('.searchbox'))document.querySelector('#ss-results')?.classList.remove('open')})}
async function start(){styles();shell();bind();const st=document.querySelector('#ss-status');st.textContent='Loading current data…';try{await currentWeek();document.querySelector('#ss-week-pill').textContent=week;await Promise.all([loadPool(),loadStatus(),loadGames(),loadProjections()]);st.textContent=`Week ${week}`;renderPicked()}catch(e){console.error(e);st.textContent='Player data unavailable';document.querySelector('#ss-output').innerHTML='<div class="warning">Current player data could not be loaded. Workhorse will not guess.</div>'}}
start();
})();

(()=>{
'use strict';
if(window.__WH_START_SIT_V1__)return;window.__WH_START_SIT_V1__=true;
const E=window.WorkhorseDecisionEngine;if(!E){document.body.innerHTML='<div style="padding:40px;color:white">Workhorse decision engine could not load.</div>';return}
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co',KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k',SEASON=2026;
const qs=new URLSearchParams(location.search);let week=Math.min(18,Math.max(0,Number(qs.get('week')||0)||0)),weekSource=week?'url':'unresolved',format='ppr',slot='FLEX',selected=[];
const pool=new Map(),status=new Map(),weeks=new Map(),games=new Map(),projections=new Map(),verifiedUsage=new Map(),verifiedProjections=new Map(),playerBundleCache=new Map(),newsCache=new Map(),propsCache=new Map(),teamStatus=new Map(),scheduleCache=new Map(),matchupCache={2025:null,2026:null};let scheduleLoaded=false,projectionsLoaded=false;
const VERIFIED_FALLBACKS={
 '9754':{
  usage:{season:2026,week:1,player_id:'9754',player_name:'Quentin Johnston',team:'LAC',position:'WR',snap_pct:78.4,routes:26,route_pct:74.3,route_pct_available:true,targets:6,target_share_pct:22.2,team_targets:27,receptions:2,receiving_yards:17,receiving_td:0,carries:0,rushing_yards:0,rushing_td:0,touches:2,total_yards:17,air_yards:39,adot:6.5,team_pass_attempts:27,source:'PlayerProfiler Week 1 verified usage'},
  projection:{season:2026,week:2,player_id:'9754',ppr_points:10.0,source:'Stat Pick Week 2'},
  props:[
   {market:'receptions',label:'Receptions',line:3.5,over_odds:-162,under_odds:122,source:'Stat Pick Week 2',source_url:'https://www.statpick.ai/start-sit/compare/quentin-johnston-vs-rome-odunze',observed_at:'2026-09-18T21:45:00Z'},
   {market:'receiving_yards',label:'Rec yds',line:50.5,over_odds:-114,under_odds:-110,source:'Stat Pick Week 2',source_url:'https://www.statpick.ai/start-sit/compare/quentin-johnston-vs-rome-odunze',observed_at:'2026-09-18T21:45:00Z'},
   {market:'anytime_touchdown',label:'Anytime TD',line:.5,over_odds:130,under_odds:null,source:'Stat Pick Week 2',source_url:'https://www.statpick.ai/start-sit/compare/quentin-johnston-vs-rome-odunze',observed_at:'2026-09-18T21:45:00Z'}
  ]
 },
 '13286':{
  usage:{season:2026,week:1,player_id:'13286',player_name:'Jadarian Price',team:'SEA',position:'RB',snap_pct:48.0,routes:11,route_pct:40.7,route_pct_available:true,targets:2,target_share_pct:8.3,team_targets:24,receptions:2,receiving_yards:6,receiving_td:0,carries:10,rushing_yards:52,rushing_td:0,touches:12,total_yards:58,rb_carry_share_pct:45.5,team_rb_carries:22,team_pass_attempts:24,source:'FantasyPros + Fantasy Points Week 1 verified usage'},
  projection:{season:2026,week:2,player_id:'13286',ppr_points:13.2,source:'Stat Pick Week 2'},
  props:[
   {market:'rushing_yards',label:'Rush yds',line:60.5,over_odds:-113,under_odds:-111,source:'Stat Pick Week 2',source_url:'https://www.statpick.ai/start-sit/compare/jadarian-price-vs-jacory-croskey-merritt',observed_at:'2026-09-18T21:45:00Z'},
   {market:'anytime_touchdown',label:'Anytime TD',line:.5,over_odds:140,under_odds:null,source:'Stat Pick Week 2',source_url:'https://www.statpick.ai/start-sit/compare/jadarian-price-vs-jacory-croskey-merritt',observed_at:'2026-09-18T21:45:00Z'}
  ]
 }
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normTeam=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const compatible=(p,s=slot)=>s==='SUPERFLEX'?['QB','RB','WR','TE'].includes(p.position):s==='FLEX'?['RB','WR','TE'].includes(p.position):p.position===s;
const token=v=>String(v||'').toLowerCase();
function load(k,f=[]){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function weeklyOrder(){
 const baseline=[...pool.values()].sort((a,b)=>(Number(a.sleeper_rank)||9999)-(Number(b.sleeper_rank)||9999)).map(p=>String(p.player_id));
 const saved=load(`wh_week_master_v3::${week}`,[]);
 if(Array.isArray(saved)&&saved.length){
  const valid=new Set(baseline),seen=new Set(),ids=[];
  for(const raw of saved){const id=String(raw);if(valid.has(id)&&!seen.has(id)){seen.add(id);ids.push(id)}}
  for(const id of baseline)if(!seen.has(id))ids.push(id);
  return {ids,source:'saved+normalized'}
 }
 return {ids:baseline,source:'default'}
}
function whRank(id){const a=weeklyOrder().ids,i=a.indexOf(String(id));return i<0?null:i+1}
function calendarWeek(now=Date.now()){
 const start=Date.UTC(2026,8,9,0,0,0),n=Math.floor((now-start)/604800000)+1;
 return Math.max(1,Math.min(18,n))
}
async function currentWeek(){
 if(week)return week;
 try{
  const r=await fetch(`${SB}/functions/v1/get-nfl-state`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const x=await r.json(),w=Number(x?.week);if(Number.isFinite(w)&&w>=1&&w<=18){week=Math.round(w);weekSource='server';return week}}
 }catch(e){console.warn('Workhorse NFL state unavailable',e)}
 try{
  const r=await fetch('https://api.sleeper.app/v1/state/nfl',{cache:'no-store'});
  if(r.ok){const x=await r.json(),w=Number(x?.week);if(Number.isFinite(w)&&w>=1&&w<=18){week=Math.round(w);weekSource='sleeper-direct';return week}}
 }catch(e){console.warn('Direct Sleeper NFL state unavailable',e)}
 week=calendarWeek();weekSource='calendar-fallback';return week
}
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
 try{
  const r=await fetch(`${SB}/functions/v1/get-sleeper-week-data?type=stats&season=${season}&week=${w}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const j=await r.json();if(j?.data!=null)data=j.data}
 }catch(e){console.warn('server Sleeper stats unavailable',season,w,e)}
 if(data==null){
  for(const u of [`https://api.sleeper.com/stats/nfl/${season}/${w}?season_type=regular`,`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${w}`]){
   try{const r=await fetch(u,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
  }
 }
 const m=ingest(data);weeks.set(key,m);return m
}
async function loadProjections(){
 projections.clear();projectionsLoaded=false;
 let data=null;
 try{
  const r=await fetch(`${SB}/functions/v1/get-sleeper-week-data?type=projections&season=${SEASON}&week=${week}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const j=await r.json();if(j?.data!=null)data=j.data}
 }catch(e){console.warn('server Sleeper projections unavailable',e)}
 if(data==null){
  for(const u of [
   `https://api.sleeper.com/projections/nfl/${SEASON}/${week}?season_type=regular`,
   `https://api.sleeper.app/v1/projections/nfl/regular/${SEASON}/${week}`
  ]){
   try{const r=await fetch(u,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
  }
 }
 const m=ingest(data);
 for(const [id,row] of m.entries()){
  const hasPoints=['pts_ppr','pts_half_ppr','pts_std'].some(k=>row?.[k]!=null&&Number.isFinite(Number(row[k])));
  if(hasPoints)projections.set(String(id),row);
 }
 projectionsLoaded=true
}
async function loadStartSitPlayerBundle(p){
 const id=String(p?.player_id||'');if(!id)return null;
 if(playerBundleCache.has(id))return playerBundleCache.get(id);
 let out=null,lastErr=null;
 for(let attempt=0;attempt<2&&!out;attempt++){
  try{
   const r=await fetch(`${SB}/functions/v1/get-startsit-player-data?season=${SEASON}&week=${week}&player_id=${encodeURIComponent(id)}&attempt=${attempt+1}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
   if(!r.ok){lastErr=new Error(`player bundle HTTP ${r.status}`);continue}
   const j=await r.json();
   if(j&&!j.error)out=j;else lastErr=new Error(j?.error||'empty player bundle')
  }catch(e){lastErr=e}
 }
 if(out){
  if(out?.usage)verifiedUsage.set(id,out.usage);
  if(out?.projection)verifiedProjections.set(id,out.projection);
  if(Array.isArray(out?.props)&&out.props.length)propsCache.set(id,out.props);
 }else if(lastErr)console.warn('unified Start/Sit player data unavailable',id,lastErr);
 playerBundleCache.set(id,out);return out
}
async function loadVerifiedWeeklyData(){
 verifiedUsage.clear();verifiedProjections.clear();
 const usageWeek=Math.max(1,week-1);
 for(const [id,x] of Object.entries(VERIFIED_FALLBACKS)){
  if(x?.usage?.season===SEASON&&x?.usage?.week===usageWeek)verifiedUsage.set(id,x.usage);
  if(x?.projection?.season===SEASON&&x?.projection?.week===week)verifiedProjections.set(id,x.projection);
 }
 try{
  const r=await fetch(`${SB}/rest/v1/player_week_usage_verified?select=*&season=eq.${SEASON}&week=eq.${usageWeek}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const rows=await r.json();for(const x of rows||[])verifiedUsage.set(String(x.player_id),x)}
 }catch(e){console.warn('verified usage unavailable',e)}
 try{
  const r=await fetch(`${SB}/rest/v1/player_week_projection_verified?select=*&season=eq.${SEASON}&week=eq.${week}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const rows=await r.json();for(const x of rows||[])verifiedProjections.set(String(x.player_id),x)}
 }catch(e){console.warn('verified projections unavailable',e)}
}
function verifiedProjectionValue(id){
 const row=verifiedProjections.get(String(id));if(!row)return null;
 const key=format==='ppr'?'ppr_points':format==='half'?'half_ppr_points':'standard_points',v=Number(row[key]);
 return Number.isFinite(v)?v:null
}
function verifiedProjectionSource(id){
 const row=verifiedProjections.get(String(id));return row?.source||''
}
function verifiedUsageFor(id){return verifiedUsage.get(String(id))||null}

function providerProjection(id){
 const row=projections.get(String(id)),k=format==='ppr'?'pts_ppr':format==='half'?'pts_half_ppr':'pts_std',v=Number(row?.[k]);
 if(Number.isFinite(v))return v;
 return verifiedProjectionValue(id)
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
function storeGameRows(rows){
 games.clear();
 for(const row of rows||[]){
  const tm=normTeam(row?.team),opp=normTeam(row?.opp);if(!tm||!opp)continue;
  const state=String(row?.state||'pre'),kickoff=row?.date?Date.parse(row.date):NaN;
  const locked=state==='in'||state==='post'||(Number.isFinite(kickoff)&&kickoff<Date.now()-300000);
  games.set(tm,{opp,home:!!row.home,total:Number(row.total)||0,details:String(row.details||''),date:row.date||'',state,locked,spread:Number.isFinite(Number(row.spread))?Number(row.spread):null,teamImplied:Number.isFinite(Number(row.teamImplied))?Number(row.teamImplied):null,weather:String(row.weather||'')})
 }
 scheduleLoaded=games.size>=20;
 return scheduleLoaded
}
async function loadGames(){
 games.clear();scheduleLoaded=false;
 try{
  const r=await fetch(`${SB}/functions/v1/get-week-games?season=${SEASON}&week=${week}`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const j=await r.json();if(Array.isArray(j?.games)&&j.games.length&&storeGameRows(j.games))return}
 }catch(e){console.warn('server game feed unavailable',e)}
 try{
  const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON}&seasontype=2&week=${week}`,{cache:'no-store'});if(!r.ok)return;
  const d=await r.json(),rows=[];
  for(const ev of d?.events||[]){
   const c=ev?.competitions?.[0],teams=c?.competitors||[],odds=c?.odds?.[0]||{},state=c?.status?.type?.state||'pre';
   for(const a of teams){
    const b=teams.find(x=>x!==a),tm=normTeam(a?.team?.abbreviation),opp=normTeam(b?.team?.abbreviation);if(!tm||!opp)continue;
    const total=Number(odds?.overUnder)||0,details=odds?.details||'',spread=parseSpread(details,tm),teamImplied=total&&Number.isFinite(spread)?total/2-spread/2:null;
    rows.push({team:tm,opp,home:a?.homeAway==='home',total,details,date:ev?.date||'',state,spread,teamImplied,weather:String(c?.weather?.displayValue||ev?.weather?.displayValue||'')})
   }
  }
  storeGameRows(rows)
 }catch(e){console.warn('direct ESPN game feed unavailable',e)}
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
 const k=String(p.player_id);
 let rows=[...(propsCache.get(k)||[]),...(VERIFIED_FALLBACKS[k]?.props||[])];
 try{
  const pk=encodeURIComponent(playerKey(p));
  const r=await fetch(`${SB}/rest/v1/player_prop_lines?select=market,line,over_odds,under_odds,source,source_url,observed_at&season=eq.${SEASON}&week=eq.${week}&player_key=eq.${pk}&order=observed_at.desc&limit=20`,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const cached=await r.json();if(Array.isArray(cached))rows.push(...cached)}
 }catch(e){console.warn('verified prop cache unavailable',e)}
 try{
  const u=`${SB}/functions/v1/get-player-props?player=${encodeURIComponent(p.full_name||'')}&position=${encodeURIComponent(p.position||'')}&season=${SEASON}&week=${week}`;
  const r=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok){const j=await r.json();if(Array.isArray(j?.props))rows.push(...j.props)}
 }catch(e){console.warn('live prop feed unavailable',e)}
 const now=Date.now(),best=new Map();
 for(const x of rows){
  const age=(now-new Date(x.observed_at||0).getTime())/36e5;
  if(!Number.isFinite(age)||age>72||!Number.isFinite(Number(x.line))||!x.market)continue;
  const prev=best.get(x.market),xt=new Date(x.observed_at||0).getTime(),pt=prev?new Date(prev.observed_at||0).getTime():0;
  if(!prev||xt>=pt)best.set(x.market,x)
 }
 const fresh=[...best.values()];
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
function bundleMatchupRow(raw,pos){
 if(!raw)return null;
 const ppr=Number(raw.ppr_allowed_per_game),few=Number(raw.rank_fewest_allowed),most=Number(raw.rank_most_allowed||raw.league_rank);
 if(!Number.isFinite(ppr)&&!Number.isFinite(few)&&!Number.isFinite(most))return null;
 const leastRank=Number.isFinite(few)?few:(Number.isFinite(most)?33-most:null);
 const rushYds=Number(raw.rush_yards_allowed_per_game),recYds=Number(raw.receiving_yards_allowed_per_game),passYds=Number(raw.pass_yards_allowed_per_game);
 return {
  games:Number(raw.games)||0,
  avg:{
   ppr:Number.isFinite(ppr)?ppr:null,half:null,std:null,
   targets:Number.isFinite(Number(raw.targets_allowed_per_game))?Number(raw.targets_allowed_per_game):null,
   receptions:Number.isFinite(Number(raw.receptions_allowed_per_game))?Number(raw.receptions_allowed_per_game):null,
   carries:Number.isFinite(Number(raw.rush_attempts_allowed_per_game))?Number(raw.rush_attempts_allowed_per_game):null,
   rushYds:Number.isFinite(rushYds)?rushYds:null,recYds:Number.isFinite(recYds)?recYds:null,passYds:Number.isFinite(passYds)?passYds:null,
   passTd:Number.isFinite(Number(raw.pass_tds_allowed_per_game))?Number(raw.pass_tds_allowed_per_game):null,
   td:null,yards:pos==='RB'?(Number.isFinite(rushYds)?rushYds:null):pos==='QB'?(Number.isFinite(passYds)?passYds:null):(Number.isFinite(recYds)?recYds:null)
  },
  ranks:{ppr:leastRank},rankTotal:32,verifiedPpr:true,backend:true,source:raw.source||'Workhorse matchup data',display:raw.display||'',sample_note:raw.sample_note||''
 }
}
function matchupFromBundle(bundle,p,game){
 if(format!=='ppr'||!bundle)return null;
 const r26=bundle.matchup_2026||bundle.matchup2026||bundle.matchup?.current_2026||bundle.matchup?.current_season||null;
 const r25=bundle.matchup_2025||bundle.matchup2025||bundle.matchup?.previous_2025||bundle.matchup?.previous_season||null;
 const d26=bundleMatchupRow(r26,p.position),d25=bundleMatchupRow(r25,p.position);
 if(!d26&&!d25)return null;
 const s25=rankScore(d25),s26=rankScore(d26),games26=Number(r26?.games||d26?.games)||0;
 const w26=games26>=5?.70:games26===4?.60:games26===3?.50:games26===2?.40:games26===1?.25:0;
 let score=null;if(s25!=null&&s26!=null)score=s25*(1-w26)+s26*w26;else score=s26??s25;
 return {score:score==null?null:Math.round(score),confidence:score==null?0:Math.min(92,Math.round((s25!=null?58:30)+games26*7)),label:score==null?'Unknown':score>=66?'Favorable':score<=34?'Tough':'Neutral',opp:r26?.opponent||r25?.opponent||game?.opp||null,y2025:d25,y2026:d26,currentWeight:w26,backend:true,raw2025:r25,raw2026:r26}
}
function newsContext(items,injury){
 const now=Date.now(),market=[],reasons=[];
 const recent=(items||[]).filter(n=>{
  const age=(now-new Date(n.published_at||0).getTime())/86400000;
  return Number.isFinite(age)&&age<=7;
 });
 const roleReport=recent.find(n=>{
  const c=Array.isArray(n.categories)?n.categories:[];if(c.includes('indirect')||c.includes('trending'))return false;
  const t=`${n.headline||''} ${n.summary||''} ${n.fantasy_impact||''}`.toLowerCase();
  return /coach|coordinator|oc\b|hc\b|team said|will get more reps|earned more reps|more reps moving forward|more touches|more playing time|more opportunities|workload (will|should|could) increase|role (will|should|could) expand|named starter|will start|starting role|benched|demoted|reduced role/.test(t)
 });
 const direct=roleReport||recent.find(n=>{
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
  const targetShare=totalTargets>0?targets/totalTargets:null;
  const targetDistribution=targetShare;
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
  return {week:w,score:score==null?null:Math.round(score),confidence,snap,targetShare,targetDistribution,routeParticipation,targetsPerRoute,rushShare,rzShare,targets,carries,routes,rz,totalTargets,teamTargets:totalTargets,totalCarries,teamPassAttempts,teamDropbacks,label:bits.join(' · ')||'Role data unavailable'};
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
function roleScoreFromVerified(p,v,base){
 const pos=String(p.position||'').toUpperCase(),parts=[];
 const targetShare=Number.isFinite(Number(v?.target_share_pct))?Number(v.target_share_pct)/100:base?.targetShare;
 const routeParticipation=Number.isFinite(Number(v?.route_pct))?Number(v.route_pct)/100:base?.routeParticipation;
 const routes=Number.isFinite(Number(v?.routes))?Number(v.routes):base?.routes;
 const targets=Number.isFinite(Number(v?.targets))?Number(v.targets):base?.targets;
 const tprr=routes>0&&targets!=null?targets/routes:base?.targetsPerRoute;
 const snap=Number.isFinite(Number(v?.snap_pct))?Number(v.snap_pct)/100:base?.snap;
 const rushShare=Number.isFinite(Number(v?.rb_carry_share_pct))?Number(v.rb_carry_share_pct)/100:base?.rushShare;
 if(pos==='WR'||pos==='TE'){
  if(targetShare!=null)parts.push([roleNorm(targetShare,.08,.30),.55]);
  if(routeParticipation!=null)parts.push([roleNorm(routeParticipation,.55,.95),.20]);
  if(tprr!=null)parts.push([roleNorm(tprr,.08,.28),.12]);
  if(snap!=null)parts.push([roleNorm(snap,.45,.90),.08]);
 }else if(pos==='RB'){
  if(rushShare!=null)parts.push([roleNorm(rushShare,.20,.70),.44]);
  if(snap!=null)parts.push([roleNorm(snap,.30,.75),.24]);
  if(targetShare!=null)parts.push([roleNorm(targetShare,.02,.16),.18]);
 }
 if(!parts.length)return base?.score??null;
 const wt=parts.reduce((a,x)=>a+x[1],0);return Math.round(parts.reduce((a,[v,w])=>a+v*w,0)/wt)
}
function mergeVerifiedRole(p,id,base){
 const v=verifiedUsageFor(id);if(!v)return base;
 const out={...(base||{})};
 const n=(key)=>Number.isFinite(Number(v[key]))?Number(v[key]):null;
 if(n('snap_pct')!=null)out.snap=n('snap_pct')/100;
 if(n('targets')!=null)out.targets=n('targets');
 if(n('team_targets')!=null)out.teamTargets=n('team_targets');
 if(out.teamTargets==null&&Number(out.totalTargets)>0)out.teamTargets=Number(out.totalTargets);
 if(out.targets!=null&&out.teamTargets>0)out.targetShare=out.targets/out.teamTargets;
 else if(n('target_share_pct')!=null)out.targetShare=n('target_share_pct')/100;
 out.targetDistribution=out.targetShare;
 if(n('rb_carry_share_pct')!=null)out.rushShare=n('rb_carry_share_pct')/100;
 if(n('carries')!=null)out.carries=n('carries');
 const routeVerified=v.route_pct_available===true||v.route_pct_available==='true'||n('route_pct')!=null;
 if(n('route_pct')!=null)out.routeParticipation=n('route_pct')/100;
 if(n('routes')!=null)out.routes=n('routes');
 if(String(p.position||'').toUpperCase()==='RB'&&!routeVerified){out.routeParticipation=null;out.routes=null;out.targetsPerRoute=null}
 if(n('team_pass_attempts')!=null)out.teamPassAttempts=n('team_pass_attempts');
 if(n('team_rb_carries')!=null)out.totalCarries=n('team_rb_carries');
 if(out.routes>0&&out.targets!=null)out.targetsPerRoute=out.targets/out.routes;
 out.score=roleScoreFromVerified(p,v,out);
 out.confidence=Math.max(Number(out.confidence)||0,95);
 const bits=[];
 if(p.position==='RB'&&out.rushShare!=null)bits.push(`${Math.round(out.rushShare*1000)/10}% RB carry share`);
 if(['RB','WR','TE'].includes(p.position)&&out.targetShare!=null)bits.push(`${Math.round(out.targetShare*1000)/10}% target share`);
 if(out.snap!=null)bits.push(`${Math.round(out.snap*1000)/10}% snaps`);
 out.label=bits.join(' · ')||out.label||'Verified usage';
 out.verifiedSource=v.source||'Verified usage';
 return out
}
function mergeVerifiedGame(p,id,base){
 const v=verifiedUsageFor(id);if(!v)return base;
 const out={...(base||{})},n=(key)=>Number.isFinite(Number(v[key]))?Number(v[key]):null;
 if(n('snap_pct')!=null)out.snap=n('snap_pct')/100;
 if(n('carries')!=null)out.carries=n('carries');
 if(n('rushing_yards')!=null)out.rushYds=n('rushing_yards');
 if(n('rushing_td')!=null)out.rushTd=n('rushing_td');
 if(n('targets')!=null)out.targets=n('targets');
 if(n('receptions')!=null)out.rec=n('receptions');
 if(n('receiving_yards')!=null)out.recYds=n('receiving_yards');
 if(n('receiving_td')!=null)out.recTd=n('receiving_td');
 if(n('touches')!=null)out.touches=n('touches');
 if(n('routes')!=null)out.routes=n('routes');
 if(n('red_zone_opportunities')!=null)out.rz=n('red_zone_opportunities');
 if(n('goal_line_opportunities')!=null)out.goal=n('goal_line_opportunities');
 if(n('air_yards')!=null)out.airYds=n('air_yards');
 if(n('adot')!=null)out.adot=n('adot');
 if(out.fantasy==null){
  const synthetic={rush_att:out.carries||0,rush_yd:out.rushYds||0,rush_td:out.rushTd||0,rec_tgt:out.targets||0,rec:out.rec||0,rec_yd:out.recYds||0,rec_td:out.recTd||0};
  out.fantasy=E.fantasyPoints(synthetic,format)
 }
 out.verifiedSource=v.source||'Verified usage';
 return out
}
function coreFallbackScore({rank,roleScore,recentPpg,matchupScore,newsAdjustment=0,contextAdjustment=0}){
 const parts=[];
 const r=Number(rank);if(Number.isFinite(r)&&r>0)parts.push([100*Math.max(0,Math.min(1,1-(r-1)/120)),.34]);
 const role=Number(roleScore);if(Number.isFinite(role))parts.push([Math.max(0,Math.min(100,role)),.30]);
 const ppg=Number(recentPpg);if(Number.isFinite(ppg)&&ppg>=0)parts.push([100*Math.max(0,Math.min(1,(ppg-4)/20)),.26]);
 const mu=Number(matchupScore);if(Number.isFinite(mu))parts.push([Math.max(0,Math.min(100,mu)),.10]);
 if(!parts.length)return null;
 const weight=parts.reduce((a,x)=>a+x[1],0);
 let score=parts.reduce((a,[v,w])=>a+v*w,0)/weight;
 score+=Math.max(-7,Math.min(7,Number(newsAdjustment)||0))+Math.max(-7,Math.min(7,Number(contextAdjustment)||0));
 return Math.round(Math.max(0,Math.min(100,score)))
}
function explicitAvailability({inj,game}){
 const text=String(inj||'').toLowerCase();
 const out=/(^|\b)(out|ir|pup|suspended|inactive)(\b|$)/.test(text);
 const bye=!!scheduleLoaded&&!game;
 const locked=!!game?.locked;
 return {out,bye,locked,actionable:!out&&!bye}
}
function emergencyGrade(id,reason=''){
 const p=pool.get(String(id));if(!p)return null;
 const sid=String(id),bundle=playerBundleCache.get(sid)||null;
 const rank=whRank(id)??(Number.isFinite(Number(p.sleeper_rank))?Number(p.sleeper_rank):999);
 const rankScore=Math.max(1,Math.min(99,Math.round(100*Math.max(0,Math.min(1,1-(Number(rank)-1)/140)))));
 const inj=injuryText(id),game=games.get(normTeam(p.team))||null;
 const text=String(inj||'').toLowerCase(),out=/(^|\b)(out|ir|pup|suspended|inactive)(\b|$)/.test(text);
 const bye=!!scheduleLoaded&&!game;
 const availability={out,bye,locked:!!game?.locked,actionable:!out&&!bye};
 const weeklyProjection=providerProjection(id);
 const latestRole=mergeVerifiedRole(p,id,{week:Math.max(1,week-1),score:null,confidence:0,snap:null,targetShare:null,targetDistribution:null,routeParticipation:null,targetsPerRoute:null,rushShare:null,rzShare:null,totalTargets:null,teamTargets:null,totalCarries:null,teamPassAttempts:null,teamDropbacks:null,label:'Role data unavailable'});
 const latestGame=mergeVerifiedGame(p,id,{});
 const props=[...(propsCache.get(sid)||[]),...(bundle?.props||[]),...(VERIFIED_FALLBACKS[sid]?.props||[])];
 const news=[...(newsCache.get(sid)||[])];
 const newsCtx=newsContext(news,inj);
 const bundleRoleChange=bundle?.role_change||bundle?.roleChange||bundle?.role_signal||null;
 if(bundleRoleChange){
  const dir=String(bundleRoleChange.direction||'').toLowerCase(),boost=dir==='up'?22:dir==='down'?-22:0;
  if(boost)newsCtx.forwardRoleBoost=boost;
  if(boost)newsCtx.directState=dir==='up'?'role_up':'role_down';
  const msg=bundleRoleChange.detail||bundleRoleChange.fantasy_impact||bundleRoleChange.headline;
  if(msg)newsCtx.reasons=[msg,...(newsCtx.reasons||[]).filter(x=>x!==msg)].slice(0,3);
 }
 let mu={score:null,confidence:0,label:'No matchup data',y2025:null,y2026:null};
 try{mu=matchupFromBundle(bundle,p,game)||matchupFor(p,game)}catch(_){}
 const g={score:rankScore,eligible:!out&&!bye,locked:!!game?.locked,bye,components:{rank:rankScore,matchup:mu.score},projection:{points:weeklyProjection,source:'rank-emergency'},reasons:['Emergency fallback · Workhorse weekly rank + verified player data']};
 return {id:sid,p,current:[],prior:[],inj,injuryRisk:0,rank:format==='ppr'?rank:null,workhorseRank:rank,weeklyProjection,latestRole,forwardRoleScore:latestRole.score,forwardRoleLabel:latestRole.label,g,availability,confidence:35,game,news,props,newsCtx,bundleRoleChange,teamCtx:{adjustment:0,reasons:[]},mu,teamChanged:false,latestGame,currentWork:{games:latestGame?.fantasy!=null?1:0,ppg:latestGame?.fantasy??null},seasonWork:{games:latestGame?.fantasy!=null?1:0,ppg:latestGame?.fantasy??null},priorWork:{games:0},emergency:true,emergencyReason:String(reason||'')}
}
async function grade(id){
 const p=pool.get(String(id));if(!p)throw new Error('Selected player missing from pool');
 let bundle=null;
 try{bundle=await loadStartSitPlayerBundle(p)}catch(e){console.warn('player bundle prefetch failed',id,e)}
 let current=[],prior=[],news=[],props=[],latestRole={week:null,score:null,confidence:0,label:'Role data unavailable'};
 try{current=await history(id)}catch(e){console.warn('history unavailable',id,e)}
 try{prior=await priorHistory(id)}catch(e){console.warn('prior history unavailable',id,e)}
 try{news=await loadNewsFor(p)}catch(e){console.warn('news unavailable',id,e)}
 try{props=await loadPropsFor(p)}catch(e){console.warn('props unavailable',id,e)}
 try{latestRole=await latestRoleContext(p,id)}catch(e){console.warn('role unavailable',id,e)}
 latestRole=mergeVerifiedRole(p,id,latestRole)
 const game=games.get(normTeam(p.team))||null,custom=customMeta(id);
 const inj=injuryText(id),workhorseRank=whRank(id),rank=format==='ppr'?workhorseRank:null,newsCtx=newsContext(news,inj),teamCtx=teamContext(p);
 const bundleRoleChange=bundle?.role_change||bundle?.roleChange||bundle?.role_signal||null;
 if(bundleRoleChange){
  const dir=String(bundleRoleChange.direction||'').toLowerCase(),boost=dir==='up'?22:dir==='down'?-22:0;
  if(boost&&Math.abs(Number(newsCtx.forwardRoleBoost)||0)<Math.abs(boost))newsCtx.forwardRoleBoost=boost;
  if(boost)newsCtx.directState=dir==='up'?'role_up':'role_down';
  const reason=bundleRoleChange.detail||bundleRoleChange.fantasy_impact||bundleRoleChange.headline;
  if(reason)newsCtx.reasons=[reason,...(newsCtx.reasons||[]).filter(x=>x!==reason)].slice(0,3);
 }
 let mu={score:null,confidence:0,label:'No matchup data',y2025:null,y2026:null};
 try{mu=matchupFromBundle(bundle,p,game)||matchupFor(p,game)}catch(e){console.warn('matchup grade unavailable',id,e)}
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
  const recent=workload(p.position,current,3),fallbackPts=weeklyProjection??(recent.games?recent.ppg:null);
  const unavailable=/\b(out|ir|pup|suspended|inactive)\b/i.test(String(inj||''));
  const bye=scheduleLoaded&&!game,locked=!!game?.locked;
  const emergencyRank=(rank??workhorseRank??(Number.isFinite(Number(p.sleeper_rank))?Number(p.sleeper_rank):null));
  const fallbackScore=coreFallbackScore({rank:emergencyRank,roleScore:forwardRoleScore,recentPpg:recent.games?recent.ppg:null,matchupScore:mu.score,newsAdjustment:newsCtx.adjustment,contextAdjustment:teamCtx.adjustment});
  g={score:fallbackScore,eligible:!unavailable&&!bye,locked,bye,components:{projection:weeklyProjection!=null?Math.round(Math.max(0,Math.min(100,(weeklyProjection-5)/22*100))):null,role:forwardRoleScore,rank:rank?Math.round(100*Math.max(0,Math.min(1,1-(rank-1)/120))):null,matchup:mu.score},projection:{points:fallbackPts,source:'core-fallback'},reasons:['Core verified data fallback · weekly rank, role, recent production and matchup when available']}
 }
 const availability=explicitAvailability({inj,game});
 return {id:String(id),p,current,prior,inj,injuryRisk,rank,workhorseRank,weeklyProjection,latestRole,forwardRoleScore,forwardRoleLabel,g,availability,confidence:confidence(g),game,news,props,newsCtx,bundleRoleChange,teamCtx,mu,teamChanged,latestGame:mergeVerifiedGame(p,id,latestGameStats(p.position,current)),currentWork:workload(p.position,current,3),seasonWork:workload(p.position,current,0),priorWork:workload(p.position,prior,3)}
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
#wh-startsit .compare-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;padding:12px;align-items:start}
#wh-startsit .compare-card{min-width:0;border:1px solid #1c313d;border-radius:12px;background:#09141c;overflow:hidden}
#wh-startsit .compare-card.winner-card{border-color:#355c47;box-shadow:inset 0 3px 0 #62c88c}
#wh-startsit .compare-player{padding:13px;border-bottom:1px solid #1a2e39;background:#0b1720}
#wh-startsit .playercol{display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;align-items:center;min-width:0}
#wh-startsit .playercol img{width:42px;height:42px;border-radius:9px;object-fit:cover;object-position:center top;background:#11222c}
#wh-startsit .playercol div{min-width:0;text-align:left}
#wh-startsit .playercol b{display:block;font-size:14px;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .playercol small{display:block;color:#778d99;font-size:10px;margin-top:3px;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .compare-rows{display:block}
#wh-startsit .compare-row{display:grid;grid-template-columns:minmax(112px,38%) minmax(0,62%);gap:12px;align-items:start;padding:11px 13px;border-top:1px solid #152833}
#wh-startsit .compare-row:first-child{border-top:0}
#wh-startsit .compare-label{min-width:0}
#wh-startsit .compare-label strong{display:block;font-size:11px;color:#dbe5ea;line-height:1.3;overflow-wrap:anywhere}
#wh-startsit .compare-label small{display:block;font-size:9px;color:#6f8590;margin-top:3px;line-height:1.35;overflow-wrap:anywhere}
#wh-startsit .compare-value{min-width:0;text-align:right;overflow:hidden}
#wh-startsit .val{display:block;font-size:14px;font-weight:900;color:#e8eff2;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .sub{display:block;color:#708692;font-size:10px;font-weight:700;margin-top:3px;line-height:1.4;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .good{color:var(--green)!important}
#wh-startsit .bad{color:var(--red)!important}
#wh-startsit .neutral{color:var(--gold)!important}
#wh-startsit .propstack,#wh-startsit .matchstack{display:grid;gap:5px;min-width:0;text-align:right}
#wh-startsit .propitem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border-bottom:1px solid #172a34;padding:3px 0;font-size:10px;min-width:0}
#wh-startsit .propitem:last-child{border-bottom:0}
#wh-startsit .propitem span{color:#8296a1;min-width:0;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .propitem b{color:#eef4f7;white-space:nowrap}
#wh-startsit .matchstack b{display:block;font-size:11px;color:#eef4f7;line-height:1.4;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .matchstack small{display:block;color:#748994;font-size:9px;line-height:1.35;white-space:normal;overflow-wrap:anywhere}
#wh-startsit .details-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
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
#wh-startsit .propstack{display:grid;gap:4px;text-align:left}
#wh-startsit .matchstack{display:grid;gap:4px;text-align:left}
#wh-startsit .propitem{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #172a34;padding:2px 0;font-size:11px}
#wh-startsit .propitem:last-child{border-bottom:0}
#wh-startsit .propitem span{color:#8296a1}#wh-startsit .propitem b{color:#eef4f7;white-space:nowrap}
#wh-startsit .matchstack b{font-size:12px;color:#eef4f7}#wh-startsit .matchstack small{color:#748994;font-size:10px;line-height:1.35}
#wh-startsit .source-note{margin-top:12px;color:#617884;font-size:10px;line-height:1.5}
@media(max-width:820px){#wh-startsit .intro{display:block}#wh-startsit .weekpill{display:inline-block;margin-top:14px}#wh-startsit .controls{grid-template-columns:1fr}#wh-startsit .compare-grid{grid-template-columns:1fr}#wh-startsit .details-grid{grid-template-columns:1fr}}
@media(max-width:580px){#wh-startsit .shell{width:calc(100% - 20px);padding-top:24px}#wh-startsit .intro h1{font-size:36px}#wh-startsit .searchrow{grid-template-columns:1fr}#wh-startsit .run{width:100%}#wh-startsit .top{padding:13px 12px}#wh-startsit .brand{font-size:19px}#wh-startsit .tag{display:none}#wh-startsit .compare-grid{padding:8px}#wh-startsit .compare-row{grid-template-columns:1fr;gap:6px}#wh-startsit .compare-value{text-align:left}#wh-startsit .propstack,#wh-startsit .matchstack{text-align:left}}
</style>`)
}
function shell(){
 document.body.innerHTML=`<div id="wh-startsit">
  <header class="top"><div class="brand">WORKHORSE</div><span class="tag">START / SIT · v31</span><div class="spacer"></div><a class="back" href="./sandbox.html?view=tools">← Tools</a></header>
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
function projectionSourceText(x){if(x.weeklyProjection==null)return projectionsLoaded?'No verified projection':'Projection feed unavailable';const vp=verifiedProjectionSource(x.id);return vp||'Sleeper current-week projection'}
function statusTone(x){return x.availability?.actionable===false?'bad':x.injuryRisk>=.15?'bad':x.injuryRisk>0?'neutral':''}
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
function propLabel(m){return ({rushing_yards:'Rush yds',rushing_receiving_yards:'Rush + rec yds',receiving_yards:'Rec yds',receptions:'Receptions',rushing_attempts:'Rush att',passing_yards:'Pass yds',passing_touchdowns:'Pass TDs',anytime_touchdown:'Anytime TD',touchdown_scored:'Anytime TD'}[m]||String(m||'').replaceAll('_',' '))}
function odd(v){const n=Number(v);return Number.isFinite(n)?`${n>0?'+':''}${n}`:''}
function propValue(p){
 if(p?.market==='anytime_touchdown'||p?.market==='touchdown_scored')return odd(p.over_odds)||'Line posted';
 return fmt(p?.line,1)
}
function propOdds(p){
 if(p?.market==='anytime_touchdown'||p?.market==='touchdown_scored')return '';
 const o=odd(p?.over_odds),u=odd(p?.under_odds);
 return o||u?[o?`O ${o}`:'',u?`U ${u}`:''].filter(Boolean).join(' / '):''
}
function propsCell(x){
 try{
  const a=(x.props||[]).slice(0,8);
  if(!a.length)return matrixCell('No verified line','No current-week market returned');
  return `<div class="propstack">${a.map(p=>`<div class="propitem"><span>${esc(p.label||propLabel(p.market))}</span><b>${esc(propValue(p))}</b>${propOdds(p)?`<small>${esc(propOdds(p))}</small>`:''}</div>`).join('')}<span class="sub">${esc(a[0]?.source||'Verified market')} · ${esc(ago(a[0]?.observed_at))}</span></div>`
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
 if(p==='RB')return matrixCell(r.rushShare==null?'—':pct(r.rushShare),`RB carries · ${r.carries??'—'}/${r.totalCarries??'—'} · ${r.snap==null?'—':pct(r.snap)} snaps`);
 if(p==='WR'||p==='TE'){const tt=r.teamTargets??r.totalTargets;return matrixCell(r.targetShare==null?'—':pct(r.targetShare),`${r.targets??'—'} targets / ${tt??'—'} team targets · ${r.snap==null?'—':pct(r.snap)} snaps`);}
 if(p==='QB')return matrixCell(r.snap==null?'—':pct(r.snap),'snap share');
 return matrixCell('—','')
}
function targetShareCell(x){
 const r=x.latestRole||{};
 const teamTargets=r.teamTargets??r.totalTargets;const sub=r.targets==null?'':teamTargets!=null?`${r.targets} targets / ${teamTargets} team targets`:`${r.targets} targets${r.verifiedSource?` · ${r.verifiedSource}`:''}`;
 return matrixCell(r.targetShare==null?'—':pct(r.targetShare),sub)
}
function routeCell(x){
 const r=x.latestRole||{},lg=x.latestGame||{};
 const tprr=r.targetsPerRoute==null?'—':pct(r.targetsPerRoute);
 const yprr=lg.routes>0&&lg.recYds!=null?(Number(lg.recYds)/Number(lg.routes)).toFixed(2):'—';
 const rp=r.routeParticipation==null?'—':pct(r.routeParticipation);
 const main=(r.routes??lg.routes)!=null?`${r.routes??lg.routes} routes`:r.routeParticipation!=null?`${pct(r.routeParticipation)} route share`:'—';
 return matrixCell(main,`${rp} route participation · ${tprr} TPRR · ${yprr} YPRR`)
}
function dataRows(rows){
 return (rows||[]).map(([label,value])=>`<div class="drow"><span>${esc(label)}</span><b>${esc(value==null||value===''?'—':value)}</b></div>`).join('')
}
function matchupDetailRows(year,d,pos){
 if(!d)return [[`${year} matchup`,'No verified matchup data']];
 const rows=[];
 if(d.display)rows.push([`${year} summary`,d.display]);
 rows.push([`${year} ${scoringName()} allowed / game`,fmt(d.avg?.[matchupPointKey()],1)]);
 const rank=matchupRank(d);if(rank!=null)rows.push([`${year} matchup rank`, `#${rank} of ${d.rankTotal||32} by points/yards/TD allowed`]);
 if(pos==='RB'){
  rows.push([`${year} RB carries allowed / game`,fmt(d.avg?.carries,1)]);
  rows.push([`${year} rushing yards allowed / game`,fmt(d.avg?.rushYds,1)]);
  rows.push([`${year} RB targets allowed / game`,fmt(d.avg?.targets,1)]);
  rows.push([`${year} RB receiving yards allowed / game`,fmt(d.avg?.recYds,1)]);
 }else if(pos==='WR'||pos==='TE'){
  rows.push([`${year} targets allowed / game`,fmt(d.avg?.targets,1)]);
  rows.push([`${year} receptions allowed / game`,fmt(d.avg?.receptions,1)]);
  rows.push([`${year} receiving yards allowed / game`,fmt(d.avg?.recYds,1)]);
 }else if(pos==='QB'){
  rows.push([`${year} passing yards allowed / game`,fmt(d.avg?.passYds,1)]);
  rows.push([`${year} passing TD allowed / game`,fmt(d.avg?.passTd,2)]);
  rows.push([`${year} QB rushing yards allowed / game`,fmt(d.avg?.rushYds,1)]);
 }
 if(d.sample_note)rows.push([`${year} sample`,d.sample_note]);
 if(d.source)rows.push([`${year} source`,d.source]);
 return rows
}
function matchupYardLabel(pos){return pos==='QB'?'pass yds':pos==='RB'?'rush yds':'rec yds'}
function matchupLine(d,pos){
 if(!d)return '';
 const pts=fmt(d.avg?.[matchupPointKey()],1);
 if(pos==='WR'||pos==='TE')return `all ${pos}s combined: ${pts} ${scoringName()} pts/G · ${fmt(d.avg?.targets,1)} tgt/G · ${fmt(d.avg?.receptions,1)} rec/G · ${fmt(d.avg?.recYds,1)} yds/G · ${fmt(d.avg?.recTd,2)} TD/G`;
 if(pos==='RB')return `all RBs combined: ${pts} ${scoringName()} pts/G · ${fmt(d.avg?.carries,1)} car/G · ${fmt(d.avg?.rushYds,1)} rush yds/G · ${fmt(d.avg?.targets,1)} tgt/G · ${fmt(d.avg?.recYds,1)} rec yds/G`;
 if(pos==='QB')return `${pts} ${scoringName()} pts/G · ${fmt(d.avg?.passYds,1)} pass yds/G · ${fmt(d.avg?.passTd,2)} pass TD/G · ${fmt(d.avg?.rushYds,1)} rush yds/G`;
 return `${pts} ${scoringName()} pts/G`
}
function matchupYearCell(x,year){
 const raw=year===2026?x.mu?.raw2026:x.mu?.raw2025,d=year===2026?x.mu?.y2026:x.mu?.y2025;
 const line=raw?.display||matchupLine(d,x.p.position);
 if(!line)return matrixCell('—',`No verified ${year} matchup data`);
 const sample=raw?.sample_note||(year===2026&&d?`${d.games} completed game${d.games===1?'':'s'}`:year===2025?'2025 full-season baseline':'');
 return matrixCell(line,sample,year===2026?matchupTone(x.mu?.score):'')
}
function matchupCell(x){
 const d26=x.mu?.y2026,d25=x.mu?.y2025,r26=x.mu?.raw2026,r25=x.mu?.raw2025;
 if(!d26&&!d25&&!r26&&!r25)return matrixCell('—','No verified matchup sample');
 const line26=r26?.display||matchupLine(d26,x.p.position),line25=r25?.display||matchupLine(d25,x.p.position);
 const sample26=r26?.sample_note||(d26?`${d26.games} completed game${d26.games===1?'':'s'}`:'');
 const sample25=r25?.sample_note||(d25?.verifiedPpr&&format==='ppr'?'2025 full-season baseline':'raw box-score baseline');
 return `<div class="matchstack">${line26?`<b>${esc(line26)}</b><small>${esc(sample26)}</small>`:''}${line25?`<b>${esc(line25)}</b><small>${esc(sample25)}</small>`:''}</div>`
}
function gameCell(x){const g=x.game;if(!g)return matrixCell(scheduleLoaded?'BYE':'—',scheduleLoaded?'No game this week':'Schedule unavailable',scheduleLoaded?'bad':'');const main=g.total?`O/U ${fmt(g.total,1)}`:'Scheduled';const sub=[g.teamImplied?`team ${fmt(g.teamImplied,1)}`:'',Number.isFinite(g.spread)?`${g.spread>0?'+':''}${fmt(g.spread,1)} spread`:'' ].filter(Boolean).join(' · ');return matrixCell(main,sub)}
function roleCell(x){const r=x.g?.role||{};return matrixCell(r.label||'—',r.confidence?`${r.confidence} confidence`:'',r.direction==='up'?'good':r.direction==='down'?'bad':'')}
function seasonPpgCell(x){
 const games=Number(x.seasonWork?.games)||0;
 if(games>0)return matrixCell(fmt(x.seasonWork?.ppg,1),`${games} game${games===1?'':'s'}`);
 if(x.latestGame?.fantasy!=null)return matrixCell(fmt(x.latestGame.fantasy,1),'1 verified game');
 return matrixCell('—','No completed-game stat found')
}
function matrixRows(graded){
 const rows=[
  {label:'Week projection',note:'Current-week verified projection',cell:x=>matrixCell(sourceProjectionName(x),projectionSourceText(x))},
  {label:'Player props',note:'All current verified markets returned',cell:propsCell},
  {label:`2026 matchup vs ${graded.length&&graded.every(x=>x.p.position===graded[0].p.position)?graded[0].p.position:'position'}`,note:'Current season · completed games only',cell:x=>matchupYearCell(x,2026)},
  {label:'2025 matchup baseline',note:'Full 2025 season · separate context',cell:x=>matchupYearCell(x,2025)},
  {label:'Role change',note:'Confirmed coach/team workload news',cell:x=>{const rc=x.bundleRoleChange,d=x.newsCtx?.direct,dir=String(rc?.direction||'').toLowerCase(),headline=rc?.headline||d?.headline||'',source=rc?.source||d?.provider||'',detail=rc?.detail||x.newsCtx?.reasons?.[0]||'No verified role-change report';return matrixCell(rc?.label||(x.newsCtx?.forwardRoleBoost>0?'Role increasing':x.newsCtx?.forwardRoleBoost<0?'Role decreasing':'No confirmed change'),headline?[headline,source].filter(Boolean).join(' · '):detail,dir==='up'||x.newsCtx?.forwardRoleBoost>0?'good':dir==='down'||x.newsCtx?.forwardRoleBoost<0?'bad':'')}},
  {label:`2026 ${scoringName()} points / game`,note:'Actual completed games',cell:seasonPpgCell},
  {label:'Last game',note:'Exact box-score usage',cell:latestStatCell},
  {label:'Primary opportunity',note:'WR/TE = target share · RB = RB carry share',cell:roleShareCell},
  {label:'Target share',note:'Targets ÷ total team targets',cell:targetShareCell},
  {label:'Routes & efficiency',note:'Routes · route participation · TPRR · YPRR',cell:routeCell},
  {label:'Game line',note:'Spread · total · implied team points',cell:gameCell},
  {label:'Workhorse weekly rank',note:'Your PPR weekly board; excluded in non-PPR',cell:x=>matrixCell(x.rank?`#${x.rank}`:'—',x.rank?'current week':format==='ppr'?'not initialized':'PPR-only')},
  {label:'Player status',note:'Current availability designation',cell:x=>matrixCell(x.inj||'Active',x.injuryRisk?'Availability risk applied':'',statusTone(x))}
 ];
 return rows
}
function safeMatrixCell(row,x){
 try{return row.cell(x)}catch(e){console.warn('Start/Sit cell render failed',row?.label,x?.p?.full_name,e);return matrixCell('—','Data unavailable')}
}
function safeMatrixCell(row,x){
 try{return row.cell(x)}catch(e){console.warn('Start/Sit row render failed',row?.label,x?.p?.full_name,e);return matrixCell('—','Data unavailable')}
}
function renderMatrix(graded){
 const rows=matrixRows(graded);
 return `<section class="compare-panel"><div class="compare-head"><h3>Head-to-head</h3><span>Actual stats first · every player gets the same rows</span></div><div class="compare-grid">${graded.map((x,i)=>`<article class="compare-card ${i===0&&x.availability?.actionable?'winner-card':''}"><div class="compare-player">${playerHeader(x)}</div><div class="compare-rows">${rows.map(r=>`<div class="compare-row"><div class="compare-label"><strong>${esc(r.label)}</strong><small>${esc(r.note)}</small></div><div class="compare-value">${safeMatrixCell(r,x)}</div></div>`).join('')}</div></article>`).join('')}</div></section>`
}

function detailCard(x){
 const d26=x.mu?.y2026,d25=x.mu?.y2025,st=status.get(String(x.id))||{},lg=x.latestGame||{},lr=x.latestRole||{};
 const projectionRows=[['Week projection',x.weeklyProjection==null?'—':`${fmt(x.weeklyProjection,1)} pts · ${projectionSourceText(x)}`]];
 let propRows=[];try{propRows=(x.props||[]).map(p=>[p.label||propLabel(p.market),`${propValue(p)}${propOdds(p)?` · ${propOdds(p)}`:''} · ${p.source||'Verified line'} · ${ago(p.observed_at)}`])}catch(_){propRows=[]}
 const wrEfficiency=[
  ['Target share',lr.targetShare==null?'—':`${pct(lr.targetShare)} · ${lr.targets??'—'}/${lr.teamTargets??'—'} team targets`],
  ['Route participation',pct(lr.routeParticipation)],
  ['Targets per route',pct(lr.targetsPerRoute)],
  ['Yards per route',lg.routes>0&&lg.recYds!=null?(Number(lg.recYds)/Number(lg.routes)).toFixed(2):'—'],
  ['Air yards',fmt(lg.airYds,0)],
  ['aDOT',lg.adot==null?'—':fmt(lg.adot,1)]
 ];
 const lastRows=x.p.position==='RB'
  ?[['Fantasy points',fmt(lg.fantasy,1)],['Touches',fmt(lg.touches,0)],['Carries',fmt(lg.carries,0)],['Rushing yards',fmt(lg.rushYds,0)],['Rush yards / carry',lg.carries>0?(Number(lg.rushYds)/Number(lg.carries)).toFixed(2):'—'],['Receptions / targets',`${fmt(lg.rec,0)} / ${fmt(lg.targets,0)}`],['Receiving yards',fmt(lg.recYds,0)],['Snap share',pct(lg.snap)],['RB carry share',pct(lr.rushShare)],['Target share',lr.targetShare==null?'—':`${pct(lr.targetShare)} · ${lr.targets??'—'}/${lr.teamTargets??'—'} team targets${lr.verifiedSource?` · ${lr.verifiedSource}`:''}`],['Red-zone opportunities',fmt(lg.rz,0)],['Goal-line opportunities',fmt(lg.goal,0)]]
  :x.p.position==='WR'||x.p.position==='TE'
   ?[['Fantasy points',fmt(lg.fantasy,1)],['Receptions / targets',`${fmt(lg.rec,0)} / ${fmt(lg.targets,0)}`],['Receiving yards',fmt(lg.recYds,0)],['Receiving TD',fmt(lg.recTd,0)],['Snap share',pct(lg.snap)],['Routes',fmt(lg.routes,0)],...wrEfficiency,['Red-zone opportunities',fmt(lg.rz,0)]]
   :[['Fantasy points',fmt(lg.fantasy,1)],['Pass attempts',fmt(lg.passAtt,0)],['Passing yards',fmt(lg.passYds,0)],['Passing TD',fmt(lg.passTd,0)],['Snap share',pct(lg.snap)]];
 const rc=x.bundleRoleChange||null,direct=x.newsCtx?.direct||null;
 const roleRows=rc?[
  ['Signal',rc.label||'Role change'],
  ['Headline',rc.headline||'—'],
  ['What changed',rc.detail||rc.fantasy_impact||'—'],
  ['Fantasy impact',rc.fantasy_impact||'—'],
  ['Source',[rc.source,rc.published_at?new Date(rc.published_at).toLocaleString():null].filter(Boolean).join(' · ')||'—']
 ]:direct&&x.newsCtx?.forwardRoleBoost?[
  ['Signal',x.newsCtx.forwardRoleBoost>0?'Role increasing':'Role decreasing'],
  ['Headline',direct.headline||'—'],
  ['What changed',direct.summary||x.newsCtx?.reasons?.[0]||'—'],
  ['Source',[direct.provider,direct.published_at?new Date(direct.published_at).toLocaleString():null].filter(Boolean).join(' · ')||'—']
 ]:[['Signal','No confirmed role change']];
 const matchupRows=[['Opponent',x.game?.opp||'—'],...matchupDetailRows('2026',d26,x.p.position),...matchupDetailRows('2025',d25,x.p.position)];
 const gameRows=[['Status',x.inj||'Active'],['Status updated',st.updated_at?new Date(st.updated_at).toLocaleString():'—'],['Game',x.game?`${x.game.home?'vs':'@'} ${x.game.opp}`:(scheduleLoaded?'BYE':'—')],['Game total',x.game?.total?fmt(x.game.total,1):'—'],['Team implied points',x.game?.teamImplied?fmt(x.game.teamImplied,1):'—'],['Spread',Number.isFinite(x.game?.spread)?`${x.game.spread>0?'+':''}${fmt(x.game.spread,1)}`:'—']];
 const news=(x.news||[]).filter(n=>!(Array.isArray(n.categories)&&n.categories.includes('trending'))).slice(0,5);
 return `<details class="player-data"><summary>${esc(x.p.full_name)} · supporting data</summary><div class="detail-body"><div class="detail-section"><h4>Current week & betting lines</h4>${dataRows(projectionRows)}${propRows.length?dataRows(propRows):'<div class="drow"><span>Verified player props</span><b>—</b></div>'}</div><div class="detail-section"><h4>Last game — exact usage</h4>${dataRows(lastRows)}</div><div class="detail-section"><h4>Role change</h4>${dataRows(roleRows)}</div><div class="detail-section"><h4>Matchup — position allowed stats</h4>${dataRows(matchupRows)}</div><div class="detail-section"><h4>Game & availability</h4>${dataRows(gameRows)}</div><div class="detail-section"><h4>Recent news</h4>${news.length?news.map(n=>`<div class="newsline"><b>${esc(n.headline||'Player update')}</b><small>${esc(n.provider||'Source')} · ${esc(n.published_at?new Date(n.published_at).toLocaleString():'')}</small></div>`).join(''):'<div class="drow"><span>No recent matched player news</span><b>—</b></div>'}</div></div></details>`
}
function safeDetailCard(x){
 try{return detailCard(x)}catch(e){console.warn('Start/Sit detail render failed',x?.p?.full_name,e);return `<details class="player-data"><summary>${esc(x?.p?.full_name||'Player')} · supporting data</summary><div class="detail-body"><div class="warning">Some optional supporting data is unavailable. The recommendation above still uses verified core data.</div></div></details>`}
}
function renderDetails(graded){return `<div class="details-grid">${graded.map(safeDetailCard).join('')}</div>`}

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
 if(!a)return '<div class="warning">Every selected player is explicitly unavailable or on bye. Active players are always retained in the comparison.</div>';
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
 let graded=[];
 try{
  try{
   const prefetched=await Promise.all(selected.map(id=>loadStartSitPlayerBundle(pool.get(String(id))).catch(()=>null)));
   const missingBundleMatchup=prefetched.some(b=>!b?.matchup_2026&&!b?.matchup2026&&!b?.matchup?.current_2026);
   if(format!=='ppr'||missingBundleMatchup)await ensureMatchups();
  }catch(e){console.warn('matchup preload fallback skipped',e)}
  const settled=await Promise.allSettled(selected.map(grade));
  graded=settled.map((x,i)=>{
   if(x.status==='fulfilled'&&x.value)return x.value;
   console.warn('player grade failed; using emergency rank grade',selected[i],x.reason);
   return emergencyGrade(selected[i],x.reason)
  }).filter(Boolean);
  graded.sort((a,b)=>{const ae=!!a.availability?.actionable,be=!!b.availability?.actionable;if(ae!==be)return ae?-1:1;return (b.g?.score??-1)-(a.g?.score??-1)});
  const valid=graded.filter(x=>x.availability?.actionable),a=valid[0],b=valid[1],warnings=[];
  if(!projectionsLoaded)warnings.push('Sleeper weekly projections could not be verified; other verified inputs remain active.');
  else if(graded.some(x=>x.availability?.actionable&&x.weeklyProjection==null))warnings.push('Sleeper did not supply a weekly projection for at least one selected player; that input is excluded for that player.');
  if(!scheduleLoaded)warnings.push('Schedule/game-environment data could not be verified; those inputs are excluded.');
  if(graded.some(x=>x.availability?.actionable&&x.confidence<48))warnings.push('At least one player has limited evidence coverage; confidence is reduced instead of inventing missing data.');
  let recommendation='';
  try{recommendation=callout(a,b)}
  catch(e){console.warn('callout render failed',e);recommendation=a?`<div class="call"><small>Core-data recommendation</small><h2>Start ${esc(a.p.full_name)}</h2><p>This fallback uses the verified player data that remained available.</p></div>`:'<div class="warning">No selected player currently has enough core data to rank.</div>'}
  let matrix='';
  try{matrix=renderMatrix(graded)}catch(e){console.warn('matrix render failed',e);matrix='<div class="warning">Comparison table is temporarily unavailable; the recommendation above is still active.</div>'}
  let details='';
  try{details=renderDetails(graded)}catch(e){console.warn('details render failed',e)}
  document.querySelector('#ss-output').innerHTML=recommendation+matrix+details+(warnings.length?`<div class="warning">${warnings.map(esc).join('<br>')}</div>`:'')+`<div class="source-note">Actual stats: Sleeper completed-week data. Target share = player targets ÷ total team targets. RB route participation is shown only when a real route source exists; snap share is never substituted. Player props are current-week, source-stamped markets when verified. Matchups show 2026 opponent-vs-position results separately from the 2025 full-season baseline. Confirmed coach/team role changes are surfaced directly. Missing optional inputs are excluded instead of guessed.</div>`;
  st.textContent=`Week ${week} · ${scoringName()} · ${valid.length} actionable · ${weekSource}`;
 }catch(e){
  console.error('Start/Sit core comparison failure',e);
  document.querySelector('#ss-output').innerHTML=graded.length?renderDetails(graded):'<div class="warning">Core player data could not be graded. Optional feeds no longer block comparisons; re-select the players to retry core data.</div>';
  st.textContent='Core data unavailable'
 }finally{btn.disabled=selected.length<2}
}

function bind(){document.querySelector('#ss-search').oninput=renderSearch;document.querySelector('#ss-results').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||selected.length>=4)return;selected.push(String(b.dataset.add));document.querySelector('#ss-search').value='';document.querySelector('#ss-results').classList.remove('open');renderPicked()};document.querySelector('#ss-picked').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected=selected.filter(x=>x!==String(b.dataset.remove));renderPicked()};document.querySelector('#slot-seg').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)switchSlot(b.dataset.slot)};document.querySelector('#format-seg').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===b))};document.querySelector('#ss-run').onclick=compare;document.addEventListener('click',e=>{if(!e.target.closest('.searchbox'))document.querySelector('#ss-results')?.classList.remove('open')})}
async function start(){styles();shell();bind();const st=document.querySelector('#ss-status');st.textContent='Loading current data…';try{await currentWeek();document.querySelector('#ss-week-pill').textContent=week;await Promise.all([loadPool(),loadStatus(),loadGames(),loadProjections(),loadVerifiedWeeklyData()]);st.textContent=`Week ${week}`;renderPicked()}catch(e){console.error(e);st.textContent='Player data unavailable';document.querySelector('#ss-output').innerHTML='<div class="warning">Current player data could not be loaded. Workhorse will not guess.</div>'}}
start();
})();

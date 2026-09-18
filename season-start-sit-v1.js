(()=>{
'use strict';
if(window.__WH_START_SIT_V1__)return;window.__WH_START_SIT_V1__=true;
const E=window.WorkhorseDecisionEngine;if(!E){document.body.innerHTML='<div style="padding:40px;color:white">Workhorse decision engine could not load.</div>';return}
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co',KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k',SEASON=2026;
const qs=new URLSearchParams(location.search);let week=Math.min(18,Math.max(0,Number(qs.get('week')||0)||0)),format='ppr',slot='FLEX',selected=[];
const pool=new Map(),status=new Map(),weeks=new Map(),games=new Map(),projections=new Map(),newsCache=new Map(),teamStatus=new Map(),scheduleCache=new Map(),matchupCache={2025:null,2026:null};let scheduleLoaded=false,projectionsLoaded=false;
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
function newsContext(items,injury){
 const now=Date.now(),inj=String(injury||'').toLowerCase(),market=[],reasons=[];
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
  if(/ruled out|will miss|out for|placed on ir|inactive/.test(text)){directAdjustment=-7;directState='out';reasons.push('Latest direct report indicates the player is not expected to be available.')}
  else if(/doubtful|unlikely to play|uncertain to play/.test(text)){directAdjustment=-4;directState='doubtful';reasons.push('Latest direct report adds meaningful availability risk.')}
  else if(/ready to go|expected to play|will play|full practice|cleared|no injury designation/.test(text)){directAdjustment=1.5;directState='positive';reasons.push('Latest direct report is positive for availability.')}
  else if(/questionable|limited|did not practice|dnp|hamstring|ankle|shoulder|knee|groin/.test(text)){directAdjustment=-1.5;directState='questionable';reasons.push('Latest direct report adds some health volatility.')}
  if(/named starter|will start|starting role|starter going forward/.test(text)){directAdjustment=Math.min(7,directAdjustment+2.5);reasons.push('Latest direct report supports a stronger role.')}
  if(/benched|demoted|backup role|will not start/.test(text)){directAdjustment=Math.max(-7,directAdjustment-4);reasons.push('Latest direct report points to a reduced role.')}
 }
 let indirectAdjustment=0;
 const seenIndirect=new Set();
 for(const n of recent){
  const cats=Array.isArray(n.categories)?n.categories:[];
  if(cats.includes('trending')){market.push(n);continue}
  if(!cats.includes('indirect'))continue;
  const text=`${n.headline||''} ${n.summary||''} ${n.fantasy_impact||''}`.toLowerCase();
  const key=text.replace(/^indirect impact:[^—-]+[—-]s*/,'').slice(0,140);
  if(seenIndirect.has(key))continue;seenIndirect.add(key);
  if(/ready to go|expected to play|will play|returns?|cleared|activated/.test(text))indirectAdjustment-=1.25;
  else if(/ruled out|will miss|out for|doubtful|uncertain to play|injur|exits?|miss(ing|ed)?/.test(text))indirectAdjustment+=1.5;
 }
 indirectAdjustment=Math.max(-2.5,Math.min(2.5,indirectAdjustment));
 if(indirectAdjustment>=1.25)reasons.push('Teammate availability news may open additional opportunity.');
 if(indirectAdjustment<=-1.25)reasons.push('A teammate appears to be returning, which may tighten opportunity.');
 const adjustment=Math.max(-7,Math.min(7,directAdjustment+indirectAdjustment));
 return {adjustment,reasons:[...new Set(reasons)].slice(0,3),market:market.slice(0,2),direct,directState,directAdjustment,indirectAdjustment}
}
function teamContext(p){
 const rows=(teamStatus.get(normTeam(p.team))||[]).slice(),reasons=[];let adjustment=0;
 if(p.position!=='QB'){
  const qbs=rows.filter(x=>x.position==='QB').sort((a,b)=>(Number(a.search_rank)||9999)-(Number(b.search_rank)||9999));
  const qb=qbs[0],st=String(qb?.injury_status||qb?.status||'').toLowerCase();
  if(qb&&/(^|\b)(out|ir|pup|na|dnr|sus|suspended)(\b|$)/.test(st)){adjustment-=3;reasons.push(`${qb.full_name||'Top-listed team QB'} is currently unavailable, which lowers offensive stability.`)}
  else if(qb&&/doubtful/.test(st)){adjustment-=2;reasons.push(`${qb.full_name||'Top-listed team QB'} is doubtful.`)}
  else if(qb&&/questionable|limited|dnp/.test(st)){adjustment-=1;reasons.push(`${qb.full_name||'Top-listed team QB'} carries an injury designation.`)}
 }
 return {adjustment:Math.max(-4,Math.min(2,adjustment)),reasons}
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
 if(pos==='QB')return {ppr:E.fantasyPoints(s,'ppr'),yards:E.num(E.first(s,'pass_yd')),td:E.num(E.first(s,'pass_td'))};
 if(pos==='RB')return {ppr:E.fantasyPoints(s,'ppr'),yards:E.num(E.first(s,'rush_yd')),td:E.num(E.first(s,'rush_td'))};
 return {ppr:E.fantasyPoints(s,'ppr'),yards:E.num(E.first(s,'rec_yd')),td:E.num(E.first(s,'rec_td'))}
}
function matchupCacheKey(season,through){return `wh_start_sit_matchup_v2::${season}::${through}`}
function readMatchupCache(season,through){
 try{const x=JSON.parse(localStorage.getItem(matchupCacheKey(season,through))||'null');return x?.table?x:null}catch(_){return null}
}
async function buildMatchupReference(season,through){
 const cached=readMatchupCache(season,through);if(cached)return cached;
 const table={},positions=['QB','RB','WR','TE'];let attributed=0,skipped=0;
 const packs=await Promise.all(Array.from({length:through},async(_,i)=>{const w=i+1;const [sched,stats]=await Promise.all([scheduleFor(season,w),weekStats(season,w)]);return {sched,stats}}));
 const bucket=(team,pos)=>{table[team]??={};table[team][pos]??={games:0,totals:{ppr:0,yards:0,td:0},avg:{},ranks:{}};return table[team][pos]};
 for(const {sched,stats} of packs){
  for(const team of sched.keys())for(const pos of positions)bucket(team,pos).games++;
  for(const entry of statRows(Object.fromEntries(stats))){
   const pos=historicalPos(entry);if(!positions.includes(pos))continue;
   const team=historicalTeam(entry),game=sched.get(team);if(!team||!game?.opp){skipped++;continue}
   attributed++;
   const b=bucket(game.opp,pos),m=defenseMetrics(pos,entry.stats);b.totals.ppr+=m.ppr;b.totals.yards+=m.yards;b.totals.td+=m.td
  }
 }
 for(const byPos of Object.values(table))for(const b of Object.values(byPos)){b.avg.ppr=b.games?b.totals.ppr/b.games:0;b.avg.yards=b.games?b.totals.yards/b.games:0;b.avg.td=b.games?b.totals.td/b.games:0}
 for(const pos of positions)for(const metric of ['ppr','yards','td']){
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
function rankScore(d){
 const total=Number(d?.rankTotal)||32;
 const ranks=['ppr','yards','td'].map(k=>Number(d?.ranks?.[k])).filter(r=>r>0);
 if(!ranks.length||total<=1)return null;
 const avg=ranks.reduce((a,b)=>a+b,0)/ranks.length;
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
async function grade(id){
 const p=pool.get(String(id)),current=await history(id),priorPromise=priorHistory(id),newsPromise=loadNewsFor(p);
 const game=games.get(normTeam(p.team))||null,prior=await priorPromise,news=await newsPromise,custom=customMeta(id);
 const inj=injuryText(id),rank=whRank(id),newsCtx=newsContext(news,inj),teamCtx=teamContext(p),mu=matchupFor(p,game);
 const priorTeam=[...prior].reverse().map(s=>normTeam(textFirst(s,'team','tm','team_abbr'))).find(Boolean)||'',teamChanged=!!priorTeam&&priorTeam!==normTeam(p.team);
 const ownerProjection=custom.projection===''||custom.projection==null?null:Number(custom.projection),weeklyProjection=providerProjection(id);
 const rankWeight=slot==='SUPERFLEX'?.04:.14;
 const injuryRisk=availabilityRisk(inj,newsCtx);
 const g=E.startSitScoreV2({pos:p.position,currentStats:current,priorStats:prior,format,weeklyRank:rank,injuryStatus:inj,injuryRisk,ownerProjection,providerProjection:weeklyProjection,teamChanged,matchupScore:mu.score,matchupConfidence:mu.confidence,environment:{gameTotal:game?.total,teamImplied:game?.teamImplied,spread:game?.spread,home:game?.home},newsAdjustment:newsCtx.adjustment,contextAdjustment:teamCtx.adjustment,locked:!!game?.locked,bye:scheduleLoaded&&!game,rankWeight});
 return {id:String(id),p,current,prior,inj,injuryRisk,rank,weeklyProjection,g,confidence:confidence(g),game,news,newsCtx,teamCtx,mu,teamChanged,currentWork:workload(p.position,current,3),seasonWork:workload(p.position,current,0),priorWork:workload(p.position,prior,3)}
}

function edgeLabel(a,b){if(!a||a.g.score==null)return 'Not enough data';if(!b||b.g.score==null)return 'Data edge';const d=a.g.score-b.g.score,low=Math.min(a.confidence,b.confidence);if(low<45)return d>=6?'Lean · limited data':'Toss-up · limited data';if(d>=9)return 'Clear edge';if(d>=4)return 'Lean';return 'Toss-up'}
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
function sampleLabel(w,year){const n=Number(w?.games)||0;return n?`${year} avg · ${n} game${n===1?'':'s'}`:`${year} · no sample`}
function dataRows(rows){return rows.filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`<div class="drow"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
function workloadBox(title,w){
 const rows=[['PPR / G',fmt(w?.ppg,1)],['Snap %',w?.snap==null?null:pct(w.snap)],['Weighted opps',fmt(w?.opps,1)],['Targets / G',fmt(w?.targets,1)],['Carries / G',fmt(w?.carries,1)],['Routes / G',fmt(w?.routes,1)],['Red-zone / G',fmt(w?.rz,1)],['Goal-line / G',fmt(w?.goal,1)]];
 const html=dataRows(rows);return `<div class="data-box"><h4>${esc(title)}</h4>${html||'<div class="drow"><span>No supported workload fields</span><b>—</b></div>'}</div>`
}
function matchupBox(x){
 const d25=x.mu?.y2025,d26=x.mu?.y2026,r25=matchupRank(d25),r26=matchupRank(d26),rows=[
  ['Opponent',x.game?.opp||'—'],
  ['Blended grade',x.mu?.score==null?'—':`${x.mu.score}/100 · ${x.mu.label}`],
  ['2026 rank',r26?`#${r26}/${d26?.rankTotal||32}`:'—'],
  ['2026 PPR allowed / G',d26?fmt(d26.avg?.ppr,1):'—'],
  ['2026 sample',d26?.games?`${d26.games} game${d26.games===1?'':'s'}`:'—'],
  ['2025 rank',r25?`#${r25}/${d25?.rankTotal||32}`:'—'],
  ['2025 PPR allowed / G',d25?fmt(d25.avg?.ppr,1):'—'],
  ['2026 matchup weight',x.mu?.y2026?`${Math.round((x.mu.currentWeight||0)*100)}%`:'0%']
 ];
 return `<div class="data-box"><h4>Opponent vs ${esc(x.p.position)}</h4>${dataRows(rows)}</div>`
}
function projectionBox(x){
 const p=x.g?.projection||{},rows=[
  ['WH estimate',p.points==null?'—':`${fmt(p.points,1)} pts`],
  ['Floor – ceiling',p.floor==null?'—':`${fmt(p.floor,1)} – ${fmt(p.ceiling,1)}`],
  ['2026 model',p.currentBase==null?'—':fmt(p.currentBase,1)],
  ['2025 baseline',p.priorBase==null?'—':fmt(p.priorBase,1)],
  ['Projection blend',p.source==='blend'?`${Math.round((p.currentWeight||0)*100)}% 2026 / ${Math.round((p.priorWeight||0)*100)}% 2025`:p.source||'—'],
  ['Team changed',x.teamChanged?'Yes · 2025 discounted':'No']
 ];
 return `<div class="data-box"><h4>Projection foundation</h4>${dataRows(rows)}</div>`
}
function gameBox(x){
 const g=x.game,st=status.get(String(x.id))||{},rows=[
  ['Game',g?`${g.home?'vs':'@'} ${g.opp}`:'No game / bye'],
  ['Game total',g?.total?fmt(g.total,1):'—'],
  ['Team implied',g?.teamImplied?fmt(g.teamImplied,1):'—'],
  ['Spread',Number.isFinite(g?.spread)?`${g.spread>0?'+':''}${fmt(g.spread,1)}`:'—'],
  ['Weather',g?.weather||'Not supplied by ESPN scoreboard'],
  ['Player status',x.inj||'Active'],
  ['Status updated',st.updated_at?new Date(st.updated_at).toLocaleString():'—']
 ];
 return `<div class="data-box"><h4>Game & availability</h4>${dataRows(rows)}</div>`
}
function newsBox(x){
 const rows=(x.news||[]).filter(n=>!(Array.isArray(n.categories)&&n.categories.includes('trending'))).slice(0,4);
 if(!rows.length)return `<div class="data-box full"><h4>Relevant news</h4><div class="drow"><span>No recent matched player news</span><b>—</b></div></div>`;
 return `<div class="data-box full"><h4>Relevant news</h4>${rows.map(n=>`<div class="newsline"><b>${esc(n.headline||'Player update')}</b><small>${esc(n.provider||'Source')} · ${esc(n.published_at?new Date(n.published_at).toLocaleString():'')}</small></div>`).join('')}</div>`
}
function detailPanel(x){return `<details class="data"><summary>All supporting data</summary><div class="data-grid">${workloadBox(sampleLabel(x.currentWork,'2026'),x.currentWork)}${workloadBox(sampleLabel(x.priorWork,'2025'),x.priorWork)}${matchupBox(x)}${projectionBox(x)}${gameBox(x)}${newsBox(x)}</div></details>`}
function statCard(x,i){
 const g=x.g||{},p=x.p,proj=g.projection||{},inj=x.inj||'Active',game=x.game,rank=x.rank?`#${x.rank}`:'—',mu=x.mu||{};
 const role=g.role||{direction:'flat',label:'Not enough data'},score=g.score==null?'—':g.score;
 const badges=[
  `<span class="badge ${g.injuryPenalty?'bad':''}">${esc(inj)}</span>`,
  `<span class="badge ${matchupTone(mu.score)}">${esc(mu.label||'Matchup unknown')} matchup</span>`,
  `<span class="badge ${role.direction==='up'?'good':role.direction==='down'?'bad':''}">${esc(role.label||'Role unknown')}</span>`
 ].join('');
 const keyReasons=(g.reasons||[]).filter(r=>!/Projection blend:/.test(r)).slice(0,3);
 const gameLine=game?[game.total?`O/U ${fmt(game.total,1)}`:'',game.teamImplied?`Team ${fmt(game.teamImplied,1)}`:'',game.weather||''].filter(Boolean).join(' · '):'';
 return `<article class="card ${i===0&&g.eligible?'top':''}"><div class="phead"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(x.id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><div><h3>${esc(p.full_name)}</h3><small>${esc(p.position)} · ${esc(p.team||'FA')} · ${game?`${game.home?'vs':'@'} ${esc(game.opp)}`:(scheduleLoaded?'BYE':'Opponent unavailable')}</small></div><div class="score ${g.injuryPenalty>=.2?'bad':''}">${score}<span>Decision</span></div></div>${badges}<div class="metrics"><div class="metric"><b>${proj.points!=null?fmt(proj.points,1):'—'}</b><span>Projection</span></div><div class="metric"><b>${g.usage?.score??'—'}</b><span>Usage</span></div><div class="metric"><b class="${matchupTone(mu.score)}">${mu.score??'—'}</b><span>Matchup</span></div><div class="metric"><b>${rank}</b><span>WH rank</span></div><div class="metric"><b>${x.confidence??0}%</b><span>Confidence</span></div></div><div class="why"><strong>Why</strong><ul class="reasons">${keyReasons.length?keyReasons.map(r=>`<li>${esc(r)}</li>`).join(''):'<li>Not enough trustworthy evidence to add a specific driver.</li>'}</ul>${gameLine?`<div class="game">${esc(gameLine)}</div>`:''}</div>${detailPanel(x)}</article>`
}
async function compare(){
 const btn=document.querySelector('#ss-run'),st=document.querySelector('#ss-status');btn.disabled=true;st.textContent='Analyzing current evidence…';
 try{
  await ensureMatchups();
  const graded=await Promise.all(selected.map(grade));
  graded.sort((a,b)=>{const ae=!!a.g?.eligible&&!a.g?.locked,be=!!b.g?.eligible&&!b.g?.locked;if(ae!==be)return ae?-1:1;return (b.g?.score??-1)-(a.g?.score??-1)});
  const valid=graded.filter(x=>x.g?.eligible&&!x.g?.locked&&x.g?.score!=null),a=valid[0],b=valid[1];let hero;
  if(!a){
   hero='<div class="warning">None of the selected players is currently a valid lineup option. Bye, unavailable and already-started players are excluded from the recommendation.</div>';
  }else if(!b){
   hero=`<div class="winner"><small>ONLY ACTIONABLE OPTION</small><h2>Start ${esc(a.p.full_name)}</h2><p>${esc(a.p.full_name)} is the only selected player currently eligible for this lineup slot.</p></div>`;
  }else{
   const edge=edgeLabel(a,b),toss=edge.startsWith('Toss'),drivers=[];
   const ca=a.g.components||{},cb=b.g.components||{},labels={projection:'Projection',usage:'Usage',rank:'Workhorse rank',matchup:'Matchup',environment:'Game environment'};
   for(const k of Object.keys(labels)){if(ca[k]!=null&&cb[k]!=null&&ca[k]-cb[k]>=7)drivers.push(labels[k])}
   if((a.newsCtx?.adjustment||0)>(b.newsCtx?.adjustment||0)+1.5)drivers.push('News / availability');
   if((a.teamCtx?.adjustment||0)>(b.teamCtx?.adjustment||0)+1.5)drivers.push('Team / QB context');
   const headline=toss?'No forced pick':`Start ${esc(a.p.full_name)}`;
   const copy=toss?`${esc(a.p.full_name)} has the slight model edge, but the gap is too small to call it a strong recommendation.`:`${esc(a.p.full_name)} has the better full-evidence profile in this comparison.`;
   hero=`<div class="winner"><small>${esc(edge.toUpperCase())}</small><h2>${headline}</h2><p>${copy}</p>${drivers.length?`<div class="drivers">${[...new Set(drivers)].slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div>`;
  }
  const warnings=[];
  if(!scheduleLoaded)warnings.push('The current ESPN schedule could not be verified, so opponent, matchup and game-environment inputs were excluded rather than guessed.');
  if(!load(`wh_week_master_v3::${week}`,[]).length)warnings.push('Workhorse weekly rank is not initialized in this browser, so rank is excluded instead of being replaced with Sleeper ADP.');
  if(graded.some(x=>x.g?.eligible&&x.confidence<48))warnings.push('At least one eligible player has limited evidence coverage. Workhorse lowered confidence instead of filling missing stats with estimates.');
  if(graded.some(x=>x.mu?.y2026&&Number(x.mu.y2026.games)<2))warnings.push('A current-season defensive matchup sample is only one game, so 2025 still carries most of the matchup weight.');
  if(slot==='SUPERFLEX'&&graded.some(x=>x.p.position==='QB')&&graded.some(x=>x.p.position!=='QB'))warnings.push('Superflex mode compares QBs and skill players directly; weekly-rank weight is reduced so a 1QB ranking cannot dominate the decision.');
  document.querySelector('#ss-output').innerHTML=hero+`<div class="cards">${graded.map(statCard).join('')}</div>`+(warnings.length?`<div class="warning">${warnings.map(esc).join('<br>')}</div>`:'')+`<div class="source-note">Sources: Workhorse weekly rankings · Sleeper player stats and status · Workhorse news feed · ESPN schedule/odds. 2025 data is a fading baseline only. Unsupported or missing fields are shown as — and excluded from scoring.</div>`;
  st.textContent=`Week ${week} · ${format==='ppr'?'PPR':format==='half'?'Half PPR':'Standard'} · ${valid.length} actionable`;
 }catch(e){
  console.error(e);document.querySelector('#ss-output').innerHTML='<div class="warning">Workhorse could not verify enough of the requested evidence to complete this comparison. No recommendation was forced.</div>';st.textContent='Unavailable';
 }finally{btn.disabled=selected.length<2}
}
function bind(){document.querySelector('#ss-search').oninput=renderSearch;document.querySelector('#ss-results').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||selected.length>=4)return;selected.push(String(b.dataset.add));document.querySelector('#ss-search').value='';document.querySelector('#ss-results').classList.remove('open');renderPicked()};document.querySelector('#ss-picked').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected=selected.filter(x=>x!==String(b.dataset.remove));renderPicked()};document.querySelector('#slot-seg').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)switchSlot(b.dataset.slot)};document.querySelector('#format-seg').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===b))};document.querySelector('#ss-run').onclick=compare;document.addEventListener('click',e=>{if(!e.target.closest('.searchbox'))document.querySelector('#ss-results')?.classList.remove('open')})}
async function start(){styles();shell();bind();const st=document.querySelector('#ss-status');st.textContent='Loading current data…';try{await currentWeek();document.querySelector('#ss-week-pill').textContent=week;await Promise.all([loadPool(),loadStatus(),loadGames(),loadProjections()]);st.textContent=`Week ${week}`;renderPicked()}catch(e){console.error(e);st.textContent='Player data unavailable';document.querySelector('#ss-output').innerHTML='<div class="warning">Current player data could not be loaded. Workhorse will not guess.</div>'}}
start();
})();

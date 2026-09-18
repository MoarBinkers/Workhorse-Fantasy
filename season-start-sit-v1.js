(()=>{
'use strict';
if(window.__WH_START_SIT_V1__)return;window.__WH_START_SIT_V1__=true;
const E=window.WorkhorseDecisionEngine;if(!E){document.body.innerHTML='<div style="padding:40px;color:white">Workhorse decision engine could not load.</div>';return}
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co',KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k',SEASON=2026;
const qs=new URLSearchParams(location.search);let week=Math.min(18,Math.max(0,Number(qs.get('week')||0)||0)),format='ppr',slot='FLEX',selected=[];
const pool=new Map(),status=new Map(),weeks=new Map(),games=new Map(),newsCache=new Map(),teamStatus=new Map(),scheduleCache=new Map(),matchupCache={2025:null,2026:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normTeam=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const compatible=(p,s=slot)=>s==='SUPERFLEX'?['QB','RB','WR','TE'].includes(p.position):s==='FLEX'?['RB','WR','TE'].includes(p.position):p.position===s;
const token=v=>String(v||'').toLowerCase();
function load(k,f=[]){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function whRank(id){const a=load(`wh_week_master_v3::${week}`,[]);const i=Array.isArray(a)?a.map(String).indexOf(String(id)):-1;return i<0?null:i+1}
async function currentWeek(){if(week)return week;try{const r=await fetch('https://api.sleeper.app/v1/state/nfl',{cache:'no-store'});if(r.ok){const x=await r.json();week=Math.max(1,Math.min(18,Number(x?.week)||1));return week}}catch(_){}return week=1}
function ingest(data){const m=new Map();if(Array.isArray(data)){for(const r of data){const id=r?.player_id||r?.player?.player_id;if(id)m.set(String(id),r?.stats||r||{})}}else if(data&&typeof data==='object')for(const [id,r] of Object.entries(data))m.set(String(id),r?.stats||r||{});return m}

async function weekStats(season,w){
 const key=`${season}:${w}`;if(weeks.has(key))return weeks.get(key);
 let data=null;
 for(const u of [`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${w}`,`https://api.sleeper.com/stats/nfl/${season}/${w}?season_type=regular`]){
  try{const r=await fetch(u,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}
 }
 const m=ingest(data);weeks.set(key,m);return m
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
 games.clear();
 try{
  const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON}&seasontype=2&week=${week}`,{cache:'no-store'});if(!r.ok)return;
  const d=await r.json();
  for(const ev of d?.events||[]){
   const c=ev?.competitions?.[0],teams=c?.competitors||[],odds=c?.odds?.[0]||{},state=c?.status?.type?.state||'pre';
   for(const a of teams){
    const b=teams.find(x=>x!==a),tm=normTeam(a?.team?.abbreviation),opp=normTeam(b?.team?.abbreviation);
    if(!tm||!opp)continue;
    const total=Number(odds?.overUnder)||0,details=odds?.details||'',spread=parseSpread(details,tm);
    const teamImplied=total&&Number.isFinite(spread)?total/2-spread/2:null;
    games.set(tm,{opp,home:a?.homeAway==='home',total,details,date:ev?.date||'',state,locked:state!=='pre',spread,teamImplied})
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
 let adjustment=0;const reasons=[],market=[],now=Date.now(),inj=String(injury||'').toLowerCase();
 for(const n of items||[]){
  const age=(now-new Date(n.published_at||0).getTime())/86400000;if(!Number.isFinite(age)||age>7)continue;
  const cats=Array.isArray(n.categories)?n.categories:[],indirect=cats.includes('indirect'),trending=cats.includes('trending');
  const text=`${n.headline||''} ${n.summary||''} ${n.fantasy_impact||''}`.toLowerCase();
  if(trending){market.push(n);continue}
  if(indirect){
   if(/ready to go|expected to play|will play|returns?|cleared|activated/.test(text)){adjustment-=2;reasons.push('A teammate appears to be returning, which can tighten opportunity.')}
   else if(/ruled out|will miss|out for|doubtful|uncertain to play|injur|exits?|miss(ing|ed)?/.test(text)){adjustment+=2.5;reasons.push('Teammate availability news can open additional opportunity.')}
   continue
  }
  if(/ruled out|will miss|out for|placed on ir/.test(text)){if(!/out|ir|pup/.test(inj))adjustment-=7;reasons.push('Recent direct news indicates a major availability concern.')}
  else if(/doubtful|unlikely to play|uncertain to play/.test(text)){adjustment-=4;reasons.push('Recent direct news adds meaningful availability risk.')}
  else if(/questionable|limited|did not practice|dnp|hamstring|ankle|shoulder/.test(text)){adjustment-=2;reasons.push('Recent direct news adds some health volatility.')}
  if(/ready to go|expected to play|will play|full practice|cleared|no injury designation/.test(text)){adjustment+=1.5;reasons.push('Recent news is positive for availability.')}
  if(/named starter|will start|starting role|starter going forward/.test(text)){adjustment+=3;reasons.push('Recent news supports a stronger role.')}
  if(/benched|demoted|backup role|will not start/.test(text)){adjustment-=4;reasons.push('Recent news points to a reduced role.')}
 }
 return {adjustment:Math.max(-7,Math.min(7,adjustment)),reasons:[...new Set(reasons)].slice(0,3),market:market.slice(0,2)}
}
function teamContext(p){
 const rows=(teamStatus.get(normTeam(p.team))||[]).slice(),reasons=[];let adjustment=0;
 if(p.position!=='QB'){
  const qbs=rows.filter(x=>x.position==='QB').sort((a,b)=>(Number(a.search_rank)||9999)-(Number(b.search_rank)||9999));
  const qb=qbs[0],st=String(qb?.injury_status||'').toLowerCase();
  if(qb&&/out|ir|pup/.test(st)){adjustment-=5;reasons.push(`${qb.full_name||'Starting QB'} is ${qb.injury_status}, lowering offensive stability.`)}
  else if(qb&&/doubtful/.test(st)){adjustment-=3;reasons.push(`${qb.full_name||'Starting QB'} is doubtful.`)}
  else if(qb&&/questionable|limited|dnr/.test(st)){adjustment-=1.5;reasons.push(`${qb.full_name||'Starting QB'} carries an injury designation.`)}
 }
 return {adjustment:Math.max(-7,Math.min(7,adjustment)),reasons}
}
function confidence(g){return g?.confidence??0}

function statRows(data){
 const out=[];
 if(Array.isArray(data)){for(const row of data||[]){const id=String(row?.player_id||row?.player?.player_id||'');if(id)out.push({id,row,stats:row?.stats||row})}}
 else if(data&&typeof data==='object'){for(const [id,row] of Object.entries(data)){if(!id.startsWith('TEAM_'))out.push({id:String(id),row,stats:row?.stats||row})}}
 return out
}
function historicalTeam(entry){return normTeam(E.first(entry.row,'team','tm','team_abbr')||entry.row?.player?.team||E.first(entry.stats,'team','tm','team_abbr')||pool.get(entry.id)?.team||status.get(entry.id)?.team)}
function historicalPos(entry){return String(E.first(entry.row,'position','pos')||entry.row?.player?.position||E.first(entry.stats,'position','pos')||pool.get(entry.id)?.position||status.get(entry.id)?.position||'').toUpperCase()}
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
function readMatchupCache(season,through){
 const key=season===2025?'wh_matchup_reference_v2::2025':`wh_matchup_reference_v3::${season}::${through}`;
 try{const x=JSON.parse(localStorage.getItem(key)||'null');return x?.table?x:null}catch(_){return null}
}
async function buildMatchupReference(season,through){
 const cached=readMatchupCache(season,through);if(cached)return cached;
 const table={},positions=['QB','RB','WR','TE'];
 const packs=await Promise.all(Array.from({length:through},async(_,i)=>{const w=i+1;const [sched,stats]=await Promise.all([scheduleFor(season,w),weekStats(season,w)]);return {sched,stats}}));
 const bucket=(team,pos)=>{table[team]??={};table[team][pos]??={games:0,totals:{ppr:0,yards:0,td:0},avg:{},ranks:{}};return table[team][pos]};
 for(const {sched,stats} of packs){
  for(const team of sched.keys())for(const pos of positions)bucket(team,pos).games++;
  for(const entry of statRows(Object.fromEntries(stats))){
   const pos=historicalPos(entry);if(!positions.includes(pos))continue;
   const team=historicalTeam(entry),game=sched.get(team);if(!team||!game?.opp)continue;
   const b=bucket(game.opp,pos),m=defenseMetrics(pos,entry.stats);b.totals.ppr+=m.ppr;b.totals.yards+=m.yards;b.totals.td+=m.td
  }
 }
 for(const byPos of Object.values(table))for(const b of Object.values(byPos)){b.avg.ppr=b.games?b.totals.ppr/b.games:0;b.avg.yards=b.games?b.totals.yards/b.games:0;b.avg.td=b.games?b.totals.td/b.games:0}
 for(const pos of positions)for(const metric of ['ppr','yards','td']){
  const list=Object.entries(table).filter(([,x])=>x?.[pos]?.games).map(([team,x])=>({team,value:x[pos].avg[metric]})).sort((a,b)=>a.value-b.value);
  list.forEach((x,i)=>{table[x.team][pos].ranks[metric]=i+1;table[x.team][pos].rankTotal=list.length})
 }
 const built={season,through,generatedAt:Date.now(),table};
 try{localStorage.setItem(season===2025?'wh_matchup_reference_v2::2025':`wh_matchup_reference_v3::${season}::${through}`,JSON.stringify(built))}catch(_){}
 return built
}
async function ensureMatchups(){
 if(!matchupCache[2025])matchupCache[2025]=await buildMatchupReference(2025,18);
 const through=Math.max(0,week-1);
 if(through&&!matchupCache[2026])matchupCache[2026]=await buildMatchupReference(2026,through);
 return matchupCache
}
function rankScore(d){const r=Number(d?.ranks?.ppr),n=Number(d?.rankTotal)||32;return r>0&&n>1?Math.round((r-1)/(n-1)*100):null}
function matchupFor(p,game){
 if(!game?.opp)return {score:null,confidence:0,label:'No matchup data',y2025:null,y2026:null};
 const pos=p.position,opp=game.opp,d25=matchupCache[2025]?.table?.[opp]?.[pos]||null,d26=matchupCache[2026]?.table?.[opp]?.[pos]||null,s25=rankScore(d25),s26=rankScore(d26),games26=Number(d26?.games)||0;
 let w26=games26>=5?.70:games26===4?.60:games26===3?.50:games26===2?.40:games26===1?.25:0,score=null;
 if(s25!=null&&s26!=null)score=s25*(1-w26)+s26*w26;else score=s26??s25;
 const confidence=score==null?0:Math.round(Math.min(88,(s25!=null?48:28)+games26*8));
 return {score:score==null?null:Math.round(score),confidence,label:score==null?'Unknown':score>=66?'Favorable':score<=34?'Tough':'Neutral',opp,y2025:d25,y2026:d26,currentWeight:w26}
}
function avgMetric(stats,fn){const a=(stats||[]).filter(E.played).map(fn).filter(v=>v!=null&&Number.isFinite(Number(v)));return a.length?E.mean(a):null}
function workload(pos,stats){
 const a=(stats||[]).filter(E.played).slice(-3);
 return {
  games:a.length,snap:avgMetric(a,E.snapPct),targets:avgMetric(a,E.targets),carries:avgMetric(a,E.carries),
  routes:avgMetric(a,E.routes),rz:avgMetric(a,E.rz),goal:avgMetric(a,E.goalLine),opps:avgMetric(a,s=>E.opportunities(pos,s)),
  ppg:avgMetric(a,s=>E.fantasyPoints(s,format))
 }
}
async function grade(id){
 const p=pool.get(String(id)),current=await history(id),priorPromise=priorHistory(id),newsPromise=loadNewsFor(p);
 const game=games.get(normTeam(p.team))||null,prior=await priorPromise,news=await newsPromise,custom=customMeta(id);
 const inj=injuryText(id),rank=whRank(id),newsCtx=newsContext(news,inj),teamCtx=teamContext(p),mu=matchupFor(p,game);
 const priorTeam=[...prior].reverse().map(s=>normTeam(E.first(s,'team','tm','team_abbr'))).find(Boolean)||'',teamChanged=!!priorTeam&&priorTeam!==normTeam(p.team);
 const ownerProjection=custom.projection===''||custom.projection==null?null:Number(custom.projection);
 const rankWeight=slot==='SUPERFLEX'?.04:.14;
 const g=E.startSitScoreV2({pos:p.position,currentStats:current,priorStats:prior,format,weeklyRank:rank,injuryStatus:inj,ownerProjection,teamChanged,matchupScore:mu.score,matchupConfidence:mu.confidence,environment:{gameTotal:game?.total,teamImplied:game?.teamImplied,spread:game?.spread,home:game?.home},newsAdjustment:newsCtx.adjustment,contextAdjustment:teamCtx.adjustment,locked:!!game?.locked,bye:!game,rankWeight});
 return {id:String(id),p,current,prior,inj,rank,g,confidence:confidence(g),game,news,newsCtx,teamCtx,mu,teamChanged,currentWork:workload(p.position,current),priorWork:workload(p.position,prior)}
}

function edgeLabel(a,b){if(!a||a.g.score==null)return 'Not enough data';if(!b||b.g.score==null)return 'Data edge';const d=a.g.score-b.g.score,low=Math.min(a.confidence,b.confidence);if(low<45)return d>=6?'Lean · limited data':'Toss-up · limited data';if(d>=9)return 'Clear edge';if(d>=4)return 'Lean';return 'Toss-up'}
function styles(){document.head.insertAdjacentHTML('beforeend',`<style>
:root{color-scheme:dark;--bg:#071018;--panel:#0c1720;--line:#203543;--text:#eef5f8;--muted:#8195a3;--gold:#e8cb72;--green:#79dda0;--red:#ed8f99;--blue:#7bc9ff}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(circle at 75% -10%,#18354d 0,#09141d 34%,var(--bg) 70%);color:var(--text);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}button,input,select{font:inherit}.top{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;padding:13px clamp(15px,3vw,38px);border-bottom:1px solid #1b303d;background:#071018ee;backdrop-filter:blur(14px)}.brand{font-size:21px;font-weight:1000;letter-spacing:-.05em}.tag{font-size:8px;font-weight:950;letter-spacing:.12em;background:var(--gold);color:#071018;padding:5px 7px;border-radius:99px}.spacer{flex:1}.back{color:#c2d2dc;text-decoration:none;border:1px solid #2a4558;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:850}.shell{width:min(1080px,calc(100% - 28px));margin:auto;padding:42px 0 70px}.eyebrow{font-size:9px;color:var(--green);letter-spacing:.15em;font-weight:950}.hero h1{font-size:clamp(40px,6vw,68px);line-height:.96;letter-spacing:-.06em;margin:8px 0 12px}.hero p{max-width:760px;color:#90a4b2;font-size:13px;line-height:1.6}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:25px 0 16px}.control{padding:13px;border:1px solid var(--line);border-radius:12px;background:#0b1720}.control label{display:block;font-size:8px;letter-spacing:.1em;color:#8398a7;font-weight:950;text-transform:uppercase;margin-bottom:8px}.seg{display:flex;gap:5px;flex-wrap:wrap}.seg button{border:1px solid #2a4354;background:#0a151e;color:#9eb1be;border-radius:7px;padding:7px 9px;font-size:9px;font-weight:900;cursor:pointer}.seg button.active{background:#eaf2f6;color:#071019;border-color:#eaf2f6}.searchbox{position:relative}.search{width:100%;border:1px solid #2b4558;border-radius:10px;background:#071119;color:#fff;padding:11px 12px;font-size:12px}.results{position:absolute;z-index:20;top:calc(100% + 5px);left:0;right:0;max-height:330px;overflow:auto;border:1px solid #294253;border-radius:10px;background:#091720;box-shadow:0 18px 50px #0009;display:none}.results.open{display:block}.res{width:100%;display:grid;grid-template-columns:38px 1fr auto;gap:9px;align-items:center;text-align:left;border:0;border-top:1px solid #172b36;background:transparent;color:#e9f1f5;padding:8px 10px;cursor:pointer}.res:first-child{border-top:0}.res:hover{background:#0d202b}.res img{width:34px;height:34px;border-radius:8px;object-fit:cover;object-position:center top}.res b{font-size:11px}.res small{color:#758b99;font-size:8px}.res em{font-style:normal;color:#81dda5;font-weight:1000}.picked{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 20px}.chip{display:flex;align-items:center;gap:8px;border:1px solid #2c4758;background:#0b1922;border-radius:9px;padding:7px 9px}.chip img{width:28px;height:28px;border-radius:7px;object-fit:cover;object-position:center top}.chip b{font-size:10px}.chip button{border:0;background:none;color:#879aa7;font-size:16px;cursor:pointer}.run{border:0;border-radius:10px;background:#eef5f8;color:#071019;padding:11px 15px;font-size:11px;font-weight:1000;cursor:pointer}.run:disabled{opacity:.4;cursor:not-allowed}.status{margin-left:9px;color:#778d9b;font-size:9px}.winner{margin-top:22px;border:1px solid #435b3a;border-left:4px solid var(--green);border-radius:14px;background:linear-gradient(120deg,#102218,#0a1720 58%);padding:17px}.winner small{font-size:8px;letter-spacing:.12em;color:#90ddaa;font-weight:950}.winner h2{margin:6px 0;font-size:25px;letter-spacing:-.04em}.winner p{margin:0;color:#a3b5bf;font-size:11px;line-height:1.5}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.card{border:1px solid var(--line);border-radius:13px;background:#0a151e;padding:14px}.card.top{border-color:#3a5e49}.phead{display:grid;grid-template-columns:45px 1fr auto;gap:10px;align-items:center}.phead img{width:43px;height:43px;border-radius:10px;object-fit:cover;object-position:center top}.phead h3{margin:0;font-size:15px}.phead small{color:#768b98;font-size:8px}.score{font-size:24px;font-weight:1000;color:#f1d580}.score span{display:block;color:#708591;font-size:7px;text-align:right}.bad{color:var(--red)!important}.good{color:var(--green)!important}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0}.metric{border:1px solid #1c303b;border-radius:8px;padding:8px;background:#08141b}.metric b{font-size:13px}.metric span{display:block;margin-top:3px;color:#708692;font-size:7px;text-transform:uppercase}.reasons{margin:10px 0 0;padding-left:17px;color:#97aab5;font-size:9px;line-height:1.55}.game{margin-top:9px;padding-top:9px;border-top:1px solid #1a2e39;color:#8095a1;font-size:8px}.warning{margin-top:14px;border:1px solid #5f4931;border-radius:10px;background:#1c160d;padding:10px;color:#d8bd83;font-size:9px;line-height:1.5}.empty{margin-top:22px;border:1px dashed #2a4251;border-radius:12px;padding:25px;text-align:center;color:#748a98;font-size:11px}@media(max-width:720px){.controls,.cards{grid-template-columns:1fr}.shell{padding-top:30px}.hero h1{font-size:46px}.phead{grid-template-columns:42px 1fr auto}}
</style>`)}
function shell(){document.body.innerHTML=`<header class="top"><div class="brand">WORKHORSE</div><span class="tag">START / SIT</span><div class="spacer"></div><a class="back" href="./sandbox.html?view=tools">← Tools</a></header><main class="shell"><section class="hero"><div class="eyebrow">WORKHORSE DECISION ENGINE</div><h1>Make the call.<br>Know why.</h1><p>This tool weighs recent production, available workload data, role movement, your Workhorse weekly ranking, and live injury status. Missing data is excluded instead of guessed.</p></section><section class="controls"><div class="control"><label>Lineup slot</label><div class="seg" id="slot-seg">${['FLEX','SUPERFLEX','QB','RB','WR','TE'].map(x=>`<button data-slot="${x}" class="${x===slot?'active':''}">${x}</button>`).join('')}</div></div><div class="control"><label>Scoring</label><div class="seg" id="format-seg">${[['ppr','PPR'],['half','Half PPR'],['standard','Standard']].map(([x,l])=>`<button data-format="${x}" class="${x===format?'active':''}">${l}</button>`).join('')}</div></div></section><div class="searchbox"><input id="ss-search" class="search" placeholder="Add 2–4 players…" autocomplete="off"><div id="ss-results" class="results"></div></div><div id="ss-picked" class="picked"></div><button id="ss-run" class="run" disabled>Compare Players</button><span id="ss-status" class="status"></span><section id="ss-output"><div class="empty">Choose at least two eligible players.</div></section></main>`}
function renderSearch(){const q=token(document.querySelector('#ss-search')?.value).trim(),box=document.querySelector('#ss-results');if(!box)return;if(!q){box.classList.remove('open');box.innerHTML='';return}const picked=new Set(selected),matches=[...pool.values()].filter(p=>compatible(p)&&!picked.has(String(p.player_id))&&token(`${p.full_name} ${p.team} ${p.position}`).includes(q)).slice(0,25);box.innerHTML=matches.map(p=>`<button class="res" data-add="${esc(p.player_id)}"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(p.player_id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><span><b>${esc(p.full_name)}</b><br><small>${esc(p.position)} · ${esc(p.team||'FA')}</small></span><em>＋</em></button>`).join('')||'<div style="padding:13px;color:#758b99;font-size:9px">No eligible matches.</div>';box.classList.add('open')}
function renderPicked(){const box=document.querySelector('#ss-picked');box.innerHTML=selected.map(id=>{const p=pool.get(id);return `<div class="chip"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><b>${esc(p?.full_name||'Player')}</b><button data-remove="${esc(id)}" aria-label="Remove">×</button></div>`}).join('');document.querySelector('#ss-run').disabled=selected.length<2}
function switchSlot(next){slot=next;selected=selected.filter(id=>{const p=pool.get(id);return p&&compatible(p,next)});document.querySelectorAll('[data-slot]').forEach(b=>b.classList.toggle('active',b.dataset.slot===slot));renderPicked();renderSearch();document.querySelector('#ss-output').innerHTML='<div class="empty">Choose at least two eligible players.</div>'}
function statCard(x,i){const g=x.g,p=x.p,proj=g.projection,inj=x.inj||'Active',game=x.game,rank=x.rank?`#${x.rank}`:'—';return `<article class="card ${i===0?'top':''}"><div class="phead"><img src="https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(x.id)}.jpg" onerror="this.style.visibility='hidden'" alt=""><div><h3>${esc(p.full_name)}</h3><small>${esc(p.position)} · ${esc(p.team||'FA')} · ${game?`${game.home?'vs':'@'} ${esc(game.opp)}`:'Opponent unavailable'}</small></div><div class="score ${g.injuryPenalty>=.28?'bad':''}">${g.score??'—'}<span>Decision score</span></div></div><div class="metrics"><div class="metric"><b>${proj.points!=null?proj.points.toFixed(1):'—'}</b><span>WH estimate</span></div><div class="metric"><b>${g.usage.score??'—'}</b><span>Usage</span></div><div class="metric"><b>${rank}</b><span>WH weekly rank</span></div><div class="metric"><b>${x.confidence}%</b><span>Confidence</span></div><div class="metric"><b class="${g.role.direction==='up'?'good':g.role.direction==='down'?'bad':''}">${esc(g.role.label.replace('Major ',''))}</b><span>Role</span></div><div class="metric"><b class="${g.injuryPenalty?'bad':''}">${esc(inj)}</b><span>Status</span></div></div><ul class="reasons">${g.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>${game?`<div class="game">${game.total?`Game total ${game.total} · `:''}${esc(game.details||'Schedule context available')}</div>`:''}</article>`}
async function compare(){
 const btn=document.querySelector('#ss-run'),st=document.querySelector('#ss-status');btn.disabled=true;st.textContent='Analyzing…';
 try{
  const graded=await Promise.all(selected.map(grade));graded.sort((a,b)=>(b.g.score??-1)-(a.g.score??-1));
  const valid=graded.filter(x=>x.g.score!=null),a=valid[0],b=valid[1];let hero;
  if(!a){
   hero='<div class="warning">There is not enough completed 2026 game data to make a trustworthy call yet.</div>';
  }else{
   const edge=edgeLabel(a,b),inj=a.inj?` ${a.p.full_name} is currently listed ${a.inj}.`:'';
   const headline=edge.startsWith('Toss')?'No forced pick':`Start ${esc(a.p.full_name)}`;
   const copy=edge.startsWith('Toss')?`The model gap is too small to pretend there is a clear answer. ${esc(a.p.full_name)} currently has the slight edge.`:`${esc(a.p.full_name)} has the strongest combined projection, role, usage and Workhorse-rank profile in this comparison.`;
   hero=`<div class="winner"><small>${esc(edge.toUpperCase())}</small><h2>${headline}</h2><p>${copy}${esc(inj)}</p></div>`;
  }
  const warnings=[];
  if(!load(`wh_week_master_v3::${week}`,[]).length)warnings.push('Workhorse weekly rankings are not initialized in this sandbox yet, so the model excluded weekly rank instead of substituting Sleeper ADP.');
  if(graded.some(x=>x.confidence<45))warnings.push('At least one player has limited usable 2026 data, so confidence is reduced.');
  if(slot==='SUPERFLEX'&&graded.some(x=>x.p.position==='QB')&&graded.some(x=>x.p.position!=='QB'))warnings.push('Superflex comparison is enabled; QB and skill-position scoring are intentionally being compared in the same lineup slot.');
  document.querySelector('#ss-output').innerHTML=hero+`<div class="cards">${graded.map(statCard).join('')}</div>`+(warnings.length?`<div class="warning">${warnings.map(esc).join('<br>')}</div>`:'');
  st.textContent=`Week ${week} · ${format==='ppr'?'PPR':format==='half'?'Half PPR':'Standard'}`;
 }catch(e){
  console.error(e);document.querySelector('#ss-output').innerHTML='<div class="warning">Workhorse could not complete this comparison. No recommendation was forced.</div>';st.textContent='Unavailable';
 }finally{btn.disabled=selected.length<2}
}
function bind(){document.querySelector('#ss-search').oninput=renderSearch;document.querySelector('#ss-results').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||selected.length>=4)return;selected.push(String(b.dataset.add));document.querySelector('#ss-search').value='';document.querySelector('#ss-results').classList.remove('open');renderPicked()};document.querySelector('#ss-picked').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected=selected.filter(x=>x!==String(b.dataset.remove));renderPicked()};document.querySelector('#slot-seg').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)switchSlot(b.dataset.slot)};document.querySelector('#format-seg').onclick=e=>{const b=e.target.closest('[data-format]');if(!b)return;format=b.dataset.format;document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===b))};document.querySelector('#ss-run').onclick=compare;document.addEventListener('click',e=>{if(!e.target.closest('.searchbox'))document.querySelector('#ss-results')?.classList.remove('open')})}
async function start(){styles();shell();bind();const st=document.querySelector('#ss-status');st.textContent='Loading current data…';try{await currentWeek();await Promise.all([loadPool(),loadStatus(),loadGames()]);st.textContent=`Week ${week}`;renderPicked()}catch(e){console.error(e);st.textContent='Player data unavailable';document.querySelector('#ss-output').innerHTML='<div class="warning">Current player data could not be loaded. Workhorse will not guess.</div>'}}
start();
})();

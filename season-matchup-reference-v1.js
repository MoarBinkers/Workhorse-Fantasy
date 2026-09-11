(()=>{
'use strict';
if(window.__WH_MATCHUP_REFERENCE_V1__)return;
window.__WH_MATCHUP_REFERENCE_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
if(type!=='weekly')return;

const CURRENT_SEASON=2026,REF_SEASON=2025;
const week=Math.max(1,Math.min(18,Number(qs.get('week')||((document.querySelector('.weeklabel')?.textContent||'').match(/(\d+)/)?.[1]))||1));
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const CACHE_KEY='wh_matchup_reference_v1::2025';
const POSITIONS=['QB','RB','WR','TE'];
const pool=new Map();
let currentSchedule=new Map(),reference=null,selectedId='',decorateQueued=false,detailQueued=false;

const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=(v,d=1)=>{const n=num(v);return Number.isInteger(n)?String(n):n.toFixed(d)};
const first=(o,...keys)=>{for(const k of keys)if(o&&o[k]!=null&&o[k]!=='')return o[k];return null};
const norm=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function ppr(s){const d=first(s,'pts_ppr','fpts_ppr','fantasy_points_ppr');if(d!=null)return num(d);return num(first(s,'rec'))+num(first(s,'pass_yd'))*.04+num(first(s,'pass_td'))*4-num(first(s,'pass_int','int'))*2+num(first(s,'rush_yd'))*.1+num(first(s,'rush_td'))*6+num(first(s,'rec_yd'))*.1+num(first(s,'rec_td'))*6+num(first(s,'pass_2pt'))*2+num(first(s,'rush_2pt'))*2+num(first(s,'rec_2pt'))*2-num(first(s,'fum_lost','fumbles_lost'))*2}
function metricValues(pos,s){
 const passY=num(first(s,'pass_yd')),passTD=num(first(s,'pass_td')),rushY=num(first(s,'rush_yd')),rushTD=num(first(s,'rush_td')),rec=num(first(s,'rec')),recY=num(first(s,'rec_yd')),recTD=num(first(s,'rec_td')),tgt=num(first(s,'rec_tgt','targets')),rushAtt=num(first(s,'rush_att'));
 if(pos==='QB')return {ppr:ppr(s),yards:passY+rushY,td:passTD+rushTD,passYds:passY,passTD,rushYds:rushY,rushTD};
 if(pos==='RB')return {ppr:ppr(s),yards:rushY+recY,td:rushTD+recTD,rushAtt,rushYds:rushY,rushTD,targets:tgt,rec,recYds:recY,recTD};
 return {ppr:ppr(s),yards:recY+rushY,td:recTD+rushTD,targets:tgt,rec,recYds:recY,recTD,rushYds:rushY,rushTD};
}
function metricKeys(pos){if(pos==='QB')return ['ppr','yards','td','passYds','passTD','rushYds','rushTD'];if(pos==='RB')return ['ppr','yards','td','rushAtt','rushYds','rushTD','targets','rec','recYds','recTD'];return ['ppr','yards','td','targets','rec','recYds','recTD','rushYds','rushTD']}
function metricLabel(k){return ({ppr:'PPR allowed',yards:'Total yards',td:'Total TD',passYds:'Pass yards',passTD:'Pass TD',rushAtt:'Carries',rushYds:'Rush yards',rushTD:'Rush TD',targets:'Targets',rec:'Receptions',recYds:'Rec yards',recTD:'Rec TD'})[k]||k}
function rankColor(rank,total=32){if(!rank)return'neutral';const cut=Math.max(1,Math.round(total/3));if(rank<=cut)return'red';if(rank>total-cut)return'green';return'yellow'}
function rankTitle(rank,total=32){if(!rank)return'No rank';return `#${rank} of ${total} · #1 toughest, #${total} easiest`}

async function json(urls){for(const url of urls){try{const r=await fetch(url,{cache:'no-store'});if(r.ok)return await r.json()}catch(_){}}return null}
async function loadPool(){try{const path='sleeper_adp_current?select=player_id,position,team,full_name&format=eq.ppr&order=sleeper_rank.asc&limit=500';const r=await fetch(SB+'/rest/v1/'+path,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});if(r.ok)for(const p of await r.json())if(p?.player_id)pool.set(String(p.player_id),p)}catch(e){console.warn('[Workhorse matchup] player pool unavailable',e)}}
function parseSchedule(data){const map=new Map();for(const ev of data?.events||[]){const comp=ev?.competitions?.[0],teams=comp?.competitors||[];if(teams.length<2)continue;for(const a of teams){const b=teams.find(x=>x!==a),team=norm(a?.team?.abbreviation),opp=norm(b?.team?.abbreviation);if(team&&opp)map.set(team,{opp,home:a?.homeAway==='home',date:ev?.date||'',status:comp?.status?.type?.description||''})}}return map}
async function scheduleFor(season,w){const data=await json([`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${w}`,`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?season=${season}&seasontype=2&week=${w}`]);return parseSchedule(data)}
function statRows(data){const out=[];if(Array.isArray(data)){for(const row of data||[]){const id=String(row?.player_id||row?.player?.player_id||'');if(id)out.push({id,row,stats:row?.stats||row})}}else if(data&&typeof data==='object'){for(const [id,row] of Object.entries(data)){if(!id.startsWith('TEAM_'))out.push({id:String(id),row,stats:row?.stats||row})}}return out}
async function statsFor(w){return json([`https://api.sleeper.com/stats/nfl/${REF_SEASON}/${w}?season_type=regular`,`https://api.sleeper.app/v1/stats/nfl/regular/${REF_SEASON}/${w}`])}
function getBucket(table,team,pos){table[team]??={};table[team][pos]??={games:0,totals:{},avg:{},ranks:{}};return table[team][pos]}
function historicalTeam(entry){const p=pool.get(entry.id)||{};return norm(first(entry.row,'team','tm','team_abbr')||entry.row?.player?.team||first(entry.stats,'team','tm','team_abbr')||p.team)}
function historicalPos(entry){const p=pool.get(entry.id)||{};return String(first(entry.row,'position','pos')||entry.row?.player?.position||first(entry.stats,'position','pos')||p.position||'').toUpperCase()}
async function buildReference(){
 try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(cached?.season===REF_SEASON&&cached?.table)return cached}catch(_){ }
 const table={};
 const weeks=await Promise.all(Array.from({length:18},async(_,i)=>{const w=i+1;const [sched,stats]=await Promise.all([scheduleFor(REF_SEASON,w),statsFor(w)]);return {w,sched,stats}}));
 for(const {sched,stats} of weeks){
   for(const team of sched.keys())for(const pos of POSITIONS)getBucket(table,team,pos).games++;
   for(const entry of statRows(stats)){
     const pos=historicalPos(entry);if(!POSITIONS.includes(pos))continue;
     const team=historicalTeam(entry),game=sched.get(team);if(!team||!game?.opp)continue;
     const b=getBucket(table,game.opp,pos),vals=metricValues(pos,entry.stats);
     for(const [k,v] of Object.entries(vals))b.totals[k]=(b.totals[k]||0)+num(v);
   }
 }
 for(const [team,byPos] of Object.entries(table))for(const [pos,b] of Object.entries(byPos)){for(const k of metricKeys(pos))b.avg[k]=b.games?num(b.totals[k])/b.games:0}
 for(const pos of POSITIONS){
   for(const key of metricKeys(pos)){
     const list=Object.entries(table).filter(([,v])=>v?.[pos]?.games).map(([team,v])=>({team,value:num(v[pos].avg[key])})).sort((a,b)=>a.value-b.value);
     list.forEach((x,i)=>{table[x.team][pos].ranks[key]=i+1;table[x.team][pos].rankTotal=list.length});
   }
 }
 const built={season:REF_SEASON,generatedAt:Date.now(),table};try{localStorage.setItem(CACHE_KEY,JSON.stringify(built))}catch(_){ }
 return built;
}
function rowInfo(row){const id=String(row?.dataset?.id||''),p=pool.get(id)||{};return {id,pos:String(p.position||row?.querySelector('.pos')?.textContent||'').trim().toUpperCase(),team:norm(p.team||((row?.querySelector('.meta')?.textContent||'').match(/\b([A-Z]{2,3})\b/)||[])[1]),name:p.full_name||row?.querySelector('.name')?.textContent?.trim()||'Player'}}
function compactHtml(def,pos,d,game){const total=d.rankTotal||32,overall=Math.round((num(d.ranks.ppr)+num(d.ranks.yards)+num(d.ranks.td))/3),overallClass=rankColor(overall,total),loc=game?.home?'vs':'@';return `<span class="wh-mu-opponent ${overallClass}">${loc} ${esc(def)}</span><span class="wh-mu-ref">25 ${esc(pos)}</span>${[['PPR','ppr'],['YDS','yards'],['TD','td']].map(([label,k])=>`<span class="wh-mu-chip ${rankColor(d.ranks[k],total)}" title="${esc(label)}: ${rankTitle(d.ranks[k],total)}">${label} #${d.ranks[k]||'—'}</span>`).join('')}`}
function decorateRows(){if(!reference)return;for(const row of document.querySelectorAll('#rank-rows .rank-row[data-id]')){const info=rowInfo(row);if(!info.team||!info.pos)continue;const game=currentSchedule.get(info.team),def=game?.opp,d=reference.table?.[def]?.[info.pos];let slot=row.querySelector('.wh-card-matchup');if(!game||!def||!d){slot?.remove();continue}const html=compactHtml(def,info.pos,d,game),sig=`${def}|${info.pos}|${d.ranks.ppr}|${d.ranks.yards}|${d.ranks.td}|${game.home}`;if(!slot){slot=document.createElement('div');slot.className='wh-card-matchup';row.querySelector('.player')?.appendChild(slot)}if(slot&&slot.dataset.sig!==sig){slot.dataset.sig=sig;slot.innerHTML=html}}}
function queueDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(()=>{decorateQueued=false;decorateRows()})}
function detailRows(pos,d){const keys=metricKeys(pos).filter(k=>!['yards','td'].includes(k));return keys.map(k=>`<tr><td>${esc(metricLabel(k))}</td><td>${fmt(d.avg[k]||0,1)}</td><td><span class="wh-ref-rank ${rankColor(d.ranks[k],d.rankTotal||32)}">#${d.ranks[k]||'—'}</span></td></tr>`).join('')}
function injectDetail(){detailQueued=false;if(!reference||!selectedId)return;const active=[...document.querySelectorAll('.wh-player-tab.active')].some(x=>/matchup/i.test(x.textContent||''));const body=document.querySelector('.wh-player-backdrop.open .wh-player-body')||document.querySelector('.wh-player-body');if(!active||!body)return;const row=document.querySelector(`#rank-rows .rank-row[data-id="${CSS.escape(selectedId)}"]`),info=rowInfo(row),game=currentSchedule.get(info.team),def=game?.opp,d=reference.table?.[def]?.[info.pos];body.querySelector('.wh-2025-ref')?.remove();if(!def||!d)return;const total=d.rankTotal||32,overall=Math.round((num(d.ranks.ppr)+num(d.ranks.yards)+num(d.ranks.td))/3),grade=rankColor(overall,total);const section=document.createElement('section');section.className='wh-2025-ref';section.innerHTML=`<div class="wh-ref-head"><div><small>2025 DEFENSE REFERENCE · VS ${esc(info.pos)}</small><h3>${esc(def)} matchup profile</h3><p>Last season's per-game allowance to ${esc(info.pos)}s. #1 = toughest, #${total} = easiest.</p></div><span class="wh-ref-grade ${grade}">${grade==='green'?'Favorable':grade==='red'?'Tough':'Neutral'}</span></div><div class="wh-ref-main">${[['PPR / G','ppr'],['Yards / G','yards'],['TD / G','td']].map(([label,k])=>`<div><strong>${fmt(d.avg[k]||0,1)}</strong><span>${label}</span><b class="${rankColor(d.ranks[k],total)}">#${d.ranks[k]||'—'}</b></div>`).join('')}</div><div class="wh-ref-table-wrap"><table class="wh-ref-table"><thead><tr><th>Category</th><th>Allowed / G</th><th>Defense rank</th></tr></thead><tbody>${detailRows(info.pos,d)}</tbody></table></div>`;body.appendChild(section)}
function queueDetail(){if(detailQueued)return;detailQueued=true;setTimeout(injectDetail,40)}
function addStyles(){if(document.querySelector('#wh-matchup-ref-css'))return;const s=document.createElement('style');s.id='wh-matchup-ref-css';s.textContent=`
/* Meaning-first weekly tier colors */
.wh-tier-0{color:#a5e8bd!important;border-color:#315a46!important;border-left-color:#5fd08a!important;background:linear-gradient(90deg,rgba(25,91,52,.38),rgba(13,35,23,.93) 55%,rgba(8,20,14,.46))!important;box-shadow:0 8px 25px rgba(0,0,0,.2),inset 0 0 28px rgba(91,208,137,.06)!important}.wh-tier-0 span{color:#b1efc7!important;border-color:#3f7658!important;background:#11291b!important;text-shadow:0 0 14px rgba(115,224,157,.16)!important}
.wh-tier-2{color:#f1ce75!important;border-color:#665426!important;border-left-color:#ddaF3f!important;background:linear-gradient(90deg,rgba(102,76,17,.35),rgba(36,28,12,.92) 55%,rgba(20,17,9,.44))!important}.wh-tier-2 span{color:#f3d785!important;border-color:#816b31!important;background:#28200d!important}
#rank-rows .wh-card-matchup{display:flex;align-items:center;gap:4px;min-width:0;margin-top:4px;height:15px;white-space:nowrap;overflow:hidden}.wh-mu-opponent,.wh-mu-ref,.wh-mu-chip{display:inline-flex;align-items:center;height:15px;border-radius:4px;font-size:7px;line-height:1;font-weight:950;letter-spacing:.025em}.wh-mu-opponent{padding:0 5px;border:1px solid #29404e;color:#c7d3da;background:#0c1921}.wh-mu-ref{padding:0 3px;color:#607887;font-size:6.5px}.wh-mu-chip{padding:0 4px;border:1px solid}.wh-mu-chip.green,.wh-mu-opponent.green{color:#98e0b2;border-color:#315c45;background:#102219}.wh-mu-chip.yellow,.wh-mu-opponent.yellow{color:#ead07d;border-color:#66562d;background:#211c10}.wh-mu-chip.red,.wh-mu-opponent.red{color:#e4a5ae;border-color:#67404a;background:#24151a}.wh-mu-chip.neutral,.wh-mu-opponent.neutral{color:#9cafbb;border-color:#384b58;background:#111c23}
.wh-2025-ref{margin-top:16px;padding-top:16px;border-top:1px solid #223743}.wh-ref-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}.wh-ref-head small{font-size:8px;color:#7f95a3;font-weight:950;letter-spacing:.1em}.wh-ref-head h3{margin:5px 0 0;font-size:17px}.wh-ref-head p{margin:5px 0 0;color:#748995;font-size:9px}.wh-ref-grade{padding:7px 9px;border-radius:7px;border:1px solid;font-size:9px;font-weight:950}.wh-ref-grade.green{color:#99e2b5;background:#102019;border-color:#315a46}.wh-ref-grade.yellow{color:#e4c784;background:#211c10;border-color:#66572c}.wh-ref-grade.red{color:#e5adb5;background:#211418;border-color:#614047}.wh-ref-main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}.wh-ref-main>div{position:relative;padding:10px;border:1px solid #203541;border-radius:9px;background:#0b171f}.wh-ref-main strong{display:block;font-size:15px}.wh-ref-main span{display:block;margin-top:4px;color:#718795;font-size:8px}.wh-ref-main b{position:absolute;right:8px;top:8px;font-size:8px}.wh-ref-main b.green,.wh-ref-rank.green{color:#88d9a7}.wh-ref-main b.yellow,.wh-ref-rank.yellow{color:#dec472}.wh-ref-main b.red,.wh-ref-rank.red{color:#df9ba5}.wh-ref-table-wrap{overflow:auto;border:1px solid #203541;border-radius:9px}.wh-ref-table{width:100%;border-collapse:collapse;font-size:9px}.wh-ref-table th{padding:8px;text-align:left;background:#0d1a22;color:#728794;font-size:8px;text-transform:uppercase}.wh-ref-table th:nth-child(n+2),.wh-ref-table td:nth-child(n+2){text-align:right}.wh-ref-table td{padding:8px;border-top:1px solid #172a35;color:#c3d0d7}.wh-ref-rank{font-weight:950}
@media(max-width:760px){#rank-rows .wh-card-matchup{gap:3px}.wh-mu-ref{display:none}.wh-mu-opponent,.wh-mu-chip{font-size:6.5px;padding-left:3px;padding-right:3px}.wh-ref-head{grid-template-columns:1fr}.wh-ref-grade{justify-self:start}.wh-ref-main{grid-template-columns:repeat(3,1fr)}}
`;document.head.appendChild(s)}
async function start(){addStyles();await loadPool();try{currentSchedule=await scheduleFor(CURRENT_SEASON,week)}catch(_){currentSchedule=new Map()}try{reference=await buildReference()}catch(e){console.warn('[Workhorse matchup] 2025 reference unavailable',e);return}queueDecorate();const obs=new MutationObserver(()=>{queueDecorate();queueDetail()});obs.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('click',e=>{const row=e.target.closest?.('#rank-rows .rank-row[data-id]');if(row&&!e.target.closest?.('.drag-handle,button,input,a'))selectedId=String(row.dataset.id||'');if(e.target.closest?.('.wh-player-tab')||row)queueDetail()},true)}
start();
})();

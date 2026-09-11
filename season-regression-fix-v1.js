(()=>{
'use strict';
if(window.__WH_REGRESSION_FIX_V1__)return;
window.__WH_REGRESSION_FIX_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
if(!['ros','weekly','my-rankings','season-rankings'].includes(route))return;
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):(route==='season-rankings'?'ros':route);
const weekly=type==='weekly';
let currentWeek=Math.max(1,Math.min(18,Number(qs.get('week')||((document.querySelector('.weeklabel')?.textContent||'').match(/(\d+)/)?.[1]))||1));
let selectedId='',syncingEdit=false,roleToken=0,panelQueued=false,matchupRetryKey='',matchupRetries=0;
const statCache=new Map(),scheduleCache=new Map();

const num=v=>Number.isFinite(Number(v))?Number(v):0;
const first=(o,...keys)=>{for(const k of keys)if(o&&o[k]!=null&&o[k]!=='')return o[k];return null};
const fmt=v=>Number.isInteger(num(v))?String(num(v)):num(v).toFixed(1);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());

function ppr(s){const d=first(s,'pts_ppr','fpts_ppr','fantasy_points_ppr');if(d!=null)return num(d);return num(first(s,'rec'))+num(first(s,'pass_yd'))*.04+num(first(s,'pass_td'))*4-num(first(s,'pass_int','int'))*2+num(first(s,'rush_yd'))*.1+num(first(s,'rush_td'))*6+num(first(s,'rec_yd'))*.1+num(first(s,'rec_td'))*6-num(first(s,'fum_lost','fumbles_lost'))*2}
function ownerOn(){return document.documentElement.classList.contains('wh-owner-control')}
function baseEditOn(btn){return !!btn&&(btn.classList.contains('active')||/done editing/i.test(btn.textContent||''))}
function syncBaseEditing(){
 const btn=document.querySelector('#edit-toggle');if(!btn||syncingEdit)return;
 const want=ownerOn(),have=baseEditOn(btn);
 if(want===have){if(want)document.querySelectorAll('#rank-rows .rank-row[data-id]').forEach(r=>r.classList.add('editable'));return}
 syncingEdit=true;
 btn.click();
 setTimeout(()=>{syncingEdit=false;if(ownerOn())document.querySelectorAll('#rank-rows .rank-row[data-id]').forEach(r=>r.classList.add('editable'))},30);
}

function rowMeta(id){const row=document.querySelector(`#rank-rows .rank-row[data-id="${CSS.escape(String(id))}"]`);return {row,pos:row?.querySelector('.pos')?.textContent?.trim()?.toUpperCase()||'',team:norm(((row?.querySelector('.meta')?.textContent||'').match(/\b([A-Z]{2,3})\b/)||[])[1]),name:row?.querySelector('.name')?.textContent?.trim()||'Player'}}
async function weekStats(w){if(statCache.has(w))return statCache.get(w);let data=null;for(const url of [`https://api.sleeper.app/v1/stats/nfl/regular/2026/${w}`,`https://api.sleeper.com/stats/nfl/2026/${w}?season_type=regular`]){try{const r=await fetch(url,{cache:'no-store'});if(r.ok){data=await r.json();break}}catch(_){}}const m=new Map();if(Array.isArray(data)){for(const x of data){const id=x?.player_id||x?.player?.player_id;if(id)m.set(String(id),x?.stats||x||{})}}else if(data&&typeof data==='object'){for(const [id,x] of Object.entries(data))m.set(String(id),x?.stats||x||{})}statCache.set(w,m);return m}
async function schedule(w){if(scheduleCache.has(w))return scheduleCache.get(w);const m=new Map();try{const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=${w}`,{cache:'no-store'});if(r.ok){const data=await r.json();for(const ev of data?.events||[]){const c=ev?.competitions?.[0],teams=c?.competitors||[],odds=c?.odds?.[0]||{};for(const a of teams){const b=teams.find(x=>x!==a),team=norm(a?.team?.abbreviation),opp=norm(b?.team?.abbreviation);if(team&&opp)m.set(team,{opp,home:a?.homeAway==='home',total:num(odds?.overUnder)||null,details:odds?.details||''})}}}}catch(_){}scheduleCache.set(w,m);return m}
function roleMetric(pos,s){if(pos==='QB')return [['Pass attempts',num(first(s,'pass_att'))],['Rush attempts',num(first(s,'rush_att'))]];if(pos==='RB')return [['Carries',num(first(s,'rush_att'))],['Targets',num(first(s,'rec_tgt','targets'))]];return [['Targets',num(first(s,'rec_tgt','targets'))],['Receptions',num(first(s,'rec'))]]}
function roleStyles(){if(document.querySelector('#wh-role-fix-css'))return;const s=document.createElement('style');s.id='wh-role-fix-css';s.textContent=`
.wh-role-fixed{margin-top:18px;padding-top:15px;border-top:1px solid #1c303d}.wh-role-fixed-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}.wh-role-fixed-head strong{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#9eb1bd}.wh-role-fixed-head small{font-size:8px;color:#607887}.wh-role-fixed-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.wh-role-fixed-card{border:1px solid #1d303d;border-radius:9px;background:#0a171f;padding:10px}.wh-role-fixed-card b{font-size:15px}.wh-role-fixed-card span{display:block;margin-top:4px;font-size:8px;color:#778b98}.wh-role-fixed-note{border:1px solid #243a49;border-radius:9px;background:#09151d;padding:11px;color:#879aa7;font-size:9px}.wh-role-fixed-env{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.wh-role-fixed-env span{padding:6px 8px;border:1px solid #284050;border-radius:7px;background:#0b1821;font-size:8px;color:#9aafbc}@media(max-width:700px){.wh-role-fixed-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function removeBrokenRoleBlocks(body){
 for(const block of [...body.querySelectorAll('.wh-insight-block')]){const head=block.querySelector('.wh-insight-head strong');if(/role\s*trend/i.test(head?.textContent||''))block.remove()}
}
function ensureRoleSentinel(body,id){let x=body.querySelector('[data-wh-role-for]');if(!x){x=document.createElement('span');x.hidden=true;x.dataset.whRoleFor=String(id);x.dataset.whRoleSentinel='1';body.appendChild(x)}else x.dataset.whRoleFor=String(id)}
async function renderStableRole(body,id){
 roleStyles();removeBrokenRoleBlocks(body);ensureRoleSentinel(body,id);
 const existing=body.querySelector('.wh-role-fixed');if(existing?.dataset.playerId===String(id))return;existing?.remove();
 const token=++roleToken,meta=rowMeta(id),start=Math.max(1,currentWeek-4),logs=[];
 for(let w=start;w<=currentWeek;w++){const m=await weekStats(w),s=m.get(String(id));if(s&&(ppr(s)!==0||num(first(s,'pass_att','rush_att','rec_tgt','targets','rec'))>0))logs.push({w,s})}
 if(token!==roleToken||selectedId!==String(id))return;
 const panel=document.querySelector('.wh-player-backdrop.open'),active=panel?.querySelector('.wh-player-tab.active'),currentBody=panel?.querySelector('.wh-player-body');if(!panel||currentBody!==body||!active||active.textContent.trim()!=='Overview')return;
 removeBrokenRoleBlocks(body);ensureRoleSentinel(body,id);
 const section=document.createElement('section');section.className='wh-role-fixed';section.dataset.playerId=String(id);section.dataset.whNoEdit='';
 if(!logs.length){section.innerHTML='<div class="wh-role-fixed-head"><strong>Role trend</strong><small>2026</small></div><div class="wh-role-fixed-note">No 2026 role sample yet.</div>';body.appendChild(section);return}
 const last=logs[logs.length-1].s,[a,b]=roleMetric(meta.pos,last),game=(await schedule(currentWeek)).get(meta.team);if(token!==roleToken||selectedId!==String(id))return;
 section.innerHTML=`<div class="wh-role-fixed-head"><strong>Role trend</strong><small>Last ${logs.length} played · 2026</small></div><div class="wh-role-fixed-grid"><div class="wh-role-fixed-card"><b>${fmt(a[1])}</b><span>${esc(a[0])} last game</span></div><div class="wh-role-fixed-card"><b>${fmt(b[1])}</b><span>${esc(b[0])} last game</span></div><div class="wh-role-fixed-card"><b>${fmt(ppr(last))}</b><span>PPR last game</span></div></div>${game?`<div class="wh-role-fixed-env"><span>${game.home?'vs':'@'} ${esc(game.opp)}</span>${game.total?`<span>Game total ${fmt(game.total)}</span>`:''}${game.details?`<span>${esc(game.details)}</span>`:''}</div>`:''}`;
 body.appendChild(section);
}

function matchupRecovery(panel){
 if(!weekly)return;
 const active=panel?.querySelector('.wh-player-tab.active');if(!active||active.textContent.trim()!=='Matchup')return;
 const body=panel.querySelector('.wh-player-body');if(!body)return;
 removeBrokenRoleBlocks(body);body.querySelector('.wh-role-fixed')?.remove();body.querySelector('[data-wh-role-sentinel]')?.remove();
 if(body.querySelector('.wh-2025-ref')){matchupRetries=0;return}
 const key=selectedId||panel.querySelector('.wh-player-title h2')?.textContent||'player';if(matchupRetryKey!==key){matchupRetryKey=key;matchupRetries=0}
 if(matchupRetries>=2)return;matchupRetries++;
 setTimeout(()=>{const p=document.querySelector('.wh-player-backdrop.open');const tab=p?.querySelector('.wh-player-tab[data-player-tab="matchup"]');if(p&&tab&&tab.classList.contains('active')&&!p.querySelector('.wh-2025-ref'))tab.click()},matchupRetries===1?180:650);
}
function stabilizePanel(){panelQueued=false;const panel=document.querySelector('.wh-player-backdrop.open');if(!panel)return;const active=panel.querySelector('.wh-player-tab.active'),body=panel.querySelector('.wh-player-body');if(!active||!body)return;const label=active.textContent.trim();if(label==='Overview'&&selectedId){renderStableRole(body,selectedId)}else{roleToken++;removeBrokenRoleBlocks(body);body.querySelector('.wh-role-fixed')?.remove();body.querySelector('[data-wh-role-sentinel]')?.remove();if(label==='Matchup')matchupRecovery(panel)}}
function queuePanel(){if(panelQueued)return;panelQueued=true;requestAnimationFrame(stabilizePanel)}
function start(){
 roleStyles();syncBaseEditing();
 window.addEventListener('workhorse:owner-mode-changed',()=>setTimeout(syncBaseEditing,0));
 document.addEventListener('click',e=>{const row=e.target.closest?.('#rank-rows .rank-row[data-id]');if(row&&!e.target.closest?.('button,input,a,label,.drag-handle,.precision'))selectedId=String(row.dataset.id||'');setTimeout(()=>{syncBaseEditing();queuePanel()},0)},true);
 const obs=new MutationObserver(()=>{syncBaseEditing();queuePanel()});obs.observe(document.documentElement,{childList:true,subtree:true});
 setInterval(syncBaseEditing,900);
}
start();
})();
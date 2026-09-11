(()=>{
'use strict';
if(window.__WH_OWNER_CONTROL_V1__)return;
window.__WH_OWNER_CONTROL_V1__=true;
const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
if(!['ros','weekly','my-rankings','season-rankings'].includes(route))return;
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):(route==='season-rankings'?'ros':route);
const week=Math.max(1,Math.min(18,Number(qs.get('week')||1)||1));
const REF='ytfwbvdzhrebupcftmhs',SB='https://ytfwbvdzhrebupcftmhs.supabase.co',KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k',AUTH='sb-'+REF+'-auth-token';
const orderKey=route==='my-rankings'?(type==='weekly'?`wh_my_week_v3::${week}`:'wh_my_ros_v3'):(type==='weekly'?`wh_week_master_v3::${week}`:'wh_ros_master_v3');
let authorized=false,queued=false;
function tokenFind(v,d=0){if(d>6||v==null)return'';if(typeof v==='string'){if(v.startsWith('eyJ')&&v.split('.').length===3)return v;try{return tokenFind(JSON.parse(v),d+1)}catch(_){return''}}if(Array.isArray(v)){for(const x of v){const t=tokenFind(x,d+1);if(t)return t}return''}if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;for(const k of ['currentSession','session','data','value'])if(k in v){const t=tokenFind(v[k],d+1);if(t)return t}}return''}
function token(){try{return tokenFind(localStorage.getItem(AUTH))}catch(_){return''}}
async function owner(){const t=token();if(!t)return false;try{const r=await fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+t,Accept:'application/json'},cache:'no-store'});if(!r.ok)return false;const u=await r.json();return u?.app_metadata?.workhorse_role==='owner'}catch(_){return false}}
function order(){try{const a=JSON.parse(localStorage.getItem(orderKey)||'[]');return Array.isArray(a)?a.map(String):[]}catch(_){return[]}}
function rankOf(id,row){const a=order(),i=a.indexOf(String(id));if(i>=0)return i+1;const b=row?.querySelector('.rank-area>b');return Number(b?.dataset?.overallRank||b?.textContent||0)||1}
function styles(){if(document.querySelector('#wh-owner-control-css'))return;const s=document.createElement('style');s.id='wh-owner-control-css';s.textContent=`
html.wh-owner-control #rank-rows .precision{display:flex!important}
html.wh-owner-control #rank-rows .rank-row{position:relative}
html.wh-owner-control #rank-rows .rank-row.editable .drag-handle{display:grid!important;pointer-events:auto!important;opacity:1!important}
html.wh-owner-control #rank-rows .rank-row.wh-player-unavailable .drag-handle{pointer-events:auto!important;opacity:.55!important;cursor:grab!important}
.wh-owner-control-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #2d6547;border-radius:8px;background:#0d2118;color:#9be5b7;font-size:8px;font-weight:1000;letter-spacing:.08em;white-space:nowrap}
.wh-owner-control-badge:before{content:"";width:6px;height:6px;border-radius:50%;background:#6fe09a;box-shadow:0 0 10px #6fe09a88}
html.wh-owner-control #edit-toggle{border-color:#2d6547!important;background:#0d2118!important;color:#9be5b7!important}
`;
document.head.appendChild(s)}
function ensureBadge(){const actions=document.querySelector('.hero-actions');if(!actions||actions.querySelector('.wh-owner-control-badge'))return;const b=document.createElement('span');b.className='wh-owner-control-badge';b.dataset.whNoEdit='';b.textContent='OWNER CONTROL · ALWAYS ON';actions.prepend(b);const t=document.querySelector('#edit-toggle');if(t){t.classList.add('active');t.textContent='Owner Control On';t.title='Owner ranking controls stay enabled in Sandbox.'}}
function ensureRow(row){const id=String(row.dataset.id||'');if(!id)return;row.classList.add('editable');row.dataset.whOwnerEditable='1';const area=row.querySelector('.rank-area');if(area&&!area.querySelector('.drag-handle')){const h=document.createElement('button');h.className='drag-handle';h.type='button';h.title='Drag to reorder';h.setAttribute('aria-label','Drag player');h.textContent='⋮⋮';area.prepend(h)}
 if(!row.querySelector('.precision')){const p=document.createElement('div');p.className='precision wh-owner-precision';p.dataset.whNoEdit='';const r=rankOf(id,row);p.innerHTML=`<button data-up="${id}" title="Move up">↑</button><button data-down="${id}" title="Move down">↓</button><label>#<input data-rank="${id}" value="${r}" inputmode="numeric" aria-label="Move player to exact rank"></label>`;row.appendChild(p)}
}
function apply(){queued=false;if(!authorized)return;styles();document.documentElement.classList.add('wh-owner-control');ensureBadge();document.querySelectorAll('#rank-rows .rank-row[data-id]').forEach(ensureRow)}
function queue(){if(queued)return;queued=true;requestAnimationFrame(apply)}
function protectToggle(e){if(!authorized)return;const t=e.target.closest?.('#edit-toggle');if(!t)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();t.classList.add('active');t.textContent='Owner Control On';queue()}
async function start(){authorized=await owner();if(!authorized)return;document.addEventListener('click',protectToggle,true);queue();const obs=new MutationObserver(queue);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(queue,1200)}
start();
})();
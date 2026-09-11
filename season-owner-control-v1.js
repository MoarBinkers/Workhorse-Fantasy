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
const MODE_KEY='wh_owner_mode_v1';
const orderKey=route==='my-rankings'?(type==='weekly'?`wh_my_week_v3::${week}`:'wh_my_ros_v3'):(type==='weekly'?`wh_week_master_v3::${week}`:'wh_ros_master_v3');
let authorized=false,enabled=true,queued=false;
function tokenFind(v,d=0){if(d>6||v==null)return'';if(typeof v==='string'){if(v.startsWith('eyJ')&&v.split('.').length===3)return v;try{return tokenFind(JSON.parse(v),d+1)}catch(_){return''}}if(Array.isArray(v)){for(const x of v){const t=tokenFind(x,d+1);if(t)return t}return''}if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;for(const k of ['currentSession','session','data','value'])if(k in v){const t=tokenFind(v[k],d+1);if(t)return t}}return''}
function token(){try{return tokenFind(localStorage.getItem(AUTH))}catch(_){return''}}
async function owner(){const t=token();if(!t)return false;try{const r=await fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+t,Accept:'application/json'},cache:'no-store'});if(!r.ok)return false;const u=await r.json();return u?.app_metadata?.workhorse_role==='owner'}catch(_){return false}}
function storedMode(){try{return localStorage.getItem(MODE_KEY)!=='0'}catch(_){return true}}
function order(){try{const a=JSON.parse(localStorage.getItem(orderKey)||'[]');return Array.isArray(a)?a.map(String):[]}catch(_){return[]}}
function rankOf(id,row){const a=order(),i=a.indexOf(String(id));if(i>=0)return i+1;const b=row?.querySelector('.rank-area>b');return Number(b?.dataset?.overallRank||b?.textContent||0)||1}
function styles(){if(document.querySelector('#wh-owner-control-css'))return;const s=document.createElement('style');s.id='wh-owner-control-css';s.textContent=`
html.wh-owner-control #rank-rows .precision{display:flex!important}
html.wh-owner-control #rank-rows .rank-row{position:relative}
html.wh-owner-control #rank-rows .rank-row.editable .drag-handle{display:grid!important;pointer-events:auto!important;opacity:1!important}
html.wh-owner-control #rank-rows .rank-row.wh-player-unavailable .drag-handle{pointer-events:auto!important;opacity:.55!important;cursor:grab!important}
html:not(.wh-owner-control) #rank-rows .drag-handle[data-wh-owner-handle="1"],html:not(.wh-owner-control) #rank-rows .wh-owner-precision{display:none!important}
.wh-owner-mode-toggle{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #394b59;border-radius:8px;background:#111b23;color:#9fb0bc;font-size:8px;font-weight:1000;letter-spacing:.08em;white-space:nowrap;cursor:pointer}
.wh-owner-mode-toggle:before{content:"";width:6px;height:6px;border-radius:50%;background:#647784}
.wh-owner-mode-toggle.on{border-color:#2d6547;background:#0d2118;color:#9be5b7}.wh-owner-mode-toggle.on:before{background:#6fe09a;box-shadow:0 0 10px #6fe09a88}
html.wh-owner-control #edit-toggle{display:none!important}
html:not(.wh-owner-control) #edit-toggle{display:none!important}
html:not(.wh-owner-control) #reset-board{display:none!important}
html:not(.wh-owner-control) .de-mode.edit,html:not(.wh-owner-control) #deUndo,html:not(.wh-owner-control) #deRedo,html:not(.wh-owner-control) #deTools,html:not(.wh-owner-control) #dePublish{display:none!important}
html:not(.wh-owner-control) [data-site-edit]{outline:none!important;background:transparent!important}
html:not(.wh-owner-control) .wh-owner-note{pointer-events:none!important;resize:none!important;opacity:.9!important}
html:not(.wh-owner-control) .wh-note-save{display:none!important}
`;
document.head.appendChild(s)}
function ensureToggle(){
 let b=document.querySelector('#wh-owner-mode-toggle');
 const adminActions=document.querySelector('#deSandboxBar .de-sandbox-actions');
 const heroActions=document.querySelector('.hero-actions');
 const target=adminActions||heroActions;
 if(!target)return;
 if(!b){b=document.createElement('button');b.id='wh-owner-mode-toggle';b.type='button';b.className='wh-owner-mode-toggle';b.dataset.whNoEdit='';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setEnabled(!enabled)})}
 if(b.parentElement!==target){if(adminActions)target.insertBefore(b,target.firstChild);else target.prepend(b)}
 syncToggle();
}
function syncToggle(){const b=document.querySelector('#wh-owner-mode-toggle');if(!b)return;b.classList.toggle('on',enabled);b.textContent=enabled?'OWNER MODE · ON':'OWNER MODE · OFF';b.title=enabled?'Owner controls enabled. Click to enter clean viewer mode.':'Clean viewer mode. Click to enable owner controls.'}
function ensureRow(row){const id=String(row.dataset.id||'');if(!id)return;row.classList.add('editable');row.dataset.whOwnerEditable='1';const area=row.querySelector('.rank-area');if(area&&!area.querySelector('.drag-handle')){const h=document.createElement('button');h.className='drag-handle';h.type='button';h.dataset.whOwnerHandle='1';h.title='Drag to reorder';h.setAttribute('aria-label','Drag player');h.textContent='⋮⋮';area.prepend(h)}
 if(!row.querySelector('.precision')){const p=document.createElement('div');p.className='precision wh-owner-precision';p.dataset.whNoEdit='';const r=rankOf(id,row);p.innerHTML=`<button data-up="${id}" title="Move up">↑</button><button data-down="${id}" title="Move down">↓</button><label>#<input data-rank="${id}" value="${r}" inputmode="numeric" aria-label="Move player to exact rank"></label>`;row.appendChild(p)}
}
function disableRows(){document.querySelectorAll('#rank-rows .rank-row[data-wh-owner-editable="1"]').forEach(row=>{row.classList.remove('editable');delete row.dataset.whOwnerEditable;row.querySelector('.drag-handle[data-wh-owner-handle="1"]')?.remove();row.querySelector('.wh-owner-precision')?.remove()})}
function syncOwnerNotes(){document.querySelectorAll('.wh-owner-note').forEach(x=>{x.readOnly=!enabled;x.setAttribute('aria-readonly',enabled?'false':'true')})}
function cleanEditorMode(){if(enabled)return;document.documentElement.classList.remove('de-edit-mode');document.querySelector('.de-mode[data-mode="view"]')?.click?.()}
function setEnabled(next){enabled=!!next;try{localStorage.setItem(MODE_KEY,enabled?'1':'0')}catch(_){}document.documentElement.classList.toggle('wh-owner-control',enabled);syncToggle();if(enabled)queue();else{disableRows();cleanEditorMode();syncOwnerNotes()}window.dispatchEvent(new CustomEvent('workhorse:owner-mode-changed',{detail:{enabled}}))}
function apply(){queued=false;if(!authorized)return;styles();ensureToggle();document.documentElement.classList.toggle('wh-owner-control',enabled);if(enabled)document.querySelectorAll('#rank-rows .rank-row[data-id]').forEach(ensureRow);else disableRows();syncOwnerNotes()}
function queue(){if(queued)return;queued=true;requestAnimationFrame(apply)}
async function start(){authorized=await owner();if(!authorized)return;enabled=storedMode();styles();setEnabled(enabled);queue();const obs=new MutationObserver(queue);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(queue,1200)}
start();
})();
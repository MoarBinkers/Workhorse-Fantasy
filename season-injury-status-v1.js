(()=>{
'use strict';
if(window.__WH_INJURY_STATUS_V1__)return;
window.__WH_INJURY_STATUS_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
if(type!=='weekly')return;

const SB='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const statusMap=new Map();
let queued=false;

const unavailableStatuses=new Set(['OUT','IR','PUP','SUS','SUSPENDED','NFI']);
const clean=v=>String(v||'').trim();
const upper=v=>clean(v).toUpperCase();

function injuryState(row){
 const injury=clean(row?.injury_status),u=upper(injury);
 if(!injury||u==='NONE'||u==='NA')return null;
 if(unavailableStatuses.has(u))return {kind:'out',label:u==='SUS'?'SUSPENDED':u,body:clean(row.injury_body_part)};
 if(u==='QUESTIONABLE'||u==='Q')return {kind:'questionable',label:'QUESTIONABLE',body:clean(row.injury_body_part)};
 if(u==='DOUBTFUL'||u==='D')return {kind:'doubtful',label:'DOUBTFUL',body:clean(row.injury_body_part)};
 return {kind:'other',label:injury.toUpperCase(),body:clean(row.injury_body_part)};
}

function addStyles(){
 if(document.querySelector('#wh-injury-status-css'))return;
 const s=document.createElement('style');s.id='wh-injury-status-css';s.textContent=`
#rank-rows.wh-injury-flex{display:flex!important;flex-direction:column!important}
#rank-rows.wh-injury-flex>.rank-row,#rank-rows.wh-injury-flex>.wh-tier-break{order:0}
#rank-rows .wh-injury-tag{display:inline-flex;align-items:center;height:16px;padding:0 5px;border-radius:5px;border:1px solid;font-size:6.5px;line-height:1;font-weight:1000;letter-spacing:.055em;white-space:nowrap;margin-left:2px}
#rank-rows .wh-injury-tag.questionable{color:#efd57f;background:#241f11;border-color:#6d5c2e}
#rank-rows .wh-injury-tag.doubtful{color:#efb071;background:#281a10;border-color:#724825}
#rank-rows .wh-injury-tag.out{color:#ef9da8;background:#281419;border-color:#70404a}
#rank-rows .wh-injury-tag.other{color:#b6c4ce;background:#15212a;border-color:#3a4b58}
#rank-rows .rank-row.wh-player-unavailable{order:100!important;opacity:.67!important;border-color:#4d2d35!important;background:linear-gradient(180deg,#171116,#100d11)!important}
#rank-rows .rank-row.wh-player-unavailable:hover{border-color:#6a3945!important;background:linear-gradient(180deg,#1c1319,#120e12)!important}
#rank-rows .rank-row.wh-player-unavailable .drag-handle{pointer-events:none!important;opacity:.2!important;cursor:not-allowed!important}
#rank-rows .wh-out-break{order:90!important;display:flex;align-items:center;gap:10px;margin:20px 0 8px;padding:10px 13px;border:1px solid #65404a;border-left:4px solid #d46f7d;border-radius:10px;background:linear-gradient(90deg,rgba(94,39,50,.32),rgba(31,18,22,.92) 58%,rgba(15,12,14,.4));color:#e8aab3;box-shadow:0 7px 22px rgba(0,0,0,.18)}
#rank-rows .wh-out-break span{font-size:10px;font-weight:1000;letter-spacing:.105em;text-transform:uppercase;white-space:nowrap}
#rank-rows .wh-out-break small{font-size:8px;color:#966f78;font-weight:800}
#rank-rows .wh-out-break::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,#c46b78,transparent);opacity:.45}
@media(max-width:760px){#rank-rows .wh-injury-tag{font-size:6px;height:15px;padding:0 4px}.wh-out-break small{display:none!important}}
`;
 document.head.appendChild(s);
}

function tagRow(row,state){
 const top=row.querySelector('.topline')||row.querySelector('.player');
 let tag=row.querySelector('.wh-injury-tag');
 if(!state){tag?.remove();row.classList.remove('wh-player-unavailable');delete row.dataset.whUnavailable;return}
 if(!tag){tag=document.createElement('span');tag.className='wh-injury-tag';tag.dataset.whNoEdit='';top?.appendChild(tag)}
 tag.className=`wh-injury-tag ${state.kind}`;
 tag.textContent=state.label;
 tag.title=state.body?`${state.label} · ${state.body}`:state.label;
 const unavailable=state.kind==='out';
 row.classList.toggle('wh-player-unavailable',unavailable);
 if(unavailable)row.dataset.whUnavailable='1';else delete row.dataset.whUnavailable;
}

function visibleUnavailable(box){return [...box.querySelectorAll(':scope > .rank-row.wh-player-unavailable')].filter(r=>r.style.display!=='none')}

function decorate(){
 queued=false;addStyles();
 const box=document.querySelector('#rank-rows');if(!box)return;
 box.classList.add('wh-injury-flex');
 for(const row of box.querySelectorAll('.rank-row[data-id]')){
   const rec=statusMap.get(String(row.dataset.id||''));
   tagRow(row,injuryState(rec));
 }
 let divider=box.querySelector(':scope > .wh-out-break');
 const out=visibleUnavailable(box);
 if(out.length){
   if(!divider){divider=document.createElement('div');divider.className='wh-out-break';divider.dataset.whNoEdit='';divider.innerHTML='<span>OUT / UNAVAILABLE</span><small>Automatically removed from weekly start tiers</small>';box.appendChild(divider)}
 }else divider?.remove();
}

function queueDecorate(){if(queued)return;queued=true;requestAnimationFrame(decorate)}

async function fetchStatuses(){
 const path='sleeper_player_status?select=player_id,status,injury_status,injury_body_part,updated_at&player_id=not.is.null&limit=1000';
 const r=await fetch(SB+'/rest/v1/'+path,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
 if(!r.ok)throw new Error('injury status '+r.status);
 for(const x of await r.json())if(x?.player_id)statusMap.set(String(x.player_id),x);
}

async function start(){
 try{await fetchStatuses()}catch(e){console.warn('[Workhorse injuries] status feed unavailable',e);return}
 queueDecorate();
 const box=document.querySelector('#rank-rows');
 if(box){const obs=new MutationObserver(queueDecorate);obs.observe(box,{childList:true,subtree:true})}
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-filter]'))setTimeout(queueDecorate,30)},true);
 document.addEventListener('dragend',()=>setTimeout(queueDecorate,30),true);
 document.addEventListener('pointerup',()=>setTimeout(queueDecorate,30),true);
}
start();
})();

(()=>{
'use strict';
if(window.__WH_SEASON_SEED_V1__)return;
window.__WH_SEASON_SEED_V1__=true;
const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
const week=Math.max(1,Math.min(18,Number(qs.get('week')||1)||1));
const isMine=route==='my-rankings';
const isWeekly=type==='weekly';
const key=isMine?(isWeekly?`wh_my_week_v3::${week}`:'wh_my_ros_v3'):(isWeekly?`wh_week_master_v3::${week}`:'wh_ros_master_v3');
function saved(){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function seed(){
 const rows=[...document.querySelectorAll('#rank-rows .rank-row[data-id]')];
 if(!rows.length)return false;
 if(!saved().length){
   const ids=rows.map(r=>String(r.dataset.id||'')).filter(Boolean);
   if(ids.length)try{localStorage.setItem(key,JSON.stringify(ids))}catch(_){ }
 }
 return true;
}
if(!seed()){
 const obs=new MutationObserver(()=>{if(seed())obs.disconnect()});
 obs.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>obs.disconnect(),15000);
}
})();

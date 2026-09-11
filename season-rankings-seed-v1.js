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
function add(src,dataKey){if(document.querySelector(`script[${dataKey}]`))return;const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(dataKey,'1');document.body.appendChild(s)}
function loadUi(){if(window.__WH_SEASON_UI_V5__)return;add('./season-rankings-ui-v5.js?v=1','data-wh-ui-v5')}
function loadDetail(){if(window.__WH_PLAYER_DETAIL_V1__)return;add('./season-player-detail-v1.js?v=1','data-wh-player-detail')}
function loadMatchupReference(){if(!isWeekly||window.__WH_MATCHUP_REFERENCE_V1__)return;add('./season-matchup-reference-v1.js?v=1','data-wh-matchup-reference')}
function loadMatchupExpanded(){if(!isWeekly||window.__WH_MATCHUP_EXPANDED_V1__)return;add('./season-matchup-expanded-v1.js?v=1','data-wh-matchup-expanded')}
function loadInjuryStatus(){if(!isWeekly||window.__WH_INJURY_STATUS_V1__)return;add('./season-injury-status-v1.js?v=1','data-wh-injury-status')}
function loadOwnerControl(){if(window.__WH_OWNER_CONTROL_V1__)return;add('./season-owner-control-v1.js?v=1','data-wh-owner-control')}
function loadInsights(){if(window.__WH_SEASON_INSIGHT_V1__)return;add('./season-insight-v1.js?v=1','data-wh-season-insight')}
function loadCompare(){if(window.__WH_COMPARE_V1__)return;add('./season-compare-v1.js?v=1','data-wh-compare')}
function loadMatchupTrends(){if(!isWeekly||window.__WH_MATCHUP_TRENDS_V1__)return;add('./season-matchup-trends-v1.js?v=1','data-wh-matchup-trends')}
function seed(){
 const rows=[...document.querySelectorAll('#rank-rows .rank-row[data-id]')];
 if(!rows.length)return false;
 if(!saved().length){
   const ids=rows.map(r=>String(r.dataset.id||'')).filter(Boolean);
   if(ids.length)try{localStorage.setItem(key,JSON.stringify(ids))}catch(_){ }
 }
 loadUi();
 loadDetail();
 loadMatchupReference();
 loadMatchupExpanded();
 loadInjuryStatus();
 loadOwnerControl();
 loadInsights();
 loadCompare();
 loadMatchupTrends();
 return true;
}
if(!seed()){
 const obs=new MutationObserver(()=>{if(seed())obs.disconnect()});
 obs.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>obs.disconnect(),15000);
}
})();

(()=>{
'use strict';
if(window.__WH_REGRESSION_FIX_V2__)return;
window.__WH_REGRESSION_FIX_V2__=true;
window.__WH_REGRESSION_FIX_V1__=true;

const q=new URLSearchParams(location.search),route=q.get('view')||'ros';
const type=route==='my-rankings'?(q.get('type')==='weekly'?'weekly':'ros'):(route==='season-rankings'?'ros':route);
if(type!=='weekly')return;

let queued=false,retryKey='',retries=0;
function recover(){
 queued=false;
 const panel=document.querySelector('.wh-player-backdrop.open');if(!panel)return;
 const active=panel.querySelector('.wh-player-tab.active');if(!active||active.textContent.trim()!=='Matchup')return;
 if(panel.querySelector('.wh-2025-ref')){retries=0;return}
 const key=panel.querySelector('.wh-player-title h2')?.textContent||'player';
 if(retryKey!==key){retryKey=key;retries=0}
 if(retries>=2)return;
 retries++;
 const delay=retries===1?180:650;
 setTimeout(()=>{
  const p=document.querySelector('.wh-player-backdrop.open'),tab=p?.querySelector('.wh-player-tab[data-player-tab="matchup"]');
  if(p&&tab?.classList.contains('active')&&!p.querySelector('.wh-2025-ref'))tab.click();
 },delay);
}
function queue(){if(!queued){queued=true;requestAnimationFrame(recover)}}
function relevantMutation(m){return [...m.addedNodes].some(n=>n?.nodeType===1&&(n.matches?.('.wh-player-backdrop,.wh-player-body,.wh-2025-ref')||n.querySelector?.('.wh-player-backdrop,.wh-player-body,.wh-2025-ref')))}
function start(){
 document.addEventListener('click',e=>{if(e.target.closest?.('#rank-rows .rank-row[data-id],.wh-player-tab'))setTimeout(queue,20)},true);
 new MutationObserver(ms=>{if(ms.some(relevantMutation))queue()}).observe(document.body,{childList:true,subtree:true});
}
start();
})();

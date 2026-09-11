(()=>{
'use strict';
if(window.__WH_ROS_CHANGE_FIX_V1__)return;
window.__WH_ROS_CHANGE_FIX_V1__=true;

const q=new URLSearchParams(location.search);
const route=q.get('view')||'ros';
const type=route==='my-rankings'?(q.get('type')==='weekly'?'weekly':'ros'):(route==='season-rankings'?'ros':route);
if(type!=='ros')return;

const mine=route==='my-rankings';
const boardKey=mine?'wh_my_ros_v3':'wh_ros_master_v3';
const anchorKey=`wh_change_anchor_v4::${mine?'my-ros':'master-ros'}`;
let queued=false;

function load(k){try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x.map(String):[]}catch(_){return[]}}
function ensureAnchor(){let a=load(anchorKey);const o=load(boardKey);if(!a.length&&o.length){a=o.slice();try{localStorage.setItem(anchorKey,JSON.stringify(a))}catch(_){}}return a}
function text(delta){if(!delta)return['flat','Change —'];return delta>0?['up',`Change ▲${delta}`]:['down',`Change ▼${Math.abs(delta)}`]}
function ensureWrap(meta){
 let wrap=meta.querySelector('.wh-change-wrap');
 if(!wrap){wrap=document.createElement('span');wrap.className='wh-change-wrap';wrap.dataset.whNoEdit='';wrap.innerHTML='<span class="wh-change-sep"> · </span><span class="wh-change flat">Change —</span>';meta.appendChild(wrap)}
 return wrap;
}
function decorate(){
 queued=false;
 const base=ensureAnchor(),now=load(boardKey);if(!base.length||!now.length)return;
 for(const row of document.querySelectorAll('#rank-rows .rank-row[data-id]')){
  const id=String(row.dataset.id||''),meta=row.querySelector('.meta');if(!meta)continue;
  meta.querySelectorAll('.wh-row-chip:not(.mine)').forEach(x=>x.remove());
  const a=base.indexOf(id),b=now.indexOf(id);if(a<0||b<0)continue;
  const d=(a+1)-(b+1),[cls,label]=text(d),wrap=ensureWrap(meta),badge=wrap.querySelector('.wh-change');
  const want=`wh-change ${cls}`;
  if(badge.className!==want)badge.className=want;
  if(badge.textContent!==label)badge.textContent=label;
 }
}
function queue(){if(!queued){queued=true;requestAnimationFrame(decorate)}}
function rowMutation(m){return [...m.addedNodes,...m.removedNodes].some(n=>n?.nodeType===1&&(n.matches?.('.rank-row')||n.querySelector?.('.rank-row')))}
function start(){
 queue();
 const box=document.querySelector('#rank-rows');
 if(box)new MutationObserver(ms=>{if(ms.some(rowMutation))queue()}).observe(box,{childList:true,subtree:false});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-up],[data-down],[data-filter]'))setTimeout(queue,30)},true);
 document.addEventListener('change',e=>{if(e.target.matches?.('[data-rank]'))setTimeout(queue,30)},true);
 window.addEventListener('workhorse:rank-dragged',()=>setTimeout(queue,30));
 window.addEventListener('workhorse:ros-tier-drop',()=>setTimeout(queue,30));
}
start();
})();

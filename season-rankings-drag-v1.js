(()=>{
'use strict';
if(window.__WH_SEASON_DRAG_V1__)return;
window.__WH_SEASON_DRAG_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
const week=Math.max(1,Math.min(18,Number(qs.get('week')||1)||1));
const isMine=route==='my-rankings';
const isWeekly=type==='weekly';
const orderKey=isMine?(isWeekly?`wh_my_week_v3::${week}`:'wh_my_ros_v3'):(isWeekly?`wh_week_master_v3::${week}`:'wh_ros_master_v3');
let drag=null,raf=0;

function loadOrder(){try{const x=JSON.parse(localStorage.getItem(orderKey)||'[]');return Array.isArray(x)?x.map(String):[]}catch(_){return[]}}
function visibleRows(){return [...document.querySelectorAll('#rank-rows .rank-row.editable')].filter(r=>r.style.display!=='none'&&r.offsetParent!==null)}
function neutralize(){document.querySelectorAll('#rank-rows .rank-row').forEach(r=>{if(r.draggable)r.draggable=false;r.removeAttribute('draggable')})}
function styles(){if(document.querySelector('#wh-smooth-drag-css'))return;const s=document.createElement('style');s.id='wh-smooth-drag-css';s.textContent=`
#rank-rows .rank-row.editable{cursor:default!important;transition:border-color .12s ease,background .12s ease,box-shadow .12s ease,opacity .12s ease!important}
#rank-rows .drag-handle{width:26px!important;height:34px!important;display:grid!important;place-items:center!important;border-radius:7px!important;cursor:grab!important;user-select:none!important;-webkit-user-select:none!important;touch-action:none!important;transition:background .12s ease,color .12s ease,transform .12s ease!important}
#rank-rows .drag-handle:hover{background:#142631!important;color:#9ec7df!important}
#rank-rows .drag-handle:active{cursor:grabbing!important;transform:scale(.96)}
#rank-rows .rank-row.wh-drag-source{opacity:.22!important;box-shadow:none!important}
html.wh-sorting,html.wh-sorting *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important}
.wh-drag-ghost{position:fixed;z-index:2147483200;pointer-events:none;display:flex;align-items:center;gap:9px;min-width:210px;max-width:300px;padding:9px 11px;border:1px solid #42627a;border-radius:10px;background:rgba(12,25,35,.96);box-shadow:0 14px 40px rgba(0,0,0,.42);backdrop-filter:blur(12px);transform:translate3d(0,0,0);will-change:left,top;opacity:.98}
.wh-drag-ghost img{width:30px;height:30px;border-radius:7px;object-fit:cover;object-position:center top;background:#132530}.wh-drag-ghost div{min-width:0}.wh-drag-ghost strong{display:block;font:900 11px/1.15 system-ui;color:#f3f7fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wh-drag-ghost span{display:block;margin-top:3px;font:800 8px/1 system-ui;color:#8ea5b5;letter-spacing:.04em}.wh-drop-line{position:fixed;z-index:2147483199;pointer-events:none;height:2px;border-radius:999px;background:#79c6ff;box-shadow:0 0 0 1px rgba(121,198,255,.18),0 0 14px rgba(121,198,255,.38)}.wh-drop-line:before{content:"";position:absolute;left:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:#a9dcff;box-shadow:0 0 10px rgba(121,198,255,.55)}
@media(max-width:760px){#rank-rows .drag-handle{width:30px!important;height:36px!important}.wh-drag-ghost{min-width:180px;max-width:240px;padding:8px 9px}}
`;document.head.appendChild(s)}
function makeGhost(row){const g=document.createElement('div');g.className='wh-drag-ghost';const img=row.querySelector('.avatar img')?.src||'';const name=row.querySelector('.name')?.textContent?.trim()||'Player';const rank=row.querySelector('.rank-area>b')?.dataset?.overallRank||('#'+(row.querySelector('.rank-area>b')?.textContent?.trim()||''));const pos=row.querySelector('.rank-area>b')?.dataset?.posRank||row.querySelector('.pos')?.textContent?.trim()||'';g.innerHTML=`${img?`<img src="${img}" alt="">`:''}<div><strong>${name.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</strong><span>${rank}${pos?' · '+pos:''}</span></div>`;document.body.appendChild(g);return g}
function line(){let l=document.querySelector('#wh-drop-line');if(!l){l=document.createElement('div');l.id='wh-drop-line';l.className='wh-drop-line';document.body.appendChild(l)}return l}
function placeGhost(x,y){if(!drag?.ghost)return;const w=drag.ghost.offsetWidth||240,h=drag.ghost.offsetHeight||50;const left=Math.max(8,Math.min(innerWidth-w-8,x+16));const top=Math.max(8,Math.min(innerHeight-h-8,y-h/2));drag.ghost.style.left=left+'px';drag.ghost.style.top=top+'px'}
function chooseTarget(y){if(!drag)return;const rows=visibleRows().filter(r=>String(r.dataset.id)!==drag.id);if(!rows.length){drag.target=null;line().style.display='none';return}let target=rows[rows.length-1],after=true;for(const row of rows){const r=row.getBoundingClientRect();if(y<r.top+r.height/2){target=row;after=false;break}}
const rect=target.getBoundingClientRect(),board=document.querySelector('#rank-rows')?.getBoundingClientRect();const l=line();l.style.display='block';l.style.left=Math.max(8,(board?.left||rect.left)+4)+'px';l.style.width=Math.max(40,(board?.width||rect.width)-8)+'px';l.style.top=Math.round(after?rect.bottom:rect.top)+'px';drag.target=String(target.dataset.id||'');drag.after=after}
function scrollLoop(){if(!drag){raf=0;return}const y=drag.y;const topEdge=Math.max(86,document.querySelector('.toolbar')?.getBoundingClientRect().bottom||86)+34;const bottomEdge=innerHeight-76;let speed=0;if(y<topEdge)speed=-Math.min(18,(topEdge-y)*.24);else if(y>bottomEdge)speed=Math.min(18,(y-bottomEdge)*.24);if(speed){scrollBy(0,speed);chooseTarget(y)}raf=requestAnimationFrame(scrollLoop)}
function invokeMove(sourceId,finalIndex){const arr=loadOrder();const i=arr.indexOf(sourceId);if(i<0||finalIndex<0||finalIndex>=arr.length||i===finalIndex)return;const row=document.querySelector(`#rank-rows .rank-row[data-id="${CSS.escape(sourceId)}"]`);const input=row?.querySelector(`[data-rank="${CSS.escape(sourceId)}"]`);if(!input)return;
 if(i<finalIndex&&finalIndex===arr.length-1){input.value=String(arr.length);input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{document.querySelector(`#rank-rows [data-down="${CSS.escape(sourceId)}"]`)?.click()},0);return}
 const requested=i<finalIndex?finalIndex+2:finalIndex+1;input.value=String(requested);input.dispatchEvent(new Event('change',{bubbles:true}))}
function finish(commit=true){if(!drag)return;const d=drag;drag=null;cancelAnimationFrame(raf);raf=0;document.documentElement.classList.remove('wh-sorting');d.source?.classList.remove('wh-drag-source');d.ghost?.remove();const l=document.querySelector('#wh-drop-line');if(l)l.style.display='none';try{d.handle?.releasePointerCapture?.(d.pid)}catch(_){ }
 if(commit&&d.target){const arr=loadOrder();const sourceIndex=arr.indexOf(d.id);if(sourceIndex>=0){const remaining=arr.filter(x=>x!==d.id);const ti=remaining.indexOf(d.target);if(ti>=0){const finalIndex=ti+(d.after?1:0);invokeMove(d.id,Math.max(0,Math.min(arr.length-1,finalIndex)))}}}}
function begin(e,handle,row){const id=String(row.dataset.id||'');if(!id)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();neutralize();const ghost=makeGhost(row);drag={pid:e.pointerId,id,source:row,handle,ghost,target:null,after:false,x:e.clientX,y:e.clientY};row.classList.add('wh-drag-source');document.documentElement.classList.add('wh-sorting');try{handle.setPointerCapture(e.pointerId)}catch(_){ }placeGhost(e.clientX,e.clientY);chooseTarget(e.clientY);if(!raf)raf=requestAnimationFrame(scrollLoop)}
function onDown(e){const handle=e.target.closest?.('.drag-handle');if(!handle)return;const row=handle.closest('.rank-row.editable');if(!row)return;begin(e,handle,row)}
function onMove(e){if(!drag||e.pointerId!==drag.pid)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();drag.x=e.clientX;drag.y=e.clientY;placeGhost(e.clientX,e.clientY);chooseTarget(e.clientY)}
function onUp(e){if(!drag||e.pointerId!==drag.pid)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();finish(true)}
function onCancel(e){if(!drag||e.pointerId!==drag.pid)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();finish(false)}
function start(){styles();neutralize();const obs=new MutationObserver(neutralize);obs.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('pointerdown',onDown,true);document.addEventListener('pointermove',onMove,{capture:true,passive:false});document.addEventListener('pointerup',onUp,true);document.addEventListener('pointercancel',onCancel,true);document.addEventListener('dragstart',e=>{if(e.target.closest?.('#rank-rows')){e.preventDefault();e.stopImmediatePropagation()}},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)finish(false)},true)}
start();
})();

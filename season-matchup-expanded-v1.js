(()=>{
'use strict';
if(window.__WH_MATCHUP_EXPANDED_V1__)return;
window.__WH_MATCHUP_EXPANDED_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
if(type!=='weekly')return;

function addStyles(){
 if(document.querySelector('#wh-matchup-expanded-css'))return;
 const s=document.createElement('style');
 s.id='wh-matchup-expanded-css';
 s.textContent=`
/* Matchup is a primary Weekly feature */
.wh-player-panel{width:min(920px,96vw)!important}
.wh-player-tab[data-player-tab="matchup"]{color:#b9e9ca!important;border:1px solid #315a46!important;background:#102019!important;padding-left:14px!important;padding-right:14px!important}
.wh-player-tab[data-player-tab="matchup"].active{color:#07130c!important;background:#a9e8c0!important;border-color:#a9e8c0!important;box-shadow:0 0 0 3px rgba(100,207,139,.08)!important}
.wh-player-body>.wh-2025-ref{position:relative!important;margin:0 0 22px!important;padding:22px!important;border:1px solid #315064!important;border-radius:16px!important;background:linear-gradient(145deg,#0d1d28,#09151d 66%,#0b1820)!important;box-shadow:0 16px 42px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.025)!important;overflow:hidden!important}
.wh-player-body>.wh-2025-ref::before{content:"2025 DEFENSIVE MATCHUP REFERENCE";display:block;margin-bottom:13px;font-size:10px;line-height:1;font-weight:1000;letter-spacing:.16em;color:#91cba6}
.wh-player-body>.wh-2025-ref::after{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(180deg,#6fcf93,#6aaed6 48%,#d9bb68);opacity:.85}
.wh-player-body .wh-ref-head{gap:20px!important;align-items:start!important}
.wh-player-body .wh-ref-head small{font-size:10px!important;color:#9eb3bf!important;letter-spacing:.12em!important}
.wh-player-body .wh-ref-head h3{margin-top:7px!important;font-size:30px!important;line-height:1!important;letter-spacing:-.045em!important;color:#f2f7fa!important}
.wh-player-body .wh-ref-head p{margin-top:9px!important;font-size:11px!important;line-height:1.5!important;color:#8fa3af!important}
.wh-player-body .wh-ref-grade{align-self:start!important;padding:10px 13px!important;border-radius:9px!important;font-size:11px!important;letter-spacing:.05em!important;box-shadow:0 5px 16px rgba(0,0,0,.16)!important}
.wh-player-body .wh-ref-explain{margin-top:16px!important;padding:14px 15px!important;border-radius:11px!important;background:#0a161e!important}
.wh-player-body .wh-ref-explain strong{font-size:11px!important;color:#dce8ee!important}
.wh-player-body .wh-ref-explain p{font-size:10.5px!important;line-height:1.55!important;margin:7px 0 10px!important}
.wh-player-body .wh-ref-explain div{gap:13px!important;font-size:9px!important}
.wh-player-body .wh-ref-main{gap:11px!important;margin:17px 0!important}
.wh-player-body .wh-ref-main>div{min-height:112px!important;padding:18px 16px!important;border-radius:12px!important;border-color:#294452!important;background:linear-gradient(180deg,#0d1b24,#0a161e)!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important}
.wh-player-body .wh-ref-main strong{font-size:31px!important;line-height:.95!important;letter-spacing:-.045em!important;color:#f2f7fa!important}
.wh-player-body .wh-ref-main span{margin-top:9px!important;font-size:9px!important;letter-spacing:.04em!important;text-transform:uppercase!important;font-weight:850!important;color:#8498a5!important}
.wh-player-body .wh-ref-main b{right:11px!important;top:11px!important;min-width:38px!important;padding:6px 8px!important;border:1px solid currentColor!important;border-radius:7px!important;background:#09131a!important;text-align:center!important;font-size:11px!important;line-height:1!important}
.wh-player-body .wh-ref-table-wrap{border-radius:11px!important;border-color:#29414f!important}
.wh-player-body .wh-ref-table{font-size:10.5px!important}
.wh-player-body .wh-ref-table th{padding:11px 12px!important;font-size:8.5px!important;letter-spacing:.06em!important}
.wh-player-body .wh-ref-table td{padding:11px 12px!important}
.wh-player-body .wh-ref-rank{display:inline-flex!important;min-width:34px!important;justify-content:center!important;padding:4px 6px!important;border:1px solid currentColor!important;border-radius:6px!important;background:#09131a!important}
.wh-player-body>.wh-2025-ref + .wh-matchup-hero{margin-top:26px!important;opacity:.88;position:relative!important}
.wh-player-body>.wh-2025-ref + .wh-matchup-hero::before{content:"2026 LIVE SAMPLE";position:absolute;top:-18px;left:0;font-size:7px;font-weight:950;letter-spacing:.12em;color:#627c8b}
@media(max-width:760px){
 .wh-player-panel{width:100vw!important}
 .wh-player-body>.wh-2025-ref{padding:16px 13px!important;border-radius:13px!important}
 .wh-player-body .wh-ref-head{grid-template-columns:1fr!important;gap:10px!important}
 .wh-player-body .wh-ref-head h3{font-size:25px!important}
 .wh-player-body .wh-ref-grade{justify-self:start!important}
 .wh-player-body .wh-ref-main{grid-template-columns:1fr!important;gap:8px!important}
 .wh-player-body .wh-ref-main>div{min-height:82px!important;padding:13px!important}
 .wh-player-body .wh-ref-main strong{font-size:25px!important}
 .wh-player-body .wh-ref-main b{top:10px!important;right:10px!important}
}
`;
 document.head.appendChild(s);
}

function clarify2025Reference(ref){
 const small=ref?.querySelector('.wh-ref-head small');
 if(small&&!small.dataset.whYearLabel){
   const pos=(small.textContent.match(/VS\s+(QB|RB|WR|TE)/i)||[])[1];
   small.textContent=`2025 DEFENSE VS ${pos||'POSITION'} · FULL-SEASON REFERENCE`;
   small.dataset.whYearLabel='1';
 }
 ref?.querySelectorAll('.wh-ref-main span').forEach(label=>{
   if(!/2025/.test(label.textContent))label.textContent=`${label.textContent} · 2025`;
 });
}

function removeEmpty2026State(body){
 const hero=[...body.querySelectorAll('.wh-matchup-hero')].find(x=>/NO\s+(SAMPLE|MATCHUP)/i.test(x.textContent||''));
 if(!hero)return;
 const note=hero.nextElementSibling;
 hero.remove();
 if(note?.classList.contains('wh-matchup-note')&&/2026|enough|sample/i.test(note.textContent||''))note.remove();
}

function prioritizeReference(){
 const body=document.querySelector('.wh-player-backdrop.open .wh-player-body');
 const ref=body?.querySelector('.wh-2025-ref');
 if(!body||!ref)return;
 clarify2025Reference(ref);
 removeEmpty2026State(body);
 if(body.firstElementChild!==ref)body.prepend(ref);
}

function openMatchupFromRow(e){
 const row=e.target.closest?.('#rank-rows .rank-row[data-id]');
 if(!row||e.target.closest?.('.drag-handle,button,input,a,label')||document.documentElement.classList.contains('wh-sorting'))return;
 setTimeout(()=>{
   const panel=document.querySelector('.wh-player-backdrop.open');
   const tab=panel?.querySelector('.wh-player-tab[data-player-tab="matchup"]');
   if(tab&&!tab.classList.contains('active'))tab.click();
   setTimeout(prioritizeReference,80);
 },60);
}

function start(){
 addStyles();
 document.addEventListener('click',openMatchupFromRow,true);
 const obs=new MutationObserver(()=>prioritizeReference());
 obs.observe(document.documentElement,{childList:true,subtree:true});
}
start();
})();

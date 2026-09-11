(()=>{
'use strict';
if(window.__WH_SEASON_UI_V5__)return;
window.__WH_SEASON_UI_V5__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):route;
const week=Math.max(1,Math.min(18,Number(qs.get('week')||1)||1));
const isMine=route==='my-rankings';
const isWeekly=type==='weekly';
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const boardId=isMine?(isWeekly?`my-week-${week}`:'my-ros'):(isWeekly?`master-week-${week}`:'master-ros');
const orderKey=isMine?(isWeekly?`wh_my_week_v3::${week}`:'wh_my_ros_v3'):(isWeekly?`wh_week_master_v3::${week}`:'wh_ros_master_v3');
const addedKey=`wh_added_players_v4::${boardId}`;
let positions=new Map(),scheduled=false;

function loadArr(k){try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function cap(pos){if(isWeekly){if(pos==='WR')return 75;if(pos==='RB')return 50}else{if(pos==='WR')return 100;if(pos==='RB')return 75}return Infinity}
function boardOrder(){const saved=loadArr(orderKey);if(saved.length)return saved.map(String);return [...document.querySelectorAll('#rank-rows .rank-row')].map(r=>String(r.dataset.id||'')).filter(Boolean)}
function rankMap(){
 const added=new Set(loadArr(addedKey).map(String));
 const counts={},map=new Map();let overall=0;
 for(const id of boardOrder()){
   let pos=positions.get(String(id));
   if(!pos){const row=document.querySelector(`#rank-rows .rank-row[data-id="${CSS.escape(String(id))}"]`);pos=row?.querySelector('.pos')?.textContent?.trim()||''}
   if(!pos)continue;
   counts[pos]=(counts[pos]||0)+1;
   if(counts[pos]>cap(pos)&&!added.has(String(id)))continue;
   overall++;
   map.set(String(id),{overall,pos,posRank:counts[pos]});
 }
 return map;
}
function addStyles(){
 if(document.querySelector('#wh-season-ui-v5-css'))return;
 const s=document.createElement('style');s.id='wh-season-ui-v5-css';s.textContent=`
#rank-rows.board{border:0!important;border-radius:0!important;overflow:visible!important;background:transparent!important}
#rank-rows .rank-row{grid-template-columns:64px 40px minmax(0,1fr) 70px!important;gap:9px!important;min-height:58px!important;margin:5px 0!important;padding:7px 10px!important;border:1px solid #1b2d3a!important;border-radius:10px!important;background:linear-gradient(180deg,#0b151e,#09131b)!important;box-shadow:0 1px 0 rgba(255,255,255,.018),0 5px 14px rgba(0,0,0,.12)!important}
#rank-rows .rank-row:first-child{border-top:1px solid #1b2d3a!important}
#rank-rows .rank-row:hover{background:linear-gradient(180deg,#0d1923,#0a151e)!important;border-color:#294252!important}
#rank-rows .rank-row>div:last-child:empty{display:none!important}
#rank-rows .rank-area{gap:5px!important;min-width:0!important}
#rank-rows .rank-area>b{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important;font-size:0!important;line-height:1!important;letter-spacing:0!important;white-space:nowrap!important}
#rank-rows .rank-area>b::before{content:attr(data-overall-rank);font-size:13px!important;font-weight:950!important;color:#eef4f7!important;letter-spacing:-.035em!important}
#rank-rows .rank-area>b::after{content:attr(data-pos-rank);font-size:8px!important;line-height:1!important;font-weight:950!important;letter-spacing:.035em!important;padding:4px 5px!important;border:1px solid #2b4353!important;border-radius:5px!important;background:#0e1c26!important;color:#9fb2bf!important}
#rank-rows .rank-area>b[data-position="qb"]::after{color:#efa8ad!important;border-color:#57343a!important;background:#211317!important}
#rank-rows .rank-area>b[data-position="rb"]::after{color:#91deb1!important;border-color:#2b5541!important;background:#102018!important}
#rank-rows .rank-area>b[data-position="wr"]::after{color:#91d0fb!important;border-color:#31566e!important;background:#101e28!important}
#rank-rows .rank-area>b[data-position="te"]::after{color:#e2c987!important;border-color:#5c4d2c!important;background:#201b10!important}
#rank-rows .drag-handle{font-size:12px!important;color:#536a7a!important}
#rank-rows .avatar{width:38px!important;height:38px!important;border-radius:8px!important;border-color:#213744!important;background:#0e202b!important}
#rank-rows .name{font-size:12.5px!important;letter-spacing:-.012em!important}
#rank-rows .topline{gap:7px!important}
#rank-rows .meta{font-size:8.5px!important;color:#718592!important}
#rank-rows .statline{margin-top:4px!important;font-size:8.5px!important;color:#7f929f!important}
#rank-rows .score{padding-left:9px!important;border-left:1px solid #1c303d!important}
#rank-rows .score strong{font-size:13px!important;color:#ecd27f!important}
#rank-rows .score span,#rank-rows .score small{font-size:7.5px!important}

/* Strong, scan-friendly weekly tier separators */
.wh-tier-break{position:relative!important;min-height:54px!important;height:auto!important;margin:20px 0 8px!important;padding:10px 13px!important;border:1px solid #2d4352!important;border-left-width:4px!important;border-radius:11px!important;background:linear-gradient(90deg,rgba(36,55,69,.58),rgba(11,22,30,.82) 58%,rgba(8,17,24,.28))!important;display:flex!important;align-items:center!important;gap:12px!important;box-shadow:0 7px 22px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025)!important;overflow:hidden!important}
.wh-tier-break.first{margin-top:6px!important;min-height:56px!important}
.wh-tier-break::after{content:""!important;height:1px!important;flex:1!important;background:linear-gradient(90deg,currentColor 0%,rgba(130,160,180,.2) 45%,transparent 100%)!important;opacity:.55!important}
.wh-tier-break span{display:inline-flex!important;align-items:center!important;padding:8px 12px!important;border:1px solid currentColor!important;border-radius:8px!important;background:rgba(5,12,17,.48)!important;font-size:11px!important;line-height:1!important;letter-spacing:.095em!important;text-transform:uppercase!important;font-weight:1000!important;white-space:nowrap!important;box-shadow:0 4px 12px rgba(0,0,0,.18)!important}
.wh-tier-break span::before{font-size:7px!important;letter-spacing:.14em!important;opacity:.7!important;padding-right:8px!important;margin-right:8px!important;border-right:1px solid currentColor!important}
.wh-tier-0{color:#f6d777!important;border-color:#665426!important;border-left-color:#e7bd3f!important;background:linear-gradient(90deg,rgba(103,79,19,.42),rgba(35,29,13,.92) 55%,rgba(14,19,20,.45))!important;box-shadow:0 8px 25px rgba(0,0,0,.2),inset 0 0 28px rgba(229,198,109,.055)!important}
.wh-tier-0 span{color:#ffe28a!important;border-color:#8d7434!important;background:#261f0d!important;font-size:12px!important;padding:9px 13px!important;text-shadow:0 0 14px rgba(245,210,105,.18)!important}.wh-tier-0 span::before{content:"TIER 1"}
.wh-tier-1{color:#9fd9ff!important;border-color:#315873!important;border-left-color:#66bdf4!important;background:linear-gradient(90deg,rgba(29,78,108,.34),rgba(15,31,42,.9) 55%,rgba(10,19,25,.42))!important}.wh-tier-1 span{color:#a9ddff!important;border-color:#416c89!important;background:#102330!important}.wh-tier-1 span::before{content:"TIER 2"}
.wh-tier-2{color:#9fe0ba!important;border-color:#315a46!important;border-left-color:#65c68b!important;background:linear-gradient(90deg,rgba(29,83,53,.3),rgba(14,31,23,.9) 55%,rgba(9,20,16,.42))!important}.wh-tier-2 span{color:#a7e6c0!important;border-color:#3f7055!important;background:#11251b!important}.wh-tier-2 span::before{content:"TIER 3"}
.wh-tier-3{color:#e3b5bd!important;border-color:#604047!important;border-left-color:#d88694!important;background:linear-gradient(90deg,rgba(92,42,50,.28),rgba(34,19,23,.88) 55%,rgba(21,13,16,.4))!important}.wh-tier-3 span{color:#e8bbc2!important;border-color:#78505a!important;background:#28171b!important}.wh-tier-3 span::before{content:"TIER 4"}
.wh-tier-break + .rank-row{margin-top:7px!important}

@media(max-width:760px){
 #rank-rows .rank-row{grid-template-columns:58px 36px minmax(0,1fr) 54px!important;gap:7px!important;min-height:54px!important;padding:6px 7px!important}
 #rank-rows .avatar{width:34px!important;height:34px!important}
 #rank-rows .rank-area>b{gap:3px!important}
 #rank-rows .rank-area>b::before{font-size:12px!important}
 #rank-rows .rank-area>b::after{font-size:7px!important;padding:3px 4px!important}
 #rank-rows .name{font-size:11.5px!important}
 #rank-rows .statline{font-size:7.7px!important}
 .wh-tier-break{min-height:48px!important;margin:16px 0 7px!important;padding:8px 9px!important;border-radius:9px!important}
 .wh-tier-break.first{min-height:50px!important;margin-top:5px!important}
 .wh-tier-break span{font-size:9px!important;padding:7px 9px!important}
 .wh-tier-0 span{font-size:10px!important;padding:8px 10px!important}
 .wh-tier-break span::before{font-size:6.5px!important;padding-right:6px!important;margin-right:6px!important}
}
`;
 document.head.appendChild(s);
}
function decorate(){
 if(!positions.size)return;
 const ranks=rankMap();
 document.querySelectorAll('#rank-rows .rank-row').forEach(row=>{
   const r=ranks.get(String(row.dataset.id||''));
   const b=row.querySelector('.rank-area>b');
   if(!r||!b)return;
   const overall='#'+r.overall,posRank=r.pos+r.posRank,pos=r.pos.toLowerCase();
   if(b.dataset.overallRank!==overall)b.dataset.overallRank=overall;
   if(b.dataset.posRank!==posRank)b.dataset.posRank=posRank;
   if(b.dataset.position!==pos)b.dataset.position=pos;
 });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
async function fetchPositions(){
 const path='sleeper_adp_current?select=player_id,position&format=eq.ppr&order=sleeper_rank.asc&limit=500';
 const r=await fetch(SB+'/rest/v1/'+path,{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
 if(!r.ok)throw new Error('position pool '+r.status);
 const rows=await r.json();positions=new Map((rows||[]).filter(p=>p.player_id&&p.position).map(p=>[String(p.player_id),String(p.position)]));
}
async function start(){
 addStyles();
 try{await fetchPositions()}catch(e){console.warn('[Workhorse UI] position ranks unavailable',e);return}
 const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-filter],[data-up],[data-down],#edit-toggle,#wh-add-player'))setTimeout(schedule,0)},true);
 document.addEventListener('dragend',()=>setTimeout(schedule,0),true);
 document.addEventListener('pointerup',()=>setTimeout(schedule,0),true);
 schedule();
}
start();
})();

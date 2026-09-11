(()=>{
'use strict';
if(window.__WH_ROS_TIERS_V1__)return;
window.__WH_ROS_TIERS_V1__=true;

const qs=new URLSearchParams(location.search);
const route=qs.get('view')||'ros';
const type=route==='my-rankings'?(qs.get('type')==='weekly'?'weekly':'ros'):(route==='season-rankings'?'ros':route);
if(type!=='ros')return;

const isMine=route==='my-rankings';
const boardKey=isMine?'wh_my_ros_v3':'wh_ros_master_v3';
const STORE=`wh_ros_tiers_v1::${boardKey}`;
const SB='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const POSITIONS=['QB','RB','WR','TE'];
const DEFAULT_CUTS={QB:[6,12,18],RB:[12,24,48],WR:[12,24,48],TE:[6,12,18]};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const positionById=new Map();
let state=null,queued=false,busy=false;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadJSON(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(_){}}
function order(){const x=loadJSON(boardKey,[]);return Array.isArray(x)?x.map(String):[]}
function activeFilter(){return document.querySelector('.filter.active')?.dataset?.filter||'ALL'}
function ownerOn(){return document.documentElement.classList.contains('wh-owner-control')}
function defaultTier(pos,n){const cuts=DEFAULT_CUTS[pos]||[];if(n<=cuts[0])return'A';if(n<=cuts[1])return'B';if(n<=cuts[2])return'C';return'D'}
function nextLetter(defs){for(const l of LETTERS)if(!defs.includes(l))return l;return `T${defs.length+1}`}

async function loadPositions(){
 try{
  const r=await fetch(SB+'/rest/v1/sleeper_adp_current?select=player_id,position&format=eq.ppr&limit=500',{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
  if(r.ok)for(const p of await r.json())if(p?.player_id&&POSITIONS.includes(p.position))positionById.set(String(p.player_id),String(p.position));
 }catch(e){console.warn('[Workhorse ROS tiers] position map unavailable',e)}
}
function initState(){
 const loaded=loadJSON(STORE,null);
 if(loaded?.defs&&loaded?.assignment){state=loaded;for(const p of POSITIONS){if(!Array.isArray(state.defs[p])||!state.defs[p].length)state.defs[p]=['A','B','C','D']}return}
 const defs={QB:['A','B','C','D'],RB:['A','B','C','D'],WR:['A','B','C','D'],TE:['A','B','C','D']},assignment={},counts={QB:0,RB:0,WR:0,TE:0};
 for(const id of order()){
  const pos=positionById.get(id);if(!pos)continue;
  counts[pos]++;assignment[id]=defaultTier(pos,counts[pos]);
 }
 state={version:1,defs,assignment};save();
}
function ensureAssignments(){
 if(!state)return;const counts={QB:0,RB:0,WR:0,TE:0};let changed=false;
 for(const id of order()){
  const pos=positionById.get(id);if(!pos)continue;counts[pos]++;
  const defs=state.defs[pos]||['A','B','C','D'];
  if(!state.assignment[id]){state.assignment[id]=defs.includes(defaultTier(pos,counts[pos]))?defaultTier(pos,counts[pos]):defs[defs.length-1];changed=true}
  else if(!defs.includes(state.assignment[id])){state.assignment[id]=defs[defs.length-1];changed=true}
 }
 if(changed)save();
}
function tierFor(id){const pos=positionById.get(String(id));if(!pos)return'';return state?.assignment?.[String(id)]||'D'}
function tierIndex(pos,tier){return Math.max(0,(state?.defs?.[pos]||[]).indexOf(tier))}

function styles(){if(document.querySelector('#wh-ros-tier-css'))return;const s=document.createElement('style');s.id='wh-ros-tier-css';s.textContent=`
#rank-rows .wh-ros-tier-break{width:100%;min-height:48px;margin:18px 0 7px;padding:9px 12px;border:1px solid #334a59;border-left:4px solid #7891a1;border-radius:10px;background:linear-gradient(90deg,rgba(36,55,69,.58),rgba(11,22,30,.82) 58%,rgba(8,17,24,.28));display:flex;align-items:center;gap:10px;color:#b9c8d1;box-shadow:0 7px 22px rgba(0,0,0,.16);transition:border-color .12s,background .12s,box-shadow .12s}
#rank-rows .wh-ros-tier-break.first{margin-top:6px}.wh-ros-tier-break strong{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid currentColor;border-radius:7px;background:#08131a;font-size:11px;letter-spacing:.09em;text-transform:uppercase}.wh-ros-tier-break small{font-size:8px;color:#718794;font-weight:800}.wh-ros-tier-break::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,currentColor,transparent);opacity:.35}
#rank-rows .wh-ros-tier-break[data-tier-letter="A"]{color:#a5e8bd;border-left-color:#5fd08a}#rank-rows .wh-ros-tier-break[data-tier-letter="B"]{color:#9fd9ff;border-left-color:#66bdf4}#rank-rows .wh-ros-tier-break[data-tier-letter="C"]{color:#f1ce75;border-left-color:#ddaf3f}#rank-rows .wh-ros-tier-break[data-tier-letter="D"]{color:#e3b5bd;border-left-color:#d88694}
#rank-rows .wh-ros-tier-break.wh-tier-drop-active{border-color:#79c6ff!important;background:linear-gradient(90deg,rgba(35,91,126,.46),rgba(12,31,43,.92))!important;box-shadow:0 0 0 2px rgba(121,198,255,.12),0 10px 28px rgba(0,0,0,.22)!important}
.wh-ros-add-tier{border:1px solid #37546a;background:#0c1a23;color:#bed1dc;border-radius:8px;padding:8px 10px;font-size:9px;font-weight:950;cursor:pointer}.wh-ros-add-tier:hover{border-color:#5f86a0;color:#e8f3f8}.wh-ros-add-tier[disabled]{opacity:.38;cursor:not-allowed}
#rank-rows .wh-ros-tier-chip{display:inline-flex;align-items:center;height:18px;margin-left:3px;padding:0 6px;border:1px solid #355064;border-radius:6px;background:#0c1922;color:#b9cad5;font-size:7.5px;font-weight:1000;letter-spacing:.04em;white-space:nowrap}.wh-ros-tier-chip[data-tier="A"]{color:#9ce5b7;border-color:#315a46;background:#102019}.wh-ros-tier-chip[data-tier="B"]{color:#9ed8fb;border-color:#31566d;background:#10202b}.wh-ros-tier-chip[data-tier="C"]{color:#ead07d;border-color:#66562d;background:#211c10}.wh-ros-tier-chip[data-tier="D"]{color:#e5a8b0;border-color:#67404a;background:#24151a}
@media(max-width:760px){#rank-rows .wh-ros-tier-break{min-height:43px;margin:14px 0 6px;padding:8px 9px}.wh-ros-tier-break strong{font-size:9px;padding:6px 8px}.wh-ros-tier-break small{display:none}.wh-ros-tier-chip{font-size:7px!important;height:17px!important;padding:0 5px!important}}
`;document.head.appendChild(s)}
function removeLegacyBreaks(){document.querySelectorAll('#rank-rows > .wh-tier-break:not(.wh-ros-tier-break)').forEach(x=>x.remove())}
function rowFor(id){try{return document.querySelector(`#rank-rows .rank-row[data-id="${CSS.escape(String(id))}"]`)}catch(_){return null}}
function visiblePositionRows(pos){return [...document.querySelectorAll('#rank-rows .rank-row[data-id]')].filter(r=>r.style.display!=='none'&&positionById.get(String(r.dataset.id||''))===pos)}
function addTierChip(row,id){const top=row.querySelector('.topline')||row.querySelector('.player');if(!top)return;let chip=row.querySelector('.wh-ros-tier-chip');const pos=positionById.get(String(id)),tier=tierFor(id);if(!tier||!pos){chip?.remove();return}if(!chip){chip=document.createElement('span');chip.className='wh-ros-tier-chip';chip.dataset.whNoEdit='';top.appendChild(chip)}chip.dataset.tier=tier;chip.textContent=`${pos} · ${tier}`;chip.title=`${pos} Tier ${tier}`}
function renderAll(){removeLegacyBreaks();document.querySelectorAll('#rank-rows > .wh-ros-tier-break').forEach(x=>x.remove());for(const row of document.querySelectorAll('#rank-rows .rank-row[data-id]'))addTierChip(row,String(row.dataset.id||''))}
function makeBreak(pos,tier,count,first=false){const d=document.createElement('div');d.className=`wh-ros-tier-break${first?' first':''}`;d.dataset.tierLetter=tier;d.dataset.position=pos;d.dataset.whNoEdit='';d.innerHTML=`<strong>Tier ${esc(tier)}</strong><small>${count?`${count} player${count===1?'':'s'}`:'Empty · drop a player here'}</small>`;return d}
function renderPosition(pos){
 removeLegacyBreaks();document.querySelectorAll('#rank-rows > .wh-ros-tier-break').forEach(x=>x.remove());
 const rows=visiblePositionRows(pos),defs=state.defs[pos]||['A','B','C','D'];
 for(const row of rows)addTierChip(row,String(row.dataset.id||''));
 let anchor=null,first=true;
 for(let i=defs.length-1;i>=0;i--){
  const tier=defs[i],members=rows.filter(r=>tierFor(r.dataset.id)===tier),next=anchor||null,d=makeBreak(pos,tier,members.length,false);
  const before=members[0]||next;
  const box=document.querySelector('#rank-rows');if(before)box.insertBefore(d,before);else box.appendChild(d);
  anchor=d;
 }
 const firstBreak=document.querySelector('#rank-rows > .wh-ros-tier-break');firstBreak?.classList.add('first');
}
function ensureAddTierButton(){
 const actions=document.querySelector('.toolbar')||document.querySelector('.hero-actions');if(!actions)return;
 let b=document.querySelector('#wh-ros-add-tier');if(!b){b=document.createElement('button');b.id='wh-ros-add-tier';b.className='wh-ros-add-tier';b.type='button';b.dataset.whNoEdit='';b.addEventListener('click',()=>{const pos=activeFilter();if(!POSITIONS.includes(pos)||!ownerOn())return;const defs=state.defs[pos];const l=nextLetter(defs);defs.push(l);save();queue();toast(`${pos} Tier ${l} added.`)})}
 if(b.parentElement!==actions)actions.appendChild(b);
 const pos=activeFilter();b.hidden=!ownerOn();b.disabled=!POSITIONS.includes(pos);b.textContent=POSITIONS.includes(pos)?`+ ${pos} TIER`:'+ TIER';b.title=POSITIONS.includes(pos)?`Add another ${pos} tier`:'Choose QB, RB, WR, or TE first';
}
function toast(msg){let t=document.querySelector('#wh-ros-tier-toast');if(!t){t=document.createElement('div');t.id='wh-ros-tier-toast';t.style.cssText='position:fixed;z-index:2147483400;left:50%;bottom:20px;transform:translate(-50%,8px);opacity:0;transition:.14s;background:#edf4f7;color:#071019;padding:9px 12px;border-radius:8px;font:850 10px system-ui';document.body.appendChild(t)}t.textContent=msg;t.style.opacity='1';t.style.transform='translate(-50%,0)';setTimeout(()=>{t.style.opacity='0';t.style.transform='translate(-50%,8px)'},1500)}
function render(){queued=false;if(!state||busy)return;busy=true;try{styles();ensureAssignments();ensureAddTierButton();const f=activeFilter();if(POSITIONS.includes(f))renderPosition(f);else renderAll()}finally{busy=false}}
function queue(){if(queued)return;queued=true;requestAnimationFrame(render)}

function moveToFinalIndex(sourceId,finalIndex){
 const arr=order(),i=arr.indexOf(String(sourceId));if(i<0||finalIndex<0||finalIndex>=arr.length||i===finalIndex)return;
 const row=rowFor(sourceId),input=row?.querySelector(`[data-rank="${CSS.escape(String(sourceId))}"]`);if(!input)return;
 if(i<finalIndex&&finalIndex===arr.length-1){input.value=String(arr.length);input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>rowFor(sourceId)?.querySelector(`[data-down="${CSS.escape(String(sourceId))}"]`)?.click(),0);return}
 const requested=i<finalIndex?finalIndex+2:finalIndex+1;input.value=String(requested);input.dispatchEvent(new Event('change',{bubbles:true}));
}
function desiredIndexForTier(sourceId,pos,tier){
 const arr=order(),remaining=arr.filter(x=>x!==String(sourceId)),defs=state.defs[pos]||[];
 const targetMembers=remaining.filter(id=>positionById.get(id)===pos&&tierFor(id)===tier);
 if(targetMembers.length)return remaining.indexOf(targetMembers[0]);
 const ti=tierIndex(pos,tier);
 for(let j=ti+1;j<defs.length;j++){
  const next=remaining.find(id=>positionById.get(id)===pos&&tierFor(id)===defs[j]);if(next)return remaining.indexOf(next);
 }
 let last=-1;for(let j=0;j<remaining.length;j++)if(positionById.get(remaining[j])===pos&&tierIndex(pos,tierFor(remaining[j]))<=ti)last=j;
 return last>=0?Math.min(remaining.length,last+1):Math.max(0,remaining.length-1);
}
function assignTier(id,tier){const pos=positionById.get(String(id));if(!pos||!(state.defs[pos]||[]).includes(tier))return false;state.assignment[String(id)]=tier;save();return true}
function handleTierDrop(e){
 const {playerId,tier,position}=e.detail||{};if(!ownerOn()||!playerId||!tier||!position)return;
 const pos=positionById.get(String(playerId));if(pos!==position)return;
 const finalIndex=desiredIndexForTier(playerId,pos,tier);if(!assignTier(playerId,tier))return;moveToFinalIndex(playerId,finalIndex);toast(`${rowFor(playerId)?.querySelector('.name')?.textContent?.trim()||'Player'} → ${pos} Tier ${tier}`);setTimeout(queue,40);
}
function handleNormalDrag(e){
 const {playerId,targetId}=e.detail||{};const f=activeFilter();if(!ownerOn()||!POSITIONS.includes(f)||!playerId||!targetId)return;
 const p1=positionById.get(String(playerId)),p2=positionById.get(String(targetId));if(p1!==f||p2!==f)return;
 const tier=tierFor(targetId);if(tier&&tierFor(playerId)!==tier){assignTier(playerId,tier);setTimeout(queue,30)}
}

async function start(){styles();await loadPositions();initState();ensureAssignments();queue();window.addEventListener('workhorse:ros-tier-drop',handleTierDrop);window.addEventListener('workhorse:rank-dragged',handleNormalDrag);window.addEventListener('workhorse:owner-mode-changed',()=>setTimeout(queue,0));document.addEventListener('click',e=>{if(e.target.closest?.('[data-filter]'))setTimeout(queue,35)},true);const box=document.querySelector('#rank-rows');if(box){const obs=new MutationObserver(()=>{if(!busy)queue()});obs.observe(box,{childList:true,subtree:true})}}
start();
})();
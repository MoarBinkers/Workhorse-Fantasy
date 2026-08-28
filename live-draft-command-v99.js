// v99.1 — Live Draft command center: visible notes, smarter positional pressure,
// and trade-aware "make it back" guidance using the user's actual owned picks.
(()=>{
  if(window.__WORKHORSE_LIVE_DRAFT_COMMAND_99__)return;
  window.__WORKHORSE_LIVE_DRAFT_COMMAND_99__=true;

  const POSITIONS=['QB','RB','WR','TE'];
  let timer=null;
  const esc99=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function injectCss(){
    if(document.getElementById('whLiveCommand99Css'))return;
    const s=document.createElement('style');s.id='whLiveCommand99Css';s.textContent=`
      #deDraftIntel48{display:none!important}
      #whLiveCommand99{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.5fr);gap:10px;margin:0 0 14px}
      .wh99-panel{border:1px solid #293a49;background:#0e161e;border-radius:14px;padding:13px;min-width:0}.wh99-panel h3{margin:0 0 4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8fa0af}.wh99-sub{font-size:10px;color:#718391;line-height:1.4;margin-bottom:10px}
      .wh99-pos{display:grid;grid-template-columns:34px 68px minmax(0,1fr);gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #1e2b36}.wh99-pos:last-child{border-bottom:0}.wh99-pos>b{font-size:11px}.wh99-pressure{display:inline-flex;justify-content:center;border:1px solid #344957;border-radius:999px;padding:4px 6px;font-size:8px;font-weight:1000;letter-spacing:.05em}.wh99-pressure.low{color:#79cda0;border-color:#346b4b;background:#102018}.wh99-pressure.med{color:#f2c566;border-color:#7b5f31;background:#241d11}.wh99-pressure.high{color:#ff9eaa;border-color:#74434a;background:#28171a}.wh99-pmeta{font-size:9px;color:#94a5b1;line-height:1.45}
      .wh99-player{display:grid;grid-template-columns:minmax(140px,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid #1e2b36}.wh99-player:last-child{border-bottom:0}.wh99-name{font-size:11px;font-weight:950;color:#e8f0f5}.wh99-ranks{font-size:9px;color:#8395a3;margin-top:3px}.wh99-why{font-size:9px;color:#92a2ae;line-height:1.35;margin-top:4px}.wh99-call{white-space:nowrap;border:1px solid #3a4b58;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:1000;letter-spacing:.03em}.wh99-call.take{color:#ff9eaa;border-color:#74434a;background:#28171a}.wh99-call.risk{color:#f2c566;border-color:#7b5f31;background:#241d11}.wh99-call.flip{color:#d7c782;border-color:#665b35;background:#201d12}.wh99-call.back{color:#70d9a0;border-color:#346b4b;background:#102018}.wh99-call.unknown{color:#9aa9b4}
      .wh99-picks{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.wh99-pick{font-size:9px;border:1px solid #2d404f;background:#111b24;color:#a8bac7;border-radius:7px;padding:5px 7px}.wh99-pick.acquired{border-color:#346b4b;color:#78e3a4;background:#102018}
      #draftList .wh99-note{margin:6px 0 2px;padding:7px 9px;border-left:3px solid #5f83a0;border-radius:7px;background:#101b24;color:#c8d6e0;font-size:10px;line-height:1.4;max-width:680px}.wh99-note-label{font-weight:1000;color:#8fb7d4;margin-right:5px}.wh99-note-existing{display:block!important;opacity:1!important;max-height:none!important;overflow:visible!important;color:#c8d6e0!important;background:#101b24!important;border-left:3px solid #5f83a0!important;border-radius:7px!important;padding:7px 9px!important;margin-top:6px!important;font-size:10px!important;line-height:1.4!important}
      @media(max-width:900px){#whLiveCommand99{grid-template-columns:1fr}.wh99-pos{grid-template-columns:30px 64px minmax(0,1fr)}}
    `;document.head.appendChild(s);
  }

  function currentPick(){
    const cards=[...document.querySelectorAll('#deDraftRoomSummary .de-draft-card')];
    const first=cards[0]?.querySelector('.v')?.textContent||'';
    const n=Number(String(first).replace(/[^0-9]/g,''));
    if(Number.isFinite(n)&&n>0)return n;
    try{
      const x=window.DraftEdgeDraftIntelligence?.currentPick?.();
      if(Number(x)>0)return Number(x);
    }catch(_){}
    return null;
  }
  function actualSchedule(){
    try{
      const c=window.WorkhorseDraftTradeCapital?.capital?.();
      const owned=Array.isArray(c?.owned)?c.owned.slice().sort((a,b)=>Number(a.pickNo)-Number(b.pickNo)):[];
      return {owned,acquired:new Set((c?.acquired||[]).map(x=>Number(x.pickNo)))};
    }catch(_){return {owned:[],acquired:new Set()}}
  }
  function targetPick(){
    const cur=currentPick(),schedule=actualSchedule();if(!cur||!schedule.owned.length)return {cur,target:null,schedule};
    const nums=schedule.owned.map(x=>Number(x.pickNo)).filter(Number.isFinite);
    const first=nums.find(n=>n>=cur)||null;
    const target=first===cur?(nums.find(n=>n>cur)||null):first;
    return {cur,target,schedule};
  }
  function market(p){try{return typeof marketFor==='function'?marketFor(p):null}catch(_){return null}}
  function available(){try{return (Array.isArray(players)?players:[]).filter(p=>!p.drafted).sort((a,b)=>(Number(a.overall)||9999)-(Number(b.overall)||9999))}catch(_){return []}}
  function runFor(pos){
    try{return window.DraftEdgeDraftIntelligence?.positionRun?.(pos)||{level:'normal',label:'No run data'}}catch(_){return {level:'normal',label:'No run data'}}
  }
  function tierInfo(p,pool){
    if(!p||p.tier==null||String(p.tier)==='0'||String(p.tier)==='')return {left:null,last:false};
    const same=pool.filter(x=>String(x.position)===String(p.position)&&String(x.tier)===String(p.tier));
    return {left:same.length,last:same.length===1};
  }
  function bestFor(pos,pool){return pool.find(p=>String(p.position||'').toUpperCase()===pos)||null}
  function runScore(run){return run.level==='hot'?4:run.level==='active'?3:run.level==='normal'?1:0}
  function pressureFor(pos,pool,target,cur){
    const best=bestFor(pos,pool),run=runFor(pos),tier=tierInfo(best,pool),m=best?market(best):null,mr=Number(m?.rank)||Number(m?.adp)||0;
    let score=runScore(run);
    if(tier.left===1)score+=3;else if(tier.left===2)score+=2;else if(tier.left===3)score+=1;
    if(target&&mr){if(mr<=target-4)score+=2;else if(mr<=target+3)score+=1}
    if(target&&cur&&target-cur>=10)score+=1;
    const level=score>=6?'high':score>=3?'med':'low';
    const bits=[run.label];
    if(best)bits.push('best: '+best.name);
    if(tier.left!=null)bits.push(tier.left+' left in tier');
    if(target)bits.push('next pick #'+target);
    return {level,score,bits,best,tier,mr};
  }
  function makeItBack(p,pressure,target,cur,pool){
    if(!target||!cur)return {cls:'unknown',label:'NEED PICK INFO',why:'Connect Sleeper and choose your draft slot.'};
    const m=market(p),mr=Number(m?.rank)||Number(m?.adp)||0,tier=tierInfo(p,pool),gap=mr?mr-target:null;
    let cls='back',label='LIKELY BACK';
    if(mr&&mr<=cur){cls='take';label='TAKE NOW'}
    else if((mr&&mr<=target-5)||pressure.level==='high'||tier.last){cls='risk';label='HIGH RISK'}
    else if((mr&&mr<=target+5)||pressure.level==='med'){cls='flip';label='COIN FLIP'}
    else if(mr&&mr>target+12&&pressure.level==='low'){cls='back';label='LIKELY BACK'}
    else {cls='back';label='LEAN BACK'}
    const why=[];
    if(mr)why.push('Sleeper #'+Math.round(mr)+' vs next #'+target);
    why.push(String(p.position)+' pressure '+pressure.level.toUpperCase());
    if(tier.last)why.push('last player in your tier');else if(tier.left&&tier.left<=3)why.push(tier.left+' left in tier');
    if(gap!=null&&gap>=10)why.push('market sits '+Math.round(gap)+' picks after your turn');
    return {cls,label,why:why.slice(0,3).join(' · ')};
  }

  function ensureCommand(){
    injectCss();
    let root=document.getElementById('whLiveCommand99');if(root)return root;
    const old=document.getElementById('deDraftIntel48'),capital=document.getElementById('de98DraftCapital'),list=document.getElementById('draftList');
    const anchor=old||capital||list;if(!anchor?.parentNode)return null;
    root=document.createElement('div');root.id='whLiveCommand99';anchor.parentNode.insertBefore(root,anchor);
    return root;
  }
  function renderCommand(){
    const root=ensureCommand();if(!root)return;
    const pool=available(),{cur,target,schedule}=targetPick();
    const pressure={};POSITIONS.forEach(pos=>pressure[pos]=pressureFor(pos,pool,target,cur));
    const posHtml=POSITIONS.map(pos=>{const x=pressure[pos];return '<div class="wh99-pos"><b>'+pos+'</b><span class="wh99-pressure '+x.level+'">'+x.level.toUpperCase()+'</span><div class="wh99-pmeta">'+x.bits.map(esc99).join(' · ')+'</div></div>'}).join('');
    const upcoming=schedule.owned.filter(x=>!cur||Number(x.pickNo)>=cur).slice(0,8).map(x=>'<span class="wh99-pick '+(schedule.acquired.has(Number(x.pickNo))?'acquired':'')+'">'+esc99(x.label||('#'+x.pickNo))+(schedule.acquired.has(Number(x.pickNo))?' · acquired':'')+'</span>').join('');
    const candidates=pool.slice(0,7).map(p=>{const pos=String(p.position||'').toUpperCase(),call=makeItBack(p,pressure[pos]||pressureFor(pos,pool,target,cur),target,cur,pool),m=market(p);return '<div class="wh99-player"><div><div class="wh99-name">'+esc99(p.name)+'</div><div class="wh99-ranks">Your #'+Number(p.overall)+(m?.rank?' · Sleeper #'+Number(m.rank):'')+' · '+esc99(pos)+'</div><div class="wh99-why">'+esc99(call.why)+'</div></div><span class="wh99-call '+call.cls+'">'+call.label+'</span></div>'}).join('');
    root.innerHTML='<div class="wh99-panel"><h3>Position Run Pressure</h3><div class="wh99-sub">Combines the recent run, your tier depth, Sleeper market, and distance to your actual next owned pick.</div>'+posHtml+'</div><div class="wh99-panel"><h3>Will They Make It Back?</h3><div class="wh99-sub">Uses your real Sleeper pick ownership, including acquired and traded-away picks.'+(target?' Next decision point: <b>#'+target+'</b>.':'')+'</div>'+(upcoming?'<div class="wh99-picks">'+upcoming+'</div>':'')+(candidates||'<div class="small">No available players.</div>')+'</div>';
  }

  function decorateNotes(){
    const root=document.getElementById('draftList');if(!root)return;
    for(const row of root.querySelectorAll(':scope > .player[data-index]')){
      const i=Number(row.dataset.index),p=Number.isInteger(i)?players?.[i]:null,note=String(p?.note||'').trim();
      row.querySelectorAll('.wh99-note').forEach(x=>x.remove());
      if(!note)continue;
      let existing=null;
      for(const el of row.querySelectorAll('.playertext *')){
        if(el.childElementCount===0&&String(el.textContent||'').trim()===note){existing=el;break}
      }
      if(existing){existing.classList.add('wh99-note-existing');continue}
      const host=row.querySelector('.playertext');if(!host)continue;
      const div=document.createElement('div');div.className='wh99-note';div.innerHTML='<span class="wh99-note-label">NOTE</span>'+esc99(note);host.appendChild(div);
    }
  }
  function refresh(){decorateNotes();renderCommand()}
  function hookRender(){
    const base=window.renderDraft;if(typeof base!=='function'||base.__whCommand99)return;
    const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(refresh);return out};
    wrapped.__whCommand99=true;wrapped.__whCommand99Base=base;window.renderDraft=wrapped;try{renderDraft=wrapped}catch(_){}
  }
  function start(){
    hookRender();refresh();clearInterval(timer);timer=setInterval(()=>{
      const page=document.getElementById('page-draft');
      if(page?.classList.contains('active'))refresh();
    },1500);
  }

  document.addEventListener('click',e=>{if(e.target.closest('#connectDraft,#stopDraft'))setTimeout(refresh,700)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='deDraftSlot')setTimeout(refresh,0)});
  setTimeout(start,500);
  window.WorkhorseLiveDraftCommand={refresh};
})();

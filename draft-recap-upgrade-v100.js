// v100.1 — authoritative Workhorse Draft Recap: grade, best/worst values,
// roster-by-position grades, bye/tag review, trade context, and every pick.
(()=>{
  if(window.__WORKHORSE_DRAFT_RECAP_100__)return;
  window.__WORKHORSE_DRAFT_RECAP_100__=true;
  const $=id=>document.getElementById(id);
  const esc100=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const signed=n=>Number(n)>0?'+'+Math.round(Number(n)):String(Math.round(Number(n)||0));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const ps=()=>{try{return Array.isArray(players)?players:[]}catch(_){return []}};
  function market(p){try{const raw=typeof marketFor==='function'?marketFor(p):null;return typeof WorkhorseTrueSleeperAdpEntry==='function'?WorkhorseTrueSleeperAdpEntry(raw):raw}catch(_){return null}}
  function personal(name){try{if(typeof findPersonalByName==='function')return findPersonalByName(name)}catch(_){}return ps().find(p=>norm(p?.name)===norm(name))||null}
  function draftId(){try{const x=currentList?.()?.draftPrefs?.draftId;if(x)return String(x)}catch(_){}const raw=$('draftId')?.value?.trim()||localStorage.getItem('de34_draft_input')||'';const m=String(raw).match(/\/draft(?:\/nfl)?\/(\d{8,})/i)||String(raw).match(/\b\d{8,}\b/);return m?.[1]||''}
  async function sl(url){if(typeof sleeper==='function')return sleeper(url);const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Sleeper HTTP '+r.status);return r.json()}
  async function context(){
    const id=draftId();if(!id)throw new Error('Connect a Sleeper draft first.');
    let draft=null,league=null;
    try{draft=await sl('https://api.sleeper.app/v1/draft/'+id)}catch(_){}
    if(!draft?.draft_id){
      try{league=await sl('https://api.sleeper.app/v1/league/'+id)}catch(_){}
      if(league?.draft_id)draft=await sl('https://api.sleeper.app/v1/draft/'+league.draft_id);
    }
    if(!draft?.draft_id)throw new Error('Could not find that Sleeper draft.');
    if(!league&&draft.league_id)try{league=await sl('https://api.sleeper.app/v1/league/'+draft.league_id)}catch(_){}
    return {draft,league};
  }
  function pForPick(pk){
    const id=String(pk?.player_id||'');
    for(const p of ps()){const m=market(p);if(id&&String(m?.id||p?.sleeperId||p?.id||'')===id)return p}
    const md=pk?.metadata||{},name=[md.first_name,md.last_name].filter(Boolean).join(' ').trim();return personal(name);
  }
  function playerName(pk,p){return p?.name||[pk?.metadata?.first_name,pk?.metadata?.last_name].filter(Boolean).join(' ').trim()||'Unknown player'}
  function gradeForScore(n){if(n>=97)return'A+';if(n>=93)return'A';if(n>=90)return'A−';if(n>=87)return'B+';if(n>=83)return'B';if(n>=80)return'B−';if(n>=77)return'C+';if(n>=73)return'C';if(n>=70)return'C−';if(n>=67)return'D+';if(n>=63)return'D';return'D−'}
  function avg(arr,key){const xs=arr.map(x=>Number(x[key])).filter(Number.isFinite);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}
  function starterNeeds(league){
    const c={QB:1,RB:2,WR:2,TE:1};const rp=Array.isArray(league?.roster_positions)?league.roster_positions.map(x=>String(x).toUpperCase()):[];
    if(rp.length){c.QB=rp.filter(x=>x==='QB').length||1;c.RB=rp.filter(x=>x==='RB').length||2;c.WR=rp.filter(x=>x==='WR').length||2;c.TE=rp.filter(x=>x==='TE').length||1}
    return c;
  }
  function positionGrade(pos,rows,need){
    const mine=rows.filter(x=>x.pos===pos),ap=avg(mine,'personal'),am=avg(mine,'market');
    let score=78;
    if(mine.length>=need)score+=5;else score-=8*(need-mine.length);
    if(ap!=null)score+=clamp(ap*.8,-10,12);if(am!=null)score+=clamp(am*.35,-5,7);
    return {grade:gradeForScore(clamp(score,55,99)),count:mine.length,need,ap};
  }
  function css(){
    if($('whRecap100Css'))return;const s=document.createElement('style');s.id='whRecap100Css';s.textContent=`
      #deRecap65 .de65-card{width:min(100%,980px)}.wh100-hero{display:grid;grid-template-columns:160px 1fr;gap:14px;margin-top:14px}.wh100-grade{border:1px solid #38566b;border-radius:14px;background:#10202b;padding:15px;text-align:center}.wh100-grade .letter{font-size:46px;font-weight:1000;line-height:1}.wh100-grade .score{font-size:10px;color:#8da0ae;margin-top:5px}.wh100-story{border:1px solid #2a3b48;border-radius:14px;background:#101821;padding:14px;font-size:11px;line-height:1.55;color:#c7d4dd}.wh100-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}.wh100-box{padding:11px;border:1px solid #2a3b48;border-radius:11px;background:#101821}.wh100-box b{display:block;font-size:18px}.wh100-box span{display:block;color:#8194a3;font-size:9px;margin-top:3px}.wh100-section{margin-top:16px}.wh100-section h3{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9fb0bc;margin:0 0 7px}.wh100-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.wh100-card{border:1px solid #273946;border-radius:11px;background:#0f1820;padding:11px}.wh100-card .k{font-size:9px;color:#7f92a0;text-transform:uppercase;letter-spacing:.07em}.wh100-card .v{font-size:12px;font-weight:950;margin-top:4px}.wh100-good{color:#76dfa0}.wh100-bad{color:#f3a0aa}.wh100-neutral{color:#d6c67c}.wh100-posgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.wh100-pos{border:1px solid #273946;border-radius:10px;background:#0f1820;padding:10px}.wh100-pos b{font-size:18px}.wh100-pos span{display:block;font-size:9px;color:#8092a0;margin-top:3px}.wh100-table{width:100%;border-collapse:collapse;font-size:9px}.wh100-table th{text-align:left;color:#8194a3;font-size:8px;text-transform:uppercase;letter-spacing:.05em;padding:7px 6px;border-bottom:1px solid #30414e}.wh100-table td{padding:8px 6px;border-bottom:1px solid #1f2d37;vertical-align:top}.wh100-pill{display:inline-block;border:1px solid #344957;border-radius:999px;padding:3px 6px;font-size:8px;font-weight:1000}.wh100-pill.value{color:#76dfa0;border-color:#346b4b;background:#102018}.wh100-pill.reach{color:#f3a0aa;border-color:#74434a;background:#28171a}.wh100-pill.fair{color:#c6d2db}.wh100-pill.trade{margin-left:4px;color:#78e3a4;border-color:#346b4b;background:#102018}.wh100-tagline{font-size:10px;color:#9bacb7;line-height:1.55}
      @media(max-width:700px){.wh100-hero{grid-template-columns:1fr}.wh100-summary,.wh100-posgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.wh100-grid{grid-template-columns:1fr}.wh100-table{font-size:8px}.wh100-table th,.wh100-table td{padding:7px 4px}}
    `;document.head.appendChild(s)
  }
  function classify(x){
    const vals=[x.personal,x.market].filter(Number.isFinite);const v=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    if(v>=8)return {label:'VALUE',cls:'value'};if(v<=-8)return {label:'REACH',cls:'reach'};return {label:'FAIR',cls:'fair'};
  }
  function bestRound(rows){
    const by=new Map();for(const x of rows){const r=Number(x.pk?.round)||Math.ceil(x.pick/12);if(!by.has(r))by.set(r,[]);by.get(r).push(x)}
    let best=null;for(const [round,xs] of by){const vals=xs.flatMap(x=>[x.personal,x.market].filter(Number.isFinite));if(!vals.length)continue;const a=vals.reduce((s,v)=>s+v,0)/vals.length;if(!best||a>best.avg)best={round,avg:a}}
    return best;
  }
  function byeCluster(rows){const c=new Map();for(const x of rows){const b=String(x.p?.bye||'').trim();if(!b||b==='—')continue;c.set(b,(c.get(b)||0)+1)}return [...c.entries()].sort((a,b)=>b[1]-a[1])[0]||null}
  function story(rows,score,best,bigReach,bestR,targetCount,avoidCount){
    const parts=[];
    if(score>=90)parts.push('You consistently let value come to you and stayed close to your board.');else if(score>=80)parts.push('You mostly stayed disciplined to your board with a few aggressive spots.');else parts.push('This draft had more reaches than your board usually calls for, so those picks are the first ones worth reviewing.');
    if(best)parts.push('The standout value was '+playerName(best.pk,best.p)+' at pick #'+best.pick+'.');
    if(bestR)parts.push('Round '+bestR.round+' was your strongest value round.');
    if(bigReach&&Number(bigReach.personal)<-10)parts.push('Your biggest board reach was '+playerName(bigReach.pk,bigReach.p)+'.');
    if(targetCount)parts.push('You landed '+targetCount+' tagged target'+(targetCount===1?'':'s')+'.');
    if(avoidCount)parts.push('You also drafted '+avoidCount+' player'+(avoidCount===1?'':'s')+' you had tagged to avoid.');
    return parts.slice(0,3).join(' ');
  }
  function section(title,body){return '<div class="wh100-section"><h3>'+title+'</h3>'+body+'</div>'}
  async function open(){
    css();try{window.DraftEdgeRecap?.ensureButton?.()}catch(_){}
    const modal=$('deRecap65'),body=$('de65Body');if(!modal||!body){alert('Draft Recap is not ready yet.');return}
    modal.classList.add('open');body.className='small';body.textContent='Building Workhorse recap…';
    try{
      const {draft,league}=await context(),all=await sl('https://api.sleeper.app/v1/draft/'+draft.draft_id+'/picks');
      const ownership=window.DraftEdgeDraftOwnership;if(!ownership?.ownPicks)throw new Error('Draft tracking is not ready yet. Reconnect Sleeper and try again.');
      if(!ownership.selectedSlot?.())throw new Error('Choose your draft slot first.');
      const own=ownership.ownPicks()||[],picks=Array.isArray(all)?all:[];if(!picks.length)throw new Error('No Sleeper draft picks are available yet.');
      const acquired=new Set((window.WorkhorseDraftTradeCapital?.capital?.()?.acquired||[]).map(x=>Number(x.pickNo)));
      const rows=own.map(pk=>{const p=pForPick(pk),m=p?market(p):null,pick=Number(pk.pick_no)||0,pos=String(p?.position||pk?.metadata?.position||'').toUpperCase();return {pk,p,m,pick,pos,market:m?.rank!=null?pick-Number(m.rank):null,personal:p?.overall?pick-Number(p.overall):null,acquired:acquired.has(pick)}}).sort((a,b)=>a.pick-b.pick);
      const avgP=avg(rows,'personal')??0,avgM=avg(rows,'market')??0,targetCount=rows.filter(x=>(x.p?.tags||[]).includes('blue')).length,avoidCount=rows.filter(x=>(x.p?.tags||[]).includes('red')).length;
      const baseScore=82+clamp(avgP*.9,-12,14)+clamp(avgM*.45,-7,8)+Math.min(4,targetCount)-Math.min(10,avoidCount*3),score=Math.round(clamp(baseScore,55,99)),grade=gradeForScore(score);
      const best=rows.filter(x=>Number.isFinite(x.personal)||Number.isFinite(x.market)).sort((a,b)=>((b.personal||0)+(b.market||0))-((a.personal||0)+(a.market||0)))[0]||null;
      const biggestReach=rows.filter(x=>Number.isFinite(x.personal)).sort((a,b)=>a.personal-b.personal)[0]||null;
      const bestR=bestRound(rows),bye=byeCluster(rows),needs=starterNeeds(league),posGrades=['QB','RB','WR','TE'].map(pos=>[pos,positionGrade(pos,rows,needs[pos])]);
      const reachCount=rows.filter(x=>classify(x).cls==='reach').length,valueCount=rows.filter(x=>classify(x).cls==='value').length;
      const storyText=story(rows,score,best,biggestReach,bestR,targetCount,avoidCount);
      const highlights='<div class="wh100-grid">'+
        '<div class="wh100-card"><div class="k">Best Value</div><div class="v wh100-good">'+(best?esc100(playerName(best.pk,best.p))+' · '+signed(Math.max(Number(best.personal)||0,Number(best.market)||0))+' picks':'—')+'</div></div>'+
        '<div class="wh100-card"><div class="k">Biggest Reach vs Your Board</div><div class="v '+(biggestReach&&biggestReach.personal<0?'wh100-bad':'')+'">'+(biggestReach?esc100(playerName(biggestReach.pk,biggestReach.p))+' · '+signed(biggestReach.personal)+' picks':'—')+'</div></div>'+
        '<div class="wh100-card"><div class="k">Best Round</div><div class="v">'+(bestR?'Round '+bestR.round+' · '+signed(bestR.avg)+' avg value':'—')+'</div></div>'+
        '<div class="wh100-card"><div class="k">Bye Cluster</div><div class="v '+(bye&&bye[1]>=4?'wh100-bad':'')+'">'+(bye?'Week '+esc100(bye[0])+' · '+bye[1]+' players':'No major cluster')+'</div></div></div>';
      const posHtml='<div class="wh100-posgrid">'+posGrades.map(([pos,g])=>'<div class="wh100-pos"><div>'+pos+'</div><b>'+g.grade+'</b><span>'+g.count+' drafted · starter need '+g.need+(g.ap!=null?' · '+signed(g.ap)+' avg board value':'')+'</span></div>').join('')+'</div>';
      const table='<div style="overflow:auto"><table class="wh100-table"><thead><tr><th>Pick</th><th>Player</th><th>Pos</th><th>Your Rank</th><th>Sleeper</th><th>Board Value</th><th>Result</th></tr></thead><tbody>'+rows.map(x=>{const c=classify(x);return '<tr><td><b>#'+x.pick+'</b>'+(x.acquired?'<span class="wh100-pill trade">ACQUIRED</span>':'')+'</td><td><b>'+esc100(playerName(x.pk,x.p))+'</b></td><td>'+esc100(x.pos)+'</td><td>'+(x.p?.overall?'#'+x.p.overall:'—')+'</td><td>'+(x.m?.rank?'#'+x.m.rank:'—')+'</td><td class="'+(Number(x.personal)>0?'wh100-good':Number(x.personal)<0?'wh100-bad':'')+'">'+(Number.isFinite(x.personal)?signed(x.personal):'—')+'</td><td><span class="wh100-pill '+c.cls+'">'+c.label+'</span></td></tr>'}).join('')+'</tbody></table></div>';
      body.className='';body.innerHTML='<div class="wh100-hero"><div class="wh100-grade"><div class="letter">'+grade+'</div><div class="score">WORKHORSE SCORE · '+score+'/100</div></div><div class="wh100-story"><b>Draft Story</b><br>'+esc100(storyText)+'</div></div>'+
        '<div class="wh100-summary"><div class="wh100-box"><b>'+rows.length+'</b><span>Your Picks</span></div><div class="wh100-box"><b class="wh100-good">'+valueCount+'</b><span>Value Picks</span></div><div class="wh100-box"><b class="'+(reachCount?'wh100-bad':'')+'">'+reachCount+'</b><span>Reaches</span></div><div class="wh100-box"><b>'+signed(avgP)+'</b><span>Avg Value vs Your Board</span></div></div>'+
        section('Draft Highlights',highlights)+section('Roster By Position',posHtml)+section('Tags & Tendencies','<div class="wh100-tagline"><b>Targets:</b> '+targetCount+' · <b>Safe:</b> '+rows.filter(x=>(x.p?.tags||[]).includes('green')).length+' · <b>Sleepers:</b> '+rows.filter(x=>(x.p?.tags||[]).includes('purple')).length+' · <b>Avoid-tagged:</b> '+avoidCount+' · <b>Avg vs Sleeper:</b> '+signed(avgM)+'</div>')+section('Every Pick You Made',table);
    }catch(e){body.className='small';body.textContent=e?.message||'Could not build the recap.'}
  }
  function install(){
    css();const api=window.DraftEdgeRecap;if(!api?.open)return false;
    api.open=open;api.open.__workhorseRecap100=true;return true;
  }
  if(!install()){let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(t)},100)}
  window.WorkhorseDraftRecap100={open};
})();

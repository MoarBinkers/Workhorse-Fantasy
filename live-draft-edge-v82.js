// v82 — show My Edge vs Sleeper across the entire Live Draft board instead of a later-pick dash.
(()=>{
  let hooked=false,mutating=false;
  const $=id=>document.getElementById(id);

  function css(){
    if($('whLiveDraftEdge82Css'))return;
    const s=document.createElement('style');
    s.id='whLiveDraftEdge82Css';
    s.textContent=`
      #page-draft .de82-edge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;padding:5px 8px;border-radius:8px;border:1px solid #344754;background:#111a22;color:#a8b8c4;font-weight:1000;box-sizing:border-box}
      #page-draft .de82-edge.de82-pos{background:#12261b;border-color:#24563a;color:#78e7a3}
      #page-draft .de82-edge.de82-neg{background:#29191c;border-color:#5f333a;color:#f4a0aa}
      #page-draft .de82-edge.de82-zero{background:#111a22;border-color:#344754;color:#a8b8c4}
      #page-draft .de82-edge.de82-nr{background:#111820;border-color:#2b3945;color:#71808c}
      @media(max-width:760px){#page-draft .player.rankings>.metric:nth-child(5)::before{content:'Edge'!important}}
    `;
    document.head.appendChild(s);
  }

  function rankInfo(p){
    let raw=null,m=null;
    try{raw=typeof marketFor==='function'?marketFor(p):null}catch(_){}
    try{m=typeof window.WorkhorseTrueSleeperAdpEntry==='function'?window.WorkhorseTrueSleeperAdpEntry(raw):(raw?.identityOnly===false?raw:null)}catch(_){}
    const sleeper=Number(m?.rank),source='Sleeper ADP';
    const mine=Number(p?.overall);
    if(!(Number.isFinite(mine)&&mine>0&&Number.isFinite(sleeper)&&sleeper>0))return {mine:Number.isFinite(mine)?mine:null,sleeper:null,edge:null,source:null};
    return {mine,sleeper,edge:sleeper-mine,source};
  }

  function heatClasses(edge){
    if(!Number.isFinite(edge)||edge===0)return '';
    const level=Math.abs(edge)>=24?3:Math.abs(edge)>=12?2:1;
    return ' de64-heat '+(edge>0?'de64-pos':'de64-neg')+level;
  }

  function edgeHtml(p){
    const info=rankInfo(p);
    if(info.edge==null){
      return '<div class="edge de82-edge de82-nr" title="Sleeper does not currently have a usable ADP or live rank for this player.">NR</div>';
    }
    const n=info.edge;
    const text=(n>0?'+':'')+n;
    const tone=n>0?' de82-pos good':n<0?' de82-neg bad':' de82-zero';
    const meaning=n>0
      ? 'You rank this player '+Math.abs(n)+' spots higher than '+info.source+'.'
      : n<0
        ? 'You rank this player '+Math.abs(n)+' spots lower than '+info.source+'.'
        : 'Your rank matches '+info.source+'.';
    return '<div class="edge de82-edge'+tone+heatClasses(n)+'" title="'+meaning+'">'+text+'</div>';
  }

  function decorate(){
    const list=$('draftList');if(!list||mutating)return;
    mutating=true;
    try{
      const heads=list.querySelector(':scope > .colheads.rankings');
      const cols=heads?.children||[];
      if(cols[4])cols[4].textContent='My Edge';

      list.querySelectorAll(':scope > .player.rankings[data-index]').forEach(row=>{
        const i=Number(row.dataset.index);
        let p=null;try{p=Number.isInteger(i)&&Array.isArray(players)?players[i]:null}catch(_){}
        if(!p)return;
        const metrics=row.querySelectorAll(':scope > .metric');
        if(!metrics[3])return;
        metrics[3].innerHTML=edgeHtml(p);
      });

      const guide=$('whDraftGuide76');
      const auto=guide?.querySelector('.wh76-auto');
      if(auto&&!auto.dataset.edge82){
        auto.dataset.edge82='1';
        for(const node of auto.childNodes){
          if(node.nodeType===Node.TEXT_NODE&&/updates Value Now and wait risk signals/i.test(node.nodeValue||'')){
            node.nodeValue=String(node.nodeValue).replace(/updates Value Now and wait risk signals/i,'updates My Edge, Value Now, and wait risk signals');
          }
        }
      }

      const legend=$('whLegend76')?.querySelector('.wh76-body');
      if(legend&&!legend.querySelector('[data-edge82-legend]')){
        const valueRow=[...legend.querySelectorAll('.wh76-legend-row')].find(x=>/Value Now/i.test(x.querySelector('.wh76-term')?.textContent||''));
        const row=document.createElement('div');
        row.className='wh76-legend-row';row.dataset.edge82Legend='1';
        row.innerHTML='<div class="wh76-term"><span class="wh76-green">My Edge</span></div><div class="wh76-explain">Compares your overall rank with Sleeper. <b>+10</b> means you rank the player 10 spots higher than Sleeper; <b>-10</b> means you rank him 10 spots lower. This comparison works anywhere on your draft board, not only near the current pick.</div>';
        if(valueRow)valueRow.before(row);else legend.appendChild(row);
      }
    }finally{mutating=false}
  }

  function hook(){
    if(hooked)return true;
    const base=window.renderDraft;
    if(typeof base!=='function')return false;
    if(base.__workhorseLiveDraftEdge82){hooked=true;return true}
    const wrapped=function(...args){
      const out=base.apply(this,args);
      queueMicrotask(decorate);
      return out;
    };
    wrapped.__workhorseLiveDraftEdge82=true;
    wrapped.__workhorseLiveDraftEdge82Base=base;
    window.renderDraft=wrapped;
    try{renderDraft=wrapped}catch(_){}
    hooked=true;return true;
  }

  function install(){css();hook();decorate()}
  install();
  [150,600,1500,3500].forEach(ms=>setTimeout(()=>{hook();decorate()},ms));
  const boot=new MutationObserver(()=>{if(!mutating)decorate()});
  const startObserver=()=>{const list=$('draftList');if(list&&!list.__edge82Observed){boot.observe(list,{childList:true,subtree:false});list.__edge82Observed=true}};
  startObserver();setTimeout(startObserver,500);setTimeout(startObserver,1500);
})();

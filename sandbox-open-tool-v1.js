(()=>{
'use strict';
const tool=new URLSearchParams(location.search).get('tool');
if(!tool)return;
const wanted={adp:/current\s*adp/i,draft:/live\s*draft/i,rankings:/my\s*rankings|rankings/i}[tool];
if(!wanted)return;
let tries=0;const timer=setInterval(()=>{tries++;const nodes=[...document.querySelectorAll('button,a,[role="button"]')];const hit=nodes.find(x=>wanted.test((x.textContent||'').trim()));if(hit){clearInterval(timer);try{hit.click()}catch(_){}}else if(tries>24)clearInterval(timer)},500);
})();
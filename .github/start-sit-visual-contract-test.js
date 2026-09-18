'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');

const must=[
  'function styles(){',
  'function shell(){',
  'class="controls"',
  'class="searchbox"',
  'id="ss-picked"',
  'id="ss-run"',
  'class="cards"',
  'styles();shell();bind();'
];
for(const m of must){ if(!s.includes(m)) throw new Error('Start/Sit visual contract missing: '+m); }

const forbidden=['function extraStyles()','class="model-grid"','class="evidence"'];
for(const m of forbidden){ if(s.includes(m)) throw new Error('Start/Sit visual contract forbids broad UI injection: '+m); }

const styleMatch=s.match(/function styles\(\)\{document\.head\.insertAdjacentHTML\('beforeend',`<style>([\s\S]*?)<\/style>`\)\}/);
if(!styleMatch) throw new Error('Start/Sit style block changed shape');
const css=styleMatch[1];
for(const selector of ['.controls{','.cards{','.card{','.metrics{','@media(max-width:720px)']){
  if(!css.includes(selector)) throw new Error('Start/Sit core layout rule missing: '+selector);
}
console.log('PASS: Start/Sit visual contract');
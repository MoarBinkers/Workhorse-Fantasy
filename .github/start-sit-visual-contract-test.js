'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  'id="wh-startsit"',
  '#wh-startsit .controls{',
  '#wh-startsit .cards{',
  '#wh-startsit .card{',
  '#wh-startsit .metrics{',
  '#wh-startsit details.data{',
  '#wh-startsit .data-grid{',
  'styles();shell();bind();'
];
for(const m of must){if(!s.includes(m))throw new Error('Start/Sit visual contract missing: '+m)}
const bad=[
  ':root{',
  'html,body{',
  'body{margin:',
  '*{box-sizing:border-box}',
  'function extraStyles()'
];
for(const m of bad){if(s.includes(m))throw new Error('Unscoped Start/Sit visual rule detected: '+m)}
const style=(s.match(/<style id="wh-startsit-css">([\s\S]*?)<\/style>/)||[])[1]||'';
if(!style)throw new Error('Scoped Start/Sit stylesheet missing');
for(const selector of style.match(/(^|\})\s*([^@][^{]+)\{/g)||[]){
  const raw=selector.replace(/^\}/,'').trim().replace(/\{$/,'').trim();
  if(raw && !raw.startsWith('#wh-startsit') && !raw.startsWith('from') && !raw.startsWith('to')){
    throw new Error('Start/Sit selector is not root-scoped: '+raw);
  }
}
console.log('PASS: Start/Sit visual contract');
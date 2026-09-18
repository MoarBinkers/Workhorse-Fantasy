'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  'id="wh-startsit"',
  '<style id="wh-startsit-css">',
  '#wh-startsit .setup{',
  '#wh-startsit .searchrow{',
  '#wh-startsit .compare-panel{',
  '#wh-startsit .matrix{',
  '#wh-startsit .playercol{',
  '#wh-startsit .details-grid{',
  'function renderMatrix(graded)',
  'function renderDetails(graded)',
  "label:'Player props'",
  "label:'Last game'",
  'styles();shell();bind();'
];
for(const m of must){if(!s.includes(m))throw new Error('Start/Sit visual contract missing: '+m)}
const bad=[':root{','html,body{','body{margin:','function extraStyles()','font-size:6px','font-size:7px','font-size:8px'];
for(const m of bad){if(s.includes(m))throw new Error('Start/Sit visual regression detected: '+m)}
if(s.includes('class="cards"')||s.includes('class="metric"'))throw new Error('Old dense card grid returned');
const css=(s.match(/<style id="wh-startsit-css">([\s\S]*?)<\/style>/)||[])[1]||'';
if(!css)throw new Error('Scoped Start/Sit stylesheet missing');
for(const selector of ['.top{','.shell{','.intro{','.setup{','.matrix{','.details-grid{']){
 if(!css.includes('#wh-startsit '+selector))throw new Error('Critical selector is not Start/Sit scoped: '+selector);
}
console.log('PASS: Start/Sit visual contract');

'use strict';
const fs=require('fs');
const s=fs.readFileSync('season-start-sit-v1.js','utf8');
const must=[
  'id="wh-startsit"',
  '<style id="wh-startsit-css">',
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
  'function extraStyles()',
  'document.head.insertAdjacentHTML(\'beforeend\',`<style>\n:root'
];
for(const m of bad){if(s.includes(m))throw new Error('Unscoped Start/Sit visual rule detected: '+m)}
const css=(s.match(/<style id="wh-startsit-css">([\s\S]*?)<\/style>/)||[])[1]||'';
if(!css)throw new Error('Scoped Start/Sit stylesheet missing');
const critical=['.top{','.shell{','.hero{','.controls{','.searchrow{','.winner{','.cards{','.card{','.metrics{','.data-grid{'];
for(const name of critical){if(!css.includes('#wh-startsit '+name))throw new Error('Critical Start/Sit selector is not root-scoped: '+name)}
console.log('PASS: Start/Sit visual contract');
'use strict';
const fs=require('fs');
const start=fs.readFileSync('season-start-sit-v1.js','utf8');
const ranks=fs.readFileSync('season-rankings-v3.js','utf8');
const seed=fs.readFileSync('season-rankings-seed-v1.js','utf8');

const mustStart=[
  'function weeklyOrder()',
  "wh_week_master_v3::${week}",
  "source:'default'",
  '(Number(a.sleeper_rank)||9999)-(Number(b.sleeper_rank)||9999)'
];
for(const m of mustStart)if(!start.includes(m))throw new Error('Start/Sit ranking fallback missing: '+m);

if(start.includes("rank is not initialized in this browser"))throw new Error('Start/Sit must not report missing Workhorse rank when default weekly board exists');

if(!ranks.includes("if(view!=='mine'&&!loadStore(activeKey())&&order.length)"))throw new Error('Rankings page must persist resolved master order');
if(!ranks.includes("localStorage.setItem(activeKey(),JSON.stringify(order))"))throw new Error('Rankings page does not save resolved order');

if(!seed.includes('function resolvedWeek()'))throw new Error('Ranking seed does not resolve displayed NFL week');
if(!seed.includes('function storageKey()'))throw new Error('Ranking seed still uses a fixed startup week key');
if(seed.includes('localStorage.setItem(key,JSON.stringify(ids))'))throw new Error('Ranking seed can still save to stale fixed week key');

const engine=fs.readFileSync('workhorse-decision-engine-v1.js','utf8');
const forbiddenScore=[
  'input.weeklyRank',
  'rankComponent',
  'rankWeight',
  'Workhorse weekly rank #'
];
for(const m of forbiddenScore)if(engine.includes(m))throw new Error('Weekly rank leaked back into Start/Sit engine: '+m);
for(const m of ['weeklyRank:rank','coreFallbackScore({rank','rank-emergency','components:{rank'])if(start.includes(m))throw new Error('Weekly rank leaked back into Start/Sit frontend scoring: '+m);
if(!start.includes("Reference only · NOT used in Start/Sit score"))throw new Error('Weekly rank row must be explicitly display-only');

console.log('PASS: Weekly Rankings stay available for display/order but do not influence Start/Sit scoring');

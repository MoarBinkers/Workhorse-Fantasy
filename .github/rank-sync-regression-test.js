const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

// Minimal browser shell needed to load the production ranking model in Node.
global.window=global;
window.matchMedia=()=>({matches:false});
window.addEventListener=()=>{};
global.document={
  getElementById:()=>null,
  querySelectorAll:()=>[],
  addEventListener:()=>{},
  createElement:()=>({id:'',textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},querySelectorAll:()=>[]}),
  head:{appendChild(){}},
  documentElement:{}
};
global.MutationObserver=class{constructor(cb){this.cb=cb}observe(){}disconnect(){}};
global.requestIdleCallback=()=>{};
global.save=()=>{};
global.renderRankings=()=>{};
global.renderEverything=()=>{};
global.loadActiveList=()=>{};
global.rankPos='ALL';

global.tiers={
  WR:[{id:1,name:'Tier 1'},{id:2,name:'Tier 2'}],
  RB:[{id:1,name:'Tier 1'},{id:2,name:'Tier 2'}],
  QB:[],TE:[]
};
global.players=[
  {name:'RB1',position:'RB',overall:1,posRank:1,tier:1},
  {name:'WR1',position:'WR',overall:2,posRank:1,tier:1},
  {name:'QB1',position:'QB',overall:3,posRank:1,tier:null},
  {name:'WR2',position:'WR',overall:4,posRank:2,tier:1},
  {name:'RB2',position:'RB',overall:5,posRank:2,tier:2},
  {name:'WR3',position:'WR',overall:6,posRank:3,tier:2},
  {name:'TE1',position:'TE',overall:7,posRank:1,tier:null},
  {name:'WR4',position:'WR',overall:8,posRank:4,tier:2}
];

vm.runInThisContext(fs.readFileSync('rank-sync-v38.js','utf8'),{filename:'rank-sync-v38.js'});
const model=window.WorkhorseRankingModel;
assert(model&&model.version==='39.7','unified ranking model did not load');

const byName=name=>players.find(p=>p.name===name);
const ordered=()=>players.slice().sort((a,b)=>a.overall-b.overall);
const wrOrder=()=>ordered().filter(p=>p.position==='WR').map(p=>p.name);
const tierCounts=()=>{
  const out={};players.filter(p=>p.position==='WR').forEach(p=>out[p.tier]=(out[p.tier]||0)+1);return out;
};

// 1) A cross-tier WR move must rewrite the same WR Overall slots.
model.reorderPosition(byName('WR3'),byName('WR1'),false,1);
assert.deepStrictEqual(wrOrder(),['WR3','WR1','WR2','WR4']);
assert.strictEqual(byName('WR3').overall,2);
assert.strictEqual(byName('WR3').posRank,1);
assert.deepStrictEqual(tierCounts(),{'1':3,'2':1});
assert(model.audit().ok,'cross-tier position move left the ranking model inconsistent');

// 2) Moving a player in ALL must update position rank and tier-band placement.
model.reorderAll(byName('WR4'),byName('RB1'),false);
assert.strictEqual(byName('WR4').overall,1);
assert.strictEqual(byName('WR4').posRank,1);
assert.strictEqual(byName('WR4').tier,1);
assert.deepStrictEqual(wrOrder(),['WR4','WR3','WR1','WR2']);
assert.deepStrictEqual(tierCounts(),{'1':3,'2':1});
assert(model.audit().ok,'ALL move did not flow back through position/tier order');

// 3) Reordering whole tiers must also rewrite Overall-relative position order.
tiers.WR=[{id:2,name:'Tier 2'},{id:1,name:'Tier 1'}];
resequencePos('WR');
assert.strictEqual(wrOrder()[0],'WR2');
assert.strictEqual(byName('WR2').posRank,1);
assert(model.audit().ok,'tier reorder became an independent ranking again');

console.log('Connected Overall/position/tier ranking regression checks passed.');

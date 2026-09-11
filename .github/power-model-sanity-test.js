global.window=global;
require('../season-league-power-model-v2.js');
const M=global.WorkhorsePowerModelV2;
if(!M)throw new Error('Power model missing');
const ctx={league:{total_rosters:12,roster_positions:['QB','RB','RB','WR','WR','TE','FLEX','FLEX','BN','BN','BN','BN','BN','BN']},rosters:Array.from({length:12},()=>({}))};
const val=(pos,overall,posRank)=>M.playerValue(ctx,pos,overall,posRank);
const eliteRb=val('RB',1,1);
const solidRb=val('RB',80,24);
const adjacentTe1=val('TE',20,1);
const adjacentTe2=val('TE',21,2);
const qb1=val('QB',35,1);
const qb4=val('QB',38,4);
const checks={
  'elite RB is meaningful but not another full starter': eliteRb/solidRb < 1.40,
  'elite RB still has an advantage': eliteRb/solidRb > 1.15,
  'adjacent overall TE ranks stay close': Math.abs(adjacentTe1-adjacentTe2) < 3,
  'nearby QB ranks stay reasonably close': Math.abs(qb1-qb4) < 8,
  'top raw player stays below 125': eliteRb < 125,
};
for(const [name,ok] of Object.entries(checks))console.log(`${ok?'PASS':'FAIL'}: ${name}`);
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length)throw new Error(`Power sanity checks failed: ${failed.join(', ')}`);
console.log('Values:',{eliteRb:eliteRb.toFixed(1),solidRb:solidRb.toFixed(1),adjacentTe1:adjacentTe1.toFixed(1),adjacentTe2:adjacentTe2.toFixed(1),qb1:qb1.toFixed(1),qb4:qb4.toFixed(1)});
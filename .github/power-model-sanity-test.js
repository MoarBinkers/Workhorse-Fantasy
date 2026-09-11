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

function team(prefix,ranks){
  const defs=[['QB',1],['RB',1],['RB',12],['WR',1],['WR',12],['TE',1],['RB',24],['WR',24]];
  const pool=new Map(),rankMap=new Map(),posRankMap=new Map(),ids=[];
  defs.forEach(([position,posRank],i)=>{const id=`${prefix}${i}`;ids.push(id);pool.set(id,{player_id:id,full_name:id,position,team:'X',sleeper_rank:ranks[i],position_rank:posRank});rankMap.set(id,ranks[i]);posRankMap.set(id,posRank)});
  return{ids,pool,rankMap,posRankMap};
}
const star=team('s',[1,120,130,140,150,160,170,180]);
const balanced=team('b',[45,50,55,60,65,70,75,80]);
function rosterScore(t){return M.metric({...ctx,pool:t.pool,rankMap:t.rankMap,posRankMap:t.posRankMap},{players:t.ids}).rosterScore}
const starHeavy=rosterScore(star),balancedTeam=rosterScore(balanced);

const checks={
  'elite RB is meaningful but not another full starter': eliteRb/solidRb < 1.35,
  'elite RB still has an advantage': eliteRb/solidRb > 1.10,
  'adjacent overall TE ranks stay close': Math.abs(adjacentTe1-adjacentTe2) < 3,
  'nearby QB ranks stay reasonably close': Math.abs(qb1-qb4) < 7,
  'top raw player stays below 118': eliteRb < 118,
  'balanced starting eight beats one superstar plus weak starters': balancedTeam > starHeavy,
};
for(const [name,ok] of Object.entries(checks))console.log(`${ok?'PASS':'FAIL'}: ${name}`);
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
console.log('Values:',{eliteRb:eliteRb.toFixed(1),solidRb:solidRb.toFixed(1),adjacentTe1:adjacentTe1.toFixed(1),adjacentTe2:adjacentTe2.toFixed(1),qb1:qb1.toFixed(1),qb4:qb4.toFixed(1),starHeavy:starHeavy.toFixed(1),balancedTeam:balancedTeam.toFixed(1)});
if(failed.length)throw new Error(`Power sanity checks failed: ${failed.join(', ')}`);
global.window=global;
require('../season-league-power-model-v2.js');
const M=global.WorkhorsePowerModelV2;
if(!M)throw new Error('Power model missing');
const ctx={league:{total_rosters:12,roster_positions:['QB','RB','RB','WR','WR','TE','FLEX','FLEX','BN','BN','BN','BN','BN','BN']},rosters:Array.from({length:12},()=>({}))};
const asset=(pos,overall,posRank)=>M.playerValue(ctx,pos,overall,posRank);
const slot=(pos,overall,posRank)=>M.starterSlotValue(ctx,pos,overall,posRank);
const adjacentTe1=asset('TE',20,1),adjacentTe2=asset('TE',21,2);
const qb1Slot=slot('QB',35,1),qb14Slot=slot('QB',112,14);
const rb1Slot=slot('RB',1,1),rb24Slot=slot('RB',80,24);

function makeTeam(prefix,defs){
  const pool=new Map(),rankMap=new Map(),posRankMap=new Map(),ids=[];
  defs.forEach(([position,posRank,overallRank],i)=>{const id=`${prefix}${i}`;ids.push(id);pool.set(id,{player_id:id,full_name:id,position,team:'X',sleeper_rank:overallRank,position_rank:posRank});rankMap.set(id,overallRank);posRankMap.set(id,posRank)});
  return{ids,pool,rankMap,posRankMap};
}
const starHeavy=makeTeam('s',[
  ['QB',12,110],['RB',1,1],['RB',30,120],['WR',30,125],['WR',36,135],['TE',12,115],['RB',36,145],['WR',48,155]
]);
const balanced=makeTeam('b',[
  ['QB',6,45],['RB',10,32],['RB',12,40],['WR',10,35],['WR',12,42],['TE',6,50],['RB',18,55],['WR',18,60]
]);
function rosterScore(t){return M.metric({...ctx,pool:t.pool,rankMap:t.rankMap,posRankMap:t.posRankMap},{players:t.ids}).rosterScore}
const starHeavyScore=rosterScore(starHeavy),balancedScore=rosterScore(balanced);

const checks={
  'adjacent overall TE assets stay close': Math.abs(adjacentTe1-adjacentTe2) < 3,
  'qb1 vs qb14 starting-slot gap stays modest': qb1Slot-qb14Slot > 8 && qb1Slot-qb14Slot < 22,
  'elite RB improves one slot but is not another starter': rb1Slot/rb24Slot < 1.35,
  'elite RB still has meaningful slot edge': rb1Slot-rb24Slot > 12,
  'balanced eight beats one superstar plus lineup holes': balancedScore > starHeavyScore,
  'starter slot value has a hard ceiling': rb1Slot <= 112,
};
for(const [name,ok] of Object.entries(checks))console.log(`${ok?'PASS':'FAIL'}: ${name}`);
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
console.log('Values:',{adjacentTe1:adjacentTe1.toFixed(1),adjacentTe2:adjacentTe2.toFixed(1),qb1Slot:qb1Slot.toFixed(1),qb14Slot:qb14Slot.toFixed(1),rb1Slot:rb1Slot.toFixed(1),rb24Slot:rb24Slot.toFixed(1),starHeavyScore:starHeavyScore.toFixed(1),balancedScore:balancedScore.toFixed(1)});
if(failed.length)throw new Error(`Power sanity checks failed: ${failed.join(', ')}`);
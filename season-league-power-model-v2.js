(()=>{
'use strict';
if(window.WorkhorsePowerModelV2)return;
const POS=['QB','RB','WR','TE'];

// Historical PPR rank-band shapes calibrate positional scarcity. They do NOT set
// current-player projections. Workhorse ROS order remains the primary value signal.
const HIST={
  QB:[[1,24.5],[2,23.3],[4,21.8],[6,20.3],[8,19.4],[10,18.6],[12,17.9],[16,16.5],[20,15.4],[24,14.5],[32,12.5]],
  RB:[[1,22.5],[2,21.0],[4,19.0],[6,17.5],[8,16.3],[12,14.8],[18,13.0],[24,11.8],[30,10.6],[36,9.6],[48,7.9],[60,6.7],[72,5.8]],
  WR:[[1,23.0],[2,21.5],[4,19.2],[6,17.8],[8,16.7],[12,15.3],[18,13.9],[24,12.8],[30,11.9],[36,11.0],[48,9.6],[60,8.3],[72,7.2],[90,6.0]],
  TE:[[1,16.5],[2,14.9],[4,13.5],[6,11.8],[8,10.6],[10,9.8],[12,9.1],[16,8.1],[20,7.4],[24,6.8],[32,5.8]],
};
const POSITION_FLOOR={QB:8,RB:4.5,WR:4.5,TE:4.5};
const finite=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
function rosterSlots(ctx){return Array.isArray(ctx?.league?.roster_positions)?ctx.league.roster_positions:[]}
function leagueSize(ctx){return Math.max(2,finite(ctx?.league?.total_rosters,ctx?.rosters?.length||12))}
function directSlots(ctx,pos){const n=rosterSlots(ctx).filter(x=>x===pos).length;if(n)return n;return({QB:1,RB:2,WR:2,TE:1}[pos]||1)}
function flexCounts(ctx){const s=rosterSlots(ctx);return{
  flex:s.filter(x=>['FLEX','WRRBTE_FLEX'].includes(x)).length,
  rec:s.filter(x=>x==='REC_FLEX').length,
  wrrb:s.filter(x=>x==='WRRB_FLEX').length,
  superflex:s.filter(x=>x==='SUPER_FLEX').length,
}}
function replacementRank(ctx,pos){const n=leagueSize(ctx),base=directSlots(ctx,pos)*n,f=flexCounts(ctx);let extra=0;
  if(pos==='QB')extra=f.superflex*n*.78;
  if(pos==='RB')extra=(f.flex*n*.38)+(f.wrrb*n*.44)+(f.superflex*n*.08);
  if(pos==='WR')extra=(f.flex*n*.50)+(f.rec*n*.58)+(f.wrrb*n*.56)+(f.superflex*n*.11);
  if(pos==='TE')extra=(f.flex*n*.12)+(f.rec*n*.42)+(f.superflex*n*.03);
  return Math.max(1,Math.round(base+extra));
}
function historicalPpg(pos,posRank){const a=HIST[pos]||HIST.WR,r=Math.max(1,finite(posRank,999));if(r<=a[0][0])return a[0][1];for(let i=1;i<a.length;i++){const [r1,v1]=a[i-1],[r2,v2]=a[i];if(r<=r2){const t=(r-r1)/(r2-r1);return v1+(v2-v1)*t}}const [lastR,lastV]=a[a.length-1];return Math.max(POSITION_FLOOR[pos]||4.5,lastV-.08*(r-lastR))}

// Roster POWER is intentionally flatter than trade value. One elite player occupies
// one lineup slot; the other starting spots must carry most of the team result.
function rosBase(overallRank){const r=Math.max(1,finite(overallRank,999));return 60+45*Math.exp(-.006*(r-1))}

// Positional history is a small scarcity nudge, never a second dominant value curve.
function scarcityAdjustment(ctx,pos,posRank){const hist=historicalPpg(pos,posRank),repl=historicalPpg(pos,replacementRank(ctx,pos)),delta=hist-repl;return Math.max(-3,Math.min(7,delta*.7))}
function playerValue(ctx,pos,overallRank,posRank){return Math.max(34,finite(rosBase(overallRank)+scarcityAdjustment(ctx,pos,posRank),34))}
function rankFor(ctx,id,p){return ctx.rankMap?.get(String(id))||finite(p?.sleeper_rank,999)}
function posRankFor(ctx,id,p){return ctx.posRankMap?.get(String(id))||finite(p?.position_rank,999)}
function chooseFixed(all,selected,pos,count){for(let i=0;i<count;i++){const p=all.filter(x=>x.position===pos&&!selected.has(x.id)).sort((a,b)=>b.raw-a.raw||a.overallRank-b.overallRank)[0];if(!p)break;selected.add(p.id);p.lineupRole=pos;p.depthWeight=1}}
function chooseFlexible(all,selected,eligible,count,label){for(let i=0;i<count;i++){const p=all.filter(x=>eligible.includes(x.position)&&!selected.has(x.id)).sort((a,b)=>b.raw-a.raw||a.overallRank-b.overallRank)[0];if(!p)break;selected.add(p.id);p.lineupRole=label;p.depthWeight=1}}
function benchWeight(ctx,p,index){const n=leagueSize(ctx),f=flexCounts(ctx);if(p.position==='QB'){
  if(f.superflex)return index===0?.10:index===1?.04:.01;
  if(index===0)return p.posRank<=n?.03:.01;
  return index===1?.003:.001;
}
  if(p.position==='TE'){
    if(index===0){if(p.posRank<=Math.max(4,Math.round(n*.33)))return .12;if(p.posRank<=Math.max(8,Math.round(n*.67)))return .06;return .025}
    return index===1?.012:.006;
  }
  if(p.position==='RB'||p.position==='WR')return[.30,.18,.10,.06,.04,.03][index]??.02;
  return .01;
}
function bestLegalLineup(ctx,all){const selected=new Set();for(const pos of POS)chooseFixed(all,selected,pos,directSlots(ctx,pos));const f=flexCounts(ctx);
  chooseFlexible(all,selected,['RB','WR'],f.wrrb,'WR/RB FLEX');
  chooseFlexible(all,selected,['WR','TE'],f.rec,'REC FLEX');
  chooseFlexible(all,selected,['RB','WR','TE'],f.flex,'FLEX');
  chooseFlexible(all,selected,['QB','RB','WR','TE'],f.superflex,'SUPER FLEX');
  for(const pos of POS){const bench=all.filter(x=>x.position===pos&&!selected.has(x.id)).sort((a,b)=>b.raw-a.raw||a.overallRank-b.overallRank);bench.forEach((p,i)=>{p.lineupRole='DEPTH';p.depthWeight=benchWeight(ctx,p,i)})}
  return selected;
}

// Roster balance matters: 75% of lineup strength is the whole starting lineup and
// 25% is driven by the weaker half. This prevents one or two stars from hiding holes.
function lineupBalance(starters){if(!starters.length)return{factor:1,lineupScore:0,starterSum:0,lowerHalfAvg:0};const values=starters.map(p=>Math.max(0,finite(p.raw,0))).sort((a,b)=>a-b),starterSum=values.reduce((n,v)=>n+v,0),lowerCount=Math.max(1,Math.ceil(values.length/2)),lowerHalfAvg=values.slice(0,lowerCount).reduce((n,v)=>n+v,0)/lowerCount,lineupScore=starterSum*.75+(lowerHalfAvg*values.length)*.25,factor=starterSum>0?Math.max(.72,Math.min(1,lineupScore/starterSum)):1;return{factor,lineupScore,starterSum,lowerHalfAvg}}
function metric(ctx,r){const all=(r.players||[]).map(id=>{const p=ctx.pool?.get(String(id));if(!p||!POS.includes(p.position))return null;const overallRank=rankFor(ctx,id,p),posRank=posRankFor(ctx,id,p),historyPpg=historicalPpg(p.position,posRank),replacementPpg=historicalPpg(p.position,replacementRank(ctx,p.position));return{...p,id:String(id),overallRank,posRank,historyPpg,replacementPpg,scarcityAdjustment:scarcityAdjustment(ctx,p.position,posRank),rosBase:rosBase(overallRank),raw:playerValue(ctx,p.position,overallRank,posRank),depthWeight:0,lineupRole:'DEPTH',score:0}}).filter(Boolean);
  bestLegalLineup(ctx,all);const starters=all.filter(p=>p.depthWeight===1),balance=lineupBalance(starters),pos={QB:0,RB:0,WR:0,TE:0};let rosterScore=0;for(const p of all){const w=p.depthWeight===1?balance.factor:p.depthWeight;p.rosterWeight=w;p.score=Math.max(0,finite(p.raw*w,0));pos[p.position]+=p.score;rosterScore+=p.score}for(const k of POS)pos[k]=Math.max(0,finite(pos[k],0));return{all,pos,rosterScore:Math.max(0,finite(rosterScore,0)),balanceFactor:balance.factor,lowerHalfAvg:balance.lowerHalfAvg,starterSum:balance.starterSum};
}
function buildTeams(ctx){const list=(ctx.rosters||[]).map(r=>({r,m:metric(ctx,r),ranks:{},overall:0}));for(const p of POS)[...list].sort((a,b)=>b.m.pos[p]-a.m.pos[p]).forEach((t,i)=>t.ranks[p]=i+1);[...list].sort((a,b)=>b.m.rosterScore-a.m.rosterScore).forEach((t,i)=>{t.ranks.overall=i+1;t.overall=t.m.rosterScore});return list}
function offenseStarterCount(ctx){const n=rosterSlots(ctx).filter(x=>['QB','RB','WR','TE','FLEX','SUPER_FLEX','WRRB_FLEX','REC_FLEX','WRRBTE_FLEX'].includes(x)).length;return n||7}
function benchSlotCount(ctx){const n=rosterSlots(ctx).filter(x=>x==='BN').length;return n||6}
window.WorkhorsePowerModelV2={POS,HIST,finite,leagueSize,directSlots,flexCounts,replacementRank,historicalPpg,rosBase,scarcityAdjustment,playerValue,lineupBalance,metric,buildTeams,offenseStarterCount,benchSlotCount};
})();
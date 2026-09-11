(()=>{
'use strict';
if(window.WorkhorsePowerModelV2)return;
const POS=['QB','RB','WR','TE'];
const PPG={
  QB:{floor:18.5,ceiling:24.5,decay:.075,edge:2.0},
  RB:{floor:7.8,ceiling:21.5,decay:.065,edge:3.0},
  WR:{floor:8.8,ceiling:21.5,decay:.055,edge:2.8},
  TE:{floor:7.8,ceiling:16.5,decay:.13,edge:2.5},
};
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
  if(pos==='RB')extra=((f.flex*n*.38)+(f.wrrb*n*.44)+(f.superflex*n*.08));
  if(pos==='WR')extra=((f.flex*n*.50)+(f.rec*n*.58)+(f.wrrb*n*.56)+(f.superflex*n*.11));
  if(pos==='TE')extra=((f.flex*n*.12)+(f.rec*n*.42)+(f.superflex*n*.03));
  return Math.max(1,Math.round(base+extra));
}
function modeledPpg(pos,posRank){const p=PPG[pos]||PPG.WR,r=Math.max(1,finite(posRank,999));return p.floor+(p.ceiling-p.floor)*Math.exp(-p.decay*Math.max(0,r-1))}
function rankPremium(overallRank){return 6*Math.exp(-.018*Math.max(0,finite(overallRank,999)-1))}
function playerValue(ctx,pos,overallRank,posRank){const proj=modeledPpg(pos,posRank),replRank=replacementRank(ctx,pos),repl=modeledPpg(pos,replRank),edge=Math.max(0,proj-repl),cfg=PPG[pos]||PPG.WR;return Math.max(5,finite(proj*2.5+edge*cfg.edge+rankPremium(overallRank),5))}
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
function metric(ctx,r){const all=(r.players||[]).map(id=>{const p=ctx.pool?.get(String(id));if(!p||!POS.includes(p.position))return null;const overallRank=rankFor(ctx,id,p),posRank=posRankFor(ctx,id,p),projectedPpg=modeledPpg(p.position,posRank),replacementPpg=modeledPpg(p.position,replacementRank(ctx,p.position));return{...p,id:String(id),overallRank,posRank,projectedPpg,replacementPpg,raw:playerValue(ctx,p.position,overallRank,posRank),depthWeight:0,lineupRole:'DEPTH',score:0}}).filter(Boolean);
  bestLegalLineup(ctx,all);const pos={QB:0,RB:0,WR:0,TE:0};let rosterScore=0;for(const p of all){p.score=Math.max(0,finite(p.raw*p.depthWeight,0));pos[p.position]+=p.score;rosterScore+=p.score}for(const k of POS)pos[k]=Math.max(0,finite(pos[k],0));return{all,pos,rosterScore:Math.max(0,finite(rosterScore,0))};
}
function buildTeams(ctx){const list=(ctx.rosters||[]).map(r=>({r,m:metric(ctx,r),ranks:{},overall:0}));for(const p of POS)[...list].sort((a,b)=>b.m.pos[p]-a.m.pos[p]).forEach((t,i)=>t.ranks[p]=i+1);[...list].sort((a,b)=>b.m.rosterScore-a.m.rosterScore).forEach((t,i)=>{t.ranks.overall=i+1;t.overall=t.m.rosterScore});return list}
function offenseStarterCount(ctx){const n=rosterSlots(ctx).filter(x=>['QB','RB','WR','TE','FLEX','SUPER_FLEX','WRRB_FLEX','REC_FLEX','WRRBTE_FLEX'].includes(x)).length;return n||7}
function benchSlotCount(ctx){const n=rosterSlots(ctx).filter(x=>x==='BN').length;return n||6}
window.WorkhorsePowerModelV2={POS,finite,leagueSize,directSlots,flexCounts,replacementRank,modeledPpg,playerValue,metric,buildTeams,offenseStarterCount,benchSlotCount};
})();
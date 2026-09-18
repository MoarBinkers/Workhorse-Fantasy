(()=>{
'use strict';
if(globalThis.WorkhorseDecisionEngine?.version>=2)return;

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const mean=a=>a.length?a.reduce((s,v)=>s+num(v),0)/a.length:0;
const stdev=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(v=>(num(v)-m)**2)))};
const first=(o,...keys)=>{for(const k of keys)if(o&&o[k]!=null&&o[k]!==''&&Number.isFinite(Number(o[k])))return Number(o[k]);return null};
const sum=(o,...keys)=>keys.reduce((t,k)=>t+num(o?.[k]),0);
const hasAny=(o,keys)=>keys.some(k=>o&&o[k]!=null&&o[k]!==''&&Number.isFinite(Number(o[k])));
const played=s=>!!s&&((first(s,'gp','games_played')??0)>0||fantasyPoints(s,'ppr')!==0||hasAny(s,['pass_att','rush_att','rec_tgt','targets','rec','off_snp','snap_pct','off_snp_pct','routes','routes_run']));

function fantasyPoints(s,format='ppr'){
 const rec=num(first(s,'rec'));
 const recMult=format==='standard'?0:format==='half'?0.5:1;
 const direct=format==='ppr'?first(s,'pts_ppr','fpts_ppr','fantasy_points_ppr'):format==='half'?first(s,'pts_half_ppr','fpts_half_ppr'):first(s,'pts_std','fpts_std');
 if(direct!=null)return direct;
 return rec*recMult+num(first(s,'pass_yd'))*.04+num(first(s,'pass_td'))*4-num(first(s,'pass_int','int'))+num(first(s,'rush_yd'))*.1+num(first(s,'rush_td'))*6+num(first(s,'rec_yd'))*.1+num(first(s,'rec_td'))*6+num(first(s,'pass_2pt'))*2+num(first(s,'rush_2pt'))*2+num(first(s,'rec_2pt'))*2-num(first(s,'fum_lost','fumbles_lost'))*2;
}

function metricAverage(stats,fn){const a=(stats||[]).filter(played).map(fn).filter(v=>v!=null&&Number.isFinite(Number(v)));return a.length?mean(a):null}
function snapPct(s){let v=first(s,'snap_pct','off_snp_pct','offensive_snap_pct','off_snap_pct');if(v==null){const sn=first(s,'off_snp','offensive_snaps','snaps_offense'),tm=first(s,'tm_off_snp','team_offensive_snaps');if(sn!=null&&tm>0)v=sn/tm}if(v==null)return null;return v>1.5?v/100:v}
function routes(s){return first(s,'routes','routes_run','rec_routes','route_run','route_runs')}
function targets(s){return first(s,'rec_tgt','targets','tgt')}
function carries(s){return first(s,'rush_att','carries')}
function rz(s){if(!s)return null;const keys=['rush_rz_att','rz_rush_att','rush_att_rz','rec_rz_tgt','rz_tgt','redzone_targets','red_zone_targets','redzone_carries','red_zone_carries'];if(!hasAny(s,keys))return null;return sum(s,...keys)}
function goalLine(s){if(!s)return null;const keys=['rush_att_5','rush_att_inside_5','rec_tgt_5','targets_inside_5','goal_line_carries','goal_line_targets'];if(!hasAny(s,keys))return null;return sum(s,...keys)}
function opportunities(pos,s){const p=String(pos||'').toUpperCase();if(p==='QB')return num(first(s,'pass_att'))+num(carries(s))*1.6;if(p==='RB')return num(carries(s))+num(targets(s))*1.5;return num(targets(s))+num(carries(s))*1.25}

const CONFIG={
 QB:[
  ['Dropbacks','pass',s=>first(s,'pass_att'),38,.58],['Rush role','rush',s=>carries(s),8,.20],['Snap share','snap',s=>snapPct(s),.96,.22]
 ],
 RB:[
  ['Weighted opps','opps',s=>opportunities('RB',s),25,.40],['Targets','targets',s=>targets(s),7,.20],['Snap share','snap',s=>snapPct(s),.78,.20],['Red-zone work','rz',s=>rz(s),6,.14],['Goal-line work','goal',s=>goalLine(s),3,.06]
 ],
 WR:[
  ['Targets','targets',s=>targets(s),11,.38],['Routes','routes',s=>routes(s),39,.24],['Snap share','snap',s=>snapPct(s),.90,.20],['Red-zone work','rz',s=>rz(s),3,.12],['Rush usage','rush',s=>carries(s),2,.06]
 ],
 TE:[
  ['Targets','targets',s=>targets(s),9,.38],['Routes','routes',s=>routes(s),34,.24],['Snap share','snap',s=>snapPct(s),.85,.22],['Red-zone work','rz',s=>rz(s),2.5,.16]
 ]
};

function usageScore(pos,stats){
 const p=String(pos||'').toUpperCase(),cfg=CONFIG[p]||CONFIG.WR,recent=(stats||[]).filter(played).slice(-3),allWeight=cfg.reduce((a,x)=>a+x[4],0);let used=0,total=0;
 const metrics=cfg.map(([label,key,get,target,weight])=>{const value=metricAverage(recent,get);if(value==null)return {label,key,value:null,score:null,weight,available:false};const component=clamp(value/target,0,1.08)*100;used+=weight;total+=component*weight;return {label,key,value,score:Math.round(component),weight,available:true}});
 const score=used?Math.round(clamp(total/used,0,100)):null;
 const sample=Math.min(1,recent.length/3),coverage=allWeight?used/allWeight:0,confidence=Math.round(100*(coverage*.72+sample*.28));
 return {score,confidence,games:recent.length,metrics,coverage};
}

function roleChange(pos,stats){
 const a=(stats||[]).filter(played),recent=a.slice(-2),prior=a.slice(Math.max(0,a.length-5),Math.max(0,a.length-2));
 if(recent.length<1||prior.length<1)return {key:'insufficient',label:'Not enough data',direction:'flat',delta:0,confidence:'Low'};
 const r=mean(recent.map(s=>opportunities(pos,s))),p=mean(prior.map(s=>opportunities(pos,s))),delta=p>0?(r-p)/p:(r>0?1:0);
 const uNow=usageScore(pos,recent).score,uPrev=usageScore(pos,prior).score,scoreDelta=uNow!=null&&uPrev!=null?(uNow-uPrev)/Math.max(1,uPrev):0;
 const blended=delta*.7+scoreDelta*.3;
 if(blended>=.18)return {key:'major_up',label:'Major role increase',direction:'up',delta:blended,confidence:recent.length>=2&&prior.length>=2?'High':'Medium'};
 if(blended>=.08)return {key:'up',label:'Role increasing',direction:'up',delta:blended,confidence:'Medium'};
 if(blended<=-.18)return {key:'major_down',label:'Major role decline',direction:'down',delta:blended,confidence:recent.length>=2&&prior.length>=2?'High':'Medium'};
 if(blended<=-.08)return {key:'down',label:'Role declining',direction:'down',delta:blended,confidence:'Medium'};
 return {key:'stable',label:'Role stable',direction:'flat',delta:blended,confidence:recent.length>=2&&prior.length>=2?'High':'Medium'};
}

function projection(pos,stats,format='ppr'){
 const a=(stats||[]).filter(played),vals=a.map(s=>fantasyPoints(s,format));if(!vals.length)return {points:null,floor:null,ceiling:null,confidence:0,sample:0};
 const last3=vals.slice(-3),last5=vals.slice(-5),season=mean(vals),recent3=mean(last3),recent5=mean(last5);
 let base=season;if(last3.length>=2)base=season*.28+recent5*.32+recent3*.40;
 const role=roleChange(pos,a),adj=clamp(role.delta*.18,-.10,.10),points=Math.max(0,base*(1+adj));
 const sd=stdev(vals.slice(-6)),floor=Math.max(0,points-Math.max(2.5,sd*.85)),ceiling=points+Math.max(3.5,sd*1.05);
 const confidence=Math.round(100*clamp((Math.min(vals.length,5)/5)*.7+(role.confidence==='High'?.3:role.confidence==='Medium'?.2:.1),0,1));
 return {points:Number(points.toFixed(1)),floor:Number(floor.toFixed(1)),ceiling:Number(ceiling.toFixed(1)),confidence,sample:vals.length};
}

function marketSignal(pos,stats){
 const a=(stats||[]).filter(played),usage=usageScore(pos,a),role=roleChange(pos,a);if(a.length<2||usage.score==null)return {signal:'HOLD',confidence:'Low',reason:'Not enough trustworthy role data yet.'};
 const season=mean(a.map(s=>fantasyPoints(s,'ppr'))),recent=mean(a.slice(-2).map(s=>fantasyPoints(s,'ppr'))),perf=season?recent/season:1;
 if((role.direction==='up'&&usage.score>=62&&perf<.95)||(usage.score>=78&&perf<.82))return {signal:'BUY',confidence:role.key==='major_up'?'High':'Medium',reason:'Underlying usage is stronger than recent fantasy production.'};
 if((role.direction==='down'&&perf>1.05)||(usage.score<48&&perf>1.22))return {signal:'SELL',confidence:role.key==='major_down'?'High':'Medium',reason:'Recent production is running ahead of the current role.'};
 return {signal:'HOLD',confidence:usage.confidence>=75?'Medium':'Low',reason:role.direction==='up'?'Role is improving, but production has mostly kept pace.':role.direction==='down'?'Role has softened, but not enough for a strong sell signal.':'Usage and production are broadly aligned.'};
}

function trendSeries(pos,stats,format='ppr'){
 return (stats||[]).map((s,i)=>({week:i+1,played:played(s),ppr:played(s)?fantasyPoints(s,format):null,usage:played(s)?usageScore(pos,[s]).score:null,targets:targets(s),carries:carries(s),routes:routes(s),snap:snapPct(s),opps:played(s)?opportunities(pos,s):null}));
}

function injuryPenalty(status){const x=String(status||'').toLowerCase();if(!x)return 0;if(/(^|\b)(out|ir|pup|suspended|suspend|sus|na|dnr)(\b|$)/.test(x))return 1;if(/doubtful/.test(x))return .34;if(/questionable/.test(x))return .08;if(/limited|dnp|did not practice/.test(x))return .06;return 0}
function startSitScore(input={}){
 const pos=String(input.pos||'').toUpperCase(),stats=input.stats||[],format=input.format||'ppr',proj=projection(pos,stats,format),usage=usageScore(pos,stats),role=roleChange(pos,stats),rank=Number(input.weeklyRank),rankComponent=Number.isFinite(rank)&&rank>0?100*clamp(1-(rank-1)/120,0,1):null;
 if(proj.points==null)return {score:null,projection:proj,usage,role,reasons:['Not enough 2026 game data to grade this player safely.']};
 const projectionComponent=100*clamp(proj.points/(pos==='QB'?28:pos==='TE'?18:24),0,1),inj=injuryPenalty(input.injuryStatus),roleBoost=role.direction==='up'?5:role.direction==='down'?-5:0;
 let parts=[[projectionComponent,.52],[usage.score,.30],[rankComponent,.18]].filter(([v])=>v!=null),w=parts.reduce((a,x)=>a+x[1],0),score=parts.reduce((a,[v,wt])=>a+v*wt,0)/Math.max(.01,w);score=(score+roleBoost)*(1-inj);
 const reasons=[];reasons.push(`${proj.points.toFixed(1)} WH estimate (${proj.floor.toFixed(1)}–${proj.ceiling.toFixed(1)} range)`);if(usage.score!=null)reasons.push(`Usage ${usage.score}/100`);reasons.push(role.label);if(rankComponent!=null)reasons.push(`Workhorse weekly rank #${rank}`);if(inj)reasons.push(`Availability penalty applied for ${input.injuryStatus}`);
 return {score:Math.round(clamp(score,0,100)),projection:proj,usage,role,reasons,injuryPenalty:inj};
}


function weightedProjection(pos,currentStats,priorStats,format='ppr',opts={}){
 const current=(currentStats||[]).filter(played),prior=(priorStats||[]).filter(played);
 const manual=Number(opts.ownerProjection),hasManual=Number.isFinite(manual)&&manual>=0;
 const curVals=current.map(x=>fantasyPoints(x,format)),priorVals=prior.map(x=>fantasyPoints(x,format));
 const currentProj=projection(pos,current,format);
 const priorSeason=priorVals.length?mean(priorVals):null,priorRecent=priorVals.length?mean(priorVals.slice(-6)):null;
 let priorBase=priorSeason==null?null:(priorSeason*.35+(priorRecent??priorSeason)*.65);
 let currentBase=currentProj.points;
 let currentWeight=0;
 if(curVals.length===1)currentWeight=.48;
 else if(curVals.length===2)currentWeight=.65;
 else if(curVals.length===3)currentWeight=.78;
 else if(curVals.length>=4)currentWeight=.86;
 if(currentBase==null&&priorBase!=null)currentWeight=0;
 if(currentBase!=null&&priorBase==null)currentWeight=1;
 if(opts.teamChanged&&currentWeight<1&&priorBase!=null){
   const priorWeight=(1-currentWeight)*.62;
   currentWeight=1-priorWeight;
 }
 const role=roleChange(pos,current);
 if(currentBase!=null&&priorBase!=null&&role.direction!=='flat'&&role.key!=='insufficient'){
   currentWeight=Math.min(.94,currentWeight+.06);
 }
 let points;
 if(hasManual)points=manual;
 else if(currentBase!=null&&priorBase!=null)points=currentBase*currentWeight+priorBase*(1-currentWeight);
 else points=currentBase??priorBase;
 if(points==null)return {points:null,floor:null,ceiling:null,confidence:0,currentWeight:0,priorWeight:0,currentGames:curVals.length,priorGames:priorVals.length,source:'none'};
 const values=[...priorVals.slice(-8),...curVals.slice(-6)],sd=stdev(values),spread=Math.max(3,sd||0);
 const floor=Math.max(0,points-Math.max(2.5,spread*.85)),ceiling=points+Math.max(3.5,spread*1.05);
 const currentSupport=Math.min(1,curVals.length/4),priorSupport=Math.min(1,priorVals.length/6);
 let confidence=Math.round(100*clamp(currentSupport*.56+priorSupport*.22+(currentBase!=null?.12:0)+(hasManual?.10:0),0,1));
 if(!curVals.length&&priorVals.length)confidence=Math.min(confidence,48);
 if(hasManual)confidence=Math.max(confidence,72);
 return {
  points:Number(points.toFixed(1)),floor:Number(floor.toFixed(1)),ceiling:Number(ceiling.toFixed(1)),confidence,
  currentWeight:currentBase!=null&&priorBase!=null?Number(currentWeight.toFixed(2)):(currentBase!=null?1:0),
  priorWeight:currentBase!=null&&priorBase!=null?Number((1-currentWeight).toFixed(2)):(priorBase!=null?1:0),
  currentGames:curVals.length,priorGames:priorVals.length,currentBase,priorBase:priorBase==null?null:Number(priorBase.toFixed(1)),
  source:hasManual?'owner':currentBase!=null&&priorBase!=null?'blend':currentBase!=null?'current':'prior'
 };
}

function environmentScore(pos,env={}){
 const total=Number(env.gameTotal),implied=Number(env.teamImplied),spread=Number(env.spread);
 let score=50,used=0;
 if(Number.isFinite(implied)&&implied>0){score+=(implied-22.5)*2.15;used++}
 if(Number.isFinite(total)&&total>0){score+=(total-44.5)*.72;used++}
 if(Number.isFinite(spread)){
   const p=String(pos||'').toUpperCase();
   if(p==='RB')score+=clamp(-spread/8,-1,1)*7;
   else if(['QB','WR','TE'].includes(p))score+=clamp(spread/10,-1,1)*2.5;
   used++;
 }
 if(env.home===true){score+=1;used++}
 return {score:used?Math.round(clamp(score,20,82)):null,available:used>0,gameTotal:Number.isFinite(total)&&total>0?total:null,teamImplied:Number.isFinite(implied)&&implied>0?implied:null,spread:Number.isFinite(spread)?spread:null,home:env.home===true};
}

function startSitScoreV2(input={}){
 const pos=String(input.pos||'').toUpperCase(),format=input.format||'ppr',currentStats=input.currentStats||input.stats||[],priorStats=input.priorStats||[];
 if(input.locked)return {score:null,eligible:false,locked:true,reasons:['This player’s game has already started, so the lineup decision is locked.']};
 if(input.bye)return {score:0,eligible:false,bye:true,reasons:['This player does not have a game this week.']};
 const proj=weightedProjection(pos,currentStats,priorStats,format,{
   ownerProjection:input.ownerProjection,teamChanged:!!input.teamChanged
 });
 const currentPlayed=(currentStats||[]).filter(played),priorPlayed=(priorStats||[]).filter(played);
 let usage=usageScore(pos,currentPlayed);
 let usageSource='2026';
 if(usage.score==null&&priorPlayed.length){usage=usageScore(pos,priorPlayed.slice(-3));usageSource='2025 baseline'}
 const role=roleChange(pos,currentPlayed),rank=Number(input.weeklyRank);
 const rankComponent=Number.isFinite(rank)&&rank>0?100*clamp(1-(rank-1)/120,0,1):null;
 if(proj.points==null)return {score:null,eligible:false,projection:proj,usage,role,reasons:['Not enough current or prior-season data to grade this player safely.']};
 const status=String(input.injuryStatus||'').toLowerCase();
 if(/(^|\b)(out|ir|pup|suspended|suspend|sus|na|dnr)(\b|$)/.test(status)){
   return {score:0,eligible:false,projection:proj,usage,usageSource,role,injuryPenalty:1,reasons:[`Unavailable: ${input.injuryStatus||'Out'}`]};
 }
 const projectionComponent=100*clamp((proj.points-5)/22,0,1);
 const matchup=Number(input.matchupScore),matchupComponent=Number.isFinite(matchup)?clamp(matchup,0,100):null;
 const env=environmentScore(pos,input.environment||{}),envComponent=env.score;
 const rankWeight=Number.isFinite(Number(input.rankWeight))?Math.max(0,Number(input.rankWeight)):.14;
 let parts=[[projectionComponent,.45],[usage.score,.19],[rankComponent,rankWeight],[matchupComponent,.12],[envComponent,.10]].filter(([v,w])=>v!=null&&w>0);
 const weight=parts.reduce((a,x)=>a+x[1],0);
 let score=parts.reduce((a,[v,w])=>a+v*w,0)/Math.max(.01,weight);
 const roleBoost=role.key==='major_up'?6:role.direction==='up'?3:role.key==='major_down'?-6:role.direction==='down'?-3:0;
 const newsAdjustment=clamp(Number(input.newsAdjustment)||0,-7,7),contextAdjustment=clamp(Number(input.contextAdjustment)||0,-7,7);
 score+=roleBoost+newsAdjustment+contextAdjustment;
 const rawRisk=Number(input.injuryRisk),inj=Number.isFinite(rawRisk)?clamp(rawRisk,0,1):injuryPenalty(input.injuryStatus);
 score*=1-inj;
 const coverage=[
   proj.confidence/100,
   usage.score!=null?usage.confidence/100:null,
   matchupComponent!=null?clamp(Number(input.matchupConfidence??60)/100,0,1):null,
   rankComponent!=null?1:null,
   envComponent!=null?.85:null
 ].filter(x=>x!=null);
 const confidence=Math.round(100*(coverage.length?mean(coverage):0));
 const reasons=[];
 reasons.push(`${proj.points.toFixed(1)} WH estimate (${proj.floor.toFixed(1)}–${proj.ceiling.toFixed(1)} range)`);
 if(proj.source==='blend')reasons.push(`Projection blend: ${Math.round(proj.currentWeight*100)}% 2026 · ${Math.round(proj.priorWeight*100)}% 2025`);
 else if(proj.source==='prior')reasons.push('Using 2025 as a reduced-confidence baseline because 2026 game data is not available yet');
 else if(proj.source==='owner')reasons.push('Owner projection override is active');
 if(usage.score!=null)reasons.push(`Usage ${usage.score}/100${usageSource==='2025 baseline'?' · 2025 baseline':''}`);
 if(role.key!=='insufficient')reasons.push(role.label);
 if(rankComponent!=null)reasons.push(`Workhorse weekly rank #${rank}`);
 if(matchupComponent!=null)reasons.push(`Matchup ${Math.round(matchupComponent)}/100`);
 if(env.teamImplied!=null)reasons.push(`Team implied ${env.teamImplied.toFixed(1)} points`);
 if(newsAdjustment)reasons.push(`News context ${newsAdjustment>0?'+':''}${newsAdjustment.toFixed(1)}`);
 if(contextAdjustment)reasons.push(`Team context ${contextAdjustment>0?'+':''}${contextAdjustment.toFixed(1)}`);
 if(inj)reasons.push(`Availability penalty applied for ${input.injuryStatus}`);
 return {score:Math.round(clamp(score,0,100)),eligible:true,projection:proj,usage,usageSource,role,reasons,injuryPenalty:inj,confidence,components:{projection:Math.round(projectionComponent),usage:usage.score,rank:rankComponent==null?null:Math.round(rankComponent),matchup:matchupComponent==null?null:Math.round(matchupComponent),environment:envComponent},environment:env,newsAdjustment,contextAdjustment};
}

const api={version:2,clamp,num,mean,stdev,first,played,fantasyPoints,snapPct,routes,targets,carries,rz,goalLine,opportunities,usageScore,roleChange,projection,weightedProjection,environmentScore,marketSignal,trendSeries,injuryPenalty,startSitScore,startSitScoreV2};
globalThis.WorkhorseDecisionEngine=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();

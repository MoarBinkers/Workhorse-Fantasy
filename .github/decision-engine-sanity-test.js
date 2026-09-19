'use strict';
const assert=require('assert');
require('../workhorse-decision-engine-v1.js');
const E=global.WorkhorseDecisionEngine;
assert(E&&E.version>=11,'decision engine loads');
const rb=[
 {rush_att:12,rec_tgt:2,rec:2,rush_yd:45,rec_yd:12,pts_ppr:8.7,snap_pct:.48,rush_rz_att:2},
 {rush_att:16,rec_tgt:4,rec:3,rush_yd:72,rec_yd:26,pts_ppr:14.8,snap_pct:.61,rush_rz_att:3},
 {rush_att:19,rec_tgt:5,rec:4,rush_yd:89,rec_yd:34,rush_td:1,pts_ppr:22.3,snap_pct:.72,rush_rz_att:5,rush_att_5:2},
 {rush_att:21,rec_tgt:6,rec:5,rush_yd:102,rec_yd:41,pts_ppr:24.3,snap_pct:.79,rush_rz_att:6,rush_att_5:3}
];
const u=E.usageScore('RB',rb);assert(u.score>=65&&u.confidence>=60,'strong RB role scores well');
const role=E.roleChange('RB',rb);assert(role.direction==='up','rising work is detected');
const healthy=E.startSitScore({pos:'RB',stats:rb,format:'ppr',weeklyRank:10,injuryStatus:''});
const out=E.startSitScore({pos:'RB',stats:rb,format:'ppr',weeklyRank:10,injuryStatus:'Out'});
assert(healthy.score>out.score+20,'out status materially reduces start/sit score');
const sparse=E.usageScore('WR',[{rec_tgt:8,rec:5,rec_yd:70,pts_ppr:12},{rec_tgt:9,rec:6,rec_yd:80,pts_ppr:14}]);
assert(sparse.score!==null&&sparse.confidence<100,'missing routes/snaps reduce confidence instead of being invented');
const noData=E.startSitScore({pos:'WR',stats:[],format:'ppr'});assert(noData.score===null,'no data does not force a recommendation');
console.log('PASS: Workhorse decision engine sanity checks');

const prior=[
 {rush_att:14,rec_tgt:3,rec:2,rush_yd:61,rec_yd:15,pts_ppr:10.6,snap_pct:.55},
 {rush_att:17,rec_tgt:4,rec:3,rush_yd:78,rec_yd:23,pts_ppr:14.1,snap_pct:.63},
 {rush_att:18,rec_tgt:4,rec:3,rush_yd:84,rec_yd:29,pts_ppr:15.8,snap_pct:.66}
];
const v2=E.startSitScoreV2({pos:'RB',currentStats:rb.slice(-2),priorStats:prior,format:'ppr',weeklyRank:12,matchupScore:58,matchupConfidence:70,environment:{gameTotal:47,teamImplied:24.5,spread:-2,home:true},injuryStatus:''});
assert(v2.score!==null&&v2.projection.source==='blend','v2 blends current and prior-season evidence');
assert(v2.components.matchup!==null&&v2.environment.teamImplied===24.5,'v2 carries matchup and game environment');

const qbFallback=E.fantasyPoints({pass_yd:250,pass_td:2,pass_int:1,rush_yd:20},'ppr');
assert(Math.abs(qbFallback-19)<0.001,'fallback QB scoring matches Sleeper default -1 interception');
assert(E.injuryPenalty('NA')===1&&E.injuryPenalty('DNR')===1,'inactive Sleeper statuses are treated as unavailable');
const bye=E.startSitScoreV2({pos:'RB',currentStats:rb.slice(-2),priorStats:prior,format:'ppr',bye:true});
assert(bye.eligible===false&&bye.score===0,'bye player is not actionable');

const provider=E.startSitScoreV2({pos:'RB',currentStats:rb.slice(-2),priorStats:prior,format:'ppr',providerProjection:18.4,matchupScore:55,matchupConfidence:70,environment:{gameTotal:45}});
assert(provider.projection.providerPoints===18.4,'provider projection anchors weekly model');
assert(provider.projection.source==='provider_blend','provider projection blends with verified form when both exist');

const qjLike=E.startSitScoreV2({
 pos:'WR',
 currentStats:[{pts_ppr:3.7,rec_tgt:6,rec:2,rec_yd:17,off_snp_pct:.78}],
 priorStats:[
  {pts_ppr:13.2,rec_tgt:6,rec:4,rec_yd:68,off_snp_pct:.82},
  {pts_ppr:14.6,rec_tgt:7,rec:4,rec_yd:74,off_snp_pct:.84},
  {pts_ppr:13.9,rec_tgt:6,rec:4,rec_yd:70,off_snp_pct:.81}
 ],
 format:'ppr',providerProjection:11.3,latestRoleScore:72,latestRoleConfidence:90,
 matchupScore:50,matchupConfidence:60,environment:{teamImplied:24.5,gameTotal:43.5,home:true},
 newsAdjustment:2.5
});
const priceLike=E.startSitScoreV2({
 pos:'RB',
 currentStats:[{pts_ppr:7.8,rush_att:10,rush_yd:52,rec_tgt:2,rec:2,rec_yd:6,off_snp_pct:.48}],
 priorStats:[],format:'ppr',providerProjection:10.5,latestRoleScore:72,latestRoleConfidence:92,
 matchupScore:86,matchupConfidence:82,environment:{teamImplied:22.5,gameTotal:42,home:false},
 newsAdjustment:5.5
});
assert(priceLike.score-qjLike.score>=5,'coach-confirmed workload expansion plus favorable RB matchup must beat stale committee read');
console.log('PASS: Price-like forward role beats QJ-like static role when coach and matchup evidence support it');

const directProvider=E.startSitScoreV2({pos:'WR',currentStats:[{pts_ppr:5,rec_tgt:4,rec:2,rec_yd:30}],priorStats:[],format:'ppr',providerProjection:15,latestRoleScore:55});
assert(directProvider.components.projection===Math.round(100*Math.max(0,Math.min(1,(15-5)/22))),'provider number is the projection scoring input');

const noProjectionV2=E.startSitScoreV2({pos:'WR',currentStats:[],priorStats:[],format:'ppr',injuryStatus:''});
assert(noProjectionV2.score===null&&noProjectionV2.eligible===true,'missing projection does not make an active player ineligible');

const rankInvariantBase={
 pos:'RB',
 currentStats:rb.slice(-2),
 priorStats:prior,
 format:'ppr',
 providerProjection:16.2,
 latestRoleScore:70,
 latestRoleConfidence:90,
 matchupScore:62,
 matchupConfidence:75,
 environment:{gameTotal:46.5,teamImplied:24,spread:-1.5,home:true},
 newsAdjustment:1.5
};
const rankOne=E.startSitScoreV2({...rankInvariantBase,weeklyRank:1,rankWeight:.99});
const rankOneTwenty=E.startSitScoreV2({...rankInvariantBase,weeklyRank:120,rankWeight:.99});
assert(rankOne.score===rankOneTwenty.score,'weekly rank must not change Start/Sit score');
assert(rankOne.components.rank==null&&rankOneTwenty.components.rank==null,'weekly rank must not appear as a score component');
const legacyRankOne=E.startSitScore({pos:'RB',stats:rb,format:'ppr',weeklyRank:1});
const legacyRankOneTwenty=E.startSitScore({pos:'RB',stats:rb,format:'ppr',weeklyRank:120});
assert(legacyRankOne.score===legacyRankOneTwenty.score,'legacy Start/Sit scorer must also ignore weekly rank');
console.log('PASS: weekly rank is display-only and score-invariant');

const priceContext=E.startSitScoreV2({
 pos:'RB',
 currentStats:[{pts_ppr:7.8,rush_att:10,rush_yd:52,rec_tgt:2,rec:2,rec_yd:6,snap_pct:.48,rush_rz_att:0,rush_att_5:0}],
 priorStats:[],format:'ppr',providerProjection:13.2,latestRoleScore:73,latestRoleConfidence:95,
 matchupScore:72,matchupConfidence:65,trenchScore:53,
 environment:{gameTotal:40.5,teamImplied:22,spread:-3.5,home:false},newsAdjustment:5.5
});
const judkinsContext=E.startSitScoreV2({
 pos:'RB',
 currentStats:[{pts_ppr:7,rush_att:12,rush_yd:33,rec_tgt:2,rec:2,rec_yd:17,snap_pct:.647,rush_rz_att:2}],
 priorStats:[],format:'ppr',providerProjection:12.44,latestRoleScore:83,latestRoleConfidence:95,
 matchupScore:54,matchupConfidence:65,trenchScore:88,
 environment:{gameTotal:41.5,teamImplied:16.5,spread:8.5,home:false}
});
assert(priceContext.score>judkinsContext.score,'Price should grade ahead of Judkins when verified Week 2 context is applied');
assert(priceContext.components.trench!==null&&priceContext.components.gameScript!==null,'RB model must include trench and game script');
assert(judkinsContext.components.trench!==null&&judkinsContext.components.gameScript!==null,'RB model must include opponent trench and game script');
assert(priceContext.gameScript.score>judkinsContext.gameScript.score,'favored RB game script must beat large-underdog RB script');
assert(priceContext.weights.matchup>=.17&&judkinsContext.weights.matchup>=.17,'lower-projected RBs must receive elevated matchup weight');
assert(priceContext.confidence>0&&judkinsContext.confidence>0,'model confidence must be exposed');
console.log('PASS: Price vs Judkins context model uses matchup, trench, game script and confidence');

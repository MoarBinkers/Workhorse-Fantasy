'use strict';
const assert=require('assert');
require('../workhorse-decision-engine-v1.js');
const E=global.WorkhorseDecisionEngine;
assert(E&&E.version>=2,'decision engine loads');
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

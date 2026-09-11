(()=>{
'use strict';
if(window.__WH_CARD_POLISH_V1__)return;
window.__WH_CARD_POLISH_V1__=true;

function addStyles(){
 if(document.querySelector('#wh-card-polish-v1-css'))return;
 const s=document.createElement('style');
 s.id='wh-card-polish-v1-css';
 s.textContent=`
/* Ranking cards: more readable without becoming bulky */
#rank-rows .rank-row{
 width:100%!important;
 min-width:0!important;
 min-height:66px!important;
 padding:8px 11px!important;
 gap:10px!important;
 overflow:hidden!important;
}
#rank-rows .rank-area{min-width:0!important;gap:6px!important}
#rank-rows .rank-area>b::before{font-size:14px!important}
#rank-rows .rank-area>b::after{font-size:8.5px!important;padding:4px 6px!important}
#rank-rows .avatar{width:40px!important;height:40px!important}
#rank-rows .player{min-width:0!important;overflow:hidden!important}
#rank-rows .topline{gap:8px!important;min-width:0!important;flex-wrap:wrap!important;row-gap:4px!important}
#rank-rows .name{font-size:14px!important;line-height:1.12!important}
#rank-rows .meta{font-size:9.5px!important;line-height:1.2!important}
#rank-rows .statline{margin-top:5px!important;font-size:9.5px!important;line-height:1.28!important;color:#8da0ac!important}
#rank-rows .score{min-width:72px!important;padding-left:10px!important}
#rank-rows .score strong{font-size:15px!important}
#rank-rows .score span,#rank-rows .score small{font-size:8px!important;line-height:1.15!important}

/* Card badges / chips */
#rank-rows .wh-row-chip{font-size:7.5px!important;padding:3px 5px!important;border-radius:6px!important}
#rank-rows .wh-compare-toggle{font-size:7px!important;padding:3px 6px!important;border-radius:6px!important}
#rank-rows .wh-injury-tag{height:18px!important;font-size:7.25px!important;padding:0 6px!important;border-radius:6px!important}
#rank-rows .wh-card-matchup{
 height:auto!important;
 min-height:18px!important;
 margin-top:6px!important;
 display:flex!important;
 flex-wrap:wrap!important;
 align-items:center!important;
 gap:5px!important;
 overflow:visible!important;
 white-space:normal!important;
}
#rank-rows .wh-mu-opponent,#rank-rows .wh-mu-ref,#rank-rows .wh-mu-chip{
 height:18px!important;
 border-radius:5px!important;
 font-size:8px!important;
 line-height:1!important;
}
#rank-rows .wh-mu-opponent{padding:0 6px!important;font-size:8.25px!important}
#rank-rows .wh-mu-ref{padding:0 4px!important;font-size:7.25px!important}
#rank-rows .wh-mu-chip{padding:0 5px!important}

/* Owner controls get a real column instead of spilling outside the card */
html.wh-owner-control #rank-rows .precision{
 min-width:0!important;
 max-width:142px!important;
 width:142px!important;
 display:grid!important;
 grid-template-columns:30px 30px minmax(66px,1fr)!important;
 gap:5px!important;
 align-items:center!important;
 justify-self:end!important;
}
html.wh-owner-control #rank-rows .precision button{
 width:30px!important;
 height:30px!important;
 min-width:30px!important;
 padding:0!important;
 display:grid!important;
 place-items:center!important;
 font-size:13px!important;
 border-radius:7px!important;
}
html.wh-owner-control #rank-rows .precision label{
 min-width:0!important;
 width:100%!important;
 height:30px!important;
 padding-left:6px!important;
 font-size:9px!important;
 overflow:hidden!important;
}
html.wh-owner-control #rank-rows .precision input{
 width:100%!important;
 min-width:0!important;
 padding:6px 2px!important;
 font-size:10px!important;
}

@media(min-width:980px){
 html.wh-owner-control #rank-rows .rank-row{
   grid-template-columns:70px 44px minmax(0,1fr) 80px 142px!important;
 }
}

/* Medium widths: controls become an intentional second row */
@media(min-width:761px) and (max-width:979px){
 #rank-rows .rank-row{grid-template-columns:70px 44px minmax(0,1fr) 80px!important}
 html.wh-owner-control #rank-rows .precision{
   grid-column:3/-1!important;
   margin-top:2px!important;
   justify-self:end!important;
 }
}

@media(max-width:760px){
 #rank-rows .rank-row{
   grid-template-columns:60px 38px minmax(0,1fr) 60px!important;
   min-height:60px!important;
   padding:7px 8px!important;
   gap:8px!important;
 }
 #rank-rows .avatar{width:36px!important;height:36px!important}
 #rank-rows .rank-area>b::before{font-size:13px!important}
 #rank-rows .rank-area>b::after{font-size:7.5px!important;padding:3px 4px!important}
 #rank-rows .name{font-size:12.75px!important}
 #rank-rows .meta{font-size:8.5px!important}
 #rank-rows .statline{font-size:8.5px!important}
 #rank-rows .score{min-width:56px!important;padding-left:7px!important}
 #rank-rows .score strong{font-size:13px!important}
 #rank-rows .score span,#rank-rows .score small{font-size:7.5px!important}
 #rank-rows .wh-card-matchup{gap:4px!important;margin-top:5px!important}
 #rank-rows .wh-mu-opponent,#rank-rows .wh-mu-chip{height:17px!important;font-size:7.25px!important;padding-left:4px!important;padding-right:4px!important}
 #rank-rows .wh-mu-ref{display:none!important}
 #rank-rows .wh-injury-tag{height:17px!important;font-size:6.75px!important;padding:0 5px!important}
 html.wh-owner-control #rank-rows .precision{
   grid-column:3/-1!important;
   width:137px!important;
   max-width:100%!important;
   grid-template-columns:29px 29px minmax(64px,1fr)!important;
   margin-top:3px!important;
   justify-self:end!important;
 }
 html.wh-owner-control #rank-rows .precision button{width:29px!important;height:29px!important;min-width:29px!important}
 html.wh-owner-control #rank-rows .precision label{height:29px!important}
}
`;
 document.head.appendChild(s);
}

addStyles();
})();

(()=>{
'use strict';
if(window.__WH_TRADE_UI_POLISH_V1__)return;window.__WH_TRADE_UI_POLISH_V1__=true;
const apply=()=>{
 if(!document.querySelector('.trade'))return setTimeout(apply,40);
 if(!document.querySelector('#wh-trade-ros-polish')){
   const st=document.createElement('style');st.id='wh-trade-ros-polish';st.textContent=`
   .player-top{grid-template-columns:38px minmax(0,1fr) auto!important}
   .ros{font-size:13px!important;line-height:1!important;font-weight:1000!important;color:#f1d675!important;background:#17170c!important;border:1px solid #5f5529!important;border-radius:8px!important;padding:7px 8px!important;letter-spacing:-.02em!important;box-shadow:inset 0 0 0 1px #e8ca7210!important}
   .search-result em{font-size:9px!important;color:#d8c477!important;font-weight:1000!important}
   @media(max-width:700px){.ros{font-size:12px!important;padding:6px 7px!important}}
   `;document.head.appendChild(st);
 }
 const top=document.querySelector('.top');
 if(top&&!document.querySelector('#wh-league-link')){const a=document.createElement('a');a.id='wh-league-link';a.className='back';a.href='./sandbox-league.html';a.textContent='League Overview';const tools=top.querySelector('.back');top.insertBefore(a,tools||null)}
 if(!document.querySelector('#wh-trade-league-mode-script')){const s=document.createElement('script');s.id='wh-trade-league-mode-script';s.src='./season-trade-league-mode-v1.js?v=1';s.async=false;document.body.appendChild(s)}
};
apply();
})();

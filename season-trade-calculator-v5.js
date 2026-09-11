(()=>{
'use strict';
if(window.__WH_TRADE_ROUTE_LOADER__)return;window.__WH_TRADE_ROUTE_LOADER__=true;
const load=(src,onload)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;document.body.appendChild(s)};
load('./season-trade-calculator-v7.js?v=7',()=>load('./season-trade-ui-polish-v1.js?v=1'));
})();

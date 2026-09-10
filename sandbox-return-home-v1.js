(()=>{
'use strict';
if(document.getElementById('wh-season-home-return'))return;
const a=document.createElement('a');a.id='wh-season-home-return';a.href='./sandbox.html';a.textContent='← Season Home';a.setAttribute('aria-label','Return to Workhorse season home');a.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;background:#0b1722;color:#eef5fa;border:1px solid #35516a;border-radius:999px;padding:10px 13px;text-decoration:none;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 10px 28px #0007';document.documentElement.appendChild(a);
})();
(()=>{
'use strict';
if(document.getElementById('wh-tools-return'))return;
const wrap=document.createElement('div');wrap.id='wh-tools-return';wrap.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;display:flex;gap:7px;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif';wrap.innerHTML='<a href="./sandbox.html?view=tools" style="background:#0b1722;color:#eef5fa;border:1px solid #35516a;border-radius:999px;padding:10px 13px;text-decoration:none;box-shadow:0 10px 28px #0007">← Tools</a><a href="./sandbox.html" style="background:#0b1722;color:#aabfce;border:1px solid #273e51;border-radius:999px;padding:10px 13px;text-decoration:none;box-shadow:0 10px 28px #0007">Home</a>';document.documentElement.appendChild(wrap);
})();
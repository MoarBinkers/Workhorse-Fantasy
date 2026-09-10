(async()=>{
'use strict';
const fail=e=>{const m=String(e&&e.message?e.message:e).replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));document.body.innerHTML='<div class="wh-rank-load"><div><b>SANDBOX · NOT LIVE</b><h1>WORKHORSE</h1><p>The selected tool could not start.</p><pre>'+m+'</pre><a href="./sandbox.html?view=tools">← Tools</a></div></div>'};
try{
 document.body.innerHTML='<div class="wh-rank-load"><div><b>SANDBOX · NOT LIVE</b><h1>WORKHORSE</h1><p>Loading selected draft tool…</p></div></div>';
 if(!('DecompressionStream' in window))throw new Error('Your browser needs an update to open Workhorse.');
 const bundle='./app-v28.bin?v=28d';
 const files=Array.from({length:10},(_,i)=>'./app-v28-part-'+String(i).padStart(2,'0')+'.bin?v=28c');
 const fetchAsset=async file=>{const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+file+' (HTTP '+r.status+').');return new Uint8Array(await r.arrayBuffer())};
 let joined;
 try{joined=await fetchAsset(bundle);if(joined.length!==28016)throw new Error('bundle size')}catch(_){const buffers=await Promise.all(files.map(fetchAsset));const total=buffers.reduce((n,b)=>n+b.length,0);if(total!==28016)throw new Error('Workhorse fallback bundle was incomplete ('+total+' bytes).');joined=new Uint8Array(total);let off=0;for(const b of buffers){joined.set(b,off);off+=b.length}}
 const text=await new Response(new Blob([joined]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!=='77a31b87341147e99b00dbe40a23961addc39723cb8464129cc3c68a13db0879')throw new Error('Workhorse integrity check failed.');
 if(!text.startsWith('<!doctype html>')||!text.includes('DRAFT_EDGE_SUPABASE_URL')||!text.trim().endsWith('</html>'))throw new Error('Workhorse app file was incomplete.');
 let source=text.replace(/DRAFT EDGE/g,'WORKHORSE').replace(/Draft Edge/g,'Workhorse').replace(/Rank\.\s*Draft\.\s*Dominate\.?/gi,'').replace(/(?:\.\/)?assets\/draft-edge-logo\.webp/gi,'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
 source=source.replace('renderDraft();initSupabase();refreshCurrentAdp();','renderDraft();initSupabase();');
 source=source.replace('bye:src.bye??"—"','bye:src.bye??(INITIAL.find(x=>norm(x.name)===norm(src.name))?.bye??"—")');
 const meta='<meta name="robots" content="noindex,nofollow,noarchive"><script>window.__WORKHORSE_SANDBOX__=true;<\/script>';
 source=source.replace('</head>',meta+'</head>');
 const tags='<script defer src="./brand-fast-v92.js?v=922"><\/script><script defer src="./patch-v29.js?v=300"><\/script><script defer src="./rank-sync-v38.js?v=400"><\/script><script defer src="./tier-v33.js?v=335"><\/script><script defer src="./central-adp-v92.js?v=921"><\/script><script defer src="./mobile-touch-v75.js?v=757"><\/script><script defer src="./cloud-reliability-v41.js?v=415"><\/script><script defer src="./auth-recovery-v54.js?v=549"><\/script><script defer src="./auth-forgot-popup-v56.js?v=566"><\/script><script defer src="./auth-password-save-v57.js?v=574"><\/script><script defer src="./new-user-adp-v60.js?v=610"><\/script><script defer src="./decision-loader-v61.js?v=660"><\/script><script defer src="./sandbox-open-tool-v1.js?v=1"><\/script><script defer src="./sandbox-return-home-v2.js?v=1"><\/script><script defer src="./sandbox-admin-v1.js?v=4"><\/script></body>';
 const app=source.replace('</body>',tags);
 document.open();document.write(app);document.close();
}catch(e){console.error(e);fail(e)}
})();
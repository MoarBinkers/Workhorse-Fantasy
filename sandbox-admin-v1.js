(async()=>{
'use strict';
if(window.__WORKHORSE_SANDBOX_ADMIN__?.version>=5)return;
const S=window.__WORKHORSE_SANDBOX_ADMIN__={version:5,authorized:false,loaded:false};
const REF='ytfwbvdzhrebupcftmhs';
const URL='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const AUTH='sb-'+REF+'-auth-token';
const STORE='wh_editor_edits_v1';
const OWNER_ROUTE=new URLSearchParams(location.search).get('owner')==='1';
let mode='view',edits={},undo=[],redo=[],sel=null,host=null,shadow=null,style=null,obs=null,clicker=null,accessHost=null,checking=false;

function parseSession(v,d=0){
 if(d>6||v==null)return null;
 if(typeof v==='string'){try{return parseSession(JSON.parse(v),d+1)}catch(_){return null}}
 if(Array.isArray(v)){for(const x of v){const s=parseSession(x,d+1);if(s?.access_token||s?.refresh_token)return s}return null}
 if(typeof v==='object'){
   if(typeof v.access_token==='string'||typeof v.refresh_token==='string')return v;
   for(const k of ['currentSession','session','data','value'])if(k in v){const s=parseSession(v[k],d+1);if(s)return s}
 }
 return null;
}
function getSession(){try{return parseSession(localStorage.getItem(AUTH))}catch(_){return null}}
function setSession(s){try{localStorage.setItem(AUTH,JSON.stringify(s))}catch(_){}}
function clearSession(){try{localStorage.removeItem(AUTH)}catch(_){}}
function jwtExp(t){try{const raw=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const p=JSON.parse(atob(raw.padEnd(Math.ceil(raw.length/4)*4,'=')));return Number(p.exp||0)*1000}catch(_){return 0}}
async function refreshSession(s){
 if(!s?.refresh_token)return null;
 try{
   const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store'});
   if(!r.ok)return null;
   const next=await r.json();
   if(!next?.access_token)return null;
   setSession(next);
   return next;
 }catch(_){return null}
}
async function verifiedUser(access){
 try{
   const r=await fetch(URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+access,Accept:'application/json'},cache:'no-store'});
   if(!r.ok)return null;
   return r.json();
 }catch(_){return null}
}
async function ownerSession(){
 let s=getSession();
 if(!s?.access_token&&s?.refresh_token)s=await refreshSession(s);
 if(!s?.access_token)return null;
 if(jwtExp(s.access_token)<Date.now()+120000&&s.refresh_token)s=await refreshSession(s)||s;
 let u=await verifiedUser(s.access_token);
 if(!u&&s.refresh_token){s=await refreshSession(s);if(s?.access_token)u=await verifiedUser(s.access_token)}
 if(u?.app_metadata?.workhorse_role==='owner')return s;
 return null;
}
async function passwordSignIn(email,password){
 try{
   const r=await fetch(URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
   if(!r.ok)return {ok:false,message:'Sign-in failed. Check your Workhorse owner email and password.'};
   const s=await r.json();setSession(s);
   const u=await verifiedUser(s.access_token);
   if(u?.app_metadata?.workhorse_role!=='owner'){clearSession();return {ok:false,message:'That account is not authorized for owner editing.'}}
   return {ok:true};
 }catch(_){return {ok:false,message:'Owner sign-in is temporarily unavailable.'}}
}

function load(){try{edits=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch(_){edits={}}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(edits))}catch(_){}}
function key(el){
 if(el.id&&el.id!=='wh-sandbox-selected')return '#'+CSS.escape(el.id);
 if(el.dataset?.page)return el.tagName.toLowerCase()+'[data-page="'+CSS.escape(el.dataset.page)+'"]';
 const a=[];let n=el;
 while(n&&n!==document.body&&a.length<7){
   let p=n.tagName.toLowerCase();
   const c=[...n.classList].filter(x=>!x.startsWith('active')&&!x.startsWith('wh-')&&!['show','open','editable','dragging','drop-target'].includes(x)).slice(0,2);
   if(c.length)p+='.'+c.map(CSS.escape).join('.');
   const par=n.parentElement;if(par){const same=[...par.children].filter(x=>x.tagName===n.tagName);if(same.length>1)p+=`:nth-of-type(${same.indexOf(n)+1})`}
   a.unshift(p);n=par;
 }
 return a.join('>');
}
function blocked(el){return !!el?.closest?.('[data-wh-no-edit],#rank-rows,.rank-card,.player-block,.player-meta,.stats,.stat,.precision,.drag-zone,.avatar,.rank-list,.player,.player-row,.draft-list,[id*="rankList"],[id*="draftList"],table,tbody')}
function ok(el){
 if(!el?.matches||host?.contains(el)||blocked(el)||el.matches('input,textarea,select,option,svg,path,img,video,canvas'))return false;
 const t=(el.textContent||'').trim();if(!t||t.length>260)return false;
 if(el.matches('div'))return el.children.length===0;
 return el.children.length<=3&&el.matches('h1,h2,h3,h4,h5,h6,p,span,button,a,label,small,.brand-title,.brand-tagline,.pagehead *,.nav button,.nav a,.btn,.small,.notice,.eyebrow,.desc,.tag,.back,.go,.legacy');
}
const TARGETS='h1,h2,h3,h4,h5,h6,p,span,button,a,label,small,div,.brand-title,.brand-tagline,.pagehead *,.nav button,.nav a,.btn,.small,.notice,.eyebrow,.desc,.tag,.back,.go,.legacy';
function mark(){document.querySelectorAll(TARGETS).forEach(e=>{if(ok(e))e.dataset.whEditable='1';else delete e.dataset.whEditable})}
function apply(){for(const [k,v] of Object.entries(edits))try{const e=document.querySelector(k);if(e&&ok(e)&&typeof v==='string'&&e.textContent!==v)e.textContent=v}catch(_){}}
function clear(){sel=null;document.getElementById('wh-sandbox-selected')?.removeAttribute('id')}
function status(t){if(shadow)shadow.querySelector('#status').textContent=t}
function setMode(m){
 if(!shadow)return;mode=m;
 document.documentElement.classList.toggle('wh-sb-edit',m==='edit');
 document.documentElement.classList.toggle('wh-sb-preview',m==='preview');
 shadow.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
 shadow.querySelector('#panel').classList.remove('open');clear();
 status(m==='edit'?'Click outlined page text to edit':m==='preview'?'Previewing sandbox changes':'Owner mode · production writes blocked');
}
function openEditor(e){
 clear();sel=e;if(!e.id)e.id='wh-sandbox-selected';
 shadow.querySelector('#target').textContent=key(e);
 const i=shadow.querySelector('#input');i.value=(e.textContent||'').trim();
 shadow.querySelector('#panel').classList.add('open');i.focus();i.select();
}
function commit(){
 if(!sel)return;const k=key(sel),before=(sel.textContent||'').trim(),after=shadow.querySelector('#input').value.trim();
 if(before!==after){undo.push({k,before,after});redo=[];edits[k]=after;save();sel.textContent=after;status('Sandbox change saved')}
 shadow.querySelector('#panel').classList.remove('open');clear();mark();
}
function hist(x,val,to){if(!x)return;try{const e=document.querySelector(x.k);if(e)e.textContent=val;edits[x.k]=val;save();to.push(x);status('Sandbox edit history updated');mark()}catch(_){}}
function removeAccess(){accessHost?.remove();accessHost=null}
function showAccess(message='Owner session needed'){
 if(!OWNER_ROUTE||accessHost||S.loaded)return;
 accessHost=document.createElement('div');accessHost.id='wh-owner-access';accessHost.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483646;font-family:system-ui,-apple-system,Segoe UI,sans-serif';
 const sh=accessHost.attachShadow({mode:'open'});
 sh.innerHTML=`<style>*{box-sizing:border-box}.open{border:1px solid #31506a;background:#0b1924;color:#e8f2f8;border-radius:10px;padding:10px 12px;font-weight:850;font-size:12px;cursor:pointer;box-shadow:0 12px 30px #0006}.panel{display:none;width:min(360px,calc(100vw - 28px));background:#0b1620;color:#eef5fa;border:1px solid #35526a;border-radius:14px;padding:14px;box-shadow:0 22px 60px #0009}.panel.on{display:block}.open.hide{display:none}h3{margin:0 0 4px;font-size:16px}.msg{font-size:11px;color:#91a6b6;margin-bottom:10px}.err{min-height:16px;font-size:11px;color:#f0a0a8;margin-top:8px}input{width:100%;margin-top:7px;border:1px solid #345168;background:#07111a;color:#fff;border-radius:8px;padding:10px}.row{display:flex;gap:7px;justify-content:flex-end;margin-top:10px}button{border:1px solid #38546a;background:#102331;color:#e8f2f8;border-radius:8px;padding:8px 10px;font-weight:800;cursor:pointer}.primary{background:#eef5fa;color:#07111a}</style><button class="open">Owner access</button><div class="panel"><h3>Workhorse owner access</h3><div class="msg">${message}</div><input id="email" type="email" autocomplete="username" placeholder="Owner email"><input id="password" type="password" autocomplete="current-password" placeholder="Password"><div class="err" id="err"></div><div class="row"><button id="cancel">Cancel</button><button class="primary" id="signin">Sign in</button></div></div>`;
 document.documentElement.appendChild(accessHost);
 const open=sh.querySelector('.open'),panel=sh.querySelector('.panel');
 open.onclick=()=>{open.classList.add('hide');panel.classList.add('on');sh.querySelector('#email').focus()};
 sh.querySelector('#cancel').onclick=()=>{panel.classList.remove('on');open.classList.remove('hide')};
 sh.querySelector('#signin').onclick=async()=>{
   const btn=sh.querySelector('#signin'),err=sh.querySelector('#err');btn.disabled=true;err.textContent='Checking owner account…';
   const res=await passwordSignIn(sh.querySelector('#email').value.trim(),sh.querySelector('#password').value);
   if(!res.ok){err.textContent=res.message;btn.disabled=false;return}
   err.textContent='Owner verified.';removeAccess();await check(true);
 };
}
function boot(){
 if(S.loaded||!S.authorized||!document.body)return;
 removeAccess();S.loaded=true;load();document.documentElement.classList.add('wh-sb-admin');
 style=document.createElement('style');style.id='wh-sandbox-editor-css';
 style.textContent='html{scroll-padding-top:110px}body{padding-top:52px!important}html.wh-sb-admin .wh-top,html.wh-sb-admin .top,html.wh-sb-admin .ros-top{top:52px!important}html.wh-sb-admin .toolbar{top:104px!important}html.wh-sb-edit [data-wh-editable="1"]{outline:1px dashed rgba(83,177,255,.58);outline-offset:2px;cursor:pointer}html.wh-sb-edit [data-wh-editable="1"]:hover{outline:2px solid #62b8ff;background:rgba(98,184,255,.06)}#wh-sandbox-selected{outline:2px solid #f2c96d!important;background:rgba(242,201,109,.08)!important}';document.head.appendChild(style);
 host=document.createElement('div');host.id='wh-sandbox-admin-host';host.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;height:52px';
 shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>*{box-sizing:border-box}.bar{height:52px;background:#07111b;color:#edf5fb;border-bottom:1px solid #26415a;display:flex;align-items:center;gap:7px;padding:7px 9px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px #0005}.badge{font-size:11px;font-weight:900;letter-spacing:.08em;color:#06111b;background:#f2c96d;border-radius:99px;padding:7px 10px;white-space:nowrap}.owner{font-size:10px;font-weight:850;color:#9ed7ff;border:1px solid #315a77;border-radius:99px;padding:6px 8px}.spacer{flex:1}.group{display:flex;gap:5px}.btn{border:1px solid #344d63;background:#10202d;color:#dce8f1;border-radius:8px;padding:7px 9px;font-weight:750;font-size:12px;cursor:pointer}.btn.active{background:#e8f3fb;color:#07111b}.danger{border-color:#784551;color:#f0b7c0}.publish{border-color:#715b2a;color:#f2c96d}.status{font-size:11px;color:#94a9b9}.panel{display:none;position:fixed;top:60px;right:12px;width:min(390px,calc(100vw - 24px));background:#0d1721;color:#edf5fb;border:1px solid #385169;border-radius:12px;padding:14px;box-shadow:0 24px 70px #0008}.panel.open{display:block}.label{font-size:11px;color:#91a6b6;margin-bottom:6px}.target{font-size:12px;font-weight:800;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis}.input{width:100%;min-height:92px;resize:vertical;border:1px solid #3a5268;background:#08121b;color:#fff;border-radius:9px;padding:10px}.row{display:flex;gap:7px;justify-content:flex-end;margin-top:10px}.hint{font-size:11px;color:#7f94a5;margin-top:8px}@media(max-width:860px){.status,.owner{display:none}.hide-sm{display:none}.btn{padding:7px}}</style><div class="bar"><div class="badge">SANDBOX · NOT LIVE</div><div class="owner">OWNER VERIFIED</div><div class="group"><button class="btn active" data-mode="view">View</button><button class="btn" data-mode="edit">Edit</button><button class="btn" data-mode="preview">Preview</button></div><div class="group"><button class="btn hide-sm" id="undo">Undo</button><button class="btn hide-sm" id="redo">Redo</button></div><div class="status" id="status">Owner mode · production writes blocked</div><div class="spacer"></div><button class="btn danger" id="reset">Reset edits</button><button class="btn publish" id="publish">Publish locked</button></div><div class="panel" id="panel"><div class="label">OWNER EDITING</div><div class="target" id="target"></div><textarea class="input" id="input"></textarea><div class="row"><button class="btn" id="cancel">Cancel</button><button class="btn active" id="save">Save change</button></div><div class="hint">Site-copy editing only. Ranking order, player stats, and live data stay protected. This cannot edit production or push to main.</div></div>`;
 document.documentElement.appendChild(host);
 shadow.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 shadow.querySelector('#save').onclick=commit;
 shadow.querySelector('#cancel').onclick=()=>{shadow.querySelector('#panel').classList.remove('open');clear()};
 shadow.querySelector('#undo').onclick=()=>{const x=undo.pop();if(x)hist(x,x.before,redo)};
 shadow.querySelector('#redo').onclick=()=>{const x=redo.pop();if(x)hist(x,x.after,undo)};
 shadow.querySelector('#reset').onclick=()=>{if(confirm('Reset all owner sandbox text changes? Production will not be affected.')){edits={};undo=[];redo=[];save();location.reload()}};
 shadow.querySelector('#publish').onclick=()=>alert('Publish is intentionally locked. Even the owner cannot reach main until a production release is explicitly approved.');
 clicker=e=>{if(mode!=='edit'||!S.authorized)return;const el=e.target?.closest?.('[data-wh-editable="1"]');if(!el||!ok(el))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openEditor(el)};
 document.addEventListener('click',clicker,true);
 obs=new MutationObserver(()=>{mark();apply()});obs.observe(document.documentElement,{childList:true,subtree:true});
 mark();apply();setMode('view');
}
function off(){
 S.loaded=false;S.authorized=false;obs?.disconnect();obs=null;if(clicker)document.removeEventListener('click',clicker,true);clicker=null;
 document.documentElement.classList.remove('wh-sb-admin','wh-sb-edit','wh-sb-preview');document.querySelectorAll('[data-wh-editable="1"]').forEach(e=>delete e.dataset.whEditable);clear();host?.remove();style?.remove();host=shadow=style=null;
}
async function check(force=false){
 if(checking)return;checking=true;
 try{
   const s=await ownerSession();
   if(s){S.authorized=true;boot();return}
   if(S.loaded||S.authorized)off();
   showAccess(force?'Owner session expired. Sign in again to restore editing.':'Owner session needed');
 }finally{checking=false}
}
await check(false);
setInterval(()=>check(false),30000);
window.addEventListener('workhorse-owner-session-refreshed',()=>check(true));
})();
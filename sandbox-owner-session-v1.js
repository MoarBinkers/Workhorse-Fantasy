(()=>{
'use strict';
if(window.__WORKHORSE_OWNER_SESSION_HELPER__)return;
window.__WORKHORSE_OWNER_SESSION_HELPER__={version:1};
const REF='ytfwbvdzhrebupcftmhs';
const URL='https://ytfwbvdzhrebupcftmhs.supabase.co';
const KEY='sb_publishable_5BYaizAtZ_XkjXaVSFPk0w_v2qap-8k';
const AUTH='sb-'+REF+'-auth-token';
let busy=false;
function parse(v,d=0){
 if(d>6||v==null)return null;
 if(typeof v==='string'){try{return parse(JSON.parse(v),d+1)}catch(_){return null}}
 if(Array.isArray(v)){for(const x of v){const r=parse(x,d+1);if(r?.refresh_token)return r}return null}
 if(typeof v==='object'){
   if(typeof v.refresh_token==='string')return v;
   for(const k of ['currentSession','session','data','value'])if(k in v){const r=parse(v[k],d+1);if(r?.refresh_token)return r}
 }
 return null;
}
function stored(){try{return parse(localStorage.getItem(AUTH))}catch(_){return null}}
function jwtExp(t){try{const p=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return Number(p.exp||0)*1000}catch(_){return 0}}
async function refresh(force=false){
 if(busy)return false;
 const s=stored();if(!s?.refresh_token)return false;
 const exp=jwtExp(s.access_token||'');
 if(!force&&exp>Date.now()+5*60*1000)return true;
 busy=true;
 try{
   const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store'});
   if(!r.ok)return false;
   const next=await r.json();
   if(!next?.access_token||!next?.refresh_token)return false;
   localStorage.setItem(AUTH,JSON.stringify(next));
   window.dispatchEvent(new CustomEvent('workhorse-owner-session-refreshed'));
   return true;
 }catch(_){return false}finally{busy=false}
}
window.__WORKHORSE_OWNER_SESSION_HELPER__.refresh=refresh;
refresh(false);
setInterval(()=>refresh(false),4*60*1000);
})();
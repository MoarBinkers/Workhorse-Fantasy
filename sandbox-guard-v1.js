(()=>{
  'use strict';
  if(window.__WORKHORSE_SANDBOX_GUARD__) return;
  window.__WORKHORSE_SANDBOX__=true;
  window.__WORKHORSE_SANDBOX_GUARD__={version:2,storageNamespace:'wh_sandbox_v1::',productionWritesBlocked:true,editorBootstrap:true};

  const NS='wh_sandbox_v1::';
  const proto=Storage.prototype;
  const raw={
    get:proto.getItem,
    set:proto.setItem,
    remove:proto.removeItem,
    clear:proto.clear,
    key:proto.key
  };
  const isLocal=store=>{try{return store===window.localStorage}catch(_){return false}};
  const prefix=key=>NS+String(key);

  proto.getItem=function(key){
    if(!isLocal(this)) return raw.get.call(this,key);
    const sandboxKey=prefix(key);
    let value=raw.get.call(this,sandboxKey);
    if(value===null){
      const liveValue=raw.get.call(this,String(key));
      if(liveValue!==null){
        try{raw.set.call(this,sandboxKey,liveValue)}catch(_){ }
        value=liveValue;
      }
    }
    return value;
  };
  proto.setItem=function(key,value){
    if(!isLocal(this)) return raw.set.call(this,key,value);
    return raw.set.call(this,prefix(key),String(value));
  };
  proto.removeItem=function(key){
    if(!isLocal(this)) return raw.remove.call(this,key);
    return raw.remove.call(this,prefix(key));
  };
  proto.clear=function(){
    if(!isLocal(this)) return raw.clear.call(this);
    const doomed=[];
    for(let i=0;i<this.length;i++){
      const k=raw.key.call(this,i);
      if(k&&k.startsWith(NS)) doomed.push(k);
    }
    doomed.forEach(k=>raw.remove.call(this,k));
  };

  const nativeFetch=window.fetch.bind(window);
  const supabaseHost=/^https:\/\/ytfwbvdzhrebupcftmhs\.supabase\.co\//i;
  const safeAuthPost=/\/auth\/v1\/(?:token|logout)(?:\?|$)/i;
  window.fetch=(input,init={})=>{
    const target=typeof input==='string'?input:(input&&input.url)||'';
    const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    if(supabaseHost.test(target)&&!['GET','HEAD','OPTIONS'].includes(method)&&!safeAuthPost.test(target)){
      console.warn('[Workhorse Sandbox] blocked production Supabase write:',method,target);
      return Promise.resolve(new Response(JSON.stringify({
        error:'sandbox_write_blocked',
        message:'Workhorse Sandbox blocked a production data write.'
      }),{status:423,headers:{'Content-Type':'application/json'}}));
    }
    return nativeFetch(input,init);
  };

  try{
    const nativeBeacon=navigator.sendBeacon&&navigator.sendBeacon.bind(navigator);
    if(nativeBeacon){
      navigator.sendBeacon=(url,data)=>{
        if(supabaseHost.test(String(url||''))){
          console.warn('[Workhorse Sandbox] blocked production beacon:',url);
          return false;
        }
        return nativeBeacon(url,data);
      };
    }
  }catch(_){ }

  // Load the owner editor during initial parsing so route scripts cannot skip it.
  try{
    if(document.readyState==='loading'){
      document.write('<script defer src="./sandbox-admin-v1.js?v=7" data-wh-admin-bootstrap><\/script>');
    }else if(!document.querySelector('script[data-wh-admin-bootstrap]')){
      const s=document.createElement('script');s.src='./sandbox-admin-v1.js?v=7';s.dataset.whAdminBootstrap='1';document.head.appendChild(s);
    }
  }catch(_){ }
})();

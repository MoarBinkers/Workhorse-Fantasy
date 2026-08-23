// v57.3 — keep auth redirects on Workhorse while preserving explicit password-recovery context.
(()=>{
  if(window.__WORKHORSE_AUTH_REDIRECT_GUARD__)return;
  const state=window.__WORKHORSE_AUTH_REDIRECT_GUARD__={installed:false,url:'',recoveryUrl:''};

  function currentSiteUrl(){
    try{
      const u=new URL('./',location.href);
      u.search='';u.hash='';
      return u.href;
    }catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/'}
  }

  function recoverySiteUrl(){
    try{
      const u=new URL(currentSiteUrl());
      u.searchParams.set('workhorse_recovery','1');
      return u.href;
    }catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/?workhorse_recovery=1'}
  }

  function installRedirectGuard(){
    let client=null;
    try{if(typeof supabaseClient!=='undefined')client=supabaseClient}catch(_){}
    client=client||window.supabaseClient;
    if(!client?.auth)return false;
    if(client.auth.__workhorseRedirectPatched){state.installed=true;return true}

    const redirectTo=currentSiteUrl();
    const recoveryRedirectTo=recoverySiteUrl();
    const originalReset=client.auth.resetPasswordForEmail?.bind(client.auth);
    const originalSignUp=client.auth.signUp?.bind(client.auth);

    if(originalReset){
      client.auth.resetPasswordForEmail=(email,options={})=>originalReset(email,{...(options||{}),redirectTo:recoveryRedirectTo});
    }
    if(originalSignUp){
      client.auth.signUp=(credentials={})=>{
        if(!credentials||typeof credentials!=='object')return originalSignUp(credentials);
        return originalSignUp({...credentials,options:{...(credentials.options||{}),emailRedirectTo:redirectTo}});
      };
    }

    client.auth.__workhorseRedirectPatched=true;
    state.installed=true;
    state.url=redirectTo;
    state.recoveryUrl=recoveryRedirectTo;
    window.WorkhorseAuthRedirect={url:redirectTo,recoveryUrl:recoveryRedirectTo};
    return true;
  }

  if(!installRedirectGuard()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(installRedirectGuard()||tries>=200)clearInterval(timer);
    },50);
  }
})();

(()=>{
  let pendingSignup=null;
  let lastStored='';

  const el=id=>document.getElementById(id);

  function isSignup(){
    try{if(typeof authMode!=='undefined')return authMode==='signup'}catch(_){}
    return /create account/i.test(el('authTitle')?.textContent||'');
  }

  function ensureSemanticForm(){
    let form=el('deAuthForm57');
    if(!form){
      form=document.createElement('form');
      form.id='deAuthForm57';
      form.setAttribute('aria-hidden','true');
      form.style.display='none';
      form.addEventListener('submit',e=>e.preventDefault());
      (el('authGate')||document.body).appendChild(form);
    }

    const email=el('authEmail');
    const password=el('authPassword');
    const submit=el('authSubmit');
    if(email){
      email.setAttribute('name','username');
      email.setAttribute('autocomplete','username');
      email.setAttribute('autocapitalize','none');
      email.setAttribute('spellcheck','false');
      email.setAttribute('form','deAuthForm57');
    }
    if(password){
      password.setAttribute('name','password');
      password.setAttribute('autocomplete',isSignup()?'new-password':'current-password');
      password.setAttribute('form','deAuthForm57');
    }
    if(submit){
      submit.setAttribute('type','submit');
      submit.setAttribute('form','deAuthForm57');
    }
  }

  async function offerCredentialSave(email,password){
    if(!email||!password)return;
    const key=email+'\n'+password;
    if(key===lastStored)return;
    lastStored=key;
    try{
      if(!navigator.credentials?.store||typeof PasswordCredential==='undefined')return;
      const credential=new PasswordCredential({id:email,password,name:email});
      await navigator.credentials.store(credential);
    }catch(_){/* Browser/password manager decides whether to offer saving. */}
  }

  function watchSuccess(){
    const msg=el('authMessage');
    if(!msg||msg.dataset.deSaveWatch57)return;
    msg.dataset.deSaveWatch57='1';
    const check=()=>{
      const text=(msg.textContent||'').trim();
      if(pendingSignup&&/^Account created\b/i.test(text)){
        const creds=pendingSignup;
        pendingSignup=null;
        offerCredentialSave(creds.email,creds.password);
      }
    };
    new MutationObserver(check).observe(msg,{childList:true,characterData:true,subtree:true});
    check();
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#authSubmit,#authToggle');
    if(!target)return;
    if(target.id==='authToggle'){
      setTimeout(ensureSemanticForm,0);
      return;
    }
    ensureSemanticForm();
    if(isSignup()){
      const email=(el('authEmail')?.value||'').trim();
      const password=el('authPassword')?.value||'';
      if(email&&password.length>=6)pendingSignup={email,password};
    }else{
      pendingSignup=null;
    }
  },true);

  function init(){ensureSemanticForm();watchSuccess()}
  init();
  setTimeout(init,250);
  setTimeout(init,1000);
  const title=el('authTitle');
  if(title)new MutationObserver(ensureSemanticForm).observe(title,{childList:true,characterData:true,subtree:true});
})();

// v54.2 — production-safe email auth redirects + complete password recovery UI.
(()=>{
  const LIVE_URL=(()=>{try{const u=new URL('./',location.href);u.search='';u.hash='';return u.href}catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/'}})();
  let recoveryMode=false;
  let authSubscription=null;
  let resetBusy=false;

  const el=id=>document.getElementById(id);

  function injectCss(){
    if(el('deAuth54Css'))return;
    const s=document.createElement('style');
    s.id='deAuth54Css';
    s.textContent=`
      #deRecovery54{display:none;margin-top:12px}
      #deRecovery54.open{display:block}
      #deRecovery54 .de54-field{width:100%;box-sizing:border-box;margin-top:10px}
      #deRecovery54 .de54-actions{display:grid;gap:9px;margin-top:12px}
      #deRecovery54 .de54-save{width:100%;padding:12px 14px;border:1px solid #4e9bd5;border-radius:10px;background:linear-gradient(135deg,#1d77b5,#155d91);color:#fff;font-weight:900;cursor:pointer}
      #deRecovery54 .de54-save:hover{filter:brightness(1.08)}
      #deRecovery54 .de54-cancel{border:0;background:transparent;color:#8fa0af;font-weight:800;cursor:pointer;padding:7px}
      #deRecovery54 .de54-cancel:hover{color:#dbe8f1}
      #forgotPassword:disabled,#authSubmit:disabled,#deRecoverySave54:disabled{opacity:.58;cursor:not-allowed}
    `;
    document.head.appendChild(s);
  }

  function ensureRecoveryUi(){
    injectCss();
    const card=document.querySelector('#authGate .auth-card');
    if(!card||el('deRecovery54'))return;
    const box=document.createElement('div');
    box.id='deRecovery54';
    box.innerHTML=`
      <input class="de54-field" id="deRecoveryPassword54" type="password" autocomplete="new-password" placeholder="New password">
      <input class="de54-field" id="deRecoveryConfirm54" type="password" autocomplete="new-password" placeholder="Confirm new password">
      <div class="de54-actions">
        <button class="de54-save" id="deRecoverySave54">Save New Password</button>
        <button class="de54-cancel" id="deRecoveryCancel54">Cancel and sign out</button>
      </div>`;
    const links=card.querySelector('.auth-links');
    if(links)links.insertAdjacentElement('afterend',box);else card.appendChild(box);
    el('deRecoverySave54').onclick=saveNewPassword;
    el('deRecoveryCancel54').onclick=cancelRecovery;
    ['deRecoveryPassword54','deRecoveryConfirm54'].forEach(id=>el(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')saveNewPassword()}));
  }

  function normalAuthVisible(show){
    ['authEmail','authPassword','authSubmit'].forEach(id=>{const n=el(id);if(n)n.style.display=show?'':'none'});
    const links=document.querySelector('#authGate .auth-links');if(links)links.style.display=show?'':'none';
    const guest=el('backToLocal');if(guest)guest.style.display=show?'':'none';
  }

  function cleanAuthUrl(){
    try{
      const u=new URL(location.href);
      u.hash='';
      ['error','error_code','error_description','type'].forEach(k=>u.searchParams.delete(k));
      history.replaceState({},document.title,u.pathname+(u.search?u.search:'')+(u.hash||''));
    }catch(_){}
  }

  function showRecovery(message='Choose a new password for your Draft Edge account.'){
    ensureRecoveryUi();
    recoveryMode=true;
    normalAuthVisible(false);
    el('deRecovery54')?.classList.add('open');
    if(el('authTitle'))el('authTitle').textContent='Set New Password';
    if(el('authMessage'))el('authMessage').textContent=message;
    el('authGate')?.classList.add('open');
    setTimeout(()=>el('deRecoveryPassword54')?.focus(),0);
  }

  function restoreSignin(message='Sign in to access and sync your ranking lists.'){
    recoveryMode=false;
    ensureRecoveryUi();
    el('deRecovery54')?.classList.remove('open');
    normalAuthVisible(true);
    try{if(typeof setAuthMode==='function')setAuthMode('signin')}catch(_){}
    if(el('authTitle'))el('authTitle').textContent='Sign In';
    if(el('authMessage'))el('authMessage').textContent=message;
    el('authGate')?.classList.add('open');
  }

  async function saveNewPassword(){
    if(!supabaseClient)return;
    const p=el('deRecoveryPassword54')?.value||'';
    const c=el('deRecoveryConfirm54')?.value||'';
    if(p.length<6){el('authMessage').textContent='Use a password with at least 6 characters.';return}
    if(p!==c){el('authMessage').textContent='Those passwords do not match.';return}
    const b=el('deRecoverySave54');if(b)b.disabled=true;
    try{
      const {error}=await supabaseClient.auth.updateUser({password:p});
      if(error)throw error;
      recoveryMode=false;
      cleanAuthUrl();
      if(el('authMessage'))el('authMessage').textContent='Password changed successfully.';
      el('deRecovery54')?.classList.remove('open');
      normalAuthVisible(true);
      el('authGate')?.classList.remove('open');
      try{if(typeof loadCloudLists==='function'&&currentUser)await loadCloudLists()}catch(_){}
    }catch(e){
      if(el('authMessage'))el('authMessage').textContent=e?.message||'Could not update your password. Request a new reset link and try again.';
    }finally{if(b)b.disabled=false}
  }

  async function cancelRecovery(){
    try{if(supabaseClient)await supabaseClient.auth.signOut()}catch(_){}
    cleanAuthUrl();
    restoreSignin('Password reset canceled.');
  }

  async function sendReset(){
    if(!supabaseClient||resetBusy)return;
    const email=el('authEmail')?.value.trim()||'';
    if(!email){el('authMessage').textContent='Enter your email first.';return}
    const b=el('forgotPassword');
    resetBusy=true;if(b){b.disabled=true;b.textContent='Sending…'}
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:LIVE_URL});
      if(error)throw error;
      if(el('authMessage'))el('authMessage').textContent='Password reset email sent. Use the newest email you receive; older reset links stop working after a new one is requested.';
      if(b)b.textContent='Email sent';
      setTimeout(()=>{resetBusy=false;if(b){b.disabled=false;b.textContent='Forgot password?'}},60000);
    }catch(e){
      resetBusy=false;
      if(b){b.disabled=false;b.textContent='Forgot password?'}
      if(el('authMessage'))el('authMessage').textContent=e?.message||'Could not send the password reset email.';
    }
  }

  async function submitProductionAuth(){
    if(!supabaseClient||recoveryMode)return;
    const email=el('authEmail')?.value.trim()||'';
    const password=el('authPassword')?.value||'';
    if(!email||password.length<6){el('authMessage').textContent='Enter an email and a password with at least 6 characters.';return}
    const b=el('authSubmit');if(b)b.disabled=true;
    try{
      if(typeof authMode!=='undefined'&&authMode==='signup'){
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:LIVE_URL}});
        if(error)throw error;
        el('authMessage').textContent=data.session?'Account created.':'Account created — check your email to verify it, then sign in.';
      }else{
        const {error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error)throw error;
      }
    }catch(e){el('authMessage').textContent=e?.message||'Account request failed.'}
    finally{if(b)b.disabled=false}
  }

  function authErrorFromUrl(){
    try{
      const hash=new URLSearchParams((location.hash||'').replace(/^#/,''));
      const query=new URLSearchParams(location.search||'');
      const code=hash.get('error_code')||query.get('error_code');
      const desc=hash.get('error_description')||query.get('error_description');
      if(code||desc)return {code,desc};
    }catch(_){}
    return null;
  }

  function urlLooksRecovery(){
    try{
      const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
      const q=new URLSearchParams(location.search||'');
      return h.get('type')==='recovery'||q.get('type')==='recovery';
    }catch(_){return false}
  }

  function wireClient(){
    if(!supabaseClient||authSubscription)return false;
    const {data}=supabaseClient.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY')showRecovery();
      else if(event==='SIGNED_OUT'&&recoveryMode)restoreSignin();
    });
    authSubscription=data?.subscription||true;
    if(urlLooksRecovery())showRecovery();
    return true;
  }

  function install(){
    ensureRecoveryUi();
    const forgot=el('forgotPassword');if(forgot)forgot.onclick=sendReset;
    const submit=el('authSubmit');if(submit)submit.onclick=submitProductionAuth;
    try{forgotPassword=sendReset}catch(_){}
    try{submitAuth=submitProductionAuth}catch(_){}

    const err=authErrorFromUrl();
    if(err){
      const msg=/expired|token/i.test(String(err.desc||err.code||''))
        ? 'That email link is invalid or expired. Enter your email and request a new password reset link.'
        : 'That email link could not be used. Enter your email and request a new link.';
      restoreSignin(msg);
    }

    if(!wireClient()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(wireClient()||tries>200)clearInterval(t)},50);
    }
  }

  install();
  window.DraftEdgeAuthRecovery={show:showRecovery,sendReset,liveUrl:LIVE_URL};
})();

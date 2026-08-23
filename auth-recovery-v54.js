// v54.8 — run password recovery in a dedicated top-level touch layer, isolated from the normal auth card.
(()=>{
  const LIVE_URL=(()=>{try{const u=new URL('./',location.href);u.search='';u.hash='';return u.href}catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/'}})();
  const RECOVERY_URL=(()=>{try{const u=new URL(LIVE_URL);u.searchParams.set('workhorse_recovery','1');return u.href}catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/?workhorse_recovery=1'}})();
  let recoveryMode=false;
  let authSubscription=null;
  let resetBusy=false;

  const el=id=>document.getElementById(id);

  function authUrlState(){
    try{
      const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
      const q=new URLSearchParams(location.search||'');
      const type=h.get('type')||q.get('type')||'';
      const marker=q.get('workhorse_recovery')==='1';
      const credential=h.get('access_token')||h.get('refresh_token')||q.get('code')||q.get('token_hash')||'';
      return {h,q,type,marker,credential};
    }catch(_){return {h:new URLSearchParams(),q:new URLSearchParams(),type:'',marker:false,credential:''}}
  }

  function hasFreshRecoveryCredential(){
    if(window.__WORKHORSE_RECOVERY_BOOT_PROOF__)return true;
    const s=authUrlState();
    return (s.type==='recovery'||s.marker)&&!!s.credential;
  }

  function hasRecoveryMarker(){
    if(window.__WORKHORSE_RECOVERY_BOOT_PROOF__)return true;
    const s=authUrlState();
    return s.type==='recovery'||s.marker;
  }

  function releaseRecoveryLock(){
    window.__WORKHORSE_RECOVERY_PENDING__=false;
    window.__WORKHORSE_RECOVERY_BOOT_PROOF__=false;
    document.documentElement.classList.remove('workhorse-recovery-lock');
  }

  function injectCss(){
    if(el('deAuth54Css'))return;
    const s=document.createElement('style');
    s.id='deAuth54Css';
    s.textContent=`
      #deRecovery54{display:none;position:fixed;inset:0;z-index:2147483647;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box;background:#0b1016;overflow:auto;-webkit-overflow-scrolling:touch;visibility:visible!important;pointer-events:auto!important;touch-action:manipulation!important;isolation:isolate}
      #deRecovery54.open{display:flex!important}
      #deRecovery54 .de54-card{position:relative;z-index:1;width:min(100%,430px);box-sizing:border-box;padding:24px;border:1px solid #2b3d4b;border-radius:18px;background:linear-gradient(180deg,#121b24,#0d151d);box-shadow:0 24px 70px rgba(0,0,0,.55);pointer-events:auto!important;touch-action:manipulation!important}
      #deRecovery54 .de54-title{margin:0;color:#f4f8fb;font-size:22px;line-height:1.2;letter-spacing:-.02em}
      #deRecovery54 .de54-message{min-height:38px;margin-top:8px;color:#9dacb9;font-size:13px;line-height:1.5}
      #deRecovery54 .de54-field{display:block;width:100%;min-height:50px;box-sizing:border-box;margin-top:12px;padding:13px 14px;border:1px solid #314453;border-radius:11px;background:#0a1219;color:#eef5fa;font:inherit;font-size:16px;outline:none;position:relative;z-index:2;pointer-events:auto!important;touch-action:manipulation!important;-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}
      #deRecovery54 .de54-field:focus{border-color:#55a8e2;box-shadow:0 0 0 3px rgba(58,145,205,.16)}
      #deRecovery54 .de54-actions{display:grid;gap:9px;margin-top:14px;position:relative;z-index:2;pointer-events:auto!important}
      #deRecovery54 .de54-save{width:100%;min-height:50px;padding:12px 14px;border:1px solid #4e9bd5;border-radius:10px;background:linear-gradient(135deg,#1d77b5,#155d91);color:#fff;font-weight:900;font-size:16px;cursor:pointer;position:relative;z-index:3;pointer-events:auto!important;touch-action:manipulation!important;-webkit-user-select:none;user-select:none}
      #deRecovery54 .de54-cancel{min-height:48px;border:0;background:transparent;color:#8fa0af;font-weight:800;font-size:15px;cursor:pointer;padding:9px;position:relative;z-index:3;pointer-events:auto!important;touch-action:manipulation!important;-webkit-user-select:none;user-select:none}
      #deRecovery54 .de54-save:disabled{opacity:.58;cursor:not-allowed}
      html.workhorse-recovery-lock,html.workhorse-recovery-lock body{overflow:hidden!important;pointer-events:auto!important;touch-action:manipulation!important}
      html.workhorse-recovery-lock body>*:not(#deRecovery54){pointer-events:none!important}
      html.workhorse-recovery-lock #authGate{visibility:hidden!important;pointer-events:none!important}
      html.workhorse-recovery-lock #deRecovery54,html.workhorse-recovery-lock #deRecovery54 *{pointer-events:auto!important}
      @media(max-width:820px){
        #deRecovery54{align-items:flex-start!important;padding-top:max(18px,env(safe-area-inset-top))!important}
        #deRecovery54 .de54-card{width:100%!important;max-width:430px!important;margin:auto 0;padding:20px!important;border-radius:16px!important}
        #deRecovery54 .de54-field{min-height:52px!important;font-size:16px!important}
        #deRecovery54 .de54-save,#deRecovery54 .de54-cancel{min-height:52px!important;font-size:16px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function setRecoveryMessage(text){
    const m=el('deRecoveryMessage54');if(m)m.textContent=text||'';
    const auth=el('authMessage');if(auth&&recoveryMode)auth.textContent=text||'';
  }

  function bindTouchButton(button,action){
    if(!button||button.dataset.de54TouchBound)return;
    button.dataset.de54TouchBound='1';
    let lastTouch=0;
    button.addEventListener('touchend',e=>{
      if(button.disabled)return;
      e.preventDefault();
      e.stopPropagation();
      lastTouch=Date.now();
      action();
    },{passive:false});
    button.addEventListener('click',e=>{
      if(Date.now()-lastTouch<700){e.preventDefault();return}
      action();
    });
  }

  function bindTouchField(field){
    if(!field||field.dataset.de54TouchBound)return;
    field.dataset.de54TouchBound='1';
    const focus=()=>{try{field.focus({preventScroll:true})}catch(_){try{field.focus()}catch(__){}}};
    field.addEventListener('pointerdown',focus,{passive:true});
    field.addEventListener('touchend',focus,{passive:true});
  }

  function ensureRecoveryUi(){
    injectCss();
    let box=el('deRecovery54');
    if(!box){
      box=document.createElement('section');
      box.id='deRecovery54';
      box.setAttribute('role','dialog');
      box.setAttribute('aria-modal','true');
      box.setAttribute('aria-labelledby','deRecoveryTitle54');
      box.innerHTML=`<div class="de54-card">
        <h2 class="de54-title" id="deRecoveryTitle54">Set New Password</h2>
        <div class="de54-message" id="deRecoveryMessage54">Choose a new password for your Workhorse account.</div>
        <input class="de54-field" id="deRecoveryPassword54" type="password" name="new-password" autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="New password">
        <input class="de54-field" id="deRecoveryConfirm54" type="password" name="confirm-password" autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="Confirm new password">
        <div class="de54-actions">
          <button class="de54-save" id="deRecoverySave54" type="button">Save New Password</button>
          <button class="de54-cancel" id="deRecoveryCancel54" type="button">Cancel and sign out</button>
        </div>
      </div>`;
      document.body.appendChild(box);
    }
    const p=el('deRecoveryPassword54'),c=el('deRecoveryConfirm54');
    bindTouchField(p);bindTouchField(c);
    bindTouchButton(el('deRecoverySave54'),saveNewPassword);
    bindTouchButton(el('deRecoveryCancel54'),cancelRecovery);
    [p,c].forEach(n=>{if(n&&!n.dataset.de54KeyBound){n.dataset.de54KeyBound='1';n.addEventListener('keydown',e=>{if(e.key==='Enter')saveNewPassword()})}});
    return box;
  }

  function normalAuthVisible(show){
    const gate=el('authGate');
    if(gate){
      if(show){
        gate.removeAttribute('inert');
        gate.setAttribute('aria-hidden','false');
        gate.style.visibility='';
        gate.style.pointerEvents='auto';
      }else{
        gate.setAttribute('aria-hidden','true');
        gate.style.pointerEvents='none';
      }
    }
    ['authEmail','authPassword','authSubmit'].forEach(id=>{const n=el(id);if(n){n.style.display=show?'':'none';n.style.pointerEvents=show?'auto':'none'}});
    const links=document.querySelector('#authGate .auth-links');if(links){links.style.display=show?'':'none';links.style.pointerEvents=show?'auto':'none'}
    const guest=el('backToLocal');if(guest){guest.style.display=show?'':'none';guest.style.pointerEvents=show?'auto':'none'}
  }

  function cleanAuthUrl(){
    try{
      const u=new URL(location.href);
      u.hash='';
      ['error','error_code','error_description','type','code','token_hash','workhorse_recovery'].forEach(k=>u.searchParams.delete(k));
      history.replaceState({},document.title,u.pathname+(u.search?u.search:'')+(u.hash||''));
    }catch(_){}
  }

  function ownRecoveryTouchLayer(){
    const box=el('deRecovery54'),card=box?.querySelector('.de54-card');
    [document.documentElement,document.body,box,card,el('deRecoveryPassword54'),el('deRecoveryConfirm54'),el('deRecoverySave54'),el('deRecoveryCancel54')].forEach(n=>{if(n){n.removeAttribute?.('inert');n.style&&(n.style.pointerEvents='auto')}});
  }

  function showRecovery(message='Choose a new password for your Workhorse account.'){
    const box=ensureRecoveryUi();
    recoveryMode=true;
    window.__WORKHORSE_RECOVERY_PENDING__=true;
    document.documentElement.classList.add('workhorse-recovery-lock');
    normalAuthVisible(false);
    box.classList.add('open');
    box.setAttribute('aria-hidden','false');
    ownRecoveryTouchLayer();
    setRecoveryMessage(message);
    const coarse=window.matchMedia?.('(pointer:coarse)')?.matches;
    if(!coarse)setTimeout(()=>el('deRecoveryPassword54')?.focus(),0);
    setTimeout(ownRecoveryTouchLayer,100);
    setTimeout(ownRecoveryTouchLayer,500);
  }

  function restoreSignin(message='Sign in to access and sync your ranking lists.'){
    recoveryMode=false;
    const box=el('deRecovery54');
    if(box){box.classList.remove('open');box.setAttribute('aria-hidden','true')}
    releaseRecoveryLock();
    normalAuthVisible(true);
    try{if(typeof setAuthMode==='function')setAuthMode('signin')}catch(_){}
    if(el('authTitle'))el('authTitle').textContent='Sign In';
    if(el('authMessage'))el('authMessage').textContent=message;
    el('authGate')?.classList.add('open');
  }

  async function saveNewPassword(){
    if(typeof supabaseClient==='undefined'||!supabaseClient){setRecoveryMessage('Account service is still loading. Try again in a moment.');return}
    const p=el('deRecoveryPassword54')?.value||'';
    const c=el('deRecoveryConfirm54')?.value||'';
    if(p.length<6){setRecoveryMessage('Use a password with at least 6 characters.');return}
    if(p!==c){setRecoveryMessage('Those passwords do not match.');return}
    const b=el('deRecoverySave54');if(b)b.disabled=true;
    setRecoveryMessage('Saving your new password…');
    try{
      const {error}=await supabaseClient.auth.updateUser({password:p});
      if(error)throw error;
      try{await supabaseClient.auth.signOut({scope:'local'})}catch(_){}
      cleanAuthUrl();
      if(el('deRecoveryPassword54'))el('deRecoveryPassword54').value='';
      if(el('deRecoveryConfirm54'))el('deRecoveryConfirm54').value='';
      restoreSignin('Password changed successfully. Sign in with your new password.');
    }catch(e){
      setRecoveryMessage(e?.message||'Could not update your password. Request a new reset link and try again.');
    }finally{if(b)b.disabled=false}
  }

  async function cancelRecovery(){
    try{if(typeof supabaseClient!=='undefined'&&supabaseClient)await supabaseClient.auth.signOut({scope:'local'})}catch(_){}
    cleanAuthUrl();
    restoreSignin('Password reset canceled.');
  }

  async function sendReset(){
    if(typeof supabaseClient==='undefined'||!supabaseClient||resetBusy)return;
    const email=el('authEmail')?.value.trim()||'';
    if(!email){if(el('authMessage'))el('authMessage').textContent='Enter your email first.';return}
    const b=el('forgotPassword');
    resetBusy=true;if(b){b.disabled=true;b.textContent='Sending…'}
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_URL});
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
    if(typeof supabaseClient==='undefined'||!supabaseClient||recoveryMode||window.__WORKHORSE_RECOVERY_PENDING__)return;
    const email=el('authEmail')?.value.trim()||'';
    const password=el('authPassword')?.value||'';
    if(!email||password.length<6){if(el('authMessage'))el('authMessage').textContent='Enter an email and a password with at least 6 characters.';return}
    const b=el('authSubmit');if(b)b.disabled=true;
    try{
      if(typeof authMode!=='undefined'&&authMode==='signup'){
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:LIVE_URL}});
        if(error)throw error;
        if(el('authMessage'))el('authMessage').textContent=data.session?'Account created.':'Account created — check your email to verify it, then sign in.';
      }else{
        const {error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error)throw error;
      }
    }catch(e){if(el('authMessage'))el('authMessage').textContent=e?.message||'Account request failed.'}
    finally{if(b)b.disabled=false}
  }

  function authErrorFromUrl(){
    try{
      const {h,q}=authUrlState();
      const code=h.get('error_code')||q.get('error_code');
      const desc=h.get('error_description')||q.get('error_description');
      if(code||desc)return {code,desc};
    }catch(_){}
    return null;
  }

  function wireClient(){
    if(typeof supabaseClient==='undefined'||!supabaseClient||authSubscription)return false;
    const {data}=supabaseClient.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY')showRecovery();
      else if(event==='SIGNED_OUT'&&recoveryMode)restoreSignin('Sign in with your password.');
    });
    authSubscription=data?.subscription||true;
    if(hasFreshRecoveryCredential())showRecovery();
    return true;
  }

  function install(){
    injectCss();
    const forgot=el('forgotPassword');if(forgot)forgot.onclick=sendReset;
    const submit=el('authSubmit');if(submit)submit.onclick=submitProductionAuth;
    try{forgotPassword=sendReset}catch(_){}
    try{submitAuth=submitProductionAuth}catch(_){}

    const err=authErrorFromUrl();
    if(err){
      cleanAuthUrl();
      const msg=/expired|token/i.test(String(err.desc||err.code||''))
        ? 'That email link is invalid or expired. Enter your email and request a new password reset link.'
        : 'That email link could not be used. Enter your email and request a new link.';
      restoreSignin(msg);
    }else if(hasFreshRecoveryCredential()){
      showRecovery();
    }else if(window.__WORKHORSE_RECOVERY_PENDING__||hasRecoveryMarker()){
      cleanAuthUrl();
      restoreSignin('That recovery link is no longer active. Request a new reset email and use it once.');
    }else{
      releaseRecoveryLock();
      normalAuthVisible(true);
    }

    if(!wireClient()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(wireClient()||tries>200)clearInterval(t)},50);
    }
  }

  install();
  window.DraftEdgeAuthRecovery={show:showRecovery,sendReset,liveUrl:LIVE_URL,recoveryUrl:RECOVERY_URL};
})();

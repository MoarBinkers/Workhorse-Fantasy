// v56.4 — production Forgot Password flow with durable cooldown and clear Supabase rate-limit states.
(()=>{
  const LIVE_URL=(()=>{try{const u=new URL('./',location.href);u.search='';u.hash='';return u.href}catch(_){return 'https://moarbinkers.github.io/Workhorse-Fantasy/'}})();
  const COOLDOWN_KEY='workhorse-password-reset-cooldown-until';
  let sending=false;
  let cooldownTimer=null;
  const $=id=>document.getElementById(id);

  function css(){
    if($('deForgot56Css'))return;
    const s=document.createElement('style');s.id='deForgot56Css';s.textContent=`
      #deForgot56{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(4,9,14,.78);backdrop-filter:blur(8px)}
      #deForgot56.open{display:flex}
      #deForgot56 .card{width:min(100%,420px);box-sizing:border-box;padding:22px;border:1px solid rgba(116,168,207,.32);border-radius:18px;background:linear-gradient(180deg,#121b24,#0d151d);box-shadow:0 24px 70px rgba(0,0,0,.5)}
      #deForgot56 .head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      #deForgot56 h2{margin:0;color:#f4f8fb;font-size:20px;letter-spacing:-.02em}
      #deForgot56 .sub{margin:7px 0 0;color:#96a6b5;font-size:13px;line-height:1.5}
      #deForgot56 .close{flex:0 0 auto;width:34px;height:34px;border-radius:10px;border:1px solid #2d3d4b;background:#101923;color:#aebcca;font-size:20px;line-height:1;cursor:pointer}
      #deForgot56 input{width:100%;box-sizing:border-box;margin-top:18px;padding:13px 14px;border:1px solid #314453;border-radius:11px;background:#0a1219;color:#eef5fa;font:inherit;font-size:16px;outline:none}
      #deForgot56 input:focus{border-color:#55a8e2;box-shadow:0 0 0 3px rgba(58,145,205,.16)}
      #deForgot56 .send{width:100%;margin-top:12px;padding:13px 16px;border:1px solid #58a9e1;border-radius:11px;background:linear-gradient(135deg,#2588ca,#17649d);color:#fff;font-weight:950;font-size:13px;cursor:pointer}
      #deForgot56 button:disabled,#deForgot56 input:disabled{opacity:.58;cursor:not-allowed}
      #deForgot56 .msg{min-height:20px;margin-top:11px;color:#9eafbd;font-size:12px;line-height:1.5}
      #deForgot56 .msg.ok{color:#86d5aa} #deForgot56 .msg.err{color:#f2a4ad}
      #deForgot56 .done{display:none;width:100%;margin-top:8px;padding:10px 14px;border:0;border-radius:10px;background:#17232d;color:#c9d6df;font-weight:850;cursor:pointer}
      #deForgot56.sent .done,#deForgot56.limited .done{display:block}
      @media(max-width:520px){#deForgot56{align-items:flex-end;padding:12px}#deForgot56 .card{width:100%;padding:20px;border-radius:18px 18px 14px 14px;margin-bottom:max(0px,env(safe-area-inset-bottom))}}
    `;document.head.appendChild(s);
  }

  function ensure(){
    css();if($('deForgot56'))return $('deForgot56');
    const r=document.createElement('div');r.id='deForgot56';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');
    r.innerHTML=`<div class="card"><div class="head"><div><h2>Reset your password</h2><div class="sub">Enter the email on your Workhorse account. We’ll send one secure reset link.</div></div><button class="close" id="deForgotClose56" aria-label="Close">×</button></div><input id="deForgotEmail56" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="Email address"><button class="send" id="deForgotSend56">Send Recovery Email</button><div class="msg" id="deForgotMsg56"></div><button class="done" id="deForgotDone56">Done</button></div>`;
    document.body.appendChild(r);$('deForgotClose56').onclick=close;$('deForgotDone56').onclick=close;$('deForgotSend56').onclick=send;$('deForgotEmail56').addEventListener('keydown',e=>{if(e.key==='Enter')send()});r.addEventListener('click',e=>{if(e.target===r)close()});return r;
  }

  function message(text,type=''){
    const m=$('deForgotMsg56');if(!m)return;m.textContent=text||'';m.classList.toggle('ok',type==='ok');m.classList.toggle('err',type==='err');
  }
  function readCooldown(){try{return Math.max(0,Number(localStorage.getItem(COOLDOWN_KEY)||0))}catch(_){return 0}}
  function writeCooldown(until){try{localStorage.setItem(COOLDOWN_KEY,String(until))}catch(_){}}
  function clearCooldown(){try{localStorage.removeItem(COOLDOWN_KEY)}catch(_){}if(cooldownTimer){clearInterval(cooldownTimer);cooldownTimer=null}}
  function setCooldown(seconds){
    const until=Date.now()+Math.max(1,seconds)*1000;
    writeCooldown(Math.max(readCooldown(),until));
    syncCooldown();
  }
  function syncCooldown(){
    const until=readCooldown();
    const left=Math.ceil((until-Date.now())/1000);
    const b=$('deForgotSend56');
    if(left<=0){
      clearCooldown();
      if(b&&!sending){b.disabled=false;b.textContent='Send Recovery Email'}
      return false;
    }
    if(b){b.disabled=true;b.textContent=`Try again in ${left}s`}
    if(!cooldownTimer)cooldownTimer=setInterval(syncCooldown,1000);
    return true;
  }

  function open(){
    const r=ensure();r.classList.remove('sent','limited');message('');
    const input=$('deForgotEmail56');const prior=$('authEmail')?.value?.trim();
    if(input){if(prior)input.value=prior;input.disabled=false}
    const b=$('deForgotSend56');if(b){b.disabled=false;b.textContent='Send Recovery Email'}
    r.classList.add('open');
    if(syncCooldown())message('A reset request was just made. To prevent duplicate emails, Workhorse temporarily disables another request.','');
    setTimeout(()=>input?.focus(),30);
  }
  function close(){if(sending)return;$('deForgot56')?.classList.remove('open')}

  async function send(){
    if(sending||syncCooldown())return;
    const input=$('deForgotEmail56');const email=(input?.value||'').trim();
    if(!email||!/^\S+@\S+\.\S+$/.test(email)){message('Enter a valid email address.','err');input?.focus();return}
    if(typeof supabaseClient==='undefined'||!supabaseClient){message('Account service is still loading. Try again in a moment.','err');return}
    sending=true;const b=$('deForgotSend56');if(input)input.disabled=true;if(b){b.disabled=true;b.textContent='Sending…'}message('Requesting one recovery email…');
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:LIVE_URL});if(error)throw error;
      setCooldown(60);
      if($('authEmail'))$('authEmail').value=email;
      $('deForgot56')?.classList.add('sent');
      message('Recovery email requested successfully. Use only the newest Workhorse reset email.','ok');
    }catch(e){
      const raw=String(e?.message||'Could not send the recovery email.');
      const seconds=raw.match(/after\s+(\d+)\s+seconds?/i);
      const limited=/rate limit|too many requests|429/i.test(raw);
      if(seconds){
        setCooldown(Number(seconds[1])+2);
        message(`Too many reset requests were made. No new email was sent. Try again after the timer finishes.`,'err');
      }else if(limited){
        setCooldown(60);
        $('deForgot56')?.classList.add('limited');
        message('Workhorse’s email provider is temporarily rate-limited. No new email was sent. The button is locked briefly so repeated taps cannot make the problem worse.','err');
      }else{
        message(raw,'err');if(b){b.disabled=false;b.textContent='Send Recovery Email'}
      }
    }finally{
      sending=false;
      if(input)input.disabled=false;
      syncCooldown();
    }
  }

  $('deForgot55')?.remove();
  document.addEventListener('click',e=>{const f=e.target.closest?.('#forgotPassword');if(!f)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open()},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('deForgot56')?.classList.contains('open'))close()});
  ensure();syncCooldown();window.WorkhorseForgotPassword={open,close,send};
})();

(()=>{
  if(document.querySelector('script[data-de-password-save57]'))return;
  const s=document.createElement('script');
  s.src='./auth-password-save-v57.js?v=572';
  s.dataset.dePasswordSave57='1';
  document.head.appendChild(s);
})();

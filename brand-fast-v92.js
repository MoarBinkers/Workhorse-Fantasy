// v92 — reveal Workhorse immediately; full image assets load after core ADP is ready.
(()=>{
  try{
    document.title='Workhorse — Fantasy Analytics';
    const inner=document.querySelector('.brand-lockup-inner');
    if(inner&&!inner.querySelector('.workhorse-main-lockup')){
      inner.innerHTML='<div style="font-weight:1000;font-size:34px;letter-spacing:-.04em;text-align:center">WORKHORSE<div style="font-size:10px;letter-spacing:.28em;color:#8194a4;margin-top:4px">FANTASY ANALYTICS</div></div>';
    }
  }catch(_){}
  document.documentElement.classList.add('workhorse-ready');
  document.getElementById('workhorse-prebrand')?.remove();
  document.getElementById('workhorse-app-gate')?.remove();
})();

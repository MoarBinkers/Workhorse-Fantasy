// v92.2 — reveal Workhorse immediately and prevent the legacy Sleeper search-rank refresh from overwriting true ADP.
(()=>{
  try{
    // The compressed base app still starts its old Sleeper directory refresh before
    // central-adp-v92 loads. If that slower request finishes afterward, its
    // search_rank rows can overwrite the verified format-specific market. Guard
    // those legacy writes at the shared market object. True central rows use
    // searchRank:null + central:true and pass through normally.
    if(!window.__WORKHORSE_TRUE_ADP_GUARD__&&typeof market!=='undefined'&&market&&typeof market==='object'){
      const target=market;
      market=new Proxy(target,{
        set(obj,key,value){
          const legacy=value&&typeof value==='object'&&value.central!==true&&value.searchRank!=null&&Number.isFinite(Number(value.searchRank));
          if(legacy)return true;
          return Reflect.set(obj,key,value);
        },
        deleteProperty(obj,key){return Reflect.deleteProperty(obj,key)}
      });
      window.__WORKHORSE_TRUE_ADP_GUARD__=true;
    }
  }catch(e){console.warn('Workhorse ADP guard unavailable',e)}

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

(()=>{
  'use strict';
  if(window.__WORKHORSE_SANDBOX_ADMIN__) return;
  window.__WORKHORSE_SANDBOX_ADMIN__=true;

  const STORE='wh_editor_edits_v1';
  let mode='view';
  let edits={};
  let undoStack=[];
  let redoStack=[];
  let selected=null;

  try{edits=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch(_){edits={}}
  const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(edits))}catch(_){}};

  const style=document.createElement('style');
  style.id='wh-sandbox-editor-css';
  style.textContent=`
    html{scroll-padding-top:58px}
    body{padding-top:52px!important}
    html.wh-sb-edit [data-wh-editable="1"]{outline:1px dashed rgba(83,177,255,.58);outline-offset:2px;cursor:pointer}
    html.wh-sb-edit [data-wh-editable="1"]:hover{outline:2px solid #62b8ff;background:rgba(98,184,255,.06)}
    html.wh-sb-preview [data-wh-editable="1"]{outline:none!important}
    #wh-sandbox-selected{outline:2px solid #f2c96d!important;background:rgba(242,201,109,.08)!important}
  `;
  document.head.appendChild(style);

  const host=document.createElement('div');
  host.id='wh-sandbox-admin-host';
  host.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;height:52px';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`
    <style>
      *{box-sizing:border-box}.bar{height:52px;background:#07111b;color:#edf5fb;border-bottom:1px solid #26415a;display:flex;align-items:center;gap:8px;padding:7px 10px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28)}
      .badge{font-size:11px;font-weight:900;letter-spacing:.08em;color:#06111b;background:#f2c96d;border-radius:999px;padding:7px 10px;white-space:nowrap}.spacer{flex:1}.group{display:flex;gap:5px}.btn{border:1px solid #344d63;background:#10202d;color:#dce8f1;border-radius:8px;padding:7px 10px;font-weight:750;font-size:12px;cursor:pointer}.btn:hover{background:#172b3b}.btn.active{background:#e8f3fb;color:#07111b;border-color:#e8f3fb}.btn.danger{border-color:#784551;color:#f0b7c0}.btn.publish{border-color:#715b2a;color:#f2c96d}.status{font-size:11px;color:#94a9b9;white-space:nowrap}.panel{display:none;position:fixed;top:60px;right:12px;width:min(390px,calc(100vw - 24px));background:#0d1721;color:#edf5fb;border:1px solid #385169;border-radius:12px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.48)}.panel.open{display:block}.label{font-size:11px;color:#91a6b6;margin-bottom:6px}.target{font-size:12px;font-weight:800;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.input{width:100%;min-height:92px;resize:vertical;border:1px solid #3a5268;background:#08121b;color:#fff;border-radius:9px;padding:10px;font:13px/1.4 system-ui}.row{display:flex;gap:7px;justify-content:flex-end;margin-top:10px}.hint{font-size:11px;color:#7f94a5;line-height:1.45;margin-top:8px}@media(max-width:780px){.status{display:none}.btn{padding:7px 8px}.hide-sm{display:none}.bar{gap:5px;padding:7px 6px}}
    </style>
    <div class="bar">
      <div class="badge">SANDBOX · NOT LIVE</div>
      <div class="group"><button class="btn active" data-mode="view">View</button><button class="btn" data-mode="edit">Edit</button><button class="btn" data-mode="preview">Preview</button></div>
      <div class="group"><button class="btn hide-sm" id="undo">Undo</button><button class="btn hide-sm" id="redo">Redo</button></div>
      <div class="status" id="status">Production writes blocked</div><div class="spacer"></div>
      <button class="btn danger" id="reset">Reset edits</button><button class="btn publish" id="publish">Publish locked</button>
    </div>
    <div class="panel" id="panel"><div class="label">EDITING</div><div class="target" id="target"></div><textarea class="input" id="input"></textarea><div class="row"><button class="btn" id="cancel">Cancel</button><button class="btn active" id="save">Save change</button></div><div class="hint">This saves only to the sandbox. It does not edit production or push to main.</div></div>`;
  document.documentElement.appendChild(host);

  const $=q=>shadow.querySelector(q);
  const status=$('#status'),panel=$('#panel'),input=$('#input'),targetLabel=$('#target');

  function stableKey(el){
    if(el.id&&el.id!=='wh-sandbox-selected')return '#'+CSS.escape(el.id);
    if(el.dataset&&el.dataset.page)return el.tagName.toLowerCase()+'[data-page="'+CSS.escape(el.dataset.page)+'"]';
    const parts=[];let node=el;
    while(node&&node!==document.body&&parts.length<6){
      let part=node.tagName.toLowerCase();
      if(node.classList&&node.classList.length){const cls=[...node.classList].filter(c=>!c.startsWith('active')&&!c.startsWith('wh-')).slice(0,2);if(cls.length)part+='.'+cls.map(CSS.escape).join('.')}
      const parent=node.parentElement;
      if(parent){const same=[...parent.children].filter(x=>x.tagName===node.tagName);if(same.length>1)part+=`:nth-of-type(${same.indexOf(node)+1})`}
      parts.unshift(part);node=parent;
    }
    return parts.join('>');
  }

  function eligible(el){
    if(!el||!el.matches||el.closest('#wh-sandbox-admin-host'))return false;
    if(el.closest('.rank-list,.player,.player-row,.draft-list,[id*="rankList"],[id*="draftList"],table,tbody'))return false;
    if(el.matches('input,textarea,select,option,svg,path,img,video,canvas'))return false;
    const text=(el.textContent||'').trim();
    if(!text||text.length>220||el.children.length>3)return false;
    return el.matches('h1,h2,h3,h4,p,span,button,a,label,.brand-title,.brand-tagline,.pagehead *,.nav button,.btn,.small,.notice');
  }

  function markEditable(){document.querySelectorAll('h1,h2,h3,h4,p,span,button,a,label,.brand-title,.brand-tagline,.pagehead *,.nav button,.btn,.small,.notice').forEach(el=>{if(eligible(el))el.dataset.whEditable='1'})}
  function applyEdits(){Object.entries(edits).forEach(([key,value])=>{try{const el=document.querySelector(key);if(el&&typeof value==='string'&&eligible(el))el.textContent=value}catch(_){}})}

  function setMode(next){
    mode=next;document.documentElement.classList.toggle('wh-sb-edit',mode==='edit');document.documentElement.classList.toggle('wh-sb-preview',mode==='preview');shadow.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));panel.classList.remove('open');selected=null;const old=document.getElementById('wh-sandbox-selected');if(old)old.removeAttribute('id');status.textContent=mode==='edit'?'Click outlined text to edit':mode==='preview'?'Previewing sandbox changes':'Production writes blocked';
  }

  function openEditor(el){
    const old=document.getElementById('wh-sandbox-selected');if(old)old.removeAttribute('id');selected=el;if(!selected.id)selected.id='wh-sandbox-selected';targetLabel.textContent=stableKey(el);input.value=(el.textContent||'').trim();panel.classList.add('open');setTimeout(()=>{input.focus();input.select()},0);
  }

  function commitEdit(){
    if(!selected)return;const key=stableKey(selected),before=(selected.textContent||'').trim(),after=input.value.trim();if(after!==before){undoStack.push({key,before,after});redoStack=[];edits[key]=after;save();selected.textContent=after;status.textContent='Sandbox change saved'}panel.classList.remove('open');selected=null;const old=document.getElementById('wh-sandbox-selected');if(old)old.removeAttribute('id');
  }

  function history(item,toValue,stack){if(!item)return;try{const el=document.querySelector(item.key);if(el)el.textContent=toValue;edits[item.key]=toValue;save();stack.push(item);status.textContent='Sandbox edit history updated'}catch(_){}}

  shadow.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#save').addEventListener('click',commitEdit);$('#cancel').addEventListener('click',()=>{panel.classList.remove('open');selected=null;const old=document.getElementById('wh-sandbox-selected');if(old)old.removeAttribute('id')});
  $('#undo').addEventListener('click',()=>{const i=undoStack.pop();if(i)history(i,i.before,redoStack)});$('#redo').addEventListener('click',()=>{const i=redoStack.pop();if(i)history(i,i.after,undoStack)});
  $('#reset').addEventListener('click',()=>{if(!confirm('Reset all click-to-edit sandbox text changes? Production will not be affected.'))return;edits={};undoStack=[];redoStack=[];save();location.reload()});
  $('#publish').addEventListener('click',()=>alert('Publish is intentionally locked. Sandbox changes cannot reach main until you explicitly approve a production release.'));

  document.addEventListener('click',e=>{if(mode!=='edit')return;const el=e.target&&e.target.closest?e.target.closest('[data-wh-editable="1"]'):null;if(!el||!eligible(el))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openEditor(el)},true);
  const observer=new MutationObserver(()=>{markEditable();applyEdits()});observer.observe(document.documentElement,{childList:true,subtree:true});markEditable();applyEdits();setMode('view');
})();

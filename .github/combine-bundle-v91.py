from pathlib import Path
import gzip
import hashlib

PARTS=[Path(f'app-v28-part-{i:02d}.bin') for i in range(10)]
EXPECTED_SIZE=28016
EXPECTED_TEXT_SHA='77a31b87341147e99b00dbe40a23961addc39723cb8464129cc3c68a13db0879'

blob=b''.join(p.read_bytes() for p in PARTS)
if len(blob)!=EXPECTED_SIZE:
    raise SystemExit(f'Combined Workhorse bundle size changed: {len(blob)}')
try:
    text=gzip.decompress(blob)
except Exception as e:
    raise SystemExit(f'Combined Workhorse bundle is not valid gzip: {e}')
actual=hashlib.sha256(text).hexdigest()
if actual!=EXPECTED_TEXT_SHA:
    raise SystemExit(f'Combined Workhorse bundle content hash changed: {actual}')
Path('app-v28.bin').write_bytes(blob)

p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="""  const files=Array.from({length:10},(_,i)=>'./app-v28-part-'+String(i).padStart(2,'0')+'.bin?v=28c');
  const retryableStatuses=new Set([408,425,429,500,502,503,504]);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const fetchPart=async file=>{
   let lastError=null;
   for(let attempt=0;attempt<4;attempt++){
    try{
     const url=attempt===0?file:file+'&retry='+attempt+'-'+Date.now();
     const r=await fetch(url,{cache:attempt===0?\"force-cache\":\"no-store\"});
     if(r.ok)return new Uint8Array(await r.arrayBuffer());
     const err=new Error(\"Could not load \"+file+\" (HTTP \"+r.status+\").\");
     err.status=r.status;
     lastError=err;
     if(!retryableStatuses.has(r.status))throw err;
    }catch(e){
     lastError=e;
     if(e&&e.status&&!retryableStatuses.has(e.status))throw e;
    }
    if(attempt<3)await sleep(300*(2**attempt));
   }
   throw lastError||new Error(\"Could not load \"+file+\".\");
  };
  const buffers=new Array(files.length);
  let nextPart=0;
  const loadWorker=async()=>{
    while(true){
      const i=nextPart++;
      if(i>=files.length)return;
      buffers[i]=await fetchPart(files[i]);
    }
  };
  await Promise.all(Array.from({length:Math.min(3,files.length)},loadWorker));
  const total=buffers.reduce((n,b)=>n+b.length,0);
  if(total!==28016)throw new Error(\"Workhorse bundle was incomplete (\"+total+\" bytes).\");
  const joined=new Uint8Array(total);
  let offset=0;
  for(const b of buffers){joined.set(b,offset);offset+=b.length}
"""
new="""  const bundle='./app-v28.bin?v=28d';
  const files=Array.from({length:10},(_,i)=>'./app-v28-part-'+String(i).padStart(2,'0')+'.bin?v=28c');
  const retryableStatuses=new Set([408,425,429,500,502,503,504]);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const fetchAsset=async(file,maxAttempts=4)=>{
   let lastError=null;
   for(let attempt=0;attempt<maxAttempts;attempt++){
    try{
     const url=attempt===0?file:file+'&retry='+attempt+'-'+Date.now();
     const r=await fetch(url,{cache:attempt===0?\"force-cache\":\"no-store\"});
     if(r.ok)return new Uint8Array(await r.arrayBuffer());
     const err=new Error(\"Could not load \"+file+\" (HTTP \"+r.status+\").\");
     err.status=r.status;
     lastError=err;
     if(!retryableStatuses.has(r.status))throw err;
    }catch(e){
     lastError=e;
     if(e&&e.status&&!retryableStatuses.has(e.status))throw e;
    }
    if(attempt<maxAttempts-1)await sleep(250*(2**attempt));
   }
   throw lastError||new Error(\"Could not load \"+file+\".\");
  };
  const loadChunkFallback=async()=>{
    const buffers=new Array(files.length);
    let nextPart=0;
    const loadWorker=async()=>{
      while(true){
        const i=nextPart++;
        if(i>=files.length)return;
        buffers[i]=await fetchAsset(files[i],4);
      }
    };
    await Promise.all(Array.from({length:Math.min(3,files.length)},loadWorker));
    const total=buffers.reduce((n,b)=>n+b.length,0);
    if(total!==28016)throw new Error(\"Workhorse fallback bundle was incomplete (\"+total+\" bytes).\");
    const joined=new Uint8Array(total);
    let offset=0;
    for(const b of buffers){joined.set(b,offset);offset+=b.length}
    return joined;
  };
  let joined;
  try{
    joined=await fetchAsset(bundle,2);
    if(joined.length!==28016)throw new Error(\"Workhorse bundle was incomplete (\"+joined.length+\" bytes).\");
  }catch(bundleError){
    console.warn('Combined Workhorse bundle unavailable; using chunk fallback.',bundleError);
    joined=await loadChunkFallback();
  }
"""
if old not in s:
    raise SystemExit('Current multi-part startup block did not match; refusing unsafe replacement.')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Add permanent guards without weakening the existing ADP/Edge checks.
g=Path('.github/performance-regression-check.py')
t=g.read_text(encoding='utf-8')
marker="print('Top-250 startup, on-demand search, and interaction responsiveness checks passed.')"
checks="""
if "const bundle='./app-v28.bin?v=28d';" not in index:
    raise SystemExit('Single-request Workhorse bundle is not the primary startup path.')
if 'loadChunkFallback' not in index or "app-v28-part-'" not in index:
    raise SystemExit('Multi-part emergency bundle fallback is missing.')
if 'joined=await fetchAsset(bundle,2);' not in index:
    raise SystemExit('Combined bundle is not fetched before chunk fallback.')
if not Path('app-v28.bin').is_file() or Path('app-v28.bin').stat().st_size != 28016:
    raise SystemExit('Combined Workhorse bundle file is missing or incomplete.')
"""
if marker not in t:
    raise SystemExit('Performance guard marker missing.')
t=t.replace(marker,checks+'\n'+marker,1)
g.write_text(t,encoding='utf-8')

print('Combined one-request Workhorse bundle prepared and verified.')

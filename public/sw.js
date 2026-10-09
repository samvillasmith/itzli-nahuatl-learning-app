/* Cache only public offline content, immutable app assets, and requested audio.
   Never store authenticated HTML, API responses, account pages, or images. */
const CACHE='itzli-public-v3-1';
const GENERATED_AUDIO_ORIGIN='https://nahuatl-language.s3.us-east-1.amazonaws.com';
const GENERATED_AUDIO_RECIPE='spanish-air-b-2026-10-07';
const GENERATED_AUDIO_CACHE='itzli-generated-audio-'+GENERATED_AUDIO_RECIPE;
const GENERATED_AUDIO_MANIFEST_CACHE='itzli-generated-audio-manifest-'+GENERATED_AUDIO_RECIPE;
const GENERATED_AUDIO_MANIFEST_PATH='/generated-course-audio.json';
const GENERATED_AUDIO_PATH=new RegExp('^/itzli-app/audio-v3/'+GENERATED_AUDIO_RECIPE+'/[a-f0-9]{64}\\.(?:wav|mp3)$');
let generatedAudioWhitelist=null;
let generatedAudioWhitelistRequest=null;
let generatedAudioWhitelistRefreshedAt=0;

function isGeneratedAudioUrl(url){
 return url.origin===GENERATED_AUDIO_ORIGIN&&!url.username&&!url.password&&!url.search&&!url.hash&&GENERATED_AUDIO_PATH.test(url.pathname);
}

function isFullAudioResponse(response){
 return response&&response.status===200&&response.type!=='opaque'&&/^audio\//i.test(response.headers.get('content-type')||'');
}

async function readGeneratedAudioWhitelist(response){
 if(!response||response.status!==200||response.type==='opaque'||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||''))return null;
 try{
  const manifest=await response.json();
  if(manifest.schema_version!==1||manifest.recipe_id!==GENERATED_AUDIO_RECIPE||!Array.isArray(manifest.assets)||manifest.assets.length>10000)return null;
  const urls=new Set(),ids=new Set();
  for(const asset of manifest.assets){
   if(!asset||typeof asset.id!=='string'||!/^[a-f0-9]{64}$/.test(asset.id)||typeof asset.url!=='string')return null;
   const url=new URL(asset.url);
   if(!isGeneratedAudioUrl(url)||url.pathname.split('/').pop().replace(/\.(?:wav|mp3)$/,'')!==asset.id||ids.has(asset.id)||urls.has(asset.url))return null;
   ids.add(asset.id);urls.add(asset.url);
  }
  return urls;
 }catch{return null;}
}

async function loadGeneratedAudioWhitelist(refresh=false){
 if(generatedAudioWhitelist&&!refresh)return generatedAudioWhitelist;
 if(generatedAudioWhitelistRequest)return generatedAudioWhitelistRequest;
 generatedAudioWhitelistRequest=(async()=>{
  const manifestUrl=new URL(GENERATED_AUDIO_MANIFEST_PATH,self.location.origin).href;
  let cache=null;
  try{
   cache=await caches.open(GENERATED_AUDIO_MANIFEST_CACHE);
   if(!refresh){
    const saved=await readGeneratedAudioWhitelist(await cache.match(manifestUrl));
    if(saved&&saved.size){generatedAudioWhitelist=saved;return saved;}
   }
  }catch{/* A missing metadata cache must not stop ordinary playback. */}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  generatedAudioWhitelistRefreshedAt=Date.now();
  try{
   const response=await fetch(new Request(manifestUrl,{method:'GET',mode:'same-origin',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal}));
   const urls=await readGeneratedAudioWhitelist(response.clone());
   if(urls&&urls.size){
    if(cache){try{await cache.put(manifestUrl,response);}catch{/* Keep the valid in-memory whitelist. */}}
    generatedAudioWhitelist=urls;return urls;
   }
  }catch{/* Offline requests may continue through the normal network path. */}finally{clearTimeout(timeout);}
  return generatedAudioWhitelist;
 })();
 try{return await generatedAudioWhitelistRequest;}finally{generatedAudioWhitelistRequest=null;}
}

async function generatedAudioManifestResponse(){
 const manifestUrl=new URL(GENERATED_AUDIO_MANIFEST_PATH,self.location.origin).href;
 let cache=null;
 try{cache=await caches.open(GENERATED_AUDIO_MANIFEST_CACHE);}catch{/* Fresh public metadata can still be used without storage. */}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(new Request(manifestUrl,{method:'GET',mode:'same-origin',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal}));
  const urls=await readGeneratedAudioWhitelist(response.clone());
  if(urls&&urls.size){
   generatedAudioWhitelist=urls;generatedAudioWhitelistRefreshedAt=Date.now();
   if(cache){try{await cache.put(manifestUrl,response.clone());}catch{/* Preserve the fresh response when the cache is full. */}}
   return response;
  }
  if(cache){const saved=await cache.match(manifestUrl);const old=await readGeneratedAudioWhitelist(saved?.clone());if(old&&old.size)return saved;}
  return response;
 }catch(error){
  if(cache){const saved=await cache.match(manifestUrl);const urls=await readGeneratedAudioWhitelist(saved?.clone());if(urls&&urls.size)return saved;}
  throw error;
 }finally{clearTimeout(timeout);}
}

async function audioResponseForRequest(response,request){
 const range=request.headers.get('range');
 if(!range)return response;
 const ifRange=request.headers.get('if-range');
 // An unmatched validator requires the complete representation, not a slice.
 if(ifRange&&(ifRange.startsWith('W/')||ifRange!==response.headers.get('etag')&&ifRange!==response.headers.get('last-modified')))return response;
 const buffer=await response.arrayBuffer();
 const size=buffer.byteLength;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
 let start=0,end=size-1;
 let valid=Boolean(match&&(match[1]||match[2])&&size);
 if(valid&&match[1]){
  start=Number(match[1]);
  end=match[2]?Number(match[2]):size-1;
  valid=Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<size&&end>=start;
  end=Math.min(end,size-1);
 }else if(valid){
  const suffix=Number(match[2]);
  valid=Number.isSafeInteger(suffix)&&suffix>0;
  start=Math.max(0,size-suffix);
 }
 if(!valid)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size,'Accept-Ranges':'bytes'}});
 const headers=new Headers(response.headers);
 headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
 headers.set('Content-Length',String(end-start+1));
 headers.set('Accept-Ranges','bytes');
 headers.delete('Content-Encoding');
 return new Response(buffer.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}

async function generatedAudioResponse(request,url){
 let whitelist=await loadGeneratedAudioWhitelist();
 // A resumed batch may append approved assets to the same recipe. Refresh an
 // older whitelist for a newly requested filename, with a bounded retry rate.
 if(whitelist&&!whitelist.has(url.href)&&Date.now()-generatedAudioWhitelistRefreshedAt>=30000)whitelist=await loadGeneratedAudioWhitelist(true);
 // A path-shaped filename alone is not an approved course asset. Missing or
 // invalid metadata leaves playback on its ordinary network path, uncached.
 if(!whitelist||!whitelist.has(url.href))return fetch(request);
 let cache=null,saved=null;
 try{
  cache=await caches.open(GENERATED_AUDIO_CACHE);
  saved=await cache.match(url.href);
 }catch{/* Playback still works when browser storage is unavailable. */}
 if(isFullAudioResponse(saved))return audioResponseForRequest(saved,request);
 // Cache a full public response so later native audio range requests work
 // offline. Do not forward cookies, authorization, ranges or other headers.
 const response=await fetch(new Request(url.href,{method:'GET',mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'}));
 if(!isFullAudioResponse(response))return response;
 if(cache){try{await cache.put(url.href,response.clone());}catch{/* Storage limits must not interrupt audio playback. */}}
 return audioResponseForRequest(response,request);
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/nahuatl-orthography.js','/offline-audio.js'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('itzli-public-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin===self.location.origin&&url.pathname.startsWith('/api/'))return;
 if(url.origin===self.location.origin&&url.pathname===GENERATED_AUDIO_MANIFEST_PATH&&!url.search&&!url.hash){
  event.respondWith(generatedAudioManifestResponse());return;
 }
 if(isGeneratedAudioUrl(url)){
  event.respondWith(generatedAudioResponse(event.request,url));return;
 }
 // Development asset URLs are reused between edits. Keep the loopback preview
 // current while retaining the production cache and saved offline content.
 if(url.origin===self.location.origin&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.pathname.startsWith('/_next/static/'))return;
 if(url.origin===self.location.origin&&url.pathname==='/offline.html'){
  event.respondWith(fetch(event.request).then(async response=>{if(response.ok){try{const cache=await caches.open(CACHE);await cache.put('/offline.html',response.clone());}catch{/* Keep the fresh online page even when offline storage is full. */}}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match('/offline.html'))));return;
 }
 if(url.origin===self.location.origin&&url.pathname==='/nahuatl-orthography.js'){
  event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match(event.request))));return;
 }
 if(url.origin===self.location.origin&&url.pathname==='/offline-audio.js'&&!url.search&&!url.hash){
  event.respondWith(fetch(new Request(url.href,{credentials:'omit',redirect:'error',cache:'no-store'})).then(async response=>{if(response.ok){try{const cache=await caches.open(CACHE);await cache.put('/offline-audio.js',response.clone());}catch{/* Keep fresh playback code even when storage is full. */}}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match('/offline-audio.js'))));return;
 }
 if(event.request.mode==='navigate'){
   event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/offline.html'))));return;
 }
 if(url.origin===self.location.origin&&url.pathname.startsWith('/_next/static/')&&/\.(js|css|woff2?)$/.test(url.pathname)){
  event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(event.request);if(saved)return saved;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}));return;
 }
 if(/\.(mp3|wav|ogg)$/.test(url.pathname)&&(url.origin===self.location.origin&&url.pathname.startsWith('/audio')||url.hostname==='tlahtolli.coerll.utexas.edu')){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))??fetch(event.request)));
 }
});

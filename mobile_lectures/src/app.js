import './style.css';
import './study-view.css';
import '../vendor/visual-lecture-captions.js';
import { readPackage, verifyManifest, sha256, safeLink, sequence, validateTiming, cueAt } from './contract.js';
import * as cloud from './cloud.js';
import { createImageViewer } from './image-viewer.js';

const $ = id => document.getElementById(id), app = $('app');
let session = null, current = null, localPackage = null, audio = null, stepIndex = 0, variant = 'plain', follow = false;
let routeVersion = 0, imageVersion = 0, audioVersion = 0, lastSave = 0, saveQueue = Promise.resolve(), noticeTimer;
const urls = new Set(), mediaCache = new Map();
let captionsShown=false, viewerState=null;
try {captionsShown=localStorage.getItem('na-image-captions')==='true';}catch{}
const viewer=createImageViewer($('zoom'),{navigate:delta=>navigate(stepIndex+delta),variant:setVariant,captions:setCaptions});
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text !== undefined) n.textContent=text; if(cls)n.className=cls; return n; };
const button = (text, action, cls='') => { const n=el('button',text,cls); n.type='button'; n.onclick=()=>Promise.resolve().then(action).catch(showError); return n; };
function notice(message, bad=false) { clearTimeout(noticeTimer); $('notice').textContent=message; $('notice').hidden=false; $('notice').classList.toggle('bad',bad); if(!bad)noticeTimer=setTimeout(()=>$('notice').hidden=true,5000); }
const showError = error => notice(error.message || String(error),true);
const time = s => Number.isFinite(s) ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` : '0:00';
const objectURL = blob => { const url=URL.createObjectURL(blob);urls.add(url);return url; };
function fileInput(label,accept,action) {
  const wrap=el('label',undefined,'file-button'), input=document.createElement('input');input.type='file';input.accept=accept;input.setAttribute('aria-label',label);
  wrap.append(el('span',label),input); input.onchange=async()=>{if(!input.files[0])return;input.disabled=true;try{await action(input.files[0]);}catch(e){showError(e);}finally{input.disabled=false;input.value='';}};return wrap;
}
function downloadJSON(name,value) {const url=objectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=name;a.click();}
function dispose() {
  viewer.close();viewerState=null;
  imageVersion++;audioVersion++;
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
  for(const url of urls)URL.revokeObjectURL(url);urls.clear();mediaCache.clear();current=null;
}
async function route() {
  const serial=++routeVersion;
  await persistProgress();dispose();app.replaceChildren();$('notice').hidden=true;
  $('account').hidden=!session;
  const fingerprint=location.hash.slice(1);
  if(fingerprint==='local' && localPackage){await openLecture({manifest:localPackage.manifest,fingerprint:localPackage.manifest.fingerprint},true,serial);return;}
  if(!session){renderWelcome();return;}
  if(/^[a-f0-9]{64}$/.test(fingerprint)){
    const row=await cloud.getLecture(fingerprint);if(serial!==routeVersion)return;await openLecture(row,false,serial);return;
  }
  await renderLibrary(serial);
}
function renderWelcome() {
  const hero=el('section',undefined,'welcome');
  hero.innerHTML='<p class="eyebrow">A LITTLE SPACE TO STUDY</p><h1>Your lectures.<br>Your pace.</h1><p class="lede">The explanation, the image, and the moment they connect. Bring your reviewed lectures with you.</p>';
  const card=el('section',undefined,'panel signin');card.append(el('h2','Open your private library'));
  const form=el('form');const label=el('label','Email address');const email=el('input');email.type='email';email.autocomplete='email';email.required=true;email.placeholder='you@example.com';label.append(email);
  let passwordMode=true;
  const passwordLabel=el('label','Password'),password=el('input');password.type='password';password.autocomplete='current-password';password.required=true;passwordLabel.append(password);
  const submit=el('button','Sign in','primary');submit.type='submit';submit.disabled=!cloud.client;
  const switchMode=button('Use an email link instead',()=>{passwordMode=!passwordMode;passwordLabel.hidden=!passwordMode;password.required=passwordMode;password.value='';submit.textContent=passwordMode?'Sign in':'Email me a sign-in link';switchMode.textContent=passwordMode?'Use an email link instead':'Use a password instead';});
  form.append(label,passwordLabel,submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{
    if(passwordMode){const {error}=await cloud.client.auth.signInWithPassword({email:email.value,password:password.value});if(error)throw error;password.value='';}
    else {const {error}=await cloud.client.auth.signInWithOtp({email:email.value,options:{emailRedirectTo:location.origin+'/'}});if(error)throw error;notice('Check your email and open the sign-in link on this device.');}
  }catch(error){const rateLimited=error.status===429||/rate.limit/i.test(error.message||'');showError(rateLimited?new Error('The email provider has reached its sending limit. Keep any signed-in device open. Use your password if you have set one, or wait before requesting another email.'):error);}finally{submit.disabled=false;}};
  card.append(form,switchMode,el('p',cloud.client?'Only accounts added to this private library can access its lectures. Use the password chosen when your account was created.':'Cloud connection is being set up. Local preview is available below.','muted'));
  const local=el('section',undefined,'local-preview');local.append(el('h3','Preview a lecture from this device'),el('p','Open a reviewed .nalecture package. Its images stay on this device until you choose to upload it.','muted'),fileInput('Open local lecture','.nalecture',loadLocal));
  hero.append(card,local);app.append(hero);
}
async function loadLocal(file) {notice('Checking approvals and original image files…');localPackage=await readPackage(await file.arrayBuffer());location.hash='local';if(current?.local)await route();}
async function renderLibrary(serial) {
  const heading=el('section',undefined,'library-heading');heading.append(el('p','YOUR STUDY COLLECTION','eyebrow'),el('h1','Make a little progress.'),el('p','Pick up a lecture, take a closer look, and keep going.','lede'));app.append(heading);
  const tools=el('div',undefined,'library-tools');tools.append(fileInput('Add reviewed lecture','.nalecture',async file=>{
    notice('Verifying the lecture…');const pkg=await readPackage(await file.arrayBuffer());await cloud.uploadPackage(pkg,notice);notice('Lecture added to your private library.');await route();
  }),fileInput('Preview local copy','.nalecture',loadLocal));app.append(tools);
  const rows=await cloud.listLectures();if(serial!==routeVersion)return;
  const grid=el('section',undefined,'lecture-grid');
  if(!rows.length){const empty=el('div',undefined,'panel empty');empty.append(el('h2','Your first lecture starts here.'),el('p','Add a reviewed mobile package from your computer. It will appear here on your iPhone after you sign in.'));grid.append(empty);}
  for(const row of rows){const card=el('a',undefined,'lecture-card');card.href='#'+row.fingerprint;card.append(el('span',row.audio?'AUDIO ATTACHED':'IMAGES & TRANSCRIPT','eyebrow'),el('h2',row.title),el('p',`${row.case_count} illustrated cases`,'muted'),el('span','Open lecture ↗','card-action'));grid.append(card);}
  app.append(grid);renderAccountAccess();
}
function renderAccountAccess(){
  const details=el('details',undefined,'account-access');details.append(el('summary','Account access'),el('p','Set an optional password while signed in. You can then use it on your other devices without requesting an email.','muted'));
  const form=el('form'),firstLabel=el('label','New password'),secondLabel=el('label','Confirm new password'),first=el('input'),second=el('input');
  for(const field of [first,second]){field.type='password';field.autocomplete='new-password';field.required=true;field.minLength=12;field.maxLength=128;}
  firstLabel.append(first);secondLabel.append(second);
  const submit=el('button','Save password','primary');submit.type='submit';form.append(firstLabel,secondLabel,el('p','Use at least 12 characters. Your password is sent only to this library’s authentication service.','muted'),submit);
  form.onsubmit=async event=>{event.preventDefault();if(first.value!==second.value){showError(new Error('The two passwords do not match.'));return;}submit.disabled=true;try{await cloud.owner();const {error}=await cloud.client.auth.updateUser({password:first.value});if(error)throw error;first.value='';second.value='';notice('Password saved. You can now sign in on your other devices with your email and password.');}catch(error){showError(error);}finally{submit.disabled=false;}};
  details.append(form);app.append(details);
}
async function imageURL(imageId,wanted) {
  const row=current, entry=row.manifest.media.find(m=>m.imageId===imageId && m.variant===wanted);
  if(!entry)return null;
  const key=entry.path,cached=mediaCache.get(key);
  if(cached && cached.expires>Date.now())return cached.url;
  const url=row.local?objectURL(new Blob([localPackage.files[entry.path]],{type:entry.mime})):await cloud.signedMedia(row.fingerprint,entry.path);
  if(current!==row)return null;
  mediaCache.set(key,{url,expires:Date.now()+90*60*1000});return url;
}
async function openLecture(row,local,serial) {
  await verifyManifest(row.manifest);if(serial!==routeVersion)return;
  current={...row,local,steps:sequence(row.manifest.lesson)};stepIndex=0;variant='plain';follow=false;
  const lesson=row.manifest.lesson;
  let progress=null;
  try {progress=local?JSON.parse(localStorage.getItem(`na-preview:${row.fingerprint}`)||'null'):await cloud.getProgress(row.fingerprint);}catch{/* Content remains usable when progress is unavailable. */}
  if(serial!==routeVersion)return;
  if(progress){const i=current.steps.findIndex(s=>s.caseId===progress.case_id && s.imageId===progress.image_id);if(i>=0)stepIndex=i;}
  const back=el('a','← Library','back-link');back.href='#';app.append(back);
  const heading=el('section',undefined,'lecture-heading');heading.append(el('p',local?'LOCAL PREVIEW · NOT UPLOADED':'YOUR PRIVATE LECTURE','eyebrow'),el('h1',lesson.title));app.append(heading);
  if(local && session)heading.append(button('Upload this reviewed lecture',async()=>{await cloud.uploadPackage(localPackage,notice);location.hash=row.fingerprint;},'primary'));
  if((lesson.plan.cineWatchPoints||[]).length)heading.append(el('p','This lecture includes cine passages. This phone version displays the still images and transcript; source video access is not connected.','limitation'));
  const layout=el('div',undefined,'study-layout');
  const visual=el('section',undefined,'visual-column');
  visual.innerHTML='<div class="case-line"><span id="case-number" class="eyebrow"></span><select id="case-select" aria-label="Choose case"></select></div><h2 id="case-title"></h2><p id="case-focus" class="muted"></p><div class="variant-bar"><div><button id="plain">Plain</button><button id="annotated">Annotated</button></div><span id="image-count"></span></div><button id="image-stage" class="image-stage" aria-label="Enlarge current image"><img id="study-image" alt=""><span id="image-loading">Loading original image…</span><span class="zoom-hint">Tap to enlarge</span></button><div class="image-navigation"><button id="previous-image">← Previous image</button><button id="next-image">Next image →</button></div><p id="image-label" class="image-label"></p><details class="caption"><summary>Original caption & source</summary><div id="caption-body"></div><a id="source-link" target="_blank" rel="noopener noreferrer">Open original source ↗</a></details><p id="relationship" class="muted"></p>';
  for(const id of lesson.plan.lectureOrder){const c=lesson.plan.cases.find(c=>c.id===id),opt=el('option',c.label);opt.value=id;visual.querySelector('#case-select').append(opt);}
  const side=el('section',undefined,'explanation-column');side.innerHTML='<details id="transcript" open><summary>Case explanation</summary><div id="transcript-body"></div></details><details><summary>Lecture map</summary><p id="orientation"></p><div id="pattern-list"></div></details><details><summary>Review notes</summary><div id="review-notes"></div></details><details id="audio-tools"><summary>Audio & image timing</summary><div id="audio-setup"></div><div id="timing-tools"></div></details>';
  layout.append(visual,side);app.append(layout);
  $('orientation').textContent=lesson.plan.orientation || '';
  for(const p of lesson.plan.patterns)$('pattern-list').append(el('h3',p.label),el('p',p.cue));
  for(const stage of ['organizer','lecture']){const result=lesson.quality.approvals[stage].result;$('review-notes').append(el('h3',stage==='lecture'?'Lecture review':'Organizer review'),el('p',result.summary));for(const limitation of result.limitations||[])$('review-notes').append(el('p',typeof limitation==='string'?limitation:JSON.stringify(limitation),'muted'));}
  const player=el('section',undefined,'player');player.innerHTML='<div class="player-heading"><span id="audio-status">Attach the Speechify recording to listen here.</span><button id="follow" disabled>Follow images: off</button></div><audio id="audio" controls preload="metadata" playsinline></audio><div class="player-extras"><button id="rewind" disabled>−10 s</button><label>Speed <select id="speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option></select></label><button id="forward" disabled>+10 s</button><span id="progress-state">Position saved as you study</span></div>';app.append(player);
  audio=$('audio');audio.hidden=!row.audio;audio.playbackRate=progress?.rate || 1;$('speed').value=String(audio.playbackRate);
  $('case-select').onchange=()=>navigate(current.steps.findIndex(s=>s.caseId===$('case-select').value));
  $('previous-image').onclick=()=>navigate(stepIndex-1);$('next-image').onclick=()=>navigate(stepIndex+1);
  for(const v of ['plain','annotated'])$(v).onclick=()=>setVariant(v);
  $('image-stage').onclick=()=>{if(current)viewer.open(document.querySelector('.player'));};
  const focus=button('Study view',()=>$('image-stage').click(),'study-view-button');focus.id='focus-view';document.querySelector('.variant-bar').append(focus);
  const captionToggle=button('Captions',()=>setCaptions(!captionsShown));captionToggle.id='caption-toggle';captionToggle.setAttribute('aria-label','Image captions');document.querySelector('.player-heading').append(captionToggle);
  document.querySelector('.caption').ontoggle=()=>setCaptions(document.querySelector('.caption').open);
  setCaptions(captionsShown);
  $('follow').onclick=()=>{follow=!follow;updateFollow();if(follow)onTime();};
  $('speed').onchange=()=>{audio.playbackRate=Number($('speed').value);void persistProgress();};
  $('rewind').onclick=()=>{audio.currentTime=Math.max(0,audio.currentTime-10);};$('forward').onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+10);};
  audio.ontimeupdate=onTime;audio.onpause=()=>void persistProgress();audio.onseeked=()=>{onTime();void persistProgress();};
  audio.onloadedmetadata=()=>{if(progress?.audio_sha256===current.audio?.sha256 && Number.isFinite(progress.position))audio.currentTime=Math.min(progress.position,Math.max(0,audio.duration-0.1));if(current.timing?.verified&&Math.abs(current.timing.duration-audio.duration)>1){current.timing=null;follow=false;updateFollow();showError(new Error('The saved timing duration does not match this recording. Image following remains off.'));}renderTiming();};
  audio.onerror=()=>{$('audio-status').textContent='Audio could not load. Reopen the lecture to renew its link.';};
  audio.onplay=()=>{if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:lesson.title,artist:'NormalAnatomy'});};
  $('audio-setup').append(el('p','Use the complete MP3 exported from Speechify. Attaching a different recording clears the old timing.','muted'));
  const confirm=el('label',undefined,'check-label');const input=el('input');input.type='checkbox';input.id='audio-confirm';confirm.append(input,document.createTextNode('I checked that this is the full Speechify export of this exact approved narration.'));$('audio-setup').append(confirm,fileInput('Attach Speechify audio','.mp3,.m4a,.wav',attachAudio));
  if(row.audio){await setAudio(row.audio);if(serial!==routeVersion)return;}
  updateFollow();renderTiming();await renderImage();
}
function setVariant(value){variant=value;void renderImage().catch(showError);}
function setCaptions(value){captionsShown=value;try{localStorage.setItem('na-image-captions',String(value));}catch{}
  const details=document.querySelector('.caption');if(details&&details.open!==value)details.open=value;
  $('caption-toggle')?.setAttribute('aria-pressed',String(value));
  if(viewerState){viewerState={...viewerState,captions:value};viewer.update(viewerState);}
}
function navigate(index){if(!current || index<0 || index>=current.steps.length)return;stepIndex=index;follow=false;updateFollow();void renderImage().catch(showError);void persistProgress();}
async function renderImage(){
  if(!current)return;const serial=++imageVersion,row=current,s=row.steps[stepIndex],lesson=row.manifest.lesson,c=lesson.plan.cases.find(c=>c.id===s.caseId),entry=lesson.registry.find(i=>i.masterImageId===s.imageId);
  $('case-number').textContent=`CASE ${lesson.plan.lectureOrder.indexOf(c.id)+1} / ${lesson.plan.cases.length}`;$('case-title').textContent=c.label;$('case-focus').textContent=c.focus;$('case-select').value=c.id;
  $('image-count').textContent=`${s.index+1} / ${c.imageIds.length}`;
  $('previous-image').disabled=stepIndex===0;$('next-image').disabled=stepIndex===row.steps.length-1;
  const has=v=>row.manifest.media.some(m=>m.imageId===s.imageId && m.variant===v);
  if(!has(variant))variant=has('plain')?'plain':'annotated';
  for(const v of ['plain','annotated']){$(v).disabled=!has(v);$(v).setAttribute('aria-pressed',String(v===variant));}
  $('image-label').textContent=[c.modalityLabels?.[s.imageId],entry.sourceArticleTitle,entry.sourceImageNumber?`Image ${entry.sourceImageNumber}`:s.imageId].filter(Boolean).join(' · ');
  $('relationship').textContent=c.relationshipDescription || '';
  $('caption-body').replaceChildren(globalThis.VisualLectureCaptions.render(entry.captionOriginal || entry.captionHtml || entry.caption || 'No source caption supplied.'));
  const source=safeLink(entry.sourceArticleUrl || entry.sourceUrl);$('source-link').hidden=!source;if(source)$('source-link').href=source;
  viewerState={key:`${s.caseId}/${s.imageId}`,title:c.label,count:`${stepIndex+1} / ${row.steps.length}`,previous:stepIndex>0,next:stepIndex<row.steps.length-1,
    variant,variants:['plain','annotated'].filter(has),captions:captionsShown,caption:entry.captionOriginal||entry.captionHtml||entry.caption,source,
    relationship:c.relationshipDescription||'',src:null,alt:`${c.label} — ${variant} image ${s.index+1}`};
  viewer.update(viewerState);
  $('transcript-body').replaceChildren();const segment=lesson.narration.segments.find(n=>n.caseId===c.id);
  for(const paragraph of (segment?.text || '').split(/\n\s*\n/))$('transcript-body').append(el('p',paragraph));
  const img=$('study-image');img.hidden=true;img.removeAttribute('src');$('image-loading').hidden=false;$('image-loading').textContent='Loading original image…';
  const url=await imageURL(s.imageId,variant);if(serial!==imageVersion || row!==current)return;
  img.alt=`${c.label} — ${variant} image ${s.index+1}`;
  img.onload=()=>{if(serial===imageVersion){img.hidden=false;$('image-loading').hidden=true;}};
  img.onerror=()=>{if(serial===imageVersion){img.hidden=true;$('image-loading').textContent='Image unavailable. Choose the other variant or reopen this lecture to retry.';}};
  if(url){img.src=url;viewerState={...viewerState,src:url};viewer.update(viewerState);}else $('image-loading').textContent='This original image is unavailable.';
  if($('mark-time'))$('mark-time').textContent=`Mark this image at ${time(audio?.currentTime||0)}`;
}
async function attachAudio(file){
  if(!$('audio-confirm').checked)throw new Error('Check the recording against the approved narration before attaching it.');
  if(file.size>50*1024*1024)throw new Error('This recording exceeds the current 50 MB storage limit. Export a smaller MP3 before attaching it.');
  const ext=file.name.split('.').pop().toLowerCase(),mime={mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav'}[ext];
  if(!mime)throw new Error('Use MP3, M4A, or WAV audio.');
  const row=current,hash=await sha256(await file.arrayBuffer()),meta={sha256:hash,path:`audio/${hash}`,mime,bytes:file.size,verifiedExport:true,attachedAt:new Date().toISOString()};
  if(!row.local)await cloud.saveAudio(row.fingerprint,file,meta);
  if(current!==row)return;
  current.audio=meta;current.timing=null;current.localAudio=file;follow=false;
  await setAudio(meta);renderTiming();notice(row.local?'Audio attached for this local preview. Upload the lecture first to save audio to your phone library.':'Audio saved. Image timing is ready to set.');
}
async function setAudio(meta){
  const row=current,serial=++audioVersion;
  const src=row.local?row.localAudio && objectURL(row.localAudio):await cloud.signedMedia(row.fingerprint,meta.path);
  if(current!==row || serial!==audioVersion || !src)return;
  audio.src=src;audio.hidden=false;audio.load();$('rewind').disabled=false;$('forward').disabled=false;
  $('audio-status').textContent='Full lecture audio · browse images as you listen';
  if(row.timing){try{validateTiming(row.timing,row.manifest,meta);follow=row.timing.verified===true;}catch{row.timing=null;showError(new Error('Saved image timing does not match this recording. Manual browsing remains available.'));}}
  updateFollow();
}
function updateFollow(){if(!$('follow'))return;const ready=current?.timing?.verified===true;$('follow').disabled=!ready;$('follow').textContent=ready?`Follow images: ${follow?'on':'off'}`:(current?.audio?'Follow: timing needed':'Follow: no audio');$('follow').title=ready?'Manual image navigation pauses following. Turn this on to return to the recording.':'Image transitions must be checked against this recording in Audio & image timing.';$('follow').setAttribute('aria-pressed',String(follow));}
function onTime(){
  if(!current||!audio)return;
  if(follow){const cue=cueAt(current.timing,audio.currentTime);if(cue){const i=current.steps.findIndex(s=>s.caseId===cue.caseId&&s.imageId===cue.imageId);if(i>=0&&i!==stepIndex){stepIndex=i;void renderImage().catch(showError);}}}
  if($('mark-time'))$('mark-time').textContent=`Mark this image at ${time(audio.currentTime)}`;
  if(Date.now()-lastSave>5000){lastSave=Date.now();void persistProgress();}
}
async function persistProgress(){
  if(!current || !audio)return;
  const row=current,s=row.steps[stepIndex];
  const value={audio_sha256:row.audio?.sha256||'',position:Number.isFinite(audio.currentTime)?audio.currentTime:0,case_id:s.caseId,image_id:s.imageId,rate:audio.playbackRate};
  try{localStorage.setItem(`na-${row.local?'preview':'progress'}:${row.fingerprint}`,JSON.stringify(value));}catch{}
  if(row.local)return;
  saveQueue=saveQueue.catch(()=>{}).then(()=>cloud.saveProgress(row.fingerprint,value));
  try{await saveQueue;if(current===row && $('progress-state'))$('progress-state').textContent='Progress saved';}catch{if(current===row&&$('progress-state'))$('progress-state').textContent='Progress not synced · check connection';}
}
function validateLoadedTiming(timing){
  validateTiming(timing,current.manifest,current.audio);
  if(!Number.isFinite(audio?.duration))throw new Error('Wait for the audio to load before importing or verifying timing.');
  if(Math.abs(timing.duration-audio.duration)>1)throw new Error('The timing duration does not match this recording.');
  return timing;
}
async function markImageTime(advance){
  if(!Number.isFinite(audio?.duration)||audio.duration<=0)throw new Error('Wait for the audio to load first.');
  const row=current,index=stepIndex,s=row.steps[index],other=(row.timing?.cues||[]).filter(c=>c.caseId!==s.caseId||c.imageId!==s.imageId);
  const next={version:1,fingerprint:row.fingerprint,audioSha256:row.audio.sha256,duration:audio.duration,verified:false,cues:[...other,{caseId:s.caseId,imageId:s.imageId,time:audio.currentTime}].sort((a,b)=>a.time-b.time)};
  validateTiming(next,row.manifest,row.audio);if(!row.local)await cloud.saveTiming(row.fingerprint,next);if(current!==row)return;
  row.timing=next;follow=false;updateFollow();renderTiming();if(advance&&stepIndex===index)navigate(index+1);
}
function renderTiming(){
  const box=$('timing-tools');if(!box)return;box.replaceChildren();
  if(!current.audio){box.append(el('p','Attach audio before setting image timing.','muted'));return;}
  const cues=current.timing?.cues || [];
  box.append(el('h3','Match images to the recording'),el('p',`${cues.length} of ${current.steps.length} image cues set. Listen, choose the corresponding image, and mark its start. Follow stays off until the full sequence is checked.`,'muted'));
  const mark=button(`Mark this image at ${time(audio?.currentTime||0)}`,()=>markImageTime(false));mark.id='mark-time';box.append(mark);
  box.append(button('Mark & next image',()=>markImageTime(true)));
  const missing=current.steps.findIndex(s=>!cues.some(c=>c.caseId===s.caseId&&c.imageId===s.imageId));
  if(missing>=0)box.append(button('Go to next unmarked image',()=>navigate(missing),'quiet'));
  const list=el('ol',undefined,'cue-list');for(const cue of cues){
    const row=current,index=row.steps.findIndex(s=>s.caseId===cue.caseId&&s.imageId===cue.imageId),step=row.steps[index];
    const li=el('li',`${time(cue.time)} · ${step.label} · image ${step.index+1}`);
    li.append(button('Replay transition',()=>{navigate(index);audio.currentTime=Math.max(0,cue.time-3);return audio.play();},'quiet'));
    li.append(button('Remove',async()=>{const next={...row.timing,verified:false,cues:row.timing.cues.filter(c=>c!==cue)};if(!row.local)await cloud.saveTiming(row.fingerprint,next);if(current!==row)return;row.timing=next;follow=false;updateFollow();renderTiming();},'quiet'));list.append(li);
  }box.append(list);
  const label=el('label',undefined,'check-label'),check=el('input');check.type='checkbox';label.append(check,document.createTextNode('I checked every image transition against this exact recording.'));box.append(label);
  box.append(button('Enable verified image following',async()=>{
    if(!check.checked)throw new Error('Check the image transitions before enabling automatic following.');
    const timing={...current.timing,verified:true,verifiedAt:new Date().toISOString()};validateLoadedTiming(timing);
    if(!current.local)await cloud.saveTiming(current.fingerprint,timing);current.timing=timing;follow=true;updateFollow();notice('Verified image following enabled.');renderTiming();
  },'primary'));
  box.append(button('Export timing backup',()=>downloadJSON('lecture-timing.json',current.timing||{}),'quiet'),fileInput('Import matching timing','.json',async file=>{const timing=validateLoadedTiming(JSON.parse(await file.text()));if(!current.local)await cloud.saveTiming(current.fingerprint,timing);current.timing=timing;follow=timing.verified===true;updateFollow();renderTiming();}));
}
$('account').onclick=async()=>{await persistProgress();dispose();const {error}=await cloud.client.auth.signOut();if(error){showError(error);return;}session=null;localPackage=null;location.hash='';await route();};
window.addEventListener('hashchange',()=>route().catch(showError));
document.addEventListener('visibilitychange',()=>{if(document.hidden)void persistProgress();});
window.addEventListener('pagehide',()=>{void persistProgress();});
if(cloud.client){
  const {data,error}=await cloud.client.auth.getSession();if(error)showError(error);session=data.session;
  cloud.client.auth.onAuthStateChange((event,next)=>{const changed=session?.user?.id!==next?.user?.id;session=next;if(changed)setTimeout(()=>route().catch(showError),0);});
}
route().catch(showError);
